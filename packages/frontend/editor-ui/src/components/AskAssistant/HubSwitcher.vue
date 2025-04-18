<script lang="ts" setup>
defineProps<{
	isBuildMode: boolean;
}>();

const emit = defineEmits<{
	toggle: [value: boolean];
}>();

function toggle(value: boolean) {
	emit('toggle', value);
}
</script>

<template>
	<n8n-radio-buttons
		size="small"
		:model-value="isBuildMode"
		:options="[
			{ label: 'Assistant', value: false },
			{ label: 'Builder', value: true },
		]"
		@update:model-value="toggle"
	/>
</template>
