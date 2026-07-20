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
import { N8nLoading, N8nMarkdown, N8nText, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	isAgentModelProvider,
} from '@/features/agents/model-providers';
import AgentPersonalisationIcon from '@/features/agents/components/AgentPersonalisationIcon.vue';
import { useModelCatalog } from '@/features/agents/composables/useModelCatalog';
import { toCapabilitySummaryTools } from '@/features/agents/utils/capabilitySummaryTools';
import { parseModelString } from '@/features/agents/utils/model-string';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CanvasNodeAgentChips from '@/features/workflows/canvas/components/elements/nodes/render-types/parts/CanvasNodeAgentChips.vue';
import { buildAgentCardChips } from '@/features/workflows/canvas/components/elements/nodes/render-types/parts/canvasNodeAgentChips.utils';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

const props = defineProps<{ isReadOnly?: boolean }>();

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
		mcpServers: (cfg.mcpServers ?? []).map((server) => ({ name: server.name })),
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
			<div :class="$style.config">
				<div :class="$style.configContent">
					<N8nButton
						v-if="!isUnavailable && !props.isReadOnly"
						size="small"
						icon="external-link"
						variant="subtle"
						:class="$style.editButton"
						data-test-id="agent-ndv-edit-in-builder"
						@click="onEditInBuilder"
					>
						{{ i18n.baseText('agentNode.ndv.referenced.editInBuilder') }}
					</N8nButton>
					<header :class="$style.header">
						<AgentPersonalisationIcon :personalisation="config.personalisation" :size="48" />
						<div :class="$style.identityRow">
							<N8nText bold step="2xl" data-test-id="agent-ndv-summary-name">{{
								config.name
							}}</N8nText>
							<div :class="$style.modelRow" data-test-id="agent-ndv-summary-model">
								<CredentialIcon
									v-if="modelCredentialType"
									:credential-type-name="modelCredentialType"
									:size="16"
								/>
								<N8nText bold color="text-light">
									{{ modelName || i18n.baseText('agentNode.card.noModel') }}
								</N8nText>
							</div>
						</div>
					</header>

					<N8nMarkdown
						v-if="instructions"
						:content="instructions"
						:class="$style.instructions"
						data-test-id="agent-ndv-summary-instructions"
					/>

					<CanvasNodeAgentChips
						v-if="chips.length"
						:chips="chips"
						:is-read-only="props.isReadOnly"
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins' as ds-mixins;

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.summary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	margin-top: var(--spacing--xl);
}

.editButton {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
}

.config {
	position: relative;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--xs);
	overflow: hidden;
}

.configContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
	padding: var(--spacing--xl) var(--spacing--lg);
	overflow: auto;
	scrollbar-gutter: stable;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	mask-image: linear-gradient(
		to bottom,
		black 0,
		black calc(100% - var(--spacing--sm)),
		transparent 100%
	);

	@include ds-mixins.scroll-bar;
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
	font-size: var(--font-size--sm);
	--font-size--md: var(--font-size--sm);
}
</style>
