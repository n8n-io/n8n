<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import TestCaseRunResult from './TestCaseRunResult.vue';

const props = defineProps<{
	index: number;
}>();

const locale = useI18n();
const wizardStore = useEvaluationsWizardSidepanelStore();

const expanded = ref(false);

const title = computed(
	() =>
		wizardStore.datasetNamesByRow[props.index] ||
		locale.baseText('evaluations.tests.list.caseLabel', {
			interpolate: { index: props.index + 1 },
		}),
);

const inputEntries = computed<Array<{ name: string; value: string }>>(() => {
	const row = wizardStore.datasetInputsByRow[props.index] ?? {};
	return Object.entries(row).map(([name, value]) => ({ name, value: String(value) }));
});

function toggle() {
	expanded.value = !expanded.value;
}

function openEdit() {
	wizardStore.openDetail(props.index);
}
</script>

<template>
	<div :class="$style.card" :data-test-id="`tests-result-card-${index}`">
		<div :class="$style.header">
			<button
				type="button"
				:class="$style.title"
				:data-test-id="`tests-result-edit-${index}`"
				@click="openEdit"
			>
				<N8nText size="medium" color="text-dark" bold>{{ title }}</N8nText>
			</button>
			<button
				type="button"
				:class="$style.chevron"
				:aria-expanded="expanded"
				:data-test-id="`tests-result-toggle-${index}`"
				@click="toggle"
			>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="small" color="text-base" />
			</button>
		</div>

		<!-- Case definition (expanded only) -->
		<div v-if="expanded" :class="$style.definition">
			<div :class="$style.sentence">
				<N8nText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.detail.when') }}
				</N8nText>
				<N8nText size="small" color="text-dark" bold>{{ wizardStore.aiNodeName }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ locale.baseText('evaluations.tests.detail.receivesInput') }}
				</N8nText>
			</div>
			<div :class="$style.entries">
				<p v-for="entry in inputEntries" :key="entry.name" :class="$style.entry">
					<N8nText size="small" color="text-light">{{ entry.name }}</N8nText>
					<N8nText size="small" color="text-dark">{{ entry.value }}</N8nText>
				</p>
			</div>
		</div>

		<!-- Run outcome — separated from the title/definition by a full-bleed border. -->
		<TestCaseRunResult :index="index" :expanded="expanded" separated />
	</div>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	padding: var(--spacing--sm) var(--spacing--md);
	gap: var(--spacing--sm);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.title {
	flex: 1 1 auto;
	min-width: 0;
	background: none;
	border: none;
	padding: 0;
	text-align: left;
	cursor: pointer;

	&:hover :global(.n8n-text) {
		text-decoration: underline;
	}
}

.chevron {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius--sm);
	cursor: pointer;

	&:hover {
		background-color: var(--background--subtle);
	}
}

.definition {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sentence {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.entries {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--md);
}

.entry {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
}
</style>
