import { fireEvent } from '@testing-library/vue';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES,
	INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS,
} from '../examples';
import InstanceAiSplitEmptyState from './InstanceAiSplitEmptyState.vue';

// Stable ref controlled per-test
const isWideViewport = ref(true);
vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@vueuse/core')>()),
	useMediaQuery: () => isWideViewport,
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/features/workflows/templates/templates.store', () => ({
	useTemplatesStore: () => ({ websiteTemplateRepositoryURL: 'https://n8n.io/workflows' }),
}));

const push = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push }),
}));

vi.mock('../useBuildManually', () => ({
	useBuildManually: () => ({ buildManually: vi.fn() }),
}));

// Mock the preview canvas so we don't have to load workflow JSON fixtures.
vi.mock('./CyclingPreviewCanvas.vue', () => ({
	default: {
		name: 'CyclingPreviewCanvas',
		props: ['examples', 'activeIndex', 'projectId', 'mode'],
		template: '<div data-test-id="instance-ai-preview-canvas" :data-mode="mode" />',
	},
}));

const FIRST_EXAMPLE = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[0];
const INTERVAL_MS = INSTANCE_AI_SPLIT_EMPTY_STATE_CYCLE_MS;

const renderComponent = createComponentRenderer(InstanceAiSplitEmptyState, {
	props: { projectId: 'project-1' },
});

