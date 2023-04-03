<script setup lang="ts">
import { ref } from 'vue';

export interface Props {
	initialValue: string;
}

const props = defineProps<Props>();

const mappingModeOptions = [
	{
		name: 'Auto mapping',
		value: 'auto',
	},
	{
		name: 'Manual mapping',
		value: 'manual',
	},
];

const emit = defineEmits<{
	(event: 'modeChanged', value: string): void;
}>();

const selected = ref(props.initialValue);

function onModeChanged(value: string): void {
	selected.value = value;
	emit('modeChanged', value);
}

defineExpose({
	selected,
	onModeChanged,
	mappingModeOptions,
});
</script>

<template>
	<div>
		<n8n-select :value="selected" @change="onModeChanged">
			<n8n-option
				v-for="option in mappingModeOptions"
				:key="option.value"
				:value="option.value"
				:label="option.name"
			/>
		</n8n-select>
	</div>
</template>
