import { defineComponent, h, nextTick, reactive, ref } from 'vue';
import { render } from '@testing-library/vue';
import { SETTINGS_ANCHOR_WAIT_TIMEOUT } from '../constants/durations';
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
		route.path = '/settings/personal';
		route.hash = '';
		showRow.value = false;
		scrollIntoView.mockReset();
		Element.prototype.scrollIntoView = scrollIntoView;
		window.matchMedia = vi.fn().mockReturnValue({ matches: false });
	});

	it('scrolls to and highlights the setting that the hash names', async () => {
		route.hash = '#role';
		const { container } = render(TestPage);
		await nextTick();

		const row = findSettingsAnchor(container, 'role');
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
		expect(scrollIntoView.mock.contexts[0]).toBe(row);
		expect(row?.hasAttribute(SETTINGS_ANCHOR_HIGHLIGHT_ATTRIBUTE)).toBe(true);
	});

	it('waits for a setting that renders later', async () => {
		route.hash = '#theme';
		const { container } = render(TestPage);
		await nextTick();
		expect(scrollIntoView).not.toHaveBeenCalled();

		showRow.value = true;
		await flushMutations();

		expect(scrollIntoView.mock.contexts[0]).toBe(findSettingsAnchor(container, 'theme'));
	});

	it('stops waiting after the timeout', async () => {
		vi.useFakeTimers();
		route.hash = '#theme';
		render(TestPage);
		await nextTick();

		vi.advanceTimersByTime(SETTINGS_ANCHOR_WAIT_TIMEOUT);
		showRow.value = true;
		await flushMutations();

		expect(scrollIntoView).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('does not scroll without a hash', async () => {
		render(TestPage);
		await nextTick();

		expect(scrollIntoView).not.toHaveBeenCalled();
	});
});
