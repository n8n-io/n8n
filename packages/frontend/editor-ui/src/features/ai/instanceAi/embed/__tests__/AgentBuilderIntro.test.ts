import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentBuilderIntro from '../AgentBuilderIntro.vue';

const renderComponent = createComponentRenderer(AgentBuilderIntro);

describe('AgentBuilderIntro', () => {
	it('renders the intro copy and the example prompts', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByTestId('instance-ai-agent-intro')).toBeInTheDocument();
		expect(getByText("Let's build your agent")).toBeInTheDocument();
		expect(getByText(/build and configure the agent for you/)).toBeInTheDocument();
		expect(getByTestId('instance-ai-agent-intro-example-triage-tickets')).toBeInTheDocument();
		expect(getByTestId('instance-ai-agent-intro-example-summarize-standups')).toBeInTheDocument();
		expect(getByTestId('instance-ai-agent-intro-example-competitor-report')).toBeInTheDocument();
	});

	it('emits a tagged pre-fill payload with the clicked example position', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-agent-intro-example-summarize-standups'));

		expect(emitted().select).toEqual([
			[
				{
					promptKey: 'instanceAi.embed.agentIntro.examples.summarizeStandups',
					suggestionId: 'summarize-standups',
					suggestionKind: 'quick_example',
					position: 2,
					prefillType: 'suggestion_catalog',
				},
			],
		]);
	});
});
