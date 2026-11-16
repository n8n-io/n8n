import { computed, reactive, watch } from 'vue';

/**
 * Review choices for the prototype. Instance settings, project settings,
 * workflow settings, and the request dialog read this same object.
 *
 * `variant` is stored in localStorage. Old and New share one store.
 * Review choices are not stored. A full page load starts from the defaults
 * and clears review state left in localStorage.
 * Both review features start off. They do not follow the server.
 */
const VARIANT_STORAGE_KEY = 'n8n-review-policy-prototype-variant';

/** Narrowest pool first. Each pool includes the roles of the pools above it. */
export const REVIEWER_POOLS = ['projectAdminsOnly', 'projectAdminsAndEditors'] as const;

export type ReviewerPool = (typeof REVIEWER_POOLS)[number];

export type ReviewPolicyVariant = 'current' | 'new';

/** Role used only to filter the prototype reviewer roster. */
export type PrototypeReviewerRole =
	| 'instanceAdmin'
	| 'projectAdmin'
	| 'projectEditor'
	| 'workflowEditor';

/** Narrowest pool. Instance admins and project admins. */
export const DEFAULT_REVIEWER_POOL: ReviewerPool = 'projectAdminsOnly';

const POOL_RANK: Record<ReviewerPool, number> = {
	projectAdminsOnly: 0,
	projectAdminsAndEditors: 1,
};

export function isReviewerPool(value: unknown): value is ReviewerPool {
	return REVIEWER_POOLS.some((pool) => pool === value);
}

function isReviewPolicyVariant(value: unknown): value is ReviewPolicyVariant {
	return value === 'current' || value === 'new';
}

/** Map a removed pool, and any unknown value, to project admins only. */
export function normalizeReviewerPool(value: unknown): ReviewerPool {
	if (isReviewerPool(value)) return value;
	return DEFAULT_REVIEWER_POOL;
}

/** Drop saved review choices. Keep the Old/New switch. */
function clearPersistedReviewState(): void {
	try {
		const keys: string[] = [];
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (key?.startsWith('n8n-review-policy') && key !== VARIANT_STORAGE_KEY) keys.push(key);
		}
		for (const key of keys) localStorage.removeItem(key);
		if (!isReviewPolicyVariant(localStorage.getItem(VARIANT_STORAGE_KEY))) {
			localStorage.removeItem(VARIANT_STORAGE_KEY);
		}
	} catch {
		// Prototype preferences only. Keep the in-memory defaults.
	}
}

clearPersistedReviewState();

function readStoredVariant(): ReviewPolicyVariant {
	try {
		const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
		return isReviewPolicyVariant(stored) ? stored : 'new';
	} catch {
		return 'new';
	}
}

export function narrowerReviewerPool(left: ReviewerPool, right: ReviewerPool): ReviewerPool {
	return POOL_RANK[left] <= POOL_RANK[right] ? left : right;
}

/** Pools a project may choose. The instance pool is the widest allowed pool. */
export function reviewerPoolsUpTo(limit: ReviewerPool): ReviewerPool[] {
	const limitRank = POOL_RANK[normalizeReviewerPool(limit)];
	return REVIEWER_POOLS.filter((pool) => POOL_RANK[pool] <= limitRank);
}

/**
 * Project admins only is the narrowest pool. The project cannot widen it,
 * so the control stays on that value.
 */
export function isProjectReviewerPoolLocked(instancePool: ReviewerPool): boolean {
	return normalizeReviewerPool(instancePool) === 'projectAdminsOnly';
}

/** The instance sets the widest pool. A project choice can only narrow it. */
export function effectiveCustomReviewerPool(
	instancePool: ReviewerPool,
	projectPool: ReviewerPool | null,
): ReviewerPool {
	const instance = normalizeReviewerPool(instancePool);
	const project = projectPool === null ? DEFAULT_REVIEWER_POOL : normalizeReviewerPool(projectPool);
	return narrowerReviewerPool(instance, project);
}

