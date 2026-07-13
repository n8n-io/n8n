<script setup lang="ts">
/**
 * Read-only summary of the *saved agent* referenced by the AI Agent node,
 * rendered as the "Agent" section of the NDV Parameters tab. The shared agent
 * is edited only in the Agent Builder — the section header links there.
 *
 * Deliberately not the disabled editing panels: a disabled form reads as "no
 * permission" and mounts modal/credential machinery a summary never needs.
 */
import { computed, inject, watch } from 'vue';
import type { AgentCapabilitySummary } from '@n8n/api-types';
import { N8nLink, N8nLoading, N8nSectionHeader, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	isAgentModelProvider,
} from '@/features/agents/model-providers';
import { useModelCatalog } from '@/features/agents/composables/useModelCatalog';
import { toCapabilitySummaryTools } from '@/features/agents/utils/capabilitySummaryTools';
import { parseModelString } from '@/features/agents/utils/model-string';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CanvasNodeAgentChips from '@/features/workflows/canvas/components/elements/nodes/render-types/parts/CanvasNodeAgentChips.vue';
import { buildAgentCardChips } from '@/features/workflows/canvas/components/elements/nodes/render-types/parts/canvasNodeAgentChips.utils';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const { catalog: modelCatalog, ensureLoaded: ensureModelsLoaded } = useModelCatalog();

const ndv = inject(NdvAgentConfigKey);
const referenced = ndv?.referenced;

const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
const agentId = computed(() => referenced?.agentId.value ?? '');
const projectId = computed(() => referenced?.projectId.value ?? '');
const config = computed(() => referenced?.config.value ?? null);
const agentRecord = computed(() => referenced?.agent.value ?? null);
const appliedSkills = computed(() => referenced?.appliedSkills.value ?? []);
const loading = computed(() => referenced?.loading.value ?? false);
const isUnavailable = computed(() => referenced?.isUnavailable.value ?? false);

const parsedModel = computed(() => {
	const model = config.value?.model;
	return model ? parseModelString(model) : null;
});

const modelCredentialType = computed(() => {
	const provider = parsedModel.value?.provider;
	return provider && isAgentModelProvider(provider)
		? AGENT_MODEL_PROVIDER_DEFINITIONS[provider].credentialTypes[0]
		: null;
});

// Friendly catalog name (e.g. "Claude Opus 4.8"), falling back to the raw id
// while the catalog loads or for an unknown model.
const modelName = computed(() => {
	const parsed = parsedModel.value;
	if (!parsed) return '';
	return modelCatalog.value[parsed.provider]?.models[parsed.name]?.name ?? parsed.name;
});

const instructions = computed(() => config.value?.instructions?.trim() ?? '');

function resolveNodeTypeLabel(nodeType: string, version?: number): string | undefined {
	return nodeTypesStore.getNodeType(nodeType, version)?.displayName.replace(/ Tool$/, '');
}

// Shape the fetched config like a capability summary so the canvas card's
// chip building (grouping, node icons) is reused as-is.
const chips = computed(() => {
	const cfg = config.value;
	if (!cfg) return [];

	const summaryShape: AgentCapabilitySummary = {
		id: agentId.value,
		name: cfg.name,
		model: null,
		channels: [],
		tools: toCapabilitySummaryTools(
			cfg.tools,
			(id) => agentRecord.value?.tools?.[id]?.descriptor.name,
		),
		skills: appliedSkills.value.map(({ id, skill }) => ({ id, name: skill.name })),
		tasks: [],
	};

	return buildAgentCardChips(summaryShape, resolveNodeTypeLabel);
});

// The friendly model name needs the catalog; projectId often resolves async.
watch(
	projectId,
	(id) => {
		if (!id) return;
		void ensureModelsLoaded(id).catch(() => {});
	},
	{ immediate: true },
);

async function onEditInBuilder() {
	await referenced?.openBuilder();
}
</script>

<template>
	<!-- Guard: only for the AI Agent node, and only once an agent is referenced.
	     The picker / prompt live elsewhere in the Parameters tab. -->
	<div
		v-if="isAgentNode && agentId"
		:class="$style.summary"
		data-test-id="agent-ndv-referenced-summary"
	>
		<N8nSectionHeader :title="i18n.baseText('agentNode.ndv.section.agent')" bordered>
			<template #actions>
				<N8nLink
					v-if="!isUnavailable"
					size="small"
					data-test-id="agent-ndv-edit-in-builder"
					@click="onEditInBuilder"
				>
					{{ i18n.baseText('agentNode.ndv.referenced.editInBuilder') }}
				</N8nLink>
			</template>
		</N8nSectionHeader>

		<!-- Terminal state: the referenced agent was deleted or access was lost. -->
		<N8nText
			v-if="isUnavailable"
			:class="$style.unavailable"
			color="danger"
			size="small"
			data-test-id="agent-ndv-unavailable"
		>
			{{ i18n.baseText('agentNode.ndv.unavailable') }}
		</N8nText>

		<!-- Skeleton keeps the pane height stable during the config fetch. -->
		<N8nLoading v-else-if="loading && !config" :rows="4" data-test-id="agent-ndv-loading" />

		<template v-else-if="config">
			<div :class="$style.identityRow">
				<N8nText bold data-test-id="agent-ndv-summary-name">{{ config.name }}</N8nText>
				<div :class="$style.modelRow" data-test-id="agent-ndv-summary-model">
					<CredentialIcon
						v-if="modelCredentialType"
						:credential-type-name="modelCredentialType"
						:size="16"
					/>
					<N8nText size="small" color="text-light">
						{{ modelName || i18n.baseText('agentNode.card.noModel') }}
					</N8nText>
				</div>
			</div>

			<N8nText
				v-if="instructions"
				size="small"
				color="text-base"
				:class="$style.instructions"
				data-test-id="agent-ndv-summary-instructions"
			>
				{{ instructions }}
			</N8nText>

			<CanvasNodeAgentChips v-if="chips.length" :chips="chips" />
		</template>
	</div>
</template>

<style module lang="scss">
.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	margin-top: var(--spacing--lg);
}

.unavailable {
	padding: var(--spacing--xs) 0;
}

.identityRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.modelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.instructions {
	display: -webkit-box;
	-webkit-line-clamp: 6;
	-webkit-box-orient: vertical;
	overflow: hidden;
	white-space: pre-line;
}
</style>
