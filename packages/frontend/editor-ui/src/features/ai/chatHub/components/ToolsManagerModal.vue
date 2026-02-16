<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import ToolListItem from './ToolListItem.vue';
import ToolSettingsContent from './ToolSettingsContent.vue';
import {
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInlineTextEdit,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { NodeConnectionTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';
import {
	ALWAYS_BLOCKED_CHAT_HUB_TOOL_TYPES,
	CHAT_USER_BLOCKED_CHAT_HUB_TOOL_TYPES,
} from '@n8n/api-types';
import type { ChatHubToolDto } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { DEBOUNCE_TIME, getDebounceTime, MODAL_CONFIRM } from '@/app/constants';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { hasRole } from '@/app/utils/rbac/checks/hasRole';
import nodePopularity from 'virtual:node-popularity-data';

const props = defineProps<{
	modalName: string;
	data: {
		tools: INode[];
		onConfirm: (tools: INode[]) => void;
		customAgentId?: string;
	};
}>();

const agentId = computed(() => props.data.customAgentId);
const agentToolIds = computed(() => {
	if (!agentId.value) return null;
	return chatStore.customAgents[agentId.value]?.toolIds ?? [];
});
const modalTitle = computed(() => {
	const baseTitle = i18n.baseText('chatHub.toolsManager.title');
	if (!agentId.value) return baseTitle;
	const agentName = chatStore.customAgents[agentId.value]?.name;
	return agentName ? `${baseTitle} (${agentName})` : baseTitle;
});

function hasInputs(nodeType: INodeTypeDescription): boolean {
	const { inputs } = nodeType;
	if (Array.isArray(inputs)) {
		return inputs.length > 0;
	}

	// Expression-based inputs are always considered non-empty
	return true;
}

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const chatStore = useChatStore();
const toast = useToast();
const message = useMessage();
const uiStore = useUIStore();

const nodePopularityMap = new Map(nodePopularity.map((node) => [node.id, node.popularity]));

const searchQuery = ref('');
const debouncedSearchQuery = ref('');

const setDebouncedSearchQuery = useDebounceFn((value: string) => {
	debouncedSearchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

watch(searchQuery, (newValue) => {
	void setDebouncedSearchQuery(newValue);
});

// View switching state
type ManagerView = 'list' | 'settings';
const currentView = ref<ManagerView>('list');
const settingsNode = ref<INode | null>(null);
const settingsExistingToolNames = ref<string[]>([]);
const settingsOnConfirm = ref<((node: INode) => void) | null>(null);
const settingsContentRef = ref<InstanceType<typeof ToolSettingsContent> | null>(null);
const settingsNodeName = ref('');
const settingsIsValid = ref(false);

const tools = computed<ChatHubToolDto[]>(() => chatStore.configuredTools);

const excludedToolTypes = computed(() => {
	const blocked = [...ALWAYS_BLOCKED_CHAT_HUB_TOOL_TYPES];
	if (hasRole(['global:chatUser'])) {
		blocked.push(...CHAT_USER_BLOCKED_CHAT_HUB_TOOL_TYPES);
	}
	return blocked;
});

const availableToolTypes = computed<INodeTypeDescription[]>(() => {
	const toolTypeNames =
		nodeTypesStore.visibleNodeTypesByOutputConnectionTypeNames[NodeConnectionTypes.AiTool] ?? [];

	return toolTypeNames
		.map((name) => nodeTypesStore.getNodeType(name))
		.filter(
			(nodeType): nodeType is INodeTypeDescription =>
				nodeType !== null &&
				!excludedToolTypes.value.includes(nodeType.name) &&
				!hasInputs(nodeType),
		)
		.sort((a, b) => {
			const popA = nodePopularityMap.get(a.name) ?? 0;
			const popB = nodePopularityMap.get(b.name) ?? 0;
			return popB - popA;
		});
});

const filteredConfiguredTools = computed(() => {
	if (!debouncedSearchQuery.value) {
		return tools.value;
	}
	const query = debouncedSearchQuery.value.toLowerCase();
	return tools.value.filter((tool) => {
		const def = tool.definition;
		const nodeType = nodeTypesStore.getNodeType(def.type, def.typeVersion);
		const nameMatch = def.name.toLowerCase().includes(query);
		const typeMatch = nodeType?.displayName.toLowerCase().includes(query);
		return nameMatch || typeMatch;
	});
});

const filteredAvailableTools = computed(() => {
	if (!debouncedSearchQuery.value) {
		return availableToolTypes.value;
	}
	const query = debouncedSearchQuery.value.toLowerCase();
	return availableToolTypes.value.filter((nodeType) => {
		const nameMatch = nodeType.displayName.toLowerCase().includes(query);
		const descMatch = nodeType.description?.toLowerCase().includes(query);
		return nameMatch || descMatch;
	});
});

function getNodeType(tool: ChatHubToolDto): INodeTypeDescription | null {
	return nodeTypesStore.getNodeType(tool.definition.type, tool.definition.typeVersion);
}

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function openSettings(
	node: INode,
	existingNames: string[],
	onConfirm: (configuredNode: INode) => void,
) {
	settingsNode.value = node;
	settingsExistingToolNames.value = existingNames;
	settingsOnConfirm.value = onConfirm;
	settingsNodeName.value = node.name;
	settingsIsValid.value = false;
	currentView.value = 'settings';
}

function handleConfigureTool(tool: ChatHubToolDto) {
	const otherToolNames = tools.value
		.filter((t) => t.definition.id !== tool.definition.id)
		.map((t) => t.definition.name);

	openSettings({ ...tool.definition }, otherToolNames, async (configuredNode: INode) => {
		try {
			await chatStore.updateConfiguredTool(tool.definition.id, configuredNode);
		} catch (error) {
			toast.showError(error, i18n.baseText('chatHub.error.updateToolsFailed'));
		}
	});
}

async function handleRemoveTool(toolId: string) {
	const confirmed = await message.confirm(
		i18n.baseText('chatHub.toolsManager.confirmRemove.message'),
		i18n.baseText('chatHub.toolsManager.confirmRemove.title'),
		{
			confirmButtonText: i18n.baseText('chatHub.toolsManager.remove'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await chatStore.removeConfiguredTool(toolId);
	} catch (error) {
		toast.showError(error, i18n.baseText('chatHub.error.updateToolsFailed'));
	}
}

async function handleToggleTool(tool: ChatHubToolDto, enabled: boolean) {
	try {
		if (agentId.value) {
			await chatStore.toggleCustomAgentTool(agentId.value, tool.definition.id);
		} else {
			await chatStore.toggleToolEnabled(tool.definition.id, enabled);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('chatHub.error.updateToolsFailed'));
	}
}

function handleAddTool(nodeType: INodeTypeDescription) {
	const typeVersion =
		typeof nodeType.version === 'number'
			? nodeType.version
			: nodeType.version.toSorted((a, b) => b - a)?.[0];

	if (!typeVersion) {
		return;
	}

	const newToolId = uuidv4();
	const existingNames = tools.value.map((t) => t.definition.name);

	openSettings(
		{
			type: nodeType.name,
			typeVersion,
			parameters: {},
			id: newToolId,
			name: nodeType.displayName,
			position: [0, 0],
		},
		existingNames,
		async (configuredNode: INode) => {
			try {
				await chatStore.addConfiguredTool(configuredNode);
			} catch (error) {
				toast.showError(error, i18n.baseText('chatHub.error.updateToolsFailed'));
			}
		},
	);
}

function handleBack() {
	currentView.value = 'list';
	settingsNode.value = null;
	settingsExistingToolNames.value = [];
	settingsOnConfirm.value = null;
	settingsNodeName.value = '';
	settingsIsValid.value = false;
}

function handleSave() {
	const currentNode = settingsContentRef.value?.node;
	if (!currentNode || !settingsOnConfirm.value) return;

	settingsOnConfirm.value(currentNode);
	handleBack();
}

function handleSettingsChangeName(name: string) {
	settingsContentRef.value?.handleChangeName(name);
}
</script>

<template>
	<N8nDialog
		:open="true"
		size="2xlarge"
		:show-close-button="currentView === 'list'"
		@update:open="closeDialog"
	>
		<N8nDialogHeader>
			<!-- List view header -->
			<N8nDialogTitle v-if="currentView === 'list'" as-child>
				<N8nHeading tag="h2" size="large">{{ modalTitle }}</N8nHeading>
			</N8nDialogTitle>

			<!-- Settings view header -->
			<div v-else :class="$style.settingsHeader">
				<div :class="$style.settingsHeaderLeft">
					<N8nIconButton
						icon="arrow-left"
						text
						size="large"
						variant="ghost"
						:class="$style.backButton"
						@click="handleBack"
					/>
					<N8nInlineTextEdit
						:model-value="settingsNodeName"
						:max-width="350"
						:class="$style.title"
						@update:model-value="handleSettingsChangeName"
					/>
				</div>
				<N8nButton variant="solid" size="small" :disabled="!settingsIsValid" @click="handleSave">
					{{ i18n.baseText('chatHub.toolSettings.confirm') }}
				</N8nButton>
			</div>
		</N8nDialogHeader>

		<N8nInput
			v-show="currentView === 'list'"
			v-model="searchQuery"
			:placeholder="i18n.baseText('chatHub.toolsManager.searchPlaceholder')"
			clearable
			:class="$style.searchInput"
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>

		<!-- List view: scrolls itself, scrollbar in padding gutter -->
		<div v-show="currentView === 'list'" data-tools-manager-modal :class="$style.listWrapper">
			<div v-if="filteredConfiguredTools.length > 0" :class="$style.section">
				<N8nHeading size="small" color="text-light" tag="h3">
					{{
						i18n.baseText('chatHub.toolsManager.configuredTools', {
							interpolate: { count: tools.length },
						})
					}}
				</N8nHeading>
				<div :class="$style.toolsList">
					<ToolListItem
						v-for="tool in filteredConfiguredTools"
						:key="tool.definition.id"
						:node-type="getNodeType(tool)!"
						:configured-node="tool.definition"
						:enabled="agentToolIds ? agentToolIds.includes(tool.definition.id) : tool.enabled"
						mode="configured"
						@configure="handleConfigureTool(tool)"
						@remove="handleRemoveTool(tool.definition.id)"
						@toggle="handleToggleTool(tool, $event)"
					/>
				</div>
			</div>

			<div v-if="filteredAvailableTools.length > 0" :class="$style.section">
				<N8nHeading size="small" color="text-light" tag="h3">
					{{
						i18n.baseText('chatHub.toolsManager.availableTools', {
							interpolate: { count: availableToolTypes.length },
						})
					}}
				</N8nHeading>
				<div :class="$style.toolsList">
					<ToolListItem
						v-for="nodeType in filteredAvailableTools"
						:key="nodeType.name"
						:node-type="nodeType"
						mode="available"
						@add="handleAddTool(nodeType)"
					/>
				</div>
			</div>

			<div
				v-if="filteredConfiguredTools.length === 0 && filteredAvailableTools.length === 0"
				:class="$style.emptyState"
			>
				<N8nText color="text-light">
					{{ i18n.baseText('chatHub.toolsManager.noResults') }}
				</N8nText>
			</div>
		</div>

		<!-- Settings view: doesn't scroll, lets ToolSettingsContent.tabContent scroll -->
		<div v-if="currentView === 'settings' && settingsNode" :class="$style.settingsWrapper">
			<ToolSettingsContent
				ref="settingsContentRef"
				:initial-node="settingsNode"
				:existing-tool-names="settingsExistingToolNames"
				@update:valid="settingsIsValid = $event"
				@update:node-name="settingsNodeName = $event"
			/>
		</div>
	</N8nDialog>
</template>

<style lang="scss" module>
.settingsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.settingsHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	flex: 1;
}

.backButton {
	width: 32px !important;
	height: 32px !important;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--md);
	flex-shrink: 0;
}

.icon {
	flex-shrink: 0;
	flex-grow: 0;
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--regular);
	line-height: var(--line-height--lg);
	color: var(--color--text--shade-1);
	flex: 1;
	min-width: 0;
}

.listWrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-height: 60vh;
	overflow-y: auto;
	margin-right: calc(-1 * var(--spacing--lg));
	padding-right: var(--spacing--lg);
	padding-top: var(--spacing--sm);
}

.settingsWrapper {
	display: flex;
	flex-direction: column;
	max-height: 60vh;
	overflow: hidden;
	margin-right: calc(-1 * var(--spacing--lg));
	padding-top: var(--spacing--sm);
}

.searchInput {
	padding: var(--spacing--sm) 0;
	width: 100%;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toolsList {
	display: flex;
	flex-direction: column;
}

.emptyState {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}
</style>

<style lang="scss">
[role='dialog']:has([data-tools-manager-modal]) {
	background-color: var(--dialog--color--background);
}

[role='dialog']:has([data-tools-manager-modal]) .ndv-connection-hint-notice {
	display: none;
}
</style>
