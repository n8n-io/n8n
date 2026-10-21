import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import RestrictedSubWorkflowCallout from './RestrictedSubWorkflowCallout.vue';
import { useTypeAvailabilityPoliciesStore } from '../type-availability-policies.store';

const SET = 'n8n-nodes-base.set';

const node = {
	type: 'n8n-nodes-base.executeWorkflow',
	parameters: { workflowId: { __rl: true, mode: 'list', value: 'child' } },
};

const renderComponent = createComponentRenderer(RestrictedSubWorkflowCallout, {
	props: { parentWorkflowId: 'parent', node },
});

describe('RestrictedSubWorkflowCallout', () => {
	let store: ReturnType<typeof useTypeAvailabilityPoliciesStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		store = useTypeAvailabilityPoliciesStore();
	});

	it('refreshes the check on open and explains the block', () => {
		vi.mocked(store.getSubWorkflowCheck).mockReturnValue({
			projectName: 'Child project',
			draft: [
				{
					kind: 'node-type-unavailable',
					checkId: 'node-type-availability',
					message: 'blocked',
					subject: SET,
					subjectType: 'nodeType',
					scope: 'project',
				},
			],
			published: null,
		});

		const { getByTestId } = renderComponent({
			props: { labelOf: () => 'Edit Fields' },
		});

		expect(store.fetchSubWorkflowCheck).toHaveBeenCalledWith('parent', 'child', { force: true });
		const callout = getByTestId('restricted-sub-workflow-callout');
		expect(callout).toHaveTextContent(
			"Restricted in the sub-workflow's project, Child project: 'Edit Fields'.",
		);
		// Unpublished, so no production run can avoid the blocked draft either.
		expect(callout).toHaveTextContent('Every call to the sub-workflow fails.');
	});

	it('renders nothing when the sub-workflow is not restricted', () => {
		vi.mocked(store.getSubWorkflowCheck).mockReturnValue({ draft: [], published: null });

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('restricted-sub-workflow-callout')).not.toBeInTheDocument();
	});
});
