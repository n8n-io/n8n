import { ScheduledJobOwnerType } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { AgentScheduledJobOwner } from '../agent-scheduled-job-owner';
import { createScheduledJobOwnerRegistry } from '../scheduled-job-owner-registry';
import type { SystemTaskScheduledJobOwner } from '../system-tasks/system-task-scheduled-job-owner';
import type { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';

describe('createScheduledJobOwnerRegistry', () => {
	const workflowOwner = mock<WorkflowScheduledJobOwner>();
	const agentOwner = mock<AgentScheduledJobOwner>();
	const systemTaskOwner = mock<SystemTaskScheduledJobOwner>();

	it('declares the workflow and agent owner types, so provisioning their jobs is never refused', () => {
		const owners = createScheduledJobOwnerRegistry(workflowOwner, agentOwner, systemTaskOwner);

		expect(owners.resolverFor(ScheduledJobOwnerType.Workflow)).toBe(workflowOwner);
		expect(owners.resolverFor(ScheduledJobOwnerType.Agent)).toBe(agentOwner);
	});

	it('declares the system-task owner type, so provisioning system task jobs is never refused', () => {
		const owners = createScheduledJobOwnerRegistry(workflowOwner, agentOwner, systemTaskOwner);

		expect(owners.resolverFor(ScheduledJobOwnerType.SystemTask)).toBe(systemTaskOwner);
	});
});
