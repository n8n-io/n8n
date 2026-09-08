import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

function renderComponent(actionCount = 0, elapsedMs = 0) {
	return mount(InstanceAiRecordingPreview, {
		props: { actionCount, elapsedMs },
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
});
