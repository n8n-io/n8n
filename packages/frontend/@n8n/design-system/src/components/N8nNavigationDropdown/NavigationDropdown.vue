<script setup lang="ts">
import { computed, ref, useAttrs, useSlots } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { useRouter } from 'vue-router';

import type { IconSize } from '../../types';
import ConditionalRouterLink from '../ConditionalRouterLink';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import type {
	DropdownMenuExposed,
	DropdownMenuItemProps,
} from '../N8nDropdownMenu/DropdownMenu.types';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

type BaseItem = {
	id: string;
	title: string;
	disabled?: boolean;
	icon?: IconName | { type: 'icon'; value: IconName } | { type: 'emoji'; value: string };
	iconSize?: IconSize;
	iconMargin?: boolean;
	route?: RouteLocationRaw;
	isDivider?: false;
	description?: string;
};

type Divider = { isDivider: true; id: string };

type Item = BaseItem & { submenu?: Array<BaseItem | Divider> };

type MenuItemClick = {
	active: boolean;
	index: string;
	indexPath: string[];
};

type NavItemData = {
	source: BaseItem;
	indexPath: string[];
	showIcon: boolean;
	/** Item whose append slot renders on this row. Nested rows use the parent item. */
	appendSource?: Item;
};

defineOptions({
	name: 'N8nNavigationDropdown',
	inheritAttrs: false,
});

const props = defineProps<{
	menu: Array<Item | Divider>;
	disabled?: boolean;
	teleport?: boolean;
	submenuClass?: string;
}>();

const emit = defineEmits<{
	itemClick: [item: MenuItemClick];
	select: [id: Item['id']];
}>();

const attrs = useAttrs();
const slots = useSlots();
const router = useRouter();
const menuRef = ref<DropdownMenuExposed | null>(null);

const triggerTestId = computed(() => {
	const value = attrs['data-test-id'];
	return typeof value === 'string' ? value : undefined;
});

const hasAppendSlot = (id: string) => Boolean(slots[`item.append.${id}`]);

const orderedMenu = computed(() => {
	const workflowIndex = props.menu.findIndex((item) => !item.isDivider && item.id === 'workflow');
	const agentIndex = props.menu.findIndex((item) => !item.isDivider && item.id === 'agent');

	if (workflowIndex === -1 || agentIndex === -1 || agentIndex === workflowIndex + 1) {
		return props.menu;
	}

	const ordered = [...props.menu];
	const [agentItem] = ordered.splice(agentIndex, 1);
	const nextWorkflowIndex = ordered.findIndex((item) => !item.isDivider && item.id === 'workflow');
	ordered.splice(nextWorkflowIndex + 1, 0, agentItem);

	return ordered;
});

defineSlots<{
	default?: () => unknown;
	'item-icon'?: (props: { item: BaseItem }) => unknown;
	[key: `item.append.${string}`]: (props: { item: Item }) => unknown;
}>();

const menuModel = computed(() => {
	const meta = new Map<string, NavItemData>();

	const toItems = (
		entries: Array<BaseItem | Divider>,
		parentPath: string[],
		parent?: Item,
	): Array<DropdownMenuItemProps<string, NavItemData>> => {
		const items: Array<DropdownMenuItemProps<string, NavItemData>> = [];
		let divided = false;

		for (const entry of entries) {
			if (entry.isDivider) {
				divided = true;
				continue;
			}

			const indexPath = [...parentPath, entry.id];
			const hasSubmenu = Boolean(entry.submenu?.length);
			const data: NavItemData = {
				source: entry,
				indexPath,
				showIcon: hasSubmenu || parent !== undefined,
				appendSource: hasSubmenu ? undefined : (parent ?? entry),
			};
			meta.set(entry.id, data);

			items.push({
				id: entry.id,
				label: entry.title,
				disabled: entry.disabled,
				divided,
				testId: hasSubmenu
					? 'navigation-submenu'
					: parent
						? 'navigation-submenu-item'
						: 'navigation-menu-item',
				children: hasSubmenu ? toItems(entry.submenu ?? [], indexPath, entry) : undefined,
				data,
			});
			divided = false;
		}

		return items;
	};

	return {
		items: toItems(orderedMenu.value, ['-1']),
		meta,
	};
});

const open = () => {
	menuRef.value?.open();
};

const close = () => {
	menuRef.value?.close();
};

function onSelect(id: string) {
	const data = menuModel.value.meta.get(id);
	if (!data || data.source.disabled) return;

	emit('select', id);
	emit('itemClick', { active: true, index: id, indexPath: data.indexPath });

	if (data.source.route && router) {
		void router.push(data.source.route);
	}
}

defineExpose({
	open,
	close,
});
</script>

<template>
	<N8nDropdownMenu
		ref="menuRef"
		:items="menuModel.items"
		:disabled="disabled"
		:modal="false"
		:teleported="teleport !== false"
		:extra-popper-class="submenuClass"
		:data-test-id="triggerTestId"
		placement="bottom-start"
		sub-menu-max-height="450px"
		@select="onSelect"
	>
		<template #trigger>
			<slot />
		</template>

		<template #item-leading="{ item }">
			<template v-if="item.data?.showIcon">
				<slot name="item-icon" :item="item.data.source">
					<template v-if="item.data.source.icon">
						<N8nIcon
							v-if="
								typeof item.data.source.icon === 'string' || item.data.source.icon.type === 'icon'
							"
							class="submenu__icon"
							:icon="
								typeof item.data.source.icon === 'object'
									? item.data.source.icon.value
									: item.data.source.icon
							"
							:size="item.data.source.iconSize"
						/>
						<N8nText v-else-if="item.data.source.icon.type === 'emoji'" class="submenu__icon">
							{{ item.data.source.icon.value }}
						</N8nText>
					</template>
				</slot>
			</template>
		</template>

		<template #item-label="{ item }">
			<ConditionalRouterLink
				:to="(!item.disabled && item.data?.source.route) || undefined"
				:class="$style.menuItemTitle"
			>
				{{ item.label }}
			</ConditionalRouterLink>
		</template>

		<template #item-trailing="{ item }">
			<N8nTooltip
				v-if="item.data?.source.description"
				:content="item.data.source.description"
				placement="right"
				:class="$style.infoTooltip"
			>
				<N8nIcon icon="info" size="medium" :class="$style.infoIcon" />
			</N8nTooltip>
			<span
				v-if="item.data?.appendSource && hasAppendSlot(item.data.appendSource.id)"
				:class="$style.menuItemAppend"
			>
				<slot :name="`item.append.${item.data.appendSource.id}`" :item="item.data.appendSource" />
			</span>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
:global(.submenu__icon) {
	margin-right: var(--spacing--2xs);
	color: var(--color--text);
}

.menuItemTitle {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.menuItemAppend {
	display: inline-flex;
	align-items: center;
	margin-left: auto;
	padding-left: var(--spacing--2xs);
}

.infoTooltip {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	padding-left: var(--spacing--xs);
}

.infoIcon {
	color: var(--color--text--tint-1);
	outline: none;
	margin-left: var(--spacing--2xs);
}
</style>
