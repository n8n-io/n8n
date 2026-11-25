<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, inject } from 'vue';

import {
	PromotionAbsentSideLabelsKey,
	type DetailSide,
	type FieldChange,
} from '../../promotionPreview.content';

const props = defineProps<{
	changes: FieldChange[];
	direction: PromotionDirection;
	/** Sides without a file. The resource is new or removed there. */
	absentSides: DetailSide[];
}>();

const i18n = useI18n();
const CodeDiff = computed(() => componentRegistry.get('code-diff'));
const absentLabels = inject(PromotionAbsentSideLabelsKey, undefined);

// Before is the branch for promote, and this instance for apply.
const absentText = (side: DetailSide) =>
	absentLabels?.[side] ??
	i18n.baseText(
		side === (props.direction === 'promote' ? 'before' : 'after')
			? 'promotions.preview.side.notOnBranch'
			: 'promotions.preview.side.notOnInstance',
	);

// Exported expressions are JSON, so they show as a line diff.
const isDiff = (change: FieldChange) =>
	['data', 'instructions', 'frontmatter', 'file'].includes(change.field);
const columnChanges = computed(() => props.changes.filter((change) => !isDiff(change)));
const dataChanges = computed(() => props.changes.filter(isDiff));

const displayValue = (change: FieldChange, side: DetailSide) => {
	const value = change[side];
	if (change.field === 'scope' && (value === 'project' || value === 'instance')) {
		return i18n.baseText(`promotions.preview.skill.scope.${value}`);
	}
	return value ?? i18n.baseText('promotions.preview.field.empty');
};

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
							{{ displayValue(change, column.side) }}
						</N8nText>
					</div>
				</template>
			</div>
		</div>
		<div
			v-for="dataChange in dataChanges"
			:key="dataChange.label ?? dataChange.field"
			:class="$style.data"
			data-test-id="promotion-preview-data-diff"
		>
			<N8nText step="2xs" bold color="text-base">
				{{ dataChange.label ?? i18n.baseText(`promotions.preview.field.${dataChange.field}`) }}
			</N8nText>
			<N8nText v-if="dataChange.binary" step="xs">{{
				i18n.baseText(
					dataChange.before === undefined
						? 'promotions.preview.skill.binaryAdded'
						: dataChange.after === undefined
							? 'promotions.preview.skill.binaryRemoved'
							: 'promotions.preview.skill.binaryChanged',
				)
			}}</N8nText>
			<component
				:is="CodeDiff"
				v-else-if="CodeDiff"
				:old-string="dataChange.before ?? ''"
				:new-string="dataChange.after ?? ''"
			/>
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
