<script setup lang="ts">
import type {
	PromotionDependencyReport as DependencyReport,
	PromotionDirection,
	PromotionResource,
} from '@n8n/api-types';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nResizeWrapper,
	N8nTabs,
	N8nText,
	N8nTooltip,
	useResizablePanel,
} from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, ref, shallowRef, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PromotionApplyResultDialog from '../components/dependencies/PromotionApplyResultDialog.vue';
import PromotionDependencyReport from '../components/dependencies/PromotionDependencyReport.vue';
import PromotionDependencySummary from '../components/dependencies/PromotionDependencySummary.vue';
import PromotionIncompleteDialog from '../components/dependencies/PromotionIncompleteDialog.vue';
import PromotionPlannedMoves from '../components/dependencies/PromotionPlannedMoves.vue';
import PromotionBlockers from '../components/preview/PromotionBlockers.vue';
import PromotionChangeCards from '../components/preview/PromotionChangeCards.vue';
import PromotionResourceTree from '../components/preview/PromotionResourceTree.vue';
import PromotionReviewBlocker from '../components/preview/PromotionReviewBlocker.vue';
import PromoteSelectionDialog from '../components/PromoteSelectionDialog.vue';
import { usePromotionDependencies } from '../composables/usePromotionDependencies';
import { usePromotionMoveLabels } from '../composables/usePromotionMoveLabels';
import { usePromotionOperation, type OperationRequest } from '../composables/usePromotionOperation';
import { usePromotionOwnerRequest } from '../composables/usePromotionOwnerRequest';
import { usePromotionResourceDetails } from '../composables/usePromotionResourceDetails';
import { usePromotionPreview } from '../composables/usePromotionPreview';
import { usePromotionSelection, type SelectionSeed } from '../composables/usePromotionSelection';
import {
	usePromotionSelectionReport,
	type ReportSelection,
} from '../composables/usePromotionSelectionReport';
import {
	targetKey,
	type GapTargetRow,
	type PromotionOwnerRequester,
} from '../promotionDependencies';
import { loadPromotionFixture, promotionFixtureName } from '../promotionFixtures';
import { changedProjectsOf, scopePlannedMoves } from '../promotionMoves';
import { getPromotionEnvironmentDetails, getPromotionResourceDetails } from '../promotions.api';
import {
	PROMOTION_ENVIRONMENT_VIEWS,
	PROMOTION_PREVIEW_VIEWS,
	PROMOTIONS_SETTINGS_SCOPES,
	PROMOTIONS_SETTINGS_VIEW,
} from '../promotions.constants';
import {
	indexBlockers,
	isBlocking,
	listBlockers,
	toOperationRequest,
	scopeCheck,
	touchesDestructiveChange,
} from '../promotionOperation';
import {
	buildProjectTree,
	changedProjectCount,
	lockedProjectKeys,
	projectIdOf,
	projectSelectableKeys,
	toEnvironmentSelection,
} from '../promotionPreview.projects';
import {
	includedChangeCount,
	resolveInclusion,
	selectableKeys,
	totalChangeCount,
	type ResourceKey,
	type SelectionGraph,
} from '../promotionPreview.selection';
import { defaultActiveWorkflow, hasWorkflowDiff } from '../promotionPreview.workflow';
import { buildPreviewTree, cardOrder, type PreviewTreeGroup } from '../promotionPreview.tree';
import {
	setPromotionSelectionHandoff,
	takePromotionSelectionHandoff,
} from '../promotionSelectionHandoff';

/**
 * Without a project, the page is the changes view of the environment: the changes of every
 * project that the user can access, and one selection across them.
 */
const props = defineProps<{ projectId?: string; direction: PromotionDirection }>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectContext = capabilityRegistry.use(capabilities.projectContext);
const rbacStore = useRBACStore();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle({
	releaseChannel: useSettingsStore().settings.releaseChannel,
});

const projectId = toRef(props, 'projectId');
const direction = toRef(props, 'direction');
const isEnvironment = computed(() => props.projectId === undefined);
const queryValue = (value: unknown) =>
	typeof value === 'string' && value !== '' ? value : undefined;
// Only for the changes view: the project page that handed its selection over (`?from=`).
const origin = computed(() => (isEnvironment.value ? queryValue(route.query.from) : undefined));
// Development only: `?fixture=<name>` replaces the server with the fixtures.
const fixture = computed(() => promotionFixtureName(route.query.fixture));
const fixtureQuery = computed(() => (fixture.value ? { fixture: fixture.value } : {}));
// The link of an owner request in the Inbox: the page then holds only the requested item.
const isOwnerRequest = computed(() => queryValue(route.query.requested) !== undefined);
// Only a user with the global scope can apply the whole instance, which also deletes projects.
const canApplyInstance = computed(
	() =>
		isEnvironment.value && props.direction === 'apply' && rbacStore.hasScope('promotions:apply'),
);

