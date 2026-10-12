<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useToast } from '@n8n/composables/useToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { AgentConfigValidationIssue, AgentJsonTaskConfig } from '@n8n/api-types';
import {
	N8nDropdownMenu,
	N8nDropdownMenuItem,
	N8nIcon,
	N8nTag,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import type { AgentJsonConfig, AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';
import type { AgentSkill, CustomToolEntry } from '../types';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useCreateAgent } from '../composables/useCreateAgent';
import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import { isWarningIssue } from '../utils/validationIssues';
import type {
	ToolMenuItem,
	ToolOpenTarget,
	ToolPickerMode,
	ToolRow,
	GroupedToolRow,
	SingleToolRow,
} from './AgentCapabilitiesSection.types';
import { buildToolRows } from './AgentCapabilitiesSection.utils';
import AgentChipButton from './AgentChipButton.vue';
import AgentChipRow from './AgentChipRow.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentSkillsSection from './AgentSkillsSection.vue';
import AgentWebSearchSection from './AgentWebSearchSection.vue';

export type AgentCapabilitySection = 'tools' | 'tasks' | 'skills' | 'subAgents';
type CapabilityRow = Exclude<AgentCapabilitySection, 'tasks'> | 'workflows';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		tools: AgentJsonToolRef[];
		customTools?: Record<string, CustomToolEntry>;
		skills: Array<{ id: string; skill: AgentSkill; enabled?: boolean }>;
		supportsActivation?: boolean;
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished: boolean;
		taskRefs?: AgentJsonTaskConfig[];
		reloadKey?: number;
		/** No agent row exists yet — an unsaved agent has no tasks to load. */
		agentUnsaved?: boolean;

		/** Structured backend validation issues — drives the invalid state on capability chips. */
		validationIssues?: AgentConfigValidationIssue[];
		/** Capability sections to render. */

		sections?: AgentCapabilitySection[];
	}>(),
	{
		disabled: false,
		supportsActivation: false,
		taskRefs: () => [],

		validationIssues: () => [],

		sections: () => ['tools', 'skills', 'subAgents', 'tasks'],
	},
);

const visibleSections = computed(() => new Set(props.sections));
function showSection(section: AgentCapabilitySection): boolean {
	return visibleSections.value.has(section);
}

