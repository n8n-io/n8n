<script setup lang="ts">
/**
 * Editing controls for an *inline* agent — the definition embedded in the AI
 * Agent node's own parameters — rendered as the "Agent" section of the NDV
 * Parameters tab. Every edit is a plain node-parameter write (workflow dirty
 * state, save-with-workflow, export fidelity), so there is no save status.
 *
 * Scope mirrors the inline schema: model + credential, instructions,
 * tools (incl. MCP servers), and skills (bodies embedded in the node
 * parameter). Memory, channels, sub-agents and tasks are saved-agent
 * features — the builder banner above nudges users there.
 */
import { computed, inject } from 'vue';
import { N8nMarkdownEditor, N8nSectionHeader, N8nText } from '@n8n/design-system';
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
const inline = ndv?.inline;

const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
const isInlineMode = computed(() => ndv?.mode.value === 'inline');
const projectId = computed(() => inline?.projectId.value ?? '');
const localConfig = computed(() => inline?.localConfig.value ?? null);
const canUpdate = computed(() => !props.isReadOnly);

const actions = computed(() => inline?.actions);

// Bind through a local computed: a ComputedRef nested inside the `actions`
// computed does not auto-unwrap in the template.
const appliedSkills = computed(() => inline?.actions.appliedSkills.value ?? []);

function onInstructionsUpdate(instructions: string) {
	inline?.scheduleConfigUpdate({ instructions });
}
</script>

<template>
	<div
		v-if="isAgentNode && isInlineMode"
		:class="$style.inlineControls"
		data-test-id="agent-ndv-inline-controls"
	>
		<N8nSectionHeader :title="i18n.baseText('agentNode.ndv.section.agent')" bordered />

		<AgentInfoPanel
			:config="localConfig"
			:project-id="projectId"
			:disabled="!canUpdate"
			embedded
			:show-instructions="false"
			@update:config="inline?.scheduleConfigUpdate"
		/>

		<div :class="$style.field">
			<N8nText tag="label" step="sm" bold>
				{{ i18n.baseText('agents.builder.agent.instructions.label') }}
			</N8nText>
			<N8nMarkdownEditor
				:model-value="localConfig?.instructions ?? ''"
				:disabled="!canUpdate"
				show-toolbar="always"
				max-height="480px"
				variant="contained"
				:class="$style.markdownEditor"
				data-testid="agent-ndv-inline-instructions"
				@update:model-value="onInstructionsUpdate"
			/>
		</div>

		<AgentCapabilitiesSection
			:config="localConfig"
			:tools="localConfig?.tools ?? []"
			:custom-tools="{}"
			:skills="appliedSkills"
			:connected-triggers="[]"
			:disabled="!canUpdate"
			:project-id="projectId"
			agent-id=""
			:is-published="false"
			:sections="['tools', 'skills']"
			@add-tool="actions?.onOpenAddToolModal"
			@open-tool="actions?.onOpenToolFromList"
			@remove-tool="actions?.onRemoveTool"
			@add-skill="actions?.onOpenAddSkillModal"
			@open-skill="actions?.onOpenSkillFromList"
			@remove-skill="actions?.onRemoveSkill"
			@update:config="inline?.scheduleConfigUpdate"
		/>
	</div>
</template>

<style module lang="scss">
.inlineControls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	margin-top: var(--spacing--lg);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.markdownEditor {
	aspect-ratio: 16/9;
}
</style>
