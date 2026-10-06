import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { useI18n } from '@n8n/i18n';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import AgentsListIntro from '../components/AgentsListIntro.vue';
import { AGENT_TEMPLATES } from '../agentTemplates';

const renderComponent = createComponentRenderer(AgentsListIntro);

describe('AgentsListIntro', () => {
	it('renders the intro copy, a create-blank button, and a row for each template', () => {
		const { getByTestId, getByRole } = renderComponent();
		const i18n = useI18n();

		expect(getByTestId('agents-list-intro')).toBeInTheDocument();
		expect(getByTestId('agents-list-intro-input').tagName).toBe('TEXTAREA');
		expect(getByRole('heading', { name: 'What should your agent do?' })).toBeInTheDocument();
		expect(getByRole('button', { name: 'Create blank' })).toBeInTheDocument();
		expect(
			getByRole('button', {
				name: (name) => name.startsWith(i18n.baseText(AGENT_TEMPLATES[0].labelKey)),
			}),
		).toBeInTheDocument();
	});

	it('focuses the composer on mount', async () => {
		const { getByRole } = renderComponent();

		await nextTick();

		expect(getByRole('textbox')).toHaveFocus();
	});

	it('emits create-blank when Create blank is clicked', async () => {
		const user = userEvent.setup();
		const { emitted, getByRole } = renderComponent();

		await user.click(getByRole('button', { name: 'Create blank' }));

		expect(emitted()['create-blank']).toHaveLength(1);
	});

	it('emits the trimmed prompt and ignores a blank submit', async () => {
		const user = userEvent.setup();
		const { emitted, getByRole } = renderComponent();
		const composer = getByRole('textbox');

		await user.type(composer, '   ');
		await user.keyboard('{Enter}');
		expect(emitted().submit).toBeUndefined();

		await user.type(composer, '  summarize my inbox  ');
		await user.keyboard('{Enter}');
		expect(emitted().submit).toEqual([['summarize my inbox']]);
	});

	it('emits the selected template', async () => {
		const user = userEvent.setup();
		const { emitted, getByRole } = renderComponent();

		await user.click(getByRole('button', { name: /^Morning news brief/ }));

		expect(emitted().select).toEqual([
			[AGENT_TEMPLATES.find((template) => template.id === 'morning-news-brief')],
		]);
	});

	it('does not emit a template when creation is disabled', async () => {
		const user = userEvent.setup();
		const { emitted, getByRole } = renderComponent({ props: { disabled: true } });

		await user.click(getByRole('button', { name: /^Morning news brief/ }));

		expect(emitted().select).toBeUndefined();
	});
});
