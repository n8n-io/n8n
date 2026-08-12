<script setup lang="ts">
import { ref, watch } from 'vue';
import { N8nButton, N8nCodeDiff, N8nMarkdown, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import Modal from '@/app/components/Modal.vue';
import type { AiErrorExplanation, AiErrorExplanationModalData } from '../errorExplanation.types';

const props = defineProps<{
	modalName: string;
	open: boolean;
	data: AiErrorExplanationModalData;
}>();

const i18n = useI18n();
const loading = ref(false);
const failed = ref(false);
const applying = ref(false);
const applyFailed = ref(false);
const explanation = ref<AiErrorExplanation>();
let abortController: AbortController | undefined;
let requestId = 0;

const markdownOptions = {
	markdown: {
		html: false,
		linkify: false,
		typographer: false,
		breaks: true,
	},
	linkAttributes: {
		attrs: {
			target: '_blank',
			rel: 'noopener',
		},
	},
	tasklists: {
		enabled: true,
		label: true,
		labelAfter: false,
	},
	youtube: {},
};

async function loadExplanation() {
	abortController?.abort();
	abortController = new AbortController();
	const currentRequestId = ++requestId;
	loading.value = true;
	failed.value = false;
	applyFailed.value = false;
	explanation.value = undefined;

	try {
		const result = await props.data.loadExplanation(abortController.signal);
		if (currentRequestId === requestId) explanation.value = result;
	} catch (error) {
		if (
			currentRequestId === requestId &&
			!(error instanceof DOMException && error.name === 'AbortError')
		) {
			failed.value = true;
		}
	} finally {
		if (currentRequestId === requestId) loading.value = false;
	}
}

async function applyFix(close: () => void) {
	if (!explanation.value) return;

	applying.value = true;
	applyFailed.value = false;
	try {
		await props.data.applyFix(explanation.value);
		close();
	} catch {
		applyFailed.value = true;
	} finally {
		applying.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		if (open) {
			void loadExplanation();
		} else {
			requestId++;
			abortController?.abort();
		}
	},
	{ immediate: true },
);
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('aiAssistant.errorExplanation.title')"
		width="560px"
		min-height="360px"
		scrollable
	>
		<template #content>
			<div v-if="loading" :class="$style.loading">
				<N8nSpinner size="large" />
				<N8nText color="text-light">
					{{ i18n.baseText('aiAssistant.errorExplanation.loading') }}
				</N8nText>
			</div>
			<div v-else-if="failed" :class="$style.content">
				<N8nText>{{ i18n.baseText('aiAssistant.errorExplanation.error') }}</N8nText>
			</div>
			<div v-else-if="explanation" :class="$style.content">
				<N8nMarkdown
					:content="explanation.detailed"
					:options="markdownOptions"
					:class="$style.markdown"
				/>
				<N8nCodeDiff
					v-if="explanation.codeDiff"
					:title="i18n.baseText('aiAssistant.errorExplanation.codeDiff')"
					:content="explanation.codeDiff"
					:show-actions="false"
				/>
			</div>
		</template>
		<template #footer="{ close }">
			<div :class="$style.footer">
				<N8nText v-if="applyFailed" color="danger" size="small" :class="$style.applyError">
					{{ i18n.baseText('aiAssistant.errorExplanation.applyError') }}
				</N8nText>
				<N8nButton v-if="failed" variant="subtle" @click="loadExplanation">
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
				<N8nButton variant="subtle" :disabled="applying" @click="close">
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
				<N8nButton
					v-if="explanation"
					:loading="applying"
					data-test-id="apply-ai-error-fix-button"
					@click="applyFix(close)"
				>
					{{ i18n.baseText('aiAssistant.errorExplanation.applyFix') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.loading {
	min-height: 220px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
}

.markdown:global(.n8n-markdown) {
	p,
	ul,
	ol {
		margin: 0 0 var(--spacing--2xs);
	}

	pre {
		width: fit-content;
		max-width: 100%;
		margin: 0 0 var(--spacing--2xs);
		padding: 0;
		background: transparent;
	}

	pre > code {
		padding: var(--spacing--xs) var(--spacing--sm);
		border-radius: var(--radius--lg);
	}
}

.footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.applyError {
	margin-right: auto;
}
</style>
