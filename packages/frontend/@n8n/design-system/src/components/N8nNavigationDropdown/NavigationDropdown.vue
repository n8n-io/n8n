<script setup lang="ts">
import { ElMenu, ElSubMenu, ElMenuItem, type MenuItemRegistered } from 'element-plus';
import { ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

import type { IconSize } from '@n8n/design-system/types';

import ConditionalRouterLink from '../ConditionalRouterLink';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';

type BaseItem = {
	id: string;
	title: string;
	disabled?: boolean;
	icon?: IconName | { type: 'icon'; value: IconName } | { type: 'emoji'; value: string };
	iconSize?: IconSize;
	iconMargin?: boolean;
	route?: RouteLocationRaw;
	isDivider?: false;
};

type Divider = { isDivider: true; id: string };

type Item = BaseItem & { submenu?: Array<Item | Divider> };

defineOptions({
	name: 'N8nNavigationDropdown',
});

defineProps<{
	menu: Array<Item | Divider>;
	disabled?: boolean;
	teleport?: boolean;
	submenuClass?: string;
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

const open = () => {
	menuRef.value?.open(ROOT_MENU_INDEX);
};

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
	open,
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
			:popper-class="[$style.submenu, submenuClass ?? ''].join(' ')"
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
											:class="{ [$style.submenu__icon]: item.iconMargin !== false }"
											:icon="typeof item.icon === 'object' ? item.icon.value : item.icon"
											:size="item.iconSize"
										/>
										<N8nText
											v-else-if="item.icon.type === 'emoji'"
											:class="{ [$style.submenu__icon]: item.iconMargin !== false }"
										>
											{{ item.icon.value }}
										</N8nText>
									</template>
								</slot>
								{{ item.title }}
							</div>
						</template>
						<template v-for="subitem in item.submenu" :key="subitem.id">
							<hr v-if="subitem.isDivider" />
							<template v-else-if="subitem.submenu">
								<ElSubMenu
									:popper-class="$style.nestedSubmenu"
									:index="subitem.id"
									:popper-offset="-10"
									data-test-id="navigation-submenu"
								>
									<template #title>
										<div :class="$style.subMenuTitle">
											<slot name="item-icon" v-bind="{ item: subitem }">
												<!-- Default icon rendering -->
												<template v-if="subitem.icon">
													<N8nIcon
														v-if="typeof subitem.icon === 'string' || subitem.icon.type === 'icon'"
														:class="{ [$style.submenu__icon]: subitem.iconMargin !== false }"
														:icon="
															typeof subitem.icon === 'object' ? subitem.icon.value : subitem.icon
														"
														:size="subitem.iconSize"
													/>
													<N8nText
														v-else-if="subitem.icon.type === 'emoji'"
														:class="{ [$style.submenu__icon]: subitem.iconMargin !== false }"
													>
														{{ subitem.icon.value }}
													</N8nText>
												</template>
											</slot>
											{{ subitem.title }}
										</div>
									</template>
									<template v-for="nestedItem in subitem.submenu" :key="nestedItem.id">
										<hr v-if="nestedItem.isDivider" />
										<ConditionalRouterLink
											v-else
											:to="(!nestedItem.disabled && nestedItem.route) || undefined"
										>
											<ElMenuItem
												data-test-id="navigation-submenu-item"
												:index="nestedItem.id"
												:disabled="nestedItem.disabled"
												@click="emit('itemClick', $event)"
											>
												<slot name="item-icon" v-bind="{ item: nestedItem }">
													<!-- Default icon rendering -->
													<template v-if="nestedItem.icon">
														<N8nIcon
															v-if="
																typeof nestedItem.icon === 'string' ||
																nestedItem.icon.type === 'icon'
															"
															:class="{ [$style.submenu__icon]: nestedItem.iconMargin !== false }"
															:icon="
																typeof nestedItem.icon === 'object'
																	? nestedItem.icon.value
																	: nestedItem.icon
															"
															:size="nestedItem.iconSize"
														/>
														<N8nText
															v-else-if="nestedItem.icon.type === 'emoji'"
															:class="{ [$style.submenu__icon]: nestedItem.iconMargin !== false }"
														>
															{{ nestedItem.icon.value }}
														</N8nText>
													</template>
												</slot>

												{{ nestedItem.title }}
												<slot :name="`item.append.${subitem.id}`" v-bind="{ item: nestedItem }" />
											</ElMenuItem>
										</ConditionalRouterLink>
									</template>
								</ElSubMenu>
							</template>
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
												:class="{ [$style.submenu__icon]: subitem.iconMargin !== false }"
												:icon="typeof subitem.icon === 'object' ? subitem.icon.value : subitem.icon"
												:size="subitem.iconSize"
											/>
											<N8nText
												v-else-if="subitem.icon.type === 'emoji'"
												:class="{ [$style.submenu__icon]: subitem.iconMargin !== false }"
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
	border-bottom: 0 !important;
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
		background-color: var(--menu--color--background);
	}

	:global(.el-menu--horizontal .el-menu .el-menu-item:not(.is-disabled):hover),
	:global(.el-menu--horizontal .el-menu .el-sub-menu__title:not(.is-disabled):hover) {
		background-color: var(--menu--color--background--hover);
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
	gap: var(--spacing--2xs);
}

.submenu__icon {
	margin-right: var(--spacing--2xs);
	color: var(--color--text);
}
</style>
