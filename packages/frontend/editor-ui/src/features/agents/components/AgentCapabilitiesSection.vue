<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useToast } from '@n8n/composables/useToast';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { AgentConfigValidationIssue, AgentJsonTaskConfig } from '@n8n/api-types';
import { N8nDropdownMenu, N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, onMounted, watch } from 'vue';
import type { AgentJsonConfig, AgentJsonMcpServerConfig, AgentJsonToolRef } from '../types';
import type { AgentSkill, CustomToolEntry } from '../types';
import { useProjectAgentsList } from '../composables/useProjectAgentsList';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import type { ToolMenuItem, ToolOpenTarget, ToolRow } from './AgentCapabilitiesSection.types';
import { buildToolRows } from './AgentCapabilitiesSection.utils';
import AgentChipButton from './AgentChipButton.vue';
import AgentChipRow from './AgentChipRow.vue';

export type AgentCapabilitySection = 'tools' | 'tasks' | 'skills' | 'subAgents';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		tools: AgentJsonToolRef[];
		customTools?: Record<string, CustomToolEntry>;
		skills: Array<{ id: string; skill: AgentSkill }>;
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
	'add-tool': [];
	'add-skill': [];
	'remove-tool': [index: number];
	'remove-skill': [id: string];
	'toggle-task': [payload: { id: string; enabled: boolean }];
	'tasks-changed': [];
	'update:config': [updates: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();
const toast = useToast();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();

const projectIdRef = computed(() => props.projectId);
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
	(projectAgents.value ?? []).filter(
		(agent) => agent.id !== props.agentId && !selectedSubAgentIdSet.value.has(agent.id),
	),
);
const selectedSubAgents = computed(() =>
	selectedSubAgentRefs.value.map(({ agentId, useWhen }) => {
		const agent = projectAgents.value?.find((candidate) => candidate.id === agentId);
		const validationReasons = subAgentIssueMessages.value.get(agentId) ?? [];
		const reasons =
			validationReasons.length > 0 || agent || projectAgents.value === null
				? validationReasons
				: [i18n.baseText('agents.builder.validation.issue.subAgent.missingReference')];
		return {
			id: agentId,
			name: agent?.name ?? i18n.baseText('agents.builder.subAgents.unavailable'),
			useWhen: useWhen ?? '',
			invalid: reasons.length > 0,
			invalidReasons: reasons,
		};
	}),
);
// `as BaseTextKey`: these keys are new (see en.json) and not yet reflected in
// @n8n/i18n's built type declarations — matches the same workaround already
// used for `agents.builder.preview.disabledTooltip` in AgentBuilderHeader.vue.
const GENERIC_ISSUE_KEYS: Record<AgentConfigValidationIssue['code'], BaseTextKey> = {
	missing_required: 'agents.builder.validation.issue.missingRequired' as BaseTextKey,
	invalid_value: 'agents.builder.validation.issue.invalidValue' as BaseTextKey,
	missing_credential: 'agents.builder.validation.issue.missingCredential' as BaseTextKey,
	invalid_credential: 'agents.builder.validation.issue.invalidCredential' as BaseTextKey,
	incompatible_credential: 'agents.builder.validation.issue.incompatibleCredential' as BaseTextKey,
	missing_reference: 'agents.builder.validation.issue.missingReference' as BaseTextKey,
	incompatible_reference: 'agents.builder.validation.issue.incompatibleReference' as BaseTextKey,
};

/** Kind-specific overrides, keyed `<kind>.<code>` or `tool.<toolType>.<code>`. */
const SPECIFIC_ISSUE_KEYS: Record<string, BaseTextKey> = {
	'subAgent.missing_reference':
		'agents.builder.validation.issue.subAgent.missingReference' as BaseTextKey,
	'subAgent.incompatible_reference':
		'agents.builder.validation.issue.subAgent.incompatibleReference' as BaseTextKey,
	'skill.missing_reference':
		'agents.builder.validation.issue.skill.missingReference' as BaseTextKey,
	'tool.workflow.missing_reference':
		'agents.builder.validation.issue.tool.workflow.missingReference' as BaseTextKey,
	'tool.workflow.incompatible_reference':
		'agents.builder.validation.issue.tool.workflow.incompatibleReference' as BaseTextKey,
	'tool.custom.missing_reference':
		'agents.builder.validation.issue.tool.custom.missingReference' as BaseTextKey,
	'tool.node.missing_reference':
		'agents.builder.validation.issue.tool.node.missingReference' as BaseTextKey,
	'mcpServer.incompatible_credential':
		'agents.builder.validation.issue.mcpServer.incompatibleCredential' as BaseTextKey,
};

