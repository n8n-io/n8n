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

const SIDE_EFFECT_FREE_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.set',
	'n8n-nodes-base.code',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.filter',
	'n8n-nodes-base.stickyNote',
]);
const SIDE_EFFECT_FREE_PREFIXES = [
	'@n8n/n8n-nodes-langchain.lmChat',
	'@n8n/n8n-nodes-langchain.chain',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.informationExtractor',
	'@n8n/n8n-nodes-langchain.outputParser',
];

export type ReplayOutcome = { runData: IRunData; output: JSONValue | null };

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

		const pinData: Record<string, Array<{ json: IDataObject }>> = {
			[trigger.name]: [{ json: asItemJson(run.input) }],
			[FALLBACK_NODE_NAME]: [{ json: {} }],
		};
		for (const call of run.toolCalls) pinData[call.name] = [{ json: asItemJson(call.output) }];
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

		return { runData, output: outputJson === undefined ? null : toJsonValue(outputJson) };
	}
}
