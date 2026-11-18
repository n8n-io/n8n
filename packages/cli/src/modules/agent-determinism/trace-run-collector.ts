import { Logger } from '@n8n/backend-common';
import { ExecutionRepository, type IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue, type JSONObject, type JSONValue } from '@n8n/utils/json/to-json-value';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	getParentNodes,
	mapConnectionsByDestination,
	type ITaskData,
} from 'n8n-workflow';

import { AgentExecutionLogStore } from '@/modules/agents/execution-log/agent-execution-log-store';
import type { TimelineEvent } from '@/modules/agents/execution-recorder';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';

import {
	RunCollector,
	type DeterminismSource,
	type RecordedRun,
	type RecordedToolCall,
} from './agent-determinism.contracts';
import { classifyRunDataSteps, sumRunDataTokens } from './step-classification';
import { SCHEDULE_TRIGGER } from './trace-mining';

/** Built-in tool search: its position varies between runs, so it would split groups. */
const IGNORED_TOOLS = new Set(['anthropic.tool_search']);
/** Calls of one model step start right after each other; a model round trip takes longer. */
const PARALLEL_GAP_MS = 100;

const asObject = (value: JSONValue): JSONObject =>
	value !== null && typeof value === 'object' && !Array.isArray(value) ? value : { value };

function normalizeTrigger(value: string) {
	return /schedule|cron|task/i.test(value) ? SCHEDULE_TRIGGER : value;
}

/** n8n wraps a node's output in items; one item is the result itself. */
function unwrapItems(output: unknown): JSONValue {
	if (!isRecord(output) || !Array.isArray(output.data)) return toJsonValue(output ?? null);
	const items = output.data.map((item: unknown) => (isRecord(item) ? item.json : item));
	return toJsonValue(items.length === 1 ? items[0] : items);
}

function messageText(content: unknown): string {
	if (typeof content === 'string') return content;
	if (!isRecord(content)) return '';
	const parts = Array.isArray(content.content) ? content.content : [content.content];
	return parts
		.map((part: unknown) =>
			typeof part === 'string'
				? part
				: isRecord(part) && typeof part.text === 'string'
					? part.text
					: '',
		)
		.join('\n');
}

/** Gives each call the index of its model step: calls less than 100 ms apart ran in parallel. */
function withModelSteps(calls: Array<RecordedToolCall & { start: number; end: number }>) {
	let step = 0;
	return calls.map(({ start, end, ...call }, index) => {
		if (index > 0 && start - calls[index - 1].end >= PARALLEL_GAP_MS) step++;
		return { ...call, step };
	});
}

@Service()
export class TraceRunCollector extends RunCollector {
	constructor(
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly messageRepository: AgentMessageRepository,
		private readonly logStore: AgentExecutionLogStore,
		private readonly executionRepository: ExecutionRepository,
		private readonly logger: Logger,
	) {
		super();
		this.logger = logger.scoped('agent-determinism');
	}

	async collect(source: DeterminismSource, limit: number): Promise<RecordedRun[]> {
		return source.type === 'agent'
			? await this.collectAgentRuns(source.id, limit)
			: await this.collectWorkflowRuns(source.id, limit);
	}

	private async collectAgentRuns(agentId: string, limit: number): Promise<RecordedRun[]> {
		const runs: RecordedRun[] = [];
		for (const threadId of await this.threadRepository.findIdsByAgentId(agentId)) {
			const executions = await this.agentExecutionRepository.findByThreadIdOrdered(threadId);
			const blobRefs = executions.flatMap((execution) =>
				execution.storedAt === 'db'
					? []
					: [{ agentId, threadId, executionId: execution.id, storedAt: execution.storedAt }],
			);
			const logs = blobRefs.length > 0 ? await this.logStore.readMany(blobRefs) : new Map();
			// `userMessage` is empty for chat and task runs: the request is the execution's input message.
			const inputs = await this.messageRepository.findExecutionInputs(executions.map((e) => e.id));

			for (const execution of executions) {
				const timeline: TimelineEvent[] =
					logs.get(execution.id)?.timeline ?? execution.timeline ?? [];
				const toolCalls = withModelSteps(
					timeline.flatMap((event) =>
						event.type === 'tool-call' && !IGNORED_TOOLS.has(event.name)
							? [
									{
										name: event.name,
										input: toJsonValue(event.input ?? {}),
										output: unwrapItems(event.output),
										ok: event.success,
										start: event.startTime,
										end: event.endTime,
									},
								]
							: [],
					),
				);
				const answer = timeline.filter((event) => event.type === 'text').at(-1);
				const message =
					execution.userMessage ??
					(inputs.get(execution.id) ?? []).map((m) => messageText(m.content)).join('\n');
				runs.push({
					id: execution.id,
					trigger: normalizeTrigger(execution.source ?? 'chat'),
					succeeded: execution.status === 'success',
					input: { message },
					output: answer?.type === 'text' ? answer.content : null,
					toolCalls,
					steps: { llmDecided: toolCalls.length + 1, codeDecided: 0 },
					totalTokens: execution.totalTokens,
				});
			}
			if (runs.length >= limit) break;
		}
		return runs.slice(0, limit);
	}

