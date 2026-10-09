import type {
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';

import WorkflowReviewChangesList from './WorkflowReviewChangesList.vue';

vi.mock('./WorkflowReviewChangesSection.vue', () => ({
	default: {
		name: 'WorkflowReviewChangesSection',
		props: ['workflow', 'state', 'decision'],
		template:
			'<div data-test-id="workflow-review-changes-section" :data-workflow-id="workflow.workflowId" />',
	},
}));

const renderComponent = createComponentRenderer(WorkflowReviewChangesList);

function makeSnapshot(
	overrides: Partial<WorkflowReviewVersionSnapshot> = {},
): WorkflowReviewVersionSnapshot {
	return {
		versionId: 'version-1',
		name: null,
		nodes: [],
		connections: {},
		nodeGroups: [],
		createdAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	};
}

function makeWorkflowDetail(
	overrides: Partial<WorkflowReviewRequestWorkflowDetail> = {},
): WorkflowReviewRequestWorkflowDetail {
	return {
		workflowId: 'wf-1',
		workflowName: 'My workflow',
		workflowVersionId: 'version-1',
		pinnedVersion: makeSnapshot(),
		publishedVersionId: null,
		baselineVersion: null,
		...overrides,
	};
}

describe('WorkflowReviewChangesList', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('opens one workflow at a time and closes it on a second click', async () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent({
			props: {
				workflows: [
					makeWorkflowDetail(),
					makeWorkflowDetail({ workflowId: 'wf-2', workflowName: 'Other workflow' }),
				],
				state: 'open',
				decision: 'pending',
			},
		});
		const [firstTrigger, secondTrigger] = getAllByTestId('workflow-review-changes-item-trigger');

		await userEvent.click(firstTrigger);
		await userEvent.click(secondTrigger);

		const sections = getAllByTestId('workflow-review-changes-section');
		expect(sections).toHaveLength(1);
		expect(sections[0]).toHaveAttribute('data-workflow-id', 'wf-2');

		await userEvent.click(secondTrigger);

		expect(queryAllByTestId('workflow-review-changes-section')).toHaveLength(0);
	});

	it('shows the version next to the workflow name, and only the name when the version is missing', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				workflows: [
					makeWorkflowDetail({ pinnedVersion: makeSnapshot({ name: 'Fix retries' }) }),
					makeWorkflowDetail({ workflowId: 'wf-2', workflowName: 'Pruned', pinnedVersion: null }),
				],
				state: 'open',
				decision: 'pending',
			},
		});
		const [withVersion, withoutVersion] = getAllByTestId('workflow-review-changes-item-trigger');

		expect(withVersion).toHaveTextContent('My workflow');
		expect(withVersion).toHaveTextContent('Fix retries');
		expect(withoutVersion).toHaveTextContent(/^Pruned$/);
	});
});
