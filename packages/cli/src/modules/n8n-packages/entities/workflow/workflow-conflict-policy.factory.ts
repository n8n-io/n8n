import { Service } from '@n8n/di';

import type { WorkflowConflictPolicy } from '../../n8n-packages.types';
import type { WorkflowConflictPolicyHandler } from './workflow-conflict-policy-handler';
import { WorkflowConflictPolicyFailHandler } from './workflow-conflict-policy-fail.handler';
import { WorkflowConflictPolicyNewVersionHandler } from './workflow-conflict-policy-new-version.handler';
import { WorkflowConflictPolicySkipHandler } from './workflow-conflict-policy-skip.handler';

@Service()
export class WorkflowConflictPolicyFactory {
	private readonly handlers: Record<WorkflowConflictPolicy, WorkflowConflictPolicyHandler>;

	constructor(
		newVersion: WorkflowConflictPolicyNewVersionHandler,
		fail: WorkflowConflictPolicyFailHandler,
		skip: WorkflowConflictPolicySkipHandler,
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