	private async collectWorkflowRuns(workflowId: string, limit: number): Promise<RecordedRun[]> {
		const executions = await this.executionRepository.findMultipleExecutions(
			{ where: { workflowId, status: 'success' }, order: { id: 'DESC' }, take: limit },
			{ includeData: true, unflattenData: true },
		);
		const runs = executions.flatMap((execution) => {
			const run = this.toWorkflowRun(execution);
			return run ? [run] : [];
		});
		const skipped = executions.length - runs.length;
		if (skipped > 0) {
			this.logger.info(`Skipped ${skipped} workflow runs with redacted or missing agent data`, {
				workflowId,
			});
		}
		return runs;
	}

	private toWorkflowRun(execution: IExecutionResponse): RecordedRun | null {
		const runData = execution.data.resultData.runData;
		const { nodes, connections } = execution.workflowData;
		const agent = nodes.find((node) => node.type === AGENT_LANGCHAIN_NODE_TYPE);
		const agentTask = agent ? runData[agent.name]?.[0] : undefined;
		if (!agent || !agentTask) return null;
		// Redacted runs have placeholders instead of tool data; mining them would learn noise.
		if (JSON.stringify(runData).includes('"redacted":true')) return null;

		// The agent's input is what its parent node passed to it, not the raw trigger output.
		const parent = agentTask.source?.[0];
		const input = parent
			? runData[parent.previousNode]?.[parent.previousNodeRun ?? 0]?.data?.main?.[
					parent.previousNodeOutput ?? 0
				]?.[0]?.json
			: undefined;

		const byDestination = mapConnectionsByDestination(connections);
		const modelStarts = getParentNodes(
			byDestination,
			agent.name,
			NodeConnectionTypes.AiLanguageModel,
			1,
		)
			.flatMap((name) => runData[name] ?? [])
			.map((task) => task.startTime)
			.sort((a, b) => a - b);
		const toolNames = getParentNodes(byDestination, agent.name, NodeConnectionTypes.AiTool, 1);

		// Order by model step, then tool name, then start time: calls of one step have no real order.
		const toolCalls: RecordedToolCall[] = toolNames
			.flatMap((name) =>
				(runData[name] ?? []).map((task: ITaskData) => {
					const args = task.inputOverride?.ai_tool?.[0]?.[0]?.json;
					const result = task.data?.ai_tool?.[0]?.[0]?.json;
					return {
						name,
						input: args === undefined ? undefined : toJsonValue(args),
						output: result === undefined ? undefined : toJsonValue(result),
						ok: task.executionStatus === 'success' && !task.error,
						step: modelStarts.filter((start) => start < task.startTime).length,
						start: task.startTime,
					};
				}),
			)
			.sort((a, b) => a.step - b.step || a.name.localeCompare(b.name) || a.start - b.start)
			.map(({ start, ...call }) => call);

		const inputJson = asObject(toJsonValue(input ?? {}));
		const answer = asObject(toJsonValue(agentTask.data?.main?.[0]?.[0]?.json ?? null));
		const triggerNode = nodes.find(
			(node) =>
				!Object.values(connections).some((outputs) =>
					(outputs.main ?? []).flat().some((connection) => connection?.node === node.name),
				) && runData[node.name],
		);
		return {
			id: execution.id,
			trigger: normalizeTrigger(
				typeof inputJson.source === 'string'
					? inputJson.source
					: (triggerNode?.type.split('.').pop() ?? 'webhook'),
			),
			succeeded: execution.status === 'success',
			input: inputJson,
			output: answer.output ?? null,
			toolCalls,
			steps: classifyRunDataSteps(runData, execution.workflowData),
			totalTokens: sumRunDataTokens(runData),
		};
	}
}
