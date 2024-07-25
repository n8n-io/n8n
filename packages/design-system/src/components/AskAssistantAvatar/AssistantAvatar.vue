<script setup lang="ts">
import AssistantIcon from '../AskAssistantIcon/AssistantIcon.vue';

withDefaults(defineProps<{ size: 'small' | 'mini' }>(), {
	size: 'small',
});

const sizes = {
	small: {
		container: '20px',
	},
	mini: {
		container: '16px',
	},
};
</script>

<template>
	<div
		:class="$style.container"
		:style="{ height: sizes[size].container, width: sizes[size].container }"
	>
		<AssistantIcon :size="size" theme="blank" />
	</div>
</template>

<style lang="scss" module>
.container {
	background: linear-gradient(105deg, #5b60e8 0%, #aa7bec 50%, #ec7b8e 100%);
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}
</style>
