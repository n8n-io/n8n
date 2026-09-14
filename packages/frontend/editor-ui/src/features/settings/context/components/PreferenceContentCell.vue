<script lang="ts" setup>
import { ref } from 'vue';
import { useElementOverflow } from '@n8n/composables/useElementOverflow';
import { N8nTooltip } from '@n8n/design-system';

/**
 * The preference text, clamped to two lines. The full text opens in a tooltip
 * only when the clamp hides some of it, the way the API key table treats a long
 * label. The tooltip renders the text through a slot, so user text is never
 * parsed as HTML.
 */
const props = defineProps<{
	content: string;
}>();

const textEl = ref<HTMLElement | null>(null);
const { isOverflowing: isClamped } = useElementOverflow(textEl, 'y', [() => props.content]);
</script>

<template>
	<N8nTooltip
		:show-after="500"
		:disabled="!isClamped"
		placement="top"
		:content-class="$style.tooltip"
	>
		<template #content>
			<span :class="$style.full">{{ content }}</span>
		</template>
		<span ref="textEl" :class="$style.text" data-test-id="preference-content">{{ content }}</span>
	</N8nTooltip>
</template>

<style lang="scss" module>
// Line clamping only works on inline content, so it has to live on the text
// element itself rather than on a wrapper with non-inline children.
.text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	white-space: normal;
	overflow-wrap: anywhere;
}

:global(.n8n-tooltip).tooltip {
	max-width: 480px;
}

.full {
	white-space: pre-line;
	overflow-wrap: anywhere;
}
</style>
