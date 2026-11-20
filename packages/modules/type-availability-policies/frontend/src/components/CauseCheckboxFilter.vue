<script setup lang="ts" generic="Cause extends string">
import { N8nCheckbox } from '@n8n/design-system';
import { computed } from 'vue';

/** A parent checkbox that selects every cause, with one checkbox for each cause under it. */
const props = defineProps<{
	/** In the order to show and to store them. */
	causes: readonly Cause[];
	label: string;
	causeLabel: (cause: Cause) => string;
	testIdPrefix: string;
}>();

const selected = defineModel<Cause[]>({ required: true });

const allSelected = computed(() => props.causes.every((cause) => selected.value.includes(cause)));
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value);

function onToggleAll(checked: boolean) {
	selected.value = checked ? [...props.causes] : [];
}

function onToggleCause(cause: Cause, checked: boolean) {
	selected.value = props.causes.filter((option) =>
		option === cause ? checked : selected.value.includes(option),
	);
}
</script>

<template>
	<div :data-test-id="testIdPrefix">
		<N8nCheckbox
			:label="label"
			:model-value="allSelected"
			:indeterminate="someSelected"
			:data-test-id="`${testIdPrefix}-all`"
			@update:model-value="onToggleAll"
		/>
		<div :class="$style.causes">
			<N8nCheckbox
				v-for="cause in causes"
				:key="cause"
				:label="causeLabel(cause)"
				:model-value="selected.includes(cause)"
				:data-test-id="`${testIdPrefix}-${cause}`"
				@update:model-value="onToggleCause(cause, $event)"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.causes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	padding-left: var(--spacing--lg);
}
</style>
