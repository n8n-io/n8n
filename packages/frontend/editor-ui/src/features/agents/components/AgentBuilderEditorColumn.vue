<script setup lang="ts">
import { computed, onMounted } from 'vue';
import {
	N8nCard,
	N8nIcon,
	N8nIconButton,
	N8nRadioButtons,
	N8nScrollArea,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentFileDto } from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';

import type { AgentBuilderMainTab } from '../composables/useAgentBuilderMainTabs';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import type { AgentJsonConfig, AgentResource, AgentSkill } from '../types';
import type { ToolOpenTarget } from './AgentCapabilitiesSection.types';
import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import AgentSessionsListView from '../views/AgentSessionsListView.vue';
import AgentAdvancedPanel from './AgentAdvancedPanel.vue';
import AgentCapabilitiesSection from './AgentCapabilitiesSection.vue';
import AgentIdentityHeader from './AgentIdentityHeader.vue';
import AgentInfoPanel from './AgentInfoPanel.vue';
import AgentJsonEditor from './AgentJsonEditor.vue';
import AgentFilesPanel from './AgentFilesPanel.vue';
import AgentMemoryPanel from './AgentMemoryPanel.vue';
import AgentPanelHeader from './AgentPanelHeader.vue';

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
}>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const { list: projectAgents, ensureLoaded: ensureProjectAgentsLoaded } = useProjectAgentsList(
	computed(() => props.projectId),
);

onMounted(() => {
	void ensureProjectAgentsLoaded().catch(() => {});
});

const selectedSubAgentRefs = computed(() => props.localConfig?.subAgents?.agents ?? []);
const selectedSubAgentIds = computed(() =>
	selectedSubAgentRefs.value.map(({ agentId }) => agentId),
);
const selectedSubAgentIdSet = computed(() => new Set(selectedSubAgentIds.value));
const availableSubAgents = computed(() =>
	(projectAgents.value ?? []).filter(
		(agent) =>
			agent.id !== props.agentId &&
			Boolean(agent.activeVersionId) &&
			!selectedSubAgentIdSet.value.has(agent.id),
	),
);
const selectedSubAgents = computed(() =>
	selectedSubAgentIds.value.map((agentId) => {
		const agent = projectAgents.value?.find((candidate) => candidate.id === agentId);
		return {
			id: agentId,
			name: agent?.name ?? agentId,
			description: agent?.description ?? null,
		};
	}),
);

async function onOpenAddSubAgentsModal() {
	if (childrenDisabled.value) return;

	try {
		await ensureProjectAgentsLoaded();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.subAgents.loadError'));
		return;
	}

	uiStore.openModalWithData({
		name: AGENT_SUB_AGENTS_MODAL_KEY,
		data: {
			agents: availableSubAgents.value.map(({ id, name, description }) => ({
				id,
				name,
				description,
			})),
			onConfirm: (agentIds: string[]) => {
				const newAgentRefs = agentIds
					.filter((agentId) => !selectedSubAgentIdSet.value.has(agentId))
					.map((agentId) => ({ agentId }));

				if (newAgentRefs.length === 0) return;

				emit('update:config', {
					subAgents: {
						agents: [...selectedSubAgentRefs.value, ...newAgentRefs],
					},
				});
			},
		},
	});
}

