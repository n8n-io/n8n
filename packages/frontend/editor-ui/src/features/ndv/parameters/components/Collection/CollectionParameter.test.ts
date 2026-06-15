import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import CollectionParameter from './CollectionParameter.vue';
import { createTestNodeProperties } from '@/__tests__/mocks';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(CollectionParameter, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	}),
});

describe('CollectionParameter', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render collection component', async () => {
		const { container } = renderComponent({
			props: {
				path: 'parameters.additionalFields',
				parameter: createTestNodeProperties({
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'number',
							default: 0,
						},
					],
				}),
				nodeValues: {
					parameters: {
						additionalFields: {},
					},
				},
				values: {},
			},
		});

		expect(container).toBeInTheDocument();
	});

	it('should render with existing values', async () => {
		const { container } = renderComponent({
			props: {
				path: 'parameters.additionalFields',
				parameter: createTestNodeProperties({
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'number',
							default: 0,
						},
					],
				}),
				nodeValues: {
					parameters: {
						additionalFields: {
							currency: 'EUR',
						},
					},
				},
				values: {
					currency: 'EUR',
				},
			},
		});

		expect(container).toBeInTheDocument();
	});

	it('should handle read-only mode', async () => {
		const { container } = renderComponent({
			props: {
				path: 'parameters.additionalFields',
				parameter: createTestNodeProperties({
					displayName: 'Additional Fields',
					name: 'additionalFields',
					type: 'collection',
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
					],
				}),
				nodeValues: {
					parameters: {
						additionalFields: {},
					},
				},
				values: {},
				isReadOnly: true,
			},
		});

		expect(container).toBeInTheDocument();
	});
});
