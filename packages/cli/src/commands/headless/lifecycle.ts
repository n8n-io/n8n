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

// Node types that listen for HTTP requests. Only when one of these is
// present in an activated workflow does headless need to bind a port.
const WEBHOOK_TRIGGER_TYPES = new Set(['n8n-nodes-base.webhook', 'n8n-nodes-base.formTrigger']);

export interface LifecycleRunOptions {
	port: number;
	host: string;
	/**
	 * Aborting this signal triggers an orderly shutdown of the long-lived
	 * branch. Ignored by the manual branch, which always runs each workflow
	 * to natural completion.
	 */
	signal: AbortSignal;
}

export interface Lifecycle {
	kind: 'manual' | 'long-lived';
	/**
	 * True when at least one activated workflow has an HTTP-driven trigger
	 * (webhook, formTrigger). The Headless command stands up the HTTP
	 * listener only in this case — schedule-only or polling-only sets keep
	 * the process alive without ever opening a port.
	 */
	needsWebhookListener: boolean;
	run(opts: LifecycleRunOptions): Promise<void>;
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

function workflowNeedsWebhookListener(workflow: CreatedWorkflow): boolean {
	return workflow.parsed.nodes.some((node) => WEBHOOK_TRIGGER_TYPES.has(node.type));
}

export function detectLifecycle(workflows: CreatedWorkflow[], owner: User): Lifecycle {
	const nodeTypes = Container.get(NodeTypes);
	const longLived = workflows.some((wf) => workflowIsLongLived(wf, nodeTypes));
	const needsWebhookListener = workflows.some(workflowNeedsWebhookListener);

	if (longLived) {
		return {
			kind: 'long-lived',
			needsWebhookListener,
			async run({ signal }) {
				try {
					await engineAdapter.waitWhileActive(signal);
				} finally {
					await engineAdapter.deactivateAll();
				}
			},
		};
	}

	return {
		kind: 'manual',
		needsWebhookListener: false,
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
