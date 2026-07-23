import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import { N8nDropdownMenu } from '@n8n/design-system';

import type { Pinia } from 'pinia';

import { createComponentRenderer } from '@/__tests__/render';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW } from '@/app/constants/localStorage';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { fetchWorkflowReviewRequests } from '@/features/workflow-reviews/workflowReviews.api';
import WorkflowReviewRequiredToggle from './WorkflowReviewRequiredToggle.vue';

vi.mock('@/features/workflow-reviews/workflowReviews.api', () => ({
	fetchWorkflowReviewRequests: vi.fn(),
}));

const TestHost = defineComponent({
	components: { N8nDropdownMenu, WorkflowReviewRequiredToggle },
	template: `
		<N8nDropdownMenu :default-open="true" :items="[{ id: 'action', label: 'Action' }]">
			<template #footer>
				<WorkflowReviewRequiredToggle workflow-id="workflow-1" />
			</template>
		</N8nDropdownMenu>
	`,
});

const renderComponent = createComponentRenderer(TestHost);

describe('WorkflowReviewRequiredToggle', () => {
	beforeEach(() => {
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW('anonymous'));
	});

	it('renders the title, description, accessible checkbox item, and decorative design-system switch', async () => {
		const pinia = createPinia();
		const { getByText, getByRole, getByTestId } = renderComponent({ pinia });
		await userEvent.click(getByRole('button'));

		expect(getByText('Review required')).toBeInTheDocument();
		expect(
			getByText('Require changes to be reviewed and approved before publishing.'),
		).toBeInTheDocument();
		expect(getByRole('menuitemcheckbox', { name: /Review required/ })).toBeInTheDocument();
		expect(getByTestId('workflow-review-required-switch')).toHaveAttribute('role', 'switch');
		expect(getByTestId('workflow-review-required-switch')).toHaveAttribute('aria-hidden', 'true');
		expect(getByTestId('workflow-review-required-switch')).toHaveAttribute('tabindex', '-1');
	});

	it('reflects stored on and off state', async () => {
		const pinia = createPinia();
		const store = useReviewRequiredStore(pinia);
		store.setReviewRequired('workflow-1', true);

		const { getByRole, getByTestId } = renderComponent({ pinia });
		await userEvent.click(getByRole('button'));

		expect(getByRole('menuitemcheckbox', { name: /Review required/ })).toHaveAttribute(
			'aria-checked',
			'true',
		);
		expect(getByTestId('workflow-review-required-switch')).toHaveAttribute('data-state', 'checked');
		expect(store.isReviewRequired('workflow-2')).toBe(false);
	});

	it('updates the correct workflow with mouse interaction', async () => {
		const pinia = createPinia();
		const store = useReviewRequiredStore(pinia);
		const { getByRole, getByText } = renderComponent({ pinia });
		await userEvent.click(getByRole('button'));

		await userEvent.click(getByText('Review required'));

		expect(store.isReviewRequired('workflow-1')).toBe(true);
		expect(store.isReviewRequired('workflow-2')).toBe(false);
	});

	it('does not toggle when the description is clicked', async () => {
		const pinia = createPinia();
		const store = useReviewRequiredStore(pinia);
		const { getByRole, getByText } = renderComponent({ pinia });
		await userEvent.click(getByRole('button'));

		await userEvent.click(
			getByText('Require changes to be reviewed and approved before publishing.'),
		);

		expect(store.isReviewRequired('workflow-1')).toBe(false);
	});

	it('updates the correct workflow with keyboard interaction', async () => {
		const pinia = createPinia();
		const store = useReviewRequiredStore(pinia);
		const { getByRole } = renderComponent({ pinia });
		await userEvent.click(getByRole('button'));
		const reviewItem = getByRole('menuitemcheckbox', { name: /Review required/ });

		reviewItem.focus();
		await userEvent.keyboard('{Enter}');

		expect(store.isReviewRequired('workflow-1')).toBe(true);
		expect(store.isReviewRequired('workflow-2')).toBe(false);
	});

	describe('with an open review', () => {
		// Seed through fetchStatus — the store exposes its state read-only.
		const seedOpenReview = async (pinia: Pinia) => {
			const openReview = {
				id: 'req-1',
				state: 'open',
				decision: 'pending',
				createdAt: '2026-07-20T10:00:00.000Z',
				updatedAt: '2026-07-20T10:00:00.000Z',
			} as const;
			vi.mocked(fetchWorkflowReviewRequests).mockResolvedValueOnce({
				count: 1,
				data: [openReview],
			});
			await useWorkflowReviewStatusStore(pinia).fetchStatus('workflow-1');
		};

		it('displays ON and disabled even when the local preference is off, with the locked description', async () => {
			const pinia = createPinia();
			await seedOpenReview(pinia);
			const store = useReviewRequiredStore(pinia);
			expect(store.isReviewRequired('workflow-1')).toBe(false);

			const { getByRole, getByTestId, getByText } = renderComponent({ pinia });
			await userEvent.click(getByRole('button'));

			expect(getByRole('menuitemcheckbox', { name: /Review required/ })).toHaveAttribute(
				'aria-checked',
				'true',
			);
			expect(getByRole('menuitemcheckbox', { name: /Review required/ })).toHaveAttribute(
				'aria-disabled',
				'true',
			);
			expect(getByTestId('workflow-review-required-switch')).toHaveAttribute(
				'data-state',
				'checked',
			);
			expect(
				getByText('Review is required while this workflow has an open review.'),
			).toBeInTheDocument();
		});

		it('does not mutate the local preference when selected', async () => {
			const pinia = createPinia();
			await seedOpenReview(pinia);
			const store = useReviewRequiredStore(pinia);
			const { getByRole } = renderComponent({ pinia });
			await userEvent.click(getByRole('button'));

			await userEvent.click(getByRole('menuitemcheckbox', { name: /Review required/ }));
			const reviewItem = getByRole('menuitemcheckbox', { name: /Review required/ });
			reviewItem.focus();
			await userEvent.keyboard('{Enter}');

			expect(store.isReviewRequired('workflow-1')).toBe(false);
			expect(reviewItem).toHaveAttribute('aria-checked', 'true');
		});
	});
});
