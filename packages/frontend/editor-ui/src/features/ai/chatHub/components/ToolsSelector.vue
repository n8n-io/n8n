<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nIconButton } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { TOOLS_MANAGER_MODAL_KEY, TOOL_SETTINGS_MODAL_KEY } from '@/features/ai/chatHub/constants';
import { useChatStore } from '@/features/ai/chatHub/chat.store';

const props = defineProps<{
	disabled: boolean;
	checkedToolIds: string[];
	customAgentId?: string;
	disabledTooltip?: string;
}>();

const emit = defineEmits<{
	toggle: [toolId: string];
}>();

const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const chatStore = useChatStore();
const i18n = useI18n();

const dropdownRef = useTemplateRef<{ close: () => void }>('dropdownMenu');
const searchQuery = ref('');

const checkedToolIdsSet = computed(() => new Set(props.checkedToolIds));

const toolCount = computed(() => props.checkedToolIds.length);

const displayToolNodeTypes = computed(() => {
	const maxIcons = toolCount.value > 3 ? 2 : 3;
	return chatStore.configuredTools
		.filter((t) => checkedToolIdsSet.value.has(t.definition.id))
		.slice(0, maxIcons)
		.map((t) => nodeTypesStore.getNodeType(t.definition.type, t.definition.typeVersion))
		.filter(Boolean);
});

const remainingToolCount = computed(() => {
	if (toolCount.value > 3) return toolCount.value - 2;
	return 0;
});

const toolsLabel = computed(() => {
	if (toolCount.value === 1) {
		const toolId = props.checkedToolIds[0];
		const tool = chatStore.configuredTools.find((t) => t.definition.id === toolId);
		if (tool) return tool.definition.name;
	}
	if (toolCount.value > 1) {
		return i18n.baseText('chatHub.tools.selector.label.count', { adjustToNumber: toolCount.value });
	}
	return i18n.baseText('chatHub.tools.selector.label.default');
});

function openToolsManager() {
	dropdownRef.value?.close();
	uiStore.openModalWithData({
		name: TOOLS_MANAGER_MODAL_KEY,
		data: {
			tools: chatStore.configuredTools
				.filter((t) => checkedToolIdsSet.value.has(t.definition.id))
				.map((t) => t.definition),
			onConfirm: () => {},
			customAgentId: props.customAgentId,
		},
	});
}

function openToolSettings(item: ToolMenuItem) {
	dropdownRef.value?.close();
	const tool = item.data?.tool;
	if (!tool) return;

	const otherToolNames = chatStore.configuredTools
		.filter((t) => t.definition.id !== tool.id)
		.map((t) => t.definition.name);

	uiStore.openModalWithData({
		name: TOOL_SETTINGS_MODAL_KEY,
		data: {
			node: { ...tool },
			existingToolNames: otherToolNames,
			onConfirm: async (configuredNode: INode) => {
				await chatStore.updateConfiguredTool(tool.id, configuredNode);
			},
		},
	});
}

type ToolMenuItem = DropdownMenuItemProps<
	string,
	{ nodeType: INodeTypeDescription | null; tool: INode }
>;

const menuItems = computed<ToolMenuItem[]>(() => {
	const query = searchQuery.value.toLowerCase();

	return chatStore.configuredTools
		.filter((tool) => {
			if (!query) return true;
			const def = tool.definition;
			const nodeType = nodeTypesStore.getNodeType(def.type, def.typeVersion);
			const nameMatch = def.name.toLowerCase().includes(query);
			const typeMatch = nodeType?.displayName.toLowerCase().includes(query);
			return nameMatch || typeMatch;
		})
		.map((tool) => ({
			id: `tool::${tool.definition.id}`,
			label: tool.definition.name,
			checked: checkedToolIdsSet.value.has(tool.definition.id),
			data: {
				nodeType: nodeTypesStore.getNodeType(tool.definition.type, tool.definition.typeVersion),
				tool: tool.definition,
			},
		}));
});

