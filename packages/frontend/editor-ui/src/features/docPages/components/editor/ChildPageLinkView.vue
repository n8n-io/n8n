<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { childPagePath } from './childPageLink';

const props = defineProps(nodeViewProps);

const router = useRouter();
const i18n = useI18n();

const title = computed(
	() => String(props.node.attrs.title ?? '') || i18n.baseText('docPages.editor.untitledPage'),
);

const open = () => {
	const projectId = String(props.extension.options.projectId ?? '');
	const pageId = String(props.node.attrs.pageId ?? '');
	if (!projectId || !pageId) return;
	void router.push(childPagePath(projectId, pageId));
};
</script>

<template>
	<NodeViewWrapper
		:class="[$style.link, { [$style.selected]: props.selected }]"
		role="link"
		tabindex="0"
		contenteditable="false"
		data-testid="doc-page-child-link"
		data-attr="doc-page-child-link"
		@click="open"
		@keydown.enter.prevent="open"
	>
		<N8nIcon icon="file-text" size="medium" :class="$style.icon" />
		<span :class="$style.title">{{ title }}</span>
	</NodeViewWrapper>
</template>

<style lang="scss" module>
.link {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: var(--spacing--5xs) 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	border-radius: var(--radius);
	cursor: pointer;
	color: var(--color--text--shade-1);

	&:hover,
	&:focus-visible {
		background-color: var(--color--background--light-1);
		outline: none;
	}
}

.selected {
	background-color: var(--color--background--light-1);
}

.icon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.title {
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-decoration-color: var(--color--foreground);
	text-underline-offset: var(--spacing--5xs);
}
</style>
