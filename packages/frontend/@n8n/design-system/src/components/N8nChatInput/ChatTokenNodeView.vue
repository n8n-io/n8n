<script lang="ts" setup>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { computed } from 'vue';

import type { ChatTokenNodeOptions } from './chatInputTokens';
import N8nChatToken from '../N8nChatToken/ChatToken.vue';

const props = defineProps(nodeViewProps);

const label = computed(() => String(props.node.attrs.label));
const icon = computed(() => {
	// Tiptap types the options of a node view's extension as `any`.
	const options: ChatTokenNodeOptions = props.extension.options;
	return options.icon?.(String(props.node.attrs.href));
});
</script>

<template>
	<NodeViewWrapper as="span" :class="$style.wrapper" contenteditable="false">
		<N8nChatToken :label="label" :icon="icon" :selected="selected" />
	</NodeViewWrapper>
</template>

<style lang="scss" module>
.wrapper {
	display: inline;
}
</style>
