import { Logger } from '@n8n/backend-common';
import { INSTANCE_ACTIVITY_CONTEXT_FLAG } from '@n8n/api-types';
import { ActivityLogConfig, GlobalConfig } from '@n8n/config';
import {
	activityDataMaxLength,
	ActivityEventRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	UserRepository,
} from '@n8n/db';
import type { ActivityEventInput } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject, INode, IWorkflowBase } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap, WorkflowActionSource } from '@/events/maps/relay.event-map';
import { EventRelay } from '@/events/relays/event-relay';
import { PostHogClient } from '@/posthog';

/** Carried by nearly every core node type. Dropping it buys room inside the `data` budget. */
const CORE_NODE_TYPE_PREFIX = 'n8n-nodes-base.';

/** Enough distinct types to show what a user reached for, few enough to leave room for the rest. */
const maxListedNodeTypes = 5;

/**
 * Actors whose signup date is held. A signup date cannot change, so an entry is never stale and
 * age is the wrong thing to bound this by — what needs bounding is the count, on a long-lived
 * process that sees many actors.
 */
const maxHeldSignupDates = 1_000;

/** Ceiling for any single free-text value inside `data`, so one field cannot exhaust the budget. */
const maxDetailStringLength = 64;

/**
 * The acting user's id on any of the recorded events.
 *
 * Takes `unknown` rather than the declared `UserLike`: the handler map is generic over every
 * event name, so a call site widens to the union of all payloads, and several of those carry no
 * actor at all. An empty id is rejected too, because a row written against one would fail its
 * own foreign key.
 */
function actingUserId(payload: unknown): string | undefined {
	if (typeof payload !== 'object' || payload === null || !('user' in payload)) return undefined;

	const { user } = payload;
	if (typeof user !== 'object' || user === null || !('id' in user)) return undefined;

	const { id } = user;
	return typeof id === 'string' && id.length > 0 ? id : undefined;
}

/** An entry that resolves no project, since one written without a project could never be read. */
type UnresolvedProject = { projectId: string | undefined };

/** The shape `setupListeners` takes, so wrapping the map keeps each handler's payload type. */
type ActivityHandlers<EventNames extends keyof RelayEventMap> = {
	[EventName in EventNames]?: (event: RelayEventMap[EventName]) => Promise<void>;
};

/**
 * Records recent instance activity to `activity_event`, so a consumer can be handed what has been
 * happening rather than spending a round trip discovering it.
 *
 * Registered from `BaseCommand` as a core relay. Every event it listens for is emitted from a
 * request path, so today only a main writes rows — but the record itself is not specific to one
 * consumer, and keeping the writer beside the core table it fills means a later consumer does not
 * have to reach across a module boundary. On a process that emits none of these, the flag check
 * below is the entire cost.
 *
 * Not recorded, because the events carry too little to render a useful entry: data tables and
 * folders (no name, no acting user), agents (only an id), projects and source control. Executions
 * are not recorded either — see `ActivityEvent.category` for why.
 */
@Service()
export class ActivityEventRelay extends EventRelay {
	constructor(
		eventService: EventService,
		private readonly activityEventRepository: ActivityEventRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly userRepository: UserRepository,
		private readonly activityLogConfig: ActivityLogConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly postHogClient: PostHogClient,
		private readonly logger: Logger,
	) {
		super(eventService);
		this.logger = this.logger.scoped('activity-log');
	}

