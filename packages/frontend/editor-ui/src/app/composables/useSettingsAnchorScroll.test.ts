import { defineComponent, h, nextTick, reactive, ref } from 'vue';
import { render } from '@testing-library/vue';
import {
	SETTINGS_ANCHOR_REVEAL_DELAY,
	SETTINGS_ANCHOR_SCROLL_TIMEOUT,
	SETTINGS_ANCHOR_WAIT_TIMEOUT,
} from '../constants/durations';
import {
	SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE,
	findSettingsAnchor,
	useSettingsAnchorScroll,
} from './useSettingsAnchorScroll';

const route = reactive({ path: '/settings/personal', hash: '' });
vi.mock('vue-router', () => ({ useRoute: () => route }));

const showRow = ref(false);

const TestPage = defineComponent({
	setup() {
		const container = ref<HTMLElement>();
		useSettingsAnchorScroll(container);
		return () =>
			h('div', { ref: container }, [
				h('div', { 'data-settings-anchor': 'role' }),
				showRow.value ? h('div', { 'data-settings-anchor': 'theme' }) : null,
			]);
	},
});

const scrollIntoView = vi.fn();

async function flushMutations() {
	await nextTick();
	// MutationObserver callbacks run as microtasks after the DOM change.
	await Promise.resolve();
}

describe('useSettingsAnchorScroll', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		route.path = '/settings/personal';
		route.hash = '';
		showRow.value = false;
		scrollIntoView.mockReset();
		Element.prototype.scrollIntoView = scrollIntoView;
		window.matchMedia = vi.fn().mockReturnValue({ matches: false });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('lets the page settle before it scrolls to the setting that the hash names', async () => {
		route.hash = '#role';
		const { container } = render(TestPage);
		await nextTick();

		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY - 1);
		expect(scrollIntoView).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
		expect(scrollIntoView.mock.contexts[0]).toBe(findSettingsAnchor(container, 'role'));
	});

	it('highlights the setting once the scroll has ended', async () => {
		route.hash = '#role';
		const { container } = render(TestPage);
		await nextTick();
		const row = findSettingsAnchor(container, 'role');

		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY);
		expect(row?.hasAttribute(SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE)).toBe(false);

		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_SCROLL_TIMEOUT);
		expect(row?.hasAttribute(SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE)).toBe(true);
	});

	it('scrolls without animation when the user prefers reduced motion', async () => {
		window.matchMedia = vi.fn().mockReturnValue({ matches: true });
		route.hash = '#role';
		render(TestPage);
		await nextTick();

		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY);
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
	});

	it('cancels the reveal when the user leaves before the page settled', async () => {
		route.hash = '#role';
		render(TestPage);
		await nextTick();

		route.hash = '';
		await nextTick();
		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY);

		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it('waits for a setting that renders later', async () => {
		route.hash = '#theme';
		const { container } = render(TestPage);
		await nextTick();

		showRow.value = true;
		await flushMutations();
		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY);

		expect(scrollIntoView.mock.contexts[0]).toBe(findSettingsAnchor(container, 'theme'));
	});

	it('stops waiting after the timeout', async () => {
		route.hash = '#theme';
		render(TestPage);
		await nextTick();

		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_WAIT_TIMEOUT);
		showRow.value = true;
		await flushMutations();
		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY);

		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it('does not scroll without a hash', async () => {
		render(TestPage);
		await nextTick();
		await vi.advanceTimersByTimeAsync(SETTINGS_ANCHOR_REVEAL_DELAY);

		expect(scrollIntoView).not.toHaveBeenCalled();
	});
});
