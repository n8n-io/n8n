import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { JSONValue } from '@n8n/utils/json/to-json-value';
import { toJsonValue } from '@n8n/utils/json/to-json-value';
import type { IDataObject, INode, IRunData, IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { WorkflowRunner } from '@/workflow-runner';

import { DRAFT_OUTPUT_NODE_NAME, FALLBACK_NODE_NAME } from './agent-determinism.constants';
import type { RecordedRun } from './agent-determinism.contracts';
import { findTrigger } from './draft-guards';
import { matchActions, toolNameOf } from './output-match';
import { effectiveCalls } from './trace-mining';

const SIDE_EFFECT_FREE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.set',
	'n8n-nodes-base.code',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.splitOut',
	'n8n-nodes-base.stickyNote',
]);
const SIDE_EFFECT_FREE_PREFIXES = [
	'@n8n/n8n-nodes-langchain.lmChat',
	'@n8n/n8n-nodes-langchain.chain',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.outputParser',
];

export type ReplayOutcome = { runData: IRunData; output: JSONValue | null; actionsMatch: boolean };

function asItemJson(value: JSONValue): IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? { ...value }
		: { value };
}

function isSideEffectFree(node: INode) {
	return (
		SIDE_EFFECT_FREE_TYPES.has(node.type) ||
		SIDE_EFFECT_FREE_PREFIXES.some((prefix) => node.type.startsWith(prefix))
	);
}

@Service()
export class DraftReplayRunner {
	constructor(
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
	) {}

	assertReplaySafe(draft: WorkflowEntity, pinnedNames: Set<string>) {
		const unsafe = draft.nodes.filter(
			(node) =>
				!pinnedNames.has(node.name) &&
				!node.name.startsWith('Fallback: ') &&
				!isSideEffectFree(node),
		);
		if (unsafe.length > 0) {
			throw new Error(
				`The draft has unpinned nodes with side effects: ${unsafe.map((node) => node.name).join(', ')}`,
			);
		}
	}

	async replay(draft: WorkflowEntity, run: RecordedRun, userId: string): Promise<ReplayOutcome> {
		const trigger = findTrigger(draft);
		if (!trigger?.name) throw new Error('The draft has no trigger');

		// Tools never run in replay: each tool node returns what the agent's calls returned.
		// A node the run has no record for gets no items: the draft left the agent's path there.
		const recorded = new Map<string, Array<{ json: IDataObject }>>();
		for (const call of effectiveCalls(run.toolCalls)) {
			const items = recorded.get(call.name) ?? [];
			items.push({ json: asItemJson(call.output ?? null) });
			recorded.set(call.name, items);
		}
		const pinData: Record<string, Array<{ json: IDataObject }>> = {
			// `runAt` is the run's own time: time rules must not read the replay's clock.
			[trigger.name]: [{ json: { runAt: run.startedAt ?? null, ...asItemJson(run.input) } }],
			[FALLBACK_NODE_NAME]: [{ json: {} }],
		};
		const toolNodes = new Set<string>();
		for (const node of draft.nodes) {
			if (node.name in pinData || node.name.startsWith('Fallback: ')) continue;
			const items = recorded.get(toolNameOf(node.name));
			if (items || !isSideEffectFree(node)) {
				pinData[node.name] = items ?? [];
				toolNodes.add(node.name);
			}
		}
		this.assertReplaySafe(draft, new Set(Object.keys(pinData)));

		const data: IWorkflowExecutionDataProcess = {
			executionMode: 'manual',
			pinData,
			workflowData: draft,
			userId,
			triggerToStartFrom: { name: trigger.name },
		};
		const executionId = await this.workflowRunner.run(data);
		const result = await this.activeExecutions.getPostExecutePromise(executionId);
		const runData = result?.data.resultData.runData ?? {};
		const outputJson = runData[DRAFT_OUTPUT_NODE_NAME]?.at(-1)?.data?.main?.[0]?.[0]?.json;
		const output = outputJson === undefined ? null : toJsonValue(outputJson.output ?? outputJson);

		return {
			runData,
			output,
			actionsMatch: matchActions(draft, runData, run, toolNodes),
		};
	}
}
