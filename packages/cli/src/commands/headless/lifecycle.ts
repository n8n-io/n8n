import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type { CreatedWorkflow } from './crud-adapter';
import { engineAdapter } from './engine-adapter';

import { NodeTypes } from '@/node-types';

const MANUAL_TYPES = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.start', // legacy pre-Manual-Trigger node, still considered manual-style.
]);

export interface Lifecycle {
	kind: 'manual' | 'long-lived';
	run(opts: { port: number; host: string }): Promise<void>;
}

function isLongLivedNode(node: INode, nodeTypes: NodeTypes): boolean {
	if (MANUAL_TYPES.has(node.type)) return false;

	try {
		const description = nodeTypes.getByNameAndVersion(node.type, node.typeVersion)?.description;
		return Array.isArray(description?.group) && description.group.includes('trigger');
	} catch {
		// If a node type cannot be resolved (e.g. missing from the loaded set),
		// err on the safe side and treat it as not-a-trigger so we exit cleanly
		// rather than keeping the process alive indefinitely.
		return false;
	}
}

function workflowIsLongLived(workflow: CreatedWorkflow, nodeTypes: NodeTypes): boolean {
	return workflow.parsed.nodes.some((node) => isLongLivedNode(node, nodeTypes));
}

export function detectLifecycle(workflows: CreatedWorkflow[], owner: User): Lifecycle {
	const nodeTypes = Container.get(NodeTypes);
	const longLived = workflows.some((wf) => workflowIsLongLived(wf, nodeTypes));

	if (longLived) {
		return {
			kind: 'long-lived',
			async run() {
				throw new UnexpectedError(
					'Long-lived workflow execution is not yet implemented — Task 8 of the headless implementation plan adds the webhook listener and graceful shutdown wiring.',
				);
			},
		};
	}

	return {
		kind: 'manual',
		async run() {
			const errors: string[] = [];
			for (const wf of workflows) {
				const result = await engineAdapter.runOnce(owner, wf.id);
				if (result.status === 'error') {
					errors.push(
						`workflow "${wf.name}" (${wf.id}): ${result.errorMessage ?? 'unknown error'}`,
					);
				}
			}
			if (errors.length > 0) {
				throw new UnexpectedError(
					`headless: ${errors.length} of ${workflows.length} workflow run(s) failed:\n${errors.join('\n')}`,
				);
			}
		},
	};
}
