<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { docPageKindSchema, docPageResourceTypeSchema } from '@n8n/api-types';

import DocKindBadge from '../DocKindBadge.vue';
import { useOpenDocPage } from '../../composables/useOpenDocPage';

const props = defineProps(nodeViewProps);

const { openDocPage } = useOpenDocPage();

const kind = computed(() => docPageKindSchema.safeParse(props.node.attrs.kind).data ?? 'event');
const title = computed(() => String(props.node.attrs.title ?? ''));

function open() {
	const resourceType = docPageResourceTypeSchema.safeParse(props.node.attrs.resourceType).data;
	const resourceId = String(props.node.attrs.resourceId ?? '');
	if (resourceType && resourceId) void openDocPage(resourceType, resourceId);
}
</script>

<template>
	<NodeViewWrapper
		as="span"
		:class="[$style.mention, { [$style.selected]: props.selected }]"
		role="link"
		tabindex="0"
		contenteditable="false"
		data-testid="doc-mention"
		data-attr="doc-mention"
		@click="open"
		@keydown.enter.prevent="open"
	>
		<DocKindBadge :kind="kind" :label="title" />
	</NodeViewWrapper>
</template>

<style lang="scss" module>
.mention {
	display: inline-flex;
	vertical-align: middle;
	border-radius: var(--radius--2xs);
	cursor: pointer;
	transition: filter var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&:focus-visible {
		filter: brightness(0.95) saturate(1.3);
		outline: none;
	}

	&:focus-visible,
	&.selected {
		box-shadow: 0 0 0 var(--spacing--5xs) var(--color--primary);
	}
}

@media (prefers-reduced-motion: reduce) {
	.mention {
		transition: none;
	}
}
</style>