function handleSelect(id: string) {
	const [command, toolId] = id.split('::');

	if (command === 'tool') {
		emit('toggle', toolId);
	}
}

function handleSearch(query: string) {
	searchQuery.value = query;
}

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});
</script>

<template>
	<div :class="$style.container">
		<!-- When no tools configured, show just the button that opens the manager -->
		<N8nButton
			v-if="chatStore.configuredTools.length === 0"
			variant="subtle"
			native-type="button"
			:class="$style.toolsButton"
			:disabled="disabled"
			icon="plus"
			data-test-id="chat-tools-button"
			@click="openToolsManager"
		>
			{{ toolsLabel }}
		</N8nButton>

		<!-- When tools are selected, show the dropdown -->
		<N8nDropdownMenu
			v-else
			ref="dropdownMenu"
			:items="menuItems"
			placement="top-start"
			extra-popper-class="tools-selector-dropdown"
			searchable
			:search-placeholder="i18n.baseText('chatHub.toolsManager.searchPlaceholder')"
			:empty-text="i18n.baseText('chatHub.toolsManager.noResults')"
			@select="handleSelect"
			@search="handleSearch"
		>
			<template #trigger>
				<N8nButton
					variant="subtle"
					native-type="button"
					:disabled="disabled"
					:icon="toolCount === 0 ? 'plus' : undefined"
					data-test-id="chat-tools-button"
				>
					<span v-if="toolCount > 0" :class="$style.iconStack">
						<NodeIcon
							v-for="(nodeType, i) in displayToolNodeTypes"
							:key="`${nodeType?.name}-${i}`"
							:style="{ zIndex: i + 1 }"
							:node-type="nodeType"
							:class="[$style.icon, { [$style.iconOverlap]: i !== 0 }]"
							:circle="true"
							:size="12"
						/>
						<span
							v-if="remainingToolCount > 0"
							:class="[$style.icon, $style.iconOverlap, $style.countBadge]"
						>
							+{{ remainingToolCount }}
						</span>
					</span>
					{{ toolsLabel }}
				</N8nButton>
			</template>

			<template #search-prefix>
				<N8nIcon icon="search" />
			</template>

			<template #search-suffix>
				<N8nIconButton
					icon="settings"
					variant="ghost"
					size="medium"
					text
					:class="$style.settingsButton"
					@click.stop="openToolsManager"
				/>
			</template>

			<template #item-leading="{ item }">
				<NodeIcon v-if="item.data?.nodeType" :node-type="item.data.nodeType" :size="16" />
			</template>

			<template #item-trailing="{ item }">
				<N8nIconButton
					icon="settings"
					variant="ghost"
					size="medium"
					text
					:class="$style.itemSettingsButton"
					@click.stop="openToolSettings(item)"
				/>
				<span v-if="!item.checked" :class="$style.checkPlaceholder" />
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
}

.toolsButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	&.transparentBg {
		background-color: transparent !important;
	}
}

.iconStack {
	display: flex;
	align-items: center;
	position: relative;

	/* maintain component height regardless of icon */
	margin-block: -4px;
}

.icon {
	padding: var(--spacing--4xs);
	background-color: var(--color--background--light-2);
	border-radius: 50%;
	outline: 2px var(--color--background--light-3) solid;
}

.iconOverlap {
	margin-left: -5px;
}

.countBadge {
	position: relative;
	z-index: 4;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	box-sizing: border-box;
}

.settingsButton {
	color: var(--button--color--text--secondary);
	margin-right: -2px;

	&:hover {
		color: var(--button--color--text--secondary--hover-active-focus);
	}
}

.itemSettingsButton {
	opacity: 0;
}

.checkPlaceholder {
	width: 16px;
	flex-shrink: 0;
}
</style>

<style lang="scss">
.tools-selector-dropdown {
	z-index: 10000;
	min-width: 330px;

	[data-highlighted] [class*='itemSettingsButton'] {
		opacity: 1;
	}
}
</style>
