import type {
	DecideWorkflowReviewRequestResponse,
	WorkflowReviewActivityEntry,
	WorkflowReviewEligibleReviewer,
	WorkflowReviewInboxCategory,
	WorkflowReviewInboxItem,
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestState,
} from '@n8n/api-types';
import { useUsersStore } from '@n8n/stores/users.store';
import { sleep } from '@n8n/utils/sleep';
import type { ExecutionSummary, IConnections, INode } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { SELF_HEALING_WORKFLOWS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import {
	isSelfHealingAssistant,
	SELF_HEALING_ASSISTANT,
	SELF_HEALING_FIX_DURATION_MS,
	SELF_HEALING_REVIEW_ID_PREFIX,
} from './selfHealing.constants';
import {
	buildSelfHealingOutcome,
	buildSelfHealingReview,
	createDefaultConfig,
	createDiagnosisCopy,
	createDiagnosisItemCopy,
	createEntryIdGenerator,
	createLiveFixSnapshots,
	createLiveReviewCopy,
	createLiveTrace,
	createSeedReviews,
	daysAgo,
	hashString,
	hoursAgo,
} from './selfHealing.fixtures';
import type {
	SelfHealingActivation,
	SelfHealingConfig,
	SelfHealingConfigInput,
	SelfHealingConfigStatus,
	SelfHealingFixJob,
	SelfHealingInboxKind,
	SelfHealingChatHandoff,
	SelfHealingLastActivity,
	SelfHealingOutcome,
	SelfHealingReview,
	SelfHealingTraceEntry,
	SelfHealingUsage,
	WorkflowHealingStatus,
} from './selfHealing.types';

/** What the store remembers about a workflow after the user acted on it in this session. */
type LiveWorkflowRecord =
	| { state: 'fixing'; executionId: string }
	| { state: 'diagnosed'; diagnosedAt: string }
	| { state: 'in_review'; reviewId: string; since: string }
	| { state: 'healed'; healedAt: string; reviewId: string | null };

export type SelfHealingDecisionInput = {
	decision: Exclude<WorkflowReviewRequestDecision, 'pending'>;
	note?: string;
};

export interface StartFixContext {
	workflowName: string;
	projectId: string | null;
	nodes?: INode[];
	connections?: IConnections;
}

const SEED_PROJECT_ID = 'self-healing-demo-project';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Frontend-only state for the self-healing prototype. Nothing here talks to a
 * backend: configurations, fix jobs and assistant-authored reviews live in
 * memory and reset on reload.
 */
export const useSelfHealingStore = defineStore('selfHealing', () => {
	const posthogStore = usePostHog();
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();

	const isEnabled = computed(() => {
		const variant = posthogStore.getVariant(SELF_HEALING_WORKFLOWS_EXPERIMENT.name);
		return variant === true || variant === SELF_HEALING_WORKFLOWS_EXPERIMENT.variant;
	});

	/** The signed-in user as the reviewer of every assistant-authored review. */
	const viewer = computed<WorkflowReviewEligibleReviewer | null>(() => {
		const user = usersStore.currentUser;
		if (!user) return null;
		return {
			id: user.id,
			email: user.email ?? '',
			firstName: user.firstName ?? null,
			lastName: user.lastName ?? null,
		};
	});

	// Keyed by project. A project without an entry still has the default config;
	// the entry is written only once the user changes something.
	const configsByProject = ref<Record<string, SelfHealingConfig[]>>({});
	const reviews = ref<SelfHealingReview[]>([]);
	/** The configuration that handled each item the store created, by review id. */
	const reviewConfigIds = ref<Record<string, string>>({});
	const fixJobs = ref<Record<string, SelfHealingFixJob>>({});
	const liveRecords = ref<Record<string, LiveWorkflowRecord>>({});

	let seeded = false;
	let nextEntryId = createEntryIdGenerator();

	function nowIso() {
		return new Date().toISOString();
	}

	/**
	 * Seeds the two fixture reviews on first use. The viewer is attached late
	 * because the users store may not be loaded when the store is created.
	 */
	function ensureSeeded() {
		if (!seeded) {
			reviews.value = createSeedReviews(viewer.value, SEED_PROJECT_ID, nextEntryId);
			seeded = true;
		}
		const reviewer = viewer.value;
		if (!reviewer) return;
		for (const review of reviews.value) {
			if (review.item.reviewers.length === 0) {
				review.item.reviewers = [reviewer];
				review.detail.reviewers = [reviewer];
			}
		}
	}

	// -- Configurations -------------------------------------------------------

	function getProjectConfigs(projectId: string): SelfHealingConfig[] {
		return (
			configsByProject.value[projectId] ?? [
				createDefaultConfig(projectId, viewer.value?.id ?? null),
			]
		);
	}

	/**
	 * The people a configuration notifies: every project member when enabled (as
	 * far as the loaded project tells us), plus the individually picked users.
	 * Unknown ids are dropped; the viewer is the fallback.
	 */
	function resolveReviewers(config: SelfHealingConfig | null): WorkflowReviewEligibleReviewer[] {
		const project = projectsStore.currentProject;
		const memberIds =
			config?.notifyProjectMembers && project && project.id === config.projectId
				? project.relations.map((relation) => relation.id)
				: [];
		const ids = [...new Set([...memberIds, ...(config?.reviewerIds ?? [])])];
		const resolved = ids.flatMap((id) => {
			if (id === viewer.value?.id) return viewer.value ? [viewer.value] : [];
			const user = usersStore.usersById?.[id];
			return user
				? [
						{
							id: user.id,
							email: user.email ?? '',
							firstName: user.firstName ?? null,
							lastName: user.lastName ?? null,
						},
					]
				: [];
		});
		if (resolved.length > 0) return resolved;
		return viewer.value ? [viewer.value] : [];
	}

	function materialize(projectId: string): SelfHealingConfig[] {
		if (!configsByProject.value[projectId]) {
			configsByProject.value[projectId] = getProjectConfigs(projectId);
		}
		return configsByProject.value[projectId];
	}

	function createConfig(projectId: string, input: SelfHealingConfigInput): SelfHealingConfig {
		const list = materialize(projectId);
		const timestamp = nowIso();
		const config: SelfHealingConfig = {
			...input,
			id: `config-${Date.now()}-${list.length}`,
			projectId,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		list.push(config);
		return config;
	}

	function updateConfig(
		projectId: string,
		configId: string,
		input: Partial<SelfHealingConfigInput>,
	): SelfHealingConfig | null {
		const list = materialize(projectId);
		const index = list.findIndex((config) => config.id === configId);
		if (index === -1) return null;
		list[index] = { ...list[index], ...input, updatedAt: nowIso() };
		return list[index];
	}

	function setConfigStatus(projectId: string, configId: string, status: SelfHealingConfigStatus) {
		return updateConfig(projectId, configId, { status });
	}

	/** The workflows a "selected" configuration names, plus the sub-workflows it covers. */
	function coverageOf(config: SelfHealingConfig): string[] {
		return config.includeSubWorkflows
			? [...config.selectedWorkflowIds, ...config.subWorkflowIds]
			: [...config.selectedWorkflowIds];
	}

	/** Workflows that active "selected" configurations cover, except `exceptConfigId`. */
	function getSelectedCoverage(projectId: string, exceptConfigId: string | null): Set<string> {
		const ids = new Set<string>();
		for (const config of getProjectConfigs(projectId)) {
			if (config.id === exceptConfigId) continue;
			if (config.status !== 'active' || config.scope !== 'selected') continue;
			for (const id of coverageOf(config)) ids.add(id);
		}
		return ids;
	}

	/**
	 * Only one "All workflows" configuration can be active. When `configId` is
	 * an active one, pauses the others and returns their ids.
	 */
	function pauseOtherAllConfigs(projectId: string, configId: string): string[] {
		const list = materialize(projectId);
		const kept = list.find((config) => config.id === configId);
		if (kept?.scope !== 'all' || kept.status !== 'active') return [];
		const pausedIds = list
			.filter((config) => config.id !== configId && config.scope === 'all')
			.filter((config) => config.status === 'active')
			.map((config) => config.id);
		for (const id of pausedIds) setConfigStatus(projectId, id, 'paused');
		return pausedIds;
	}

	/**
	 * Activates a configuration. A workflow belongs to at most one active
	 * "selected" configuration, so an overlap blocks the activation. Another
	 * active "All workflows" configuration is paused instead.
	 */
	function activateConfig(projectId: string, configId: string): SelfHealingActivation {
		const config = materialize(projectId).find((entry) => entry.id === configId);
		if (!config) return { status: 'conflict', workflowIds: [] };
		if (config.scope === 'selected') {
			const taken = getSelectedCoverage(projectId, config.id);
			const workflowIds = coverageOf(config).filter((id) => taken.has(id));
			if (workflowIds.length > 0) return { status: 'conflict', workflowIds };
		}
		setConfigStatus(projectId, configId, 'active');
		return { status: 'activated', pausedConfigIds: pauseOtherAllConfigs(projectId, configId) };
	}

	function deleteConfig(projectId: string, configId: string) {
		const list = materialize(projectId);
		configsByProject.value[projectId] = list.filter((config) => config.id !== configId);
	}

	// -- Per-workflow status --------------------------------------------------

	/**
	 * The configuration among `configs` that a workflow falls under. One that
	 * selects the workflow wins over an "All workflows" one.
	 */
	function resolveConfig(
		configs: SelfHealingConfig[],
		workflowId: string,
	): SelfHealingConfig | null {
		return (
			configs.find(
				(config) => config.scope === 'selected' && coverageOf(config).includes(workflowId),
			) ??
			configs.find((config) => config.scope === 'all') ??
			null
		);
	}

	/** The active configuration that handles failures of `workflowId`, if any. */
	function getConfigForWorkflow(projectId: string, workflowId: string): SelfHealingConfig | null {
		const active = getProjectConfigs(projectId).filter((config) => config.status === 'active');
		return resolveConfig(active, workflowId);
	}

	function getWorkflowStatus(
		workflowId: string,
		projectId: string | null | undefined,
	): WorkflowHealingStatus {
		if (!projectId) return { enrolled: false, config: null };

		const config = getConfigForWorkflow(projectId, workflowId);
		if (!config) {
			// Tells why it is off: a paused configuration would cover it, or no configuration does.
			const configs = getProjectConfigs(projectId);
			return {
				enrolled: false,
				config:
					resolveConfig(configs, workflowId) ??
					configs.find((entry) => entry.status === 'active') ??
					configs[0] ??
					null,
			};
		}

		const live = liveRecords.value[workflowId];
		if (live) return { enrolled: true, config, ...live };

		// Demo texture: a stable subset of enrolled workflows reads as healed recently.
		const hash = hashString(workflowId);
		if (hash % 5 === 0) {
			return {
				enrolled: true,
				config,
				state: 'healed',
				healedAt: hoursAgo((hash % 36) + 1),
				reviewId: null,
			};
		}
		if (hash % 5 === 1) {
			return {
				enrolled: true,
				config,
				state: 'healed',
				healedAt: daysAgo((hash % 6) + 2),
				reviewId: null,
			};
		}
		return { enrolled: true, config, state: 'monitoring' };
	}

	// -- Coachmark ------------------------------------------------------------

	// Hidden for the current visit only. The executions list resets it when it
	// mounts, so the prototype shows the nudge on every visit with a failure.
	const isCoachmarkDismissed = ref(false);

	function dismissCoachmark() {
		isCoachmarkDismissed.value = true;
	}

	function resetCoachmark() {
		isCoachmarkDismissed.value = false;
	}

	function shouldShowCoachmark(execution: ExecutionSummary): boolean {
		if (!isEnabled.value || isCoachmarkDismissed.value) return false;
		return execution.status === 'error' || execution.status === 'crashed';
	}

	// -- Fix jobs -------------------------------------------------------------

	function getFixJob(executionId: string): SelfHealingFixJob | null {
		return fixJobs.value[executionId] ?? null;
	}

	/**
	 * Fakes the assistant handling a failed execution: a short "analysing"
	 * phase, then the outcome the project's autonomy level allows. "Diagnose"
	 * sends a root-cause summary to the inbox as an "Action needed" item;
	 * "review" opens a review; "deploy" creates the review already approved and
	 * published. Resolves to the id of the inbox item.
	 */
	async function startFix(execution: ExecutionSummary, context: StartFixContext): Promise<string> {
		ensureSeeded();
		const executionId = execution.id;
		const workflowId = execution.workflowId;

		const existing = fixJobs.value[executionId];
		if (existing?.status === 'submitted' || existing?.status === 'diagnosed') {
			return existing.reviewId;
		}

		fixJobs.value[executionId] = {
			status: 'running',
			executionId,
			workflowId,
			startedAt: nowIso(),
		};
		liveRecords.value[workflowId] = { state: 'fixing', executionId };

		await sleep(SELF_HEALING_FIX_DURATION_MS);

		// A one-off fix outside every configuration goes to review, with the viewer as reviewer.
		const config =
			context.projectId !== null ? getConfigForWorkflow(context.projectId, workflowId) : null;

		if (config?.autonomy === 'diagnose') {
			const diagnosedAt = nowIso();
			const failedNode =
				execution.lastNodeExecuted ?? context.nodes?.at(-1)?.name ?? 'the failing node';
			const errorMessage = execution.executionError?.message?.trim() || null;
			const workflowName = context.workflowName || execution.workflowName || 'workflow';
			const { reason, ...copy } = createDiagnosisItemCopy({
				executionId,
				failedNode,
				workflowName,
				errorMessage,
			});
			const reviewId = `${SELF_HEALING_REVIEW_ID_PREFIX}${executionId}-${Date.now()}`;
			reviewConfigIds.value[reviewId] = config.id;

			// The people the configuration notifies get the diagnosis in their inbox.
			reviews.value.unshift(
				buildSelfHealingOutcome(
					{
						id: reviewId,
						...copy,
						outcome: { kind: 'needs_you', reason, action: null },
						usage: { credits: 5, turns: 4, durationSeconds: 45 },
						trace: createLiveTrace({
							executionId,
							workflowId,
							workflowName,
							changedNode: failedNode,
							errorMessage,
							autonomy: 'diagnose',
						}),
						executionId,
						workflowId,
						workflowName,
						projectId: context.projectId ?? SEED_PROJECT_ID,
						nodes: context.nodes ?? [],
						reviewers: resolveReviewers(config),
						createdAt: diagnosedAt,
					},
					nextEntryId,
				),
			);

			fixJobs.value[executionId] = {
				status: 'diagnosed',
				executionId,
				workflowId,
				reviewId,
				...createDiagnosisCopy({ executionId, failedNode, errorMessage }),
			};
			liveRecords.value[workflowId] = { state: 'diagnosed', diagnosedAt };
			return reviewId;
		}

		const { baseline, pinned, changedNode } = createLiveFixSnapshots({
			nodes: context.nodes,
			connections: context.connections,
			failedNodeName: execution.lastNodeExecuted ?? null,
		});
		const workflowName = context.workflowName || execution.workflowName || 'workflow';
		const autoDeploy = config?.autonomy === 'deploy';
		const copy = createLiveReviewCopy({
			executionId,
			changedNode,
			workflowName,
			errorMessage: execution.executionError?.message?.trim() || null,
			autoDeployed: autoDeploy,
		});
		const createdAt = nowIso();
		const reviewId = `${SELF_HEALING_REVIEW_ID_PREFIX}${executionId}-${Date.now()}`;

		const review = buildSelfHealingReview(
			{
				id: reviewId,
				...copy,
				changedNode,
				executionId,
				workflowId,
				workflowName,
				projectId: context.projectId ?? SEED_PROJECT_ID,
				baseline,
				pinned,
				reviewers: resolveReviewers(config),
				createdAt,
				usage: { credits: 12, turns: 7, durationSeconds: 150 },
				trace: createLiveTrace({
					executionId,
					workflowId,
					workflowName,
					changedNode,
					errorMessage: execution.executionError?.message?.trim() || null,
					autonomy: autoDeploy ? 'deploy' : 'review',
				}),
				...(autoDeploy
					? {
							state: 'closed' as const,
							decision: 'approved' as const,
							approval: { by: SELF_HEALING_ASSISTANT, at: createdAt, note: null },
						}
					: {}),
			},
			nextEntryId,
		);
		reviews.value.unshift(review);
		if (config) reviewConfigIds.value[reviewId] = config.id;

		fixJobs.value[executionId] = {
			status: 'submitted',
			executionId,
			workflowId,
			reviewId,
			changedNode,
		};
		liveRecords.value[workflowId] = autoDeploy
			? { state: 'healed', healedAt: createdAt, reviewId }
			: { state: 'in_review', reviewId, since: createdAt };

		return reviewId;
	}

	// -- Last activity per configuration -------------------------------------

	function activityOf(review: SelfHealingReview): SelfHealingLastActivity {
		const outcome =
			review.kind === 'fix'
				? review.item.decision === 'approved'
					? 'healed'
					: 'fix_ready'
				: review.kind;
		return { reviewId: review.item.id, outcome, at: review.item.updatedAt };
	}

	/**
	 * The latest inbox item a configuration produced, for the project settings
	 * list. Fixes started in this session count first. Without one, a
	 * configuration older than an hour borrows a seeded demo item, picked by its
	 * id, so the list reads like a project in use; a new one has none yet.
	 */
	function getLastActivity(projectId: string, configId: string): SelfHealingLastActivity | null {
		ensureSeeded();
		const live = reviews.value
			.filter((review) => reviewConfigIds.value[review.item.id] === configId)
			.sort((a, b) => b.item.updatedAt.localeCompare(a.item.updatedAt));
		if (live[0]) return activityOf(live[0]);

		const config = getProjectConfigs(projectId).find((entry) => entry.id === configId);
		if (!config || Date.now() - new Date(config.createdAt).getTime() < HOUR_MS) return null;
		const seededItems = reviews.value.filter(
			(review) =>
				review.item.projectId === SEED_PROJECT_ID && isSelfHealingAssistant(review.item.requester),
		);
		const picked = seededItems[hashString(config.id) % seededItems.length];
		return picked ? activityOf(picked) : null;
	}

	// -- Assistant-authored reviews (served to the review inbox) --------------

	function findReview(reviewId: string): SelfHealingReview | null {
		ensureSeeded();
		return reviews.value.find((review) => review.item.id === reviewId) ?? null;
	}

	/**
	 * The assistant authors every review here and the viewer reviews it, so
	 * they all sit in the "waiting" group of the open tab.
	 */
	function getInboxItems(
		state: WorkflowReviewRequestState,
		category?: WorkflowReviewInboxCategory,
	): WorkflowReviewInboxItem[] {
		ensureSeeded();
		if (category === 'authored') return [];
		return reviews.value
			.filter((review) => review.item.state === state)
			.map((review) => review.item);
	}

	function countByState(state: WorkflowReviewRequestState): number {
		ensureSeeded();
		return reviews.value.filter((review) => review.item.state === state).length;
	}

	function getDetail(reviewId: string): WorkflowReviewRequestDetail | null {
		return findReview(reviewId)?.detail ?? null;
	}

	function getActivity(reviewId: string): WorkflowReviewActivityEntry[] {
		return findReview(reviewId)?.activity ?? [];
	}

	function getReviewSummary(reviewId: string): string | null {
		return findReview(reviewId)?.summary ?? null;
	}

	function getInboxKind(reviewId: string): SelfHealingInboxKind | null {
		return findReview(reviewId)?.kind ?? null;
	}

	function getOutcome(reviewId: string): SelfHealingOutcome | null {
		return findReview(reviewId)?.outcome ?? null;
	}

	/** Whether the review's fix also changes `workflowId` as a sub-workflow of the main one. */
	function isSubWorkflowOf(reviewId: string, workflowId: string): boolean {
		return findReview(reviewId)?.subWorkflowIds.includes(workflowId) ?? false;
	}

	/** Names of the sub-workflows the fix also changes, for the inbox card. */
	function getSubWorkflowNames(reviewId: string): string[] {
		const review = findReview(reviewId);
		if (!review) return [];
		return review.detail.workflows
			.filter((workflow) => review.subWorkflowIds.includes(workflow.workflowId))
			.map((workflow) => workflow.workflowName);
	}

	/**
	 * What a new Assistant chat needs to take over an investigation. Demo items
	 * point at workflows and a project that do not exist, so `workflowId` and
	 * `projectId` are `null` for them.
	 */
	function getChatHandoff(reviewId: string): SelfHealingChatHandoff | null {
		const review = findReview(reviewId);
		if (!review) return null;
		const isDemo = review.item.projectId === SEED_PROJECT_ID;
		const analysis = review.activity
			.flatMap((entry) => (entry.type === 'comment.created' ? entry.messages : []))
			.find((message) => message.id === `${reviewId}-analysis`)?.body;
		return {
			kind: review.kind,
			workflowId: isDemo ? null : (review.detail.workflows[0]?.workflowId ?? null),
			workflowName: review.item.workflowName ?? review.item.title,
			projectId: isDemo ? null : review.item.projectId,
			executionId: review.executionId,
			report: analysis ?? review.detail.description ?? review.summary,
		};
	}

	function getTrace(reviewId: string): SelfHealingTraceEntry[] {
		return findReview(reviewId)?.trace ?? [];
	}

	/** `undefined` for an unknown item, `null` when no AI ran. */
	function getUsage(reviewId: string): SelfHealingUsage | null | undefined {
		return findReview(reviewId)?.usage;
	}

	function decide(
		reviewId: string,
		input: SelfHealingDecisionInput,
	): DecideWorkflowReviewRequestResponse {
		const review = findReview(reviewId);
		if (!review) throw new Error(`Unknown self-healing review: ${reviewId}`);
		if (review.outcome) throw new Error(`Nothing to decide on: ${reviewId}`);

		const decidedAt = nowIso();
		const { item, detail } = review;
		item.decision = input.decision;
		detail.decision = input.decision;
		item.updatedAt = decidedAt;
		detail.updatedAt = decidedAt;

		const workflowVersions = detail.workflows.map((workflow) => ({
			workflowId: workflow.workflowId,
			workflowVersionId: workflow.workflowVersionId ?? '',
		}));
		const note = input.note?.trim() ? input.note.trim() : null;

		if (input.decision === 'approved') {
			item.state = 'closed';
			detail.state = 'closed';
			detail.viewerCanDecide = false;
			for (const workflow of detail.workflows) {
				workflow.publishedVersionId = workflow.workflowVersionId;
				// A teammate's approved change publishes, but nothing was healed.
				if (!isSelfHealingAssistant(item.requester)) continue;
				liveRecords.value[workflow.workflowId] = {
					state: 'healed',
					healedAt: decidedAt,
					reviewId,
				};
			}
			review.activity.push(
				{
					id: nextEntryId(),
					typeVersion: 1,
					type: 'review.approved',
					createdBy: viewer.value,
					createdAt: decidedAt,
					data: { workflowVersions, note },
				},
				...workflowVersions.map(
					(version): WorkflowReviewActivityEntry => ({
						id: nextEntryId(),
						typeVersion: 1,
						type: 'workflow.published',
						createdBy: viewer.value,
						createdAt: decidedAt,
						data: version,
					}),
				),
			);
		} else {
			review.activity.push({
				id: nextEntryId(),
				typeVersion: 1,
				type: 'review.changes_requested',
				createdBy: viewer.value,
				createdAt: decidedAt,
				data: { workflowVersions, note },
			});
		}

		return {
			id: item.id,
			state: item.state,
			decision: item.decision,
			workflowVersionId: item.workflowVersionId,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt,
			...(input.decision === 'approved' ? { autoPublish: { status: 'published' as const } } : {}),
		};
	}

	function addComment(reviewId: string, body: string): WorkflowReviewActivityEntry {
		const review = findReview(reviewId);
		if (!review) throw new Error(`Unknown self-healing review: ${reviewId}`);

		const createdAt = nowIso();
		const id = nextEntryId();
		const entry: WorkflowReviewActivityEntry = {
			id,
			typeVersion: 1,
			type: 'comment.created',
			createdBy: viewer.value,
			createdAt,
			data: null,
			messages: [
				{
					id: `${reviewId}-comment-${id}`,
					body,
					createdBy: viewer.value,
					createdAt,
					updatedAt: null,
					deletedAt: null,
				},
			],
		};
		review.activity.push(entry);
		return entry;
	}

	function reset() {
		isCoachmarkDismissed.value = false;
		configsByProject.value = {};
		reviews.value = [];
		fixJobs.value = {};
		liveRecords.value = {};
		seeded = false;
		nextEntryId = createEntryIdGenerator();
	}

	return {
		isEnabled,
		viewer,
		configsByProject,
		reviews,
		fixJobs,
		getProjectConfigs,
		getConfigForWorkflow,
		getSelectedCoverage,
		activateConfig,
		pauseOtherAllConfigs,
		createConfig,
		updateConfig,
		setConfigStatus,
		deleteConfig,
		getWorkflowStatus,
		isCoachmarkDismissed,
		dismissCoachmark,
		resetCoachmark,
		shouldShowCoachmark,
		getFixJob,
		startFix,
		findReview,
		getInboxItems,
		countByState,
		getDetail,
		getActivity,
		getReviewSummary,
		getInboxKind,
		getLastActivity,
		getOutcome,
		getChatHandoff,
		isSubWorkflowOf,
		getSubWorkflowNames,
		getUsage,
		getTrace,
		decide,
		addComment,
		reset,
	};
});
