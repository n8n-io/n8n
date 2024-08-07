<script setup lang="ts">
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';

withDefaults(defineProps<{ size: 'small' | 'mini' }>(), {
	size: 'small',
});
</script>

<template>
	<div :class="[$style.container, $style[size]]">
		<AssistantIcon :size="size" theme="blank" />
	</div>
</template>

<style lang="scss" module>
.container {
	background: var(--color-assistant-highlight-gradient);
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.small {
	height: 20px;
	width: 20px;
}

.mini {
	height: 16px;
	width: 16px;
}
</style>
