import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import AiActivityThinkingStep from './AiActivityThinkingStep.vue';

const renderComponent = createComponentRenderer(AiActivityThinkingStep);

describe('AiActivityThinkingStep', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows a thinking word, not the trace text, while active', () => {
		const { getByTestId } = renderComponent({
			props: {
				active: true,
				segments: [{ content: 'Planning the response for the user. Then' }],
			},
		});

		expect(getByTestId('ai-thinking-step')).not.toHaveTextContent('Planning the response');
	});

	it('shows the idle label before the trace has text', () => {
		const { getByTestId } = renderComponent({
			props: { active: true, segments: [], idleLabel: 'Joining the dots' },
		});

		expect(getByTestId('ai-thinking-step')).toHaveTextContent('Joining the dots');
	});

	it('shows the elapsed time after the label while active', async () => {
		vi.useFakeTimers();
		const { getByTestId } = renderComponent({
			props: { active: true, segments: [{ content: 'Reading the workflow nodes.' }] },
		});

		vi.advanceTimersByTime(72_000);
		await nextTick();

		expect(getByTestId('ai-activity-step-meta')).toHaveTextContent('1m 12s');
	});

	it('shows the duration when done', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { active: false, segments: [{ content: 'Done.' }], durationSec: 5 },
		});

		expect(getByTestId('ai-thinking-step')).toHaveTextContent('Thought for 5s');
		expect(queryByTestId('ai-activity-step-meta')).toBeNull();
	});

	it('shows the settled label when done', () => {
		const { getByTestId } = renderComponent({
			props: {
				active: false,
				segments: [{ content: 'Done.' }],
				settledLabel: 'Checked the schema.',
			},
		});

		expect(getByTestId('ai-thinking-step')).toHaveTextContent('Checked the schema.');
	});

	it('shows a fallback when done without a duration', () => {
		const { getByTestId } = renderComponent({
			props: { active: false, segments: [{ content: 'Done.' }] },
		});

		expect(getByTestId('ai-thinking-step')).toHaveTextContent('Finished thinking');
	});

	it('says that it waits for input and hides the timer', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { active: true, awaitingInput: true, segments: [{ content: 'Asking.' }] },
		});

		expect(getByTestId('ai-thinking-step')).toHaveTextContent('Waiting for your input');
		expect(queryByTestId('ai-activity-step-meta')).toBeNull();
	});

	it('shows the segments as plain text when expanded, without empty segments', async () => {
		const { getByRole, getAllByTestId } = renderComponent({
			props: {
				active: false,
				durationSec: 2,
				segments: [{ content: 'First thought.' }, { content: '  ' }, { content: 'Second.' }],
			},
		});

		await userEvent.click(getByRole('button', { name: /Thought for 2s/ }));

		expect(
			getAllByTestId('ai-thinking-step-segment').map((node) => node.textContent?.trim()),
		).toEqual(['First thought.', 'Second.']);
	});
});
