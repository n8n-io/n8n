import type { NodeMigration } from '../node-migration';

/**
 * Workflow Trigger to n8n Trigger.
 *
 * Does:
 * - Target: `n8nTrigger`, version 1.
 * - Keeps: `events` with the same name and values (`activate`, `update`). The new node
 *   only adds `init`.
 *
 * Refuses when:
 * - `events` is an expression or has a value other than `activate` or `update`.
 *
 * Accepted changes:
 * - For `activate`, the event text changes from "Workflow activated" to "Workflow
 *   published". Reported as a note.
 */
export const workflowTriggerToN8nTrigger: NodeMigration = {
	ruleId: 'workflow-trigger-removed-v3',
	migrate: (node) => {
		const { events = [] } = node.parameters;
		if (
			!Array.isArray(events) ||
			!events.every((event) => event === 'activate' || event === 'update')
		) {
			throw new Error(
				'"Events" is an expression or has an unsupported value, so the node cannot be migrated automatically.',
			);
		}

		return {
			node: {
				type: 'n8n-nodes-base.n8nTrigger',
				typeVersion: 1,
				parameters: { events },
			},
			notes: events.includes('activate')
				? [
						'The event text for activation changed from "Workflow activated" to "Workflow published".',
					]
				: undefined,
		};
	},
};
