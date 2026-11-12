import {
	resolveBuilderToolName,
	TOOL_CATALOG_CALL_TOOL_NAME,
	WORKFLOW_BUILDER_TOOL_NAMES,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { OperationalError } from '@n8n/errors';
import {
	deriveWorkflowVerificationObligation,
	WorkflowLoopStorage,
	type WorkflowLoopWorkItemRecord,
	type WorkflowSetupRoutingClaim,
	type WorkflowVerificationObligation,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { nanoid } from 'nanoid';

import type { SystemAgentHostInstruction } from '@/modules/agents/system-agents/system-agent.types';

import type { AssistantTurnMemory } from '../turn-setup/assistant-turn-runtime';

export const WORKFLOW_SETUP_INSTRUCTION_REASON = 'workflow_setup';

const SETUP_ROUTING_CLAIM_TTL_MS = 15 * 60 * 1000;

const CONCLUDED_VERIFICATION_STATUSES = new Set<WorkflowVerificationObligation['status']>([
	'verified',
	'needs_setup',
	'not_verifiable',
]);

/**
 * The workflow of a setup card that suspended the turn, or `undefined` for
 * any other suspension. Only setup suspends with `setupRequests`. A deferred
 * `setup_workflow` suspends under the tool catalog's `call_tool` name.
 */
export function workflowIdOfSetupSuspension(
	toolName: string | undefined,
	suspendPayload: unknown,
): string | undefined {
	if (!toolName || typeof suspendPayload !== 'object' || suspendPayload === null) return undefined;
	const isSetupTool =
		toolName === TOOL_CATALOG_CALL_TOOL_NAME ||
		resolveBuilderToolName(toolName, 'setup') === WORKFLOW_BUILDER_TOOL_NAMES.SETUP_WORKFLOW;
	if (!isSetupTool) return undefined;
	if (!('setupRequests' in suspendPayload) || !Array.isArray(suspendPayload.setupRequests)) {
		return undefined;
	}
	const workflowId = 'workflowId' in suspendPayload ? suspendPayload.workflowId : undefined;
	return typeof workflowId === 'string' ? workflowId : undefined;
}

function buildSetupInstruction(obligation: WorkflowVerificationObligation): string {
	const payload = {
		workflowId: obligation.workflowId,
		workItemId: obligation.workItemId,
		setupRequirement: obligation.setupRequirement,
		verificationReadiness: obligation.readiness,
	};
	return [
		'<workflow-setup-required>',
		JSON.stringify(payload, null, 2),
		'</workflow-setup-required>',
		'',
		'The verification of this built workflow is done, and the saved workflow still needs credentials or values from the user.',
		'Your first action is `setup_workflow` with this `workflowId`. Do not write a message first, do not ask a question and do not verify again.',
	].join('\n');
}

/**
 * Routes a direct build of one Assistant thread to workflow setup when the
 * agent ends the turn without it. Each work item gets at most one route: the
 * `setupRoutedAt` marker is stored before the instruction is sent, so the
 * trigger is false afterwards, whatever the agent does.
 */
export class AssistantWorkflowSetupRoute {
	private readonly storage: WorkflowLoopStorage;

	private readonly suspendedSetupWorkflowIds = new Set<string>();

	constructor(
		memory: AssistantTurnMemory,
		private readonly threadId: string,
		private readonly logger: Logger,
		private readonly options: { setupPanelEnabled: boolean },
	) {
		this.storage = new WorkflowLoopStorage(memory);
	}

	/** Remembers a setup card that suspended this turn. */
	observeSuspension(toolName: string, suspendPayload: unknown): void {
		const workflowId = workflowIdOfSetupSuspension(toolName, suspendPayload);
		if (workflowId) this.suspendedSetupWorkflowIds.add(workflowId);
	}

	/**
	 * Marks the builds of the workflows whose setup card suspended this turn as
	 * routed. Without it, the turn that resumes the card would route setup
	 * again after the user finished it.
	 */
	async markSuspendedSetupsRouted(): Promise<void> {
		if (this.suspendedSetupWorkflowIds.size === 0) return;
		const workflowIds = new Set(this.suspendedSetupWorkflowIds);
		this.suspendedSetupWorkflowIds.clear();
		try {
			await this.markRouted(workflowIds);
		} catch (error) {
			this.logger.warn('Failed to mark the setup of suspended Assistant builds as routed', {
				threadId: this.threadId,
				error: getErrorMessage(error),
			});
		}
	}

	/**
	 * Marks the builds of a workflow as routed after the setup tool announced
	 * its checklist in the setup panel, which does not suspend the turn. Throws
	 * when a marker is not stored, so that the tool can retry.
	 */
	async markWorkflowSetupHandled(workflowId: string): Promise<void> {
		await this.markRouted(new Set([workflowId]));
	}

	/**
	 * The setup instruction for the first concluded build that still needs
	 * setup and has no route, or `undefined`. The work item is marked as
	 * routed first. When the marker is not stored, no instruction is sent.
	 */
	async nextInstruction(): Promise<SystemAgentHostInstruction | undefined> {
		const records = await this.storage.listWorkItems(this.threadId);
		for (const record of records) {
			if (record.state.setupRoutedAt) continue;
			const obligation = this.obligationOf(record);
			if (!CONCLUDED_VERIFICATION_STATUSES.has(obligation.status)) continue;
			if (obligation.setupRequirement?.status !== 'required' || !obligation.workflowId) continue;
			if ((await this.claimAndMark(record)) !== 'marked') continue;
			return {
				reason: WORKFLOW_SETUP_INSTRUCTION_REASON,
				content: buildSetupInstruction(obligation),
			};
		}
		return undefined;
	}

	private async markRouted(workflowIds: Set<string>): Promise<void> {
		const records = await this.storage.listWorkItems(this.threadId);
		let failed = false;
		for (const record of records) {
			if (record.state.setupRoutedAt) continue;
			const obligation = this.obligationOf(record);
			if (!obligation.workflowId || !workflowIds.has(obligation.workflowId)) continue;
			if (obligation.setupRequirement?.status !== 'required') continue;
			if ((await this.claimAndMark(record)) === 'failed') failed = true;
		}
		if (failed) throw new OperationalError('The workflow setup route was not stored');
	}

	private obligationOf(record: WorkflowLoopWorkItemRecord): WorkflowVerificationObligation {
		return deriveWorkflowVerificationObligation(this.threadId, record, {
			setupPanelEnabled: this.options.setupPanelEnabled,
		});
	}

	/**
	 * Stores the `setupRoutedAt` marker. `taken` means that another call holds
	 * the claim or routed the build already.
	 */
	private async claimAndMark(
		record: WorkflowLoopWorkItemRecord,
	): Promise<'marked' | 'taken' | 'failed'> {
		const { workItemId } = record.state;
		const claim = this.createClaim();
		try {
			if (!(await this.storage.claimSetupRouting(this.threadId, workItemId, claim))) return 'taken';
			const marked = await this.storage.markSetupRouted(
				this.threadId,
				workItemId,
				claim.claimId,
				new Date().toISOString(),
			);
			if (marked) return 'marked';
			await this.storage.releaseSetupRoutingClaim(this.threadId, workItemId, claim.claimId);
			return 'failed';
		} catch (error) {
			this.logger.warn('Failed to store the workflow setup route of an Assistant build', {
				threadId: this.threadId,
				workItemId,
				error: getErrorMessage(error),
			});
			return 'failed';
		}
	}

	private createClaim(): WorkflowSetupRoutingClaim {
		const claimedAt = new Date();
		return {
			claimId: `setup:${nanoid()}`,
			claimedAt: claimedAt.toISOString(),
			expiresAt: new Date(claimedAt.getTime() + SETUP_ROUTING_CLAIM_TTL_MS).toISOString(),
		};
	}
}
