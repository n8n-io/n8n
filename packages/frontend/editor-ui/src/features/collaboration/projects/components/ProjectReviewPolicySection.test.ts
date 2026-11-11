import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { createMockEnterpriseSettings } from '@/__tests__/mocks';
import { EnterpriseEditionFeature } from '@/app/constants';
import { STORES } from '@n8n/stores';

import ProjectReviewPolicySection from './ProjectReviewPolicySection.vue';
import { fetchProjectReviewPolicy } from '@/features/workflow-reviews/workflowReviewPolicy.api';

vi.mock('@/features/workflow-reviews/workflowReviewPolicy.api', () => ({
	fetchProjectReviewPolicy: vi.fn().mockResolvedValue({
		publishingNeedsApproval: false,
		promotingNeedsApproval: false,
		publishingLockedBy: null,
		promotingLockedBy: null,
	}),
	updateProjectReviewPolicy: vi.fn(),
}));

const renderComponent = createComponentRenderer(ProjectReviewPolicySection, {
	props: { projectId: 'project-1' },
});

function piniaFor(workflowReviews: { enabled: boolean; promotionReviewsEnabled: boolean }) {
	return createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: createMockEnterpriseSettings({
						[EnterpriseEditionFeature.WorkflowReviews]: true,
					}),
					workflowReviews,
				},
			},
		},
	});
}

describe('ProjectReviewPolicySection', () => {
	beforeEach(() => {
		vi.mocked(fetchProjectReviewPolicy).mockClear();
	});

	it('hides the section while publishing and promotion reviews are off', async () => {
		const { queryByTestId } = renderComponent({
			pinia: piniaFor({ enabled: false, promotionReviewsEnabled: false }),
		});

		await Promise.resolve();

		expect(queryByTestId('project-review-policy-section')).not.toBeInTheDocument();
		expect(fetchProjectReviewPolicy).not.toHaveBeenCalled();
	});

	it('shows the publishing row and hides promotion when promotion reviews are off', async () => {
		const { findByTestId, queryByTestId } = renderComponent({
			pinia: piniaFor({ enabled: true, promotionReviewsEnabled: false }),
		});

		expect(await findByTestId('project-review-publishing-toggle')).toBeInTheDocument();
		expect(queryByTestId('project-review-promoting-toggle')).not.toBeInTheDocument();
	});
});
