<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nPagination, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';

import CollectionCard from '../components/EvalCollectionsListView/CollectionCard.vue';
import SetupCollectionWizard from '../components/SetupCollectionWizard/SetupCollectionWizard.vue';
import UngroupedRunRow from '../components/EvalCollectionsListView/UngroupedRunRow.vue';
import { useEvalCollectionsStore } from '../evalCollections.store';
import { useEvaluationStore } from '../evaluation.store';

const props = defineProps<{
	workflowId: string;
	// When set, the collections list paginates to this many cards per page (used
	// when stacked with the config-eval hub). Omitted → the full list renders.
	pageSize?: number;
}>();

const i18n = useI18n();
const toast = useToast();
const store = useEvalCollectionsStore();
const evaluationStore = useEvaluationStore();

const wizardOpen = ref(false);

const collections = computed(() => store.getCollections(props.workflowId));

const collectionsPage = ref(1);
const showCollectionsPagination = computed(
	() => !!props.pageSize && collections.value.length > props.pageSize,
);
const pagedCollections = computed(() => {
	if (!props.pageSize) return collections.value;
	const start = (collectionsPage.value - 1) * props.pageSize;
	return collections.value.slice(start, start + props.pageSize);
});

// Clamp the page if the collection set shrinks (delete) so we don't strand the
// user on an empty page past the end.
watch(
	() => collections.value.length,
	() => {
		const maxPage = props.pageSize
			? Math.max(1, Math.ceil(collections.value.length / props.pageSize))
			: 1;
		if (collectionsPage.value > maxPage) collectionsPage.value = maxPage;
	},
);

const ungroupedRuns = computed(() => {
	const all = evaluationStore.testRunsByWorkflowId[props.workflowId] ?? [];
	return all
		.filter((r) => !r.collectionId)
		.sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
});

// `evaluationConfigId → name` lookup so each ungrouped row can render the
// dataset chip without re-fetching. Same map is reused by `CollectionCard`
// to fill in the meta line's dataset segment. Sourced from the evaluation
// store, which owns evaluation-config state.
const datasetNameByConfigId = computed<Record<string, string>>(() => {
	const map: Record<string, string> = {};
	for (const cfg of evaluationStore.evaluationConfigsByWorkflowId[props.workflowId] ?? []) {
		map[cfg.id] = cfg.name;
	}
	return map;
});

const onOpenWizard = () => {
	wizardOpen.value = true;
};

const onCreated = async () => {
	// Refresh both: the new collection card AND the test runs, so any runs that
	// were pulled into the collection stop showing under "Ungrouped runs".
	await Promise.all([
		store.fetchCollections(props.workflowId),
		evaluationStore.fetchTestRuns(props.workflowId),
	]);
};

