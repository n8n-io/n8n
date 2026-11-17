import type {
	PromotionDependencyReport,
	PromotionDirection,
	PromotionEnvironmentChangesProject,
	PromotionPreview,
	PromotionProjectBlocker,
	PromotionProviderType,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef, watch, type Ref } from 'vue';

import { useLatestFetch } from '@n8n/composables/useLatestFetch';

import {
	getPromotionEnvironmentChanges,
	getPromotionInstanceApplyPreview,
	getPromotionPreview,
} from '../promotions.api';
import { loadPromotionFixture } from '../promotionFixtures';
import type { ApplyCheckResult } from '../promotions.types';
import { changesProjects, type ChangesProject } from '../promotionPreview.projects';
import { buildSelectionGraph } from '../promotionPreview.selection';
import { repositoryDisplayName } from '../promotionsSettings.utils';
import { useInstancePromotionConnection } from './useInstancePromotionConnection';
import { usePromotionProjectEnvironments } from './usePromotionProjectEnvironments';

/**
 * What the preview page needs to know about its environment. A project page reads it from the
 * project lookup, which also serves a project admin. The instance page reads the full list.
 */
export type PromotionPreviewEnvironment = {
	id: string;
	name: string;
	direction: PromotionDirection;
	providerType: PromotionProviderType;
	/** The base branch of a Promote, or the branch of an Apply. */
	branchName: string;
	createBranchOnPromotion: boolean;
	allowIncomplete: boolean;
};

type PromotionPreviewState =
	| 'loading'
	/** The connection lookup failed. This is not the same as "no connection". */
	| 'connectionFailed'
	/** The instance has no environment for this direction. */
	| 'disconnected'
	| 'error'
	/** An open review holds the changes, so the preview lists none. */
	| 'blocked'
	| 'empty'
	| 'ready';

export type PromotionPreviewOptions = {
	/**
	 * Only for the changes view: the project page that the user came from. Its environment
	 * serves the view, so a project admin needs no global promotion scope.
	 */
	origin?: Ref<string | undefined>;
	/** Development only: the name of a fixture that replaces the server. */
	fixture?: Ref<string | undefined>;
	/**
	 * Only for the changes view of an Apply: true when the user may apply the whole instance.
	 * The page then also reads which projects that Apply deletes.
	 */
	canApplyInstance?: Ref<boolean>;
};

/** What only the Apply of the whole instance does, and the revision that it accepts. */
export type InstanceApplyScope = {
	revision: string;
	/** The team projects that the branch does not hold. The Apply deletes them. */
	deletedProjects: Array<{ id: string; name: string }>;
	/** The dependency report of that Apply. Only it lists the workflows and projects that stay. */
	report: PromotionDependencyReport | null;
};

/**
 * Loads the preview of one project and direction for the preview page. Without a project, it
 * loads the changes view of the environment: the changes of every project that the user can
 * access. On Apply, the preview also holds the blockers, so both describe the same source.
 */
