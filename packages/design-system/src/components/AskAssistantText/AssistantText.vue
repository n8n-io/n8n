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
	background: linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	font-weight: 600;
}
</style>
