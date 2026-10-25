import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import AiThinkingBlock from './AiThinkingBlock.vue';

const renderComponent = createComponentRenderer(AiThinkingBlock);

describe('AiThinkingBlock', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('shows the latest non-empty segment first sentence while active', () => {
		const { getByTestId } = renderComponent({
			props: {
				active: true,
				segments: [
					{ content: 'Checking the schema. More details.' },
					{ content: '\n\n' },
					{ content: 'Planning the response. Then answering.' },
				],
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Planning the response.');
	});

	it('expands shared content from the header', async () => {
		const { getByTestId } = renderComponent({
			props: { active: true, segments: [{ content: 'Working.' }] },
			slots: { default: '<div data-test-id="thinking-content">Details</div>' },
		});

		const header = getByTestId('thinking-block-header');
		expect(header).toHaveAttribute('aria-expanded', 'false');
		await userEvent.click(header);

		expect(header).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('thinking-content')).toBeVisible();
	});

	it('opens with Enter and closes with Space', async () => {
		const user = userEvent.setup();
		const { getByRole, getByTestId, queryByTestId } = renderComponent({
			props: { active: true, segments: [{ content: 'Working.' }] },
			slots: { default: '<div data-test-id="thinking-content">Details</div>' },
		});
		const header = getByRole('button', { name: 'Working.' });

		header.focus();
		await user.keyboard('{Enter}');
		expect(header).toHaveAttribute('aria-expanded', 'true');
		expect(getByTestId('thinking-content')).toBeVisible();
		expect(queryByTestId('thinking-block-subline')).not.toBeInTheDocument();

		await user.keyboard(' ');
		expect(header).toHaveAttribute('aria-expanded', 'false');
		expect(getByTestId('thinking-block-subline')).toBeVisible();
	});

	it('hides the active preview and resets the timer while waiting for input', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId, queryByTestId, rerender } = renderComponent({
				props: { active: true, segments: [] },
			});
			await vi.advanceTimersByTimeAsync(4000);
			await rerender({ awaitingInput: true });
			await vi.advanceTimersByTimeAsync(1000);

			expect(getByTestId('thinking-block-header')).toHaveTextContent('Waiting for your input');
			expect(queryByTestId('thinking-block-subline')).not.toBeInTheDocument();

			await rerender({ awaitingInput: false });
			await vi.advanceTimersByTimeAsync(2000);
			expect(getByTestId('thinking-block-subline')).toHaveTextContent('Thinking · 2s');
		} finally {
			vi.useRealTimers();
		}
	});

	it('resets a manual expansion when active work ends', async () => {
		const { getByRole, rerender } = renderComponent({
			props: { active: true, segments: [{ content: 'Working.' }] },
		});
		const header = getByRole('button');
		await userEvent.click(header);
		expect(header).toHaveAttribute('aria-expanded', 'true');

		await rerender({ active: false });
		expect(header).toHaveAttribute('aria-expanded', 'false');
	});

	it('shows an elapsed timer while active', async () => {
		vi.useFakeTimers();
		try {
			const { getByTestId } = renderComponent({
				props: { active: true, segments: [{ content: 'Working.' }] },
			});

			await vi.advanceTimersByTimeAsync(4000);

			expect(getByTestId('thinking-block-subline')).toHaveTextContent('Thinking · 4s');
		} finally {
			vi.useRealTimers();
		}
	});

	it('uses persisted duration when settled', () => {
		const { getByTestId } = renderComponent({
			props: {
				active: false,
				segments: [{ content: 'Finished.' }],
				durationSec: 65,
			},
		});

		expect(getByTestId('thinking-block-header')).toHaveTextContent('Thought for 1m 5s');
	});
});