const {
	state: previewState,
	preview,
	check,
	graph,
	projects,
	dependencyReport,
	instanceApply,
	environment,
	refreshing,
	refreshFailed,
	refresh,
} = usePromotionPreview(projectId, direction, { origin, fixture, canApplyInstance });
const promoteEnvironment = computed(() =>
	environment.value?.direction === 'promote' ? environment.value : null,
);
// A project page shows and enforces only the blockers of the workflows it lists.
const scopedCheck = computed(() => {
	if (!check.value || !graph.value) return null;
	const scoped = isEnvironment.value ? check.value : scopeCheck(check.value, graph.value);
	// With a dependency report, its grants are the grant step. The check only mirrors them for
	// older clients.
	return dependencyReport.value ? { ...scoped, accessRequirements: [] } : scoped;
});
// A project-wide conflict blocks all of them, so it also stops a selection without workflows.
const selectableResourceKeys = computed(() => (graph.value ? selectableKeys(graph.value) : []));
// A move between two team projects is a change, not a blocker. The server refuses the moves
// that it cannot do, and an Apply lists them in its check.
const blockerList = computed(() =>
	scopedCheck.value ? listBlockers(scopedCheck.value, selectableResourceKeys.value) : [],
);
const blockers = computed(() => indexBlockers(blockerList.value));
// Users cannot add a blocked workflow, or a change of a project that they can only read or
// that an open review holds.
const disabledKeys = computed((): ReadonlySet<ResourceKey> => {
	const locked = graph.value ? lockedProjectKeys(graph.value, projects.value) : new Set<string>();
	return locked.size > 0 ? new Set([...blockers.value.blocked, ...locked]) : blockers.value.blocked;
});
const operation = usePromotionOperation(projectId, direction, {
	preview,
	check,
	refresh,
	environmentId: computed(() => environment.value?.id),
	origin,
	fixture,
});

// The inspected card lives in the URL, so a direct link opens it. Replacing the entry keeps
// browser Back on the page that opened the preview.
const inspectedKey = computed(() =>
	typeof route.query.resource === 'string' ? route.query.resource : undefined,
);
/** The names of the included items that the page does not list, such as a credential. */
const includedNames = ref(new Map<ResourceKey, string>());

/**
 * The first selection of a changes view that continues a project page. A reload loses the
 * handoff, so the URL gives the changes of that project and the included items.
 */
function seedSelection(current: SelectionGraph): SelectionSeed | null {
	// An owner request on a project page: only the requested item is selected.
	if (!isEnvironment.value) {
		const requested = isOwnerRequest.value ? inspectedKey.value : undefined;
		if (requested === undefined) return null;
		// An item that is not a change any more leaves the selection empty.
		return {
			selected: current.resources.get(requested)?.selectable ? [requested] : [],
			extra: new Map(),
		};
	}
	if (origin.value === undefined) return null;
	const handoff = takePromotionSelectionHandoff(props.direction, origin.value);
	if (handoff) {
		// The report of the project page knows the gaps of this selection. The preview of the
		// changes view covers every change, so it lists none of them.
		if (handoff.report) operation.gapsReport.value = handoff.report;
		includedNames.value = new Map(handoff.names);
		return { selected: handoff.selected, extra: new Map(handoff.extra) };
	}
	const included = [route.query.include].flat().flatMap((key) => queryValue(key) ?? []);
	// An owner request for an item without a checkbox, such as a credential: only that item.
	if (isOwnerRequest.value) {
		return {
			selected: [],
			extra: new Map(included.map((key): [ResourceKey, string] => [key, origin.value ?? ''])),
		};
	}
	return {
		selected: projectSelectableKeys(current, origin.value),
		extra: new Map(
			included.flatMap((key): Array<[ResourceKey, string]> => {
				const resource = current.resources.get(key);
				// An item without a row, such as a credential: the URL names its project.
				const owner = resource
					? projectIdOf(current.resources, resource)
					: queryValue(route.query.includeProject);
				return owner === undefined ? [] : [[key, owner]];
			}),
		),
	};
}

const selection = usePromotionSelection(graph, {
	disabled: disabledKeys,
	locked: operation.isBusy,
	seed: seedSelection,
});
// A preview without changes still has something to write when the user included an item that
// it does not list, such as the credential of an owner request.
const state = computed(() =>
	previewState.value === 'empty' && selection.extra.value.size > 0 ? 'ready' : previewState.value,
);
/** Everything in the operation: the selection, what comes with it, and the included items. */
const inOperation = computed(
	(): ReadonlySet<ResourceKey> =>
		new Set([...selection.inclusion.value.included, ...selection.extra.value.keys()]),
);
/** Included items without a row of their own, such as a credential that no listed workflow uses. */
const unlistedIncluded = computed(() =>
	[...selection.extra.value.keys()]
		.filter((key) => !graph.value?.resources.has(key))
		.map((key) => ({
			key,
			name: includedNames.value.get(key) ?? key.slice(key.indexOf(':') + 1),
		})),
);
const dependencies = usePromotionDependencies({
	// The Apply of the whole instance has its own report: only it lists what reconciliation keeps.
	source: computed(() =>
		wholeInstance.value
			? (instanceApply.value?.report ?? dependencyReport.value)
			: dependencyReport.value,
	),
	operationReport: computed(() => (wholeInstance.value ? null : operation.gapsReport.value)),
	graph,
	included: inOperation,
	direction,
});

/** The rows that a gap names: a selected workflow references them, and the operation lacks them. */
const gapKeys = computed(
	(): ReadonlySet<ResourceKey> =>
		new Set((dependencies.report.value?.gaps ?? []).map(({ target }) => targetKey(target))),
);

// The moves between projects of the items in the operation.
const moveLabels = usePromotionMoveLabels();
const plannedMoves = computed(() =>
	graph.value
		? scopePlannedMoves(check.value?.plannedMoves ?? [], {
				selected: inOperation.value,
				listed: new Set(graph.value.resources.keys()),
			})
		: [],
);
// The server lists the projects of every planned move. A selection with fewer moves counts its own.
const changedProjects = computed(() =>
	plannedMoves.value.length === (check.value?.plannedMoves?.length ?? 0)
		? (check.value?.changedProjects ?? changedProjectsOf(plannedMoves.value))
		: changedProjectsOf(plannedMoves.value),
);
// Only the changes view can confirm a move out of a project that the branch does not hold.
const movesOutOfOperation = computed(() =>
	isEnvironment.value
		? plannedMoves.value.filter(({ needsConfirmation }) => needsConfirmation)
		: [],
);

