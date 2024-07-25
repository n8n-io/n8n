<script setup lang="ts">
const props = withDefaults(defineProps<{ text: string; size: 'small' | 'medium' | 'large' }>(), {
	text: '',
	size: 'medium',
});

const sizes = {
	small: {
		fontSize: '9px',
		lineHeight: '12px',
	},
	medium: {
		fontSize: '12px',
		lineHeight: '16px',
	},
	large: {
		fontSize: '14px',
		lineHeight: '18px',
	},
};
</script>

<template>
	<span
		:class="$style.text"
		:style="{ fontSize: sizes[size].fontSize, lineHeight: sizes[size].lineHeight }"
		>{{ props.text }}</span
	>
</template>

<style lang="scss" module>
.text {
	background: var(--color-assistant-highlight-gradient);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	font-weight: 600;
}
</style>
