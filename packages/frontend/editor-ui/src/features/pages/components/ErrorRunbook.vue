<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { useAskAssistantAboutError } from '../composables/useAskAssistantAboutError';
import { useErrorRunbookPages } from '../composables/useErrorRunbookPages';
import { usePagePeekLink } from '../composables/usePagePeekLink';
import { useWorkflowPagesProjectId } from '../composables/useWorkflowPagesProjectId';

/**
 * Shows the runbook of a failed node: the pages that link to the node, then the pages that link to its workflow.
 * A click on a page shows it in the side panel, so the user stays on the error.
 * Renders nothing when no page links to the node or to the workflow, and when the page module is off.
 */
const props = defineProps<{
	workflowId?: string;
	/** The node that failed. Without it, only the pages of the workflow show. */
	nodeId?: string;
	nodeName: string;
	errorMessage: string;
	errorDescription?: string;
	/** The execution that failed, when it is saved. */
	executionId?: string;
}>();

const i18n = useI18n();
const { hrefOf, peekPageOnPlainClick } = usePagePeekLink();
const workflowDocumentStore = injectWorkflowDocumentStore();
const projectId = useWorkflowPagesProjectId();
const { isAvailable, isStarting, askAboutError } = useAskAssistantAboutError();

const pages = useErrorRunbookPages(() => ({
	workflowId: props.workflowId,
	nodeId: props.nodeId,
}));

const hasPages = computed(() => pages.value.length > 0);

const canAskAssistant = computed(
	() => isAvailable.value && props.workflowId !== undefined && projectId.value !== undefined,
);

async function askAssistant(): Promise<void> {
	if (props.workflowId !== undefined && projectId.value !== undefined) {
		await askAboutError(
			{
				workflowId: props.workflowId,
				workflowName: workflowDocumentStore.value.name,
				nodeName: props.nodeName,
				errorMessage: props.errorMessage,
				errorDescription: props.errorDescription,
				executionId: props.executionId,
			},
			pages.value,
			projectId.value,
		);
	}
}
</script>

<template>
	<section v-if="hasPages" :class="$style.runbook" data-test-id="error-runbook">
		<header :class="$style.header">
			<N8nIcon icon="book-open" size="small" :class="$style.headerIcon" />
			<N8nText tag="h3" size="small" :bold="true" :class="$style.title">
				{{ i18n.baseText('page.errorRunbook.title') }}
			</N8nText>
			<N8nButton
				v-if="canAskAssistant"
				variant="ghost"
				size="small"
				icon="sparkles"
				:label="i18n.baseText('page.errorRunbook.askAssistant')"
				:loading="isStarting"
				data-test-id="error-runbook-ask-assistant"
				@click="askAssistant"
			/>
		</header>
		<ul :class="$style.list">
			<li v-for="page in pages" :key="page.id">
				<a
					:href="hrefOf(page.id)"
					:class="$style.page"
					data-test-id="error-runbook-page"
					@click="peekPageOnPlainClick($event, page.id)"
				>
					<N8nIcon icon="file-text" size="small" :class="$style.pageIcon" />
					<span :class="$style.pageTitle">{{ page.title }}</span>
				</a>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.runbook {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	text-align: left;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--lg);
	padding: 0 var(--spacing--2xs);
}

.headerIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.title {
	flex: 1;
	min-width: 0;
	margin: 0;
	color: var(--text-color--subtle);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.page {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	text-decoration: none;

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
		outline: none;
	}
}

.pageIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.pageTitle {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
