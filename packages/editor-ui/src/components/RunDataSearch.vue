<script setup lang="ts">
type Props = {
	modelValue: string;
};

const emit = defineEmits<{ (event: 'update:modelValue', value: Props['modelValue']): void }>();

const props = withDefaults(defineProps<Props>(), {
	modelValue: '',
});
const onSearchUpdate = (value: string) => {
	emit('update:modelValue', value);
};
</script>

<template>
	<n8n-input
		:class="$style.ioSearch"
		size="small"
		:modelValue="modelValue"
		@update:modelValue="onSearchUpdate"
	>
		<template #prefix>
			<n8n-icon icon="search" />
		</template>
	</n8n-input>
</template>

<style lang="scss" module>
.ioSearch {
	max-width: 40%;
	padding-right: var(--spacing-s);
}
</style>