const emit = defineEmits<{
	'open-tool': [target: ToolOpenTarget];
	'open-skill': [id: string];
	'add-tool': [mode: ToolPickerMode];
	'add-skill': [];
	'remove-tool': [index: number];
	'remove-skill': [id: string];
	'toggle-skill': [payload: { id: string; enabled: boolean }];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'update:config': [updates: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();
const toast = useToast();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const { createAgent } = useCreateAgent();
const openToolGroup = ref<number | null>(null);

const projectIdRef = computed(() => props.projectId);
const { canCreate: canCreateAgent } = useAgentPermissions(projectIdRef);
const {
	list: projectAgents,
	ensureLoaded: ensureProjectAgentsLoaded,
	refresh: refreshProjectAgents,
} = useProjectAgentsList(projectIdRef);

const mcpServers = computed(() => props.config?.mcpServers ?? []);
const selectedSubAgentRefs = computed(() => props.config?.subAgents?.agents ?? []);
const selectedSubAgentIds = computed(() =>
	selectedSubAgentRefs.value.map(({ agentId }) => agentId),
);
const selectedSubAgentIdSet = computed(() => new Set(selectedSubAgentIds.value));
const availableSubAgents = computed(() =>
	(projectAgents.value ?? []).filter((agent) => agent.id !== props.agentId),
);
const selectedSubAgents = computed(() =>
	selectedSubAgentRefs.value.map(({ agentId, useWhen, enabled }) => {
		const agent = projectAgents.value?.find((candidate) => candidate.id === agentId);
		const validationReasons =
			enabled === false ? [] : (subAgentIssueMessages.value.get(agentId) ?? []);
		const reasons =
			validationReasons.length > 0 || agent || projectAgents.value === null || enabled === false
				? validationReasons
				: [i18n.baseText('agents.builder.validation.issue.subAgent.missingReference')];
		return {
			id: agentId,
			enabled: enabled !== false,
			name: agent?.name ?? i18n.baseText('agents.builder.subAgents.unavailable'),
			useWhen: useWhen ?? '',
			invalid: reasons.length > 0,
			invalidReasons: reasons,
		};
	}),
);
const { groupIssueMessages } = useAgentCapabilityIssueMessages(() => props.validationIssues);

// Warnings (an unpublished workflow) render orange and leave the preview usable;
// everything else is a red error.
const toolIssueMessages = computed(() =>
	groupIssueMessages(
		'tool',
		(issue) => issue.capability.index,
		(issue) => !isWarningIssue(issue),
	),
);
const toolWarningMessages = computed(() =>
	groupIssueMessages('tool', (issue) => issue.capability.index, isWarningIssue),
);
const mcpServerIssueMessages = computed(() =>
	groupIssueMessages('mcpServer', (issue) => issue.capability.id),
);
const subAgentIssueMessages = computed(() =>
	groupIssueMessages('subAgent', (issue) => issue.capability.id),
);

async function ensureSubAgentNamesLoaded() {
	const agents = await ensureProjectAgentsLoaded();
	const loadedIds = new Set(agents.map((agent) => agent.id));
	if (selectedSubAgentIds.value.some((agentId) => !loadedIds.has(agentId))) {
		await refreshProjectAgents();
	}
}

onMounted(() => {
	if (showSection('subAgents')) void ensureSubAgentNamesLoaded().catch(() => {});
});

watch([() => props.projectId, selectedSubAgentIds], () => {
	if (showSection('subAgents')) void ensureSubAgentNamesLoaded().catch(() => {});
});

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
	if (entry.kind === 'mcpServer') return 'mcp';
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

function toolEntryReasons(entry: CapabilityToolEntry): string[] {
	if (entry.kind === 'mcpServer') return mcpServerIssueMessages.value.get(entry.server.name) ?? [];
	if (entry.tool.enabled === false) return [];
	return toolIssueMessages.value.get(entry.index) ?? [];
}

function buildCapabilityToolRows(entries: CapabilityToolEntry[]): ToolRow[] {
	return buildToolRows(
		entries.map((entry) => {
			const nodeType = toolNodeType(entry);
			const reasons = toolEntryReasons(entry);
			const warningReasons =
				entry.kind === 'tool' && entry.tool.enabled !== false
					? (toolWarningMessages.value.get(entry.index) ?? [])
					: [];
			return {
				index: entry.index,
				enabled: entry.kind === 'mcpServer' || entry.tool.enabled !== false,
				label: toolLabel(entry),
				typeLabel: toolTypeLabel(entry, nodeType),
				nodeType,
				fallbackIcon: toolIcon(entry),
				toolType: entry.kind === 'tool' ? entry.tool.type : 'mcpServer',
				openTarget: entry.openTarget,
				invalid: reasons.length > 0,
				invalidReasons: reasons,
				warning: warningReasons.length > 0,
				warningReasons,
			};
		}),
	);
}

const toolRows = computed<ToolRow[]>(() =>
	buildCapabilityToolRows(
		capabilityTools.value.filter(
			(entry) => entry.kind === 'mcpServer' || entry.tool.type !== 'workflow',
		),
	),
);

const workflowRows = computed<SingleToolRow[]>(() =>
	buildCapabilityToolRows(
		capabilityTools.value.filter(
			(entry) => entry.kind === 'tool' && entry.tool.type === 'workflow',
		),
	).filter((row): row is SingleToolRow => !row.isGrouped),
);

const capabilityRowItemCounts = computed<Record<CapabilityRow, number>>(() => ({
	tools: toolRows.value.length,
	workflows: workflowRows.value.length,
	skills: props.skills.length,
	subAgents: selectedSubAgents.value.length,
}));

const orderedCapabilityRows = computed(() => {
	const rows = props.sections.flatMap<CapabilityRow>((section) => {
		if (section === 'tasks') return [];
		if (section === 'tools') return ['tools', 'workflows'];
		return [section];
	});

	return [
		...rows.filter((row) => capabilityRowItemCounts.value[row] > 0),
		...rows.filter((row) => capabilityRowItemCounts.value[row] === 0),
	];
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
		data: {
			index: item.index,
			enabled: item.enabled,
			nodeType: item.nodeType,
			openTarget: item.openTarget,
			invalid: item.invalid,
			invalidReasons: item.invalidReasons,
		},
	}));
}

