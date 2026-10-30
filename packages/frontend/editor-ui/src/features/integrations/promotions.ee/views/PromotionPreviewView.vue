<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
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
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import PromotionBlockers from '../components/preview/PromotionBlockers.vue';
import PromotionChangeCards from '../components/preview/PromotionChangeCards.vue';
import PromotionResourceTree from '../components/preview/PromotionResourceTree.vue';
import PromotionReviewBlocker from '../components/preview/PromotionReviewBlocker.vue';
import PromoteSelectionDialog from '../components/PromoteSelectionDialog.vue';
import { usePromotionOperation } from '../composables/usePromotionOperation';
import { usePromotionResourceDetails } from '../composables/usePromotionResourceDetails';
import { usePromotionPreview } from '../composables/usePromotionPreview';
import { usePromotionSelection } from '../composables/usePromotionSelection';
import { getPromotionResourceDetails } from '../promotions.api';
import { PROMOTIONS_SETTINGS_SCOPES, PROMOTIONS_SETTINGS_VIEW } from '../promotions.constants';
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
	includedChangeCount,
	resolveInclusion,
	totalChangeCount,
	type ResourceKey,
} from '../promotionPreview.selection';
import { defaultActiveWorkflow, hasWorkflowDiff } from '../promotionPreview.workflow';
import { buildPreviewTree, cardOrder } from '../promotionPreview.tree';

const props = defineProps<{ projectId: string; direction: PromotionDirection }>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const rbacStore = useRBACStore();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();

const projectId = toRef(props, 'projectId');
const direction = toRef(props, 'direction');

const { state, preview, check, graph, environment, refreshing, refreshFailed, refresh } =
	usePromotionPreview(projectId, direction);
const promoteEnvironment = computed(() =>
	environment.value?.direction === 'promote' ? environment.value : null,
);
// The page shows and enforces only the blockers of the workflows it lists.
const scopedCheck = computed(() =>
	check.value && graph.value ? scopeCheck(check.value, graph.value) : null,
);
const listedWorkflowKeys = computed(() =>
	graph.value
		? [...graph.value.resources.values()]
				.filter(({ type, selectable }) => type === 'workflow' && selectable)
				.map(({ key }) => key)
		: [],
);
const blockerList = computed(() => [
	...(scopedCheck.value ? listBlockers(scopedCheck.value, listedWorkflowKeys.value) : []),
	...(props.direction === 'promote' && graph.value ? crossProjectMoveBlockers(graph.value) : []),
]);
const blockers = computed(() => indexBlockers(blockerList.value));
const operation = usePromotionOperation(projectId, direction, { preview, check, refresh });
const selection = usePromotionSelection(graph, {
	disabled: computed(() => blockers.value.blocked),
	locked: operation.isBusy,
});
const activeWorkflowKey = ref<ResourceKey>();
const details = usePromotionResourceDetails(
	async (keys) =>
		await getPromotionResourceDetails(rootStore.restApiContext, props.projectId, props.direction, {
			commitSha: preview.value?.commitSha ?? null,
			keys,
		}),
	preview,
	graph,
	activeWorkflowKey,
);

const projectName = computed(() =>
	projectsStore.currentProject?.id === props.projectId
		? projectsStore.currentProject.name
		: preview.value?.resources.find(
				(resource) => resource.type === 'project' && resource.id === props.projectId,
			)?.name,
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

const tree = computed(() =>
	preview.value
		? buildPreviewTree(preview.value, {
				workflows: i18n.baseText('promotions.preview.tree.section.workflows'),
				group: (group) => i18n.baseText(`promotions.preview.tree.group.${group}`),
			})
		: [],
);
const order = computed(() => (graph.value ? cardOrder(tree.value, graph.value.resources) : []));

// The inspected card lives in the URL, so a direct link opens it. Replacing the entry keeps
// browser Back on the page that opened the preview.
const inspectedKey = computed(() =>
	typeof route.query.resource === 'string' ? route.query.resource : undefined,
);
const cards = ref<InstanceType<typeof PromotionChangeCards> | null>(null);

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

const projectRoute = computed(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: props.projectId },
}));
const backLabel = computed(() =>
	i18n.baseText('promotions.preview.back', {
		interpolate: { project: projectsStore.currentProject?.name ?? '' },
	}),
);

const totalChanges = computed(() => (graph.value ? totalChangeCount(graph.value) : 0));
const includedChanges = computed(() =>
	graph.value ? includedChangeCount(graph.value, selection.inclusion.value) : 0,
);

