import { createTestNode } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { computed, nextTick, shallowRef } from 'vue';
import { WorkflowDocumentStoreKey, WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import ExperimentalEmbeddedNdvMapper from './ExperimentalEmbeddedNdvMapper.vue';
import { useExperimentalNdvStore } from '../experimentalNdv.store';

// Instantiates a store that derives the workflow id from the route. These tests run
// without a router, so resolve the id directly.
vi.mock('@/app/composables/useWorkflowId', async () => {
	const { computed } = await import('vue');
	return {
		useWorkflowId: () => computed(() => ''),
		useRouteWorkflowId: () => computed(() => ''),
	};
});

describe('ExperimentalEmbeddedNdvMapper', () => {
	const node = createTestNode({ name: 'n1' });

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
	});

	it('should open the popover on hover if visibleOnHover is true', async () => {
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(
						useWorkflowDocumentStore(createWorkflowDocumentId('test-workflow-id')),
					),
				},
				plugins: [createTestingPinia({ stubActions: false })],
			},
			props: {
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: true,
			},
		});

		await nextTick();
		await userEvent.hover(reference);
		expect(rendered.queryByTestId('ndv-input-panel')).toBeInTheDocument();
	});

	it('should not open the popover on hover if visibleOnHover is false', async () => {
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(
						useWorkflowDocumentStore(createWorkflowDocumentId('test-workflow-id')),
					),
				},
				plugins: [createTestingPinia({ stubActions: false })],
			},
			props: {
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: false,
			},
		});

		await nextTick();
		await userEvent.hover(reference);
		expect(rendered.queryByTestId('ndv-input-panel')).not.toBeInTheDocument();
	});

	it('should not open the popover if a mapper is already opened elsewhere', async () => {
		const pinia = createTestingPinia({ stubActions: false });
		const store = useExperimentalNdvStore(pinia);
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(
						useWorkflowDocumentStore(createWorkflowDocumentId('test-workflow-id')),
					),
				},
				plugins: [pinia],
			},
			props: {
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: true,
			},
		});

		store.setMapperOpen(true);

		await nextTick();
		await userEvent.hover(reference);
		expect(rendered.queryByTestId('ndv-input-panel')).not.toBeInTheDocument();
	});

	it('should close the popover on mouse leave if the popover is opened by hover', async () => {
		const reference = document.createElement('div');
		const rendered = render(ExperimentalEmbeddedNdvMapper, {
			global: {
				provide: {
					[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
					[WorkflowDocumentStoreKey as symbol]: shallowRef(
						useWorkflowDocumentStore(createWorkflowDocumentId('test-workflow-id')),
					),
				},
				plugins: [createTestingPinia({ stubActions: false })],
			},
			props: {
				node,
				inputNodeName: 'n0',
				reference,
				visibleOnHover: true,
			},
		});

		await nextTick();
		await userEvent.hover(reference);
		expect(await rendered.findByTestId('ndv-input-panel')).toBeInTheDocument();

		await userEvent.unhover(reference);
		await flushPromises();
		await waitFor(() => expect(rendered.queryByTestId('ndv-input-panel')).not.toBeInTheDocument());
	});
});
