import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { IconBodyLoaderKey } from '@n8n/design-system';
import { describe, expect, it, vi } from 'vitest';
import type { IWorkflowDb } from '@/Interface';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowTourStore } from '@/features/workflows/tour/workflowTour.store';
import { renderComponent } from '@/__tests__/render';
import ArtifactCard from '../ArtifactCard.vue';

function renderArtifactCard(
	props: Partial<InstanceType<typeof ArtifactCard>['$props']> = {},
	openWorkflowPreview = vi.fn(),
	prepareStores?: (stores: {
		workflowsListStore: ReturnType<typeof useWorkflowsListStore>;
	}) => void,
) {
	const pinia = createTestingPinia({ stubActions: false });
	const workflowsListStore = useWorkflowsListStore();
	prepareStores?.({ workflowsListStore });

	const result = renderComponent(ArtifactCard, {
		pinia,
		props: {
			type: 'workflow',
			resourceId: 'wf-1',
			name: 'Support triage',
			...props,
		},
		global: {
			provide: {
				openWorkflowPreview,
				[IconBodyLoaderKey as symbol]: async () => '<path d="M1 1"/>',
			},
		},
	});

	return {
		...result,
		openWorkflowPreview,
		tourStore: useWorkflowTourStore(),
		workflowsListStore,
	};
}

describe('ArtifactCard', () => {
	it('starts the workflow tour from the artifact button', async () => {
		const { getByTestId, openWorkflowPreview, tourStore } = renderArtifactCard({
			hasTourDescriptions: true,
		});

		await fireEvent.click(getByTestId('instance-ai-artifact-start-tour-button'));

		expect(openWorkflowPreview).toHaveBeenCalledExactlyOnceWith('wf-1');
		expect(tourStore.pendingWorkflowId).toBe('wf-1');
	});

	it('shows the tour button when cached workflow metadata has descriptions', () => {
		const { getByTestId } = renderArtifactCard({}, vi.fn(), ({ workflowsListStore }) => {
			workflowsListStore.workflowsById = {
				'wf-1': {
					id: 'wf-1',
					name: 'Support triage',
					meta: {
						nodeDescriptions: {
							'node-1': { summary: 'Receives incoming support requests' },
						},
					},
				} as IWorkflowDb,
			};
		});

		expect(getByTestId('instance-ai-artifact-start-tour-button')).toBeInTheDocument();
	});

	it('hides the tour button for archived workflows', () => {
		const { queryByTestId } = renderArtifactCard({
			archived: true,
			hasTourDescriptions: true,
		});

		expect(queryByTestId('instance-ai-artifact-start-tour-button')).not.toBeInTheDocument();
	});
});
