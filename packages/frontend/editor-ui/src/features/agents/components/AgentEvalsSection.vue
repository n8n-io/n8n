<script setup lang="ts">
/**
 * Container for the agent's eval surface: the drafted cases once a dataset exists,
 * the first-run state before one does. The review view mounts here too as it lands,
 * which is why each state is a branch rather than the whole component.
 */
import { N8nButton, N8nCallout, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useAgentEvalsStore } from '../agentEvals.store';
import { isDataTableDataset } from '../utils/agentEvalCases.utils';
import AgentEvalCasesCard from './AgentEvalCasesCard.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	/** No `agent:update` — cases render but nothing can be changed. */
	disabled?: boolean;
	/** `agent:execute`, which a viewer holds without holding update. */
	canRun?: boolean;
	generating?: boolean;
}>();

const emit = defineEmits<{
	generate: [];
}>();

const i18n = useI18n();
const store = useAgentEvalsStore();

const datasets = computed(() => store.getDatasets(props.agentId));

// Newest first from the server, so the newest data-table dataset is the one a
// regeneration just produced.
const dataset = computed(() => datasets.value.find(isDataTableDataset) ?? null);

// A dataset this view can't read rows for — reachable only by attaching one
// through the API, but falling through to "no test cases yet" would be a lie.
const hasOnlyExternalDatasets = computed(() => datasets.value.length > 0 && dataset.value === null);

/** The target whose read is allowed to settle. Reads for anything else are stale:
 * an earlier agent's fetch finishing must not dismiss the current agent's skeleton
 * and expose a first-run CTA for an agent that may already have cases. */
const settledFor = ref<string | null>(null);

const targetKey = computed(() => `${props.projectId}:${props.agentId}`);
const isLoading = computed(() => settledFor.value !== targetKey.value);

// Absence of a cache entry is "not read yet" rather than "none", which is what
// decides whether to read at all. A failure degrades to the first-run state: with
// no datasets to show, the generate CTA is still the right next step.
watch(
	[() => props.projectId, () => props.agentId],
	async ([projectId, agentId]) => {
		if (!projectId || !agentId) return;

		const target = `${projectId}:${agentId}`;
		if (store.isLoaded(agentId)) {
			settledFor.value = target;
			return;
		}

		try {
			await store.fetchDatasets(projectId, agentId);
		} catch {
			// Intentionally quiet — the first-run state is a reasonable fallback, and a
			// toast here would fire on every visit to the tab while the read keeps failing.
		} finally {
			// Only the read for the target still on screen may settle.
			if (target === targetKey.value) settledFor.value = target;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.section" data-testid="agent-evals-section">
		<div v-if="isLoading" data-testid="agent-evals-loading">
			<N8nLoading variant="p" :rows="6" />
		</div>

		<AgentEvalCasesCard
			v-else-if="dataset"
			:key="`${projectId}:${agentId}:${dataset.id}`"
			:project-id="projectId"
			:agent-id="agentId"
			:dataset="dataset"
			:disabled="disabled"
			:can-run="canRun"
			:generating="generating"
			@regenerate="emit('generate')"
		/>

		<N8nCallout
			v-else-if="hasOnlyExternalDatasets"
			theme="info"
			data-testid="agent-evals-external-source"
		>
			{{ i18n.baseText('agents.builder.agentEvals.external.description') }}
		</N8nCallout>

		<div v-else :class="$style.emptyState" data-testid="agent-evals-empty-state">
			<div :class="$style.iconBadge">
				<N8nIcon icon="sparkles" size="xlarge" />
			</div>
			<N8nText tag="h3" size="large" color="text-dark" bold :class="$style.title">
				{{ i18n.baseText('agents.builder.agentEvals.empty.title') }}
			</N8nText>
			<N8nText size="medium" color="text-base" :class="$style.description">
				{{ i18n.baseText('agents.builder.agentEvals.empty.description') }}
			</N8nText>
			<N8nButton
				variant="solid"
				size="large"
				type="button"
				icon="sparkles"
				:disabled="disabled"
				:loading="generating"
				data-testid="agent-evals-generate-button"
				@click="emit('generate')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.empty.generate') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
}

/* Vertical rhythm is a single uniform gap, matching the design — no per-child
   margins, so adding the case list later can't inherit odd spacing. */
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--2xl) var(--spacing--lg);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
	text-align: center;
}

.iconBadge {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xs);
	color: var(--color--text);
	background-color: var(--background--active);
	border-radius: var(--radius);
}

.title {
	margin: 0;
}

/* Caps the measure at the design's 400px so the copy wraps to three lines
   instead of stretching the full panel width. */
.description {
	display: block;
	max-width: 25rem;
}
</style>