	init() {
		// The record and the assistant's read of it move together, and the rollout flag can
		// turn both on for a user without a deploy — so this cannot be decided once here.
		//
		// It can still be ruled out. With diagnostics off there is no PostHog to consult, so the
		// flag can only come from an explicit override — which is checked here too, or an instance
		// that forces the read on that way would read a log nothing writes. Ruled out on every
		// other combination, and such an instance registers no listeners and pays nothing per
		// event exactly as before.
		if (
			!this.activityLogConfig.enabled &&
			!this.globalConfig.diagnostics.enabled &&
			!(INSTANCE_ACTIVITY_CONTEXT_FLAG in this.globalConfig.featureFlags.override)
		) {
			return;
		}

		this.setupListeners(
			this.guarded({
				'workflow-created': async (e) => await this.onWorkflowCreated(e),
				'workflow-saved': async (e) => await this.onWorkflowSaved(e),
				'workflow-activated': async (e) => await this.onPublishToggled(e, 'published'),
				'workflow-deactivated': async (e) => await this.onPublishToggled(e, 'unpublished'),
				'workflow-archived': async (e) => await this.onWorkflowFlagged(e, 'archived'),
				'workflow-unarchived': async (e) => await this.onWorkflowFlagged(e, 'unarchived'),
				'workflow-deleted': async (e) => await this.onWorkflowDeleted(e),
				'workflow-version-updated': async (e) => await this.onWorkflowVersionUpdated(e),
				'credentials-created': async (e) => await this.onCredentialCreated(e),
				'credentials-updated': async (e) => await this.onCredentialUpdated(e),
				'credentials-deleted': async (e) => await this.onCredentialDeleted(e),
			}),
		);
	}

	/** In-flight gate checks, keyed by user, so one burst asks PostHog once. */
	private readonly gateChecks = new Map<string, Promise<boolean>>();

	/**
	 * Whether this event's actor has the feature on.
	 *
	 * Per acting user, because that is the unit the rollout exposes. The env var short-
	 * circuits it, so a local instance never consults PostHog, and `getFeatureFlags`
	 * caches per user, so a busy user costs one evaluation rather than one per event, and
	 * the signup date it needs is held for as long.
	 *
	 * Fails closed: an unreadable flag means no row, never a row written on a guess.
	 */
	private async shouldRecord(userId: string): Promise<boolean> {
		if (this.activityLogConfig.enabled) return true;

		// Coalesced per user. Saving a workflow emits several of these events at once, and
		// without this each one would open its own evaluation before the first resolved.
		const inFlight = this.gateChecks.get(userId);
		if (inFlight) return await inFlight;

		const check = this.readGate(userId).finally(() => this.gateChecks.delete(userId));
		this.gateChecks.set(userId, check);
		return await check;
	}

	/**
	 * Fails closed, so a user outside the rollout is never recorded on a guess.
	 *
	 * The cost is that a PostHog outage pauses recording rather than degrading it. Bounded
	 * in practice: the client caches a user's flags for ten minutes and only replaces them
	 * on a successful read, so an outage mid-window leaves an already-evaluated user alone
	 * and reaches only users it has not seen yet.
	 *
	 * The signup date is read from the database rather than taken from the event, whose
	 * actor carries only a name and a role. It has to be the real one: the reader evaluates
	 * the same flag with the real date, and a rollout that conditions on signup date would
	 * otherwise answer one thing here and another there — recording for a user who cannot
	 * read it back, or leaving a reader's own edits out of what they are handed. A user id
	 * that resolves to nobody records nothing, for the same reason an unreadable flag does.
	 */
	private async readGate(userId: string): Promise<boolean> {
		try {
			const createdAt = await this.resolveSignupDate(userId);
			if (!createdAt) return false;

			const flags = await this.postHogClient.getFeatureFlags({ id: userId, createdAt });
			return flags[INSTANCE_ACTIVITY_CONTEXT_FLAG] === true;
		} catch {
			return false;
		}
	}

	/** Resolved signup dates, so one user's events do not each re-read the same row. */
	private readonly signupDates = new Map<string, Date>();

	/**
	 * Held because the flag answer behind it is: `gateChecks` only collapses the events of one
	 * save, so without this every later event pays the read again while the evaluation it feeds
	 * is still served from the client's own cache.
	 *
	 * Bounded by evicting the oldest rather than by an expiry — a signup date cannot change, so
	 * there is nothing for an expiry to correct, and only the entry count needs a ceiling. A Map
	 * iterates in insertion order, which is what makes the first key the oldest.
	 */
	private async resolveSignupDate(userId: string): Promise<Date | undefined> {
		const held = this.signupDates.get(userId);
		if (held) return held;

		const createdAt = await this.userRepository.findCreatedAt(userId);
		if (!createdAt) return undefined;

		if (this.signupDates.size >= maxHeldSignupDates) {
			const oldest = this.signupDates.keys().next();
			if (!oldest.done) this.signupDates.delete(oldest.value);
		}
		this.signupDates.set(userId, createdAt);
		return createdAt;
	}

