import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { useComposerFocus, type FocusableComposer } from '../composables/useComposerFocus';

/** A composer with a real textarea that a send disables, and one other control. */
const Host = defineComponent({
	setup(_, { expose }) {
		const isSending = ref(false);
		const textarea = ref<HTMLTextAreaElement>();
		const composer: FocusableComposer = {
			focus: (options) => textarea.value?.focus(options),
			getInputElement: () => textarea.value,
		};
		const { focus } = useComposerFocus(() => composer, isSending);
		expose({ isSending, focus });
		return () =>
			h('div', [
				h('textarea', { ref: textarea, disabled: isSending.value, 'data-test-id': 'composer' }),
				h('button', { type: 'button', 'data-test-id': 'other' }, 'Other'),
			]);
	},
});

type HostApi = { isSending: boolean; focus: (options?: FocusOptions) => void };

let wrapper: VueWrapper | undefined;

function mountHost() {
	wrapper = mount(Host, { attachTo: document.body });
	const api = wrapper.vm as unknown as HostApi;
	const composer = wrapper.get<HTMLTextAreaElement>('[data-test-id="composer"]').element;
	const other = wrapper.get<HTMLButtonElement>('[data-test-id="other"]').element;
	return { api, composer, other };
}

/**
 * A browser drops the focus of a textarea that becomes disabled. jsdom keeps
 * it, so the blur happens here, after the composable read the focus.
 */
async function startSend(api: HostApi, composer: HTMLTextAreaElement) {
	api.isSending = true;
	composer.blur();
	await nextTick();
}

async function finishSend(api: HostApi) {
	api.isSending = false;
	await nextTick();
}

afterEach(() => {
	wrapper?.unmount();
	wrapper = undefined;
});

describe('useComposerFocus', () => {
	it('focuses the composer at once while it is enabled', () => {
		const { api, composer } = mountHost();

		api.focus();

		expect(document.activeElement).toBe(composer);
	});

	it('focuses the composer after a send when the request came during the send', async () => {
		const { api, composer } = mountHost();
		await startSend(api, composer);

		api.focus();
		expect(document.activeElement).not.toBe(composer);
		await finishSend(api);

		expect(document.activeElement).toBe(composer);
	});

	it('gives the focus back to the composer that had it when the send started', async () => {
		const { api, composer } = mountHost();
		composer.focus();

		await startSend(api, composer);
		expect(document.activeElement).toBe(document.body);
		await finishSend(api);

		expect(document.activeElement).toBe(composer);
	});

	it('keeps the focus on a control that the user moved to during the send', async () => {
		const { api, composer, other } = mountHost();
		composer.focus();
		await startSend(api, composer);

		api.focus();
		other.focus();
		await finishSend(api);

		expect(document.activeElement).toBe(other);
	});

	it('does not take the focus after a send that nothing asked it for', async () => {
		const { api, composer, other } = mountHost();
		other.focus();
		await startSend(api, composer);
		other.blur();

		await finishSend(api);

		expect(document.activeElement).toBe(document.body);
	});

	it('focuses the composer when the request comes before the render enables it', async () => {
		const { api, composer } = mountHost();
		await startSend(api, composer);

		api.isSending = false;
		api.focus();
		expect(composer.disabled).toBe(true);
		await nextTick();

		expect(document.activeElement).toBe(composer);
	});

	it('gives the focus back only once', async () => {
		const { api, composer, other } = mountHost();
		await startSend(api, composer);
		api.focus();
		await finishSend(api);
		other.focus();

		await startSend(api, composer);
		other.blur();
		await finishSend(api);

		expect(document.activeElement).toBe(document.body);
	});
});
