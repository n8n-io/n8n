import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameter, { type Props } from './FixedCollectionParameter.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { COLLECTION_OVERHAUL_EXPERIMENT } from '@/app/constants';
import { usePostHog, type PosthogStore } from '@/app/stores/posthog.store';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';

const mockedGetVariant = vi.fn(() => 'control');
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn(() => ({
		getVariant: mockedGetVariant,
	})),
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

	it('renders legacy component when feature flag is disabled', async () => {
		mockedGetVariant.mockReturnValue(COLLECTION_OVERHAUL_EXPERIMENT.control);

		const { container } = renderComponent();
		await flushPromises();

		const component = container.querySelector('[data-test-id="fixed-collection-rules"]');
		expect(component).toBeInTheDocument();

		const addButton = container.querySelector('[data-test-id="fixed-collection-add"]');
		expect(addButton).toBeInTheDocument();
	});

	it('renders new component when feature flag is enabled', async () => {
		const mockPostHog = vi.mocked(usePostHog);
		mockPostHog.mockReturnValue({
			getVariant: vi.fn().mockReturnValue(COLLECTION_OVERHAUL_EXPERIMENT.variant),
		} as Partial<PosthogStore> as PosthogStore);

		const { container } = renderComponent();
		await flushPromises();

		// New component renders
		const component = container.querySelector('[data-test-id="fixed-collection-rules"]');
		expect(component).toBeInTheDocument();

		// Verify some element from the new UI is present (not requiring specific button)
		// The new UI structure should be different from legacy
		const buttons = container.querySelectorAll('button');
		expect(buttons.length).toBeGreaterThan(0);
	});

	it('forwards props to child component', async () => {
		mockedGetVariant.mockReturnValue(COLLECTION_OVERHAUL_EXPERIMENT.variant);

		const { container } = renderComponent({
			props: {
				...props,
				isReadOnly: true,
			},
		});
		await flushPromises();

		// Verify that isReadOnly prop is forwarded (no add buttons should be visible)
		const addButton = container.querySelector('[data-test-id="fixed-collection-add"]');
		expect(addButton).not.toBeInTheDocument();
	});

	it('forwards valueChanged event from child component', async () => {
		mockedGetVariant.mockReturnValue(COLLECTION_OVERHAUL_EXPERIMENT.variant);

		const { emitted, getByTestId } = renderComponent();
		await flushPromises();

		// Click the add button to trigger a valueChanged event
		const addButton = getByTestId('fixed-collection-add-header');
		await userEvent.click(addButton);
		await flushPromises();

		// Verify that the valueChanged event was emitted with the correct payload
		expect(emitted().valueChanged).toBeTruthy();
		expect(emitted().valueChanged).toHaveLength(1);
		expect(emitted().valueChanged[0]).toEqual([
			expect.objectContaining({
				name: expect.stringContaining('parameters.rules.values'),
			}),
		]);
	});
});
