<script setup lang="ts">
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

interface DatasetOption {
	id: string;
	label: string;
	caseCount?: number;
	lastEditedAt?: string;
}

const props = defineProps<{
	options: DatasetOption[];
	selectedId: string | null;
	matchingVersionsCount: number;
	hasSelection: boolean;
}>();

const emit = defineEmits<{
	'update:selectedId': [id: string];
}>();

const i18n = useI18n();

const selected = computed(() => props.options.find((o) => o.id === props.selectedId) ?? null);

const formatRelativeDate = (iso?: string) => {
	if (!iso) return '';
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return '';
	const diffMs = Date.now() - then;
	const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	if (days <= 0) return i18n.baseText('evaluation.setup.dataset.editedToday');
	if (days === 1)
		return i18n.baseText('evaluation.setup.dataset.editedDaysAgo', { adjustToNumber: 1 });
	return i18n.baseText('evaluation.setup.dataset.editedDaysAgo', { adjustToNumber: days });
};

const selectedSubtext = computed(() => {
	if (!selected.value) return '';
	const parts: string[] = [];
	if (selected.value.caseCount !== undefined) {
		parts.push(
			i18n.baseText('evaluation.setup.dataset.cases', {
				adjustToNumber: selected.value.caseCount,
			}),
		);
	}
	const edited = formatRelativeDate(selected.value.lastEditedAt);
	if (edited) parts.push(edited);
	return parts.join(' · ');
});
</script>

<template>
	<div :class="$style.wrap" data-test-id="dataset-picker">
		<N8nSelect
			:model-value="selectedId ?? ''"
			:placeholder="i18n.baseText('evaluation.setup.dataset.placeholder')"
			size="medium"
			@update:model-value="emit('update:selectedId', $event)"
		>
			<N8nOption v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.label" />
		</N8nSelect>

		<div v-if="selected" :class="$style.selectedSubtext">
			<N8nText size="small" color="text-light">{{ selectedSubtext }}</N8nText>
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

.selectedSubtext {
	margin-top: var(--spacing--3xs);
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
