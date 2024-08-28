import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
import { STORES } from '@/constants';
import { cleanupAppModals, createAppModals, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';

describe('ParameterInputWrapper.vue', () => {
	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
	});
	test('should resolve expression', async () => {
		const { getByTestId } = renderComponent(ParameterInputWrapper, {
			pinia: createTestingPinia({
				initialState: {
					[STORES.NDV]: {
						activeNodeName: 'testNode',
						input: { nodeName: 'inputNode' },
					},
					[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
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

		expect(getByTestId('parameter-input-hint')).toHaveTextContent('[ERROR: ]');
	});
});
