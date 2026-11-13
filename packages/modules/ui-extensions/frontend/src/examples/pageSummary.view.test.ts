import type { UiExtensionPageContext } from '@n8n/api-types';
import { N8nBadge, N8nHeading, N8nText } from '@n8n/design-system';
import { render } from '@testing-library/vue';
import * as Vue from 'vue';

import source from './pageSummary.view.js?raw';

/** Runs the view module the way the view runtime does, with the two globals. */
function loadView(context: Vue.Ref<UiExtensionPageContext>) {
	const n8n = {
		useContext: () => Vue.computed(() => context.value),
		t: (key: string) => `t:${key.split('.').at(-1)}`,
	};
	const body = source.replace(/\bexport\s+default\b/, 'return ');
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	return new Function('Vue', 'n8n', body)(Vue, n8n) as Vue.Component;
}

function renderView(initial: UiExtensionPageContext) {
	const context = Vue.ref(initial);
	const result = render(loadView(context), {
		global: { components: { N8nBadge, N8nHeading, N8nText } },
	});
	return { ...result, context };
}

describe('Page summary view', () => {
	it('shows the workflow name, state and nodes on the workflow page', () => {
		const { getByTestId, getByText } = renderView({
			page: 'workflow',
			routeName: 'NodeViewExisting',
			workflow: {
				id: 'wf-1',
				name: 'Payroll',
				active: true,
				nodes: [{ name: 'Start', type: 'n8n-nodes-base.manualTrigger' }],
			},
		});

		expect(getByTestId('page-summary-workflow-name').textContent).toBe('Payroll');
		expect(getByText('t:active')).toBeTruthy();
		expect(getByTestId('page-summary-node-count').textContent).toContain('1');
		expect(getByText('n8n-nodes-base.manualTrigger')).toBeTruthy();
	});

	it('says so when it cannot see the workflow', () => {
		const { getByText, queryByTestId } = renderView({
			page: 'workflow',
			routeName: 'NodeViewExisting',
			workflow: null,
		});

		expect(getByText('t:hidden')).toBeTruthy();
		expect(queryByTestId('page-summary-workflow-name')).toBeNull();
	});

	it('shows the workflow count on the workflows list, and follows a page change', async () => {
		const { getByTestId, queryByTestId, context } = renderView({
			page: 'workflows',
			routeName: 'WorkflowsView',
			projectId: null,
			totalWorkflows: 7,
		});

		expect(getByTestId('page-summary-workflow-count').textContent).toContain('7');

		context.value = { page: 'other', routeName: 'SettingsPersonalView' };
		await Vue.nextTick();

		expect(queryByTestId('page-summary-workflow-count')).toBeNull();
		expect(getByTestId('page-summary-route').textContent).toBe('SettingsPersonalView');
	});
});
