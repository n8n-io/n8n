<script setup lang="ts">
/**
 * Referenced-agent controls for the AI Agent node's NDV Parameters tab.
 *
 * Edits the *shared agent primitive* (model, instructions, tools, skills) —
 * global, applies everywhere the agent is used — so it carries a visible scope
 * boundary + an "Open Agent Builder" deep-link. Channels, tasks and sub-agents
 * are intentionally excluded via the `sections` allowlist: channels and tasks
 * only make sense for a standalone agent (a channel isn't aware of — and won't
 * trigger — the workflow this node is embedded in; a task is the agent running a
 * capability on its own schedule, which the invoking workflow already controls),
 * and sub-agents stay builder-only.
 *
 * Consumes the shared {@link NdvAgentConfigKey} orchestrator (owned by the
 * stable NDV container) so it shares one config/autosave/actions instance with
 * the Settings tab.
 */
import { computed, inject } from 'vue';
import { N8nCallout, N8nCard, N8nLink, N8nLoading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentInfoPanel from '@/features/agents/components/AgentInfoPanel.vue';
import AgentCapabilitiesSection from '@/features/agents/components/AgentCapabilitiesSection.vue';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

const i18n = useI18n();

const ndv = inject(NdvAgentConfigKey);

const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
const agentId = computed(() => ndv?.agentId.value ?? '');
const projectId = computed(() => ndv?.projectId.value ?? '');
const canUpdate = computed(() => ndv?.canUpdate.value ?? false);
const localConfig = computed(() => ndv?.localConfig.value ?? null);
const agent = computed(() => ndv?.agent.value ?? null);
const appliedSkills = computed(() => ndv?.appliedSkills.value ?? []);
const loading = computed(() => ndv?.loading.value ?? false);
const isUnavailable = computed(() => ndv?.isUnavailable.value ?? false);
const isPublished = computed(() => ndv?.isPublished.value ?? false);
const saveStatus = computed(() => ndv?.saveStatus.value ?? 'idle');

const agentName = computed(() => agent.value?.name ?? '');

// A draft edit is ahead of the published version — the user must open the
// Agent Builder to publish it (no publish affordance in the NDV in v1).
const hasUnpublishedChanges = computed(
	() =>
		isPublished.value &&
		Boolean(agent.value?.versionId) &&
		agent.value?.versionId !== agent.value?.activeVersionId,
);

const scopeNotice = computed(() =>
	agentName.value
		? i18n.baseText('agentNode.ndv.scope.notice.named', {
				interpolate: { agentName: agentName.value },
			})
		: i18n.baseText('agentNode.ndv.scope.notice'),
);

// Open the builder through the shared orchestrator so it remembers this node as
// the origin (sets the "Back to workflow" return context), rather than a plain
// route link that would navigate without it.
function onOpenBuilder() {
	void ndv?.openBuilder();
}

const saveStatusText = computed(() => {
	if (saveStatus.value === 'saving') return i18n.baseText('agentNode.ndv.saveStatus.saving');
	if (saveStatus.value === 'saved') return i18n.baseText('agentNode.ndv.saveStatus.saved');
	return '';
});

const actions = computed(() => ndv?.actions);
</script>

<template>
	<!-- Guard: only for the AI Agent node, and only once an agent is referenced.
	     The picker / prompt live elsewhere in the Parameters tab. -->
	<div
		v-if="isAgentNode && agentId"
		:class="$style.referencedControls"
		data-testid="agent-ndv-referenced-controls"
	>
		<N8nCard :class="$style.scopeCard">
			<div :class="$style.scopeBody">
				<N8nCallout theme="info" :class="$style.scopeCallout">
					{{ scopeNotice }}
					<template #trailingContent>
						<div :class="$style.scopeActions">
							<N8nText
								v-if="saveStatusText"
								size="xsmall"
								color="text-light"
								data-testid="agent-ndv-save-status"
							>
								{{ saveStatusText }}
							</N8nText>
							<N8nLink
								theme="primary"
								:class="$style.builderLink"
								data-test-id="agent-ndv-open-builder"
								@click.prevent="onOpenBuilder"
							>
								{{ i18n.baseText('agentNode.ndv.openBuilder') }}
							</N8nLink>
						</div>
					</template>
				</N8nCallout>

				<N8nText
					v-if="hasUnpublishedChanges"
					size="xsmall"
					color="text-light"
					data-testid="agent-ndv-publish-hint"
				>
					{{ i18n.baseText('agentNode.ndv.publishHint') }}
				</N8nText>

				<!-- Terminal state: the referenced agent was deleted or access was lost. -->
				<N8nText
					v-if="isUnavailable"
					:class="$style.unavailable"
					color="danger"
					size="small"
					data-testid="agent-ndv-unavailable"
				>
					{{ i18n.baseText('agentNode.ndv.unavailable') }}
				</N8nText>

				<!-- Skeleton keeps the pane height stable during the config fetch. -->
				<N8nLoading v-else-if="loading && !localConfig" :rows="5" data-testid="agent-ndv-loading" />

				<template v-else>
					<div :class="$style.infoPanelWrapper">
						<AgentInfoPanel
							:config="localConfig"
							:project-id="projectId"
							:disabled="!canUpdate"
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
		</N8nCard>
	</div>
</template>

<style module lang="scss">
.referencedControls {
	display: flex;
	flex-direction: column;
	width: 100%;
	margin-top: var(--spacing--sm);
}

.scopeCard {
	--card--padding: var(--spacing--sm);
}

// N8nCard lays its slot out in a row; stack the referenced controls vertically.
.scopeBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.scopeCallout {
	width: 100%;
}

.scopeText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.scopeActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	white-space: nowrap;
}

.builderLink {
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.unavailable {
	padding: var(--spacing--xs) 0;
}

.infoPanelWrapper {
	display: flex;
	flex-direction: column;
	width: 100%;

	// Cap the embedded instructions editor so it can't bury the call-site prompt
	// (AgentInfoPanel hardcodes a 640px editor max — see report follow-up).
	:global(.instructionsEditor) {
		max-height: 240px;
	}
}
</style>