	/**
	 * Wraps every listener so nothing one does can escape. Shaping an entry has to be as safe as
	 * writing one — a malformed payload throwing while a delta is computed would reject inside an
	 * async listener that nobody awaits, which is an unhandled rejection rather than a lost row.
	 *
	 * Wrapping the map rather than each entry is what lets the log name the event it came from.
	 */
	private guarded<EventNames extends keyof RelayEventMap>(
		handlers: ActivityHandlers<EventNames>,
	): ActivityHandlers<EventNames> {
		const entries = Object.entries(handlers) as Array<
			[EventNames, (event: RelayEventMap[EventNames]) => Promise<void>]
		>;

		const wrapped = entries.map(([event, handle]) => [
			event,
			async (payload: RelayEventMap[EventNames]) => {
				try {
					const userId = actingUserId(payload);
					if (!userId || !(await this.shouldRecord(userId))) return;
					await handle(payload);
				} catch (error) {
					this.logger.warn('Failed to record activity for an event', { event, error });
				}
			},
		]);

		return Object.fromEntries(wrapped) as ActivityHandlers<EventNames>;
	}

	// #region Workflows

	private async onWorkflowCreated({
		user,
		workflow,
		projectId,
		source,
	}: RelayEventMap['workflow-created']) {
		await this.record({
			category: 'workflow',
			action: 'created',
			userId: user.id,
			projectId,
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: { ...provenance(source), nodeCount: nodeCount(workflow) },
		});
	}

