<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import {
	N8nDropdownMenu,
	N8nIconButton,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useFavoritesStore } from '@/app/stores/favorites.store';
import { FOLDER_LIST_ITEM_ACTIONS, MCP_ACCESS_ACTIONS } from '../folders.constants';

export type FolderCardAction = {
	value: string;
	label: string;
	disabled?: boolean;
	children?: FolderCardAction[];
	tooltip?: string;
};

type MenuItemData = {
	tooltip?: string;
};

const props = withDefaults(
	defineProps<{
		folder: { id: string; name: string };
		actions?: FolderCardAction[];
		showMcpAccessActions?: boolean;
	}>(),
	{ actions: () => [], showMcpAccessActions: false },
);

const emit = defineEmits<{ action: [action: string] }>();
const i18n = useI18n();
const favoritesStore = useFavoritesStore();
const dropdownId = `folder-card-actions-dropdown-${getCurrentInstance()?.uid ?? 0}`;

const mcpAccessAction = computed<FolderCardAction>(() => ({
	label: i18n.baseText('resourceActions.mcpAccess.manage'),
	value: MCP_ACCESS_ACTIONS.MANAGE,
	disabled: false,
	children: [
		{
			label: i18n.baseText('resourceActions.mcpAccess.enable'),
			value: MCP_ACCESS_ACTIONS.ENABLE,
			disabled: false,
			tooltip: i18n.baseText('resourceActions.mcpAccess.enable.tooltip', {
				interpolate: { scopeName: props.folder.name },
			}),
		},
		{
			label: i18n.baseText('resourceActions.mcpAccess.disable'),
			value: MCP_ACCESS_ACTIONS.DISABLE,
			disabled: false,
			tooltip: i18n.baseText('resourceActions.mcpAccess.disable.tooltip', {
				interpolate: { scopeName: props.folder.name },
			}),
		},
	],
}));

const allActions = computed<FolderCardAction[]>(() => {
	const favoriteAction: FolderCardAction = {
		label: favoritesStore.isFavorite(props.folder.id, 'folder')
			? i18n.baseText('favorites.remove')
			: i18n.baseText('favorites.add'),
		value: FOLDER_LIST_ITEM_ACTIONS.TOGGLE_FAVORITE,
		disabled: false,
	};
	const renameIndex = props.actions.findIndex(
		(action) => action.value === FOLDER_LIST_ITEM_ACTIONS.RENAME,
	);
	const actions = [...props.actions];

	actions.splice(renameIndex === -1 ? actions.length : renameIndex, 0, favoriteAction);

	return props.showMcpAccessActions ? [...actions, mcpAccessAction.value] : actions;
});

function toMenuItem(action: FolderCardAction): DropdownMenuItemProps<string, MenuItemData> {
	return {
		id: action.value,
		testId: `action-${action.value}`,
		label: action.label,
		disabled: action.disabled,
		children: action.children?.map(toMenuItem),
		data: action.tooltip ? { tooltip: action.tooltip } : undefined,
	};
}

const menuItems = computed(() => allActions.value.map(toMenuItem));

async function onAction(action: string) {
	if (action === FOLDER_LIST_ITEM_ACTIONS.TOGGLE_FAVORITE) {
		await favoritesStore.toggleFavorite(props.folder.id, 'folder');

		return;
	}

	emit('action', action);
}
</script>

<template>
	<span data-test-id="folder-card-actions" @click.stop.prevent @keydown.stop>
		<N8nDropdownMenu
			:id="dropdownId"
			:items="menuItems"
			placement="bottom-end"
			:extra-popper-class="$style.dropdown"
			@select="onAction"
		>
			<template #trigger>
				<N8nIconButton
					class="action-toggle"
					variant="ghost"
					icon="ellipsis-12"
					size="small"
					icon-size="medium"
					role="button"
					:aria-controls="dropdownId"
					:aria-label="i18n.baseText('generic.more')"
				/>
			</template>
			<template #item-label="{ item, ui }">
				<N8nTooltip
					v-if="item.data?.tooltip"
					:content="item.data.tooltip"
					placement="left"
					:show-after="300"
					teleported
				>
					<N8nText
						:class="ui.class"
						size="medium"
						:color="item.disabled ? 'text-light' : 'text-dark'"
					>
						{{ item.label }}
					</N8nText>
				</N8nTooltip>
				<N8nText
					v-else
					:class="ui.class"
					size="medium"
					:color="item.disabled ? 'text-light' : 'text-dark'"
				>
					{{ item.label }}
				</N8nText>
			</template>
		</N8nDropdownMenu>
	</span>
</template>

<style module lang="scss">
.dropdown {
	// Keep the existing folder menu width. No size token matches it.
	width: 200px;
}
</style>