function onToolMenuSelect(key: string) {
	openToolGroup.value = null;
	if (props.disabled) return;
	const target = fromTargetKey(key);
	if (!target) return;
	emit('open-tool', target);
}

function removeTool(index: number) {
	if (props.disabled) return;
	openToolGroup.value = null;
	emit('remove-tool', index);
}

function toggleTool(index: number, enabled: boolean) {
	if (props.disabled || !props.supportsActivation || !props.tools[index]) return;
	openToolGroup.value = null;
	emit('update:config', {
		tools: props.tools.map((ref, i) => (i === index ? { ...ref, enabled } : ref)),
	});
}

function toggleSubAgent(agentId: string, enabled: boolean) {
	if (props.disabled || !props.supportsActivation) return;
	emitSubAgentRefs(
		selectedSubAgentRefs.value.map((ref) => (ref.agentId === agentId ? { ...ref, enabled } : ref)),
	);
}

function removeToolGroup(group: GroupedToolRow) {
	if (props.disabled) return;
	openToolGroup.value = null;
	const indices = new Set(group.tools.map(({ index }) => index));
	emit('update:config', { tools: props.tools.filter((_, index) => !indices.has(index)) });
}

function removeSubAgent(agentId: string) {
	if (props.disabled) return;
	emitSubAgentRefs(selectedSubAgentRefs.value.filter((ref) => ref.agentId !== agentId));
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
	const current = selectedSubAgentRefs.value.find((ref) => ref.agentId === agentId);
	return {
		agentId,
		...(useWhen ? { useWhen } : {}),
		...(current?.enabled !== undefined ? { enabled: current.enabled } : {}),
	};
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
			agents: availableSubAgents.value.map(({ id, name }) => {
				const selectedRef = selectedSubAgentRefs.value.find((ref) => ref.agentId === id);
				return {
					id,
					name,
					added: Boolean(selectedRef),
					useWhen: selectedRef?.useWhen,
					invalidReasons: subAgentIssueMessages.value.get(id) ?? [],
					agentHref: `/projects/${encodeURIComponent(props.projectId)}/agents/${encodeURIComponent(id)}`,
				};
			}),
			onCreateAgent: canCreateAgent.value
				? () => createAgent('button', props.projectId)
				: undefined,
			onConfirm: ({ agentId, useWhen }: { agentId: string; useWhen?: string }) => {
				const nextRef = toSubAgentRef(agentId, useWhen);
				if (selectedSubAgentIdSet.value.has(agentId)) {
					emitSubAgentRefs(
						selectedSubAgentRefs.value.map((ref) => (ref.agentId === agentId ? nextRef : ref)),
					);
					return;
				}

				emitSubAgentRefs([...selectedSubAgentRefs.value, nextRef]);
			},
			onRemove: removeSubAgent,
		},
	});
}

function openExistingSubAgentModal(subAgent: {
	id: string;
	name: string;
	useWhen: string;
	invalidReasons: string[];
}) {
	uiStore.openModalWithData({
		name: AGENT_SUB_AGENTS_MODAL_KEY,
		data: {
			selectedAgent: {
				id: subAgent.id,
				name: subAgent.name,
			},
			agentHref: `/projects/${encodeURIComponent(props.projectId)}/agents/${encodeURIComponent(subAgent.id)}`,
			useWhen: subAgent.useWhen,
			invalidReasons: subAgent.invalidReasons,
			onConfirm: ({ agentId, useWhen }: { agentId: string; useWhen?: string }) => {
				emitSubAgentRefs(
					selectedSubAgentRefs.value.map((ref) =>
						ref.agentId === agentId ? toSubAgentRef(agentId, useWhen) : ref,
					),
				);
			},
			onRemove: removeSubAgent,
		},
	});
}
</script>

