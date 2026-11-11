<script lang="ts" setup>
import type {
	InboxItem,
	InboxPromotionReviewItem,
	InboxSelfHealingItem,
	InboxState,
	InboxWorkflowReviewItem,
} from '@n8n/api-types';
import { N8nResizeWrapper, useResizablePanel } from '@n8n/design-system';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

// Old shows the components of master. New shows the copies in ./new.
import InboxEmptyState from '../components/InboxEmptyState.vue';
import InboxList from '../components/InboxList.vue';
import type { InboxListSection } from '../components/InboxListSection.vue';
import type { InboxSelection } from '../inbox.constants';
import PromotionReviewDetail from '../promotions/PromotionReviewDetail.vue';
import WorkflowReviewDetail from '../reviews/WorkflowReviewDetail.vue';
import SelfHealingResultDetail from '../self-healing/SelfHealingResultDetail.vue';
import NewInboxList from './new/components/InboxList.vue';
import NewPromotionReviewDetail from './new/promotions/PromotionReviewDetail.vue';
import NewWorkflowReviewDetail from './new/reviews/WorkflowReviewDetail.vue';
import NewSelfHealingResultDetail from './new/self-healing/SelfHealingResultDetail.vue';
import { promotionActivityReview, prototypeItems } from './prototype.fixtures';
import { prototypeSession } from './prototype.session';
import { usePrototypeRequests } from './usePrototypeRequests';

// The same frame as InboxView. That view reads the selection from the route and loads the
// list from the server, so it cannot show the sample items.

// Before the detail views mount, so their first requests get the sample data.
usePrototypeRequests();

const contentRef = ref<HTMLElement | null>(null);
const sidebarResizer = useResizablePanel({
	container: contentRef,
	width: {
		localStorageKey: 'N8N_WORKFLOW_REVIEW_SIDEBAR_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.25, 240), 400),
		minSize: 240,
		maxSize: (size) => Math.min(size * 0.5, 640),
		snap: true,
	},
});
const sidebarWidth = sidebarResizer.width;

const activeTab = ref<InboxState>('open');
// New is the layout under construction. Old is the product as it is on master.
const changesLayout = ref<'new' | 'old'>('new');
const isNew = computed(() => changesLayout.value === 'new');
const views = computed(() =>
	isNew.value
		? {
				List: NewInboxList,
				WorkflowReview: NewWorkflowReviewDetail,
				PromotionReview: NewPromotionReviewDetail,
				SelfHealing: NewSelfHealingResultDetail,
			}
		: {
				List: InboxList,
				WorkflowReview: WorkflowReviewDetail,
				PromotionReview: PromotionReviewDetail,
				SelfHealing: SelfHealingResultDetail,
			},
);
// Props that only the New components have. Old gets none of them.
const workflowReviewNewProps = computed(() => (isNew.value ? { splitChanges: true } : {}));
const promotionReviewNewProps = computed(() =>
	isNew.value ? { activityReview: promotionActivityReview } : {},
);
const selfHealingNewProps = computed(() => (isNew.value ? { splitChanges: true } : {}));
const selection = ref<InboxSelection | null>(null);
const detailTab = ref<'activity' | 'changes'>('activity');

function section(key: InboxListSection['key'], items: InboxItem[]): InboxListSection {
	return {
		key,
		items,
		loading: false,
		loadingMore: false,
		hasMore: false,
		error: null,
		failedRequest: null,
		partial: false,
	};
}

function applyPatch(item: InboxItem): InboxItem {
	const patch = prototypeSession.patches[item.id];
	if (!patch) return item;

	if (item.type === 'workflow_review') {
		const next: InboxWorkflowReviewItem = { ...item };
		if (patch.title !== undefined) next.title = patch.title;
		if (patch.state !== undefined) next.state = patch.state;
		return next;
	}

	if (item.type === 'self_healing_result') {
		const next: InboxSelfHealingItem = { ...item };
		if (patch.title !== undefined) next.summary = patch.title;
		if (patch.state !== undefined) next.state = patch.state;
		return next;
	}

	const next: InboxPromotionReviewItem = { ...item };
	if (patch.title !== undefined) next.title = patch.title;
	if (patch.state !== undefined) {
		next.state = patch.state;
		next.reviewState = patch.state === 'closed' ? 'closed' : 'open';
	}
	return next;
}

const items = computed(() => prototypeItems.map(applyPatch));
const openItems = computed(() => items.value.filter((item) => item.state === 'open'));
const closedItems = computed(() => items.value.filter((item) => item.state === 'closed'));
const sections = computed(() =>
	activeTab.value === 'closed'
		? [section('closed', closedItems.value)]
		: [section('waiting', openItems.value), section('authored', [])],
);
const selectedKey = computed(() =>
	selection.value ? `${selection.value.type}:${selection.value.id}` : null,
);
const selectedItem = computed(() =>
	items.value.find((item) => `${item.type}:${item.id}` === selectedKey.value),
);
const selectedReviewItem = computed(() =>
	selectedItem.value?.type === 'workflow_review' ? selectedItem.value : undefined,
);
const selectedPromotionItem = computed(() =>
	selectedItem.value?.type === 'promotion_review' ? selectedItem.value : undefined,
);

