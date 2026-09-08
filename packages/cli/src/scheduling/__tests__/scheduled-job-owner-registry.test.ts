import { ScheduledJobOwnerType } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { AgentScheduledJobOwner } from '../agent-scheduled-job-owner';
import { createScheduledJobOwnerRegistry } from '../scheduled-job-owner-registry';
import type { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';

describe('createScheduledJobOwnerRegistry', () => {
	it('declares the workflow and agent owner types, so provisioning their jobs is never refused', () => {
		const workflowOwner = mock<WorkflowScheduledJobOwner>();
		const agentOwner = mock<AgentScheduledJobOwner>();

		const owners = createScheduledJobOwnerRegistry(workflowOwner, agentOwner);

		expect(owners.resolverFor(ScheduledJobOwnerType.Workflow)).toBe(workflowOwner);
		expect(owners.resolverFor(ScheduledJobOwnerType.Agent)).toBe(agentOwner);
	});
});
