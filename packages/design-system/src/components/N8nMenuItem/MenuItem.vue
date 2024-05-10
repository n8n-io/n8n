<template>
	<div :class="['n8n-menu-item', $style.item]">
		<ElSubMenu
			v-if="item.children?.length"
			:id="item.id"
			:class="{
				[$style.submenu]: true,
				[$style.compact]: compact,
				[$style.active]: mode === 'router' && isItemActive(item),
			}"
			:index="item.id"
			teleported
			:popper-class="submenuPopperClass"
		>
			<template #title>
				<N8nIcon
					v-if="item.icon"
					:class="$style.icon"
					:icon="item.icon"
					:size="item.customIconSize || 'large'"
				/>
				<span v-if="!compact" :class="$style.label">{{ item.label }}</span>
				<span v-if="!item.icon && compact" :class="[$style.label, $style.compactLabel]">{{
					getInitials(item.label)
				}}</span>
			</template>
			<N8nMenuItem
				v-for="child in availableChildren"
				:key="child.id"
				:item="child"
				:compact="false"
				:tooltip-delay="tooltipDelay"
				:popper-class="popperClass"
				:mode="mode"
				:active-tab="activeTab"
				:handle-select="handleSelect"
			/>
		</ElSubMenu>
		<N8nTooltip
			v-else
			placement="right"
			:content="item.label"
			:disabled="!compact"
			:show-after="tooltipDelay"
		>
			<ConditionalRouterLink v-bind="item.route ?? item.link">
				<ElMenuItem
					:id="item.id"
					:class="{
						[$style.menuItem]: true,
						[$style.item]: true,
						[$style.disableActiveStyle]: !isItemActive(item),
						[$style.active]: isItemActive(item),
						[$style.compact]: compact,
					}"
					data-test-id="menu-item"
					:index="item.id"
					:disabled="item.disabled"
					@click="handleSelect?.(item)"
				>
					<N8nIcon
						v-if="item.icon"
						:class="$style.icon"
						:icon="item.icon"
						:size="item.customIconSize || 'large'"
					/>
					<span v-if="!compact" :class="$style.label">{{ item.label }}</span>
					<span v-if="!item.icon && compact" :class="[$style.label, $style.compactLabel]">{{
						getInitials(item.label)
					}}</span>
					<N8nTooltip
						v-if="item.secondaryIcon"
						:placement="item.secondaryIcon?.tooltip?.placement || 'right'"
						:content="item.secondaryIcon?.tooltip?.content"
						:disabled="compact || !item.secondaryIcon?.tooltip?.content"
						:show-after="tooltipDelay"
					>
						<N8nIcon
							:class="$style.secondaryIcon"
							:icon="item.secondaryIcon.name"
							:size="item.secondaryIcon.size || 'small'"
						/>
					</N8nTooltip>
					<N8nSpinner v-if="item.isLoading" :class="$style.loading" size="small" />
				</ElMenuItem>
			</ConditionalRouterLink>
		</N8nTooltip>
	</div>
</template>

<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useRoute } from 'vue-router';
import { ElSubMenu, ElMenuItem } from 'element-plus';
import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';
import ConditionalRouterLink from '../ConditionalRouterLink';
import type { IMenuItem } from '../../types';
import { doesMenuItemMatchCurrentRoute } from './routerUtil';

interface MenuItemProps {
	item: IMenuItem;
	compact?: boolean;
	tooltipDelay?: number;
	popperClass?: string;
	mode?: 'router' | 'tabs';
	activeTab?: string;
	handleSelect?: (item: IMenuItem) => void;
}

const props = withDefaults(defineProps<MenuItemProps>(), {
	compact: false,
	tooltipDelay: 300,
	popperClass: '',
	mode: 'router',
});

const $style = useCssModule();
const $route = useRoute();

const availableChildren = computed((): IMenuItem[] =>
	Array.isArray(props.item.children)
		? props.item.children.filter((child) => child.available !== false)
		: [],
);

const currentRoute = computed(() => {
	return $route ?? { name: '', path: '' };
});

