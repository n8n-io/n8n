<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ExecutionStatus, ExecutionSummary } from 'n8n-workflow';
import { computed } from 'vue';

import { useErrorRunbookPages } from '../composables/useErrorRunbookPages';
import { usePagePeekLink } from '../composables/usePagePeekLink';

/**
 * Names the runbook of a failed execution on one line: the pages that link to its workflow.
 * A click on a page shows it in the side panel.
 * Renders nothing for an execution that did not fail, without such a page, and when the page module is off.
 */
const props = defineProps<{
	execution: Pick<ExecutionSummary, 'workflowId' | 'status'>;
}>();

const FAILED_STATUSES: ExecutionStatus[] = ['error', 'crashed'];

const i18n = useI18n();
const { hrefOf, peekPageOnPlainClick } = usePagePeekLink();

const isFailed = computed(() => FAILED_STATUSES.includes(props.execution.status));

const pages = useErrorRunbookPages(() =>
	isFailed.value ? { workflowId: props.execution.workflowId } : {},
);

const hasPages = computed(() => pages.value.length > 0);
</script>

<template>
	<div v-if="hasPages" :class="$style.hint" data-test-id="execution-runbook-hint">
		<N8nIcon icon="book-open" size="small" :class="$style.icon" />
		<N8nText size="small" color="text-base">
			{{ i18n.baseText('page.errorRunbook.hint') }}
		</N8nText>
		<a
			v-for="page in pages"
			:key="page.id"
			:href="hrefOf(page.id)"
			:class="$style.page"
			data-test-id="execution-runbook-hint-page"
			@click="peekPageOnPlainClick($event, page.id)"
		>
			{{ page.title }}
		</a>
	</div>
</template>

<style lang="scss" module>
.hint {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs) var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.page {
	max-width: 100%;
	overflow: hidden;
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	text-decoration: none;
	text-overflow: ellipsis;
	white-space: nowrap;

	&:hover,
	&:focus-visible {
		text-decoration: underline;
		outline: none;
	}
}
</style>