<template>
	<div>
		<div :class="$style.section" data-testid="agent-capabilities-section">
			<template v-for="section in orderedCapabilityRows" :key="section">
				<AgentChipRow
					v-if="section === 'tools'"
					:label="i18n.baseText('agents.builder.tools.title')"
					:item-count="toolRows.length"
					:add-label="i18n.baseText('agents.builder.tools.add')"
					add-button-test-id="agent-capabilities-add-tool"
					:disabled="props.disabled"
					@add="emit('add-tool', 'tools')"
				>
					<div v-for="tool in toolRows" :key="`tool-${tool.index}`" :class="$style.chipGroup">
						<N8nDropdownMenu
							v-if="tool.isGrouped"
							:model-value="openToolGroup === tool.index"
							:items="toolMenuItems(tool)"
							:disabled="props.disabled"
							placement="bottom-start"
							data-testid="agent-capabilities-tool-group"
							@update:model-value="openToolGroup = $event ? tool.index : null"
						>
							<template #trigger>
								<AgentItemContextMenu :disabled="props.disabled" @remove="removeToolGroup(tool)">
									<AgentChipButton
										:invalid="tool.invalid"
										:deactivated="!tool.enabled"
										:invalid-reasons="tool.invalidReasons"
										:warning="tool.warning"
										:warning-reasons="tool.warningReasons"
										:disabled="props.disabled"
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
								</AgentItemContextMenu>
							</template>
							<template #item="{ item }">
								<AgentItemContextMenu
									v-if="item.data"
									:disabled="props.disabled"
									:enabled="props.supportsActivation ? item.data.enabled : undefined"
									@update:enabled="toggleTool(item.data.index, $event)"
									@remove="removeTool(item.data.index)"
								>
									<div>
										<N8nDropdownMenuItem
											v-bind="item"
											:class="{ [$style.deactivatedTool]: !item.data.enabled }"
											@select="onToolMenuSelect"
										>
											<template #item-leading="{ ui }">
												<NodeIcon
													v-if="item.data?.nodeType"
													:node-type="item.data.nodeType"
													:size="16"
													:class="ui.class"
												/>
											</template>
											<template #item-trailing>
												<N8nTag
													v-if="!item.data.enabled"
													:text="i18n.baseText('agents.builder.capabilities.deactivated')"
													:clickable="false"
												/>
												<N8nTooltip
													v-else-if="item.data?.invalid"
													:disabled="(item.data.invalidReasons ?? []).length === 0"
													placement="top"
												>
													<N8nIcon
														icon="triangle-alert"
														:size="14"
														data-testid="agent-capabilities-tool-menu-invalid-icon"
													/>
													<template #content>
														<div v-for="reason in item.data.invalidReasons" :key="reason">
															{{ reason }}
														</div>
													</template>
												</N8nTooltip>
											</template>
										</N8nDropdownMenuItem>
									</div>
								</AgentItemContextMenu>
							</template>
						</N8nDropdownMenu>
						<AgentItemContextMenu
							v-else
							:disabled="props.disabled"
							:enabled="
								props.supportsActivation && tool.tool.openTarget.kind === 'tool'
									? tool.enabled
									: undefined
							"
							@update:enabled="toggleTool(tool.index, $event)"
							@remove="removeTool(tool.index)"
						>
							<AgentChipButton
								v-if="tool.nodeType"
								:deactivated="!tool.enabled"
								:invalid="tool.invalid"
								:invalid-reasons="tool.invalidReasons"
								:warning="tool.warning"
								:warning-reasons="tool.warningReasons"
								:disabled="props.disabled"
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
								:deactivated="!tool.enabled"
								:invalid="tool.invalid"
								:invalid-reasons="tool.invalidReasons"
								:warning="tool.warning"
								:warning-reasons="tool.warningReasons"
								:disabled="props.disabled"
								:class="$style.capabilityChip"
								data-testid="agent-capabilities-tool-row"
								@click="emit('open-tool', tool.tool.openTarget)"
							>
								{{ tool.label }}
							</AgentChipButton>
						</AgentItemContextMenu>
					</div>
				</AgentChipRow>

				<AgentChipRow
					v-else-if="section === 'workflows'"
					:label="i18n.baseText('generic.workflows')"
					:item-count="workflowRows.length"
					:add-label="i18n.baseText('workflows.add')"
					add-button-test-id="agent-capabilities-add-workflow"
					:disabled="props.disabled"
					@add="emit('add-tool', 'workflows')"
				>
					<div
						v-for="workflow in workflowRows"
						:key="`workflow-${workflow.index}`"
						:class="$style.chipGroup"
					>
						<AgentItemContextMenu
							:disabled="props.disabled"
							:enabled="props.supportsActivation ? workflow.enabled : undefined"
							@update:enabled="toggleTool(workflow.index, $event)"
							@remove="removeTool(workflow.index)"
						>
							<AgentChipButton
								:icon="workflow.fallbackIcon"
								:deactivated="!workflow.enabled"
								:invalid="workflow.invalid"
								:invalid-reasons="workflow.invalidReasons"
								:warning="workflow.warning"
								:warning-reasons="workflow.warningReasons"
								:disabled="props.disabled"
								:class="$style.capabilityChip"
								data-testid="agent-capabilities-workflow-row"
								@click="emit('open-tool', workflow.tool.openTarget)"
							>
								{{ workflow.label }}
							</AgentChipButton>
						</AgentItemContextMenu>
					</div>
				</AgentChipRow>

				<AgentSkillsSection
					v-else-if="section === 'skills'"
					:skills="skills"
					:supports-activation="props.supportsActivation"
					:disabled="props.disabled"
					:validation-issues="props.validationIssues"
					@open-skill="emit('open-skill', $event)"
					@add-skill="emit('add-skill')"
					@remove-skill="emit('remove-skill', $event)"
					@toggle-skill="emit('toggle-skill', $event)"
				/>

				<AgentChipRow
					v-else
					:label="i18n.baseText('agents.builder.subAgents.title')"
					:item-count="selectedSubAgents.length"
					:add-label="i18n.baseText('agents.builder.subAgents.add')"
					add-button-test-id="agent-capabilities-add-sub-agent"
					:disabled="props.disabled"
					@add="openSubAgentsModal"
				>
					<div v-for="subAgent in selectedSubAgents" :key="subAgent.id" :class="$style.chipGroup">
						<AgentItemContextMenu
							:disabled="props.disabled"
							:enabled="props.supportsActivation ? subAgent.enabled : undefined"
							@update:enabled="toggleSubAgent(subAgent.id, $event)"
							@remove="removeSubAgent(subAgent.id)"
						>
							<AgentChipButton
								:deactivated="!subAgent.enabled"
								icon="bot"
								:invalid="subAgent.invalid"
								:invalid-reasons="subAgent.invalidReasons"
								:disabled="props.disabled"
								:class="$style.capabilityChip"
								data-testid="agent-capabilities-sub-agent-row"
								@click="openExistingSubAgentModal(subAgent)"
							>
								{{ subAgent.name }}
							</AgentChipButton>
						</AgentItemContextMenu>
					</div>
				</AgentChipRow>
			</template>
			<div :class="$style.divider" aria-hidden="true" />
			<AgentWebSearchSection
				:config="props.config"
				:disabled="props.disabled"
				:project-id="props.projectId"
				@update:config="emit('update:config', $event)"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.deactivatedTool {
	color: var(--text-color--subtle);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.chipGroup {
	display: inline-flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: var(--spacing--3xs);
	min-width: 0;
	/** Truncates chip to stop overly-long labels **/
	max-width: min(var(--spacing--5xl), 100%);

	> .capabilityChip {
		width: 100%;
	}
}

.groupChipLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.divider {
	flex: initial;
	height: 1px;
	background-color: var(--border-color--subtle);
	margin-inline: calc(var(--spacing--sm) * -1);
}
</style>
