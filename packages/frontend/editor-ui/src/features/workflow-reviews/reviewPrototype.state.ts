import { reactive, watch } from 'vue';

/**
 * Review choices for the prototype. Instance settings, project settings,
 * workflow settings, and the request dialog read this same object.
 *
 * `mode` is stored in localStorage. A refresh keeps Basic or Custom.
 * Version 2 clears a stored Custom once, so the first load is Basic.
 * Version 3 resets stored reviewer pools to project admins only.
 * Reviewer pools are stored too. A removed pool becomes project admins only.
 * Both review features start off. They do not follow the server.
 */
const MODE_STORAGE_KEY = 'n8n-review-policy-prototype-mode';
const STORAGE_VERSION_KEY = 'n8n-review-policy-prototype-version';
const STORAGE_VERSION = '3';
const PUBLISHING_REVIEWERS_KEY = 'n8n-review-policy-prototype-publishing-reviewers';
const PROMOTING_REVIEWERS_KEY = 'n8n-review-policy-prototype-promoting-reviewers';
const PROJECT_PUBLISHING_REVIEWERS_KEY = 'n8n-review-policy-prototype-project-publishing-reviewers';
const PROJECT_PROMOTING_REVIEWERS_KEY = 'n8n-review-policy-prototype-project-promoting-reviewers';

/** Values that are no longer a Reviewers option. */
const REMOVED_REVIEWER_POOLS = new Set(['workflowEditors', 'instanceAdmins', 'projectAdmins']);

/** Narrowest pool first. Each pool includes the roles of the pools above it. */
export const REVIEWER_POOLS = ['projectAdminsOnly', 'projectAdminsAndEditors'] as const;

export type ReviewerPool = (typeof REVIEWER_POOLS)[number];

export type ReviewPolicyMode = 'basic' | 'custom';

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

function isReviewPolicyMode(value: unknown): value is ReviewPolicyMode {
	return value === 'basic' || value === 'custom';
}

/** Map a removed pool, and any unknown value, to project admins only. */
export function normalizeReviewerPool(value: unknown): ReviewerPool {
	if (isReviewerPool(value)) return value;
	return DEFAULT_REVIEWER_POOL;
}

/**
 * Clear a stored Custom once, and replace a removed reviewer pool.
 * Version 3 also resets stored pools to project admins only.
 * Later mode and pool changes still persist.
 */
function migratePrototypeStorage(): void {
	try {
		const keys: string[] = [];
		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (key?.startsWith('n8n-review-policy')) keys.push(key);
		}
		for (const key of keys) {
			const stored = localStorage.getItem(key);
			if (stored !== null && REMOVED_REVIEWER_POOLS.has(stored)) {
				localStorage.setItem(key, DEFAULT_REVIEWER_POOL);
			}
		}
		if (localStorage.getItem(STORAGE_VERSION_KEY) !== STORAGE_VERSION) {
			if (localStorage.getItem(STORAGE_VERSION_KEY) === null) {
				localStorage.setItem(MODE_STORAGE_KEY, 'basic');
			}
			localStorage.setItem(PUBLISHING_REVIEWERS_KEY, DEFAULT_REVIEWER_POOL);
			localStorage.setItem(PROMOTING_REVIEWERS_KEY, DEFAULT_REVIEWER_POOL);
			localStorage.setItem(PROJECT_PUBLISHING_REVIEWERS_KEY, DEFAULT_REVIEWER_POOL);
			localStorage.setItem(PROJECT_PROMOTING_REVIEWERS_KEY, DEFAULT_REVIEWER_POOL);
			localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
		}
	} catch {
		// Prototype preferences only. Keep the in-memory defaults.
	}
}

migratePrototypeStorage();

function readStoredMode(): ReviewPolicyMode {
	try {
		const stored = localStorage.getItem(MODE_STORAGE_KEY);
		return isReviewPolicyMode(stored) ? stored : 'basic';
	} catch {
		return 'basic';
	}
}

function readStoredPool(key: string): ReviewerPool {
	try {
		return normalizeReviewerPool(localStorage.getItem(key));
	} catch {
		return DEFAULT_REVIEWER_POOL;
	}
}

function writeStoredPool(key: string, value: ReviewerPool): void {
	try {
		localStorage.setItem(key, normalizeReviewerPool(value));
	} catch {
		// The choice is a local prototype preference. Keep it in memory if storage is blocked.
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

/**
 * Basic uses the approval layer. The stricter layer wins.
 * Custom uses the Reviewers settings. The narrower pool wins.
 */
export function reviewerPoolForTrack(input: {
	mode: ReviewPolicyMode;
	instanceRequired: boolean;
	projectRequired: boolean;
	instancePool: ReviewerPool;
	projectPool: ReviewerPool | null;
}): ReviewerPool {
	if (input.mode === 'basic') {
		if (input.instanceRequired || input.projectRequired) return DEFAULT_REVIEWER_POOL;
		return 'projectAdminsAndEditors';
	}
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
	projectPublishing: false,
	projectPromoting: false,
	workflowPublishing: {} as Record<string, boolean>,
	workflowPromoting: {} as Record<string, boolean>,
	mode: readStoredMode(),
	publishingReviewers: readStoredPool(PUBLISHING_REVIEWERS_KEY),
	promotingReviewers: readStoredPool(PROMOTING_REVIEWERS_KEY),
	/** Project default is project admins only until the user changes it. */
	projectPublishingReviewers: readStoredPool(PROJECT_PUBLISHING_REVIEWERS_KEY),
	projectPromotingReviewers: readStoredPool(PROJECT_PROMOTING_REVIEWERS_KEY),
});

export function setReviewPrototypeMode(mode: ReviewPolicyMode): void {
	reviewPrototypeState.mode = mode;
}

watch(
	() => reviewPrototypeState.mode,
	(mode) => {
		try {
			localStorage.setItem(MODE_STORAGE_KEY, mode);
		} catch {
			// The choice is a local prototype preference. Keep it in memory if storage is blocked.
		}
	},
);

watch(
	() =>
		[
			reviewPrototypeState.publishingReviewers,
			reviewPrototypeState.promotingReviewers,
			reviewPrototypeState.projectPublishingReviewers,
			reviewPrototypeState.projectPromotingReviewers,
		] as const,
	([publishing, promoting, projectPublishing, projectPromoting]) => {
		writeStoredPool(PUBLISHING_REVIEWERS_KEY, publishing);
		writeStoredPool(PROMOTING_REVIEWERS_KEY, promoting);
		writeStoredPool(PROJECT_PUBLISHING_REVIEWERS_KEY, projectPublishing);
		writeStoredPool(PROJECT_PROMOTING_REVIEWERS_KEY, projectPromoting);
	},
);
