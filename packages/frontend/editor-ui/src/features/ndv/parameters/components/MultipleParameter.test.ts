import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import MultipleParameter from './MultipleParameter.vue';

vi.mock('@/features/ndv/shared/ndv.store', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	const useNDVStoreFn = actual.useNDVStore as (id: string) => unknown;
	const { createWorkflowDocumentId: makeDocId } = await import(
		'@/app/stores/workflowDocument.store'
	);
	const { shallowRef: makeShallow } = await import('vue');
	return {
		...actual,
		injectNDVStore: vi.fn(() => makeShallow(useNDVStoreFn(makeDocId('default')))),
	};
});

describe('MultipleParameter', () => {
	const renderComponent = createComponentRenderer(MultipleParameter, {
		props: {
			path: 'parameters.additionalFields',
			parameter: {
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
						default: undefined,
					},
				],
				default: undefined,
			},
			nodeValues: {
				parameters: {
					additionalFields: {},
				},
			},
			values: [],
			isReadOnly: false,
		},
		pinia: createTestingPinia({ initialState: {} }),
	});

	it('should render correctly', () => {
		const wrapper = renderComponent();

		expect(wrapper.html()).toMatchSnapshot();
	});
});
