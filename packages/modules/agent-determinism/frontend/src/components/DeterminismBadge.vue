<script setup lang="ts">
import { N8nBadge, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import type { DeterminismSourceRef } from '../agent-determinism.api';
import { useDeterminismSuggestionsStore } from '../agent-determinism.store';

const props = defineProps<DeterminismSourceRef>();

const i18n = useI18n();
const router = useRouter();
const store = useDeterminismSuggestionsStore();

const suggestion = computed(() =>
	store.suggestionFor(props.projectId, props.sourceType, props.sourceId),
);

async function onClick() {
	if (!suggestion.value) return;
	await router.push(`/workflow/${suggestion.value.draftWorkflowId}`);
}

onMounted(async () => await store.ensureLoaded(props.projectId, props.sourceType));
</script>

<template>
	<N8nTooltip v-if="suggestion" :content="i18n.baseText('agentDeterminism.badge.tooltip')">
		<N8nBadge
			variant="success"
			leading-icon="sparkles"
			clickable
			data-test-id="determinism-badge"
			@click.stop="onClick"
		>
			{{
				i18n.baseText('agentDeterminism.badge.label', {
					interpolate: { gain: String(suggestion.gainPoints) },
				})
			}}
		</N8nBadge>
	</N8nTooltip>
</template>
