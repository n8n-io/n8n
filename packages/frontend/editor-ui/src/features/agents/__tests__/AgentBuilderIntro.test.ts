import { assert, describe, it, expect } from 'vitest';
import { useI18n } from '@n8n/i18n';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentBuilderIntro from '../components/AgentBuilderIntro.vue';
import { AGENT_TEMPLATES } from '../agentTemplates';

const renderComponent = createComponentRenderer(AgentBuilderIntro);

describe('AgentBuilderIntro', () => {
	it('renders the intro copy and a row for each template', () => {
		const { getByTestId, getByText, getByRole, getAllByRole } = renderComponent();
		const i18n = useI18n();

		expect(getByTestId('instance-ai-agent-intro')).toBeInTheDocument();
		expect(getByText('What should your agent do?')).toBeInTheDocument();
		expect(getByText("Tell me the job. I'll handle the setup.")).toBeInTheDocument();

		expect(getAllByRole('button')).toHaveLength(AGENT_TEMPLATES.length);
		for (const template of AGENT_TEMPLATES) {
			expect(
				getByRole('button', {
					name: (name) => name.startsWith(i18n.baseText(template.labelKey)),
				}),
			).toBeInTheDocument();
		}
	});

	it('renders the label and description for each template', () => {
		const { getByText } = renderComponent();

		expect(getByText('Morning news brief')).toBeInTheDocument();
		expect(getByText("Sends a daily summary of today's top headlines.")).toBeInTheDocument();
	});

	it('renders an icon for each template row', () => {
		const { getByTestId } = renderComponent();

		for (const template of AGENT_TEMPLATES) {
			expect(getByTestId(`agent-template-icon-${template.id}`)).toBeInTheDocument();
		}
	});

	it.each(['row', 'label', 'icon', 'arrow'] as const)(
		'emits the template once when its %s is clicked',
		async (target) => {
			const user = userEvent.setup();
			const { emitted, getByRole, getByText, getByTestId } = renderComponent();
			const row = getByRole('button', { name: /^Morning news brief/ });
			const targets = {
				row,
				label: getByText('Morning news brief'),
				icon: getByTestId('agent-template-icon-morning-news-brief'),
				arrow: row.querySelector('[data-icon="arrow-right"]'),
			};
			const element = targets[target];
			assert(element);

			await user.click(element);

			expect(emitted().select).toEqual([
				[AGENT_TEMPLATES.find((template) => template.id === 'morning-news-brief')],
			]);
		},
	);

	it('focuses each template once in order without selecting it', async () => {
		const user = userEvent.setup();
		const { emitted, getAllByRole } = renderComponent();
		const buttons = getAllByRole('button');

		for (const button of buttons) {
			await user.tab();
			expect(button).toHaveFocus();
		}
		await user.tab();
		expect(document.body).toHaveFocus();
		expect(emitted().select).toBeUndefined();
	});

	it.each([
		{ name: 'Enter', key: '{Enter}' },
		{ name: 'Space', key: ' ' },
	])('emits the focused template once when $name is pressed', async ({ key }) => {
		const user = userEvent.setup();
		const { emitted, getAllByRole } = renderComponent();
		const buttons = getAllByRole('button');

		for (const [index, template] of AGENT_TEMPLATES.entries()) {
			await user.tab();
			expect(buttons[index]).toHaveFocus();

			await user.keyboard(key);

			expect(emitted().select).toHaveLength(index + 1);
			expect(emitted().select[index]).toEqual([template]);
		}
	});
});
