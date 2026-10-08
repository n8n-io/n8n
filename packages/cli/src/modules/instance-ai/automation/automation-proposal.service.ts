import type {
	AutomationProposalCard,
	AutomationProposalResult,
	InstanceAiPermissions,
} from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type * as InstanceAi from '@n8n/instance-ai';
import { lazyImport } from '@n8n/utils/lazy-import';
import { UserError } from 'n8n-workflow';

import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import type { CapabilityContext, CapabilitySurface } from '@/services/capabilities/capability';
import { resolvePermissionMode } from '@/services/capabilities/capability-confirmation';
import {
	findCapabilityWorkflow,
	type FoundWorkflow,
} from '@/services/capabilities/capability-workflow';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	buildAutomationCard,
	isSavedVersionLive,
	LOCAL_CARD_TARGET,
	type ProposalRecommendation,
	type ProposalRequest,
	recommendationNodeTypes,
} from './automation-card';
import { AutomationBlockedError, isExpectedFailure } from './automation-errors';
import { chooseCron, type CronChoice, triggerCronOf } from './automation-schedule';
import { type AutomationTrigger, classifyAutomationTrigger } from './automation-trigger';
import { AutomationWorkflowKeeper } from './automation-workflow-keeper';
import { AutomationWorkflowPublisher } from './automation-workflow-publisher';

/** What the handler of `propose_automation` acts on. */
export type AutomationRequest = ProposalRequest & {
	workflowId: string;
	activate?: boolean;
	/** The saved version that the user agreed to turn on. */
	versionId?: string;
};

export type AutomationProposal = {
	card: AutomationProposalCard;
	/** Display name of the workflow, for the card title. */
	workflowName: string;
};

const ACTION_SOURCE: Record<CapabilitySurface, WorkflowActionSource> = {
	assistant: 'n8n-ai',
	mcp: 'n8n-mcp',
};

/** Recommends where the workflow runs. B05 knows only this instance. */
async function recommendLocal(nodeTypes: string[]): Promise<ProposalRecommendation> {
	// Loaded at the first call, so that MCP requests do not load the Assistant package at boot.
	// The first call still loads the whole package. BACKLOG Q10: import a subpath of it.
	const { recommendRunTarget } = await lazyImport<typeof InstanceAi>(
		async () => await import('@n8n/instance-ai'),
	);
	return recommendRunTarget({
		nodeTypes,
		targets: [{ ...LOCAL_CARD_TARGET, label: 'This computer' }],
	});
}

/** Admin permission modes apply to the n8n Assistant only. MCP clients own consent. */
function isBlockedByAdmin(context: CapabilityContext, key: keyof InstanceAiPermissions): boolean {
	return (
		context.surface === 'assistant' && resolvePermissionMode(key, context.permissions) === 'blocked'
	);
}

function cronFor(workflow: FoundWorkflow, trigger: AutomationTrigger, cron?: string): CronChoice {
	return chooseCron(trigger, cron, triggerCronOf(workflow.nodes, trigger));
}

/** Refuses to turn on a version that the user did not agree to. */
function assertAgreedVersion(workflow: FoundWorkflow, versionId: string | undefined): void {
	if (versionId === undefined || versionId === workflow.versionId) return;
	throw new UserError(
		`"${workflow.name}" changed after the automation was proposed, so it was not turned on. Nothing was changed. Propose it again to turn on the current version.`,
	);
}

/**
 * Proposes to keep a workflow that the n8n Assistant built and to turn it on, and carries out
 * the answer. Every step runs as the acting user and checks access again.
 */
