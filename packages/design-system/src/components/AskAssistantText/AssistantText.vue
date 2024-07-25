<script setup lang="ts">
withDefaults(defineProps<{ text: string; size: 'small' | 'medium' | 'large' }>(), {
	text: '',
	size: 'medium',
});
</script>

<template>
	<span :class="[$style.text, $style[size]]">{{ text }}</span>
</template>

<style lang="scss" module>
.text {
	background: var(--color-assistant-highlight-gradient);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	font-weight: var(--font-weight-bold);
}

.small {
	font-size: 9px;
	line-height: 12px;
}

.medium {
	font-size: 12px;
	line-height: 16px;
}

.large {
	font-size: 14px;
	line-height: 18px;
}
</style>
