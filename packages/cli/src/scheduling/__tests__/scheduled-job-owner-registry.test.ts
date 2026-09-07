import { ScheduledJobOwnerType } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { createScheduledJobOwnerRegistry } from '../scheduled-job-owner-registry';
import type { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';

describe('createScheduledJobOwnerRegistry', () => {
	it('declares the workflow owner type, so provisioning workflow jobs is never refused', () => {
		const workflowOwner = mock<WorkflowScheduledJobOwner>();

		const owners = createScheduledJobOwnerRegistry(workflowOwner);

		expect(owners.resolverFor(ScheduledJobOwnerType.Workflow)).toBe(workflowOwner);
	});
});
