<script setup lang="ts">
// Prototype: one parameter of the node diff, as the parameter input of the node. A change shows
// the old input in red and the new input in green, each with its bar and its − or + sign.
import { computed } from 'vue';
import { N8nInputLabel } from '@n8n/design-system';

import { useCollectionOverhaul } from '@/app/composables/useCollectionOverhaul';
import ParameterInputFull from '@/features/ndv/parameters/components/ParameterInputFull.vue';
import type { NodeField } from './nodeFieldDiff';

const props = defineProps<{
	field: NodeField;
}>();

const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();

/** A switch with its label beside it brings its own label, as in the node settings. */
const hasOwnLabel = computed(
	() => props.field.property.type === 'boolean' && isCollectionOverhaulEnabled.value,
);

/** A side with no value shows no input: the field is new, or n8n removed it. */
const rows = computed(() => {
	const { changed, before, after, beforeValue, afterValue } = props.field;
	if (!changed) return [{ type: 'equal', value: afterValue }];
	return [
		...(before ? [{ type: 'removed', value: beforeValue }] : []),
		...(after ? [{ type: 'added', value: afterValue }] : []),
	];
});
</script>

<template>
	<div :class="$style.field" :data-review-field="field.key">
		<N8nInputLabel
			v-if="!hasOwnLabel"
			:label="field.label"
			:bold="false"
			size="small"
			color="text-dark"
		/>
		<div
			v-for="row in rows"
			:key="row.type"
			:class="[$style.row, row.type !== 'equal' && $style[row.type]]"
		>
			<ParameterInputFull
				:parameter="{ ...field.property, displayName: field.label }"
				:value="row.value"
				:path="field.path"
				:display-options="false"
				is-read-only
				hide-label
				hide-hint
				hide-issues
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

/* The input keeps its own look. The row around it carries the colour of the change. */
.row {
	position: relative;
}

.removed,
.added {
	margin-left: calc(var(--spacing--2xs) * -1);
	padding: var(--spacing--4xs) 0 var(--spacing--4xs) var(--spacing--2xs);
	border-left: var(--spacing--5xs) solid var(--diff-row-color);
	background-color: var(--diff-row-background);

	/* A + or − sign left of the bar, so the change does not rely on colour. */
	&::before {
		content: var(--diff-row-sign);
		position: absolute;
		top: 50%;
		right: calc(100% + var(--spacing--2xs));
		transform: translateY(-50%);
		color: var(--diff-row-color);
		font-family: var(--font-family--monospace);
	}
}

.removed {
	--diff-row-color: var(--diff--color--deleted);
	--diff-row-background: var(--diff--color--deleted--faint);
	--diff-row-sign: '−';
}

.added {
	--diff-row-color: var(--diff--color--new);
	--diff-row-background: var(--diff--color--new--faint);
	--diff-row-sign: '+';
}
</style>
