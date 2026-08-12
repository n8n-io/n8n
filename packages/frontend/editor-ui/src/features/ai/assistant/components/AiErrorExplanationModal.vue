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
const explanation = ref<AiErrorExplanation>();
let abortController: AbortController | undefined;
let requestId = 0;

async function loadExplanation() {
	abortController?.abort();
	abortController = new AbortController();
	const currentRequestId = ++requestId;
	loading.value = true;
	failed.value = false;
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
				<N8nMarkdown :content="explanation.detailed" :class="$style.markdown" />
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
				<N8nButton v-if="failed" variant="subtle" @click="loadExplanation">
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
				<N8nButton @click="close">{{ i18n.baseText('generic.close') }}</N8nButton>
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

.markdown {
	> div {
		* {
			font-size: var(--font-size--sm);
			line-height: var(--line-height--lg);
		}

		p,
		ul,
		ol {
			margin-bottom: var(--spacing--xs);
		}

		pre {
			margin: var(--spacing--xs) 0 var(--spacing--sm);
			padding: var(--spacing--sm);
		}

		> :first-child {
			margin-top: 0;
		}

		> :last-child {
			margin-bottom: 0;
		}
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
