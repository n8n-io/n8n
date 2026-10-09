import type {
	AutomationProposalCard,
	AutomationProposalResult,
	AutomationRunTarget,
	InstanceAiPermissions,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type * as InstanceAi from '@n8n/instance-ai';
import { lazyImport } from '@n8n/utils/lazy-import';
import { UserError } from 'n8n-workflow';

import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import type { CapabilityContext, CapabilitySurface } from '@/services/capabilities/capability';
import { resolvePermissionMode } from '@/services/capabilities/capability-confirmation';
import type { FoundWorkflow } from '@/services/capabilities/capability-workflow';

import {
	buildAutomationCard,
	isSavedVersionLive,
	type ProposalRecommendation,
	type ProposalRequest,
	recommendationNodeTypes,
} from './automation-card';
import { AutomationBlockedError, isExpectedFailure } from './automation-errors';
import {
	type CardPlaces,
	cardPlaces,
	isLinkedTarget,
	LOCAL_PLACES,
	recommendationTargets,
} from './automation-places';
import { AutomationPlacement } from './automation-placement';
import { chooseCron, readTriggerSchedule } from './automation-schedule';
import { type AutomationTrigger, classifyAutomationTrigger } from './automation-trigger';
import { AutomationWorkflowKeeper } from './automation-workflow-keeper';
import { AutomationWorkflowPublisher } from './automation-workflow-publisher';
import { AutomationWorkflowReader } from './automation-workflow-reader';

/** What the handler of `propose_automation` acts on. */
export type AutomationRequest = ProposalRequest & {
	workflowId: string;
	activate?: boolean;
	/** The saved version that the user agreed to turn on. */
	versionId?: string;
	/** `local` (the default) or the id of a link of the user. */
	target?: string;
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

/** Recommends where the workflow runs: this instance or an online link of the card. */
async function recommendPlace(
	nodeTypes: string[],
	targets: readonly AutomationRunTarget[],
): Promise<ProposalRecommendation> {
	// Loaded at the first call, so that MCP requests do not load the Assistant package at boot.
	// The first call still loads the whole package.
	const { recommendRunTarget } = await lazyImport<typeof InstanceAi>(
		async () => await import('@n8n/instance-ai'),
	);
	return recommendRunTarget({ nodeTypes, targets: recommendationTargets(targets) });
}

/** Admin permission modes apply to the n8n Assistant only. MCP clients own consent. */
function isBlockedByAdmin(context: CapabilityContext, key: keyof InstanceAiPermissions): boolean {
	return (
		context.surface === 'assistant' && resolvePermissionMode(key, context.permissions) === 'blocked'
	);
}

/**
 * Refuses to act on a version that the user did not see on the card. Archiving saves a new
 * version too, so this also tells if the card showed an archived workflow.
 */
function assertCardVersion(
	workflow: FoundWorkflow,
	versionId: string | undefined,
	refusal: (name: string) => string,
): void {
	if (versionId === undefined || versionId === workflow.versionId) return;
	throw new UserError(refusal(workflow.name));
}

const CHANGED_SO_NOT_ON = (name: string) =>
	`"${name}" changed after the automation was proposed, so it was not turned on. Nothing was changed. Propose it again to turn on the current version.`;
const CHANGED_SO_NOT_RESTORED = (name: string) =>
	`"${name}" was archived or changed after the automation was proposed, so it was not restored. Nothing was changed. Propose it again to keep it.`;
const CHANGED_SO_NOT_COPIED = (name: string) =>
	`"${name}" changed after the automation was proposed, so it was not copied. Nothing was changed. Propose it again to copy the current version.`;

const ADMIN_BLOCKED_PUBLISH =
	'An admin has blocked turning on workflows for the n8n Assistant. Nothing was changed.';

/**
 * Proposes to keep a workflow that the n8n Assistant built and to turn it on, and carries out
 * the answer. Every step runs as the acting user and checks access again.
 */
@Service()
export class AutomationProposalService {
	constructor(
		private readonly reader: AutomationWorkflowReader,
		private readonly keeper: AutomationWorkflowKeeper,
		private readonly publisher: AutomationWorkflowPublisher,
		private readonly placement: AutomationPlacement,
	) {}

	/**
	 * Builds the card data. The card offers "Turn it on" only when the trigger, the scopes of the
	 * user and the admin permission modes allow it. It lists the user's links, and offers the ones
	 * that were online at their last check.
	 *
	 * @throws WorkflowAccessError when the user cannot update the workflow
	 * @throws UserError when the workflow is archived and cannot be restored
	 */
	async propose(
		request: ProposalRequest & { workflowId: string },
		context: CapabilityContext,
	): Promise<AutomationProposal> {
		const workflow = await this.reader.find(request.workflowId, context);
		await this.assertCanRestore(workflow, context);
		const trigger = classifyAutomationTrigger(workflow.nodes);
		const canActivate =
			trigger.canActivate &&
			!isBlockedByAdmin(context, 'publishWorkflow') &&
			(await this.reader.hasScope(workflow.id, context.user, ['workflow:publish']));
		const places = await this.placesFor(workflow, context, canActivate);
		const card = buildAutomationCard({
			workflow,
			request,
			trigger,
			schedule: chooseCron(
				request.cron,
				readTriggerSchedule(workflow, trigger, this.reader.defaultTimezone),
			).shown,
			recommendation: await recommendPlace(recommendationNodeTypes(workflow.nodes), places.targets),
			places,
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
			throw new AutomationBlockedError(ADMIN_BLOCKED_PUBLISH);
		}
		if (isLinkedTarget(request.target)) {
			return await this.applyOnLink(request, request.target, context);
		}
		const workflow = await this.reader.find(request.workflowId, context);
		if (workflow.isArchived) {
			assertCardVersion(workflow, request.versionId, CHANGED_SO_NOT_RESTORED);
		}
		await this.assertCanRestore(workflow, context);
		const trigger = classifyAutomationTrigger(workflow.nodes);
		const { warning } = chooseCron(
			request.cron,
			readTriggerSchedule(workflow, trigger, this.reader.defaultTimezone),
		);
		if (wantsOn) assertCardVersion(workflow, request.versionId, CHANGED_SO_NOT_ON);
		const turnOn = wantsOn && !isSavedVersionLive(workflow);
		if (turnOn) {
			await this.assertCanPublish(workflow, trigger, context.user);
			// A lock that a user holds in the editor would stop the publish after the keep.
			await this.publisher.assertEditable(workflow.id);
		}

		const keptVersionId = await this.keeper.keep(context.user, workflow);

		const result: AutomationProposalResult = {
			workflowId: workflow.id,
			url: this.reader.url(workflow.id),
			active: workflow.activeVersionId !== null,
			kept: true,
			...(warning ? { warnings: [warning] } : {}),
		};
		if (!turnOn) return result;
		return await this.turnOn(result, workflow.name, keptVersionId, context);
	}

	/**
	 * Copies the workflow to the user's link, turns the copy on there when asked, then keeps the
	 * workflow here. The copy comes first, so that a refused or failed copy keeps nothing. "Turn it
	 * on" of a live workflow turns it off here once the new version runs there. "Save" keeps it on
	 * here, and the result says when the copy there runs too.
	 */
	private async applyOnLink(
		request: AutomationRequest,
		linkId: string,
		context: CapabilityContext,
	): Promise<AutomationProposalResult> {
		const wantsOn = request.activate === true;
		const link = await this.placement.findLink(context, linkId);
		const workflow = await this.reader.find(request.workflowId, context);
		if (workflow.isArchived) {
			throw new UserError(
				`"${workflow.name}" is archived. Keep it on this computer first, then move it. Nothing was changed.`,
			);
		}
		// The workflow leaves this instance, so it must be the version that the card showed.
		assertCardVersion(workflow, request.versionId, CHANGED_SO_NOT_COPIED);
		const trigger = classifyAutomationTrigger(workflow.nodes);
		const liveHere = workflow.activeVersionId !== null;
		if (wantsOn) await this.assertCanPublish(workflow, trigger, context.user);
		else if (liveHere) await this.assertCanSaveLiveCopy(workflow, context, link.name);
		await this.keeper.assertCanKeep(workflow);
		const { warning } = chooseCron(
			request.cron,
			readTriggerSchedule(workflow, trigger, this.reader.defaultTimezone),
		);

		const copy = {
			link,
			workflowId: workflow.id,
			workflowName: workflow.name,
			publish: wantsOn,
			liveHere,
			source: ACTION_SOURCE[context.surface],
			warnings: warning ? [warning] : [],
		};
		return await this.placement.copyToLink(
			context.user,
			copy,
			async () => await this.keeper.keep(context.user, workflow),
		);
	}

	/**
	 * The places of the card. Only a workflow that the user can move lists the links. The import
	 * there keeps a live copy live, so a save of a live workflow can put the new version live
	 * there: only a user who can turn the workflow on, and off here, gets the links for a live
	 * workflow.
	 */
	private async placesFor(
		workflow: FoundWorkflow,
		context: CapabilityContext,
		canActivate: boolean,
	): Promise<Readonly<CardPlaces>> {
		// A move refuses an archived workflow, and keeping it here restores it first.
		if (workflow.isArchived) return LOCAL_PLACES;
		const liveHere = workflow.activeVersionId !== null;
		if (liveHere && !canActivate) return LOCAL_PLACES;
		const links = await this.placement.linksFor(context);
		if (links.length === 0) return LOCAL_PLACES;
		const canMove = await this.placement.canMove(context.user, workflow.id, { liveHere });
		return canMove ? cardPlaces(links) : LOCAL_PLACES;
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
				active: await this.reader.isLive(result.workflowId, context.user),
				error: `Saved "${workflowName}", but could not turn it on: ${error.message}`,
			};
		}
	}

	/** Keeping an archived workflow restores it, which the Assistant gates like a delete. */
	private async assertCanRestore(workflow: FoundWorkflow, context: CapabilityContext) {
		if (!workflow.isArchived) return;
		if (isBlockedByAdmin(context, 'deleteWorkflow')) {
			throw new AutomationBlockedError(
				`"${workflow.name}" is archived, and an admin has blocked restoring workflows for the n8n Assistant. Nothing was changed.`,
			);
		}
		if (!(await this.reader.hasScope(workflow.id, context.user, ['workflow:delete']))) {
			throw new UserError(
				`"${workflow.name}" is archived, and you do not have permission to restore it. Ask the owner of the workflow to restore it. Nothing was changed.`,
			);
		}
	}

	/** The rules of the card for "Turn it on", here and on a linked instance. */
	private async assertCanPublish(
		workflow: FoundWorkflow,
		trigger: AutomationTrigger,
		user: User,
	): Promise<void> {
		if (!trigger.canActivate) {
			throw new UserError(
				`"${workflow.name}" has no trigger that starts it on its own, so it cannot be turned on. Nothing was changed.`,
			);
		}
		if (!(await this.reader.hasScope(workflow.id, user, ['workflow:publish']))) {
			throw new UserError(
				`You do not have permission to turn on "${workflow.name}". Ask the owner of the workflow to turn it on. Nothing was changed.`,
			);
		}
	}

	/**
	 * A copy of a live workflow can go live there by itself: the import keeps a live copy live.
	 * So a save of a live workflow needs the same publish rights as "Turn it on".
	 */
	private async assertCanSaveLiveCopy(
		workflow: FoundWorkflow,
		context: CapabilityContext,
		linkName: string,
	) {
		const why = `"${workflow.name}" is on here, and its copy in ${linkName} can go live when it is saved`;
		if (isBlockedByAdmin(context, 'publishWorkflow')) {
			throw new AutomationBlockedError(
				`${why}. An admin has blocked turning on workflows for the n8n Assistant. Nothing was changed.`,
			);
		}
		if (!(await this.reader.hasScope(workflow.id, context.user, ['workflow:publish']))) {
			throw new UserError(
				`${why}, and you do not have permission to turn it on. Keep it on this computer instead. Nothing was changed.`,
			);
		}
	}
}