	/**
	 * The entry the "remember what I changed by hand" case rests on, so it carries provenance and a
	 * node-type delta rather than a bare count: two saves that differ completely would otherwise
	 * look identical.
	 */
	private async onWorkflowSaved(event: RelayEventMap['workflow-saved']) {
		const { user, workflow } = event;

		await this.record({
			category: 'workflow',
			action: 'saved',
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflow.id),
			resourceType: 'workflow',
			resourceId: workflow.id,
			resourceName: workflow.name,
			data: savedDetail(event),
		});
	}

	private async onPublishToggled(
		{
			user,
			workflowId,
			workflow,
			source,
		}: RelayEventMap['workflow-activated'] | RelayEventMap['workflow-deactivated'],
		action: 'published' | 'unpublished',
	) {
		await this.record({
			category: 'workflow',
			action,
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflow.name,
			// The version name is worth more than the id here: the assistant and MCP both set a
			// descriptive one. Present when publishing, since the service attaches the version it
			// activated; absent when unpublishing, which clears the relation before it emits.
			data: { ...provenance(source), ...versionName(workflow.activeVersion?.name) },
		});
	}

	/**
	 * Neither event carries a name, and the workflow still exists — so a reader can resolve one at
	 * render time. `resourceName` is the fallback for resources that are gone.
	 */
	private async onWorkflowFlagged(
		{ user, workflowId }: RelayEventMap['workflow-archived'] | RelayEventMap['workflow-unarchived'],
		action: 'archived' | 'unarchived',
	) {
		await this.record({
			category: 'workflow',
			action,
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
		});
	}

	/**
	 * The entry that justifies the table: `workflow_history` cascades on delete, so once a workflow
	 * is gone nothing else records that it existed. Name and project come off the event because both
	 * are resolved before the delete — neither can be recovered here.
	 */
	private async onWorkflowDeleted({
		user,
		workflowId,
		workflowName,
		projectId,
	}: RelayEventMap['workflow-deleted']) {
		await this.record({
			category: 'workflow',
			action: 'deleted',
			userId: user.id,
			projectId,
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflowName,
		});
	}

	private async onWorkflowVersionUpdated({
		user,
		workflowId,
		workflowName,
		versionId,
		versionName,
	}: RelayEventMap['workflow-version-updated']) {
		await this.record({
			category: 'workflow',
			action: 'version-updated',
			userId: user.id,
			projectId: await this.resolveWorkflowProject(workflowId),
			resourceType: 'workflow',
			resourceId: workflowId,
			resourceName: workflowName,
			// The name is unbounded user input. Left whole it can push `data` past the budget, and an
			// over-budget payload is replaced entirely — which would take `versionId` with it.
			data: { versionId, ...(versionName ? { versionName: clip(versionName) } : {}) },
		});
	}

	// #endregion

	// #region Credentials

	private async onCredentialCreated({
		user,
		credentialId,
		credentialName,
		credentialType,
		projectId,
	}: RelayEventMap['credentials-created']) {
		await this.record({
			category: 'credential',
			action: 'created',
			userId: user.id,
			// The public API resolves a project and the UI controller does too, but the field is
			// optional on the event, so fall back rather than drop the entry.
			projectId: projectId ?? (await this.resolveCredentialProject(credentialId)),
			resourceType: 'credential',
			resourceId: credentialId,
			resourceName: credentialName,
			data: { credentialType },
		});
	}

	private async onCredentialUpdated({
		user,
		credentialId,
		credentialName,
		credentialType,
	}: RelayEventMap['credentials-updated']) {
		await this.record({
			category: 'credential',
			action: 'updated',
			userId: user.id,
			projectId: await this.resolveCredentialProject(credentialId),
			resourceType: 'credential',
			resourceId: credentialId,
			resourceName: credentialName,
			data: { credentialType },
		});
	}

	private async onCredentialDeleted({
		user,
		credentialId,
		credentialName,
		credentialType,
		projectId,
	}: RelayEventMap['credentials-deleted']) {
		await this.record({
			category: 'credential',
			action: 'deleted',
			userId: user.id,
			projectId,
			resourceType: 'credential',
			resourceId: credentialId,
			resourceName: credentialName,
			data: { credentialType },
		});
	}

	// #endregion

	/**
	 * Failing to record activity must never fail the thing being recorded — a full disk should not
	 * lose a workflow save. Logged at warn rather than error: rows are being dropped, which is worth
	 * knowing about, but a broken activity log is not an incident.
	 *
	 * Every entry written here is shape version 1. Changing what any `data` above carries means
	 * passing a raised `typeVersion` for that category and action, so an older row still reads.
	 */
	private async record(input: Omit<ActivityEventInput, 'projectId'> & UnresolvedProject) {
		const { projectId, ...rest } = input;

		if (!projectId) {
			// Writing the row anyway is not an option: every read filters on the project, so an
			// unattributed entry would be stored and then never shown to anybody.
			//
			// A credential reaching here is ordinary: an instance-scoped one has no owning project,
			// and no operator action would give it one. A workflow always has one, so its absence
			// is a fault worth surfacing.
			const unattributed =
				rest.category === 'credential'
					? this.logger.debug.bind(this.logger)
					: this.logger.warn.bind(this.logger);

			unattributed('Dropped an activity entry with no project to attribute it to', {
				category: rest.category,
				action: rest.action,
				resourceId: rest.resourceId,
			});
			return;
		}

		try {
			await this.activityEventRepository.record({ ...rest, projectId });
		} catch (error) {
			this.logger.warn('Failed to record an activity entry', {
				category: rest.category,
				action: rest.action,
				error,
			});
		}
	}

	/** One indexed lookup. Only reached for events whose resource still exists. */
	private async resolveWorkflowProject(workflowId: string): Promise<string | undefined> {
		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		return project?.id;
	}

	/**
	 * Unlike a workflow, a credential may legitimately have no project: an instance-scoped one is
	 * stored without a `shared_credentials` row at all. Its events are therefore dropped rather
	 * than attributed, and the drop is expected rather than a fault — see `record`.
	 */
	private async resolveCredentialProject(credentialId: string): Promise<string | undefined> {
		const project =
			await this.sharedCredentialsRepository.findCredentialOwningProject(credentialId);
		return project?.id;
	}
}

