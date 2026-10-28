<script setup lang="ts">
import type { PromotionReviewChanges } from '@n8n/api-types';
import {
	N8nCallout,
	N8nEmptyState,
	N8nLoading,
	N8nResizeWrapper,
	useResizablePanel,
} from '@n8n/design-system';
import type { PromotionChangesState, SlotPromotionChangesProps } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, provide, ref, shallowRef, watch } from 'vue';

import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';

import { usePromotionResourceDetails } from '../../composables/usePromotionResourceDetails';
import { indexBlockers } from '../../promotionOperation';
import { PromotionAbsentSideLabelsKey } from '../../promotionPreview.content';
import {
	buildSelectionGraph,
	totalChangeCount,
	type Inclusion,
	type ResourceKey,
} from '../../promotionPreview.selection';
import { buildPreviewTree, cardOrder } from '../../promotionPreview.tree';
import { defaultActiveWorkflow, hasWorkflowDiff } from '../../promotionPreview.workflow';
import { httpUrl } from '../../promotionResult';
import { getPromotionReviewChanges, getPromotionReviewDetails } from '../../promotions.api';
import PromotionChangeCards from '../preview/PromotionChangeCards.vue';
import PromotionResourceTree from '../preview/PromotionResourceTree.vue';

const props = defineProps<SlotPromotionChangesProps>();
const emit = defineEmits<{ state: [state: PromotionChangesState] }>();

const i18n = useI18n();
const rootStore = useRootStore();

// A review is read-only: nothing is selected, blocked, or included.
const noInclusion: Inclusion = { included: new Set(), reasons: new Map() };
const noKeys: ReadonlySet<ResourceKey> = new Set();
const noBlockers = indexBlockers([]);

provide(PromotionAbsentSideLabelsKey, {
	before: i18n.baseText('promotions.review.side.added'),
	after: i18n.baseText('promotions.review.side.removed'),
});

const state = ref<'loading' | 'error' | 'ready'>('loading');
const errorMessage = ref<string>();
const changes = shallowRef<PromotionReviewChanges | null>(null);
// Each load counts up, so the answer for a review that is no longer shown is dropped.
let generation = 0;

async function load() {
	const current = ++generation;
	state.value = 'loading';
	changes.value = null;
	emit('state', { status: 'loading' });
	try {
		const result = await getPromotionReviewChanges(rootStore.restApiContext, props.reviewId);
		if (current !== generation) return;
		changes.value = result;
		state.value = 'ready';
		// Approve sends the head that the reviewer saw. A warning means there was nothing to see.
		emit(
			'state',
			result.warnings.length > 0
				? { status: 'unavailable' }
				: { status: 'ready', headCommitSha: result.headCommitSha },
		);
	} catch (error) {
		if (current !== generation) return;
		errorMessage.value = error instanceof Error ? error.message : undefined;
		state.value = 'error';
		emit('state', { status: 'unavailable' });
	}
}

