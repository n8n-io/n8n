<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { computed, onMounted, ref, useCssModule, useTemplateRef } from 'vue';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { TOOLS_MANAGER_MODAL_KEY, TOOL_SETTINGS_MODAL_KEY } from '@/features/ai/chatHub/constants';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { getNodeItemRestriction } from '@/features/shared/nodeCreator/nodeCreator.utils';
import { useChatToolPolicy } from '@/features/ai/chatHub/composables/useChatToolRestriction';
import {
	ContactAdminModal,
	RestrictedMenuItemMarker,
	type ContactAudience,
	type TypeRestriction,
} from '@n8n/frontend-module-type-availability-policies';

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
const $style = useCssModule();

useChatToolPolicy();

const dropdownRef = useTemplateRef<{ close: () => void }>('dropdownMenu');
const searchQuery = ref('');
const contactAdmin = ref<{ typeName: string; audience: ContactAudience } | null>(null);

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
	{ nodeType: INodeTypeDescription | null; tool: INode; restriction?: TypeRestriction }
>;

const CREATE_NEW_TOOL_ID = 'action::create-new';

// A checked restricted tool fails every message, so the user can always uncheck it.
function isToggleLocked(restriction: TypeRestriction | undefined, checked?: boolean) {
	return !!restriction && !checked;
}

const menuItems = computed<ToolMenuItem[]>(() => {
	const query = searchQuery.value.toLowerCase();

	const toolItems: ToolMenuItem[] = chatStore.configuredTools
		.filter((tool) => {
			if (!query) return true;
			const def = tool.definition;
			const nodeType = nodeTypesStore.getNodeType(def.type, def.typeVersion);
			const nameMatch = def.name.toLowerCase().includes(query);
			const typeMatch = nodeType?.displayName.toLowerCase().includes(query);
			return nameMatch || typeMatch;
		})
		.map((tool) => {
			const checked = checkedToolIdsSet.value.has(tool.definition.id);
			const restriction = getNodeItemRestriction(tool.definition.type);
			return {
				id: `tool::${tool.definition.id}`,
				label: tool.definition.name,
				checked,
				// A click that cannot check the tool does nothing, so the menu stays open.
				keepOpen: isToggleLocked(restriction, checked),
				class: restriction ? $style.restricted : undefined,
				data: {
					nodeType: nodeTypesStore.getNodeType(tool.definition.type, tool.definition.typeVersion),
					tool: tool.definition,
					restriction,
				},
			};
		});

	toolItems.push({
		id: CREATE_NEW_TOOL_ID,
		label: i18n.baseText('chatHub.tools.selector.createNew'),
		icon: { type: 'icon', value: 'plus' },
		divided: true,
	});

	return toolItems;
});

function handleSelect(id: string) {
	if (id === CREATE_NEW_TOOL_ID) {
		openToolsManager();
		return;
	}

	const [command, toolId] = id.split('::');

	if (command !== 'tool') return;

	const item = menuItems.value.find((i) => i.id === id);
	if (item && isToggleLocked(item.data?.restriction, item.checked)) return;

	emit('toggle', toolId);
}

function restrictedTypeName(item: ToolMenuItem): string {
	return item.data?.nodeType?.displayName ?? item.data?.tool.type ?? '';
}

function requestContactAdmin(item: ToolMenuItem, audience: ContactAudience) {
	dropdownRef.value?.close();
	contactAdmin.value = { typeName: restrictedTypeName(item), audience };
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
		<N8nTooltip
			v-if="chatStore.configuredTools.length === 0"
			:content="disabledTooltip"
			:disabled="!disabledTooltip || !disabled"
			placement="bottom"
		>
			<N8nButton
				variant="outline"
				native-type="button"
				:class="$style.toolsButton"
				:disabled="disabled"
				icon="plus"
				data-test-id="chat-tools-button"
				@click="openToolsManager"
			>
				{{ toolsLabel }}
			</N8nButton>
		</N8nTooltip>

		<N8nTooltip
			v-else
			:content="disabledTooltip"
			:disabled="!disabledTooltip || !disabled"
			placement="bottom"
		>
			<N8nDropdownMenu
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
						variant="outline"
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
					<NodeIcon
						v-if="item.data?.nodeType"
						:node-type="item.data.nodeType"
						:size="16"
						:class="{ [$style.restrictedIcon]: !!item.data.restriction }"
					/>
					<N8nIcon v-else-if="item.icon?.type === 'icon'" :icon="item.icon.value" size="large" />
				</template>

				<template #item-trailing="{ item }">
					<template v-if="item.id !== CREATE_NEW_TOOL_ID">
						<RestrictedMenuItemMarker
							v-if="item.data?.restriction"
							:node-type-name="restrictedTypeName(item)"
							:restriction="item.data.restriction"
							@contact-admin="(audience) => requestContactAdmin(item, audience)"
						/>
						<N8nIconButton
							icon="settings"
							variant="ghost"
							size="medium"
							text
							:class="$style.itemSettingsButton"
							data-test-id="chat-tool-item-settings"
							@click.stop="openToolSettings(item)"
						/>
						<span v-if="!item.checked" :class="$style.checkPlaceholder" />
					</template>
				</template>
			</N8nDropdownMenu>
		</N8nTooltip>
		<ContactAdminModal
			:type-name="contactAdmin?.typeName ?? ''"
			:audience="contactAdmin?.audience ?? 'instance'"
			:open="contactAdmin !== null"
			@update:open="(isOpen) => !isOpen && (contactAdmin = null)"
		/>
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

// Matches the dimmed restricted row of the tools manager.
.restricted [class*='item-label'],
.restrictedIcon {
	opacity: 0.45;
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

	// A searchable menu marks the active row as virtually highlighted, because the focus stays in the search.
	[data-highlighted] [class*='itemSettingsButton'],
	[data-virtual-highlighted] [class*='itemSettingsButton'] {
		opacity: 1;
	}
}
</style>
