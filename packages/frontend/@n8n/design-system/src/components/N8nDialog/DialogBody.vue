<script setup lang="ts">
import { onMounted, provide, useTemplateRef } from 'vue';

import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import { insideDialogBodyKey } from './dialogContext';

defineOptions({ name: 'DialogBody' });

provide(insideDialogBodyKey, true);

const scrollRef = useTemplateRef('scroll');

onMounted(() => {
	// Reka's viewport is always a tab stop. A dialog already cycles focus through its controls.
	scrollRef.value
		?.querySelector<HTMLElement>('[data-reka-scroll-area-viewport]')
		?.setAttribute('tabindex', '-1');
});
</script>

<template>
	<div ref="scroll" :class="$style.scroll">
		<N8nScrollArea :class="$style.area" type="auto">
			<div :class="$style.body" data-slot="dialog-body">
				<slot />
			</div>
		</N8nScrollArea>
	</div>
</template>

<style module>
.scroll {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

/* Height follows the content until the dialog hits its max height. Flex then
   shrinks this area, and the viewport inside it scrolls. A percentage height
   never resolves here, so the area would grow with the form and nothing would scroll. */
.area {
	flex: 1 1 auto;
	min-height: 0;
	--scroll-area--height: auto;
}

.body {
	display: flex;
	flex-direction: column;
	/* The header supplies the gap above the body, so this edge has no region padding.
	   Reserve the focus outline inside the scrollport, including when a field scrolls into view. */
	scroll-padding-block: var(--focus--border-width);
	padding-block-start: var(--n8n-dialog-body--padding-block-start, var(--focus--border-width));
	padding-block-end: var(
		--n8n-dialog-body--padding-block-end,
		var(--n8n-dialog-region--padding, var(--spacing--md))
	);
	margin-block-start: calc(var(--focus--border-width) * -1);
	padding-inline: var(
		--n8n-dialog-body--padding-inline,
		var(--n8n-dialog-region--padding, var(--spacing--md))
	);
}
</style>
