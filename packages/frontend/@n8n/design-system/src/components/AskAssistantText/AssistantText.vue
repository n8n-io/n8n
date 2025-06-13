<script setup lang="ts">
withDefaults(defineProps<{ text: string; size?: 'small' | 'medium' | 'large' | 'xlarge' }>(), {
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
	background-clip: text;
	-webkit-text-fill-color: transparent;
	font-weight: var(--font-weight-bold);
}

.small {
	font-size: 9px;
	line-height: var(--spacing-xs);
}

.medium {
	font-size: var(--spacing-xs);
	line-height: var(--spacing-s);
}

.large {
	font-size: 14px;
	line-height: 18px;
}

.xlarge {
	font-size: var(--spacing-s);
	line-height: var(--spacing-s);
}
</style>