const submenuPopperClass = computed((): string => {
	const popperClass = [$style.submenuPopper, props.popperClass];
	if (props.compact) {
		popperClass.push($style.compact);
	}
	return popperClass.join(' ');
});

const isActive = (item: IMenuItem): boolean => {
	if (props.mode === 'router') {
		return doesMenuItemMatchCurrentRoute(item, currentRoute.value);
	} else {
		return item.id === props.activeTab;
	}
};

const isItemActive = (item: IMenuItem): boolean => {
	const hasActiveChild =
		Array.isArray(item.children) && item.children.some((child) => isActive(child));
	return isActive(item) || hasActiveChild;
};

const getInitials = (label: string): string => {
	const words = label.split(' ');

	if (words.length === 1) {
		return words[0].substring(0, 2);
	} else {
		return words[0].charAt(0) + words[1].charAt(0);
	}
};
</script>

<style module lang="scss">
// Element menu-item overrides
:global(.el-menu-item),
:global(.el-sub-menu__title) {
	--menu-font-color: var(--color-text-base);
	--menu-item-active-background-color: var(--color-foreground-base);
	--menu-item-active-font-color: var(--color-text-dark);
	--menu-item-hover-fill: var(--color-foreground-base);
	--menu-item-hover-font-color: var(--color-text-dark);
	--menu-item-height: 35px;
	--sub-menu-item-height: 27px;
}

.submenu {
	background: none !important;

	&.compact :global(.el-sub-menu__title) {
		i {
			display: none;
		}
	}

	:global(.el-sub-menu__title) {
		display: flex;
		align-items: center;
		border-radius: var(--border-radius-base) !important;
		padding: var(--spacing-2xs) var(--spacing-xs) !important;
		user-select: none;

		i {
			padding-top: 2px;
			&:hover {
				color: var(--color-primary);
			}
		}

		&:hover {
			.icon {
				color: var(--color-text-dark);
			}
		}
	}

	.menuItem {
		height: var(--sub-menu-item-height) !important;
		min-width: auto !important;
		margin: var(--spacing-2xs) 0 !important;
		padding-left: var(--spacing-l) !important;
		user-select: none;

		&:hover {
			.icon {
				color: var(--color-text-dark);
			}
		}
	}
}

.disableActiveStyle {
	background-color: initial !important;
	color: var(--color-text-base) !important;

	svg {
		color: var(--color-text-base) !important;
	}

	&:hover {
		background-color: var(--color-foreground-base) !important;
		svg {
			color: var(--color-text-dark) !important;
		}
		&:global(.el-sub-menu) {
			background-color: unset !important;
		}
	}
}

.active {
	&,
	& :global(.el-sub-menu__title) {
		background-color: var(--color-foreground-base);
		border-radius: var(--border-radius-base);
		.icon {
			color: var(--color-text-dark);
		}
	}
}

.menuItem {
	display: flex;
	padding: var(--spacing-2xs) var(--spacing-xs) !important;
	margin: 0 !important;
	border-radius: var(--border-radius-base) !important;
	overflow: hidden;

	&.compact {
		padding: var(--spacing-2xs) 0 !important;
		justify-content: center;
	}
}

.icon {
	min-width: var(--spacing-s);
	margin-right: var(--spacing-xs);
	text-align: center;
}

.loading {
	margin-left: var(--spacing-xs);
}

.secondaryIcon {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex: 1;
	margin-left: 20px;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	user-select: none;
}

.compactLabel {
	text-overflow: unset;
}

.item + .item {
	margin-top: 8px !important;
}

.compact {
	.icon {
		margin: 0;
		overflow: visible !important;
		visibility: visible !important;
		width: initial !important;
		height: initial !important;
	}
	.secondaryIcon {
		display: none;
	}
}

.submenuPopper {
	display: block;

	ul {
		padding: 0 var(--spacing-xs) !important;
	}
	.menuItem {
		display: flex;
		padding: var(--spacing-2xs) var(--spacing-xs) !important;
		margin: var(--spacing-2xs) 0 !important;
	}

	.icon {
		margin-right: var(--spacing-xs);
	}

	&.compact {
		.label {
			display: inline-block;
		}
	}
}
</style>
