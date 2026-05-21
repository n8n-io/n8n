import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ParameterInputWrapper from './ParameterInputWrapper.vue';
import { STORES } from '@n8n/stores';
import { getNDVStoreId } from '@/features/ndv/shared/ndv.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';
import { createTestNodeProperties } from '@/__tests__/mocks';
import { setActivePinia } from 'pinia';
import { shallowRef } from 'vue';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';

vi.mock('@/app/composables/useWorkflowHelpers', () => {
	return { useWorkflowHelpers: vi.fn(() => ({ resolveExpression: vi.fn(() => 'topSecret') })) };
});

describe('ParameterInputWrapper.vue', () => {
	test('should resolve expression', async () => {
		const pinia = createTestingPinia({
			initialState: {
				[getNDVStoreId(createWorkflowDocumentId('default'))]: {
					activeNodeName: 'testNode',
					input: { nodeName: 'inputNode' },
				},
				[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
			},
		});
		setActivePinia(pinia);
		const workflowDocumentStoreRef = shallowRef(
			useWorkflowDocumentStore(createWorkflowDocumentId('default')),
		);
		const { getByTestId } = renderComponent(ParameterInputWrapper, {
			pinia,
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
				provide: {
					[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
				},
				mocks: {
					$ndvStore: {
						activeNode: vi.fn(() => ({ test: 'test' })),
					},
				},
			},
		});

		await waitFor(() => expect(getByTestId('parameter-input-hint')).toHaveTextContent('topSecret'));
	});
});
