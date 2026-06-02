import { Service } from '@n8n/di';

import { FailWorkflowConflictPolicyHandler } from './fail-workflow-conflict-policy.handler';
import { NewVersionWorkflowConflictPolicyHandler } from './new-version-workflow-conflict-policy.handler';
import { SkipWorkflowConflictPolicyHandler } from './skip-workflow-conflict-policy.handler';
import type { WorkflowConflictPolicyHandler } from './workflow-conflict-policy-handler';
import type { WorkflowConflictPolicy } from '../../n8n-packages.types';

@Service()
export class WorkflowConflictPolicyFactory {
	private readonly handlers: Record<WorkflowConflictPolicy, WorkflowConflictPolicyHandler>;

	constructor(
		newVersion: NewVersionWorkflowConflictPolicyHandler,
		fail: FailWorkflowConflictPolicyHandler,
		skip: SkipWorkflowConflictPolicyHandler,
	) {
		/* eslint-disable @typescript-eslint/naming-convention -- API workflow conflict policy keys */
		this.handlers = {
			'new-version': newVersion,
			fail,
			skip,
		};
		/* eslint-enable @typescript-eslint/naming-convention */
	}

	getHandler(policy: WorkflowConflictPolicy): WorkflowConflictPolicyHandler {
		return this.handlers[policy];
	}
}