// The host dropped the commits of a finished review. What is left to show is how it ended.
const outcome = computed(() =>
	changes.value?.warnings.includes('commitsUnavailable') ? changes.value.outcome : null,
);
const outcomeDescription = computed(() => {
	if (!outcome.value) return undefined;
	const { state, at, by } = outcome.value;
	const date = at ? convertToDisplayDate(at).date : null;
	if (by && date) {
		return i18n.baseText(`promotions.review.outcome.${state}.description`, {
			interpolate: { user: by, date },
		});
	}
	if (date) {
		return i18n.baseText(`promotions.review.outcome.${state}.descriptionNoUser`, {
			interpolate: { date },
		});
	}
	if (by) {
		return i18n.baseText(`promotions.review.outcome.${state}.descriptionNoDate`, {
			interpolate: { user: by },
		});
	}
	return i18n.baseText('promotions.review.outcome.description.unknown');
});
function openOnHost() {
	const url = httpUrl(outcome.value?.webUrl);
	if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

const inspectedKey = ref<ResourceKey>();
watch(
	() => props.reviewId,
	async () => {
		inspectedKey.value = undefined;
		await load();
	},
	{ immediate: true },
);

// Before is the target branch and after is the review, as in a promotion.
const graph = computed(() =>
	changes.value ? buildSelectionGraph(changes.value, 'promote') : null,
);
const tree = computed(() =>
	changes.value
		? buildPreviewTree(changes.value, {
				workflows: i18n.baseText('promotions.preview.tree.section.workflows'),
				group: (group) => i18n.baseText(`promotions.preview.tree.group.${group}`),
			})
		: [],
);
const order = computed(() => (graph.value ? cardOrder(tree.value, graph.value.resources) : []));
const totalChanges = computed(() => (graph.value ? totalChangeCount(graph.value) : 0));

// One workflow diff is open at a time. Each load opens the inspected or the first changed workflow.
const activeWorkflowKey = ref<ResourceKey>();
watch(order, (keys) => {
	if (activeWorkflowKey.value && keys.includes(activeWorkflowKey.value)) return;
	activeWorkflowKey.value = graph.value
		? defaultActiveWorkflow(keys, graph.value.resources, inspectedKey.value)
		: undefined;
});

// The details repeat the commits of the summary, so the cards match it after the review moves.
const details = usePromotionResourceDetails(
	async (keys) => {
		const { baselineCommitSha, headCommitSha } = changes.value ?? {};
		if (!baselineCommitSha || !headCommitSha) return { details: [], missingKeys: keys };
		return await getPromotionReviewDetails(rootStore.restApiContext, props.reviewId, {
			baselineCommitSha,
			headCommitSha,
			keys,
		});
	},
	changes,
	graph,
	activeWorkflowKey,
);

const cards = ref<InstanceType<typeof PromotionChangeCards> | null>(null);
async function inspect(key: ResourceKey) {
	const resource = graph.value?.resources.get(key);
	if (resource && hasWorkflowDiff(resource)) activeWorkflowKey.value = key;
	// The watcher in the cards does not fire for the same key, so scroll to it again directly.
	if (key === inspectedKey.value) await cards.value?.scrollToCard(key);
	else inspectedKey.value = key;
}

// Users can resize the tree to read long names. The browser stores the width.
const panes = ref<HTMLElement | null>(null);
const treeResizer = useResizablePanel({
	container: panes,
	width: {
		localStorageKey: 'N8N_PROMOTION_REVIEW_TREE_WIDTH',
		defaultSize: (size) => Math.min(Math.max(size * 0.28, 240), 360),
		minSize: 200,
		maxSize: (size) => Math.min(size * 0.5, 640),
		snap: true,
	},
});
</script>

<template>
	<div :class="$style.changes" data-test-id="promotion-review-changes">
		<div v-if="state === 'loading'" :class="$style.state" data-test-id="promotion-review-loading">
			<N8nLoading :rows="6" />
		</div>
		<N8nEmptyState
			v-else-if="state === 'error'"
			:class="$style.state"
			:icon="{ type: 'icon', value: 'circle-alert' }"
			:heading="i18n.baseText('promotions.review.state.error')"
			:description="errorMessage"
			:button-text="i18n.baseText('promotions.preview.state.retry')"
			data-test-id="promotion-review-error"
			@click:button="load"
		/>
		<template v-else-if="changes && graph">
			<N8nEmptyState
				v-if="outcome"
				:class="$style.state"
				:icon="{ type: 'icon', value: outcome.state === 'merged' ? 'check' : 'circle-check' }"
				:heading="i18n.baseText(`promotions.review.outcome.${outcome.state}.title`)"
				:description="outcomeDescription"
				:button-text="i18n.baseText('promotions.review.outcome.openOnHost')"
				button-variant="outline"
				data-test-id="promotion-review-outcome"
				@click:button="openOnHost"
			>
				<!-- The slot renders the host user name as text. The prop would render it as HTML. -->
				<template #description>{{ outcomeDescription }}</template>
			</N8nEmptyState>
			<div v-else-if="changes.warnings.length > 0" :class="$style.notices">
				<N8nCallout
					v-for="warning in changes.warnings"
					:key="warning"
					theme="warning"
					slim
					data-test-id="promotion-review-warning"
				>
					{{ i18n.baseText(`promotions.review.warning.${warning}`) }}
				</N8nCallout>
			</div>
			<N8nEmptyState
				v-else-if="totalChanges === 0"
				:class="$style.state"
				:icon="{ type: 'icon', value: 'check' }"
				:heading="i18n.baseText('promotions.review.state.empty.title')"
				:description="i18n.baseText('promotions.review.state.empty.description')"
				data-test-id="promotion-review-empty"
			/>
			<div v-else ref="panes" :class="$style.panes">
				<N8nResizeWrapper
					:class="$style.tree"
					:style="{ width: `${treeResizer.width.value}px` }"
					:resizer="treeResizer"
					:supported-directions="['right']"
				>
					<PromotionResourceTree
						:tree="tree"
						:graph="graph"
						:selected="noKeys"
						:inclusion="noInclusion"
						:included-changes="0"
						:total-changes="totalChanges"
						:inspected-key="inspectedKey"
						:disabled="noKeys"
						:locked="true"
						direction="promote"
						:blockers="noBlockers"
						:selectable="false"
						@inspect="inspect"
					/>
				</N8nResizeWrapper>
				<section :class="$style.cards">
					<PromotionChangeCards
						ref="cards"
						v-model:active-workflow="activeWorkflowKey"
						:order="order"
						:graph="graph"
						direction="promote"
						:inclusion="noInclusion"
						:selected="noKeys"
						:disabled="noKeys"
						:locked="true"
						:entries="details.entries.value"
						:inspected-key="inspectedKey"
						:blockers="noBlockers"
						:selectable="false"
						@retry="details.retry"
						@refresh="load"
						@inspect="inspect"
					/>
				</section>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.changes {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.state {
	/* The empty states draw their own border, so the space goes outside them. The right space
	   matches the gutter of the inbox detail. */
	margin: var(--spacing--sm) var(--spacing--md) var(--spacing--sm) 0;
}

.notices {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md) 0 0;
}

.panes {
	display: flex;
	flex: 1;
	min-height: 0;
}

.tree {
	flex-shrink: 0;
	min-height: 0;
	/* Takes back the inset of the tree and its rows, so the row text lines up with the heading. */
	margin-left: calc(-2 * var(--spacing--2xs));
	border-right: var(--border);
}

.cards {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	min-height: 0;
	overflow-y: auto;
	/* The scroll bar stays at the edge, and the cards end where the tab row divider ends. */
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--sm) var(--spacing--sm);
}
</style>
