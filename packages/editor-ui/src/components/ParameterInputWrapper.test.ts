import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
// import { within } from '@testing-library/vue';

describe('ParameterInputWrapper.vue', () => {
	test('should resolve expression', async () => {
		const { getByTestId } = renderComponent(ParameterInputWrapper, {
			pinia: createTestingPinia({
				initialState: {
					ndv: {
						activeNodeName: 'testNode',
						input: { nodeName: 'inputNode' },
					},
				},
			}),
			props: {
				parameter: {
					name: 'test',
					type: 'string',
				},
				path: 'params.test',
				modelValue: '={{ $secrets.infisical.password }}',
				isForCredential: true,
			},
			global: {
				mocks: {
					$workflowHelpers: {
						resolveExpression: vi.fn(() => 'topSecret'),
					},
					$ndvStore: {
						activeNode: vi.fn(() => ({ test: 'test' })),
					},
				},
			},
		});

		// const parameterInput = getByTestId('parameter-input');
		// expect(parameterInput).toBeInTheDocument();
		// expect(within(parameterInput).getByRole('textbox')).toHaveValue('ERROR');

		// expect(getByTestId('parameter-input-hint')).toHaveTextContent('[ERROR: ]');
		expect(getByTestId('parameter-input-hint')).toHaveTextContent('topSecret');
	});
});