const loadForWorkflow = async (workflowId: string) => {
	try {
		await Promise.all([
			store.fetchCollections(workflowId),
			evaluationStore.fetchEvaluationConfigs(workflowId).catch(() => null),
			evaluationStore.fetchTestRuns(workflowId),
		]);
		// Pre-fetch first 3 details so mini bar charts render on first paint;
		// further cards lazy-load when they scroll into view (see CollectionCard).
		await Promise.all(
			store
				.getCollections(workflowId)
				.slice(0, 3)
				.map((c) => store.fetchCollectionDetail(workflowId, c.id).catch(() => null)),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.collections.errors.fetchFailed'));
	}
};

onMounted(async () => {
	await loadForWorkflow(props.workflowId);
});

// Tear down every polling loop this view starts. It arms two: the collections
// store's own poll AND the evaluation store's per-run poll (via fetchTestRuns).
const stopAllPolling = () => {
	store.cleanupPolling();
	evaluationStore.cleanupPolling();
};

// The evaluation route reuses this component instance across workflows (only
// the `:workflowId` param changes), so `onBeforeUnmount` doesn't fire on that
// navigation. Tear down the previous workflow's polling loops and reload, or a
// stale timer keeps hitting the backend for a workflow the user has left.
watch(
	() => props.workflowId,
	async (next, prev) => {
		if (next === prev) return;
		// Reset to the first page: the length-based clamp below won't fire when the
		// new workflow happens to have the same cached collection count, which would
		// otherwise strand the user on the previous workflow's page.
		collectionsPage.value = 1;
		stopAllPolling();
		await loadForWorkflow(next);
	},
);

onBeforeUnmount(() => {
	stopAllPolling();
});
</script>

<template>
	<div :class="$style.viewWrapper">
		<div :class="$style.view" data-test-id="eval-collections-list-view">
			<header :class="$style.header">
				<div :class="$style.headerText">
					<N8nText tag="h2" size="xlarge" bold>
						{{ i18n.baseText('evaluation.collections.title') }}
					</N8nText>
					<N8nText tag="p" size="small" color="text-base">
						{{ i18n.baseText('evaluation.collections.subtitle') }}
					</N8nText>
				</div>
				<N8nButton
					variant="solid"
					icon="plus"
					:label="i18n.baseText('evaluation.collections.newCollection')"
					data-test-id="eval-collections-new-button"
					@click="onOpenWizard"
				/>
			</header>

			<section :class="$style.section">
				<div :class="$style.sectionHeader">
					<N8nText tag="h3" size="medium" bold>
						{{ i18n.baseText('evaluation.collections.section.collections') }}
					</N8nText>
					<N8nBadge theme="tertiary" size="small">{{ collections.length }}</N8nBadge>
				</div>

				<div v-if="collections.length === 0" :class="$style.emptyHint">
					<N8nIcon icon="layers" size="medium" />
					<div :class="$style.emptyHintBody">
						<N8nText size="small" bold>
							{{ i18n.baseText('evaluation.collections.empty.title') }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{ i18n.baseText('evaluation.collections.empty.subtitle') }}
						</N8nText>
					</div>
				</div>

				<CollectionCard
					v-for="collection in pagedCollections"
					:key="collection.id"
					:collection="collection"
					:detail="store.getDetail(collection.id)"
					:workflow-id="workflowId"
					:dataset-name="datasetNameByConfigId[collection.evaluationConfigId]"
				/>

				<N8nPagination
					v-if="showCollectionsPagination"
					:class="$style.pagination"
					layout="prev, pager, next"
					:current-page="collectionsPage"
					:page-size="pageSize"
					:total="collections.length"
					@update:current-page="collectionsPage = $event"
				/>
			</section>

			<section :class="$style.section">
				<div :class="$style.sectionHeader">
					<N8nText tag="h3" size="medium" bold>
						{{ i18n.baseText('evaluation.collections.section.ungrouped') }}
					</N8nText>
					<N8nBadge theme="tertiary" size="small">{{ ungroupedRuns.length }}</N8nBadge>
					<N8nText :class="$style.ungroupedHelper" size="xsmall" color="text-light">
						{{ i18n.baseText('evaluation.collections.section.ungrouped.helper') }}
					</N8nText>
				</div>

				<div v-if="ungroupedRuns.length === 0" :class="$style.emptyHint">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('evaluation.collections.section.ungrouped.empty') }}
					</N8nText>
				</div>
				<UngroupedRunRow
					v-for="run in ungroupedRuns"
					:key="run.id"
					:run="run"
					:dataset-name-by-config-id="datasetNameByConfigId"
				/>
			</section>

			<SetupCollectionWizard
				:open="wizardOpen"
				:workflow-id="workflowId"
				@update:open="wizardOpen = $event"
				@created="onCreated"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
// Mirror EvaluationsView's `.wrapper` + `.content`: reserve the same 58px
// collapsed-sidebar gutter and centre the inner column, so this section's left
// and right edges line up with the runs section stacked above it.
.viewWrapper {
	display: flex;
	justify-content: center;
	padding: 0 var(--spacing--lg);
	padding-left: 58px;
}

.view {
	width: 100%;
	// Match EvaluationsView's `.runs` cap so both stacked sections share width.
	max-width: 1024px;
	padding: var(--spacing--lg) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.pagination {
	display: flex;
	justify-content: center;
	margin-top: var(--spacing--2xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.ungroupedHelper {
	margin-left: auto;
}

.emptyHint {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border: 1px dashed var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
}

.emptyHintBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}
</style>
