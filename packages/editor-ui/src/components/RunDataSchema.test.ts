import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render } from '@testing-library/vue';
import RunDataJsonSchema from '@/components/RunDataSchema.vue';
import { STORES } from "@/constants";

describe('RunDataJsonSchema.vue', () => {
	it('renders json schema properly', () => {
		const { container } = render(RunDataJsonSchema, {
				pinia: createTestingPinia({
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
				stubs: ['font-awesome-icon'],
				props: {
					mappingEnabled: true,
					distanceFromActive: 1,
					runIndex: 1,
					totalRuns: 2,
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
						position: [
							380,
							1060,
						],
						disabled: false,
					},
					data: [{ name: 'John', age: 22, hobbies: ['surfing', 'traveling'] }, { name: 'Joe', age: 33, hobbies: ['skateboarding', 'gaming'] }],
				},
				mocks: {
					$locale: {
						baseText() {
							return '';
						},
					},
					$store: {
						getters: {},
					},
				},
			},
			vue => {
				vue.use(PiniaVuePlugin);
			});
		expect(container).toMatchSnapshot();
	});
});
