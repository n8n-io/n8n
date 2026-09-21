import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentBuilderIntro from '../components/AgentBuilderIntro.vue';
import { AGENT_TEMPLATES } from '../agentTemplates';

const renderComponent = createComponentRenderer(AgentBuilderIntro);

describe('AgentBuilderIntro', () => {
	it('renders the intro copy and a row for each template', () => {
		const { getByTestId, getByText } = renderComponent();

		expect(getByTestId('instance-ai-agent-intro')).toBeInTheDocument();
		expect(getByText("Let's build your agent")).toBeInTheDocument();
		expect(getByText(/build and configure the agent/)).toBeInTheDocument();

		for (const template of AGENT_TEMPLATES) {
			expect(getByTestId(`agent-template-${template.id}`)).toBeInTheDocument();
		}
	});

	it('renders the label and description for each template', () => {
		const { getByText } = renderComponent();

		expect(getByText('Customer Support')).toBeInTheDocument();
		expect(getByText('Answer questions from a knowledge base over Telegram')).toBeInTheDocument();
	});

	it('emits the clicked template on select', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('agent-template-research-assistant'));

		expect(emitted().select).toHaveLength(1);
		expect(emitted().select[0]).toEqual([
			AGENT_TEMPLATES.find((t) => t.id === 'research-assistant'),
		]);
	});
});
