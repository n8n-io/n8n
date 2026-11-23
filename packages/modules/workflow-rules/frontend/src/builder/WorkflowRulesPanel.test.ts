import type { EffectiveWorkflowRulesResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import type { RuleFinding } from '@n8n/workflow-rules';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import WorkflowRulesPanel from './WorkflowRulesPanel.vue';
import WorkflowRulesStatusButton from './WorkflowRulesStatusButton.vue';
import { useWorkflowRulesStore } from '../workflow-rules.store';

const effective: EffectiveWorkflowRulesResponse = {
	instance: {
		rules: [{ ruleId: 'http-request-credential', severity: 'block' }],
		customRules: [],
	},
	project: null,
	defaults: {},
	exemptions: [],
};

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isModuleActive: () => true }),
}));

vi.mock('../workflow-rules.api', () => ({
	getEffectiveRules: vi.fn(async () => effective),
}));

const finding = (overrides: Partial<RuleFinding> = {}): RuleFinding => ({
	ruleId: 'http-request-credential',
	ruleKind: 'catalogue',
	scope: 'instance',
	severity: 'block',
	message: 'Node "Call API" sends requests without a credential.',
	params: { node: 'Call API' },
	nodeName: 'Call API',
	exempted: false,
	projectCanExempt: false,
	...overrides,
});

async function setup(findings: RuleFinding[]) {
	const pinia = createTestingPinia({ stubActions: false });
	const store = useWorkflowRulesStore(pinia);
	await store.load('project-1', 'workflow-1');
	store.setFindings(findings);
	return { pinia, store };
}

describe('WorkflowRulesPanel', () => {
	const renderPanel = createComponentRenderer(WorkflowRulesPanel);

	it('lists blocking findings with the rule title and the node', async () => {
		const { pinia } = await setup([
			finding(),
			finding({ severity: 'warn', ruleId: 'no-disabled-nodes' }),
		]);

		const { getByTestId, getAllByTestId, emitted } = renderPanel({ pinia });

		expect(getByTestId('workflow-rules-panel-summary')).toHaveTextContent(
			'1 finding blocks publishing',
		);
		expect(getByTestId('workflow-rules-group-block')).toHaveTextContent(
			'HTTP Request uses a credential',
		);
		expect(getByTestId('workflow-rules-group-warn')).toHaveTextContent('No deactivated nodes');

		await fireEvent.click(getAllByTestId('workflow-rules-finding-node')[0]);
		expect(emitted('select-node')).toEqual([['Call API']]);
	});

	it('celebrates a workflow that passes every rule', async () => {
		const { pinia } = await setup([]);

		const { getByTestId } = renderPanel({ pinia });

		expect(getByTestId('workflow-rules-panel-passing')).toHaveTextContent('All rules pass');
	});
});

describe('WorkflowRulesStatusButton', () => {
	const renderButton = createComponentRenderer(WorkflowRulesStatusButton);

	it('shows the blocking count and opens the panel', async () => {
		const { pinia, store } = await setup([finding(), finding({ nodeName: 'Other' })]);

		const { getByTestId } = renderButton({ pinia });

		expect(getByTestId('workflow-rules-status')).toHaveTextContent('2 blocking');
		await fireEvent.click(getByTestId('workflow-rules-status'));
		expect(store.panelRequests).toBe(1);
	});
});
