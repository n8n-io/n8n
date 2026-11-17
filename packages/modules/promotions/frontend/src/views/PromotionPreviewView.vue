<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import {
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

import PromotionDependencyReport from '../components/dependencies/PromotionDependencyReport.vue';
import PromotionDependencySummary from '../components/dependencies/PromotionDependencySummary.vue';
import PromotionIncompleteDialog from '../components/dependencies/PromotionIncompleteDialog.vue';
import PromotionBlockers from '../components/preview/PromotionBlockers.vue';
import PromotionChangeCards from '../components/preview/PromotionChangeCards.vue';
import PromotionResourceTree from '../components/preview/PromotionResourceTree.vue';
import PromotionReviewBlocker from '../components/preview/PromotionReviewBlocker.vue';
import PromoteSelectionDialog from '../components/PromoteSelectionDialog.vue';
import { usePromotionDependencies } from '../composables/usePromotionDependencies';
import { usePromotionOperation, type OperationRequest } from '../composables/usePromotionOperation';
import { usePromotionResourceDetails } from '../composables/usePromotionResourceDetails';
import { usePromotionPreview } from '../composables/usePromotionPreview';
import { usePromotionSelection, type SelectionSeed } from '../composables/usePromotionSelection';
import type { GapTargetRow, PromotionOwnerRequester } from '../promotionDependencies';
import { loadPromotionFixture, promotionFixtureName } from '../promotionFixtures';
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
	crossProjectMoveBlockers,
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

const {
	state,
	preview,
	check,
	graph,
	projects,
	dependencyReport,
	environment,
	refreshing,
	refreshFailed,
	refresh,
} = usePromotionPreview(projectId, direction, { origin, fixture });
const promoteEnvironment = computed(() =>
	environment.value?.direction === 'promote' ? environment.value : null,
);
// A project page shows and enforces only the blockers of the workflows it lists.
const scopedCheck = computed(() => {
	if (!check.value || !graph.value) return null;
	return isEnvironment.value ? check.value : scopeCheck(check.value, graph.value);
});
// A project-wide conflict blocks all of them, so it also stops a selection without workflows.
const selectableResourceKeys = computed(() => (graph.value ? selectableKeys(graph.value) : []));
const blockerList = computed(() => [
	...(scopedCheck.value ? listBlockers(scopedCheck.value, selectableResourceKeys.value) : []),
	...(props.direction === 'promote' && graph.value ? crossProjectMoveBlockers(graph.value) : []),
]);
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

/**
 * The first selection of a changes view that continues a project page. A reload loses the
 * handoff, so the URL gives the changes of that project and the included items.
 */
function seedSelection(current: SelectionGraph): SelectionSeed | null {
	if (!isEnvironment.value || origin.value === undefined) return null;
	const handoff = takePromotionSelectionHandoff(props.direction, origin.value);
	if (handoff) return { selected: handoff.selected, extra: new Map(handoff.extra) };
	const included = [route.query.include].flat().flatMap((key) => queryValue(key) ?? []);
	return {
		selected: projectSelectableKeys(current, origin.value),
		extra: new Map(
			included.flatMap((key): Array<[ResourceKey, string]> => {
				const resource = current.resources.get(key);
				const owner = resource ? projectIdOf(current.resources, resource) : undefined;
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
const dependencies = usePromotionDependencies({
	source: dependencyReport,
	operationReport: operation.gapsReport,
	graph,
	included: computed(() => selection.inclusion.value.included),
	direction,
});

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

// The inspected card lives in the URL, so a direct link opens it. Replacing the entry keeps
// browser Back on the page that opened the preview.
const inspectedKey = computed(() =>
	typeof route.query.resource === 'string' ? route.query.resource : undefined,
);
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
 * An Apply that holds every change of the environment is the Apply of the whole instance. Only
 * that Apply also writes what users cannot select, such as the deletion of a project.
 */
const wholeInstance = computed(
	() =>
		isEnvironment.value &&
		props.direction === 'apply' &&
		origin.value === undefined &&
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
		: includedChangeCount(graph.value, selection.inclusion.value);
});
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
	if (wholeInstance.value) {
		return {
			...none,
			wholeInstance: true,
			confirmDestructiveChanges: blockerList.value.some(({ kind }) => kind === 'destructive'),
			deletedProjects: (check.value?.conflicts ?? []).flatMap((conflict) =>
				conflict.code === 'project-deletion' ? conflict.project.name : [],
			),
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
			confirmations,
		};
	}
	return {
		...toOperationRequest(graph.value, selection.selected.value),
		confirmDestructiveChanges,
		confirmations,
	};
});
const isDestructive = computed(
	() => request.value.confirmDestructiveChanges || !!request.value.deletedProjects?.length,
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
	return includedChangeCount(
		graph.value,
		resolveInclusion(graph.value, actionable, selection.extra.value.keys()),
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
// The tab exists when the server sends a report. An older server sends none.
const showDependenciesTab = computed(() => !!dependencies.report.value && state.value === 'ready');
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
async function onInclude({ include }: GapTargetRow) {
	if (!include || !graph.value) return;
	const ownItem =
		include.projectId === props.projectId &&
		graph.value.resources.get(include.resourceKey)?.selectable === true;
	if (props.projectId === undefined || ownItem) {
		selection.include(include.resourceKey, include.projectId);
		return;
	}
	setPromotionSelectionHandoff({
		direction: props.direction,
		fromProjectId: props.projectId,
		selected: [...selection.selected.value],
		extra: [[include.resourceKey, include.projectId]],
	});
	await router.push({
		name: PROMOTION_ENVIRONMENT_VIEWS[props.direction],
		query: { from: props.projectId, include: include.resourceKey, ...fixtureQuery.value },
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

// "Ask the owner". The owner-request composable plugs in here: replace `undefined` with its
// send function. The fixtures bring their own.
const defaultOwnerRequester: PromotionOwnerRequester | undefined = undefined;
const ownerRequester = shallowRef<PromotionOwnerRequester | undefined>(defaultOwnerRequester);
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
			<N8nHeading tag="h1" size="xlarge" :class="$style.title">{{ title }}</N8nHeading>
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
						@click="refresh"
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
						v-if="origin !== undefined"
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
				v-if="showDependenciesTab && dependencies.report.value"
				v-show="activeTab === 'dependencies'"
				:class="$style.dependencies"
				:report="dependencies.report.value"
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
			/>
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

.title {
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
