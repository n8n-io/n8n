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
import { computed, nextTick, ref, toRef, watch } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import PromotionBlockers from '../components/preview/PromotionBlockers.vue';
import PromotionChangeCards from '../components/preview/PromotionChangeCards.vue';
import PromotionResourceTree from '../components/preview/PromotionResourceTree.vue';
import { usePromotionOperation } from '../composables/usePromotionOperation';
import { usePromotionResourceDetails } from '../composables/usePromotionResourceDetails';
import { usePromotionPreview } from '../composables/usePromotionPreview';
import { usePromotionSelection } from '../composables/usePromotionSelection';
import { PROMOTIONS_SETTINGS_SCOPES, PROMOTIONS_SETTINGS_VIEW } from '../promotions.constants';
import {
	indexBlockers,
	isBlocking,
	listBlockers,
	locationBlocker,
	locationConflicts,
	toOperationRequest,
	scopeCheck,
	touchesDestructiveChange,
} from '../promotionOperation';
import { includedChangeCount, totalChangeCount } from '../promotionPreview.selection';
import { buildPreviewTree, cardOrder } from '../promotionPreview.tree';

const props = defineProps<{ projectId: string; direction: PromotionDirection }>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const projectsStore = useProjectsStore();
const rbacStore = useRBACStore();
const documentTitle = useDocumentTitle();

const projectId = toRef(props, 'projectId');
const direction = toRef(props, 'direction');

const {
	state,
	preview,
	check,
	graph,
	repositoryName,
	refreshing,
	refreshFailed,
	lastRefreshedAt,
	refresh,
} = usePromotionPreview(projectId, direction);
// The page shows and enforces only the blockers of the workflows it lists.
const scopedCheck = computed(() =>
	check.value && graph.value ? scopeCheck(check.value, graph.value) : null,
);
// Apply cannot move a workflow or a folder to another folder. The check does not report this,
// but the preview shows it. A moved folder stops the whole apply, so it blocks every selection.
const locations = computed(() =>
	props.direction === 'apply' && graph.value ? locationConflicts(graph.value) : [],
);
const folderConflicts = computed(() => locations.value.filter(({ type }) => type === 'folder'));
const blockerList = computed(() => [
	...(scopedCheck.value ? listBlockers(scopedCheck.value) : []),
	...locations.value.map(locationBlocker),
]);
const blockers = computed(() => indexBlockers(blockerList.value));
const operation = usePromotionOperation(projectId, direction, { preview, check, refresh });
const selection = usePromotionSelection(graph, {
	disabled: computed(() => blockers.value.blocked),
	locked: operation.isBusy,
});
const details = usePromotionResourceDetails(projectId, direction, preview, graph);

const title = computed(() => i18n.baseText(`promotions.preview.title.${props.direction}`));
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
async function inspect(key: string) {
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
	if (folderConflicts.value.length > 0) {
		return i18n.baseText('promotions.preview.submit.folderMoved', {
			adjustToNumber: folderConflicts.value.length,
			interpolate: { folders: folderConflicts.value.map(({ name }) => `"${name}"`).join(', ') },
		});
	}
	return hasSelectedBlocked.value ? i18n.baseText('promotions.preview.submit.blocked') : undefined;
});
const canSubmit = computed(
	() =>
		state.value === 'ready' &&
		!refreshing.value &&
		!operation.isBusy.value &&
		!submitBlockedReason.value &&
		request.value.workflowIds.length > 0 &&
		(props.direction === 'promote' || !!check.value),
);
const submitLabel = computed(() => {
	if (props.direction === 'apply' && request.value.confirmDestructiveChanges) {
		return i18n.baseText('promotions.bindings.applyDataTableChanges');
	}
	return i18n.baseText(`promotions.preview.submit.${props.direction}`, {
		adjustToNumber: includedChanges.value,
		interpolate: { count: String(includedChanges.value) },
	});
});

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
		tag: String(totalChanges.value),
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
		defaultSize: (size) => Math.min(Math.max(size * 0.28, 280), 420),
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
				<div :class="$style.meta">
					<div :class="$style.details">
						<N8nText v-if="preview && repositoryName" step="xs" color="text-light">
							{{ repositoryName }}
						</N8nText>
						<N8nText v-if="preview" step="xs" color="text-light">
							{{
								i18n.baseText(`promotions.preview.branch.${direction}`, {
									interpolate: { branch: preview.source.branchName },
								})
							}}
						</N8nText>
						<N8nText v-if="lastRefreshedAt" step="xs" color="text-light">
							<I18nT keypath="promotions.preview.lastRefreshed" scope="global">
								<template #time>
									<TimeAgo :date="lastRefreshedAt.toISOString()" live />
								</template>
							</I18nT>
						</N8nText>
					</div>
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
						@click="operation.submit(request)"
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
						@show-blockers="activeTab = 'blockers'"
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
						:order="order"
						:graph="graph"
						:direction="direction"
						:inclusion="selection.inclusion.value"
						:entries="details.entries.value"
						:inspected-key="inspectedKey"
						:blockers="blockers"
						@retry="details.retry"
						@refresh="refresh"
						@inspect="inspect"
					/>
				</section>
			</div>
			<PromotionBlockers
				v-if="showBlockersTab && scopedCheck"
				v-show="activeTab === 'blockers'"
				:class="$style.blockers"
				:project-id="projectId"
				:check="scopedCheck"
				:locations="locations"
				:busy="operation.isBusy.value"
				@refresh="refresh"
				@inspect="inspectFromBlockers"
			>
				<N8nCallout v-if="submitBlockedReason && !operation.error.value" theme="warning" slim>
					{{ submitBlockedReason }}
				</N8nCallout>
			</PromotionBlockers>
		</template>
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
	/* N8nTabs draws its active indicator this far below its own box. Reserving the space puts the
	   indicator on the divider, as in the inbox. No token matches this value. */
	--promotion-preview--tab-overhang: 14px;

	display: flex;
	align-items: flex-end;
	padding-bottom: var(--promotion-preview--tab-overhang);
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	border-bottom: var(--border);
}

.tabs {
	flex: 1;
	min-width: 0;
}

.meta {
	flex-shrink: 0;
	/* Centers the group on the tab label, which sits half the overhang below the tab box. */
	margin-bottom: calc(var(--promotion-preview--tab-overhang) / -2);
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--sm);
}

.details {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	column-gap: var(--spacing--2xs);
}

.details > * + *::before {
	content: '·' / '';
	margin-right: var(--spacing--2xs);
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