/**
 * Reason-specific overrides for `incompatible_reference` issues that carry a
 * `reason` discriminator (currently workflow tools). Keyed by the `reason`
 * string emitted by the backend. Takes precedence over the kind/code key so
 * the message names the actual problem (e.g. "contains a Wait node") instead
 * of the generic "can't be used as an agent tool".
 */
const REASON_SPECIFIC_KEYS: Record<string, BaseTextKey> = {
	incompatible_nodes:
		'agents.builder.validation.issue.tool.workflow.incompatibleNodes' as BaseTextKey,
	no_supported_trigger:
		'agents.builder.validation.issue.tool.workflow.noSupportedTrigger' as BaseTextKey,
};

function issueMessage(issue: AgentConfigValidationIssue): string {
	const { kind, toolType, id } = issue.capability;
	const key =
		(issue.reason ? REASON_SPECIFIC_KEYS[issue.reason] : undefined) ??
		(kind === 'tool' && toolType
			? SPECIFIC_ISSUE_KEYS[`tool.${toolType}.${issue.code}`]
			: undefined) ??
		SPECIFIC_ISSUE_KEYS[`${kind}.${issue.code}`] ??
		GENERIC_ISSUE_KEYS[issue.code];
	return i18n.baseText(key, { interpolate: { id: id ?? '' } });
}

function issueMessages(issues: AgentConfigValidationIssue[]): string[] {
	return [...new Set(issues.map(issueMessage))];
}

function issuesFor(kind: AgentConfigValidationIssue['capability']['kind']) {
	return props.validationIssues.filter((issue) => issue.capability.kind === kind);
}

/** Group a capability kind's issues into per-key message lists, keyed by `keyOf`. */
function groupIssueMessages<TKey>(
	kind: AgentConfigValidationIssue['capability']['kind'],
	keyOf: (issue: AgentConfigValidationIssue) => TKey | undefined,
): Map<TKey, string[]> {
	const byKey = new Map<TKey, AgentConfigValidationIssue[]>();
	for (const issue of issuesFor(kind)) {
		const key = keyOf(issue);
		if (key === undefined) continue;
		const existing = byKey.get(key);
		if (existing) existing.push(issue);
		else byKey.set(key, [issue]);
	}
	return new Map([...byKey].map(([key, issues]) => [key, issueMessages(issues)]));
}

const toolIssueMessages = computed(() =>
	groupIssueMessages('tool', (issue) => issue.capability.index),
);
const mcpServerIssueMessages = computed(() =>
	groupIssueMessages('mcpServer', (issue) => issue.capability.id),
);
const skillIssueMessages = computed(() =>
	groupIssueMessages('skill', (issue) => issue.capability.id),
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
	return toolIssueMessages.value.get(entry.index) ?? [];
}

const toolRows = computed<ToolRow[]>(() => {
	return buildToolRows(
		capabilityTools.value.map((entry) => {
			const nodeType = toolNodeType(entry);
			const reasons = toolEntryReasons(entry);
			return {
				index: entry.index,
				label: toolLabel(entry),
				typeLabel: toolTypeLabel(entry, nodeType),
				nodeType,
				fallbackIcon: toolIcon(entry),
				toolType: entry.kind === 'tool' ? entry.tool.type : 'mcpServer',
				openTarget: entry.openTarget,
				invalid: reasons.length > 0,
				invalidReasons: reasons,
			};
		}),
	);
});

