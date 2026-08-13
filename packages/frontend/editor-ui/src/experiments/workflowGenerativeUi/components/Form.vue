<script setup lang="ts">
import ActionCard from './ActionCard.vue';
defineProps<{
	title: string;
	fields: Array<{ label: string; type: string }>;
	nodeId?: string | null;
}>();
defineEmits<{ press: [] }>();
</script>
<template>
	<ActionCard :node-id="nodeId" label="Form" :title="title" @press="$emit('press')"
		><div :class="$style.fields">
			<label v-for="field in fields" :key="field.label" :class="$style.field"
				><span>{{ field.label }}</span
				><input readonly value="" :placeholder="field.type"
			/></label></div
	></ActionCard>
</template>
<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
}
.field input {
	height: var(--height--md);
	padding: 0 var(--spacing--2xs);
	color: var(--text-color--subtler);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--2xs);
}
</style>
