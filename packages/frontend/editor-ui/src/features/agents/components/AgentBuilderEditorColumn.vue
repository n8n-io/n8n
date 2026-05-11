<script setup lang="ts">
import { N8nCard, N8nRadioButtons } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentBuilderMainTab } from '../composables/useAgentBuilderMainTabs';
import type { AgentJsonConfig, AgentResource, AgentSkill } from '../types';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';
import AgentAdvancedPanel from './AgentAdvancedPanel.vue';
import AgentCapabilitiesSection from './AgentCapabilitiesSection.vue';
import AgentEvalsPanel from './AgentEvalsPanel.vue';
import AgentIdentityHeader from './AgentIdentityHeader.vue';
import AgentInfoPanel from './AgentInfoPanel.vue';
import AgentJsonEditor from './AgentJsonEditor.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentPanelHeader from './AgentPanelHeader.vue';

defineProps<{
	activeMainTab: AgentBuilderMainTab;
	mainTabOptions: Array<{ label: string; value: AgentBuilderMainTab }>;
	localConfig: AgentJsonConfig | null;
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
	appliedSkills: Array<{ id: string; skill: AgentSkill }>;
	connectedTriggers: string[];
	isBuildChatStreaming: boolean;
	executionsDescription: string;
}>();

const emit = defineEmits<{
	'update:activeMainTab': [tab: AgentBuilderMainTab];
	'update:config': [updates: Partial<AgentJsonConfig>];
	'open-tool': [index: number];
	'open-skill': [id: string];
	'open-trigger': [triggerType: string];
	'add-tool': [];
	'add-skill': [];
	'add-trigger': [];
	'remove-tool': [index: number];
	'remove-skill': [id: string];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
}>();

const i18n = useI18n();
</script>

<template>
	<section
		:class="$style.editorColumn"
		:aria-label="i18n.baseText('agents.builder.editorColumn.ariaLabel')"
		data-testid="agent-builder-editor-column"
	>
		<div :class="$style.panelArea">
			<div :class="$style.panelAreaContainer">
				<div :class="$style.panelHeaderRow">
					<AgentIdentityHeader
						v-if="activeMainTab === 'agent'"
						:config="localConfig"
						:disabled="isBuildChatStreaming"
						@update:config="emit('update:config', $event)"
					/>
					<AgentPanelHeader
						v-else-if="activeMainTab === 'executions'"
						:title="i18n.baseText('agents.builder.header.tab.executions')"
						:description="executionsDescription"
					/>
					<AgentPanelHeader
						v-else-if="activeMainTab === 'evaluations'"
						:title="i18n.baseText('agents.builder.header.tab.evaluations')"
						:description="
							i18n.baseText('agents.builder.evaluations.configuredInCode', {
								interpolate: { count: '0' },
							})
						"
					/>
					<AgentPanelHeader
						v-else-if="activeMainTab === 'raw'"
						:title="i18n.baseText('agents.builder.header.tab.raw')"
						:description="i18n.baseText('agents.builder.raw.description')"
					/>
					<div v-else />
					<N8nRadioButtons
						:model-value="activeMainTab"
						:options="mainTabOptions"
						:class="$style.mainTabs"
						data-testid="agent-header-tabs"
						@update:model-value="emit('update:activeMainTab', $event)"
					/>
				</div>

				<div v-if="activeMainTab === 'agent'" :class="$style.agentCards">
					<N8nCard variant="outlined" :class="$style.card">
						<AgentCapabilitiesSection
							:config="localConfig"
							:tools="localConfig?.tools ?? []"
							:custom-tools="agent?.tools ?? {}"
							:skills="appliedSkills"
							:connected-triggers="connectedTriggers"
							:disabled="isBuildChatStreaming"
							:project-id="projectId"
							:agent-id="agentId"
							:is-published="Boolean(agent?.publishedVersion)"
							@open-tool="emit('open-tool', $event)"
							@open-skill="emit('open-skill', $event)"
							@open-trigger="emit('open-trigger', $event)"
							@add-tool="emit('add-tool')"
							@add-skill="emit('add-skill')"
							@add-trigger="emit('add-trigger')"
							@remove-tool="emit('remove-tool', $event)"
							@remove-skill="emit('remove-skill', $event)"
							@update:connected-triggers="emit('update:connected-triggers', $event)"
							@trigger-added="emit('trigger-added', $event)"
						/>
					</N8nCard>
					<N8nCard variant="outlined" :class="$style.card">
						<AgentInfoPanel
							:config="localConfig"
							:disabled="isBuildChatStreaming"
							embedded
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>

					<N8nCard variant="outlined" :class="$style.card">
						<AgentMemoryPanel
							:config="localConfig"
							:disabled="isBuildChatStreaming"
							embedded
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>

					<N8nCard variant="outlined" :class="$style.card">
						<AgentAdvancedPanel
							:config="localConfig"
							:disabled="isBuildChatStreaming"
							collapsible
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>
				</div>

				<AgentSessionsListView
					v-else-if="activeMainTab === 'executions'"
					data-testid="agent-executions-panel"
				/>

				<div v-else-if="activeMainTab === 'raw'" :class="$style.rawPanel">
					<AgentJsonEditor
						:value="localConfig"
						:read-only="isBuildChatStreaming"
						copy-button-test-id="agent-config-json-copy"
						@update:value="emit('update:config', $event)"
					/>
				</div>

				<AgentEvalsPanel v-else data-testid="agent-evaluations-panel" />
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
.editorColumn {
	display: flex;
	flex-direction: column;
	background-color: var(--background--surface);
	min-height: 0;
	min-width: 0;
}

.panelArea {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
	overflow: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.panelAreaContainer {
	position: relative;
	display: flex;
	flex-direction: column;
	max-width: 72rem;
	width: 100%;
	padding: var(--spacing--sm);
	margin: 0 auto;
	height: 100%;
}

.panelHeaderRow {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg) var(--spacing--lg) 0;

	> *:first-child {
		width: 100%;
	}

	> .mainTabs {
		margin-left: auto;
	}
}

.rawPanel {
	display: flex;
	flex: 1;
	min-height: 0;
	width: 100%;
	padding: var(--spacing--lg);
}

.agentCards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	width: 100%;
	margin: 0 auto;
}

.panel {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.card {
	display: flex;
	flex-direction: column;
	width: 100%;
}
</style>
