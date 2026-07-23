import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import {
	INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES,
	INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION,
} from '../examples';
import SuggestionList from './SuggestionList.vue';

const telemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const websiteTemplateRepositoryURL = 'https://n8n.io/workflows?utm_user_role=test';
vi.mock('@/features/workflows/templates/templates.store', () => ({
	useTemplatesStore: () => ({ websiteTemplateRepositoryURL }),
}));

const renderComponent = createComponentRenderer(SuggestionList, {
	props: {
		examples: INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES,
		activeIndex: 0,
	},
});

describe('SuggestionList', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		telemetryTrack.mockReset();
	});

	// This test MUST stay first — the telemetry module uses a module-level Set to
	// deduplicate impression events per catalog version. Any subsequent render in
	// this test file will be swallowed by the dedupe guard, so only this first
	// test can reliably assert the "shown" event fires.
	it('tracks the shown impression once on mount', () => {
		renderComponent();
		expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestions shown', {
			suggestion_catalog_version: INSTANCE_AI_SPLIT_EMPTY_STATE_SUGGESTIONS_VERSION,
		});
	});

	it('renders the start-from-an-example label and every example row', () => {
		const { getByText, getByTestId } = renderComponent();

		expect(getByText('Start from an example')).toBeInTheDocument();
		for (const example of INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES) {
			expect(getByTestId(`instance-ai-examples-item-${example.id}`)).toBeInTheDocument();
		}
	});

	it('applies the active treatment to the row at activeIndex and only that row', () => {
		const activeIndex = 2;
		const { container } = renderComponent({
			props: { examples: INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES, activeIndex },
		});

		// The loading bar should be present inside the active row
		const loadingBars = container.querySelectorAll(
			'[data-test-id="instance-ai-examples-loading-bar"]',
		);
		expect(loadingBars).toHaveLength(1);

		// The loading bar must be a descendant of the active row
		const activeExample = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[activeIndex];
		const activeRow = container.querySelector(
			`[data-test-id="instance-ai-examples-item-${activeExample.id}"]`,
		);
		expect(activeRow).not.toBeNull();
		expect(activeRow).toContainElement(loadingBars[0] as HTMLElement);

		// No other row should contain a loading bar
		for (const [index, example] of INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES.entries()) {
			if (index === activeIndex) continue;
			const row = container.querySelector(
				`[data-test-id="instance-ai-examples-item-${example.id}"]`,
			);
			expect(row).not.toBeNull();
			expect(row?.querySelector('[data-test-id="instance-ai-examples-loading-bar"]')).toBeNull();
		}
	});

	it('emits hover with the row index when a row is mouseentered', async () => {
		const { emitted, getByTestId } = renderComponent();
		const example = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[0];

		await fireEvent.mouseEnter(getByTestId(`instance-ai-examples-item-${example.id}`));

		expect(emitted()['hover']).toEqual([[0]]);
	});

	it('emits submit with the correct payload when a suggestion row is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();
		const example = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1];

		await fireEvent.click(getByTestId(`instance-ai-examples-suggestion-${example.id}`));

		expect(emitted()['submit']).toEqual([
			[
				{
					promptKey: example.promptKey,
					suggestionId: example.id,
					suggestionKind: 'quick_example',
					position: 2,
				},
			],
		]);
	});

	it('emits edit when the pencil is clicked and does NOT emit submit', async () => {
		const { emitted, getByTestId } = renderComponent();
		const example = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1];

		await fireEvent.click(getByTestId(`instance-ai-examples-edit-${example.id}`));

		expect(emitted()['edit']).toEqual([
			[
				{
					promptKey: example.promptKey,
					suggestionId: example.id,
					suggestionKind: 'quick_example',
					position: 2,
				},
			],
		]);
		expect(emitted()['submit']).toBeUndefined();
	});

	it('disables all suggestion and edit buttons when disabled prop is true', () => {
		const { container } = renderComponent({
			props: {
				examples: INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES,
				activeIndex: 0,
				disabled: true,
			},
		});

		const suggestionButtons = container.querySelectorAll(
			'[data-test-id^="instance-ai-examples-suggestion-"]',
		);
		const editButtons = container.querySelectorAll('[data-test-id^="instance-ai-examples-edit-"]');

		expect(suggestionButtons.length).toBeGreaterThan(0);
		expect(editButtons.length).toBeGreaterThan(0);

		for (const btn of suggestionButtons) {
			expect(btn).toBeDisabled();
		}
		for (const btn of editButtons) {
			expect(btn).toBeDisabled();
		}
	});

	it('links see-more to the public gallery in a new tab and tracks the click', async () => {
		const { getByTestId } = renderComponent();
		const seeMore = getByTestId('instance-ai-examples-see-more');

		expect(seeMore).toHaveAttribute('href', websiteTemplateRepositoryURL);
		expect(seeMore).toHaveAttribute('target', '_blank');

		await fireEvent.click(seeMore);

		expect(telemetryTrack).toHaveBeenCalledWith(
			'User clicked on templates',
			expect.objectContaining({ source: 'instance_ai_split_empty_state' }),
		);
	});
});