const activeWorkflowKey = ref<ResourceKey>();
const details = usePromotionResourceDetails(
	async (keys) => {
		const request = { commitSha: preview.value?.commitSha ?? null, keys };
		if (fixture.value) {
			const loaded = await loadPromotionFixture(
				fixture.value,
				props.direction,
				props.projectId ?? origin.value,
			);
			return loaded.details(keys);
		}
		return props.projectId === undefined
			? await getPromotionEnvironmentDetails(
					rootStore.publicApiContext,
					environment.value?.id ?? '',
					props.direction,
					request,
				)
			: await getPromotionResourceDetails(
					rootStore.publicApiContext,
					props.projectId,
					props.direction,
					request,
				);
	},
	preview,
	graph,
	activeWorkflowKey,
);

/** The names of the projects that the page may show, by id. The report never adds one. */
const projectNames = computed(() => {
	const names = new Map<string, string>();
	for (const resource of preview.value?.resources ?? []) {
		if (resource.type === 'project') names.set(resource.id, resource.name);
		else if (resource.projectId !== undefined && resource.projectName !== undefined) {
			names.set(resource.projectId, resource.projectName);
		}
	}
	for (const project of projects.value) names.set(project.id, project.name);
	const current = projectContext.currentProject();
	if (current?.id && current.name) names.set(current.id, current.name);
	return names;
});
const projectName = computed(() =>
	props.projectId === undefined ? undefined : projectNames.value.get(props.projectId),
);
const title = computed(() => {
	if (!environment.value?.name) {
		return i18n.baseText(`promotions.preview.title.${props.direction}`);
	}
	return i18n.baseText(
		projectName.value
			? `promotions.preview.title.project.${props.direction}`
			: `settings.promotions.${props.direction}.dialog.title`,
		{ interpolate: { project: projectName.value ?? '', environment: environment.value.name } },
	);
});
watch(title, (value) => documentTitle.set(value), { immediate: true });

const tree = computed(() => {
	if (!preview.value) return [];
	const labels = {
		workflows: i18n.baseText('promotions.preview.tree.section.workflows'),
		group: (group: PreviewTreeGroup) => i18n.baseText(`promotions.preview.tree.group.${group}`),
	};
	return isEnvironment.value
		? buildProjectTree(preview.value.resources, projects.value, labels)
		: buildPreviewTree(preview.value, labels);
});
const order = computed(() => (graph.value ? cardOrder(tree.value, graph.value.resources) : []));

const cards = ref<InstanceType<typeof PromotionChangeCards>>();

const hasDiff = (key: ResourceKey) => {
	const resource = graph.value?.resources.get(key);
	return !!resource && hasWorkflowDiff(resource);
};

// One workflow diff is active at a time. A new preview keeps it while the workflow still has
// changes. The first preview activates the inspected or the first changed workflow.
watch(
	order,
	(keys, previous = []) => {
		const key = activeWorkflowKey.value;
		if (key ? keys.includes(key) && hasDiff(key) : previous.length > 0) return;
		activeWorkflowKey.value = graph.value
			? defaultActiveWorkflow(keys, graph.value.resources, inspectedKey.value)
			: undefined;
	},
	{ immediate: true },
);
watch(inspectedKey, (key) => {
	if (key && hasDiff(key)) activeWorkflowKey.value = key;
});
async function inspect(key: string) {
	if (hasDiff(key)) activeWorkflowKey.value = key;
	// The URL does not change for the same item, so scroll to its card again directly.
	if (key === inspectedKey.value) {
		await cards.value?.scrollToCard(key);
		return;
	}
	await router.replace({ query: { ...route.query, resource: key } });
}

const canOpenSettings = computed(() =>
	rbacStore.hasScope([...PROMOTIONS_SETTINGS_SCOPES], {}, { mode: 'allOf' }),
);

// The changes view goes back to where it was opened: a project page, or the settings page.
const backRoute = computed(() => {
	if (props.projectId !== undefined) {
		return { name: VIEWS.PROJECTS_WORKFLOWS, params: { projectId: props.projectId } };
	}
	if (origin.value !== undefined) {
		return {
			name: PROMOTION_PREVIEW_VIEWS[props.direction],
			params: { projectId: origin.value },
			query: fixtureQuery.value,
		};
	}
	return { name: PROMOTIONS_SETTINGS_VIEW };
});
const backLabel = computed(() => {
	const target = isEnvironment.value
		? origin.value === undefined
			? i18n.baseText('settings.promotions.title')
			: (projectNames.value.get(origin.value) ?? '')
		: (projectContext.currentProject()?.name ?? '');
	return i18n.baseText('promotions.preview.back', { interpolate: { project: target } });
});

const changedCount = computed(() =>
	graph.value
		? [...graph.value.resources.values()].filter(({ change }) => change !== 'unchanged').length
		: 0,
);
/**
 * An Apply that holds every change of the environment is the Apply of the whole instance, for
 * a user who may run it. A selection never deletes a project. Only that Apply does, so the
 * deletion of a project needs every change selected.
 */