describe('InstanceAiSplitEmptyState', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.useFakeTimers();
		isWideViewport.value = true;
		push.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('emits example-change with index 0 and first example promptKey on mount (immediate)', () => {
		const { emitted } = renderComponent();

		const changes = emitted()['example-change'];
		expect(changes).toHaveLength(1);
		expect(changes[0]).toEqual([0, FIRST_EXAMPLE.promptKey]);
	});

	it('advances activeIndex and emits example-change after one interval', async () => {
		const { emitted } = renderComponent();

		expect(emitted()['example-change']).toHaveLength(1);

		vi.advanceTimersByTime(INTERVAL_MS);
		await nextTick();

		const changes = emitted()['example-change'] as unknown[][];
		expect(changes).toHaveLength(2);
		expect(changes[1][0]).toBe(1);
		expect(changes[1][1]).toBe(INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1].promptKey);
	});

	it('does NOT advance activeIndex while writing prop is true (cycling paused)', async () => {
		const { emitted, rerender } = renderComponent({
			props: { projectId: 'project-1', writing: false },
		});

		const beforeCount = emitted()['example-change'].length;

		await rerender({ writing: true });

		vi.advanceTimersByTime(INTERVAL_MS * 3);

		// No additional example-change events after the writing prop was set
		expect(emitted()['example-change']).toHaveLength(beforeCount);
	});

	it('resumes cycling when writing prop goes back to false', async () => {
		const { emitted, rerender } = renderComponent({
			props: { projectId: 'project-1', writing: true },
		});

		vi.advanceTimersByTime(INTERVAL_MS);
		const countWhilePaused = emitted()['example-change'].length;

		await rerender({ writing: false });

		vi.advanceTimersByTime(INTERVAL_MS);
		await nextTick();

		expect(emitted()['example-change'].length).toBeGreaterThan(countWhilePaused);
	});

	it('switches the canvas to loader mode while composing a from-scratch prompt', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { projectId: 'project-1', writing: false },
		});

		expect(getByTestId('instance-ai-preview-canvas').dataset.mode).toBe('preview');

		await rerender({ writing: true });

		expect(getByTestId('instance-ai-preview-canvas').dataset.mode).toBe('loader');
	});

	it('removes the example-list highlight while composing a from-scratch prompt', async () => {
		const { queryByTestId, rerender } = renderComponent({
			props: { projectId: 'project-1', writing: false },
		});

		// While cycling, the active row carries the progress/highlight bar.
		expect(queryByTestId('instance-ai-examples-loading-bar')).toBeInTheDocument();

		await rerender({ writing: true });
		await nextTick();

		// Composing from blank → no row highlighted (active-index -1).
		expect(queryByTestId('instance-ai-examples-loading-bar')).not.toBeInTheDocument();
	});

	it('keeps the example preview (not the loader) while editing an example prompt', async () => {
		const { getByTestId, rerender } = renderComponent();

		// Pencil-edit an example, then type into the prefilled prompt.
		await fireEvent.click(getByTestId(`instance-ai-examples-edit-${FIRST_EXAMPLE.id}`));
		await rerender({ writing: true });

		expect(getByTestId('instance-ai-preview-canvas').dataset.mode).toBe('preview');
	});

	it('stops the auto-cycle for good once an example is edited', async () => {
		const { emitted, getByTestId } = renderComponent();
		const second = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1];

		await fireEvent.click(getByTestId(`instance-ai-examples-edit-${second.id}`));
		// Pinned to the edited example.
		expect((emitted()['example-change'] as unknown[][]).at(-1)).toEqual([1, second.promptKey]);

		const countAfterEdit = emitted()['example-change'].length;
		vi.advanceTimersByTime(INTERVAL_MS * 3);
		await nextTick();

		// No further rotation — the cycle is stopped.
		expect(emitted()['example-change']).toHaveLength(countAfterEdit);
	});

	it('previews a hovered example after editing, then settles back on the edited one', async () => {
		const { emitted, getByTestId } = renderComponent();
		const edited = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1];
		const hovered = INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[3];

		await fireEvent.click(getByTestId(`instance-ai-examples-edit-${edited.id}`));
		await fireEvent.mouseEnter(getByTestId(`instance-ai-examples-item-${hovered.id}`));
		expect((emitted()['example-change'] as unknown[][]).at(-1)).toEqual([3, hovered.promptKey]);

		await fireEvent.mouseLeave(getByTestId('instance-ai-examples-rows'));
		// Back to the edited (anchor) example, not a resumed rotation.
		expect((emitted()['example-change'] as unknown[][]).at(-1)).toEqual([1, edited.promptKey]);
	});

	it('pauses cycling while an example row is hovered', async () => {
		const { emitted, getByTestId } = renderComponent();

		await fireEvent.mouseEnter(
			getByTestId(`instance-ai-examples-item-${INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1].id}`),
		);
		const countAfterHover = emitted()['example-change'].length;

		vi.advanceTimersByTime(INTERVAL_MS * 3);

		// While hovering, the cycle is pinned to that example — no further advance.
		expect(emitted()['example-change']).toHaveLength(countAfterHover);
	});

	it('resumes cycling once the pointer leaves the rows', async () => {
		const { emitted, getByTestId } = renderComponent();

		await fireEvent.mouseEnter(
			getByTestId(`instance-ai-examples-item-${INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES[1].id}`),
		);
		await fireEvent.mouseLeave(getByTestId('instance-ai-examples-rows'));
		const before = emitted()['example-change'].length;

		vi.advanceTimersByTime(INTERVAL_MS);
		await nextTick();

		expect(emitted()['example-change'].length).toBeGreaterThan(before);
	});

	it('emits submit-suggestion when a SuggestionList row is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await fireEvent.click(getByTestId(`instance-ai-examples-suggestion-${FIRST_EXAMPLE.id}`));

		const submissions = emitted()['submit-suggestion'] as unknown[][];
		expect(submissions).toHaveLength(1);
		expect(submissions[0][0]).toMatchObject({
			suggestionId: FIRST_EXAMPLE.id,
			suggestionKind: 'quick_example',
		});
	});

	it('emits insert-suggestion when a SuggestionList row edit is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await fireEvent.click(getByTestId(`instance-ai-examples-edit-${FIRST_EXAMPLE.id}`));

		const inserts = emitted()['insert-suggestion'] as unknown[][];
		expect(inserts).toHaveLength(1);
		expect(inserts[0][0]).toMatchObject({
			suggestionId: FIRST_EXAMPLE.id,
			suggestionKind: 'quick_example',
		});
	});

	it('on narrow viewport: does not mount CyclingPreviewCanvas but still renders the examples list', () => {
		isWideViewport.value = false;

		const { queryByTestId, getByTestId } = renderComponent();

		expect(queryByTestId('instance-ai-preview-canvas')).not.toBeInTheDocument();
		// The "Start from an example" prompts list is shown on every viewport.
		expect(getByTestId('instance-ai-examples')).toBeInTheDocument();
		expect(getByTestId('instance-ai-split-empty-state')).toBeInTheDocument();
	});

	it('renders header and input slots', () => {
		const { getByTestId } = renderComponent({
			slots: {
				header: '<div data-test-id="slotted-header" />',
				input: '<div data-test-id="slotted-input" />',
			},
		});

		expect(getByTestId('slotted-header')).toBeInTheDocument();
		expect(getByTestId('slotted-input')).toBeInTheDocument();
	});

	it('mounts CyclingPreviewCanvas on wide viewport', () => {
		isWideViewport.value = true;

		const { getByTestId } = renderComponent();

		expect(getByTestId('instance-ai-preview-canvas')).toBeInTheDocument();
	});
});
