<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import NodeDiff from '@/features/workflows/workflowDiff/NodeDiff.vue';

import type { DetailSide, FieldChange } from '../../promotionPreview.content';

const props = defineProps<{
	changes: FieldChange[];
	direction: PromotionDirection;
	/** Sides without a file. The resource is new or removed there. */
	absentSides: DetailSide[];
}>();

const i18n = useI18n();

// Before is the branch for promote, and this instance for apply.
const absentText = (side: DetailSide) =>
	i18n.baseText(
		side === (props.direction === 'promote' ? 'before' : 'after')
			? 'promotions.preview.side.notOnBranch'
			: 'promotions.preview.side.notOnInstance',
	);

// Exported expressions are JSON, so they show as a line diff.
const columnChanges = computed(() => props.changes.filter((change) => change.field !== 'data'));
const dataChange = computed(() => props.changes.find((change) => change.field === 'data'));

// A single name change needs no field label.
const showFieldLabels = computed(
	() => columnChanges.value.length > 1 || columnChanges.value[0]?.field !== 'name',
);

const sides = computed(() =>
	(['before', 'after'] as const).map((side) => ({
		side,
		label: i18n.baseText(`promotions.preview.field.${side}`),
		absent: props.absentSides.includes(side),
	})),
);
</script>

<template>
	<div>
		<div
			v-if="columnChanges.length > 0 || absentSides.length > 0"
			:class="$style.columns"
			data-test-id="promotion-preview-field-changes"
		>
			<div v-for="column in sides" :key="column.side" :class="$style.column">
				<N8nText step="2xs" bold color="text-base">{{ column.label }}</N8nText>
				<N8nText v-if="column.absent" step="xs" color="text-light">
					{{ absentText(column.side) }}
				</N8nText>
				<template v-else>
					<div v-for="change in columnChanges" :key="change.field" :class="$style.field">
						<N8nText v-if="showFieldLabels" step="2xs" color="text-light">
							{{ i18n.baseText(`promotions.preview.field.${change.field}`) }}
						</N8nText>
						<N8nText
							step="xs"
							:color="change[column.side] === undefined ? 'text-light' : 'text-dark'"
							:class="$style.value"
						>
							{{ change[column.side] ?? i18n.baseText('promotions.preview.field.empty') }}
						</N8nText>
					</div>
				</template>
			</div>
		</div>
		<div v-if="dataChange" :class="$style.data" data-test-id="promotion-preview-data-diff">
			<N8nText step="2xs" bold color="text-base">
				{{ i18n.baseText('promotions.preview.field.data') }}
			</N8nText>
			<NodeDiff :old-string="dataChange.before ?? ''" :new-string="dataChange.after ?? ''" />
		</div>
	</div>
</template>

<style module lang="scss">
.columns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-left: var(--border);
	}
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.value {
	overflow-wrap: anywhere;
}

.data {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border);
}
</style>
