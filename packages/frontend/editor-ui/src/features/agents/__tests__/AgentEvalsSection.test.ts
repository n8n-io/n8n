import { describe, it, expect, vi } from 'vitest';
import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalsSection from '../components/AgentEvalsSection.vue';

// Components use `data-testid`; the global setup configures `data-test-id`.
configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const renderComponent = createComponentRenderer(AgentEvalsSection);

describe('AgentEvalsSection', () => {
	it('renders the first-run state with its title, description and CTA', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByTestId('agent-evals-section')).toBeInTheDocument();
		expect(getByTestId('agent-evals-empty-state')).toBeInTheDocument();
		// Asserting on the mocked key prefix verifies the keys we intended rather
		// than arbitrary copy.
		expect(getByText('mocked-agents.builder.agentEvals.empty.title')).toBeInTheDocument();
		expect(getByText('mocked-agents.builder.agentEvals.empty.description')).toBeInTheDocument();
	});

	it('emits generate when the CTA is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('agent-evals-generate-button'));

		expect(emitted('generate')).toBeTruthy();
	});

	it('disables the CTA for users who cannot edit the agent', () => {
		const { getByTestId } = renderComponent({ props: { disabled: true } });

		expect(getByTestId('agent-evals-generate-button')).toBeDisabled();
	});
});
