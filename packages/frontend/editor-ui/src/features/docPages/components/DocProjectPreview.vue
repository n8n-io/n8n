<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import type { DocOverviewProject } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import DocPageEditor from './DocPageEditor.vue';
import { PROJECT_DOCS_VIEW } from '../constants';

/** The top of a project page, read-only, with a fade when it is longer than the box. */
defineProps<{
	projectId: string;
	page: NonNullable<DocOverviewProject['page']>;
}>();

const i18n = useI18n();

const clip = useTemplateRef<HTMLElement>('clip');
const overflowing = ref(false);

useResizeObserver(clip, () => {
	if (clip.value) overflowing.value = clip.value.scrollHeight > clip.value.clientHeight;
});
</script>

<template>
	<article :class="$style.preview" data-testid="doc-project-preview">
		<div ref="clip" :class="[$style.clip, { [$style.faded]: overflowing }]">
			<DocPageEditor
				:content="page.content"
				:markdown="page.markdown"
				:editable="false"
				:project-id="projectId"
			/>
		</div>
		<RouterLink
			:to="{ name: PROJECT_DOCS_VIEW, params: { projectId } }"
			:class="$style.more"
			data-testid="doc-project-preview-more"
		>
			{{ i18n.baseText('docPages.overview.readMore') }}
			<N8nIcon icon="arrow-right" size="xsmall" />
		</RouterLink>
	</article>
</template>

<style lang="scss" module>
.preview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

// Shows the first few blocks. No design token covers this height.
.clip {
	max-height: 16rem;
	overflow: hidden;

	// Smaller type than the full page, so more of it fits.
	> * {
		font-size: var(--font-size--sm);
	}

	:global(.doc-page-content) > :first-child {
		margin-top: 0;
	}
}

.faded {
	mask-image: linear-gradient(to bottom, black 70%, transparent);
}

.more {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: fit-content;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	text-decoration: none;
	transition: color var(--duration--snappy) var(--easing--ease-out);

	&:hover,
	&:focus-visible {
		color: var(--text-color);
	}
}

@media (prefers-reduced-motion: reduce) {
	.more {
		transition: none;
	}
}
</style>
