<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard, N8nTabs } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentFileDto } from '@n8n/api-types';

import type { AgentBuilderMainTab } from '../composables/useAgentBuilderMainTabs';
import type {
	AgentJsonConfig,
	AgentJsonVectorStoreConfig,
	AgentResource,
	AgentSkill,
} from '../types';
import type { ToolOpenTarget } from './AgentCapabilitiesSection.types';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';
import AgentAdvancedPanel from './AgentAdvancedPanel.vue';
import AgentCapabilitiesSection from './AgentCapabilitiesSection.vue';
import AgentIdentityHeader from './AgentIdentityHeader.vue';
import AgentInfoPanel from './AgentInfoPanel.vue';
import AgentFilesPanel from './AgentFilesPanel.vue';
import AgentVectorStoresPanel from './AgentVectorStoresPanel.vue';
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
	artifactMode?: boolean;
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
	'add-vector-store': [];
	'edit-vector-store': [vectorStore: AgentJsonVectorStoreConfig];
	'remove-vector-store': [vectorStore: AgentJsonVectorStoreConfig];
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
						:simple-channel-setup="artifactMode"
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

					<AgentInfoPanel
						:config="localConfig"
						:disabled="childrenDisabled"
						:project-id="projectId"
						:show-instructions="false"
						embedded
						@update:config="emit('update:config', $event)"
					/>
					<AgentInfoPanel
						:config="localConfig"
						:disabled="childrenDisabled"
						:project-id="projectId"
						:show-model="false"
						:show-instructions-toolbar="true"
						embedded
						@update:config="emit('update:config', $event)"
					/>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'knowledge' && knowledgeBaseEnabled"
					data-testid="agent-knowledge-tab-content"
				>
					<AgentFilesPanel
						:files="agentFiles"
						:disabled="childrenDisabled"
						:loading="agentFilesLoading"
						:uploading="agentFilesUploading"
						:deleting-file-id="deletingAgentFileId"
						:is-published="Boolean(agent?.activeVersionId)"
						data-testid="agent-files-card"
						@upload-files="emit('upload-files', $event)"
						@delete-file="emit('delete-file', $event)"
					/>

					<AgentVectorStoresPanel
						:vector-stores="localConfig?.vectorStores ?? []"
						:disabled="childrenDisabled"
						data-testid="agent-vector-stores-card"
						@connect="emit('add-vector-store')"
						@edit="emit('edit-vector-store', $event)"
						@remove="emit('remove-vector-store', $event)"
					/>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'sessions'"
					data-testid="agent-sessions-tab-content"
				>
					<AgentSessionsListView
						:embedded="true"
						:project-id="projectId"
						:agent-id="agentId"
						:open-session-in-new-tab="artifactMode"
						data-testid="agent-executions-panel"
					/>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'settings'"
					data-testid="agent-settings-tab-content"
				>
					<div :class="$style.settingsCards">
						<N8nCard :class="$style.settingsCard" data-testid="agent-settings-card">
							<AgentSubAgentsPanel
								:config="localConfig"
								:disabled="childrenDisabled"
								:project-id="projectId"
								:agent-id="agentId"
								@update:config="emit('update:config', $event)"
							/>
						</N8nCard>
						<N8nCard :class="$style.settingsCard" data-testid="agent-settings-card">
							<AgentMemoryPanel
								:config="localConfig"
								:disabled="childrenDisabled"
								embedded
								data-testid="agent-memory-panel"
								@update:config="emit('update:config', $event)"
							/>
						</N8nCard>
						<N8nCard :class="$style.settingsCard" data-testid="agent-settings-card">
							<AgentAdvancedPanel
								:config="localConfig"
								:disabled="childrenDisabled"
								collapsible
								@update:config="emit('update:config', $event)"
							/>
						</N8nCard>
					</div>
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
	--agent-builder-content-max-width: 56rem;
	--agent-builder-content-padding-inline: var(--spacing--2xl);

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
	scrollbar-gutter: stable;
}

.panelAreaContainer {
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	box-sizing: border-box;
	max-width: var(--agent-builder-content-max-width);
	width: 100%;
	padding: var(--spacing--lg) var(--agent-builder-content-padding-inline);
	margin: 0 auto;
}

.settingsCards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
}

.settingsCard.settingsCard {
	--card--padding: var(--spacing--sm);

	align-items: stretch;
	background-color: transparent;
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
	box-sizing: border-box;
	width: 100%;
	max-width: var(--agent-builder-content-max-width);
	margin: 0 auto;
	padding: var(--spacing--2xl) var(--agent-builder-content-padding-inline) var(--spacing--xl);
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
	max-width: var(--agent-builder-content-max-width);
	margin: 0 auto;
	padding: 0 var(--agent-builder-content-padding-inline);
}

.mainTabs {
	width: 100%;
	border-bottom: calc(var(--border-width, 1px) * 2) var(--border-style, solid) var(--border-color);

	:global([data-test-id='tab-agent'] > *) {
		padding-left: 0;
	}
}
</style>
