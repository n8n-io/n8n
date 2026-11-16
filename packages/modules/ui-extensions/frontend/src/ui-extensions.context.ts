import type { UiExtensionNode, UiExtensionPageContext } from '@n8n/api-types';

import type { SidePanelView } from './ui-extensions.types';

/** Copies only the node fields of the contract. */
function copyNode(node: UiExtensionNode): UiExtensionNode {
	return {
		name: node.name,
		type: node.type,
		...(node.displayName !== undefined && { displayName: node.displayName }),
		...(node.defaultName !== undefined && { defaultName: node.defaultName }),
		...(node.isTrigger !== undefined && { isTrigger: node.isTrigger }),
		...(node.disabled !== undefined && { disabled: node.disabled }),
	};
}

/**
 * The context that one view may see. A view can send out anything that it sees,
 * so a view from an MCP client sees only what that client can read through MCP:
 * a workflow only when it is available in MCP, and no workflow count. The
 * built-in view ships with n8n and sees the full context.
 *
 * The result is a plain object, so it can go through `postMessage`.
 */
export function contextForView(
	view: Pick<SidePanelView, 'builtin'>,
	context: UiExtensionPageContext,
	workflowAvailableInMcp: boolean,
): UiExtensionPageContext {
	switch (context.page) {
		case 'workflow': {
			const visible = view.builtin || workflowAvailableInMcp;
			const workflow = visible && context.workflow ? context.workflow : null;
			return {
				page: 'workflow',
				routeName: context.routeName,
				workflow: workflow && {
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
					nodes: workflow.nodes.map(copyNode),
					...(workflow.hasErrorWorkflow !== undefined && {
						hasErrorWorkflow: workflow.hasErrorWorkflow,
					}),
				},
			};
		}
		case 'workflows':
			return {
				page: 'workflows',
				routeName: context.routeName,
				projectId: context.projectId,
				totalWorkflows: view.builtin ? context.totalWorkflows : null,
			};
		case 'other':
			return { page: 'other', routeName: context.routeName };
	}
}