const wholeInstance = computed(
	() =>
		isEnvironment.value &&
		props.direction === 'apply' &&
		origin.value === undefined &&
		!!instanceApply.value &&
		!!graph.value &&
		selection.extra.value.size === 0 &&
		projects.value.every(({ canOperate }) => canOperate) &&
		selectableResourceKeys.value.every((key) => selection.selected.value.has(key)),
);
const totalChanges = computed(() => {
	if (!graph.value) return 0;
	return isEnvironment.value && props.direction === 'apply'
		? changedCount.value
		: totalChangeCount(graph.value);
});
const includedChanges = computed(() => {
	if (!graph.value) return 0;
	return wholeInstance.value
		? changedCount.value
		: includedChangeCount(graph.value, selection.inclusion.value) + unlistedIncluded.value.length;
});
/** The projects that only the Apply of the whole instance deletes. */
const deletedProjects = computed(() => instanceApply.value?.deletedProjects ?? []);
const deletedProjectNames = computed(() =>
	deletedProjects.value.map(({ name }) => `"${name}"`).join(', '),
);
// The header of the changes view says what the operation holds: "3 changes in 2 projects".
const selectionSummary = computed(() => {
	if (!isEnvironment.value || !graph.value) return undefined;
	if (includedChanges.value === 0) return i18n.baseText('promotions.preview.summary.none');
	const projectCount = changedProjectCount(graph.value, selection.inclusion.value.included);
	const changes = i18n.baseText('promotions.preview.summary.changes', {
		adjustToNumber: includedChanges.value,
		interpolate: { count: String(includedChanges.value) },
	});
	if (projectCount === 0) return changes;
	return i18n.baseText('promotions.preview.summary', {
		interpolate: {
			changes,
			projects: i18n.baseText('promotions.preview.summary.projects', {
				adjustToNumber: projectCount,
				interpolate: { count: String(projectCount) },
			}),
		},
	});
});

const request = computed((): OperationRequest => {
	const confirmations = dependencies.payload.value;
	const none = { workflowIds: [], folderIds: [] };
	if (!graph.value) return { ...none, confirmDestructiveChanges: false };
	const movesOut = movesOutOfOperation.value.map((move) => moveLabels.moveOutSentence(move));
	if (wholeInstance.value) {
		return {
			...none,
			wholeInstance: true,
			instanceRevision: instanceApply.value?.revision,
			confirmDestructiveChanges: blockerList.value.some(({ kind }) => kind === 'destructive'),
			deletedProjects: deletedProjects.value.map(({ name }) => name),
			movesOutOfOperation: movesOut,
			confirmations,
		};
	}
	const confirmDestructiveChanges = touchesDestructiveChange(
		blockers.value,
		selection.selected.value,
	);
	if (isEnvironment.value) {
		return {
			...none,
			projects: toEnvironmentSelection(
				graph.value,
				selection.selected.value,
				selection.extra.value,
				projects.value.map(({ id }) => id),
			),
			confirmDestructiveChanges,
			movesOutOfOperation: movesOut,
			confirmations,
		};
	}
	return {
		...toOperationRequest(graph.value, selection.selected.value),
		confirmDestructiveChanges,
		confirmations,
	};
});
/**
 * What the page asks the server to check: the selection of the operation. `null` when there is
 * nothing to ask. The whole-instance Apply reads the report of its own preview instead.
 */
const reportSelection = computed((): ReportSelection | null => {
	const environmentId = environment.value?.id;
	if (!graph.value || !environmentId || fixture.value || wholeInstance.value) return null;
	if (state.value !== 'ready' || !dependencyReport.value) return null;
	if (selection.selected.value.size === 0 && selection.extra.value.size === 0) return null;
	const { projects: selected, workflowIds, folderIds, credentialIds } = request.value;
	const selectedProjects =
		props.projectId === undefined
			? (selected ?? [])
			: [
					{
						projectId: props.projectId,
						workflowIds,
						folderIds,
						...(credentialIds?.length ? { credentialIds } : {}),
					},
				];
	if (selectedProjects.length === 0) return null;
	return {
		environmentId,
		projects: selectedProjects,
		credentialHomes: dependencies.confirmations.value.credentialHomes,
		revision: preview.value?.revision,
	};
});
const { checking: checkingDependencies } = usePromotionSelectionReport({
	selection: reportSelection,
	direction,
	report: operation.gapsReport,
});

const isDestructive = computed(
	() =>
		request.value.confirmDestructiveChanges ||
		!!request.value.deletedProjects?.length ||
		!!request.value.movesOutOfOperation?.length,
);
const hasSelectedBlocked = computed(() =>
	[...selection.selected.value].some((key) => blockers.value.blocked.has(key)),
);
const actionableChanges = computed(() => {
	if (!graph.value || scopedCheck.value?.movedFolders.length) return 0;
	if (wholeInstance.value) return changedCount.value;
	const actionable = new Set(
		[...selection.selected.value].filter((key) => !blockers.value.blocked.has(key)),
	);
	return (
		includedChangeCount(
			graph.value,
			resolveInclusion(graph.value, actionable, selection.extra.value.keys()),
		) + unlistedIncluded.value.length
	);
});
const submitBlockedReason = computed(() => {
	// A folder that moved to another project stops the whole apply, so it blocks every selection.
	const movedFolders = scopedCheck.value?.movedFolders ?? [];
	if (movedFolders.length > 0) {
		return i18n.baseText('promotions.preview.submit.folderMoved', {
			adjustToNumber: movedFolders.length,
			interpolate: { folders: movedFolders.map(({ name }) => `"${name}"`).join(', ') },
		});
	}
	if (hasSelectedBlocked.value) {
		return i18n.baseText(
			props.direction === 'promote'
				? 'promotions.preview.submit.blockedPromote'
				: 'promotions.preview.submit.blocked',
		);
	}
	// The changes view leaves blocked changes out. With nothing else to apply, it says why.
	if (isEnvironment.value && actionableChanges.value === 0 && blockerList.value.some(isBlocking)) {
		return i18n.baseText('promotions.preview.submit.blockedInstance');
	}
	return undefined;
});
const canSubmit = computed(
	() =>
		state.value === 'ready' &&
		!refreshing.value &&
		!operation.isBusy.value &&
		// The button follows the report of the current selection, so it waits for it.
		!checkingDependencies.value &&
		!submitBlockedReason.value &&
		!dependencies.stop.value &&
		actionableChanges.value > 0 &&
		(props.direction === 'promote' || !!check.value),
);
// With gaps on an environment that allows them, the button says what the user accepts.
const submitLabel = computed(() =>
	dependencies.needsGapConfirmation.value
		? i18n.baseText(`promotions.dependencies.submit.${props.direction}`, {
				adjustToNumber: dependencies.gapCount.value,
				interpolate: { count: String(dependencies.gapCount.value) },
			})
		: i18n.baseText(`promotions.preview.submit.${props.direction}`, {
				adjustToNumber: actionableChanges.value,
				interpolate: { count: String(actionableChanges.value) },
			}),
);

