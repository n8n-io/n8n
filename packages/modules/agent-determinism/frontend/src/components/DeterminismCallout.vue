<script setup lang="ts">
import type { DeterminismSuggestion } from '@n8n/api-types';
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
	dismissDeterminismSuggestion,
	getDeterminismSummary,
	type DeterminismSourceRef,
} from '../agent-determinism.api';
import { useDeterminismSuggestionsStore } from '../agent-determinism.store';

const props = defineProps<DeterminismSourceRef>();

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const suggestion = ref<DeterminismSuggestion | null>(null);
const analysing = ref(false);
let poll: ReturnType<typeof setTimeout> | undefined;
let unmounted = false;

async function load() {
	try {
		const summary = await getDeterminismSummary(rootStore.restApiContext, props);
		suggestion.value = summary.suggestion;
		analysing.value = summary.status === 'running';
	} catch {
		suggestion.value = null;
		analysing.value = false;
	}
	clearTimeout(poll);
	if (analysing.value && !unmounted) poll = setTimeout(load, 5000);
}

async function onReview() {
	if (!suggestion.value) return;
	await router.push(`/workflow/${suggestion.value.draftWorkflowId}`);
}

async function onDismiss() {
	suggestion.value = null;
	useDeterminismSuggestionsStore().forget(props.projectId, props.sourceType, props.sourceId);
	await dismissDeterminismSuggestion(rootStore.restApiContext, props);
}

onMounted(load);
onBeforeUnmount(() => {
	unmounted = true;
	clearTimeout(poll);
});
watch(() => props.sourceId, load);
</script>

<template>
	<N8nCallout
		v-if="!suggestion && analysing"
		theme="secondary"
		icon="refresh-cw"
		data-test-id="determinism-callout-analysing"
		:class="$style.callout"
	>
		{{ i18n.baseText('agentDeterminism.cta.analysing') }}
	</N8nCallout>
	<N8nCallout
		v-else-if="suggestion"
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
					share: String(Math.round(suggestion.trafficShare * 100)),
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
