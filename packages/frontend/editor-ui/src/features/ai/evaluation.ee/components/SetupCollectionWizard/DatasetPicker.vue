<script setup lang="ts">
import { N8nIcon, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

interface DatasetOption {
	id: string;
	label: string;
}

defineProps<{
	options: DatasetOption[];
	selectedId: string | null;
	matchingVersionsCount: number;
	hasSelection: boolean;
}>();

const emit = defineEmits<{
	'update:selectedId': [id: string];
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.wrap" data-test-id="dataset-picker">
		<div :class="$style.pickerRow">
			<span :class="$style.datasetIcon" aria-hidden="true">
				<N8nIcon icon="database" size="small" />
			</span>
			<N8nSelect
				:class="$style.select"
				:model-value="selectedId ?? ''"
				:placeholder="i18n.baseText('evaluation.setup.dataset.placeholder')"
				size="medium"
				@update:model-value="emit('update:selectedId', $event)"
			>
				<N8nOption v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.label" />
			</N8nSelect>
		</div>

		<div v-if="hasSelection" :class="$style.helper">
			<span :class="$style.dot" />
			<N8nText size="small" color="text-base">
				{{
					i18n.baseText('evaluation.setup.dataset.matchCount', {
						adjustToNumber: matchingVersionsCount,
					})
				}}
			</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.wrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.pickerRow {
	display: grid;
	grid-template-columns: 32px 1fr;
	align-items: center;
	gap: var(--spacing--2xs);
}

.datasetIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: var(--radius--xs);
	background: var(--background--brand);
	color: var(--color--white);
}

.select {
	min-width: 0;
}

.helper {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color--success);
	flex-shrink: 0;
}
</style>