// Promote asks for the optional commit message first. Apply confirms inside the operation.
// An incomplete operation asks in the dialog of the gaps instead.
const promoteDialogOpen = ref(false);
const incompleteDialogOpen = ref(false);
// Lives here, not in the dialog, so the typed message survives a failed promote.
const promoteCommitMessage = ref('');
// The router reuses this view across projects, so a draft must not carry over.
watch(projectId, () => {
	promoteCommitMessage.value = '';
});

async function onSubmit() {
	if (dependencies.needsGapConfirmation.value) {
		incompleteDialogOpen.value = true;
		return;
	}
	if (props.direction === 'promote') {
		promoteDialogOpen.value = true;
		return;
	}
	await operation.submit(request.value);
}

async function onPromoteConfirm(commitMessage: string | undefined) {
	promoteDialogOpen.value = false;
	await operation.submit({ ...request.value, commitMessage });
}

async function onIncompleteConfirm(commitMessage: string | undefined) {
	incompleteDialogOpen.value = false;
	await operation.submit({
		...request.value,
		...(props.direction === 'promote' ? { commitMessage } : {}),
		confirmed: true,
	});
}

type PreviewTab = 'changes' | 'dependencies' | 'blockers';
const activeTab = ref<PreviewTab>('changes');
const blockerCount = computed(() => blockerList.value.filter(isBlocking).length);
const showBlockersTab = computed(
	() => props.direction === 'apply' && !!scopedCheck.value && state.value === 'ready',
);
// The tab exists when the server sends a report, or when the Apply moves items between projects.
const showDependenciesTab = computed(
	() => (!!dependencies.report.value || plannedMoves.value.length > 0) && state.value === 'ready',
);
/** A report with nothing in it, for a server that sends none. The tab then shows only the moves. */
const reportOrEmpty = computed(
	(): DependencyReport =>
		dependencies.report.value ?? {
			allowIncomplete: environment.value?.allowIncomplete ?? false,
			blocked: false,
			gaps: [],
			warnings: [],
			notes: [],
			grants: [],
			credentialMoves: [],
			deletionCallers: [],
			keptWorkflows: [],
			credentialHomeChoices: [],
			hardBlocks: [],
		},
);
watch([showBlockersTab, showDependenciesTab], ([blockersTab, dependenciesTab]) => {
	if (
		(activeTab.value === 'blockers' && !blockersTab) ||
		(activeTab.value === 'dependencies' && !dependenciesTab)
	) {
		activeTab.value = 'changes';
	}
});
const tabs = computed(() => [
	{
		value: 'changes' as const,
		label: i18n.baseText('promotions.preview.tab.changes'),
		tag: graph.value ? String(totalChanges.value) : undefined,
	},
	...(showDependenciesTab.value
		? [
				{
					value: 'dependencies' as const,
					label: i18n.baseText('promotions.dependencies.tab'),
					tag:
						dependencies.issueCount.value > 0 ? String(dependencies.issueCount.value) : undefined,
				},
			]
		: []),
	...(showBlockersTab.value
		? [
				{
					value: 'blockers' as const,
					label: i18n.baseText('promotions.preview.tab.blockers'),
					tag: blockerCount.value > 0 ? String(blockerCount.value) : undefined,
				},
			]
		: []),
]);

// Promote has no Blockers tab, so the tree's blocker icon only opens it on Apply.
function showBlockers() {
	if (showBlockersTab.value) activeTab.value = 'blockers';
}

async function inspectFromTab(key: string) {
	// A reference can come from a workflow that the page does not list.
	if (!graph.value?.resources.has(key)) return;
	activeTab.value = 'changes';
	// The cards must be visible before the page scrolls to one.
	await nextTick();
	await inspect(key);
}

// The operation wrote nothing and the page shows why, so it opens the tab that explains it.
watch(operation.notice, (notice) => {
	if (notice === 'newBlockers' && showBlockersTab.value) activeTab.value = 'blockers';
	if (notice === 'gapsChanged') activeTab.value = 'dependencies';
});

/**
 * "Include it". The changes view adds the item to its selection. A project page can only hold
 * items of its own project, so an item of another project continues in the changes view, with
 * the selection of this page.
 */
async function onInclude({ include, target }: GapTargetRow) {
	if (!include || !graph.value) return;
	const ownItem =
		include.projectId === props.projectId &&
		graph.value.resources.get(include.resourceKey)?.selectable === true;
	const name: [ResourceKey, string] = [include.resourceKey, target.name ?? target.id];
	if (props.projectId === undefined || ownItem) {
		includedNames.value = new Map([...includedNames.value, name]);
		selection.include(include.resourceKey, include.projectId);
		return;
	}
	setPromotionSelectionHandoff({
		direction: props.direction,
		fromProjectId: props.projectId,
		selected: [...selection.selected.value],
		extra: [[include.resourceKey, include.projectId]],
		report: dependencies.report.value ?? undefined,
		names: [name],
	});
	await router.push({
		name: PROMOTION_ENVIRONMENT_VIEWS[props.direction],
		query: {
			from: props.projectId,
			include: include.resourceKey,
			includeProject: include.projectId,
			...fixtureQuery.value,
		},
	});
}

