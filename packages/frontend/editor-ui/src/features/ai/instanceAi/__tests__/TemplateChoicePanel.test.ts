import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTemplateWorkflow } from '@/features/workflows/templates/utils/templateActions';
import TemplateChoicePanel from '../components/TemplateChoicePanel.vue';

vi.mock('@/features/workflows/templates/utils/templateActions', () => ({
	useTemplateWorkflow: vi.fn(),
}));

const renderComponent = createComponentRenderer(TemplateChoicePanel, {
	global: {
		plugins: [createTestingPinia()],
		stubs: {
			N8nButton: {
				props: ['label', 'disabled', 'loading'],
				template:
					'<button :disabled="disabled" @click="$emit(`click`, $event)">{{ label }}</button>',
			},
			N8nIcon: { template: '<span />' },
		},
	},
});

describe('TemplateChoicePanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('emits adapt_with_agent immediately', async () => {
		const { emitted } = renderComponent({
			props: {
				requestId: 'req-1',
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
				introMessage: 'Pick one',
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Adapt with agent' }));

		expect(emitted().submit[0]).toEqual([
			{
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
		]);
	});

	it('waits for useTemplateWorkflow before emitting use_now', async () => {
		vi.mocked(useTemplateWorkflow).mockResolvedValue(undefined);
		const { emitted } = renderComponent({
			props: {
				requestId: 'req-1',
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Use now' }));

		expect(useTemplateWorkflow).toHaveBeenCalled();
		expect(emitted().submit[0]).toEqual([
			{
				action: 'use_now',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
		]);
	});

	it('shows an error and does not emit when use-now fails', async () => {
		vi.mocked(useTemplateWorkflow).mockRejectedValue(new Error('open failed'));
		const { emitted } = renderComponent({
			props: {
				requestId: 'req-1',
				templates: [{ templateId: 101, name: 'Slack alert triage' }],
				totalResults: 4,
			},
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Use now' }));

		expect(screen.getByText('Could not open the template. Try again.')).toBeInTheDocument();
		expect(emitted().submit).toBeUndefined();
	});
});