let isMounted = false;

function isActive() {
	return isMounted;
}

function isSelected(type: InboxItem['type']) {
	return (id: string) => selection.value?.type === type && selection.value.id === id;
}

function onSelect(item: InboxItem) {
	if (selectedKey.value !== `${item.type}:${item.id}`) detailTab.value = 'activity';
	selection.value =
		item.type === 'self_healing_result'
			? { type: item.type, id: item.id, projectId: item.projectId, workflowId: item.workflowId }
			: { type: item.type, id: item.id };
}

// The sample items do not change: the write requests go to the server and fail.
function onItemChange() {}

prototypeSession.active = true;

onMounted(() => {
	isMounted = true;
});
onBeforeUnmount(() => {
	isMounted = false;
	prototypeSession.active = false;
});
</script>

<template>
	<div :class="$style.layout" data-test-id="inbox-prototype">
		<main ref="contentRef" :class="$style.content">
			<N8nResizeWrapper
				:class="$style.sidebarResizer"
				:style="{ width: `${sidebarWidth}px` }"
				:resizer="sidebarResizer"
				:supported-directions="['right']"
			>
				<component
					:is="views.List"
					:class="$style.sidebar"
					:sections="sections"
					:active-tab="activeTab"
					:selected-key="selectedKey"
					:open-count="openItems.length"
					:closed-count="closedItems.length"
					@select="onSelect"
					@clear="selection = null"
					@update:active-tab="activeTab = $event"
				/>
			</N8nResizeWrapper>
			<div :class="$style.main">
				<component
					:is="views.WorkflowReview"
					v-if="selection?.type === 'workflow_review'"
					:review-id="selection.id"
					:list-item="selectedReviewItem"
					:tab="detailTab"
					:on-item-change="onItemChange"
					:is-active="isActive"
					:is-selected="isSelected('workflow_review')"
					v-bind="workflowReviewNewProps"
					@update:tab="detailTab = $event"
				>
					<InboxEmptyState />
				</component>
				<component
					:is="views.PromotionReview"
					v-else-if="selectedPromotionItem"
					:item="selectedPromotionItem"
					:on-item-change="onItemChange"
					v-bind="promotionReviewNewProps"
				/>
				<component
					:is="views.SelfHealing"
					v-else-if="selection?.type === 'self_healing_result'"
					:selection="selection"
					:tab="detailTab"
					:on-item-change="onItemChange"
					:is-selected="isSelected('self_healing_result')"
					v-bind="selfHealingNewProps"
					@update:tab="detailTab = $event"
				/>
				<template v-else>
					<div :class="$style.columnTitle" />
					<div :class="$style.mainBody">
						<InboxEmptyState />
					</div>
				</template>
			</div>
		</main>
		<div :class="$style.switches">
			<div :class="$style.layoutSwitch" role="group" aria-label="Changes layout">
				<button
					type="button"
					:aria-pressed="changesLayout === 'old'"
					:class="{ [$style.active]: changesLayout === 'old' }"
					@click="changesLayout = 'old'"
				>
					Old
				</button>
				<button
					type="button"
					:aria-pressed="changesLayout === 'new'"
					:class="{ [$style.active]: changesLayout === 'new' }"
					@click="changesLayout = 'new'"
				>
					New
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	// The switches sit in this box, so the app sidebar never covers them.
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	padding-inline: var(--spacing--md);
	box-sizing: border-box;
}

.content {
	--review-callout--max-width: 34rem;
	--review-activity--max-width: 45rem;
	/* Keep the existing Reviews tab alignment at every root font size. */
	--review-tab-bar--indicator-overhang: 15px;
	display: flex;
	width: 100%;
	min-height: 0;
	height: 100%;
	overflow: hidden;
}
.sidebarResizer {
	flex: 0 0 auto;
}
.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
	padding: 0 0 var(--spacing--md) var(--spacing--md);
}
.sidebar,
.main {
	padding-top: var(--spacing--lg);

	@include breakpoints.breakpoint('sm-and-down') {
		padding-top: var(--spacing--sm);
	}
}
.columnTitle {
	min-height: var(--spacing--2xl);
	padding-bottom: var(--spacing--sm);
}
.mainBody {
	flex: 1;
	min-height: 0;
	overflow: auto;
}

// On a narrow window the toggle stays inside the content area.
.switches {
	position: absolute;
	z-index: 20;
	right: var(--spacing--lg);
	bottom: var(--spacing--lg);
	display: flex;
	justify-content: flex-end;
	max-width: calc(100% - 2 * var(--spacing--lg));
}

.layoutSwitch {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	max-width: 100%;
	padding: var(--spacing--5xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	box-shadow: var(--shadow--light);

	button {
		padding: var(--spacing--3xs) var(--spacing--sm);
		border: 0;
		border-radius: var(--radius--sm);
		background: transparent;
		white-space: nowrap;
		color: var(--color--text--tint-1);
		font-weight: var(--font-weight--regular);
		cursor: pointer;
	}

	.active {
		background: var(--color--orange-500);
		color: #fff;
		font-weight: var(--font-weight--bold);
	}
}
</style>
