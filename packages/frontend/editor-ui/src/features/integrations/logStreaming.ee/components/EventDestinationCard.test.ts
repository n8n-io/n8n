import { shallowMount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import { ElSwitch } from 'element-plus';
import { useLogStreamingStore } from '../logStreaming.store';
import EventDestinationCard from './EventDestinationCard.vue';

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

describe('EventDestinationCard save', () => {
	beforeEach(() => vi.clearAllMocks());

	function setup() {
		const pinia = createTestingPinia();
		const store = useLogStreamingStore();
		const wrapper = shallowMount(EventDestinationCard, {
			props: {
				eventBus: createEventBus(),
				destination: { id: 'destinationId', enabled: true, label: 'Webhook' },
				readonly: false,
			},
			global: {
				plugins: [pinia],
				stubs: { N8nCard: { template: '<div><slot name="header" /><slot name="append" /></div>' } },
				renderStubDefaultSlot: true,
			},
		});
		return { wrapper, store, toggle: wrapper.findComponent(ElSwitch) };
	}

	it('keeps the saved switch state and shows the backend error on failure', async () => {
		const { store, toggle } = setup();
		const error = new Error('Invalid host');
		vi.mocked(store.saveDestination).mockRejectedValueOnce(error);
		toggle.vm.$emit('update:modelValue', false);
		await flushPromises();
		expect(toggle.props('modelValue')).toBe(true);
		expect(toggle.props('disabled')).toBe(false);
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});

	it('blocks duplicate saves and updates the switch only after success', async () => {
		const { store, toggle } = setup();
		let finish!: (result: boolean) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		toggle.vm.$emit('update:modelValue', false);
		await flushPromises();
		expect(toggle.props('disabled')).toBe(true);
		expect(toggle.props('modelValue')).toBe(true);
		toggle.vm.$emit('update:modelValue', false);
		expect(store.saveDestination).toHaveBeenCalledTimes(1);
		finish(true);
		await flushPromises();
		expect(toggle.props('modelValue')).toBe(false);
		expect(toggle.props('disabled')).toBe(false);
	});
});
