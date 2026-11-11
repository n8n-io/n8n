import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { N8nDropdownMenu } from '@n8n/design-system';

import { createComponentRenderer } from '@/__tests__/render';
import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';
import { useWorkflowReviewPolicyStore } from '@/features/workflow-reviews/workflowReviewPolicy.store';
import {
	fetchWorkflowReviewPolicy,
	updateWorkflowReviewPolicy,
} from '@/features/workflow-reviews/workflowReviewPolicy.api';
import WorkflowReviewRequiredToggle from './WorkflowReviewRequiredToggle.vue';

vi.mock('@/features/workflow-reviews/workflowReviewPolicy.api', () => ({
	fetchWorkflowReviewPolicy: vi.fn(),
	updateWorkflowReviewPolicy: vi.fn(),
}));

const editablePolicy = {
	publishingNeedsApproval: false,
	promotingNeedsApproval: false,
	publishingLockedBy: null,
	promotingLockedBy: null,
};

const TestHost = defineComponent({
	components: { N8nDropdownMenu, WorkflowReviewRequiredToggle },
	template: `
		<N8nDropdownMenu :default-open="true" :items="[{ id: 'action', label: 'Action' }]">
			<template #footer>
				<WorkflowReviewRequiredToggle workflow-id="workflow-1" :can-edit="true" />
			</template>
		</N8nDropdownMenu>
	`,
});

const renderComponent = createComponentRenderer(TestHost, {
	pinia: createTestingPinia({
		stubActions: false,
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: createMockEnterpriseSettings({
						[EnterpriseEditionFeature.WorkflowReviews]: true,
					}),
					workflowReviews: { enabled: true, promotionReviewsEnabled: false },
				},
			},
		},
	}),
});

describe('WorkflowReviewRequiredToggle', () => {
	beforeEach(() => {
		vi.mocked(fetchWorkflowReviewPolicy).mockResolvedValue(editablePolicy);
		vi.mocked(updateWorkflowReviewPolicy).mockResolvedValue({
			...editablePolicy,
			publishingNeedsApproval: true,
		});
	});

	it('shows an editable publishing switch and hides promotion when promotion reviews are off', async () => {
		const { findByTestId, queryByTestId, getByRole } = renderComponent();
		await userEvent.click(getByRole('button'));

		expect(await findByTestId('workflow-review-publishing-approval')).toBeInTheDocument();
		expect(queryByTestId('workflow-review-promoting-approval')).not.toBeInTheDocument();
		expect(queryByTestId('workflow-review-publishing-required-badge')).not.toBeInTheDocument();
	});

	it('saves a publishing requirement and leaves the menu open', async () => {
		const { findByTestId, getByRole } = renderComponent();
		await userEvent.click(getByRole('button'));
		await userEvent.click(await findByTestId('workflow-review-publishing-approval'));

		expect(updateWorkflowReviewPolicy).toHaveBeenCalledWith(expect.anything(), 'workflow-1', {
			publishingNeedsApproval: true,
		});
		expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
	});

	it('does not save when the instance already requires approval', async () => {
		vi.mocked(fetchWorkflowReviewPolicy).mockResolvedValue({
			...editablePolicy,
			publishingNeedsApproval: true,
			publishingLockedBy: 'instance',
		});
		const { findByTestId, getByRole } = renderComponent();
		await userEvent.click(getByRole('button'));
		await userEvent.click(await findByTestId('workflow-review-publishing-approval'));

		expect(updateWorkflowReviewPolicy).not.toHaveBeenCalled();
		expect(useWorkflowReviewPolicyStore().get('workflow-1')?.publishingLockedBy).toBe('instance');
	});
});
