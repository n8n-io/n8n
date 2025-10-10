<script setup lang="ts">
import { ElMenu, ElSubMenu, ElMenuItem, type MenuItemRegistered } from 'element-plus';
import { ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import ConditionalRouterLink from '../ConditionalRouterLink';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';

type BaseItem = {
	id: string;
	title: string;
	disabled?: boolean;
	icon?: IconName | { type: 'icon'; value: IconName } | { type: 'emoji'; value: string };
	route?: RouteLocationRaw;
	isDivider?: false;
};

type Divider = { isDivider: true; id: string };

type Item = BaseItem & { submenu?: Array<BaseItem | Divider> };

defineOptions({
	name: 'N8nNavigationDropdown',
});

defineProps<{
	menu: Array<Item | Divider>;
	disabled?: boolean;
	teleport?: boolean;
}>();

const menuRef = ref<typeof ElMenu | null>(null);
const ROOT_MENU_INDEX = '-1';

const emit = defineEmits<{
	itemClick: [item: MenuItemRegistered];
	select: [id: Item['id']];
}>();

defineSlots<{
	default?: () => unknown;
	'item-icon'?: (props: { item: BaseItem }) => unknown;
	[key: `item.append.${string}`]: (props: { item: Item }) => unknown;
}>();

const close = () => {
	menuRef.value?.close(ROOT_MENU_INDEX);
};

const menuTrigger = ref<'click' | 'hover'>('click');
const onOpen = (index: string) => {
	if (index !== ROOT_MENU_INDEX) return;
	menuTrigger.value = 'hover';
};

const onClose = (index: string) => {
	if (index !== ROOT_MENU_INDEX) return;
	menuTrigger.value = 'click';
};

defineExpose({
	close,
});
</script>

<template>
	<ElMenu
		ref="menuRef"
		mode="horizontal"
		unique-opened
		:menu-trigger="menuTrigger"
		:ellipsis="false"
		:class="$style.dropdown"
		@select="emit('select', $event)"
		@keyup.escape="close"
		@open="onOpen"
		@close="onClose"
	>
		<ElSubMenu
			:index="ROOT_MENU_INDEX"
			:class="$style.trigger"
			:popper-offset="-10"
			:popper-class="$style.submenu"
			:disabled
			:teleported="teleport"
		>
			<template #title>
				<slot />
			</template>

			<template v-for="item in menu" :key="item.id">
				<hr v-if="item.isDivider" />
				<template v-else-if="item.submenu">
					<ElSubMenu
						:popper-class="$style.nestedSubmenu"
						:index="item.id"
						:popper-offset="-10"
						data-test-id="navigation-submenu"
					>
						<template #title>
							<div :class="$style.subMenuTitle">
								<slot name="item-icon" v-bind="{ item }">
									<!-- Default icon rendering -->
									<template v-if="item.icon">
										<N8nIcon
											v-if="typeof item.icon === 'string' || item.icon.type === 'icon'"
											:class="$style.submenu__icon"
											:icon="typeof item.icon === 'object' ? item.icon.value : item.icon"
										/>
										<N8nText v-else-if="item.icon.type === 'emoji'" :class="$style.submenu__icon">
											{{ item.icon.value }}
										</N8nText>
									</template>
								</slot>
								{{ item.title }}
							</div>
						</template>
						<template v-for="subitem in item.submenu" :key="subitem.id">
							<hr v-if="subitem.isDivider" />
							<ConditionalRouterLink v-else :to="(!subitem.disabled && subitem.route) || undefined">
								<ElMenuItem
									data-test-id="navigation-submenu-item"
									:index="subitem.id"
									:disabled="subitem.disabled"
									@click="emit('itemClick', $event)"
								>
									<slot name="item-icon" v-bind="{ item: subitem }">
										<!-- Default icon rendering -->
										<template v-if="subitem.icon">
											<N8nIcon
												v-if="typeof subitem.icon === 'string' || subitem.icon.type === 'icon'"
												:class="$style.submenu__icon"
												:icon="typeof subitem.icon === 'object' ? subitem.icon.value : subitem.icon"
											/>
											<N8nText
												v-else-if="subitem.icon.type === 'emoji'"
												:class="$style.submenu__icon"
											>
												{{ subitem.icon.value }}
											</N8nText>
										</template>
									</slot>

									{{ subitem.title }}
									<slot :name="`item.append.${item.id}`" v-bind="{ item }" />
								</ElMenuItem>
							</ConditionalRouterLink>
						</template>
					</ElSubMenu>
				</template>
				<ConditionalRouterLink v-else :to="(!item.disabled && item.route) || undefined">
					<ElMenuItem
						:index="item.id"
						:disabled="item.disabled"
						data-test-id="navigation-menu-item"
					>
						{{ item.title }}
						<slot :name="`item.append.${item.id}`" v-bind="{ item }" />
					</ElMenuItem>
				</ConditionalRouterLink>
			</template>
		</ElSubMenu>
	</ElMenu>
</template>

<style lang="scss" module>
:global(.el-menu).dropdown {
	border-bottom: 0;
	background-color: transparent;

	> :global(.el-sub-menu) {
		> :global(.el-sub-menu__title) {
			height: auto;
			line-height: initial;
			border-bottom: 0 !important;
			padding: 0;
			:global(.el-sub-menu__icon-arrow) {
				display: none;
			}
		}

		&:global(.is-active) {
			:global(.el-sub-menu__title) {
				border: 0;
			}
		}
	}

	& hr {
		border-top: none;
		border-bottom: var(--border);
		margin-block: var(--spacing--4xs);
	}
}

.nestedSubmenu {
	:global(.el-menu) {
		max-height: 450px;
		overflow: auto;
	}
}

.submenu {
	padding: 5px 0 !important;

	:global(.el-menu--horizontal .el-menu .el-menu-item),
	:global(.el-menu--horizontal .el-menu .el-sub-menu__title) {
		color: var(--color--text--shade-1);
		background-color: var(--color-menu-background);
	}

	:global(.el-menu--horizontal .el-menu .el-menu-item:not(.is-disabled):hover),
	:global(.el-menu--horizontal .el-menu .el-sub-menu__title:not(.is-disabled):hover) {
		background-color: var(--color-menu-hover-background);
	}

	:global(.el-popper) {
		padding: 0 10px !important;
	}

	:global(.el-menu--popup) {
		border: 1px solid var(--color--foreground);
		border-radius: var(--radius);
	}

	:global(.el-menu--horizontal .el-menu .el-menu-item.is-disabled) {
		opacity: 1;
		cursor: default;
		color: var(--color--text--tint-1);
	}

	:global(.el-sub-menu__icon-arrow svg) {
		margin-top: auto;
	}
}

.subMenuTitle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.submenu__icon {
	margin-right: var(--spacing--2xs);
	color: var(--color--text);
}
</style>
