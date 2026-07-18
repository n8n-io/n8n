import { createPinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { defineComponent } from 'vue';
import { N8nDropdownMenu } from '@n8n/design-system';

import { createComponentRenderer } from '@/__tests__/render';
import { LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW } from '@/app/constants/localStorage';
import { useReviewRequiredStore } from '@/features/workflow-reviews/reviewRequired.store';
import WorkflowReviewRequiredToggle from './WorkflowReviewRequiredToggle.vue';

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
		localStorage.removeItem(LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW);
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
});