const capabilitySectionItemCounts = computed<
	Record<Exclude<AgentCapabilitySection, 'tasks'>, number>
>(() => ({
	tools: toolRows.value.length,
	skills: props.skills.length,
	subAgents: selectedSubAgents.value.length,
}));

const orderedCapabilitySections = computed(() => {
	const sections = props.sections.filter(
		(section): section is Exclude<AgentCapabilitySection, 'tasks'> => section !== 'tasks',
	);
	const sectionsWithItems = sections.filter(
		(section) => capabilitySectionItemCounts.value[section] > 0,
	);

	if (sectionsWithItems.length === 0 || sectionsWithItems.length === sections.length)
		return sections;

	return [
		...sectionsWithItems,
		...sections.filter((section) => capabilitySectionItemCounts.value[section] === 0),
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
			nodeType: item.nodeType,
			openTarget: item.openTarget,
			invalid: item.invalid,
			invalidReasons: item.invalidReasons,
		},
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
			onRemove: (agentId: string) => {
				emitSubAgentRefs(selectedSubAgentRefs.value.filter((ref) => ref.agentId !== agentId));
			},
		},
	});
}
</script>

<template>
	<div>
		<div :class="$style.section" data-testid="agent-capabilities-section">
			<template v-for="section in orderedCapabilitySections" :key="section">
				<AgentChipRow
					v-if="section === 'tools'"
					:label="i18n.baseText('agents.builder.tools.title')"
					:item-count="toolRows.length"
					:add-label="i18n.baseText('agents.builder.tools.add')"
					add-button-test-id="agent-capabilities-add-tool"
					:disabled="props.disabled"
					@add="emit('add-tool')"
				>
					<div v-for="tool in toolRows" :key="`tool-${tool.index}`" :class="$style.chipGroup">
						<N8nDropdownMenu
							v-if="tool.isGrouped"
							:items="toolMenuItems(tool)"
							:disabled="props.disabled"
							placement="bottom-start"
							data-testid="agent-capabilities-tool-group"
							@select="onToolMenuSelect"
						>
							<template #trigger>
								<AgentChipButton
									:invalid="tool.invalid"
									:invalid-reasons="tool.invalidReasons"
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
							</template>
							<template #item-leading="{ item, ui }">
								<NodeIcon
									v-if="item.data?.nodeType"
									:node-type="item.data.nodeType"
									:size="16"
									:class="ui.class"
								/>
							</template>
							<template #item-trailing="{ item }">
								<N8nTooltip
									v-if="item.data?.invalid"
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
						</N8nDropdownMenu>
						<AgentChipButton
							v-else-if="tool.nodeType"
							:invalid="tool.invalid"
							:invalid-reasons="tool.invalidReasons"
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
							:invalid="tool.invalid"
							:invalid-reasons="tool.invalidReasons"
							:disabled="props.disabled"
							:class="$style.capabilityChip"
							data-testid="agent-capabilities-tool-row"
							@click="emit('open-tool', tool.tool.openTarget)"
						>
							{{ tool.label }}
						</AgentChipButton>
					</div>
				</AgentChipRow>

				<AgentChipRow
					v-else-if="section === 'skills'"
					:label="i18n.baseText('agents.builder.skills.title')"
					:item-count="skills.length"
					:add-label="i18n.baseText('agents.builder.skills.add')"
					add-button-test-id="agent-capabilities-add-skill"
					:disabled="props.disabled"
					@add="emit('add-skill')"
				>
					<div v-for="{ id, skill } in skills" :key="id" :class="$style.chipGroup">
						<AgentChipButton
							icon="sparkles"
							:invalid="(skillIssueMessages.get(id) ?? []).length > 0"
							:invalid-reasons="skillIssueMessages.get(id) ?? []"
							:disabled="props.disabled"
							:class="$style.capabilityChip"
							data-testid="agent-capabilities-skill-row"
							@click="emit('open-skill', id)"
						>
							{{ skill.name || id }}
						</AgentChipButton>
					</div>
				</AgentChipRow>

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
						<AgentChipButton
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
					</div>
				</AgentChipRow>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
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
</style>