export function usePromotionPreview(
	projectId: Ref<string | undefined>,
	direction: Ref<PromotionDirection>,
	{ origin, fixture, canApplyInstance }: PromotionPreviewOptions = {},
) {
	const rootStore = useRootStore();
	const { next } = useLatestFetch();
	const {
		environments,
		failed: connectionFailed,
		load: loadConnection,
	} = useInstancePromotionConnection();
	const {
		environments: projectEnvironments,
		failed: projectLookupFailed,
		load: loadProjectEnvironments,
	} = usePromotionProjectEnvironments();
	/** False when the user may not run the operation in the project. */
	const canOperate = ref(true);

	const state = ref<PromotionPreviewState>('loading');
	const preview = shallowRef<PromotionPreview | null>(null);
	/** Only for the changes view: what the server says about its projects. */
	const scope = shallowRef<{
		projects?: PromotionEnvironmentChangesProject[];
		blockers?: PromotionProjectBlocker[];
	}>({});
	/** `null` when the page cannot run the Apply of the whole instance. */
	const instanceApply = shallowRef<InstanceApplyScope | null>(null);
	const fixtureEnvironment = shallowRef<PromotionPreviewEnvironment | null>(null);
	/** The project whose environment serves the page. */
	const lookupProjectId = computed(() => projectId.value ?? origin?.value);
	const refreshing = ref(false);
	/** True when a refresh failed. The page keeps the last preview and says so. */
	const refreshFailed = ref(false);
	const lastRefreshedAt = ref<Date | null>(null);
	/** The Apply check. `null` on Promote, and when the branch has no commit yet. */
	const check = computed<ApplyCheckResult | null>(() => {
		const result = preview.value;
		return result?.check && result.commitSha
			? {
					environmentId: result.source.environmentId,
					git: { commitSha: result.commitSha, branchName: result.source.branchName },
					...result.check,
				}
			: null;
	});
	const graph = computed(() =>
		preview.value ? buildSelectionGraph(preview.value, direction.value) : null,
	);
	const instanceEnvironment = computed(
		() => environments.value.find((candidate) => candidate.direction === direction.value) ?? null,
	);
	const environment = computed((): PromotionPreviewEnvironment | null => {
		if (fixtureEnvironment.value) return fixtureEnvironment.value;
		if (lookupProjectId.value !== undefined) {
			const found = projectEnvironments.value[direction.value];
			if (!found) return null;
			return {
				id: found.id,
				name: found.name,
				direction: direction.value,
				providerType: found.providerType,
				branchName: found.branchName,
				createBranchOnPromotion:
					'createBranchOnPromotion' in found && found.createBranchOnPromotion,
				allowIncomplete: found.allowIncomplete,
			};
		}
		const found = instanceEnvironment.value;
		if (!found) return null;
		return {
			id: found.id,
			name: found.name,
			direction: found.direction,
			providerType: found.provider.type,
			branchName:
				found.direction === 'apply' ? found.settings.branchName : found.settings.baseBranchName,
			createBranchOnPromotion:
				found.direction === 'promote' && found.settings.createBranchOnPromotion,
			allowIncomplete: found.settings.allowIncomplete,
		};
	});
	/** Only the instance page knows the remote. The project lookup does not send it. */
	const repositoryName = computed(() =>
		lookupProjectId.value === undefined && instanceEnvironment.value
			? repositoryDisplayName(instanceEnvironment.value.remote)
			: null,
	);

	const loadFixture = async (name: string) =>
		await loadPromotionFixture(name, direction.value, lookupProjectId.value);

	/**
	 * A selection never deletes a project. Only the Apply of the whole instance does, so the
	 * page asks its preview which projects go. A failure only turns that Apply off.
	 */
	async function loadInstanceApply(environmentId: string): Promise<InstanceApplyScope | null> {
		try {
			const { revision, check, dependencyReport } = await getPromotionInstanceApplyPreview(
				rootStore.publicApiContext,
				environmentId,
			);
			return {
				revision,
				report: dependencyReport ?? null,
				deletedProjects: check.conflicts.flatMap((conflict) =>
					conflict.code === 'project-deletion' ? [conflict.project] : [],
				),
			};
		} catch {
			return null;
		}
	}

	async function load() {
		const isLatest = next();
		const requested = {
			projectId: projectId.value,
			lookupProjectId: lookupProjectId.value,
			direction: direction.value,
			fixture: fixture?.value,
		};
		if (!preview.value) state.value = 'loading';
		refreshing.value = true;
		refreshFailed.value = false;

		try {
			let lookupFailed = false;
			if (requested.fixture) {
				fixtureEnvironment.value = (await loadFixture(requested.fixture)).environment;
			} else if (requested.lookupProjectId === undefined) {
				fixtureEnvironment.value = null;
				await loadConnection();
				lookupFailed = connectionFailed.value;
			} else {
				fixtureEnvironment.value = null;
				await loadProjectEnvironments(requested.lookupProjectId);
				lookupFailed = projectLookupFailed.value;
				canOperate.value = projectEnvironments.value[requested.direction]?.canOperate !== false;
			}
			if (!isLatest()) return;
			if (lookupFailed || !environment.value) {
				state.value = lookupFailed ? 'connectionFailed' : 'disconnected';
				preview.value = null;
				return;
			}

			let result: PromotionPreview;
			let hasProjectBlocker = false;
			if (requested.projectId === undefined) {
				// The changes view as a preview. The projects and their blockers go to `scope`.
				// Both previews load together, so the page waits once.
				const instanceApplyRequest =
					requested.direction === 'apply' &&
					!requested.fixture &&
					requested.lookupProjectId === undefined &&
					canApplyInstance?.value === true
						? loadInstanceApply(environment.value.id)
						: Promise.resolve(null);
				const {
					projects: listedProjects,
					blockers,
					direction: _direction,
					...changes
				} = requested.fixture
					? (await loadFixture(requested.fixture)).changes
					: await getPromotionEnvironmentChanges(
							rootStore.publicApiContext,
							environment.value.id,
							requested.direction,
						);
				const wholeInstance = await instanceApplyRequest;
				if (!isLatest()) return;
				instanceApply.value = wholeInstance;
				result = changes;
				scope.value = { projects: listedProjects, blockers };
				hasProjectBlocker = !!blockers?.length;
			} else {
				result = requested.fixture
					? (await loadFixture(requested.fixture)).projectPreview(requested.projectId)
					: await getPromotionPreview(
							rootStore.publicApiContext,
							requested.projectId,
							requested.direction,
						);
				if (!isLatest()) return;
				scope.value = {};
				instanceApply.value = null;
			}
			preview.value = result;
			lastRefreshedAt.value = new Date();
			// A changes view without rows is blocked when open reviews hold the changes of its projects.
			if (result.blocker || (result.resources.length === 0 && hasProjectBlocker)) {
				state.value = 'blocked';
			} else {
				state.value = result.resources.length === 0 ? 'empty' : 'ready';
			}
		} catch {
			if (!isLatest()) return;
			// Only the changes view shows the refresh warning. Other states show the error.
			if (state.value === 'ready') {
				refreshFailed.value = true;
			} else {
				preview.value = null;
				state.value = 'error';
			}
		} finally {
			if (isLatest()) refreshing.value = false;
		}
	}

	/** The projects of the changes view. Empty on a project page. */
	const projects = computed((): ChangesProject[] =>
		projectId.value === undefined && preview.value
			? changesProjects(preview.value.resources, scope.value.projects, scope.value.blockers)
			: [],
	);
	const dependencyReport = computed(
		(): PromotionDependencyReport | null => preview.value?.dependencyReport ?? null,
	);

	watch(
		[projectId, direction, () => origin?.value, () => fixture?.value],
		async () => {
			preview.value = null;
			lastRefreshedAt.value = null;
			await load();
		},
		{ immediate: true },
	);

	return {
		state,
		preview,
		check,
		graph,
		projects,
		dependencyReport,
		instanceApply,
		environment,
		canOperate,
		repositoryName,
		refreshing,
		refreshFailed,
		lastRefreshedAt,
		refresh: load,
	};
}
