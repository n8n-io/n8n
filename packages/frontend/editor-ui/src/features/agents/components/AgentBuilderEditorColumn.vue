<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nCard, N8nIcon, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentConfigValidationIssue, AgentFileDto } from '@n8n/api-types';

import type { AgentBuilderMainTab } from '../composables/useAgentBuilderMainTabs';
import type {
	AgentJsonConfig,
	AgentJsonVectorStoreConfig,
	AgentResource,
	AgentSkill,
} from '../types';
import type { ToolOpenTarget, ToolPickerMode } from './AgentCapabilitiesSection.types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';
import AgentAdvancedPanel from './AgentAdvancedPanel.vue';
import AgentCapabilitiesSection from './AgentCapabilitiesSection.vue';
import AgentTriggersSection from './AgentTriggersSection.vue';
import AgentIdentityHeader from './AgentIdentityHeader.vue';
import AgentInfoPanel from './AgentInfoPanel.vue';
import AgentFilesPanel from './AgentFilesPanel.vue';
import AgentVectorStoresPanel from './AgentVectorStoresPanel.vue';
import AgentMcpPanel from './AgentMcpPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentSubAgentsPanel from './AgentSubAgentsPanel.vue';
import AgentBuilderTabPanel from './AgentBuilderTabPanel.vue';
import AgentPanel from './AgentPanel.vue';
import AgentEvalsSection from './AgentEvalsSection.vue';
import AgentPreviewButton from './AgentPreviewButton.vue';
import AgentSkillsSection from './AgentSkillsSection.vue';

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
	canEditAgent: boolean;
	/** `agent:execute`, which a project viewer holds without holding update. */
	canExecuteAgent?: boolean;
	agentAvailableInMcp?: boolean;
	executionsDescription: string;
	generatingEvalCases?: boolean;
	tasksReloadKey?: number;
	artifactMode?: boolean;
	preventScroll?: boolean;
	/** No agent row exists yet, so agent-scoped endpoints would 404. */
	agentUnsaved?: boolean;
	ensureAgentPersisted?: () => Promise<void>;
	configValidationIssues?: AgentConfigValidationIssue[];
}>();

const childrenDisabled = computed(() => !props.canEditAgent);
const isKnowledgeAdvancedExpanded = ref(false);

const settingsStore = useSettingsStore();
const isMcpAvailable = computed(
	() => settingsStore.isModuleActive('mcp') && !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled,
);

const emit = defineEmits<{
	'update:activeMainTab': [tab: AgentBuilderMainTab];
	'update:config': [updates: Partial<AgentJsonConfig>, meta?: { source: 'auto' }];
	'open-tool': [target: ToolOpenTarget];
	'open-skill': [id: string];
	'add-tool': [mode: ToolPickerMode];
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
	'toggle-mcp-access': [enabled: boolean];
	'tasks-changed': [];
	'preview-task': [instructions: string];
	'agent-changed': [];
	'generate-eval-cases': [];
	'open-preview': [];
}>();

const i18n = useI18n();
</script>

