// Experiment cleanup (124_workflow_previews_above_assistant)
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';

import WorkflowPreviewsAboveAssistant from './WorkflowPreviewsAboveAssistant.vue';

const reducedMotion = { value: 'no-preference' };
const elementSize = { width: { value: 0 }, height: { value: 0 } };

vi.mock('@vueuse/core', () => ({
	usePreferredReducedMotion: () => reducedMotion,
	useElementSize: () => elementSize,
}));

const renderComponent = createComponentRenderer(WorkflowPreviewsAboveAssistant);

describe('WorkflowPreviewsAboveAssistant', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		reducedMotion.value = 'no-preference';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the first example with its title and does not cycle on its own', async () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-preview-example')).toHaveAttribute(
			'data-example-id',
			'score-my-leads',
		);
		expect(getByTestId('workflow-preview-title')).toHaveTextContent('Score my leads');

		await vi.advanceTimersByTimeAsync(10_000);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute(
			'data-example-id',
			'score-my-leads',
		);
	});

	it('shows the switcher only once the first workflow has finished building', async () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-preview-caption').className).toContain('captionHidden');

		await vi.advanceTimersByTimeAsync(3000);

		expect(getByTestId('workflow-preview-example')).toHaveAttribute('data-phase', 'idle');
		expect(getByTestId('workflow-preview-caption').className).not.toContain('captionHidden');
	});

	it('moves to the next example when the next arrow is clicked', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { getByTestId } = renderComponent();

		await user.click(getByTestId('workflow-preview-next'));

		expect(getByTestId('workflow-preview-example')).toHaveAttribute(
			'data-example-id',
			'schedule-social-posts',
		);
		expect(getByTestId('workflow-preview-title')).toHaveTextContent('Schedule social posts');

		await user.click(getByTestId('workflow-preview-next'));

		expect(getByTestId('workflow-preview-example')).toHaveAttribute(
			'data-example-id',
			'process-invoices',
		);
		expect(getByTestId('workflow-preview-title')).toHaveTextContent(
			'Process invoices from my inbox',
		);
	});

	it('wraps around in both directions', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { getByTestId } = renderComponent();

		await user.click(getByTestId('workflow-preview-previous'));
		expect(getByTestId('workflow-preview-example')).toHaveAttribute(
			'data-example-id',
			'process-invoices',
		);

		await user.click(getByTestId('workflow-preview-next'));
		expect(getByTestId('workflow-preview-example')).toHaveAttribute(
			'data-example-id',
			'score-my-leads',
		);
	});

	it('keeps the preview height constant across examples so the switcher stays put', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { getByTestId } = renderComponent();
		const getWrapperHeight = () =>
			getByTestId('workflow-preview-stage').parentElement?.style.height;

		const initialHeight = getWrapperHeight();
		expect(initialHeight).toMatch(/^\d+(\.\d+)?px$/);

		await user.click(getByTestId('workflow-preview-next'));
		expect(getWrapperHeight()).toBe(initialHeight);

		await user.click(getByTestId('workflow-preview-next'));
		expect(getWrapperHeight()).toBe(initialHeight);

		await user.click(getByTestId('workflow-preview-next'));
		expect(getWrapperHeight()).toBe(initialHeight);
	});

	it('dims caption and preview as one unit and hands hover to the preview', async () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('workflow-preview-unit').className).toContain('unitDimmed');
		expect(getByTestId('workflow-preview-stage').className).not.toContain('hovered');

		await fireEvent.mouseEnter(getByTestId('workflow-preview-unit'));
		expect(getByTestId('workflow-preview-unit').className).not.toContain('unitDimmed');
		expect(getByTestId('workflow-preview-stage').className).toContain('hovered');

		await fireEvent.mouseLeave(getByTestId('workflow-preview-unit'));
		expect(getByTestId('workflow-preview-unit').className).toContain('unitDimmed');
		expect(getByTestId('workflow-preview-stage').className).not.toContain('hovered');
	});

	it('keeps one canvas surface behind the preview across hover and example swaps', async () => {
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { getByTestId } = renderComponent();
		const area = getByTestId('workflow-preview-area');

		expect(area.className).not.toContain('previewAreaHovered');
		expect(area.contains(getByTestId('workflow-preview-example'))).toBe(true);
		expect(area.contains(getByTestId('workflow-preview-title'))).toBe(false);

		await fireEvent.mouseEnter(getByTestId('workflow-preview-unit'));
		expect(area.className).toContain('previewAreaHovered');

		await user.click(getByTestId('workflow-preview-next'));
		expect(getByTestId('workflow-preview-area')).toBe(area);
		expect(area.className).toContain('previewAreaHovered');
		expect(area.contains(getByTestId('workflow-preview-example'))).toBe(true);
	});

	it('offers "Try this example" on hover, previewing and injecting the example prompt', async () => {
		const { getByTestId, emitted } = renderComponent();
		const button = getByTestId('workflow-preview-try-example');
		const scoreMyLeadsPromptKey =
			'experiments.workflowPreviewsAboveAssistant.examples.scoreMyLeads.prompt';

		expect(button.className).not.toContain('tryExampleVisible');
		expect(button).toHaveAttribute('tabindex', '-1');

		await fireEvent.mouseEnter(getByTestId('workflow-preview-unit'));
		expect(button.className).toContain('tryExampleVisible');
		expect(button).not.toHaveAttribute('tabindex');
		expect(button).toHaveTextContent('Try this example');

		await fireEvent.mouseEnter(button);
		expect(emitted()['preview-prompt']).toEqual([[scoreMyLeadsPromptKey]]);

		await fireEvent.click(button);
		expect(emitted()['use-example']).toEqual([
			[expect.objectContaining({ id: 'score-my-leads', promptKey: scoreMyLeadsPromptKey })],
		]);

		await fireEvent.mouseLeave(button);
		expect(emitted()['preview-prompt']).toEqual([[scoreMyLeadsPromptKey], [null]]);

		await fireEvent.mouseEnter(button);
		await fireEvent.mouseLeave(getByTestId('workflow-preview-unit'));
		expect(emitted()['preview-prompt']?.at(-1)).toEqual([null]);
		expect(button.className).not.toContain('tryExampleVisible');
	});

	it('labels the arrows for assistive technology', () => {
		const { getByRole } = renderComponent();

		expect(getByRole('button', { name: 'Previous example' })).toBeInTheDocument();
		expect(getByRole('button', { name: 'Next example' })).toBeInTheDocument();
	});
});
