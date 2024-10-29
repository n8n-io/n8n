<script setup lang="ts">
import { ElMenu, ElSubMenu, ElMenuItem, type MenuItemRegistered } from 'element-plus';
import type { RouteLocationRaw } from 'vue-router';

import ConditionalRouterLink from '../ConditionalRouterLink';
import N8nIcon from '../N8nIcon';

type BaseItem = {
	id: string;
	title: string;
	disabled?: boolean;
	icon?: string;
	route?: RouteLocationRaw;
};

type Item = BaseItem & {
	submenu?: BaseItem[];
};

defineProps<{
	menu: Item[];
}>();

const emit = defineEmits<{
	itemClick: [item: MenuItemRegistered];
	select: [id: Item['id']];
}>();
</script>

<template>
	<ElMenu
		mode="horizontal"
		:ellipsis="false"
		:class="$style.dropdown"
		@select="emit('select', $event)"
	>
		<ElSubMenu
			index="-1"
			:class="$style.trigger"
			:popper-offset="-10"
			:popper-class="$style.submenu"
		>
			<template #title>
				<slot />
			</template>

			<template v-for="item in menu" :key="item.id">
				<template v-if="item.submenu">
					<ElSubMenu :index="item.id" :popper-offset="-10" data-test-id="navigation-submenu">
						<template #title>{{ item.title }}</template>
						<template v-for="subitem in item.submenu" :key="subitem.id">
							<ConditionalRouterLink :to="subitem.route">
								<ElMenuItem
									data-test-id="navigation-submenu-item"
									:index="subitem.id"
									:disabled="subitem.disabled"
									@click="emit('itemClick', $event)"
								>
									<N8nIcon v-if="subitem.icon" :icon="subitem.icon" :class="$style.submenu__icon" />
									{{ subitem.title }}
								</ElMenuItem>
							</ConditionalRouterLink>
						</template>
					</ElSubMenu>
				</template>
				<ConditionalRouterLink v-else :to="item.route">
					<ElMenuItem
						:index="item.id"
						:disabled="item.disabled"
						data-test-id="navigation-menu-item"
					>
						{{ item.title }}
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
}

:global(.el-sub-menu).trigger {
	:global(.el-sub-menu__title) {
		height: auto;
		line-height: initial;
		border-bottom: 0 !important;
		:global(.el-sub-menu__icon-arrow) {
			display: none;
		}
	}

	:global(.el-sub-menu__title:hover) {
		background-color: transparent;
	}
}

.submenu {
	:global(.el-menu--horizontal .el-menu .el-menu-item),
	:global(.el-menu--horizontal .el-menu .el-sub-menu__title) {
		color: var(--color-text-dark);
	}

	:global(.el-menu--horizontal .el-menu .el-menu-item:not(.is-disabled):hover),
	:global(.el-menu--horizontal .el-menu .el-sub-menu__title:not(.is-disabled):hover) {
		background-color: var(--color-foreground-base);
	}

	:global(.el-menu--horizontal .el-menu .el-menu-item.is-disabled) {
		opacity: 1;
		cursor: default;
		color: var(--color-text-light);
	}

	:global(.el-sub-menu__icon-arrow svg) {
		margin-top: auto;
	}
}

.submenu__icon {
	margin-right: var(--spacing-2xs);
	color: var(--color-text-base);
}
</style>
