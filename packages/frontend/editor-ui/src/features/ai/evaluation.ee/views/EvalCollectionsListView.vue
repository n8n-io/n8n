<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useToast } from '@/app/composables/useToast';

import CollectionCard from '../components/EvalCollectionsListView/CollectionCard.vue';
import SetupCollectionWizard from '../components/SetupCollectionWizard/SetupCollectionWizard.vue';
import UngroupedRunRow from '../components/EvalCollectionsListView/UngroupedRunRow.vue';
import { useEvalCollectionsStore } from '../evalCollections.store';
import { useEvaluationStore } from '../evaluation.store';

const props = defineProps<{
	workflowId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const store = useEvalCollectionsStore();
const evaluationStore = useEvaluationStore();

const wizardOpen = ref(false);

const collections = computed(() => store.getCollections(props.workflowId));

const ungroupedRuns = computed(() => {
	const all = evaluationStore.testRunsByWorkflowId[props.workflowId] ?? [];
	return all
		.filter((r) => !r.collectionId)
		.sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
});

// `evaluationConfigId → name` lookup so each ungrouped row can render the
// dataset chip without re-fetching. Same map is reused by `CollectionCard`
// to fill in the meta line's dataset segment.
const datasetNameByConfigId = computed<Record<string, string>>(() => {
	const map: Record<string, string> = {};
	for (const cfg of store.getEvaluationConfigs(props.workflowId)) {
		map[cfg.id] = cfg.name;
	}
	return map;
});

const onOpenWizard = () => {
	wizardOpen.value = true;
};

const onCreated = async (_collectionId: string) => {
	await store.fetchCollections(props.workflowId);
};

onMounted(async () => {
	try {
		await Promise.all([
			store.fetchCollections(props.workflowId),
			store.fetchEvaluationConfigs(props.workflowId).catch(() => null),
			evaluationStore.fetchTestRuns(props.workflowId),
		]);
		// Pre-fetch first 3 details so mini bar charts render on first paint;
		// further cards lazy-load via `mouseenter` on the card.
		await Promise.all(
			collections.value
				.slice(0, 3)
				.map((c) => store.fetchCollectionDetail(props.workflowId, c.id).catch(() => null)),
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.collections.errors.fetchFailed'));
	}
});

onBeforeUnmount(() => {
	store.cleanupPolling();
});
</script>

<template>
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
				v-for="collection in collections"
				:key="collection.id"
				:collection="collection"
				:detail="store.getDetail(collection.id)"
				:workflow-id="workflowId"
				:dataset-name="datasetNameByConfigId[collection.evaluationConfigId]"
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
</template>

<style module lang="scss">
.view {
	width: 100%;
	max-width: 1280px;
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--md);
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
	border: 1px dashed var(--border-color--base);
	border-radius: var(--radius--md);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
}

.emptyHintBody {
	display: flex;
	flex-direction: column;
	gap: 2px;
}
</style>
