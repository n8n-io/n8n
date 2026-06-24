<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { AgentJsonTaskConfig, AgentTaskDto } from '@n8n/api-types';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { updatedIconSet, type IconName } from '@n8n/design-system/components/N8nIcon';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';
import type { AgentJsonConfig, AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';
import type { AgentSkill, CustomToolEntry } from '../types';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { getAgentTasks } from '../composables/useAgentApi';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import { AGENT_SUB_AGENTS_MODAL_KEY, AGENT_TASK_MODAL_KEY } from '../constants';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import type { ToolMenuItem, ToolOpenTarget, ToolRow } from './AgentCapabilitiesSection.types';
import { buildToolRows } from './AgentCapabilitiesSection.utils';
import AgentChipButton from './AgentChipButton.vue';
import AgentChannelModal, { type ChannelView } from './AgentChannelModal.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		tools: AgentJsonToolRef[];
		customTools?: Record<string, CustomToolEntry>;
		skills: Array<{ id: string; skill: AgentSkill }>;
		connectedTriggers: string[];
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished: boolean;
		taskRefs?: AgentJsonTaskConfig[];
		reloadKey?: number;
	}>(),
	{ disabled: false, taskRefs: () => [] },
);

const emit = defineEmits<{
	'open-tool': [target: ToolOpenTarget];
	'open-skill': [id: string];
	'add-tool': [];
	'add-skill': [];
	'remove-tool': [index: number];
	'remove-skill': [id: string];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [{ triggerType: string; triggers: string[] }];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'agent-changed': [];
	'update:config': [updates: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();

const { catalog } = useAgentIntegrationsCatalog();
const projectIdRef = computed(() => props.projectId);
const { list: projectAgents, ensureLoaded: ensureProjectAgentsLoaded } =
	useProjectAgentsList(projectIdRef);

type TaskRow = AgentTaskDto & {
	enabled: boolean;
};

const channelModalOpen = ref(false);
const channelModalView = ref<ChannelView>('list');

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

function channelIcon(integrationIcon?: string): IconName {
	if (isIconName(integrationIcon)) return integrationIcon;
	return 'zap';
}

const channelRows = computed<Array<{ type: string; label: string; icon: IconName }>>(() =>
	props.connectedTriggers.map((channel) => {
		const integration = catalog.value?.find(({ type }) => type === channel);
		return {
			type: channel,
			label: integration?.label ?? channel,
			icon: channelIcon(integration?.icon),
		};
	}),
);

const hasChannels = computed(() => channelRows.value.length > 0);
const mcpServers = computed(() => props.config?.mcpServers ?? []);
const hasTools = computed(() => props.tools.length + mcpServers.value.length > 0);
const hasSkills = computed(() => props.skills.length > 0);
const selectedSubAgentRefs = computed(() => props.config?.subAgents?.agents ?? []);
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
	selectedSubAgentRefs.value.map(({ agentId, useWhen }) => {
		const agent = projectAgents.value?.find((candidate) => candidate.id === agentId);
		return {
			id: agentId,
			name: agent?.name ?? agentId,
			useWhen: useWhen ?? '',
		};
	}),
);
const hasSubAgents = computed(() => selectedSubAgents.value.length > 0);
const taskBodies = ref<AgentTaskDto[]>([]);
const taskErrorMessage = ref('');

const taskRows = computed<TaskRow[]>(() => {
	const bodiesById = new Map(taskBodies.value.map((body) => [body.id, body]));
	return props.taskRefs
		.map((taskRef) => {
			const body = bodiesById.get(taskRef.id);
			if (!body) return null;
			return {
				...body,
				enabled: taskRef.enabled,
			};
		})
		.filter((task): task is TaskRow => task !== null);
});
const hasTasks = computed(() => taskRows.value.length > 0);

async function reloadTasks() {
	taskErrorMessage.value = '';
	try {
		taskBodies.value = await getAgentTasks(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} catch (error) {
		taskErrorMessage.value =
			error instanceof Error && error.message
				? error.message
				: i18n.baseText('agents.builder.tasks.loadError');
	}
}

onMounted(() => {
	void reloadTasks();
	void ensureProjectAgentsLoaded().catch(() => {});
});

watch([() => props.reloadKey, () => props.projectId, () => props.agentId], () => {
	void reloadTasks();
});

function openTaskModal(task: TaskRow | null) {
	uiStore.openModalWithData({
		name: AGENT_TASK_MODAL_KEY,
		data: {
			projectId: props.projectId,
			agentId: props.agentId,
			task,
			isPublished: props.isPublished,
			taskState: task
				? {
						enabled: task.enabled,
					}
				: undefined,
			onToggle: (payload: { id: string; enabled: boolean }) => emit('toggle-task', payload),
			onSaved: () => emit('tasks-changed'),
		},
	});
}

type CapabilityToolEntry =
	| {
			kind: 'tool';
			index: number;
			tool: AgentJsonToolRef;
			openTarget: ToolOpenTarget;
	  }
	| {
			kind: 'mcpServer';
			index: number;
			server: AgentJsonMcpServerConfig;
			openTarget: ToolOpenTarget;
	  };

function toToolOpenTarget(tool: AgentJsonToolRef): ToolOpenTarget {
	if (tool.type === 'custom') {
		return { kind: 'tool', toolType: 'custom', id: tool.id };
	}

	if (tool.type === 'workflow') {
		return { kind: 'tool', toolType: 'workflow', id: tool.workflow };
	}

	return { kind: 'tool', toolType: 'node', id: tool.name };
}

const capabilityTools = computed<CapabilityToolEntry[]>(() => [
	...props.tools.map((tool, index) => ({
		kind: 'tool' as const,
		index,
		tool,
		openTarget: toToolOpenTarget(tool),
	})),
	...mcpServers.value.map((server, index) => ({
		kind: 'mcpServer' as const,
		index: props.tools.length + index,
		server,
		openTarget: { kind: 'mcpServer' as const, serverName: server.name },
	})),
]);

function toolLabel(entry: CapabilityToolEntry) {
	if (entry.kind === 'mcpServer') {
		return formatToolNameForDisplay(entry.server.name);
	}

	const { tool, index } = entry;
	if (tool.type === 'custom') {
		return formatToolNameForDisplay(
			(tool.id ? props.customTools?.[tool.id]?.descriptor.name : undefined) ??
				tool.id ??
				`${tool.type}-${index + 1}`,
		);
	}

	if (tool.type === 'workflow') {
		return formatToolNameForDisplay(tool.name ?? tool.workflow ?? `${tool.type}-${index + 1}`);
	}

	return formatToolNameForDisplay(tool.name ?? `${tool.type}-${index + 1}`);
}

function toolIcon(entry: CapabilityToolEntry): IconName {
	if (entry.kind === 'mcpServer') return 'globe';
	const { tool } = entry;
	if (tool.type === 'workflow') return 'workflow';
	if (tool.type === 'custom') return 'code';
	return 'globe';
}

function toolNodeType(entry: CapabilityToolEntry) {
	if (entry.kind === 'mcpServer') {
		const preferredTypeName = entry.server.metadata?.nodeTypeName ?? AI_MCP_TOOL_NODE_TYPE;
		return (
			nodeTypesStore.getNodeType(preferredTypeName) ??
			nodeTypesStore.getNodeType(AI_MCP_TOOL_NODE_TYPE) ??
			null
		);
	}

	const { tool } = entry;
	const node = toolRefToNode(tool);
	if (!node) return null;
	return nodeTypesStore.getNodeType(node.type, node.typeVersion) ?? null;
}

function toolTypeLabel(entry: CapabilityToolEntry, nodeType = toolNodeType(entry)) {
	if (entry.kind === 'mcpServer') {
		return nodeType?.displayName ?? toolLabel(entry);
	}

	const { tool } = entry;
	if (tool.type === 'node') {
		return nodeType?.displayName.replace(/ Tool$/, '') ?? toolLabel(entry);
	}

	if (tool.type === 'workflow') return i18n.baseText('agents.builder.tools.type.workflow');
	if (tool.type === 'custom') return i18n.baseText('agents.builder.tools.type.custom');
	return toolLabel(entry);
}

const toolRows = computed<ToolRow[]>(() => {
	return buildToolRows(
		capabilityTools.value.map((entry) => {
			const nodeType = toolNodeType(entry);
			return {
				index: entry.index,
				label: toolLabel(entry),
				typeLabel: toolTypeLabel(entry, nodeType),
				nodeType,
				fallbackIcon: toolIcon(entry),
				toolType: entry.kind === 'tool' ? entry.tool.type : 'mcpServer',
				openTarget: entry.openTarget,
			};
		}),
	);
});

function toTargetKey(target: ToolOpenTarget): string {
	if (target.kind === 'mcpServer') return `mcpServer:${encodeURIComponent(target.serverName)}`;
	return `tool:${target.toolType}:${encodeURIComponent(target.id)}`;
}

function fromTargetKey(key: string): ToolOpenTarget | null {
	const [scope, toolType, ...rest] = key.split(':');
	if (scope === 'mcpServer') {
		const encodedServerName = toolType;
		if (!encodedServerName) return null;
		return { kind: 'mcpServer', serverName: decodeURIComponent(encodedServerName) };
	}

	if (scope !== 'tool') return null;
	if (toolType !== 'node' && toolType !== 'workflow' && toolType !== 'custom') return null;
	const encodedId = rest.join(':');
	if (!encodedId) return null;
	return {
		kind: 'tool',
		toolType,
		id: decodeURIComponent(encodedId),
	};
}

function toolMenuItems(tool: ToolRow): ToolMenuItem[] {
	if (!tool.isGrouped) return [];

	return tool.tools.map((item) => ({
		id: toTargetKey(item.openTarget),
		label: item.label,
		data: { nodeType: item.nodeType, openTarget: item.openTarget },
	}));
}

function onToolMenuSelect(key: string) {
	const target = fromTargetKey(key);
	if (!target) return;
	emit('open-tool', target);
}

function emitSubAgentRefs(agents: typeof selectedSubAgentRefs.value) {
	emit('update:config', {
		subAgents: {
			...(props.config?.subAgents ?? {}),
			agents,
		},
	});
}

function toSubAgentRef(agentId: string, useWhen?: string) {
	return {
		agentId,
		...(useWhen ? { useWhen } : {}),
	};
}

function openChannelModal() {
	channelModalView.value = 'list';
	channelModalOpen.value = true;
}

async function openSubAgentsModal() {
	try {
		await ensureProjectAgentsLoaded();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.subAgents.loadError'));
		return;
	}

	uiStore.openModalWithData({
		name: AGENT_SUB_AGENTS_MODAL_KEY,
		data: {
			agents: availableSubAgents.value.map(({ id, name }) => ({
				id,
				name,
			})),
			onConfirm: ({ agentId, useWhen }: { agentId: string; useWhen?: string }) => {
				if (selectedSubAgentIdSet.value.has(agentId)) return;

				emitSubAgentRefs([...selectedSubAgentRefs.value, toSubAgentRef(agentId, useWhen)]);
			},
		},
	});
}

function openExistingSubAgentModal(subAgent: { id: string; name: string; useWhen: string }) {
	uiStore.openModalWithData({
		name: AGENT_SUB_AGENTS_MODAL_KEY,
		data: {
			selectedAgent: {
				id: subAgent.id,
				name: subAgent.name,
			},
			useWhen: subAgent.useWhen,
			onConfirm: ({ agentId, useWhen }: { agentId: string; useWhen?: string }) => {
				emitSubAgentRefs(
					selectedSubAgentRefs.value.map((ref) =>
						ref.agentId === agentId ? toSubAgentRef(agentId, useWhen) : ref,
					),
				);
			},
			onRemove: (agentId: string) => {
				emitSubAgentRefs(selectedSubAgentRefs.value.filter((ref) => ref.agentId !== agentId));
			},
		},
	});
}

function openChannelEdit(channelType: string) {
	const hasEditableChannelView = catalog.value?.some(({ type }) => type === channelType) ?? false;
	channelModalView.value = hasEditableChannelView ? (`${channelType}_edit` as ChannelView) : 'list';
	channelModalOpen.value = true;
}

function handleChannelConnected(channelType: string) {
	const channels = Array.from(new Set([...props.connectedTriggers, channelType]));
	emit('update:connected-triggers', channels);
	emit('trigger-added', { triggerType: channelType, triggers: channels });
}

function handleChannelDisconnected(channelType: string) {
	emit(
		'update:connected-triggers',
		props.connectedTriggers.filter((channel) => channel !== channelType),
	);
}
</script>

<template>
	<div>
		<div
			:class="[$style.section, props.disabled && $style.disabled]"
			:inert="props.disabled || undefined"
			data-testid="agent-capabilities-section"
		>
			<div :class="$style.capabilityRow">
				<N8nText size="small" color="text-light" :class="$style.rowLabel">
					{{ i18n.baseText('agents.builder.triggers.title') }}
				</N8nText>

				<div :class="$style.chips">
					<AgentChipButton
						v-for="channel in channelRows"
						:key="channel.type"
						:icon="channel.icon"
						:class="$style.capabilityChip"
						data-testid="agent-capabilities-channel-row"
						@click="openChannelEdit(channel.type)"
					>
						{{ channel.label }}
					</AgentChipButton>

					<N8nTooltip
						:disabled="!hasChannels"
						:content="i18n.baseText('agents.builder.triggers.add')"
						placement="top"
					>
						<N8nButton
							variant="ghost"
							size="medium"
							:icon-only="hasChannels"
							:disabled="props.disabled"
							data-testid="agent-capabilities-add-channel"
							@click="openChannelModal"
						>
							<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
							<template v-if="!hasChannels">
								{{ i18n.baseText('agents.builder.triggers.add') }}
							</template>
						</N8nButton>
					</N8nTooltip>
				</div>
			</div>

			<div :class="$style.capabilityRow">
				<N8nText size="small" color="text-light" :class="$style.rowLabel">
					{{ i18n.baseText('agents.builder.tools.title') }}
				</N8nText>

				<div :class="$style.chips">
					<template v-for="tool in toolRows" :key="`tool-${tool.index}`">
						<N8nDropdownMenu
							v-if="tool.isGrouped"
							:items="toolMenuItems(tool)"
							placement="bottom-start"
							data-testid="agent-capabilities-tool-group"
							@select="onToolMenuSelect"
						>
							<template #trigger>
								<AgentChipButton
									:class="$style.capabilityChip"
									data-testid="agent-capabilities-tool-row"
								>
									<template #icon>
										<NodeIcon :node-type="tool.nodeType" :size="16" />
									</template>
									<span :class="$style.groupChipLabel">
										{{ tool.label }}
										<N8nIcon icon="chevron-down" :size="12" color="text-light" />
									</span>
								</AgentChipButton>
							</template>
							<template #item-leading="{ item, ui }">
								<NodeIcon
									v-if="item.data?.nodeType"
									:node-type="item.data.nodeType"
									:size="16"
									:class="ui.class"
								/>
							</template>
						</N8nDropdownMenu>
						<AgentChipButton
							v-else-if="tool.nodeType"
							:class="$style.capabilityChip"
							data-testid="agent-capabilities-tool-row"
							@click="emit('open-tool', tool.tool.openTarget)"
						>
							<template #icon>
								<NodeIcon :node-type="tool.nodeType" :size="16" />
							</template>
							{{ tool.label }}
						</AgentChipButton>
						<AgentChipButton
							v-else
							:icon="tool.fallbackIcon"
							:class="$style.capabilityChip"
							data-testid="agent-capabilities-tool-row"
							@click="emit('open-tool', tool.tool.openTarget)"
						>
							{{ tool.label }}
						</AgentChipButton>
					</template>

					<N8nTooltip
						:disabled="!hasTools"
						:content="i18n.baseText('agents.builder.tools.add')"
						placement="top"
					>
						<N8nButton
							variant="ghost"
							size="medium"
							:icon-only="hasTools"
							:disabled="props.disabled"
							data-testid="agent-capabilities-add-tool"
							@click="emit('add-tool')"
						>
							<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
							<template v-if="!hasTools">
								{{ i18n.baseText('agents.builder.tools.add') }}
							</template>
						</N8nButton>
					</N8nTooltip>
				</div>
			</div>

			<div :class="$style.capabilityRow">
				<N8nText size="small" color="text-light" :class="$style.rowLabel">
					{{ i18n.baseText('agents.builder.skills.title') }}
				</N8nText>

				<div :class="$style.chips">
					<AgentChipButton
						v-for="{ id, skill } in skills"
						:key="id"
						icon="sparkles"
						:class="$style.capabilityChip"
						data-testid="agent-capabilities-skill-row"
						@click="emit('open-skill', id)"
					>
						{{ skill.name || id }}
					</AgentChipButton>

					<N8nTooltip
						:disabled="!hasSkills"
						:content="i18n.baseText('agents.builder.skills.add')"
						placement="top"
					>
						<N8nButton
							variant="ghost"
							size="medium"
							:icon-only="hasSkills"
							:disabled="props.disabled"
							data-testid="agent-capabilities-add-skill"
							@click="emit('add-skill')"
						>
							<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
							<template v-if="!hasSkills">
								{{ i18n.baseText('agents.builder.skills.add') }}
							</template>
						</N8nButton>
					</N8nTooltip>
				</div>
			</div>
			<div :class="$style.capabilityRow">
				<N8nText size="small" color="text-light" :class="$style.rowLabel">
					{{ i18n.baseText('agents.builder.subAgents.title') }}
				</N8nText>

				<div :class="$style.chips">
					<AgentChipButton
						v-for="subAgent in selectedSubAgents"
						:key="subAgent.id"
						icon="bot"
						:class="$style.capabilityChip"
						data-testid="agent-capabilities-sub-agent-row"
						@click="openExistingSubAgentModal(subAgent)"
					>
						{{ subAgent.name }}
					</AgentChipButton>

					<N8nTooltip
						:disabled="!hasSubAgents"
						:content="i18n.baseText('agents.builder.subAgents.modal.title')"
						placement="top"
					>
						<N8nButton
							variant="ghost"
							size="medium"
							:disabled="props.disabled"
							data-testid="agent-capabilities-add-sub-agent"
							@click="openSubAgentsModal"
						>
							<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
							{{ i18n.baseText('agents.builder.subAgents.add') }}
						</N8nButton>
					</N8nTooltip>
				</div>
			</div>
			<div :class="$style.capabilityRow">
				<N8nText size="small" color="text-light" :class="$style.rowLabel">
					{{ i18n.baseText('agents.builder.tasks.title') }}
				</N8nText>

				<div :class="$style.chips">
					<AgentChipButton
						v-for="task in taskRows"
						:key="task.id"
						icon="clipboard-list"
						:class="$style.capabilityChip"
						data-testid="agent-capabilities-task-row"
						@click="openTaskModal(task)"
					>
						{{ task.name }}
					</AgentChipButton>

					<N8nTooltip
						:disabled="!hasTasks"
						:content="i18n.baseText('agents.builder.tasks.add')"
						placement="top"
					>
						<N8nButton
							variant="ghost"
							size="medium"
							:icon-only="hasTasks"
							:disabled="props.disabled"
							data-testid="agent-capabilities-add-task"
							@click="openTaskModal(null)"
						>
							<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
							<template v-if="!hasTasks">
								{{ i18n.baseText('agents.builder.tasks.add') }}
							</template>
						</N8nButton>
					</N8nTooltip>

					<N8nText v-if="taskErrorMessage" size="small" :class="$style.error">
						{{ taskErrorMessage }}
					</N8nText>
				</div>
			</div>
		</div>

		<AgentChannelModal
			v-if="channelModalOpen"
			v-model:open="channelModalOpen"
			v-model:view="channelModalView"
			:agent-id="agentId"
			:project-id="projectId"
			:connected-channels="connectedTriggers"
			:is-published="isPublished"
			@channel-connected="handleChannelConnected"
			@channel-disconnected="handleChannelDisconnected"
			@agent-changed="emit('agent-changed')"
		/>
	</div>
</template>

<style module lang="scss">
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
}

.capabilityRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--lg);
	min-height: var(--height--lg);
}

.rowLabel {
	flex: 0 0 var(--spacing--3xl);
	line-height: var(--height--lg);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	min-width: 0;
	margin-top: var(--spacing--5xs);
}

.capabilityChip {
	max-width: min(12rem, 100%);
}

.groupChipLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.disabled {
	opacity: 0.5;
	pointer-events: none;
}

.error {
	color: var(--color--danger);
}

@media (max-width: 768px) {
	.capabilityRow {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.rowLabel {
		flex-basis: auto;
		line-height: var(--line-height--sm);
	}
}
</style>