/** The deleted workflows that the user can take out of the selection, by id. */
const removableDeletions = computed(
	() =>
		new Set(
			[...selection.selected.value].flatMap((key) => {
				const resource = graph.value?.resources.get(key);
				return resource?.type === 'workflow' && resource.change === 'deleted' ? [resource.id] : [];
			}),
		),
);

// "Ask the owner". The request goes to the inbox of the owner project. The fixtures bring
// their own sender.
const ownerRequest = usePromotionOwnerRequest(() => environment.value?.id);
const defaultOwnerRequester: PromotionOwnerRequester = async ({ gap }) =>
	await ownerRequest.send(gap);
const ownerRequester = shallowRef<PromotionOwnerRequester | undefined>(defaultOwnerRequester);

// The heading of each group of cards in the changes view: the project of the change.
const cardHeading = computed(() => {
	if (!isEnvironment.value) return undefined;
	const resources = graph.value?.resources;
	const shared = i18n.baseText('promotions.preview.cards.shared');
	return (resource: PromotionResource) => {
		const owner = resources ? projectIdOf(resources, resource) : undefined;
		return (owner === undefined ? undefined : projectNames.value.get(owner)) ?? shared;
	};
});

/** A new preview has a new revision, so the page asks for the report of the selection again. */
async function onRefresh() {
	await refresh();
}

watch(
	fixture,
	async (name) => {
		ownerRequester.value = name
			? (await loadPromotionFixture(name, props.direction)).ownerRequester
			: defaultOwnerRequester;
	},
	{ immediate: true },
);

// Users can resize the tree to read long names. The browser stores the width.
const panes = ref<HTMLElement | null>(null);
const treeResizer = useResizablePanel({
	container: panes,
	width: {
		localStorageKey: 'N8N_PROMOTION_PREVIEW_TREE_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.24, 240), 340),
		minSize: 240,
		maxSize: (size) => Math.min(size * 0.5, 640),
		snap: true,
	},
});
</script>

