<script setup lang="ts">
import { N8nIcon, type IconName, type IconSize } from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { computed } from 'vue';

const NODE_ICON_PIXELS: Partial<Record<IconSize, number>> = { xsmall: 12, small: 14 };
const DEFAULT_NODE_ICON_PIXELS = 14;

/**
 * Shows the icon of a resource. An emoji takes the place of the icon.
 * A node type shows the icon of that node when the app provides node icons.
 */
const props = withDefaults(
	defineProps<{
		icon: IconName;
		emoji?: string;
		nodeType?: string;
		size?: IconSize;
	}>(),
	{ emoji: undefined, nodeType: undefined, size: 'small' },
);

const NodeIcon = computed(() => (props.nodeType ? componentRegistry.get('node-icon') : undefined));

const nodeIconPixels = computed(() => NODE_ICON_PIXELS[props.size] ?? DEFAULT_NODE_ICON_PIXELS);
</script>

<template>
	<span v-if="emoji" :class="$style.emoji" aria-hidden="true" data-test-id="page-resource-emoji">{{
		emoji
	}}</span>
	<component
		:is="NodeIcon"
		v-else-if="NodeIcon"
		:node-type="nodeType"
		:size="nodeIconPixels"
		:class="$style.nodeIcon"
	/>
	<N8nIcon v-else :icon="icon" :size="size" />
</template>

<style lang="scss" module>
.emoji {
	flex-shrink: 0;
	font-style: normal;
	line-height: 1;
}

.nodeIcon {
	display: inline-flex;
	flex-shrink: 0;
}
</style>