<template>
	<section
		:class="$style.editorColumn"
		:aria-label="i18n.baseText('agents.builder.editorColumn.ariaLabel')"
		data-testid="agent-builder-editor-column"
	>
		<div :class="[$style.panelArea, { [$style.preventScroll]: props.preventScroll }]">
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
					<AgentInfoPanel
						:config="localConfig"
						:disabled="childrenDisabled"
						:project-id="projectId"
						@update:config="(changes, meta) => emit('update:config', changes, meta)"
					/>

					<AgentPanel
						:header="i18n.baseText('agents.builder.skills.title')"
						:description="i18n.baseText('agents.builder.skills.description')"
						data-testid="agent-skills-panel"
					>
						<AgentSkillsSection
							:skills="appliedSkills"
							:disabled="childrenDisabled"
							:show-label="false"
							:validation-issues="configValidationIssues ?? []"
							@open-skill="emit('open-skill', $event)"
							@add-skill="emit('add-skill')"
							@remove-skill="emit('remove-skill', $event)"
						/>
					</AgentPanel>

					<AgentPanel
						:header="i18n.baseText('agents.builder.triggers.title')"
						:description="i18n.baseText('agents.builder.triggers.description')"
					>
						<template #header-actions>
							<AgentPreviewButton
								:is-runnable="props.agent?.isRunnable === true"
								:validation-issues="props.configValidationIssues ?? []"
								test-id="agent-triggers-preview-chat-button"
								@open-preview="emit('open-preview')"
							/>
						</template>
						<AgentTriggersSection
							:key="`${projectId}:${agentId}`"
							:connected-triggers="connectedTriggers"
							:disabled="childrenDisabled"
							:agent-id="agentId"
							:project-id="projectId"
							:is-published="Boolean(agent?.activeVersionId)"
							:is-runnable="props.agent?.isRunnable === true"
							:validation-issues="configValidationIssues ?? []"
							:simple-channel-setup="artifactMode"
							:agent-unsaved="agentUnsaved"
							:ensure-agent-persisted="ensureAgentPersisted"
							:task-refs="localConfig?.tasks ?? []"
							:reload-key="tasksReloadKey"
							@update:connected-triggers="emit('update:connected-triggers', $event)"
							@trigger-added="emit('trigger-added', $event)"
							@agent-changed="emit('agent-changed')"
							@toggle-task="emit('toggle-task', $event)"
							@tasks-changed="emit('tasks-changed')"
							@preview-task="emit('preview-task', $event)"
						/>
					</AgentPanel>

					<AgentPanel
						:header="i18n.baseText('agents.builder.capabilities.title')"
						:description="i18n.baseText('agents.builder.capabilities.description')"
					>
						<AgentCapabilitiesSection
							:config="localConfig"
							:tools="localConfig?.tools ?? []"
							:custom-tools="agent?.tools ?? {}"
							:skills="appliedSkills"
							:disabled="childrenDisabled"
							:project-id="projectId"
							:agent-id="agentId"
							:is-published="Boolean(agent?.activeVersionId)"
							:validation-issues="configValidationIssues ?? []"
							:agent-unsaved="agentUnsaved"
							:sections="['tools', 'subAgents', 'tasks']"
							@open-tool="emit('open-tool', $event)"
							@add-tool="emit('add-tool', $event)"
							@update:config="emit('update:config', $event)"
							@remove-tool="emit('remove-tool', $event)"
						/>
					</AgentPanel>

					<AgentMemoryPanel
						v-if="canEditAgent"
						:config="localConfig"
						:disabled="childrenDisabled"
						data-testid="agent-memory-panel"
						@update:config="emit('update:config', $event)"
					/>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'knowledge'"
					data-testid="agent-knowledge-tab-content"
				>
					<AgentPanel
						v-if="knowledgeBaseEnabled"
						:header="i18n.baseText('agents.builder.files.title')"
						:description="i18n.baseText('agents.builder.files.titleTooltip')"
					>
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
					</AgentPanel>
					<AgentPanel :header="i18n.baseText('agents.builder.knowledge.advanced.title')">
						<template #header="{ headerId }">
							<button
								:id="headerId"
								type="button"
								:class="$style.advancedTrigger"
								:aria-expanded="isKnowledgeAdvancedExpanded"
								data-testid="agent-knowledge-advanced-trigger"
								@click="isKnowledgeAdvancedExpanded = !isKnowledgeAdvancedExpanded"
							>
								<N8nText tag="span" bold data-testid="agent-knowledge-tab-content-advanced">
									{{ i18n.baseText('agents.builder.knowledge.advanced.title') }}
								</N8nText>
								<N8nIcon
									:icon="isKnowledgeAdvancedExpanded ? 'chevron-up' : 'chevron-down'"
									size="medium"
									color="text-light"
									aria-hidden="true"
									data-testid="agent-knowledge-advanced-chevron"
								/>
							</button>
						</template>
						<div
							v-if="isKnowledgeAdvancedExpanded"
							:class="$style.advancedContent"
							data-testid="agent-knowledge-advanced-content"
						>
							<AgentVectorStoresPanel
								:vector-stores="localConfig?.vectorStores ?? []"
								:disabled="childrenDisabled"
								data-testid="agent-vector-stores-card"
								@connect="emit('add-vector-store')"
								@edit="emit('edit-vector-store', $event)"
								@remove="emit('remove-vector-store', $event)"
							/>
						</div>
					</AgentPanel>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'sessions'"
					data-testid="agent-sessions-tab-content"
				>
					<AgentSessionsListView
						:embedded="true"
						:project-id="projectId"
						:agent-id="agentId"
						:manage-store-lifecycle="false"
						data-testid="agent-executions-panel"
					/>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'settings'"
					data-testid="agent-settings-tab-content"
				>
					<div :class="$style.settingsCards">
						<AgentSubAgentsPanel
							:config="localConfig"
							:disabled="childrenDisabled"
							:project-id="projectId"
							:agent-id="agentId"
							@update:config="emit('update:config', $event)"
						/>
						<N8nCard
							v-if="isMcpAvailable"
							:class="$style.settingsCard"
							data-testid="agent-settings-card"
						>
							<AgentMcpPanel
								:available-in-mcp="agentAvailableInMcp ?? false"
								:disabled="childrenDisabled"
								data-testid="agent-mcp-panel"
								@toggle-mcp-access="emit('toggle-mcp-access', $event)"
							/>
						</N8nCard>
						<AgentAdvancedPanel
							:config="localConfig"
							:disabled="childrenDisabled"
							:project-id="projectId"
							@update:config="emit('update:config', $event)"
						/>
					</div>
				</AgentBuilderTabPanel>

				<AgentBuilderTabPanel
					v-else-if="activeMainTab === 'evals'"
					data-testid="agent-evals-tab-content"
				>
					<AgentEvalsSection
						:project-id="projectId"
						:agent-id="agentId"
						:agent-unsaved="agentUnsaved"
						:disabled="childrenDisabled"
						:can-run="canExecuteAgent"
						:generating="generatingEvalCases"
						@generate="emit('generate-eval-cases')"
					/>
				</AgentBuilderTabPanel>
			</div>
		</div>
	</section>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
@use '@n8n/design-system/css/mixins/mixins' as scrollbar-mixins;

.advancedTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border: 1px solid transparent;
	margin: calc(var(--spacing--2xs) * -1);
	padding: 0 var(--spacing--2xs);
	height: var(--height--lg);
	outline: none;
	background: transparent;
	color: inherit;
	cursor: pointer;
	text-align: left;
	border-radius: var(--radius--lg);

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		background-color: var(--background--hover);
		@include focus.focus-ring-with-border;
	}
}

.advancedContent {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.editorColumn {
	display: flex;
	flex-direction: column;
	background-color: light-dark(var(--background--surface), var(--background));
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
	overflow: auto;
	scrollbar-gutter: stable;
	@include scrollbar-mixins.hoverable-scroll-bar;
}

.preventScroll {
	overflow: hidden;
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
	background-color: var(--background--surface);
}

.identityHeaderRow {
	flex-shrink: 0;
	display: flex;
	width: 100%;
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
	border-bottom: var(--border);

	:global([data-test-id='tab-agent'] > *) {
		padding-left: 0;
	}
}
</style>
