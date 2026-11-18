import { ExecutionRepository, type IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import { toJsonValue, type JSONObject, type JSONValue } from '@n8n/utils/json/to-json-value';
import {
	AGENT_LANGCHAIN_NODE_TYPE,
	NodeConnectionTypes,
	getChildNodes,
	type INode,
} from 'n8n-workflow';

import { AgentExecutionLogStore } from '@/modules/agents/execution-log/agent-execution-log-store';
import type { TimelineEvent } from '@/modules/agents/execution-recorder';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';

import {
	RunCollector,
	type DeterminismSource,
	type RecordedRun,
	type RecordedToolCall,
} from './agent-determinism.contracts';
import { classifyRunDataSteps, sumRunDataTokens } from './step-classification';

function asObject(value: JSONValue): JSONObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : { value };
}

function agentAnswer(json: JSONValue): JSONValue {
	const object = asObject(json);
	return typeof object.output === 'string' ? object.output : json;
}

@Service()
export class StubRunCollector extends RunCollector {
	constructor(
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly logStore: AgentExecutionLogStore,
		private readonly executionRepository: ExecutionRepository,
	) {
		super();
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
			const blobRefs = executions
				.filter(
					(
						execution,
					): execution is typeof execution & {
						storedAt: Exclude<typeof execution.storedAt, 'db'>;
					} => execution.storedAt !== 'db',
				)
				.map((execution) => ({
					agentId,
					threadId,
					executionId: execution.id,
					storedAt: execution.storedAt,
				}));
			const logs = blobRefs.length > 0 ? await this.logStore.readMany(blobRefs) : new Map();

			for (const execution of executions) {
				const timeline: TimelineEvent[] =
					logs.get(execution.id)?.timeline ?? execution.timeline ?? [];
				const toolCalls: RecordedToolCall[] = timeline.flatMap((event) =>
					event.type === 'tool-call'
						? [
								{
									name: event.name,
									input: toJsonValue(event.input),
									output: toJsonValue(event.output),
								},
							]
						: [],
				);
				const answer = timeline.filter((event) => event.type === 'text').at(-1);
				runs.push({
					id: execution.id,
					succeeded: execution.status === 'success',
					input: { message: execution.userMessage },
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
		return executions.flatMap((execution) => {
			const run = this.toWorkflowRun(execution);
			return run ? [run] : [];
		});
	}

	private toWorkflowRun(execution: IExecutionResponse): RecordedRun | null {
		const runData = execution.data.resultData.runData;
		const { nodes, connections } = execution.workflowData;
		const agent = nodes.find((node) => node.type === AGENT_LANGCHAIN_NODE_TYPE);
		const trigger = this.findTrigger(nodes, connections, Object.keys(runData));
		if (!agent || !trigger) return null;

		const toolNames = nodes
			.filter((node) =>
				getChildNodes(connections, node.name, NodeConnectionTypes.AiTool, 1).includes(agent.name),
			)
			.map((node) => node.name);
		const toolCalls: RecordedToolCall[] = toolNames.flatMap((name) =>
			(runData[name] ?? []).map((task) => ({
				name,
				input: toJsonValue(task.inputOverride?.ai_tool?.[0]?.[0]?.json ?? null),
				output: toJsonValue(task.data?.ai_tool?.[0]?.[0]?.json ?? null),
			})),
		);

		return {
			id: execution.id,
			succeeded: execution.status === 'success',
			input: asObject(toJsonValue(runData[trigger.name]?.[0]?.data?.main?.[0]?.[0]?.json ?? {})),
			output: agentAnswer(
				toJsonValue(runData[agent.name]?.at(-1)?.data?.main?.[0]?.[0]?.json ?? null),
			),
			toolCalls,
			steps: classifyRunDataSteps(runData, execution.workflowData),
			totalTokens: sumRunDataTokens(runData),
		};
	}

	private findTrigger(
		nodes: INode[],
		connections: IExecutionResponse['workflowData']['connections'],
		ranNodes: string[],
	) {
		const targets = new Set(
			Object.values(connections).flatMap((outputs) =>
				(outputs.main ?? []).flat().map((connection) => connection?.node),
			),
		);
		return nodes.find(
			(node) =>
				ranNodes.includes(node.name) &&
				!targets.has(node.name) &&
				!this.isSubNode(node, connections),
		);
	}

	private isSubNode(node: INode, connections: IExecutionResponse['workflowData']['connections']) {
		const outputs = connections[node.name];
		return outputs !== undefined && outputs.main === undefined;
	}
}