/** The instance sets the widest pool. A project choice can only narrow it. */
export function reviewerPoolForTrack(input: {
	instancePool: ReviewerPool;
	projectPool: ReviewerPool | null;
}): ReviewerPool {
	return effectiveCustomReviewerPool(
		normalizeReviewerPool(input.instancePool),
		input.projectPool === null ? null : normalizeReviewerPool(input.projectPool),
	);
}

export function roleMatchesReviewerPool(role: PrototypeReviewerRole, pool: ReviewerPool): boolean {
	switch (normalizeReviewerPool(pool)) {
		case 'projectAdminsOnly':
			return role === 'instanceAdmin' || role === 'projectAdmin';
		case 'projectAdminsAndEditors':
			return role !== 'workflowEditor';
	}
}

export const reviewPrototypeState = reactive({
	/** The prototype owns these flags. They start off and do not follow the server. */
	initialized: true,
	workflowReviewsEnabled: false,
	promotionReviewsEnabled: false,
	publishingNeedsApproval: false,
	promotingNeedsApproval: false,
	/** Promotion still uses one project flag. Publish uses per-project state. */
	projectPromoting: false,
	/** Promote-environment choice. In memory only. The form does not send it. */
	environmentPromoting: false,
	workflowPublishing: {} as Record<string, boolean>,
	workflowPromoting: {} as Record<string, boolean>,
	variant: readStoredVariant(),
	publishingReviewers: DEFAULT_REVIEWER_POOL,
	promotingReviewers: DEFAULT_REVIEWER_POOL,
	/** Project default is project admins only until the user changes it. */
	projectPublishingReviewers: DEFAULT_REVIEWER_POOL,
	projectPromotingReviewers: DEFAULT_REVIEWER_POOL,
});

/** True when the floating switch is on New. Current and New share this store. */
export const isNewVariant = computed(() => reviewPrototypeState.variant === 'new');

export function setReviewPrototypeVariant(variant: ReviewPolicyVariant): void {
	reviewPrototypeState.variant = variant;
}

watch(
	() => reviewPrototypeState.variant,
	(variant) => {
		try {
			localStorage.setItem(VARIANT_STORAGE_KEY, variant);
		} catch {
			// The choice is a local prototype preference. Keep it in memory if storage is blocked.
		}
	},
);

/** Child page under Settings > Policies. New only. */
export const PUBLISH_REVIEW_PROJECTS_VIEW = 'SecurityPublishReviews';

/** Child page under Settings > Environments. New only. */
export const PROMOTION_REVIEW_PROJECTS_VIEW = 'PromotionReviewProjects';

/** Per-project approval for publish and promotion. In memory for this page load. */
export type ReviewTrack = 'publishing' | 'promoting';

export type ProjectApprovalDisplay = 'required' | 'optedIn' | 'notRequired';

type TrackApproval = {
	required: boolean;
	optedIn: boolean;
	/** Null until the project admin chooses. The default pool applies. */
	reviewers: ReviewerPool | null;
};

type ProjectApprovalMap = Record<string, Partial<Record<ReviewTrack, TrackApproval>>>;

function emptyTrack(): TrackApproval {
	return { required: false, optedIn: false, reviewers: null };
}

/** In memory for this page load. A reload starts empty. */
export const projectApprovals = reactive<ProjectApprovalMap>({});

function ensureTrack(projectId: string, track: ReviewTrack): TrackApproval {
	const existing = projectApprovals[projectId];
	if (!existing) {
		const created = emptyTrack();
		projectApprovals[projectId] = { [track]: created };
		return created;
	}
	const row = existing[track];
	if (row) return row;
	const created = emptyTrack();
	existing[track] = created;
	return created;
}

/** The card dropdown is Always required, so every project on this track is required. */
export function instanceRequiresAll(track: ReviewTrack): boolean {
	return track === 'publishing'
		? reviewPrototypeState.publishingNeedsApproval
		: reviewPrototypeState.promotingNeedsApproval;
}

