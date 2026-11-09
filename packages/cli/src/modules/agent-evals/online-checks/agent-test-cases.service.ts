import {
	AGENT_TEST_CHAT_DATASET_NAME,
	type AgentJsonConfig,
	type SaveAgentTestCasePayload,
} from '@n8n/api-types';
import type { AgentEvalDataset, User } from '@n8n/db';
import {
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { AgentContextService } from '../../agents/agent-context.service';
import type { AgentSessionTurn } from '../../agents/agent-context.contracts';
import { AgentExecutionService } from '../../agents/agent-execution.service';
import { DataTableService } from '../../data-table/data-table.service';
import { DataTableNameConflictError } from '../../data-table/errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from '../../data-table/errors/data-table-not-found.error';
import { normalize } from './promise-checks';
import {
	TEST_CASE_COLUMNS,
	pinnedToolCalls,
	savedCaseFromRow,
	testCaseRow,
} from './saved-test-case';
import type { PinnedToolCall, SavedTestCaseRecord, TestCaseVerdict } from './saved-test-case';
import { turnForExecution } from './session-turns';
import { profileAgentTools } from './tool-profile';
import type { ChatTurn } from './types';

/** The one dataset per agent that the test chat saves into. */
export const TEST_CHAT_DATASET_NAME = AGENT_TEST_CHAT_DATASET_NAME;

const MAX_NAME_ATTEMPTS = 10;

/** A chat saves far fewer cases than this; it bounds one read. */
const MAX_CASES_PER_THREAD = 100;

export interface SavedTestCase {
	datasetId: string;
	rowId: number;
	/** How many tool calls were saved with the case, for the confirmation line. */
	toolCalls: number;
}

function replyText(turn: AgentSessionTurn): string {
	return (turn.timeline ?? [])
		.flatMap((event) => (event.type === 'text' ? [event.content] : []))
		.join('\n')
		.trim();
}

function toChatTurn(turn: AgentSessionTurn): ChatTurn {
	return {
		userMessage: turn.userMessage ?? '',
		reply: replyText(turn),
		timeline: turn.timeline ?? [],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The tool calls an eval result recorded, without the ones that errored. */
function runToolCalls(toolCalls: unknown): PinnedToolCall[] {
	const calls = isRecord(toolCalls) && Array.isArray(toolCalls.calls) ? toolCalls.calls : [];
	return calls.flatMap((call: unknown) =>
		isRecord(call) && typeof call.tool === 'string' && call.error === undefined
			? [{ tool: call.tool, input: call.input, output: call.output }]
			: [],
	);
}

/** The agent's own tools, by name. MCP tools are named by their server, so they are not here. */
function ownToolNames(config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'>): Set<string> {
	return new Set(
		profileAgentTools(config)
			.filter((tool) => tool.source !== 'mcp')
			.map((tool) => tool.name),
	);
}

/**
 * Saves a judged test-chat reply as a test case, reads a chat's saved cases
 * back, and removes one for Undo. The turn is read on the server, so the saved
 * tool data is exactly what the run recorded and the browser never sends it.
 *
 * Every method first checks that the caller can read the agent in the path's
 * project, and touches tables only in that project: the route's project scope
 * says nothing about which project the path's agent or dataset belongs to.
 */
@Service()
export class AgentTestCaseService {
	/** One dataset creation at a time per agent, so two quick saves share one. */
	private readonly creating = new Map<string, Promise<AgentEvalDataset>>();

	constructor(
		private readonly agentContextService: AgentContextService,
		private readonly datasetRepository: AgentEvalDatasetRepository,
		private readonly dataTableService: DataTableService,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly resultRepository: AgentEvalResultRepository,
		private readonly runRepository: AgentEvalRunRepository,
	) {}

	async save(
		user: User,
		projectId: string,
		agentId: string,
		{ threadId, executionId, verdict, note }: SaveAgentTestCasePayload,
	): Promise<SavedTestCase> {
		const judged: TestCaseVerdict =
			verdict === 'not-right' ? { verdict, note: note ?? '' } : { verdict };
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');
		const turn = await this.readTurn(user, projectId, agentId, threadId, executionId);
		if (!turn) throw new NotFoundError('Execution not found');

		const ownTools = ownToolNames(artifact.config);
		const row = testCaseRow(turn, judged, {
			savedAt: new Date(),
			threadId,
			executionId,
			ownTools,
		});
		const dataset = await this.datasetFor(projectId, agentId, artifact.config.name, user.id);
		const [inserted] = await this.dataTableService.insertRows(
			this.dataTableIdOf(dataset),
			projectId,
			[row],
			'id',
		);
		return {
			datasetId: dataset.id,
			rowId: inserted.id,
			toolCalls: pinnedToolCalls(turn.timeline ?? [], ownTools).length,
		};
	}

	/** The cases saved from one chat, so the chat can show them as saved after a reload. */
	async savedForThread(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<SavedTestCaseRecord[]> {
		await this.assertAgentReadable(user, projectId, agentId);
		const existing = await this.existingInProject(agentId, projectId);
		if (!existing?.columns.includes(TEST_CASE_COLUMNS.threadId)) return [];

		const { dataset } = existing;
		const { data } = await this.dataTableService.getManyRowsAndCount(
			this.dataTableIdOf(dataset),
			projectId,
			{
				skip: 0,
				take: MAX_CASES_PER_THREAD,
				filter: {
					type: 'and',
					filters: [{ columnName: TEST_CASE_COLUMNS.threadId, condition: 'eq', value: threadId }],
				},
			},
		);
		return data.flatMap((row) => {
			const saved = savedCaseFromRow(row, dataset.id);
			return saved ? [saved] : [];
		});
	}

	/**
	 * How many of the agent's other recent chats started with the same message
	 * as this turn, ignoring case and spaces. The test chat uses it to offer
	 * saving a message the person keeps asking. A message that is already saved
	 * as a test counts 0, so the offer does not come back.
	 */
	async askedBefore(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
		executionId: string,
	): Promise<number> {
		const turn = await this.readTurn(user, projectId, agentId, threadId, executionId);
		const message = normalize(turn?.userMessage ?? '');
		if (!message || !turn?.userMessage) return 0;
		if (await this.isSavedAsTest(agentId, projectId, turn.userMessage)) return 0;
		const firstMessages = await this.agentExecutionService.firstMessagesOfRecentThreads(agentId);
		let count = 0;
		for (const [otherThreadId, first] of firstMessages) {
			if (otherThreadId !== threadId && normalize(first) === message) count++;
		}
		return count;
	}

	/** True when a saved test has this exact message as its input. */
	private async isSavedAsTest(agentId: string, projectId: string, message: string) {
		const existing = await this.existingInProject(agentId, projectId);
		if (!existing?.columns.includes(TEST_CASE_COLUMNS.input)) return false;
		const { count } = await this.dataTableService.getManyRowsAndCount(
			this.dataTableIdOf(existing.dataset),
			projectId,
			{
				skip: 0,
				take: 1,
				filter: {
					type: 'and',
					filters: [{ columnName: TEST_CASE_COLUMNS.input, condition: 'eq', value: message }],
				},
			},
		);
		return count > 0;
	}

	async remove(user: User, projectId: string, agentId: string, datasetId: string, rowId: number) {
		await this.assertAgentReadable(user, projectId, agentId);
		const dataset = await this.datasetRepository.findByIdAndAgentId(datasetId, agentId);
		if (!dataset || dataset.datasetSource !== 'data_table') {
			throw new NotFoundError('Test case not found');
		}
		if (!(await this.tableColumns(dataset, projectId))) {
			throw new NotFoundError('Test case not found');
		}
		await this.dataTableService.deleteRows(this.dataTableIdOf(dataset), projectId, {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: rowId }] },
		});
	}

	/**
	 * "Accept new answer" after a re-run: the run's reply becomes the saved
	 * answer, and the tool data that run used becomes the saved data. A note on
	 * the test is cleared, so it is an answer test from now on. The result is
	 * marked as a pass. Only a test saved from the test chat can be rewritten
	 * this way: its row has the columns, and the server reads what it writes.
	 */
	async acceptNewAnswer(user: User, projectId: string, agentId: string, resultId: string) {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');

		const notFound = () => new NotFoundError('Test result not found');
		const result = await this.resultRepository.findById(resultId);
		if (!result) throw notFound();
		const run = await this.runRepository.findByIdAndAgentId(result.runId, agentId);
		if (!run) throw notFound();
		const dataset = await this.datasetRepository.findByIdAndAgentId(run.datasetId, agentId);
		if (dataset?.name !== TEST_CHAT_DATASET_NAME || dataset.datasetSource !== 'data_table') {
			throw new BadRequestError('Only a test saved from the test chat can take a new answer.');
		}
		const columns = await this.tableColumns(dataset, projectId);
		if (!columns) throw notFound();
		const rowId = Number(result.sourceRowId);
		if (!Number.isInteger(rowId)) throw notFound();

		const reply =
			typeof result.output?.finalText === 'string' ? result.output.finalText.trim() : '';
		if (result.status !== 'success' || !reply) {
			throw new BadRequestError('This test has no finished reply to keep.');
		}

		const ownTools = ownToolNames(artifact.config);
		const toolData = runToolCalls(result.toolCalls).filter((call) => ownTools.has(call.tool));
		await this.addMissingColumns(dataset, columns, projectId);
		await this.dataTableService.updateRows(this.dataTableIdOf(dataset), projectId, {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: rowId }] },
			data: {
				[TEST_CASE_COLUMNS.expectedOutput]: reply,
				[TEST_CASE_COLUMNS.criteria]: '',
				[TEST_CASE_COLUMNS.toolData]: JSON.stringify(toolData),
			},
		});
		await this.resultRepository.updateVerdict(resultId, {
			status: 'completed',
			outcome: 'pass',
			reasoning: null,
		});
	}

	private async assertAgentReadable(user: User, projectId: string, agentId: string) {
		const artifact = await this.agentContextService.readArtifact(user, projectId, agentId);
		if (!artifact) throw new NotFoundError('Agent not found');
	}

	private async readTurn(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
		executionId: string,
	): Promise<ChatTurn | undefined> {
		const detail = await this.agentContextService.readSession(user, projectId, agentId, threadId);
		if (!detail) return undefined;
		return turnForExecution(
			detail.executions.map((execution) => ({ id: execution.id, turn: toChatTurn(execution) })),
			executionId,
		);
	}

	private dataTableIdOf(dataset: AgentEvalDataset): string {
		return (dataset.datasetRef as { dataTableId: string }).dataTableId;
	}

	/** The agent's test-chat dataset whose table is in this project, with its column names. */
	private async existingInProject(
		agentId: string,
		projectId: string,
	): Promise<{ dataset: AgentEvalDataset; columns: string[] } | undefined> {
		const candidates = (await this.datasetRepository.findByAgentId(agentId)).filter(
			(dataset) =>
				dataset.name === TEST_CHAT_DATASET_NAME && dataset.datasetSource === 'data_table',
		);
		for (const dataset of candidates) {
			const columns = await this.tableColumns(dataset, projectId);
			if (columns) return { dataset, columns };
		}
		return undefined;
	}

	private async datasetFor(
		projectId: string,
		agentId: string,
		agentName: string,
		userId: string,
	): Promise<AgentEvalDataset> {
		const pending = this.creating.get(agentId);
		if (pending) return await pending;

		const existing = await this.existingInProject(agentId, projectId);
		if (existing) {
			await this.addMissingColumns(existing.dataset, existing.columns, projectId);
			return existing.dataset;
		}

		const creation = this.createDataset(projectId, agentId, agentName, userId);
		this.creating.set(agentId, creation);
		try {
			return await creation;
		} finally {
			this.creating.delete(agentId);
		}
	}

	/** The table's column names, or null when the table is gone or in another project. */
	private async tableColumns(
		dataset: AgentEvalDataset,
		projectId: string,
	): Promise<string[] | null> {
		const dataTableId = this.dataTableIdOf(dataset);
		try {
			const table = await this.dataTableService.getOne(dataTableId, projectId);
			return (table.columns ?? []).map((column) => column.name);
		} catch (error) {
			if (error instanceof DataTableNotFoundError) return null;
			throw error;
		}
	}

	/** A table saved before a column was added gets it, so every row it stores is complete. */
	private async addMissingColumns(dataset: AgentEvalDataset, columns: string[], projectId: string) {
		const dataTableId = this.dataTableIdOf(dataset);
		const missing = Object.values(TEST_CASE_COLUMNS).filter((name) => !columns.includes(name));
		for (const name of missing) {
			await this.dataTableService.addColumn(dataTableId, projectId, { name, type: 'string' });
		}
	}

	private async createDataset(
		projectId: string,
		agentId: string,
		agentName: string,
		userId: string,
	): Promise<AgentEvalDataset> {
		const columns = Object.values(TEST_CASE_COLUMNS).map((name) => ({
			name,
			type: 'string' as const,
		}));
		const baseName = `${agentName}: saved from test chat`;
		let table: { id: string } | undefined;
		for (let attempt = 0; table === undefined; attempt++) {
			const name = attempt === 0 ? baseName : `${baseName} (${attempt + 1})`;
			try {
				table = await this.dataTableService.createDataTable(projectId, { name, columns });
			} catch (error) {
				if (error instanceof DataTableNameConflictError && attempt < MAX_NAME_ATTEMPTS - 1) {
					continue;
				}
				throw error;
			}
		}

		return await this.datasetRepository.createDataset({
			name: TEST_CHAT_DATASET_NAME,
			agentId,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: table.id },
			columnMapping: {
				input: TEST_CASE_COLUMNS.input,
				expectedOutput: TEST_CASE_COLUMNS.expectedOutput,
				criteria: TEST_CASE_COLUMNS.criteria,
			},
			createdById: userId,
		});
	}
}
