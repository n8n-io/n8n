import { createTestingPinia } from '@pinia/testing';
import { defineComponent, nextTick } from 'vue';
import { screen } from '@testing-library/vue';
import DynamicModalLoader from '@/app/components/DynamicModalLoader.vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';
import { createComponentRenderer } from '@/__tests__/render';

/**
 * Exercised against the real registry, not a mock of it: the loader derives from
 * the registry rather than subscribing to it, so what needs proving is that the
 * rendered list follows registration in both directions.
 */

const modalProps = {
	modalName: { type: String, required: true },
	active: { type: Boolean, required: true },
	open: { type: Boolean, required: true },
	activeId: { type: String, required: true },
	mode: { type: String, required: true },
	data: { type: Object, required: true },
} as const;

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

const renderedModalNames = (container: Element) =>
	Array.from(container.querySelectorAll('[data-testid="modal-root"]'), (root) =>
		root.getAttribute('data-modal-name'),
	);

describe('DynamicModalLoader', () => {
	const mockModalComponent = defineComponent({
		name: 'MockModal',
		props: modalProps,
		template: '<div data-testid="mock-modal" :data-modal-name="modalName">Mock Modal</div>',
	});

	const mockAsyncModalComponent = vi.fn(async () => await Promise.resolve(mockModalComponent));

	beforeEach(() => {
		vi.clearAllMocks();
		modalRegistry.clear();
	});

	it('should render empty div when no modals are registered', () => {
		const { container } = renderComponent({ pinia: createTestingPinia() });

		expect(container.firstChild).toBeInTheDocument();
		expect(screen.queryByTestId('modal-root')).not.toBeInTheDocument();
	});

	it('should render ModalRoot components for registered modals', async () => {
		modalRegistry.register({ key: 'testModal1', component: mockModalComponent });
		modalRegistry.register({ key: 'testModal2', component: mockModalComponent });

		const { container } = renderComponent({ pinia: createTestingPinia() });
		await nextTick();

		expect(renderedModalNames(container)).toEqual(['testModal1', 'testModal2']);
	});

	it('should handle async component factories', async () => {
		modalRegistry.register({ key: 'asyncModal', component: mockAsyncModalComponent });

		const { container } = renderComponent({ pinia: createTestingPinia() });
		await nextTick();

		expect(renderedModalNames(container)).toEqual(['asyncModal']);
		expect(mockAsyncModalComponent).toHaveBeenCalled();
	});

	it('should render a modal registered after mount', async () => {
		const { container } = renderComponent({ pinia: createTestingPinia() });
		await nextTick();
		expect(renderedModalNames(container)).toEqual([]);

		modalRegistry.register({ key: 'newModal', component: mockModalComponent });
		await nextTick();

		expect(renderedModalNames(container)).toEqual(['newModal']);
	});

	it('should stop rendering a modal that is unregistered', async () => {
		modalRegistry.register({ key: 'staying', component: mockModalComponent });
		modalRegistry.register({ key: 'leaving', component: mockModalComponent });

		const { container } = renderComponent({ pinia: createTestingPinia() });
		await nextTick();
		expect(renderedModalNames(container)).toEqual(['staying', 'leaving']);

		modalRegistry.unregister('leaving');
		await nextTick();

		expect(renderedModalNames(container)).toEqual(['staying']);
	});

	it('should render nothing once the registry is cleared', async () => {
		modalRegistry.register({ key: 'testModal', component: mockModalComponent });

		const { container } = renderComponent({ pinia: createTestingPinia() });
		await nextTick();
		expect(renderedModalNames(container)).toEqual(['testModal']);

		modalRegistry.clear();
		await nextTick();

		expect(renderedModalNames(container)).toEqual([]);
	});

	it('should handle modals with different component types', async () => {
		const regularComponent = defineComponent({
			name: 'RegularModal',
			props: modalProps,
			template: '<div data-testid="regular-modal">Regular</div>',
		});
		const asyncComponent = async () =>
			await Promise.resolve(
				defineComponent({
					name: 'AsyncModal',
					props: modalProps,
					template: '<div data-testid="async-modal">Async</div>',
				}),
			);

		modalRegistry.register({ key: 'regular', component: regularComponent });
		modalRegistry.register({ key: 'async', component: asyncComponent });

		const { container } = renderComponent({ pinia: createTestingPinia() });
		await nextTick();

		expect(renderedModalNames(container)).toEqual(['regular', 'async']);
	});
});
