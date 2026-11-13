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

	it('cuts a long activity label at its end by default', () => {
		const { getByTestId } = renderComponent({
			props: { active: true, segments: [], activityLabel: 'Searching for gmail, slack' },
		});

		expect(getByTestId('thinking-block-subline-label')).toHaveAttribute('data-truncate', 'end');
	});

	it('can cut a long activity label at its start, so its newest words stay in view', () => {
		const { getByTestId } = renderComponent({
			props: {
				active: true,
				segments: [],
				activityLabel: 'Gmail can filter by label',
				activityLabelTruncate: 'start',
			},
		});

		const label = getByTestId('thinking-block-subline-label');
		expect(label).toHaveAttribute('data-truncate', 'start');
		expect(label).toHaveTextContent('Gmail can filter by label');
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
