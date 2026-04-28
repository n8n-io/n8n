<script lang="ts" setup>
const props = defineProps<{
	data: { id: string };
	actions: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
	action: [value: { action: string; userId: string }];
}>();

const onAction = (action: string) => {
	emit('action', { action, userId: props.data.id });
};
</script>

<template>
	<N8nDropdown
		v-if="props.actions.length > 0"
		:actions="props.actions"
		data-test-id="project-members-actions"
		@action="onAction"
	/>
</template>
