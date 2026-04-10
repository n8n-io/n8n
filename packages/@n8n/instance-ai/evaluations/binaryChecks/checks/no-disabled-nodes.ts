import type { BinaryCheck } from '../types';

/**
 * A freshly built workflow should not have disabled nodes.
 * Disabled nodes indicate the builder accidentally turned something off
 * or left scaffolding behind.
 */
export const noDisabledNodes: BinaryCheck = {
	name: 'no_disabled_nodes',
	description: 'No nodes are disabled in the workflow',
	kind: 'deterministic',
	run(workflow) {
		const disabled = (workflow.nodes ?? []).filter((n) => n.disabled === true).map((n) => n.name);

		return {
			pass: disabled.length === 0,
			...(disabled.length > 0 ? { comment: `Disabled nodes: ${disabled.join(', ')}` } : {}),
		};
	},
};
