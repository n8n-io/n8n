<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedTableRowPreview } from './wouldHaveHappened.types';
import { presentText, previewEntries } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedTableRowPreview;
}>();

const i18n = useI18n();

const table = computed(() => presentText(props.preview.table)?.trim());
const columns = computed(() => previewEntries(props.preview.columns));

const isEmpty = computed(() => !table.value && columns.value.length === 0);
</script>

<template>
	<WouldHaveHappenedCard
		:preview="preview"
		:heading="i18n.baseText('agents.testRun.preview.kind.tableRow')"
		icon="table"
		:empty="isEmpty"
	>
		<dl v-if="table" :class="$style.fields">
			<WouldHaveHappenedField :label="i18n.baseText('agents.testRun.preview.field.table')">
				{{ table }}
			</WouldHaveHappenedField>
		</dl>
		<dl v-if="columns.length > 0" :class="[$style.fields, $style.columns]">
			<WouldHaveHappenedField v-for="column in columns" :key="column.key" :label="column.key">
				<WouldHaveHappenedText :text="column.value" :max-chars="160" :max-lines="3" />
			</WouldHaveHappenedField>
		</dl>
		<p v-else :class="$style.noValues">
			{{ i18n.baseText('agents.testRun.preview.noValues') }}
		</p>
	</WouldHaveHappenedCard>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
}

.columns {
	padding: var(--spacing--2xs);
	border-radius: var(--radius--sm);
	background-color: var(--background--subtle);
}

.noValues {
	margin: 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
</style>
