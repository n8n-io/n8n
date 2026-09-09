import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InstanceAiRecordingPreview from '../components/InstanceAiRecordingPreview.vue';

const stopBrowserRecording = vi.fn(async () => ({ ok: true }));
const discardBrowserRecording = vi.fn(async () => ({ ok: true }));
vi.mock('../instanceAi.api', () => ({
	stopBrowserRecording: () => stopBrowserRecording(),
	discardBrowserRecording: () => discardBrowserRecording(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/', sessionId: 'test' } }),
}));

const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

function renderComponent(actionCount = 0, elapsedMs = 0, extraProps: Record<string, unknown> = {}) {
	return mount(InstanceAiRecordingPreview, {
		props: { actionCount, elapsedMs, ...extraProps },
	});
}

describe('InstanceAiRecordingPreview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows the action count and elapsed time', () => {
		const wrapper = renderComponent(4, 65_000);

		expect(wrapper.text()).toContain('4');
		expect(wrapper.text()).toContain('1:05');
	});

	it('stops the recording directly, bypassing chat', async () => {
		const wrapper = renderComponent();

		await wrapper.find('[data-test-id="instance-ai-recording-stop"]').trigger('click');

		expect(stopBrowserRecording).toHaveBeenCalledTimes(1);
		expect(discardBrowserRecording).not.toHaveBeenCalled();
	});

	it('discards the recording directly, bypassing chat', async () => {
		const wrapper = renderComponent();

		await wrapper.find('[data-test-id="instance-ai-recording-discard"]').trigger('click');

		expect(discardBrowserRecording).toHaveBeenCalledTimes(1);
		expect(stopBrowserRecording).not.toHaveBeenCalled();
	});

	it('shows an error toast when stopping fails', async () => {
		stopBrowserRecording.mockRejectedValueOnce(new Error('network error'));
		const wrapper = renderComponent();

		await wrapper.find('[data-test-id="instance-ai-recording-stop"]').trigger('click');
		await wrapper.vm.$nextTick();

		expect(showError).toHaveBeenCalledTimes(1);
	});

	it('hides the stop/discard actions once the recording has finished', () => {
		const wrapper = renderComponent(4, 65_000, { isRecording: false });

		expect(wrapper.find('[data-test-id="instance-ai-recording-stop"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="instance-ai-recording-discard"]').exists()).toBe(false);
	});

	describe('screenshot flip-book', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('shows the first screenshot immediately, then cycles every 2s', async () => {
			const screenshots = [
				{ actionId: 'a1', mimeType: 'image/jpeg', data: 'one' },
				{ actionId: 'a2', mimeType: 'image/jpeg', data: 'two' },
			];
			const wrapper = renderComponent(2, 0, { screenshots });

			expect(wrapper.find('img').attributes('src')).toBe('data:image/jpeg;base64,one');

			await vi.advanceTimersByTimeAsync(2000);
			expect(wrapper.find('img').attributes('src')).toBe('data:image/jpeg;base64,two');

			await vi.advanceTimersByTimeAsync(2000);
			expect(wrapper.find('img').attributes('src')).toBe('data:image/jpeg;base64,one');
		});

		it('shortens the per-frame duration as more screenshots arrive, capped at 2s total loop / 5s', async () => {
			const shot = (actionId: string) => ({ actionId, mimeType: 'image/jpeg', data: actionId });
			const tenShots = Array.from({ length: 10 }, (_, i) => shot(`a${i}`));
			const wrapper = renderComponent(10, 0, { screenshots: tenShots });

			// 5000ms total loop / 10 frames = 500ms per frame.
			await vi.advanceTimersByTimeAsync(499);
			expect(wrapper.find('img').attributes('src')).toBe('data:image/jpeg;base64,a0');
			await vi.advanceTimersByTimeAsync(1);
			expect(wrapper.find('img').attributes('src')).toBe('data:image/jpeg;base64,a1');
		});

		it('falls back to the status icon when no screenshots have arrived', () => {
			const wrapper = renderComponent();

			expect(wrapper.find('img').exists()).toBe(false);
		});
	});
});
