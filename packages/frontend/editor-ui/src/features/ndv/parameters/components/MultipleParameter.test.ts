import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import MultipleParameter from './MultipleParameter.vue';
import { NodeVersionNewParameterKey } from '@/app/constants';

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

	it('shows the new tag on the label of a parameter that the node version added', () => {
		const tagged = renderComponent({
			global: {
				provide: {
					[NodeVersionNewParameterKey as symbol]: (path: string) =>
						path === 'parameters.additionalFields',
				},
			},
		});
		expect(tagged.getByText('Additional Fields').parentElement).toContainElement(
			tagged.getByTestId('parameter-new-tag'),
		);
		tagged.unmount();

		const other = renderComponent({
			global: {
				provide: {
					[NodeVersionNewParameterKey as symbol]: (path: string) => path === 'parameters.other',
				},
			},
		});
		expect(other.queryByTestId('parameter-new-tag')).not.toBeInTheDocument();
	});
});
