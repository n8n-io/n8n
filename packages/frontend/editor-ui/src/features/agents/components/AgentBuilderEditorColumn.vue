<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard, N8nTabs } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentFileDto } from '@n8n/api-types';

import type { AgentBuilderMainTab } from '../composables/useAgentBuilderMainTabs';
import type { AgentJsonConfig, AgentResource, AgentSkill } from '../types';
import type { ToolOpenTarget } from './AgentCapabilitiesSection.types';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';
import AgentAdvancedPanel from './AgentAdvancedPanel.vue';
import AgentCapabilitiesSection from './AgentCapabilitiesSection.vue';
import AgentIdentityHeader from './AgentIdentityHeader.vue';
import AgentInfoPanel from './AgentInfoPanel.vue';
import AgentFilesPanel from './AgentFilesPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentSubAgentsPanel from './AgentSubAgentsPanel.vue';
import AgentBuilderTabPanel from './AgentBuilderTabPanel.vue';

const props = defineProps<{
	activeMainTab: AgentBuilderMainTab;
	mainTabOptions: Array<{ label: string; value: AgentBuilderMainTab }>;
	localConfig: AgentJsonConfig | null;
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
	agentFiles: AgentFileDto[];
	agentFilesLoading: boolean;
	agentFilesUploading: boolean;
	knowledgeBaseEnabled: boolean;
	deletingAgentFileId?: string | null;
	appliedSkills: Array<{ id: string; skill: AgentSkill }>;
	connectedTriggers: string[];
	isBuildChatStreaming: boolean;
	canEditAgent: boolean;
	executionsDescription: string;
	tasksReloadKey?: number;
}>();

const childrenDisabled = computed(() => props.isBuildChatStreaming || !props.canEditAgent);

const emit = defineEmits<{
	'update:activeMainTab': [tab: AgentBuilderMainTab];
	'update:config': [updates: Partial<AgentJsonConfig>];
	'open-tool': [target: ToolOpenTarget];
	'open-skill': [id: string];
	'add-tool': [];
	'add-skill': [];
	'remove-tool': [index: number];
	'remove-skill': [id: string];
	'upload-files': [files: File[]];
	'delete-file': [file: AgentFileDto];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [payload: { triggerType: string; triggers: string[] }];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'agent-changed': [];
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
			<div :class="$style.identityHeaderRow" data-testid="agent-builder-identity-header">
				<AgentIdentityHeader
					:config="localConfig"
					:disabled="childrenDisabled"
					:class="$style.identityHeader"
					@update:config="emit('update:config', $event)"
				/>
			</div>
			<div :class="$style.tabsRow" data-testid="agent-tabs-row">
				<div :class="$style.tabsRule" data-testid="agent-tabs-rule">
					<N8nTabs
						:model-value="activeMainTab"
						:options="mainTabOptions"
						:class="$style.mainTabs"
						data-testid="agent-header-tabs"
						@update:model-value="emit('update:activeMainTab', $event)"
					/>
				</div>
			</div>
			<div :class="$style.panelAreaContainer">
				<AgentBuilderTabPanel v-if="activeMainTab === 'agent'" data-testid="agent-tab-content">
					<N8nCard variant="outlined" :class="$style.card">
						<AgentCapabilitiesSection
							:config="localConfig"
							:tools="localConfig?.tools ?? []"
							:custom-tools="agent?.tools ?? {}"
							:skills="appliedSkills"
							:connected-triggers="connectedTriggers"
							:disabled="childrenDisabled"
							:project-id="projectId"
							:agent-id="agentId"
							:is-published="Boolean(agent?.activeVersionId)"
							:task-refs="localConfig?.tasks ?? []"
							:reload-key="tasksReloadKey"
							@open-tool="emit('open-tool', $event)"
							@open-skill="emit('open-skill', $event)"
							@add-tool="emit('add-tool')"
							@add-skill="emit('add-skill')"
							@update:config="emit('update:config', $event)"
							@remove-tool="emit('remove-tool', $event)"
							@remove-skill="emit('remove-skill', $event)"
							@update:connected-triggers="emit('update:connected-triggers', $event)"
							@trigger-added="emit('trigger-added', $event)"
							@toggle-task="emit('toggle-task', $event)"
							@tasks-changed="emit('tasks-changed')"
							@agent-changed="emit('agent-changed')"
						/>
					</N8nCard>
					<N8nCard variant="outlined" :class="$style.card">
						<AgentInfoPanel
							:config="localConfig"
							:disabled="childrenDisabled"
							:project-id="projectId"
							embedded
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>

					<N8nCard v-if="knowledgeBaseEnabled" variant="outlined" :class="$style.card">
						<AgentFilesPanel
							:files="agentFiles"
							:disabled="childrenDisabled"
							:loading="agentFilesLoading"
							:uploading="agentFilesUploading"
							:deleting-file-id="deletingAgentFileId"
							data-testid="agent-files-card"
							@upload-files="emit('upload-files', $event)"
							@delete-file="emit('delete-file', $event)"
						/>
					</N8nCard>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'sessions'"
					data-testid="agent-sessions-tab-content"
				>
					<AgentSessionsListView :embedded="true" data-testid="agent-executions-panel" />
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'settings'"
					data-testid="agent-settings-tab-content"
				>
					<N8nCard variant="outlined" :class="$style.card">
						<AgentSubAgentsPanel
							:config="localConfig"
							:disabled="childrenDisabled"
							:project-id="projectId"
							:agent-id="agentId"
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>
					<N8nCard variant="outlined" :class="$style.card">
						<AgentMemoryPanel
							:config="localConfig"
							:disabled="childrenDisabled"
							embedded
							data-testid="agent-memory-panel"
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>
					<N8nCard variant="outlined" :class="$style.card">
						<AgentAdvancedPanel
							:config="localConfig"
							:disabled="childrenDisabled"
							collapsible
							@update:config="emit('update:config', $event)"
						/>
					</N8nCard>
				</AgentBuilderTabPanel>
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
	min-width: var(--agent-builder-editor-min-width, 35rem);
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
	flex: 1;
	min-height: 0;
	max-width: 72rem;
	width: 100%;
	padding: var(--spacing--sm);
	margin: 0 auto;
}

.identityHeaderRow {
	flex-shrink: 0;
	display: flex;
	width: 100%;
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
}

.identityHeader {
	width: 100%;
	max-width: 72rem;
	margin: 0 auto;
	padding: var(--spacing--2xl) calc(var(--spacing--sm) + var(--spacing--lg)) var(--spacing--xl);
}

.tabsRow {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	width: 100%;
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
}

.tabsRule {
	box-sizing: border-box;
	width: 100%;
	max-width: 72rem;
	margin: 0 auto;
	padding: 0 calc(var(--spacing--sm) + var(--spacing--lg));
}

.mainTabs {
	width: 100%;
	border-bottom: calc(var(--border-width, 1px) * 2) var(--border-style, solid) var(--border-color);

	:global([data-test-id='tab-agent'] > *) {
		padding-left: 0;
	}
}

.card {
	display: flex;
	flex-direction: column;
	width: 100%;
}
</style>
