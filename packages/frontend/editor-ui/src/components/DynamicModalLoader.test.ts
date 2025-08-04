import { createTestingPinia } from '@pinia/testing';
import { defineComponent, nextTick } from 'vue';
import { screen } from '@testing-library/vue';
import DynamicModalLoader from '@/components/DynamicModalLoader.vue';
import * as modalRegistry from '@/moduleInitializer/modalRegistry';
import type { ModalDefinition } from '@/moduleInitializer/module.types';
import { createComponentRenderer } from '@/__tests__/render';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';

// Mock the modalRegistry module
vi.mock('@/moduleInitializer/modalRegistry', () => ({
	getAll: vi.fn(),
	subscribe: vi.fn(),
}));

const mockModalRegistry = vi.mocked(modalRegistry);

const renderComponent = createComponentRenderer(DynamicModalLoader, {
	global: {
		stubs: {
			ModalRoot: {
				props: ['name', 'keepAlive'],
				template: `
					<div data-testid="modal-root" :data-modal-name="name">
						<slot
							:modalName="name"
							:active="true"
							:open="true"
							:activeId="'test-id'"
							:mode="'edit'"
							:data="{ test: 'value' }"
						/>
					</div>
				`,
			},
		},
	},
});

describe('DynamicModalLoader', () => {
	const mockModalComponent = defineComponent({
		name: 'MockModal',
		props: {
			modalName: { type: String, required: true },
			active: { type: Boolean, required: true },
			open: { type: Boolean, required: true },
			activeId: { type: String, required: true },
			mode: { type: String, required: true },
			data: { type: Object, required: true },
		},
		template: '<div data-testid="mock-modal" :data-modal-name="modalName">Mock Modal</div>',
	});

	const mockAsyncModalComponent = vi.fn(async () => await Promise.resolve(mockModalComponent));

	beforeEach(() => {
		createAppModals();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanupAppModals();
	});

	it('should render empty div when no modals are registered', () => {
		mockModalRegistry.getAll.mockReturnValue(new Map());
		mockModalRegistry.subscribe.mockReturnValue(vi.fn());

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});

		expect(container.firstChild).toBeInTheDocument();
		expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();
	});

	it('should render ModalRoot components for registered modals', async () => {
		const modalsMap = new Map<string, ModalDefinition>([
			[
				'testModal1',
				{
					key: 'testModal1',
					component: mockModalComponent,
				},
			],
			[
				'testModal2',
				{
					key: 'testModal2',
					component: mockModalComponent,
				},
			],
		]);

		mockModalRegistry.getAll.mockReturnValue(modalsMap);
		mockModalRegistry.subscribe.mockReturnValue(vi.fn());

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();

		const modalRoots = container.querySelectorAll('[data-testid="modal-root"]');
		expect(modalRoots).toHaveLength(2);

		const modalNames = Array.from(modalRoots).map((root) => root.getAttribute('data-modal-name'));
		expect(modalNames).toContain('testModal1');
		expect(modalNames).toContain('testModal2');
	});

	it('should handle async component factories', async () => {
		const modalsMap = new Map<string, ModalDefinition>([
			[
				'asyncModal',
				{
					key: 'asyncModal',
					component: mockAsyncModalComponent,
				},
			],
		]);

		mockModalRegistry.getAll.mockReturnValue(modalsMap);
		mockModalRegistry.subscribe.mockReturnValue(vi.fn());

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();

		const modalRoot = container.querySelector('[data-testid="modal-root"]');
		expect(modalRoot).toBeInTheDocument();
		expect(modalRoot?.getAttribute('data-modal-name')).toBe('asyncModal');
		expect(mockAsyncModalComponent).toHaveBeenCalled();
	});

	it('should subscribe to modalRegistry changes on mount', () => {
		mockModalRegistry.getAll.mockReturnValue(new Map());
		const mockUnsubscribe = vi.fn();
		mockModalRegistry.subscribe.mockReturnValue(mockUnsubscribe);

		renderComponent({
			pinia: createTestingPinia(),
		});

		expect(mockModalRegistry.subscribe).toHaveBeenCalledTimes(1);
		expect(mockModalRegistry.subscribe).toHaveBeenCalledWith(expect.any(Function));
	});

	it('should update modals when registry changes', async () => {
		let subscribeCallback: ((modals: Map<string, ModalDefinition>) => void) | undefined;

		// Initial empty registry
		mockModalRegistry.getAll.mockReturnValue(new Map());
		mockModalRegistry.subscribe.mockImplementation((listener) => {
			subscribeCallback = listener;
			return vi.fn();
		});

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();

		// Initially no modal roots
		expect(container.querySelector('[data-testid="modal-root"]')).not.toBeInTheDocument();

		// Simulate registry change
		const newModalsMap = new Map<string, ModalDefinition>([
			[
				'newModal',
				{
					key: 'newModal',
					component: mockModalComponent,
				},
			],
		]);

		mockModalRegistry.getAll.mockReturnValue(newModalsMap);
		subscribeCallback?.(newModalsMap);

		await nextTick();

		// Should now have one modal root
		const modalRoot = container.querySelector('[data-testid="modal-root"]');
		expect(modalRoot).toBeInTheDocument();
		expect(modalRoot?.getAttribute('data-modal-name')).toBe('newModal');
	});

	it('should unsubscribe from registry changes on unmount', () => {
		mockModalRegistry.getAll.mockReturnValue(new Map());
		const mockUnsubscribe = vi.fn();
		mockModalRegistry.subscribe.mockReturnValue(mockUnsubscribe);

		const wrapper = renderComponent({
			pinia: createTestingPinia(),
		});

		expect(mockUnsubscribe).not.toHaveBeenCalled();

		wrapper.unmount();

		expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
	});

	it('should handle modals with different component types', async () => {
		const regularComponent = defineComponent({
			name: 'RegularModal',
			props: {
				modalName: { type: String, required: true },
				active: { type: Boolean, required: true },
				open: { type: Boolean, required: true },
				activeId: { type: String, required: true },
				mode: { type: String, required: true },
				data: { type: Object, required: true },
			},
			template: '<div data-testid="regular-modal">Regular</div>',
		});

		const asyncComponent = async () =>
			await Promise.resolve(
				defineComponent({
					name: 'AsyncModal',
					props: {
						modalName: { type: String, required: true },
						active: { type: Boolean, required: true },
						open: { type: Boolean, required: true },
						activeId: { type: String, required: true },
						mode: { type: String, required: true },
						data: { type: Object, required: true },
					},
					template: '<div data-testid="async-modal">Async</div>',
				}),
			);

		const modalsMap = new Map<string, ModalDefinition>([
			['regular', { key: 'regular', component: regularComponent }],
			['async', { key: 'async', component: asyncComponent }],
		]);

		mockModalRegistry.getAll.mockReturnValue(modalsMap);
		mockModalRegistry.subscribe.mockReturnValue(vi.fn());

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();

		const modalRoots = container.querySelectorAll('[data-testid="modal-root"]');
		expect(modalRoots).toHaveLength(2);

		// Both modals should be rendered
		const modalNames = Array.from(modalRoots).map((root) => root.getAttribute('data-modal-name'));
		expect(modalNames).toContain('regular');
		expect(modalNames).toContain('async');
	});

	it('should call updateModals on mount', () => {
		const modalsMap = new Map<string, ModalDefinition>([
			['testModal', { key: 'testModal', component: mockModalComponent }],
		]);

		mockModalRegistry.getAll.mockReturnValue(modalsMap);
		mockModalRegistry.subscribe.mockReturnValue(vi.fn());

		renderComponent({
			pinia: createTestingPinia(),
		});

		// getAll should be called during updateModals on mount
		expect(mockModalRegistry.getAll).toHaveBeenCalledTimes(1);
	});

	it('should correctly identify async component factories', async () => {
		// Test with regular component (not async)
		const regularComponent = defineComponent({
			name: 'RegularComponent',
			props: {
				modalName: { type: String, required: true },
				active: { type: Boolean, required: true },
				open: { type: Boolean, required: true },
				activeId: { type: String, required: true },
				mode: { type: String, required: true },
				data: { type: Object, required: true },
			},
			template: '<div>Regular</div>',
		});

		// Test with async component factory
		const asyncFactory = async () => await Promise.resolve(regularComponent);

		const modalsMap = new Map<string, ModalDefinition>([
			['regularModal', { key: 'regularModal', component: regularComponent }],
			['asyncModal', { key: 'asyncModal', component: asyncFactory }],
		]);

		mockModalRegistry.getAll.mockReturnValue(modalsMap);
		mockModalRegistry.subscribe.mockReturnValue(vi.fn());

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();

		// Both should render successfully
		const modalRoots = container.querySelectorAll('[data-testid="modal-root"]');
		expect(modalRoots).toHaveLength(2);
	});
});