function onRemoveSubAgent(agentId: string) {
	emit('update:config', {
		subAgents: {
			agents: selectedSubAgentRefs.value.filter((subAgent) => subAgent.agentId !== agentId),
		},
	});
}
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
						:disabled="childrenDisabled"
						@update:config="emit('update:config', $event)"
					/>
					<AgentPanelHeader
						v-else-if="activeMainTab === 'executions'"
						:title="i18n.baseText('agents.builder.header.tab.executions')"
						:description="executionsDescription"
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
							@remove-tool="emit('remove-tool', $event)"
							@remove-skill="emit('remove-skill', $event)"
							@update:connected-triggers="emit('update:connected-triggers', $event)"
							@trigger-added="emit('trigger-added', $event)"
							@toggle-task="emit('toggle-task', $event)"
							@tasks-changed="emit('tasks-changed')"
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

					<N8nCard variant="outlined" :class="$style.card">
						<div :class="[$style.subAgentsPanel, childrenDisabled && $style.disabled]">
							<div :class="$style.subAgentsHeader">
								<div :class="$style.subAgentsText">
									<N8nText tag="h3" :bold="true">
										{{ i18n.baseText('agents.builder.subAgents.title') }}
									</N8nText>
									<N8nText size="small" color="text-light">
										{{ i18n.baseText('agents.builder.subAgents.description') }}
									</N8nText>
								</div>
								<div :class="$style.subAgentsHeaderActions">
									<N8nTooltip
										:content="i18n.baseText('agents.builder.subAgents.add')"
										placement="top"
									>
										<N8nIconButton
											icon="plus"
											variant="ghost"
											size="small"
											icon-size="medium"
											:disabled="childrenDisabled"
											:aria-label="i18n.baseText('agents.builder.subAgents.add')"
											data-testid="agent-sub-agents-open-add-modal"
											@click="onOpenAddSubAgentsModal"
										/>
									</N8nTooltip>
								</div>
							</div>

							<div v-if="selectedSubAgents.length > 0" :class="$style.subAgentsContent">
								<N8nScrollArea
									max-height="calc((var(--spacing--2xl) + var(--spacing--sm)) * 5)"
									type="auto"
									:class="$style.rows"
								>
									<div :class="$style.rowList">
										<N8nCard
											v-for="subAgent in selectedSubAgents"
											:key="subAgent.id"
											:class="$style.row"
											data-testid="agent-sub-agent-row"
										>
											<template #prepend>
												<N8nIcon icon="bot" size="medium" :class="$style.itemIcon" />
											</template>

											<N8nText size="xsmall" color="text-dark" :bold="true" :class="$style.name">
												{{ subAgent.name }}
											</N8nText>
											<N8nText
												v-if="subAgent.description"
												size="xsmall"
												color="text-light"
												:class="$style.metadata"
											>
												{{ subAgent.description }}
											</N8nText>

											<template #append>
												<N8nTooltip
													:content="
														i18n.baseText('agents.builder.subAgents.remove', {
															interpolate: { name: subAgent.name },
														})
													"
													placement="top"
												>
													<N8nIconButton
														icon="trash-2"
														variant="ghost"
														size="mini"
														icon-size="small"
														:disabled="childrenDisabled"
														:aria-label="
															i18n.baseText('agents.builder.subAgents.remove', {
																interpolate: { name: subAgent.name },
															})
														"
														data-testid="agent-sub-agent-remove"
														@click="onRemoveSubAgent(subAgent.id)"
													/>
												</N8nTooltip>
											</template>
										</N8nCard>
									</div>
								</N8nScrollArea>
							</div>
						</div>
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
				</div>

				<AgentSessionsListView
					v-else-if="activeMainTab === 'executions'"
					data-testid="agent-executions-panel"
				/>

				<div v-else-if="activeMainTab === 'raw'" :class="$style.rawPanel">
					<AgentJsonEditor
						:value="localConfig"
						:read-only="childrenDisabled"
						copy-button-test-id="agent-config-json-copy"
						@update:value="emit('update:config', $event)"
					/>
				</div>
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

.subAgentsPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.subAgentsPanel.disabled > :not(.subAgentsHeader) {
	pointer-events: none;
	opacity: 0.6;
}

.subAgentsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
}

.subAgentsText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.subAgentsHeaderActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.subAgentsContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.rowList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding-right: var(--spacing--xs);
}

.rows {
	scrollbar-gutter: stable;
}

.row {
	--card--append--width: auto;
	flex-shrink: 0;
}

.itemIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.name,
.metadata {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}
</style>
