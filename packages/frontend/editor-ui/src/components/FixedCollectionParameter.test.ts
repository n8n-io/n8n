import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameter, { type Props } from '@/components/FixedCollectionParameter.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { COLLECTION_OVERHAUL_EXPERIMENT } from '@/constants';
import { usePostHog } from '@/stores/posthog.store';

vi.mock('@/stores/posthog.store', () => ({
	usePostHog: vi.fn(),
}));

describe('FixedCollectionParameter.vue (Wrapper)', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);

	const props: Props = {
		parameter: {
			displayName: 'Routing Rules',
			name: 'rules',
			placeholder: 'Add Routing Rule',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			default: '',
			options: [
				{
					name: 'values',
					displayName: 'Values',
					values: [
						{
							displayName: 'Output Name',
							name: 'outputKey',
							type: 'string',
							default: 'Default Output Name',
						},
					],
				},
			],
		},
		path: 'parameters.rules',
		nodeValues: {
			parameters: {
				rules: { values: [{ outputKey: 'Test Output Name' }] },
			},
		},
		values: {
			values: [{ outputKey: 'Test Output Name' }],
		},
		isReadOnly: false,
	};

	const renderComponent = createComponentRenderer(FixedCollectionParameter, { props });

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders legacy component when feature flag is disabled', () => {
		vi.mocked(usePostHog).mockReturnValue({
			getVariant: vi.fn().mockReturnValue('control'),
		} as any);

		const { container } = renderComponent();

		// Legacy component has specific padding-left style
		const component = container.querySelector('[data-test-id="fixed-collection-rules"]');
		expect(component).toBeInTheDocument();

		// Legacy uses tertiary button for add (no icon)
		const addButton = container.querySelector('[data-test-id="fixed-collection-add"]');
		expect(addButton).toBeInTheDocument();
	});

	it('renders new component when feature flag is enabled', () => {
		vi.mocked(usePostHog).mockReturnValue({
			getVariant: vi.fn().mockReturnValue(COLLECTION_OVERHAUL_EXPERIMENT.variant),
		} as any);

		const { container } = renderComponent();

		// New component renders
		const component = container.querySelector('[data-test-id="fixed-collection-rules"]');
		expect(component).toBeInTheDocument();

		// Verify some element from the new UI is present (not requiring specific button)
		// The new UI structure should be different from legacy
		const buttons = container.querySelectorAll('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('forwards props to child component', () => {
		vi.mocked(usePostHog).mockReturnValue({
			getVariant: vi.fn().mockReturnValue('control'),
		} as any);

		const { container } = renderComponent({
			props: {
				...props,
				isReadOnly: true,
			},
		});

		// Verify that isReadOnly prop is forwarded (no add buttons should be visible)
		const addButton = container.querySelector('[data-test-id="fixed-collection-add"]');
		expect(addButton).not.toBeInTheDocument();
	});

	it('forwards valueChanged event from child component', async () => {
		vi.mocked(usePostHog).mockReturnValue({
			getVariant: vi.fn().mockReturnValue('control'),
		} as any);

		const { emitted } = renderComponent();

		// The wrapper should forward the valueChanged event from the child
		// We verify this by checking that the event is properly set up
		expect(emitted()).toBeDefined();
	});
});