export function projectApprovalDisplay(
	projectId: string,
	track: ReviewTrack,
): ProjectApprovalDisplay {
	if (instanceRequiresAll(track)) return 'required';
	const state = projectApprovals[projectId]?.[track];
	if (state?.required) return 'required';
	if (state?.optedIn) return 'optedIn';
	return 'notRequired';
}

/** Instance Required wins. Opted in is the project admin's own Always required. */
export function projectApprovalLock(
	projectId: string | undefined,
	track: ReviewTrack,
): 'instance' | 'project' | null {
	if (instanceRequiresAll(track)) return 'instance';
	if (!projectId) return null;
	const state = projectApprovals[projectId]?.[track];
	if (state?.required) return 'instance';
	if (state?.optedIn) return 'project';
	return null;
}

/** Required and Opted in both need approval. Not required does not. */
export function countProjectsRequiringApproval(projectIds: string[], track: ReviewTrack): number {
	return projectIds.filter(
		(projectId) => projectApprovalDisplay(projectId, track) !== 'notRequired',
	).length;
}

/** The project admin's own choice. Off until they set it. */
export function projectAdminOptedIn(projectId: string, track: ReviewTrack): boolean {
	return projectApprovals[projectId]?.[track]?.optedIn === true;
}

/**
 * Instance admin sets enforcement for one project.
 * Clearing it while the instance requires every project turns that setting off
 * and keeps enforcement on the other projects. It does not turn the instance
 * setting back on when every project is Required again.
 */
export function setProjectEnforcement(
	projectId: string,
	track: ReviewTrack,
	enforced: boolean,
	projectIds: string[],
): void {
	if (!enforced && instanceRequiresAll(track)) {
		for (const id of projectIds) {
			if (id === projectId || id.trim() === '') continue;
			ensureTrack(id, track).required = true;
		}
		if (track === 'publishing') reviewPrototypeState.publishingNeedsApproval = false;
		else reviewPrototypeState.promotingNeedsApproval = false;
	}
	ensureTrack(projectId, track).required = enforced;
}

/** Project admin sets Always required (opt in) or When configured (clear the opt-in). */
export function setProjectOptIn(projectId: string, track: ReviewTrack, optedIn: boolean): void {
	if (projectApprovalLock(projectId, track) === 'instance') return;
	ensureTrack(projectId, track).optedIn = optedIn;
}

export function projectReviewerChoice(projectId: string, track: ReviewTrack): ReviewerPool | null {
	return projectApprovals[projectId]?.[track]?.reviewers ?? null;
}

export function effectiveProjectReviewers(projectId: string, track: ReviewTrack): ReviewerPool {
	const instancePool =
		track === 'publishing'
			? reviewPrototypeState.publishingReviewers
			: reviewPrototypeState.promotingReviewers;
	return effectiveCustomReviewerPool(instancePool, projectReviewerChoice(projectId, track));
}

/** A project can only narrow the instance pool. */
export function setProjectReviewers(
	projectId: string,
	track: ReviewTrack,
	reviewers: ReviewerPool,
): void {
	const instancePool =
		track === 'publishing'
			? reviewPrototypeState.publishingReviewers
			: reviewPrototypeState.promotingReviewers;
	if (isProjectReviewerPoolLocked(instancePool)) return;
	if (!reviewerPoolsUpTo(instancePool).includes(reviewers)) return;
	ensureTrack(projectId, track).reviewers = reviewers;
}

/** Disable reviews removes instance Required and every project choice on this track. */
export function clearTrackApprovals(track: ReviewTrack): void {
	for (const projectId of Object.keys(projectApprovals)) {
		const row = projectApprovals[projectId]?.[track];
		if (!row) continue;
		row.required = false;
		row.optedIn = false;
		row.reviewers = null;
	}
	if (track === 'publishing') reviewPrototypeState.publishingNeedsApproval = false;
	else reviewPrototypeState.promotingNeedsApproval = false;
}