function nodeCount(workflow: Pick<IWorkflowBase, 'nodes'>): number {
	return workflow.nodes?.length ?? 0;
}

/**
 * `source` is server-set per code path, so it is the authoritative answer to "was this the
 * assistant or the user". `aiBuilderAssisted` comes off the request body, so it is the weaker of
 * the two when they disagree. An explicit `false` is kept: a save that stated the assistant was
 * not involved says more than one that never mentioned it.
 */
function provenance(
	source: WorkflowActionSource | undefined,
	aiBuilderAssisted?: boolean,
): IDataObject {
	return {
		...(source ? { source } : {}),
		...(aiBuilderAssisted === undefined ? {} : { aiBuilderAssisted }),
	};
}

function shortNodeType(node: INode): string {
	const type = node?.type;
	if (typeof type !== 'string') return 'unknown';

	return type.startsWith(CORE_NODE_TYPE_PREFIX) ? type.slice(CORE_NODE_TYPE_PREFIX.length) : type;
}

function distinctNodeTypes(nodes: INode[] | undefined): Set<string> {
	return new Set((nodes ?? []).map(shortNodeType));
}

/**
 * A delta over the *set of types*, not over node instances: adding a second Slack node says nothing
 * new about what the user reaches for, and `nodeCount` already records that the shape changed.
 */
function nodeTypeDelta(after: INode[] | undefined, before: INode[] | undefined) {
	const beforeTypes = distinctNodeTypes(before);
	const afterTypes = distinctNodeTypes(after);

	return {
		added: [...afterTypes].filter((type) => !beforeTypes.has(type)).sort(),
		removed: [...beforeTypes].filter((type) => !afterTypes.has(type)).sort(),
	};
}

/** Caps a list to the budget, keeping the true size when it had to cut. */
function listNodeTypes(types: string[], listKey: string, totalKey: string): IDataObject {
	if (types.length === 0) return {};
	if (types.length <= maxListedNodeTypes) return { [listKey]: types };

	return { [listKey]: types.slice(0, maxListedNodeTypes), [totalKey]: types.length };
}

/** Free text a user typed, so it is clipped like every other name that reaches `data`. */
function versionName(name: string | null | undefined): IDataObject {
	return name ? { versionName: clip(name) } : {};
}

/** Keeps an unbounded string from spending the whole `data` budget on its own. */
function clip(value: string): string {
	return value.length > maxDetailStringLength ? value.slice(0, maxDetailStringLength) : value;
}

function fitsBudget(data: IDataObject): boolean {
	return JSON.stringify(data).length <= activityDataMaxLength;
}

/**
 * Built to fit rather than handed over oversized. The repository replaces an over-budget payload
 * *wholesale* with a truncation marker, which would take `source` with it — and provenance is the
 * one field this entry exists to carry. So detail is shed in order, cheapest signal first, until
 * what is left fits.
 */
function savedDetail(event: RelayEventMap['workflow-saved']): IDataObject {
	const { workflow, previousWorkflow, source, aiBuilderAssisted, settingsChanged } = event;

	const base: IDataObject = {
		...provenance(source, aiBuilderAssisted),
		nodeCount: nodeCount(workflow),
	};

	if (!previousWorkflow) return base;

	const { added, removed } = nodeTypeDelta(workflow.nodes, previousWorkflow.nodes);
	const types = {
		...listNodeTypes(added, 'nodesAdded', 'nodesAddedTotal'),
		...listNodeTypes(removed, 'nodesRemoved', 'nodesRemovedTotal'),
	};
	// Keys only. The before/after values are unbounded, and which settings moved is the signal.
	const changedSettings = Object.keys(settingsChanged ?? {}).sort();

	const candidates: IDataObject[] = [
		{ ...base, ...types, ...(changedSettings.length ? { settingsChanged: changedSettings } : {}) },
		{ ...base, ...types },
		{
			...base,
			...(added.length ? { nodesAddedTotal: added.length } : {}),
			...(removed.length ? { nodesRemovedTotal: removed.length } : {}),
		},
	];

	return candidates.find(fitsBudget) ?? base;
}
