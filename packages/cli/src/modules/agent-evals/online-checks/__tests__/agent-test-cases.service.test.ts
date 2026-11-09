import type {
	AgentEvalDataset,
	AgentEvalDatasetRepository,
	AgentEvalResult,
	AgentEvalResultRepository,
	AgentEvalRun,
	AgentEvalRunRepository,
	User,
} from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '../../../agents/agent-context.service';
import type { AgentExecutionService } from '../../../agents/agent-execution.service';
import type { AgentSessionDetail } from '../../../agents/agent-context.contracts';
import type { DataTableService } from '../../../data-table/data-table.service';
import { DataTableNameConflictError } from '../../../data-table/errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from '../../../data-table/errors/data-table-not-found.error';
import { AgentTestCaseService, TEST_CHAT_DATASET_NAME } from '../agent-test-cases.service';
import { TEST_CASE_COLUMNS } from '../saved-test-case';

const user = mock<User>({ id: 'user-1' });
const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

const session = {
	thread: {},
	executions: [
		{
			id: 'exec-1',
			status: 'success',
			userMessage: 'Where is my order?',
			timeline: [
				{
					type: 'tool-call',
					kind: 'tool',
					name: 'anthropic.tool_search',
					toolCallId: 'c0',
					input: {},
					output: {},
					startTime: 0,
					endTime: 1,
					success: true,
				},
				{
					type: 'tool-call',
					kind: 'workflow',
					name: 'lookup_order',
					toolCallId: 'c1',
					input: {},
					output: { status: 'shipped' },
					startTime: 0,
					endTime: 1,
					success: true,
				},
				{ type: 'text', content: 'It shipped.', timestamp: 2 },
			],
		},
	],
} as unknown as AgentSessionDetail;

const existingDataset = {
	id: 'dataset-1',
	name: TEST_CHAT_DATASET_NAME,
	agentId: AGENT_ID,
	datasetSource: 'data_table',
	datasetRef: { dataTableId: 'table-1' },
} as unknown as AgentEvalDataset;

function setup() {
	const context = mock<AgentContextService>();
	context.readArtifact.mockResolvedValue({
		config: {
			name: 'Order help desk',
			tools: [{ type: 'workflow', workflow: 'w-lookup', name: 'lookup_order' }],
		},
		skills: {},
	} as never);
	context.readSession.mockResolvedValue(session);
	const datasets = mock<AgentEvalDatasetRepository>();
	datasets.findByAgentId.mockResolvedValue([]);
	datasets.createDataset.mockImplementation(
		async (attrs) => ({ id: 'dataset-new', ...attrs }) as unknown as AgentEvalDataset,
	);
	const dataTables = mock<DataTableService>();
	dataTables.createDataTable.mockResolvedValue({ id: 'table-new' } as never);
	dataTables.insertRows.mockResolvedValue([{ id: 7 }] as never);
	dataTables.getProjectIdForDataTable.mockResolvedValue(PROJECT_ID);
	const executions = mock<AgentExecutionService>();
	executions.firstMessagesOfRecentThreads.mockResolvedValue(new Map());
	const results = mock<AgentEvalResultRepository>();
	const runs = mock<AgentEvalRunRepository>();
	const service = new AgentTestCaseService(
		context,
		datasets,
		dataTables,
		executions,
		results,
		runs,
	);
	return { service, context, datasets, dataTables, executions, results, runs };
}

