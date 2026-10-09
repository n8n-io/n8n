import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import type { CapabilityContext } from '@/services/capabilities/capability';
import {
	findCapabilityWorkflow,
	type FoundWorkflow,
} from '@/services/capabilities/capability-workflow';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AutomationInstanceInfo } from './automation-instance-info';

/**
 * Reads the workflow here as the acting user, and what the card and the result say about this
 * instance: the default zone of a schedule and the link that opens the workflow. It changes
 * nothing.
 */
@Service()
export class AutomationWorkflowReader {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly instance: AutomationInstanceInfo,
	) {}

	/** @throws WorkflowAccessError when the user cannot update the workflow */
	async find(workflowId: string, context: CapabilityContext): Promise<FoundWorkflow> {
		return await findCapabilityWorkflow(this.workflowFinderService, workflowId, context, [
			'workflow:update',
		]);
	}

	/** Reads only a few columns. The caller has loaded the nodes and sharings already. */
	async hasScope(workflowId: string, user: User, scopes: Scope[]): Promise<boolean> {
		const head = await this.workflowFinderService.findWorkflowHeadForUser(workflowId, user, scopes);
		return head !== null;
	}

	/** True when a version of the workflow is live now, as the stored workflow says. */
	async isLive(workflowId: string, user: User): Promise<boolean> {
		const head = await this.workflowFinderService.findWorkflowHeadForUser(workflowId, user, [
			'workflow:read',
		]);
		return (head?.activeVersionId ?? null) !== null;
	}

	/** The time zone of a schedule when the workflow settings set none. */
	get defaultTimezone(): string {
		return this.instance.defaultTimezone;
	}

	/** Link that opens the workflow in the editor of this instance. */
	url(workflowId: string): string {
		return this.instance.workflowUrl(workflowId);
	}
}
