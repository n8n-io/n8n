<script setup lang="ts">
/**
 * Referenced-agent controls for the AI Agent node's NDV Parameters tab,
 * rendered as a plain "Agent" section (title + divider) between the call-site
 * parameters and the Advanced section.
 *
 * Edits the *shared agent primitive* (model, instructions, tools, skills) —
 * global, applies everywhere the agent is used. Channels, tasks and sub-agents
 * are intentionally excluded via the `sections` allowlist.
 *
 * Consumes the shared {@link NdvAgentConfigKey} orchestrator (owned by the
 * stable NDV container) so it shares one config/autosave/actions instance with
 * the other NDV agent surfaces.
 */
import { computed, inject } from 'vue';
import { N8nLink, N8nLoading, N8nSectionHeader, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentInfoPanel from '@/features/agents/components/AgentInfoPanel.vue';
import AgentCapabilitiesSection from '@/features/agents/components/AgentCapabilitiesSection.vue';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

const props = withDefaults(
	defineProps<{
		/** NDV-level read-only state (execution preview, history, read-only share). */
		isReadOnly?: boolean;
	}>(),
	{ isReadOnly: false },
);

const i18n = useI18n();

const ndv = inject(NdvAgentConfigKey);

const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
const agentId = computed(() => ndv?.agentId.value ?? '');
const projectId = computed(() => ndv?.projectId.value ?? '');
// A read-only NDV must not edit the shared agent, regardless of agent:update.
const canUpdate = computed(() => (ndv?.canUpdate.value ?? false) && !props.isReadOnly);
const localConfig = computed(() => ndv?.localConfig.value ?? null);
const agent = computed(() => ndv?.agent.value ?? null);
const appliedSkills = computed(() => ndv?.appliedSkills.value ?? []);
const loading = computed(() => ndv?.loading.value ?? false);
const isUnavailable = computed(() => ndv?.isUnavailable.value ?? false);
const isPublished = computed(() => ndv?.isPublished.value ?? false);
const saveStatus = computed(() => ndv?.saveStatus.value ?? 'idle');

// Mirrors the Agent Builder header: visible only while saving / freshly saved
// (`useAgentConfigAutosave` resets 'saved' → 'idle' after a short hold).
const saveStatusText = computed(() => {
	if (saveStatus.value === 'saving') return i18n.baseText('agents.builder.header.saving');
	if (saveStatus.value === 'saved') return i18n.baseText('agents.builder.header.saved');
	return '';
});

const actions = computed(() => ndv?.actions);

async function onEditInBuilder() {
	await ndv?.openBuilder();
}
</script>

<template>
	<!-- Guard: only for the AI Agent node, and only once an agent is referenced.
	     The picker / prompt live elsewhere in the Parameters tab. -->
	<div
		v-if="isAgentNode && agentId"
		:class="$style.referencedControls"
		data-test-id="agent-ndv-referenced-controls"
	>
		<N8nSectionHeader :title="i18n.baseText('agentNode.ndv.section.agent')" bordered>
			<template #actions>
				<N8nText
					v-if="saveStatusText"
					size="xsmall"
					color="text-light"
					data-test-id="agent-ndv-save-status"
				>
					{{ saveStatusText }}
				</N8nText>
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
		<N8nLoading v-else-if="loading && !localConfig" :rows="5" data-test-id="agent-ndv-loading" />

		<template v-else>
			<div :class="$style.infoPanelWrapper">
				<AgentInfoPanel
					:config="localConfig"
					:project-id="projectId"
					:disabled="!canUpdate"
					:show-instructions-toolbar="false"
					instructions-max-height="240px"
					embedded
					@update:config="ndv?.scheduleConfigUpdate"
				/>
			</div>

			<AgentCapabilitiesSection
				:config="localConfig"
				:tools="localConfig?.tools ?? []"
				:custom-tools="agent?.tools ?? {}"
				:skills="appliedSkills"
				:connected-triggers="[]"
				:disabled="!canUpdate"
				:project-id="projectId"
				:agent-id="agentId"
				:is-published="isPublished"
				:sections="['tools', 'skills']"
				@add-tool="actions?.onOpenAddToolModal"
				@open-tool="actions?.onOpenToolFromList"
				@remove-tool="actions?.onRemoveTool"
				@add-skill="actions?.onOpenAddSkillModal"
				@open-skill="actions?.onOpenSkillFromList"
				@remove-skill="actions?.onRemoveSkill"
				@update:config="ndv?.scheduleConfigUpdate"
				@agent-changed="ndv?.onConfigUpdated"
			/>
		</template>
	</div>
</template>

<style module lang="scss">
.referencedControls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	margin-top: var(--spacing--lg);
}

.unavailable {
	padding: var(--spacing--xs) 0;
}

.infoPanelWrapper {
	display: flex;
	flex-direction: column;
	width: 100%;
}
</style>
