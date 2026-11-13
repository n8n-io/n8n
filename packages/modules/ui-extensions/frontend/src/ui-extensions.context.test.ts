import type { UiExtensionPageContext } from '@n8n/api-types';

import { contextForView } from './ui-extensions.context';

const workflowContext: UiExtensionPageContext = {
	page: 'workflow',
	routeName: 'NodeViewExisting',
	workflow: {
		id: 'wf-1',
		name: 'Payroll',
		active: true,
		nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }],
	},
};

const listContext: UiExtensionPageContext = {
	page: 'workflows',
	routeName: 'WorkflowsView',
	projectId: null,
	totalWorkflows: 12,
};

const builtin = { builtin: true };
const mcpView = { builtin: false };

describe('contextForView', () => {
	it('gives the built-in view the full workflow, even when it is not available in MCP', () => {
		expect(contextForView(builtin, workflowContext, false)).toEqual(workflowContext);
	});

	it('gives the built-in view the workflow count', () => {
		expect(contextForView(builtin, listContext, false)).toEqual(listContext);
	});

	it('hides the workflow from an MCP view when the workflow is not available in MCP', () => {
		expect(contextForView(mcpView, workflowContext, false)).toEqual({
			page: 'workflow',
			routeName: 'NodeViewExisting',
			workflow: null,
		});
	});

	it('gives an MCP view the workflow when it is available in MCP', () => {
		expect(contextForView(mcpView, workflowContext, true)).toEqual(workflowContext);
	});

	it('hides the workflow count from an MCP view', () => {
		expect(contextForView(mcpView, listContext, true)).toEqual({
			...listContext,
			totalWorkflows: null,
		});
	});

	it('passes the other pages through', () => {
		const other: UiExtensionPageContext = { page: 'other', routeName: 'SettingsPersonalView' };
		expect(contextForView(mcpView, other, false)).toEqual(other);
	});

	it('copies only the node name and type', () => {
		const withExtra = {
			...workflowContext,
			workflow: {
				...workflowContext.workflow!,
				nodes: [{ name: 'Start', type: 't', parameters: { secret: 'x' } }],
			},
		} as unknown as UiExtensionPageContext;

		const result = contextForView(builtin, withExtra, true);

		expect(result.page === 'workflow' && result.workflow?.nodes).toEqual([
			{ name: 'Start', type: 't' },
		]);
	});
});