describe('AgentTestCaseService.save', () => {
	it('creates the "Saved from test chat" dataset on the first save and adds the row', async () => {
		const { service, datasets, dataTables } = setup();

		const saved = await service.save(user, PROJECT_ID, AGENT_ID, {
			threadId: 'thread-1',
			executionId: 'exec-1',
			verdict: 'looks-right',
		});

		expect(dataTables.createDataTable).toHaveBeenCalledWith(PROJECT_ID, {
			name: 'Order help desk: saved from test chat',
			columns: Object.values(TEST_CASE_COLUMNS).map((name) => ({ name, type: 'string' })),
		});
		expect(datasets.createDataset).toHaveBeenCalledWith({
			name: TEST_CHAT_DATASET_NAME,
			agentId: AGENT_ID,
			datasetSource: 'data_table',
			datasetRef: { dataTableId: 'table-new' },
			columnMapping: {
				input: TEST_CASE_COLUMNS.input,
				expectedOutput: TEST_CASE_COLUMNS.expectedOutput,
				criteria: TEST_CASE_COLUMNS.criteria,
			},
			createdById: 'user-1',
		});
		expect(dataTables.insertRows).toHaveBeenCalledWith(
			'table-new',
			PROJECT_ID,
			[
				expect.objectContaining({
					[TEST_CASE_COLUMNS.input]: 'Where is my order?',
					[TEST_CASE_COLUMNS.expectedOutput]: 'It shipped.',
					[TEST_CASE_COLUMNS.threadId]: 'thread-1',
					[TEST_CASE_COLUMNS.executionId]: 'exec-1',
				}),
			],
			'id',
		);
		expect(saved).toEqual({ datasetId: 'dataset-new', rowId: 7, toolCalls: 1 });
	});

	it('adds to the existing dataset', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockResolvedValue({
			id: 'table-1',
			columns: Object.values(TEST_CASE_COLUMNS).map((name) => ({ name })),
		} as never);

		const saved = await service.save(user, PROJECT_ID, AGENT_ID, {
			threadId: 'thread-1',
			executionId: 'exec-1',
			verdict: 'not-right',
			note: 'Say when it arrives.',
		});

		expect(dataTables.createDataTable).not.toHaveBeenCalled();
		expect(dataTables.addColumn).not.toHaveBeenCalled();
		expect(dataTables.insertRows).toHaveBeenCalledWith(
			'table-1',
			PROJECT_ID,
			[expect.objectContaining({ [TEST_CASE_COLUMNS.criteria]: 'Say when it arrives.' })],
			'id',
		);
		expect(saved.datasetId).toBe('dataset-1');
	});

	it('adds the run columns to a table saved before they existed', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockResolvedValue({
			id: 'table-1',
			columns: ['input', 'expected_output', 'criteria', 'tool_data', 'saved_at'].map((name) => ({
				name,
			})),
		} as never);

		await service.save(user, PROJECT_ID, AGENT_ID, {
			threadId: 'thread-1',
			executionId: 'exec-1',
			verdict: 'looks-right',
		});

		expect(dataTables.addColumn).toHaveBeenCalledWith('table-1', PROJECT_ID, {
			name: TEST_CASE_COLUMNS.threadId,
			type: 'string',
		});
		expect(dataTables.addColumn).toHaveBeenCalledWith('table-1', PROJECT_ID, {
			name: TEST_CASE_COLUMNS.executionId,
			type: 'string',
		});
	});

	it('starts a new dataset when the old table was deleted', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockRejectedValue(new DataTableNotFoundError('table-1'));

		const saved = await service.save(user, PROJECT_ID, AGENT_ID, {
			threadId: 'thread-1',
			executionId: 'exec-1',
			verdict: 'looks-right',
		});

		expect(saved.datasetId).toBe('dataset-new');
	});

	it('picks another table name when the first is taken', async () => {
		const { service, dataTables } = setup();
		dataTables.createDataTable
			.mockRejectedValueOnce(new DataTableNameConflictError('taken'))
			.mockResolvedValueOnce({ id: 'table-new' } as never);

		await service.save(user, PROJECT_ID, AGENT_ID, {
			threadId: 'thread-1',
			executionId: 'exec-1',
			verdict: 'looks-right',
		});

		expect(dataTables.createDataTable).toHaveBeenLastCalledWith(
			PROJECT_ID,
			expect.objectContaining({ name: 'Order help desk: saved from test chat (2)' }),
		);
	});

	it('404s for an execution that is not in the session', async () => {
		const { service } = setup();

		await expect(
			service.save(user, PROJECT_ID, AGENT_ID, {
				threadId: 'thread-1',
				executionId: 'other',
				verdict: 'looks-right',
			}),
		).rejects.toThrow(NotFoundError);
	});
});

describe('AgentTestCaseService.remove', () => {
	it('deletes the row from the dataset of this agent', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByIdAndAgentId.mockResolvedValue(existingDataset);
		dataTables.getOne.mockResolvedValue({ id: 'table-1', columns: [] } as never);

		await service.remove(user, PROJECT_ID, AGENT_ID, 'dataset-1', 7);

		expect(dataTables.deleteRows).toHaveBeenCalledWith('table-1', PROJECT_ID, {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 7 }] },
		});
	});

	it('404s for an agent the caller cannot read in this project, before touching any table', async () => {
		const { service, context, datasets, dataTables } = setup();
		context.readArtifact.mockResolvedValue(null as never);
		datasets.findByIdAndAgentId.mockResolvedValue(existingDataset);

		await expect(service.remove(user, PROJECT_ID, AGENT_ID, 'dataset-1', 7)).rejects.toThrow(
			NotFoundError,
		);
		expect(dataTables.deleteRows).not.toHaveBeenCalled();
	});

	it('404s for a table outside this project and deletes nothing', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByIdAndAgentId.mockResolvedValue(existingDataset);
		dataTables.getOne.mockRejectedValue(new DataTableNotFoundError('table-1'));

		await expect(service.remove(user, PROJECT_ID, AGENT_ID, 'dataset-1', 7)).rejects.toThrow(
			NotFoundError,
		);
		expect(dataTables.getOne).toHaveBeenCalledWith('table-1', PROJECT_ID);
		expect(dataTables.deleteRows).not.toHaveBeenCalled();
	});

	it('404s for a dataset of another agent', async () => {
		const { service, datasets } = setup();
		datasets.findByIdAndAgentId.mockResolvedValue(null);

		await expect(service.remove(user, PROJECT_ID, AGENT_ID, 'dataset-1', 7)).rejects.toThrow(
			NotFoundError,
		);
	});
});

