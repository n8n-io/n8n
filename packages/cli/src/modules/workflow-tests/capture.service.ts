import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import type { INodeExecutionData, IPinData } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { NodeExpectation, WorkflowTestCapture } from './workflow-tests.types';

const EXTERNAL_NODE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.executeWorkflow',
]);

@Service()
export class CaptureService {
	constructor(private readonly executionRepository: ExecutionRepository) {}

	async captureFromExecution(executionId: string) {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!execution) throw new NotFoundError(`Execution ${executionId} not found`);
		return { capture: this.buildCapture(execution), workflowId: execution.workflowId };
	}

	buildCapture(execution: IExecutionResponse): WorkflowTestCapture {
		const { workflowData } = execution;
		const runData = execution.data.resultData.runData ?? {};
		const nodesByName = new Map(workflowData.nodes.map((n) => [n.name, n]));

		const hasIncomingMain = new Set<string>();
		for (const conns of Object.values(workflowData.connections ?? {})) {
			for (const branch of conns.main ?? []) {
				for (const conn of branch ?? []) hasIncomingMain.add(conn.node);
			}
		}

		let triggerNodeName: string | undefined;
		let triggerIndex = Infinity;
		for (const [name, tasks] of Object.entries(runData)) {
			if (!nodesByName.has(name) || hasIncomingMain.has(name)) continue;
			const idx = tasks[0]?.executionIndex ?? Infinity;
			if (idx < triggerIndex) {
				triggerIndex = idx;
				triggerNodeName = name;
			}
		}
		if (!triggerNodeName) {
			throw new UnexpectedError('Could not identify the trigger node from this execution');
		}

		const fixtures: IPinData = {};
		const expectations: NodeExpectation[] = [];

		for (const [name, tasks] of Object.entries(runData)) {
			const node = nodesByName.get(name);
			if (!node) continue;
			const task = tasks[0];
			const mainOutputs = task?.data?.main ?? [];

			const isMocked =
				name === triggerNodeName ||
				(node.credentials && Object.keys(node.credentials).length > 0) ||
				EXTERNAL_NODE_TYPES.has(node.type);

			if (isMocked) {
				const items = mainOutputs.find((branch) => branch && branch.length > 0);
				if (items) fixtures[name] = items.map(sanitizeItem);
			} else if (task?.data?.main) {
				expectations.push({
					nodeName: name,
					executionIndex: task.executionIndex ?? 0,
					outputs: sanitizeBranches(mainOutputs),
				});
			}
		}

		expectations.sort((a, b) => a.executionIndex - b.executionIndex);
		return { triggerNodeName, fixtures, expectations };
	}
}

export function sanitizeItem(item: INodeExecutionData): { json: INodeExecutionData['json'] } {
	return { json: item.json };
}

/** Sanitize every branch of a node's main output to `{ json }`-only items, `[]` for a null branch. */
export function sanitizeBranches(
	mainOutputs: Array<INodeExecutionData[] | null>,
): Array<Array<{ json: INodeExecutionData['json'] }>> {
	return mainOutputs.map((branch) => (branch ?? []).map(sanitizeItem));
}
