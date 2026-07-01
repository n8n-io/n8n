<script setup lang="ts">
/**
 * Custom agent settings for the AI Agent node's NDV Settings tab.
 *
 * Edits the *shared agent primitive* — episodic memory + behaviour knobs
 * (thinking, web search, tool-call concurrency, max iterations) — so it
 * carries the same scope boundary + "Open Agent Builder" deep-link as the
 * Parameters-tab controls. The retained node settings (Notes / retryOnFail /
 * onError) are rendered by `NodeSettings`, not here.
 *
 * Consumes the shared {@link NdvAgentConfigKey} orchestrator so it shares one
 * config/autosave instance with the Parameters tab.
 */
import { computed, inject } from 'vue';
import { N8nCallout, N8nCard, N8nLoading, N8nRoute, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { AGENT_BUILDER_VIEW } from '@/features/agents/constants';
import AgentMemoryPanel from '@/features/agents/components/AgentMemoryPanel.vue';
import AgentAdvancedPanel from '@/features/agents/components/AgentAdvancedPanel.vue';

import { NdvAgentConfigKey } from '../composables/useNdvAgentConfig';

const i18n = useI18n();

const ndv = inject(NdvAgentConfigKey);

const isAgentNode = computed(() => ndv?.isAgentNode.value ?? false);
const agentId = computed(() => ndv?.agentId.value ?? '');
const projectId = computed(() => ndv?.projectId.value ?? '');
const canUpdate = computed(() => ndv?.canUpdate.value ?? false);
const localConfig = computed(() => ndv?.localConfig.value ?? null);
const agent = computed(() => ndv?.agent.value ?? null);
const loading = computed(() => ndv?.loading.value ?? false);
const isUnavailable = computed(() => ndv?.isUnavailable.value ?? false);
const isPublished = computed(() => ndv?.isPublished.value ?? false);
const saveStatus = computed(() => ndv?.saveStatus.value ?? 'idle');

const agentName = computed(() => agent.value?.name ?? '');

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

const builderRoute = computed(() => ({
	name: AGENT_BUILDER_VIEW,
	params: { projectId: projectId.value, agentId: agentId.value },
}));

const saveStatusText = computed(() => {
	if (saveStatus.value === 'saving') return i18n.baseText('agentNode.ndv.saveStatus.saving');
	if (saveStatus.value === 'saved') return i18n.baseText('agentNode.ndv.saveStatus.saved');
	return '';
});
</script>

<template>
	<div v-if="isAgentNode" :class="$style.agentSettings" data-testid="agent-ndv-settings">
		<!-- No agent referenced yet: the picker lives on the Parameters tab. -->
		<N8nText v-if="!agentId" size="small" color="text-light" data-testid="agent-ndv-settings-empty">
			{{ i18n.baseText('agentNode.ndv.noAgentSettings') }}
		</N8nText>

		<N8nCard v-else :class="$style.scopeCard">
			<div :class="$style.scopeBody">
				<N8nCallout theme="info" :class="$style.scopeCallout">
					{{ scopeNotice }}
					<template #trailingContent>
						<div :class="$style.scopeActions">
							<N8nText
								v-if="saveStatusText"
								size="xsmall"
								color="text-light"
								data-testid="agent-ndv-settings-save-status"
							>
								{{ saveStatusText }}
							</N8nText>
							<N8nRoute
								:to="builderRoute"
								:class="$style.builderLink"
								data-test-id="agent-ndv-settings-open-builder"
							>
								{{ i18n.baseText('agentNode.ndv.openBuilder') }}
							</N8nRoute>
						</div>
					</template>
				</N8nCallout>

				<N8nText
					v-if="hasUnpublishedChanges"
					size="xsmall"
					color="text-light"
					data-testid="agent-ndv-settings-publish-hint"
				>
					{{ i18n.baseText('agentNode.ndv.publishHint') }}
				</N8nText>

				<N8nText
					v-if="isUnavailable"
					:class="$style.unavailable"
					color="danger"
					size="small"
					data-testid="agent-ndv-settings-unavailable"
				>
					{{ i18n.baseText('agentNode.ndv.unavailable') }}
				</N8nText>

				<N8nLoading
					v-else-if="loading && !localConfig"
					:rows="4"
					data-testid="agent-ndv-settings-loading"
				/>

				<template v-else>
					<AgentMemoryPanel
						:config="localConfig"
						:disabled="!canUpdate"
						embedded
						data-testid="agent-ndv-memory-panel"
						@update:config="ndv?.scheduleConfigUpdate"
					/>
					<AgentAdvancedPanel
						:config="localConfig"
						:disabled="!canUpdate"
						:collapsible="false"
						@update:config="ndv?.scheduleConfigUpdate"
					/>
				</template>
			</div>
		</N8nCard>
	</div>
</template>

<style module lang="scss">
.agentSettings {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.scopeCard {
	--card--padding: var(--spacing--sm);
}

// N8nCard lays its slot out in a row; stack the agent settings vertically.
.scopeBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.scopeCallout {
	width: 100%;
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
</style>
