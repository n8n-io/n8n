<script setup lang="ts">
import { ref } from 'vue';

type Props = {
	modelValue: string;
};

const INITIAL_WIDTH = '60px';

const emit = defineEmits<{ (event: 'update:modelValue', value: Props['modelValue']): void }>();

const props = withDefaults(defineProps<Props>(), {
	modelValue: '',
});

const maxWidth = ref(INITIAL_WIDTH);

const onSearchUpdate = (value: string) => {
	emit('update:modelValue', value);
};
const onFocus = () => {
	maxWidth.value = '40%';
};
const onBlur = () => {
	if (props.modelValue === '') {
		maxWidth.value = INITIAL_WIDTH;
	}
};
</script>

<template>
	<n8n-input
		:class="$style.ioSearch"
		:style="{ maxWidth }"
		size="small"
		:modelValue="modelValue"
		@update:modelValue="onSearchUpdate"
		@focus="onFocus"
		@blur="onBlur"
	>
		<template #prefix>
			<n8n-icon icon="search" />
		</template>
	</n8n-input>
</template>

<style lang="scss" module>
@import '@/styles/css-animation-helpers.scss';

.ioSearch {
	padding-right: var(--spacing-s);
	transition: max-width 0.3s $ease-out-expo;
}
</style>
