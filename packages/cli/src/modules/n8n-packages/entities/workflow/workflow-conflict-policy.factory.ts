import { Service } from '@n8n/di';

import { WorkflowConflictPolicyFailHandler } from './workflow-conflict-policy-fail.handler';
import type { WorkflowConflictPolicyHandler } from './workflow-conflict-policy-handler';
import { WorkflowConflictPolicyNewVersionHandler } from './workflow-conflict-policy-new-version.handler';
import { WorkflowConflictPolicySkipHandler } from './workflow-conflict-policy-skip.handler';
import { WorkflowConflictPolicy } from '../../n8n-packages.types';

@Service()
export class WorkflowConflictPolicyFactory {
	private readonly handlers: Record<WorkflowConflictPolicy, WorkflowConflictPolicyHandler>;

	constructor(
		newVersion: WorkflowConflictPolicyNewVersionHandler,
		fail: WorkflowConflictPolicyFailHandler,
		skip: WorkflowConflictPolicySkipHandler,
	) {
		this.handlers = {
			[WorkflowConflictPolicy.NewVersion]: newVersion,
			[WorkflowConflictPolicy.Fail]: fail,
			[WorkflowConflictPolicy.Skip]: skip,
		};
	}

	getHandler(policy: WorkflowConflictPolicy): WorkflowConflictPolicyHandler {
		return this.handlers[policy];
	}
}
