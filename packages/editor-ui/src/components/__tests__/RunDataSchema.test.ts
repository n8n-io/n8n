import { createTestingPinia } from '@pinia/testing';
import { cleanup } from '@testing-library/vue';
import RunDataJsonSchema from '@/components/RunDataSchema.vue';
import { STORES } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';

const renderComponent = createComponentRenderer(RunDataJsonSchema, {
	global: {
		stubs: ['font-awesome-icon'],
		plugins: [
			createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: {
						settings: {
							templates: {
								enabled: true,
								host: 'https://api.n8n.io/api/',
							},
						},
					},
				},
			}),
		],
	},
	props: {
		mappingEnabled: true,
		distanceFromActive: 1,
		runIndex: 1,
		totalRuns: 2,
		paneType: 'input',
		node: {
			parameters: {
				keepOnlySet: false,
				values: {},
				options: {},
			},
			id: '820ea733-d8a6-4379-8e73-88a2347ea003',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [380, 1060],
			disabled: false,
		},
		data: [{}],
	},
});

describe('RunDataJsonSchema.vue', () => {
	beforeEach(cleanup);

	it('renders schema for empty data', () => {
		const { container } = renderComponent();
		expect(container).toMatchSnapshot();
	});

	it('renders schema for data', () => {
		const { container } = renderComponent({
			props: {
				data: [
					{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] },
					{ name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] },
				],
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders schema with spaces and dots', () => {
		const { container } = renderComponent({
			props: {
				data: [
					{
						'hello world': [
							{
								test: {
									'more to think about': 1,
								},
								'test.how': 'ignore',
							},
						],
					},
				],
			},
		});
		expect(container).toMatchSnapshot();
	});

	it('renders no data to show for data empty objects', () => {
		const renderResult = renderComponent({
			props: {
				data: [{}, {}],
			},
		});

		expect(renderResult.getByText(/No data to show/)).toBeInTheDocument();
	});

	test.each([[[{ tx: false }, { tx: false }]], [[{ tx: '' }, { tx: '' }]], [[{ tx: [] }]]])(
		'renders schema instead of showing no data for %o',
		(data) => {
			const renderResult = renderComponent({
				props: {
					data,
				},
			});

			expect(renderResult.queryByText(/No data to show/)).not.toBeInTheDocument();
		},
	);
});
