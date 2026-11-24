import { configure, fireEvent } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import AgentTestRunEmptyState from '../components/chatMode/AgentTestRunEmptyState.vue';

configure({ testIdAttribute: 'data-testid' });

describe('AgentTestRunEmptyState', () => {
	const renderEmptyState = createComponentRenderer(AgentTestRunEmptyState);

	it('renders the safe-testing title, two bullets, and clickable starter chips', async () => {
		const { getByTestId, getAllByTestId, emitted } = renderEmptyState({
			props: {
				agentConfig: { name: 'Support Agent', instructions: '', model: 'openai/gpt-4o' },
				starterPrompts: ['Check open tickets', 'Draft a weekly summary'],
			},
		});

		expect(getByTestId('agent-test-run-empty-title')).toHaveTextContent(
			'Test Support Agent safely',
		);
		expect(getByTestId('agent-test-run-empty-bullets')).toHaveTextContent(
			'Looks things up in your apps for real',
		);
		expect(getByTestId('agent-test-run-empty-bullets')).toHaveTextContent(
			'Holds every send and change for you to review',
		);

		const chips = getAllByTestId('agent-test-run-starter-chip');
		expect(chips).toHaveLength(2);
		await fireEvent.click(chips[0]);
		expect(emitted('select-prompt')).toEqual([['Check open tickets']]);
	});

	it('falls back to a generic title when the agent has no name', () => {
		const { getByTestId } = renderEmptyState({
			props: { agentConfig: null },
		});

		expect(getByTestId('agent-test-run-empty-title')).toHaveTextContent('Test this agent safely');
	});
});
