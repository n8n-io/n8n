import { ScheduledJobOwnerType } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import { createScheduledJobOwnerRegistry } from '../scheduled-job-owner-registry';
import type { SystemTaskScheduledJobOwner } from '../system-tasks/system-task-scheduled-job-owner';
import type { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';

describe('createScheduledJobOwnerRegistry', () => {
	const workflowOwner = mock<WorkflowScheduledJobOwner>();
	const systemTaskOwner = mock<SystemTaskScheduledJobOwner>();

	it('declares the workflow owner type, so provisioning workflow jobs is never refused', () => {
		const owners = createScheduledJobOwnerRegistry(workflowOwner, systemTaskOwner);

		expect(owners.resolverFor(ScheduledJobOwnerType.Workflow)).toBe(workflowOwner);
	});

	it('declares the system-task owner type, so provisioning system task jobs is never refused', () => {
		const owners = createScheduledJobOwnerRegistry(workflowOwner, systemTaskOwner);

		expect(owners.resolverFor(ScheduledJobOwnerType.SystemTask)).toBe(systemTaskOwner);
	});
});