const request = computed(() => {
	const { workflowIds } = graph.value
		? toOperationRequest(graph.value, selection.selected.value)
		: { workflowIds: [] };
	return {
		workflowIds,
		confirmDestructiveChanges: touchesDestructiveChange(blockers.value, selection.selected.value),
	};
});
const hasSelectedBlocked = computed(() =>
	[...selection.selected.value].some((key) => blockers.value.blocked.has(key)),
);
const submitBlockedReason = computed(() => {
	// A folder that moved to another project stops the whole apply, so it blocks every selection.
	const movedFolders = scopedCheck.value?.movedFolders ?? [];
	if (movedFolders.length > 0) {
		return i18n.baseText('promotions.preview.submit.folderMoved', {
			adjustToNumber: movedFolders.length,
			interpolate: { folders: movedFolders.map(({ name }) => `"${name}"`).join(', ') },
		});
	}
	if (!hasSelectedBlocked.value) return undefined;
	return i18n.baseText(
		props.direction === 'promote'
			? 'promotions.preview.submit.blockedPromote'
			: 'promotions.preview.submit.blocked',
	);
});
const actionableChanges = computed(() => {
	if (!graph.value || scopedCheck.value?.movedFolders.length) return 0;
	const actionable = new Set(
		[...selection.selected.value].filter((key) => !blockers.value.blocked.has(key)),
	);
	return includedChangeCount(graph.value, resolveInclusion(graph.value, actionable));
});
const canSubmit = computed(
	() =>
		state.value === 'ready' &&
		!refreshing.value &&
		!operation.isBusy.value &&
		!submitBlockedReason.value &&
		request.value.workflowIds.length > 0 &&
		actionableChanges.value > 0 &&
		(props.direction === 'promote' || !!check.value),
);
const submitLabel = computed(() =>
	i18n.baseText(`promotions.preview.submit.${props.direction}`, {
		adjustToNumber: actionableChanges.value,
		interpolate: { count: String(actionableChanges.value) },
	}),
);

// Promote asks for the optional commit message first. Apply confirms inside the operation.
const promoteDialogOpen = ref(false);
// Lives here, not in the dialog, so the typed message survives a failed promote.
const promoteCommitMessage = ref('');
// The router reuses this view across projects, so a draft must not carry over.
watch(projectId, () => {
	promoteCommitMessage.value = '';
});

async function onSubmit() {
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

type PreviewTab = 'changes' | 'blockers';
const activeTab = ref<PreviewTab>('changes');
const blockerCount = computed(() => blockerList.value.filter(isBlocking).length);
const showBlockersTab = computed(
	() => props.direction === 'apply' && !!scopedCheck.value && state.value === 'ready',
);
watch(showBlockersTab, (show) => {
	if (!show) activeTab.value = 'changes';
});
const tabs = computed(() => [
	{
		value: 'changes' as const,
		label: i18n.baseText('promotions.preview.tab.changes'),
		tag: graph.value ? String(totalChanges.value) : undefined,
	},
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

async function inspectFromBlockers(key: string) {
	activeTab.value = 'changes';
	// The cards must be visible before the page scrolls to one.
	await nextTick();
	await inspect(key);
}

// Apply found blockers that the check did not show, so the page opens them.
watch(operation.notice, (notice) => {
	if (notice === 'newBlockers') activeTab.value = 'blockers';
});

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
			<N8nLink :to="projectRoute" theme="text" size="small" data-test-id="promotion-preview-back">
				<span :class="$style.back"><N8nIcon icon="arrow-left" size="small" />{{ backLabel }}</span>
			</N8nLink>
			<N8nHeading tag="h1" size="xlarge" :class="$style.title">{{ title }}</N8nHeading>
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
						:variant="request.confirmDestructiveChanges ? 'destructive' : 'brand'"
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
						:disabled="blockers.blocked"
						:locked="operation.isBusy.value"
						:direction="direction"
						:blockers="blockers"
						@show-blockers="showBlockers"
						@toggle="selection.toggle"
						@toggle-container="selection.toggleAllInside"
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
						:disabled="blockers.blocked"
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
				@inspect="inspectFromBlockers"
			>
				<N8nCallout v-if="submitBlockedReason && !operation.error.value" theme="warning" slim>
					{{ submitBlockedReason }}
				</N8nCallout>
			</PromotionBlockers>
		</template>

		<PromoteSelectionDialog
			v-if="promoteDialogOpen && promoteEnvironment"
			v-model:open="promoteDialogOpen"
			v-model:commit-message="promoteCommitMessage"
			:change-count="includedChanges"
			:base-branch-name="promoteEnvironment.settings.baseBranchName"
			:create-branch-on-promotion="promoteEnvironment.settings.createBranchOnPromotion"
			:provider-type="promoteEnvironment.provider.type"
			@confirm="onPromoteConfirm"
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

.blockers {
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
