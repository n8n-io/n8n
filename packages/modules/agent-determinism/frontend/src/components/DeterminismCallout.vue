<script setup lang="ts">
import type { DeterminismSuggestion } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
	dismissDeterminismSuggestion,
	getDeterminismSummary,
	type DeterminismSourceRef,
} from '../agent-determinism.api';

const props = defineProps<DeterminismSourceRef>();

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const suggestion = ref<DeterminismSuggestion | null>(null);

async function load() {
	try {
		const summary = await getDeterminismSummary(rootStore.restApiContext, props);
		suggestion.value = summary.suggestion;
	} catch {
		suggestion.value = null;
	}
}

async function onReview() {
	if (!suggestion.value) return;
	await router.push(`/workflow/${suggestion.value.draftWorkflowId}`);
}

async function onDismiss() {
	suggestion.value = null;
	await dismissDeterminismSuggestion(rootStore.restApiContext, props);
}

onMounted(load);
watch(() => props.sourceId, load);
</script>

<template>
	<N8nCallout
		v-if="suggestion"
		theme="info"
		icon="sparkles"
		data-test-id="determinism-callout"
		:class="$style.callout"
	>
		{{
			i18n.baseText('agentDeterminism.cta.title', {
				interpolate: { gain: String(suggestion.gainPoints) },
			})
		}}
		{{
			i18n.baseText('agentDeterminism.cta.detail', {
				interpolate: {
					matched: String(Math.round(suggestion.matchRate * suggestion.holdoutRuns)),
					total: String(suggestion.holdoutRuns),
				},
			})
		}}
		<template #trailingContent>
			<div :class="$style.actions">
				<N8nButton
					type="tertiary"
					size="small"
					data-test-id="determinism-callout-dismiss"
					:label="i18n.baseText('agentDeterminism.cta.dismiss')"
					@click="onDismiss"
				/>
				<N8nButton
					type="primary"
					size="small"
					data-test-id="determinism-callout-review"
					:label="i18n.baseText('agentDeterminism.cta.review')"
					@click="onReview"
				/>
			</div>
		</template>
	</N8nCallout>
</template>

<style module lang="scss">
.callout {
	margin: var(--spacing--xs);
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