describe('AgentTestCaseService.acceptNewAnswer', () => {
	const finished = {
		id: 'result-1',
		runId: 'run-1',
		sourceRowId: '7',
		status: 'success',
		output: { finalText: 'It was delivered on Tuesday.' },
		toolCalls: {
			calls: [
				{ tool: 'anthropic.tool_search', input: {}, output: {} },
				{ tool: 'lookup_order', input: { orderId: '1042' }, output: { status: 'delivered' } },
			],
		},
	} as unknown as AgentEvalResult;

	function setupAccept(result: AgentEvalResult = finished) {
		const ctx = setup();
		ctx.results.findById.mockResolvedValue(result);
		ctx.runs.findByIdAndAgentId.mockResolvedValue({
			id: 'run-1',
			datasetId: 'dataset-1',
		} as unknown as AgentEvalRun);
		ctx.datasets.findByIdAndAgentId.mockResolvedValue(existingDataset);
		ctx.dataTables.getOne.mockResolvedValue({
			id: 'table-1',
			columns: Object.values(TEST_CASE_COLUMNS).map((name) => ({ name })),
		} as never);
		return ctx;
	}

	it('makes the latest reply the saved answer, with the tool data that run used', async () => {
		const { service, dataTables, results } = setupAccept();

		await service.acceptNewAnswer(user, PROJECT_ID, AGENT_ID, 'result-1');

		expect(dataTables.updateRows).toHaveBeenCalledWith('table-1', PROJECT_ID, {
			filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 7 }] },
			data: {
				[TEST_CASE_COLUMNS.expectedOutput]: 'It was delivered on Tuesday.',
				[TEST_CASE_COLUMNS.criteria]: '',
				[TEST_CASE_COLUMNS.toolData]: JSON.stringify([
					{ tool: 'lookup_order', input: { orderId: '1042' }, output: { status: 'delivered' } },
				]),
			},
		});
		expect(results.updateVerdict).toHaveBeenCalledWith('result-1', {
			status: 'completed',
			outcome: 'pass',
			reasoning: null,
		});
	});

	it('404s for a result of another agent and writes nothing', async () => {
		const { service, runs, dataTables } = setupAccept();
		runs.findByIdAndAgentId.mockResolvedValue(null);

		await expect(service.acceptNewAnswer(user, PROJECT_ID, AGENT_ID, 'result-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(dataTables.updateRows).not.toHaveBeenCalled();
	});

	it('refuses a result from a dataset that was not saved from the test chat', async () => {
		const { service, datasets, dataTables } = setupAccept();
		datasets.findByIdAndAgentId.mockResolvedValue({
			...existingDataset,
			name: 'Hand-written checks',
		} as AgentEvalDataset);

		await expect(service.acceptNewAnswer(user, PROJECT_ID, AGENT_ID, 'result-1')).rejects.toThrow();
		expect(dataTables.updateRows).not.toHaveBeenCalled();
	});

	it('refuses a run with no reply to keep', async () => {
		const { service, dataTables } = setupAccept({
			...finished,
			output: { finalText: '' },
		} as unknown as AgentEvalResult);

		await expect(service.acceptNewAnswer(user, PROJECT_ID, AGENT_ID, 'result-1')).rejects.toThrow();
		expect(dataTables.updateRows).not.toHaveBeenCalled();
	});
});