<template>
	<div :class="$style.page" data-test-id="promotion-preview-page">
		<header :class="$style.header">
			<N8nLink :to="backRoute" theme="text" size="small" data-test-id="promotion-preview-back">
				<span :class="$style.back"><N8nIcon icon="arrow-left" size="small" />{{ backLabel }}</span>
			</N8nLink>
			<div :class="$style.titleRow">
				<N8nHeading tag="h1" size="xlarge">{{ title }}</N8nHeading>
				<!-- Strict or incomplete decides what a gap does, so the page always says which. -->
				<N8nTooltip
					v-if="environment && state === 'ready'"
					:content="
						i18n.baseText(
							environment.allowIncomplete
								? `promotions.preview.mode.incomplete.tooltip.${direction}`
								: `promotions.preview.mode.strict.tooltip.${direction}`,
						)
					"
				>
					<N8nBadge
						:variant="environment.allowIncomplete ? 'info' : 'subtle'"
						data-test-id="promotion-preview-mode"
					>
						{{
							i18n.baseText(
								environment.allowIncomplete
									? 'promotions.preview.mode.incomplete'
									: 'promotions.preview.mode.strict',
							)
						}}
					</N8nBadge>
				</N8nTooltip>
			</div>
			<N8nText
				v-if="selectionSummary && state === 'ready'"
				size="small"
				color="text-base"
				role="status"
				:class="$style.summary"
				data-test-id="promotion-preview-summary"
			>
				{{ selectionSummary }}
			</N8nText>
			<div :class="$style.tabRow">
				<N8nTabs
					v-model="activeTab"
					:options="tabs"
					:class="$style.tabs"
					data-test-id="promotion-preview-tabs"
				/>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="small"
						icon="refresh-cw"
						:loading="refreshing"
						:disabled="operation.isBusy.value"
						data-test-id="promotion-preview-refresh"
						@click="onRefresh"
					>
						{{ i18n.baseText('promotions.preview.refresh') }}
					</N8nButton>
					<N8nButton
						:variant="isDestructive ? 'destructive' : 'brand'"
						size="small"
						:disabled="!canSubmit"
						:loading="operation.isRunning.value"
						data-test-id="promotion-preview-submit"
						@click="onSubmit"
					>
						{{ submitLabel }}
					</N8nButton>
				</div>
			</div>
		</header>

		<div v-if="state === 'loading'" :class="$style.state" data-test-id="promotion-preview-loading">
			<N8nLoading :rows="6" />
		</div>
		<N8nEmptyState
			v-else-if="state === 'disconnected'"
			:class="$style.state"
			:icon="{ type: 'icon', value: 'git-branch' }"
			:heading="i18n.baseText(`promotions.preview.state.disconnected.${direction}.title`)"
			:description="
				i18n.baseText(
					canOpenSettings
						? 'promotions.preview.state.disconnected.admin'
						: 'promotions.preview.state.disconnected.member',
				)
			"
			:button-text="
				canOpenSettings ? i18n.baseText('promotions.preview.state.disconnected.action') : undefined
			"
			data-test-id="promotion-preview-disconnected"
			@click:button="router.push({ name: PROMOTIONS_SETTINGS_VIEW })"
		/>
		<N8nEmptyState
			v-else-if="state === 'connectionFailed' || state === 'error'"
			:class="$style.state"
			:icon="{ type: 'icon', value: 'circle-alert' }"
			:heading="
				i18n.baseText(
					state === 'connectionFailed'
						? 'promotions.preview.state.connectionFailed'
						: 'promotions.preview.state.error',
				)
			"
			:button-text="i18n.baseText('promotions.preview.state.retry')"
			data-test-id="promotion-preview-error"
			@click:button="refresh"
		/>
		<PromotionReviewBlocker v-else-if="state === 'blocked'" :class="$style.state" />
		<N8nEmptyState
			v-else-if="state === 'empty'"
			:class="$style.state"
			:icon="{ type: 'icon', value: 'check' }"
			:heading="i18n.baseText(`promotions.preview.state.empty.${direction}.title`)"
			:description="i18n.baseText('promotions.preview.state.empty.description')"
			data-test-id="promotion-preview-empty"
		/>
		<template v-else-if="graph">
			<div v-if="operation.error.value || operation.notice.value" :class="$style.operationNotices">
				<N8nCallout
					v-if="operation.error.value"
					theme="danger"
					data-test-id="promotion-preview-operation-error"
				>
					<N8nText bold>{{ i18n.baseText(`promotions.preview.error.${direction}`) }}</N8nText>
					{{ operation.error.value.message }}
					{{ i18n.baseText(`promotions.preview.error.${operation.error.value.kind}`) }}
				</N8nCallout>
				<N8nCallout
					v-if="operation.notice.value"
					theme="warning"
					slim
					data-test-id="promotion-preview-operation-notice"
				>
					{{ i18n.baseText(`promotions.preview.notice.${operation.notice.value}`) }}
				</N8nCallout>
			</div>
			<div v-show="activeTab === 'changes'" ref="panes" :class="$style.panes">
				<N8nResizeWrapper
					:class="$style.tree"
					:style="{ width: `${treeResizer.width.value}px` }"
					:resizer="treeResizer"
					:supported-directions="['right']"
				>
					<PromotionResourceTree
						:tree="tree"
						:graph="graph"
						:selected="selection.selected.value"
						:inclusion="selection.inclusion.value"
						:included-changes="includedChanges"
						:total-changes="totalChanges"
						:inspected-key="inspectedKey"
						:disabled="disabledKeys"
						:locked="operation.isBusy.value"
						:direction="direction"
						:blockers="blockers"
						:projects="projects"
						:gap-keys="gapKeys"
						@show-blockers="showBlockers"
						@toggle="selection.toggle"
						@toggle-container="selection.toggleAllInside"
						@toggle-keys="selection.toggleKeys"
						@select-all="selection.selectAll"
						@clear="selection.clear"
						@inspect="inspect"
					/>
				</N8nResizeWrapper>
				<section :class="$style.cards">
					<!-- A disabled button cannot explain itself to keyboard users, so the reason shows here. -->
					<N8nCallout
						v-if="submitBlockedReason && !operation.error.value"
						theme="warning"
						slim
						data-test-id="promotion-preview-submit-blocked"
					>
						{{ submitBlockedReason }}
						<template v-if="showBlockersTab" #trailingContent>
							<N8nButton variant="outline" size="small" @click="activeTab = 'blockers'">
								{{ i18n.baseText('promotions.preview.card.viewBlockers') }}
							</N8nButton>
						</template>
					</N8nCallout>
					<PromotionDependencySummary
						v-if="
							dependencies.report.value &&
							(dependencies.issueCount.value > 0 || dependencies.stop.value)
						"
						:direction="direction"
						:gap-count="dependencies.gapCount.value"
						:hard-block-count="dependencies.report.value.hardBlocks.length"
						:stop="dependencies.stop.value"
						@view="activeTab = 'dependencies'"
					/>
					<N8nCallout
						v-if="isOwnerRequest"
						theme="info"
						slim
						data-test-id="promotion-preview-owner-request"
					>
						{{ i18n.baseText(`promotions.preview.ownerRequest.${direction}`) }}
					</N8nCallout>
					<N8nCallout
						v-else-if="origin !== undefined"
						theme="info"
						slim
						data-test-id="promotion-preview-across-projects"
					>
						{{
							i18n.baseText('promotions.preview.acrossProjects', {
								interpolate: { project: projectNames.get(origin) ?? '' },
							})
						}}
					</N8nCallout>
					<!-- A selection never deletes a project. The page says when the Apply does. -->
					<N8nCallout
						v-if="deletedProjects.length > 0"
						:theme="wholeInstance ? 'warning' : 'info'"
						slim
						data-test-id="promotion-preview-project-deletions"
					>
						{{
							i18n.baseText(
								wholeInstance
									? 'promotions.preview.projectDeletions.wholeInstance'
									: 'promotions.preview.projectDeletions.selection',
								{
									adjustToNumber: deletedProjects.length,
									interpolate: { projects: deletedProjectNames },
								},
							)
						}}
					</N8nCallout>
					<N8nCallout
						v-if="changedProjects.length > 0"
						theme="info"
						slim
						icon="arrow-left-right"
						data-test-id="promotion-preview-changed-projects"
					>
						{{ moveLabels.changedProjectsText(changedProjects) }}
						<template #trailingContent>
							<N8nButton variant="outline" size="small" @click="activeTab = 'dependencies'">
								{{ i18n.baseText('promotions.moves.view') }}
							</N8nButton>
						</template>
					</N8nCallout>
					<div
						v-if="unlistedIncluded.length > 0"
						:class="$style.included"
						data-test-id="promotion-preview-included"
					>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText(`promotions.preview.included.${direction}`) }}
						</N8nText>
						<ul :class="$style.includedList" role="list">
							<li v-for="item in unlistedIncluded" :key="item.key" :class="$style.includedItem">
								<N8nIcon icon="key-round" size="small" />
								<N8nText size="small" bold color="text-dark">{{ item.name }}</N8nText>
								<N8nButton
									variant="ghost"
									size="mini"
									icon="x"
									:disabled="operation.isBusy.value"
									:aria-label="
										i18n.baseText('promotions.preview.included.remove', {
											interpolate: { name: item.name },
										})
									"
									@click="selection.exclude(item.key)"
								/>
							</li>
						</ul>
					</div>
					<N8nCallout v-if="refreshFailed" theme="warning" slim>
						{{ i18n.baseText('promotions.preview.refreshFailed') }}
					</N8nCallout>
					<N8nCallout v-if="selection.dropped.value.length > 0" theme="info" slim>
						{{
							i18n.baseText('promotions.preview.dropped', {
								adjustToNumber: selection.dropped.value.length,
								interpolate: { count: String(selection.dropped.value.length) },
							})
						}}
					</N8nCallout>
					<PromotionChangeCards
						ref="cards"
						v-model:active-workflow="activeWorkflowKey"
						:order="order"
						:graph="graph"
						:direction="direction"
						:selected="selection.selected.value"
						:inclusion="selection.inclusion.value"
						:disabled="disabledKeys"
						:locked="operation.isBusy.value"
						:entries="details.entries.value"
						:inspected-key="inspectedKey"
						:blockers="blockers"
						:heading-of="cardHeading"
						:gap-keys="gapKeys"
						@view-dependencies="activeTab = 'dependencies'"
						@retry="details.retry"
						@refresh="refresh"
						@inspect="inspect"
						@toggle="selection.toggle"
						@toggle-container="selection.toggleAllInside"
					/>
				</section>
			</div>
			<PromotionBlockers
				v-if="showBlockersTab && scopedCheck"
				v-show="activeTab === 'blockers'"
				:class="$style.blockers"
				:check="scopedCheck"
				:busy="operation.isBusy.value"
				@refresh="refresh"
				@inspect="inspectFromTab"
			>
				<N8nCallout v-if="submitBlockedReason && !operation.error.value" theme="warning" slim>
					{{ submitBlockedReason }}
				</N8nCallout>
			</PromotionBlockers>
			<PromotionDependencyReport
				v-if="showDependenciesTab"
				v-show="activeTab === 'dependencies'"
				:class="$style.dependencies"
				:report="reportOrEmpty"
				:unchecked="!dependencies.report.value"
				:checking="checkingDependencies"
				:is-request-sent="ownerRequest.isSent"
				:direction="direction"
				:confirmations="dependencies.confirmations.value"
				:locked="operation.isBusy.value"
				:project-names="projectNames"
				:removable-deletions="removableDeletions"
				:environment-id="environment?.id"
				:owner-requester="ownerRequester"
				@include="onInclude"
				@remove-deletion="selection.exclude(`workflow:${$event}`)"
				@inspect="inspectFromTab"
				@grant="dependencies.setGrant"
				@deletion-callers="dependencies.setDeletionCallers"
				@credential-home="dependencies.setCredentialHome"
			>
				<template v-if="plannedMoves.length > 0" #moves>
					<PromotionPlannedMoves
						:moves="plannedMoves"
						:can-confirm="isEnvironment"
						@inspect="inspectFromTab"
					/>
				</template>
			</PromotionDependencyReport>
		</template>

		<PromoteSelectionDialog
			v-if="promoteDialogOpen && promoteEnvironment"
			v-model:open="promoteDialogOpen"
			v-model:commit-message="promoteCommitMessage"
			:change-count="includedChanges"
			:base-branch-name="promoteEnvironment.branchName"
			:create-branch-on-promotion="promoteEnvironment.createBranchOnPromotion"
			:provider-type="promoteEnvironment.providerType"
			@confirm="onPromoteConfirm"
		/>
		<PromotionIncompleteDialog
			v-if="incompleteDialogOpen && dependencies.report.value"
			v-model:open="incompleteDialogOpen"
			v-model:commit-message="promoteCommitMessage"
			:direction="direction"
			:report="dependencies.report.value"
			:project-names="projectNames"
			:opens-review="
				promoteEnvironment?.providerType === 'gitlab' && promoteEnvironment.createBranchOnPromotion
			"
			@confirm="onIncompleteConfirm"
		/>
		<PromotionApplyResultDialog
			v-if="operation.applied.value"
			:open="true"
			:result="operation.applied.value.result"
			:project-names="projectNames"
			@update:open="operation.closeApplied"
		/>
	</div>
</template>

<style module lang="scss">
.page {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
}

.header {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	/* The same inset as the tree rows and the card panel, so the tab divider lines up with both. */
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	background-color: var(--background--surface);
}

.titleRow {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--2xs);
}

/* The summary belongs to the title, so it takes the place of the space below it. */
.summary {
	margin-top: calc(-1 * var(--spacing--2xs));
	margin-bottom: var(--spacing--2xs);
}

.back {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.tabRow {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	border-bottom: var(--border);
}

.tabs {
	flex: 1;
	min-width: 0;
}

.actions {
	flex-shrink: 0;
	align-self: center;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.state {
	/* The empty states draw their own border, so the space goes outside them. */
	margin: var(--spacing--sm);
}

.operationNotices {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.blockers,
.dependencies {
	flex: 1;
	min-height: 0;
}

.panes {
	display: flex;
	flex: 1;
	min-height: 0;
}

.tree {
	flex-shrink: 0;
	min-height: 0;
	border-right: var(--border);
	background-color: var(--background--surface);
}

.included {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.includedList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.includedItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.cards {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--sm);
}
</style>