@Service()
export class AutomationProposalService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly keeper: AutomationWorkflowKeeper,
		private readonly publisher: AutomationWorkflowPublisher,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Builds the card data. The card offers "Turn it on" only when the trigger, the scopes of the
	 * user and the admin permission modes allow it.
	 *
	 * @throws WorkflowAccessError when the user cannot update the workflow
	 * @throws UserError when the workflow is archived and cannot be restored
	 */
	async propose(
		request: ProposalRequest & { workflowId: string },
		context: CapabilityContext,
	): Promise<AutomationProposal> {
		const workflow = await this.findWorkflow(request.workflowId, context);
		await this.assertCanRestore(workflow, context);
		const trigger = classifyAutomationTrigger(workflow.nodes);
		const canActivate =
			trigger.canActivate &&
			!isBlockedByAdmin(context, 'publishWorkflow') &&
			(await this.hasScope(workflow.id, context.user, 'workflow:publish'));
		const recommendation = await recommendLocal(recommendationNodeTypes(workflow.nodes));
		const card = buildAutomationCard({
			workflow,
			request,
			trigger,
			cron: cronFor(workflow, trigger, request.cron).cron,
			recommendation,
			canActivate,
		});
		return { card, workflowName: workflow.name };
	}

	/**
	 * Keeps the workflow and turns it on when `activate` is true. Checks every condition before
	 * the first change, so that a refused request changes nothing. When the workflow is kept but
	 * cannot be turned on, the result says so in `error`.
	 *
	 * @throws AutomationBlockedError when an admin blocked the action for the n8n Assistant
	 * @throws UserError when the user cannot reach, restore or turn on the workflow
	 * @throws LockedError when someone edits the workflow in the editor and it must be turned on
	 */
	async apply(
		request: AutomationRequest,
		context: CapabilityContext,
	): Promise<AutomationProposalResult> {
		const wantsOn = request.activate === true;
		if (wantsOn && isBlockedByAdmin(context, 'publishWorkflow')) {
			throw new AutomationBlockedError(
				'An admin has blocked turning on workflows for the n8n Assistant. Nothing was changed.',
			);
		}
		const workflow = await this.findWorkflow(request.workflowId, context);
		await this.assertCanRestore(workflow, context);
		const trigger = classifyAutomationTrigger(workflow.nodes);
		const { warning } = cronFor(workflow, trigger, request.cron);
		if (wantsOn) assertAgreedVersion(workflow, request.versionId);
		const turnOn = wantsOn && !isSavedVersionLive(workflow);
		if (turnOn) await this.assertCanTurnOn(workflow, trigger, context.user);

		const keptVersionId = await this.keeper.keep(context.user, workflow);

		const result: AutomationProposalResult = {
			workflowId: workflow.id,
			url: `${this.urlService.getInstanceBaseUrl()}/workflow/${encodeURIComponent(workflow.id)}`,
			active: workflow.activeVersionId !== null,
			kept: true,
			...(warning ? { warnings: [warning] } : {}),
		};
		if (!turnOn) return result;
		return await this.turnOn(result, workflow.name, keptVersionId, context);
	}

	/** Publishes the kept version. An expected failure keeps the workflow and reports why. */
	private async turnOn(
		result: AutomationProposalResult,
		workflowName: string,
		versionId: string,
		context: CapabilityContext,
	): Promise<AutomationProposalResult> {
		try {
			const active = await this.publisher.activate(context.user, result.workflowId, {
				source: ACTION_SOURCE[context.surface],
				versionId,
			});
			return { ...result, active };
		} catch (error) {
			if (!isExpectedFailure(error)) throw error;
			return {
				...result,
				// A publish that fails late also stops the version that was live before.
				active: await this.isLive(result.workflowId, context.user),
				error: `Saved "${workflowName}", but could not turn it on: ${error.message}`,
			};
		}
	}

	/** True when a version of the workflow is live now, as the stored workflow says. */
	private async isLive(workflowId: string, user: User): Promise<boolean> {
		const head = await this.workflowFinderService.findWorkflowHeadForUser(workflowId, user, [
			'workflow:read',
		]);
		return (head?.activeVersionId ?? null) !== null;
	}

	private async findWorkflow(workflowId: string, context: CapabilityContext) {
		return await findCapabilityWorkflow(this.workflowFinderService, workflowId, context, [
			'workflow:update',
		]);
	}

	/** Reads only a few columns. The caller has loaded the nodes and sharings already. */
	private async hasScope(
		workflowId: string,
		user: User,
		scope: 'workflow:publish' | 'workflow:delete',
	): Promise<boolean> {
		const head = await this.workflowFinderService.findWorkflowHeadForUser(workflowId, user, [
			scope,
		]);
		return head !== null;
	}

	/** Keeping an archived workflow restores it, which the Assistant gates like a delete. */
	private async assertCanRestore(workflow: FoundWorkflow, context: CapabilityContext) {
		if (!workflow.isArchived) return;
		if (isBlockedByAdmin(context, 'deleteWorkflow')) {
			throw new AutomationBlockedError(
				`"${workflow.name}" is archived, and an admin has blocked restoring workflows for the n8n Assistant. Nothing was changed.`,
			);
		}
		if (!(await this.hasScope(workflow.id, context.user, 'workflow:delete'))) {
			throw new UserError(
				`"${workflow.name}" is archived, and you do not have permission to restore it. Ask the owner of the workflow to restore it. Nothing was changed.`,
			);
		}
	}

	private async assertCanTurnOn(
		workflow: FoundWorkflow,
		trigger: AutomationTrigger,
		user: User,
	): Promise<void> {
		if (!trigger.canActivate) {
			throw new UserError(
				`"${workflow.name}" has no trigger that starts it on its own, so it cannot be turned on. Nothing was changed.`,
			);
		}
		if (!(await this.hasScope(workflow.id, user, 'workflow:publish'))) {
			throw new UserError(
				`You do not have permission to turn on "${workflow.name}". Ask the owner of the workflow to turn it on. Nothing was changed.`,
			);
		}
		// A lock that a user holds in the editor would stop the publish after the keep.
		await this.publisher.assertEditable(workflow.id);
	}
}
