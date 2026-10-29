import { shallowMount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';
import { N8nInlineTextEdit } from '@n8n/design-system';
import { defaultMessageEventBusDestinationWebhookOptions } from 'n8n-workflow';
import { createEventBus } from '@n8n/utils/event-bus';
import SaveButton from '@/app/components/SaveButton.vue';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useLogStreamingStore } from '../logStreaming.store';
import EventDestinationSettingsModal from './EventDestinationSettingsModal.vue';

const { showError, track } = vi.hoisted(() => ({ showError: vi.fn(), track: vi.fn() }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: () => true }));
vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: { template: '<div />' },
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	provideWorkflowDocumentStore: () =>
		ref({
			documentId: 'test',
			removeNode: vi.fn(),
			addNode: vi.fn(),
			getNodeByName: () => undefined,
		}),
}));
vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: () => ({ setActiveNodeName: vi.fn(), unsetActiveNodeName: vi.fn() }),
}));

describe('EventDestinationSettingsModal save', () => {
	beforeEach(() => vi.clearAllMocks());

	async function setup({ isNew = false } = {}) {
		const pinia = createTestingPinia();
		const store = useLogStreamingStore();
		vi.mocked(store.getSelectedEvents).mockReturnValue([]);
		store.items.destinationId = {
			destination: {},
			eventGroups: [],
			selectedEvents: new Set(),
			isNew: false,
		};
		const eventBus = createEventBus();
		vi.spyOn(eventBus, 'emit');
		const wrapper = shallowMount(EventDestinationSettingsModal, {
			props: {
				modalName: 'settingsLogStream',
				eventBus,
				isNew,
				destination: {
					...defaultMessageEventBusDestinationWebhookOptions,
					id: 'destinationId',
					url: 'https://example.com',
				},
			},
			global: {
				plugins: [pinia],
				stubs: {
					Modal: {
						props: ['beforeClose'],
						template: '<div><slot name="header" /><slot name="content" /></div>',
					},
				},
				renderStubDefaultSlot: true,
			},
		});
		await flushPromises();
		wrapper.findComponent(N8nInlineTextEdit).vm.$emit('update:modelValue', 'Changed label');
		await flushPromises();
		return { wrapper, store, eventBus, saveButton: wrapper.findComponent(SaveButton) };
	}

	it('shows save errors and allows a retry', async () => {
		const { store, saveButton } = await setup();
		const error = new Error('Invalid URL');
		vi.mocked(store.saveDestination).mockRejectedValueOnce(error);
		saveButton.vm.$emit('click');
		await flushPromises();
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(saveButton.props('isSaving')).toBe(false);
		expect(saveButton.props('saved')).toBe(false);
		expect(saveButton.props('disabled')).toBe(false);
		vi.mocked(store.saveDestination).mockResolvedValueOnce(true);
		saveButton.vm.$emit('click');
		await flushPromises();
		expect(store.saveDestination).toHaveBeenCalledTimes(2);
		expect(saveButton.props('saved')).toBe(true);
	});

	it('shows the saving state and blocks duplicate saves', async () => {
		const { store, saveButton } = await setup();
		let finish!: (result: boolean) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		saveButton.vm.$emit('click');
		await flushPromises();
		expect(saveButton.props('isSaving')).toBe(true);
		saveButton.vm.$emit('click');
		expect(store.saveDestination).toHaveBeenCalledTimes(1);
		finish(true);
		await flushPromises();
		expect(saveButton.props('isSaving')).toBe(false);
		expect(saveButton.props('saved')).toBe(true);
	});

	it('keeps edits made during a save dirty and submits them on retry', async () => {
		const { wrapper, store, saveButton } = await setup();
		const uiStore = useUIStore();
		let finish!: (result: boolean) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		saveButton.vm.$emit('click');
		await flushPromises();
		wrapper.findComponent(N8nInlineTextEdit).vm.$emit('update:modelValue', 'Later edit');
		await flushPromises();
		expect(store.saveDestination).toHaveBeenLastCalledWith(
			expect.objectContaining({ label: 'Changed label' }),
		);
		finish(true);
		await flushPromises();
		expect(saveButton.props('saved')).toBe(false);
		expect(saveButton.props('disabled')).toBe(false);
		expect(uiStore.markStateClean).not.toHaveBeenCalled();
		vi.mocked(store.saveDestination).mockResolvedValueOnce(true);
		saveButton.vm.$emit('click');
		await flushPromises();
		expect(store.saveDestination).toHaveBeenLastCalledWith(
			expect.objectContaining({ label: 'Later edit' }),
		);
		expect(saveButton.props('saved')).toBe(true);
	});

	it('keeps event selection changes made during a save dirty', async () => {
		const { store, saveButton } = await setup();
		let finish!: (result: boolean) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		saveButton.vm.$emit('click');
		await flushPromises();
		vi.mocked(store.getSelectedEvents).mockReturnValue(['n8n.audit']);
		finish(true);
		await flushPromises();
		expect(saveButton.props('saved')).toBe(false);
		expect(useUIStore().markStateClean).not.toHaveBeenCalled();
	});

	it('records a successful save after closure without marking later UI state clean', async () => {
		const { wrapper, store, eventBus, saveButton } = await setup();
		const uiStore = useUIStore();
		let finish!: (result: boolean) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		saveButton.vm.$emit('click');
		await flushPromises();
		wrapper.findComponent(Modal).props('beforeClose')?.();
		vi.mocked(uiStore.markStateClean).mockClear();
		finish(true);
		await flushPromises();
		expect(track).toHaveBeenCalledWith(
			'User updated log streaming destination',
			expect.any(Object),
		);
		expect(uiStore.markStateClean).not.toHaveBeenCalled();
		expect(eventBus.emit).toHaveBeenCalledWith('destinationWasSaved', 'destinationId');
	});

	it.each(['close', 'unmount'])('shows a save error after %s', async (action) => {
		const { wrapper, store, saveButton } = await setup();
		let fail!: (error: Error) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((_, reject) => {
				fail = reject;
			}),
		);
		saveButton.vm.$emit('click');
		await flushPromises();
		if (action === 'close') wrapper.findComponent(Modal).props('beforeClose')?.();
		else wrapper.unmount();
		const error = new Error('Invalid URL');
		fail(error);
		await flushPromises();
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});

	it.each([
		{ outcome: 'succeeds', kept: true },
		{ outcome: 'fails', kept: false },
	])(
		'keeps a new destination closed during its first save only if the save $outcome',
		async ({ kept }) => {
			const { wrapper, store, saveButton } = await setup({ isNew: true });
			let finish!: () => void;
			vi.mocked(store.saveDestination).mockReturnValueOnce(
				new Promise((resolve, reject) => {
					finish = () => (kept ? resolve(true) : reject(new Error('Invalid URL')));
				}),
			);
			saveButton.vm.$emit('click');
			await flushPromises();
			wrapper.findComponent(Modal).props('beforeClose')?.();
			expect(store.removeDestination).not.toHaveBeenCalled();
			finish();
			await flushPromises();
			expect(store.removeDestination).toHaveBeenCalledTimes(kept ? 0 : 1);
		},
	);

	it('keeps a new destination that was saved elsewhere while its first save was pending', async () => {
		const { wrapper, store, saveButton } = await setup({ isNew: true });
		let fail!: (error: Error) => void;
		vi.mocked(store.saveDestination).mockReturnValueOnce(
			new Promise((_, reject) => {
				fail = reject;
			}),
		);
		saveButton.vm.$emit('click');
		await flushPromises();
		wrapper.findComponent(Modal).props('beforeClose')?.();
		store.items.destinationId.destination = { id: 'destinationId' };
		fail(new Error('Request timed out'));
		await flushPromises();
		expect(store.removeDestination).not.toHaveBeenCalled();
	});
});
