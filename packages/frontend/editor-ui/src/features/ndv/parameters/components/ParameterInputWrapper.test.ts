import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
import { STORES } from '@n8n/stores';
import { getNDVStoreId } from '@/features/ndv/shared/ndv.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';
import { createTestNodeProperties } from '@/__tests__/mocks';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { setActivePinia } from 'pinia';

const { mockResolveExpression } = vi.hoisted(() => ({
	mockResolveExpression: vi.fn(),
}));

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

vi.mock('@/app/composables/useWorkflowHelpers', () => {
	return { useWorkflowHelpers: vi.fn(() => ({ resolveExpression: mockResolveExpression })) };
});

describe('ParameterInputWrapper.vue', () => {
	beforeEach(() => {
		mockResolveExpression.mockResolvedValue('topSecret');
	});

	test('should resolve expression', async () => {
		const { getByTestId } = renderComponent(ParameterInputWrapper, {
			pinia: createTestingPinia({
				initialState: {
					[getNDVStoreId(createWorkflowDocumentId('default'))]: {
						activeNodeName: 'testNode',
						input: { nodeName: 'inputNode' },
					},
					[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
				},
			}),
			props: {
				parameter: createTestNodeProperties({
					name: 'test',
					type: 'string',
				}),
				path: 'params.test',
				modelValue: '={{ $secrets.infisical.password }}',
				isForCredential: true,
			},
			global: {
				mocks: {
					$ndvStore: {
						activeNode: vi.fn(() => ({ test: 'test' })),
					},
				},
			},
		});

		await waitFor(() => expect(getByTestId('parameter-input-hint')).toHaveTextContent('topSecret'));
	});

	test('should resolve credential expressions with external secrets preview data', async () => {
		mockResolveExpression.mockImplementation(
			async (_expression, _data, options: { additionalKeys?: Record<string, unknown> }) => {
				const secrets = options.additionalKeys?.$secrets as {
					testVault: { testKey: string };
				};
				return secrets.testVault.testKey;
			},
		);

		const pinia = createTestingPinia({
			initialState: {
				[getNDVStoreId(createWorkflowDocumentId('default'))]: {
					activeNodeName: 'testNode',
					input: { nodeName: 'inputNode' },
				},
				[STORES.SETTINGS]: {
					...SETTINGS_STORE_DEFAULT_STATE,
					settings: {
						...SETTINGS_STORE_DEFAULT_STATE.settings,
						enterprise: {
							...SETTINGS_STORE_DEFAULT_STATE.settings.enterprise,
							externalSecrets: true,
						},
					},
				},
			},
		});
		setActivePinia(pinia);
		const externalSecretsStore = useExternalSecretsStore();
		externalSecretsStore.state.secrets = {
			testVault: ['testKey'],
		};

		const { getByTestId } = renderComponent(ParameterInputWrapper, {
			pinia,
			props: {
				parameter: createTestNodeProperties({
					name: 'headers.value',
					type: 'string',
				}),
				path: 'params.headers.value',
				modelValue: '={{ $secrets.testVault.testKey }}',
				isForCredential: true,
			},
		});

		await waitFor(() =>
			expect(getByTestId('parameter-expression-preview-headers.value')).toHaveTextContent(
				'*********',
			),
		);
		expect(mockResolveExpression).toHaveBeenCalledWith(
			'={{ $secrets.testVault.testKey }}',
			undefined,
			expect.objectContaining({
				isForCredential: true,
				additionalKeys: expect.objectContaining({
					$secrets: {
						testVault: {
							testKey: '*********',
						},
					},
				}),
			}),
			true,
		);
	});
});