describe('AgentTestCaseService.savedForThread', () => {
	it('returns the cases saved from this chat', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockResolvedValue({
			id: 'table-1',
			columns: Object.values(TEST_CASE_COLUMNS).map((name) => ({ name })),
		} as never);
		dataTables.getManyRowsAndCount.mockResolvedValue({
			count: 2,
			data: [
				{
					id: 7,
					[TEST_CASE_COLUMNS.executionId]: 'exec-1',
					[TEST_CASE_COLUMNS.criteria]: '',
					[TEST_CASE_COLUMNS.toolData]: '[{"tool":"lookup_order"}]',
				},
				{ id: 8, [TEST_CASE_COLUMNS.input]: 'Typed by hand' },
			],
		} as never);

		const cases = await service.savedForThread(user, PROJECT_ID, AGENT_ID, 'thread-1');

		expect(dataTables.getManyRowsAndCount).toHaveBeenCalledWith(
			'table-1',
			PROJECT_ID,
			expect.objectContaining({
				filter: {
					type: 'and',
					filters: [{ columnName: TEST_CASE_COLUMNS.threadId, condition: 'eq', value: 'thread-1' }],
				},
			}),
		);
		expect(cases).toEqual([
			{
				datasetId: 'dataset-1',
				rowId: 7,
				executionId: 'exec-1',
				verdict: 'looks-right',
				toolCalls: 1,
			},
		]);
	});

	it('404s for an agent the caller cannot read in this project', async () => {
		const { service, context, datasets, dataTables } = setup();
		context.readArtifact.mockResolvedValue(null as never);
		datasets.findByAgentId.mockResolvedValue([existingDataset]);

		await expect(service.savedForThread(user, PROJECT_ID, AGENT_ID, 'thread-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(dataTables.getManyRowsAndCount).not.toHaveBeenCalled();
	});

	it('reads rows only from a table in this project', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockRejectedValue(new DataTableNotFoundError('table-1'));

		await expect(service.savedForThread(user, PROJECT_ID, AGENT_ID, 'thread-1')).resolves.toEqual(
			[],
		);
		expect(dataTables.getOne).toHaveBeenCalledWith('table-1', PROJECT_ID);
		expect(dataTables.getManyRowsAndCount).not.toHaveBeenCalled();
	});

	it('returns nothing before the first save', async () => {
		const { service, dataTables } = setup();

		await expect(service.savedForThread(user, PROJECT_ID, AGENT_ID, 'thread-1')).resolves.toEqual(
			[],
		);
		expect(dataTables.getManyRowsAndCount).not.toHaveBeenCalled();
	});

	it('returns nothing for a table saved before the run columns existed', async () => {
		const { service, datasets, dataTables } = setup();
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockResolvedValue({ id: 'table-1', columns: [{ name: 'input' }] } as never);

		await expect(service.savedForThread(user, PROJECT_ID, AGENT_ID, 'thread-1')).resolves.toEqual(
			[],
		);
	});
});

describe('AgentTestCaseService.askedBefore', () => {
	it('counts the other chats that started with the same message, ignoring case and spaces', async () => {
		const { service, executions } = setup();
		executions.firstMessagesOfRecentThreads.mockResolvedValue(
			new Map([
				['thread-1', 'Where is my order?'],
				['thread-2', 'where is my   order?'],
				['thread-3', 'WHERE IS MY ORDER?'],
				['thread-4', 'Cancel my order'],
			]),
		);

		await expect(
			service.askedBefore(user, PROJECT_ID, AGENT_ID, 'thread-1', 'exec-1'),
		).resolves.toBe(2);
		expect(executions.firstMessagesOfRecentThreads).toHaveBeenCalledWith(AGENT_ID);
	});

	it('is 0 when the message is already saved as a test, so the chat does not offer it again', async () => {
		const { service, executions, datasets, dataTables } = setup();
		executions.firstMessagesOfRecentThreads.mockResolvedValue(
			new Map([['thread-2', 'Where is my order?']]),
		);
		datasets.findByAgentId.mockResolvedValue([existingDataset]);
		dataTables.getOne.mockResolvedValue({
			id: 'table-1',
			columns: Object.values(TEST_CASE_COLUMNS).map((name) => ({ name })),
		} as never);
		dataTables.getManyRowsAndCount.mockResolvedValue({ count: 1, data: [{ id: 3 }] } as never);

		await expect(
			service.askedBefore(user, PROJECT_ID, AGENT_ID, 'thread-1', 'exec-1'),
		).resolves.toBe(0);
		expect(dataTables.getManyRowsAndCount).toHaveBeenCalledWith('table-1', PROJECT_ID, {
			skip: 0,
			take: 1,
			filter: {
				type: 'and',
				filters: [
					{ columnName: TEST_CASE_COLUMNS.input, condition: 'eq', value: 'Where is my order?' },
				],
			},
		});
	});

	it('is 0 for an execution that is not in the session', async () => {
		const { service } = setup();

		await expect(
			service.askedBefore(user, PROJECT_ID, AGENT_ID, 'thread-1', 'other'),
		).resolves.toBe(0);
	});
});
