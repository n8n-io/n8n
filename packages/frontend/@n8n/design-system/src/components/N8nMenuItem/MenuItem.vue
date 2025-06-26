<script lang="ts" setup>
import { ElSubMenu, ElMenuItem } from 'element-plus';
import { computed, useCssModule, getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';

import { doesMenuItemMatchCurrentRoute } from './routerUtil';
import type { IMenuItem, IMenuElement } from '../../types';
import { isCustomMenuItem } from '../../types';
import type { IconColor } from '../../types/icon';
import { getInitials } from '../../utils/labelUtil';
import ConditionalRouterLink from '../ConditionalRouterLink';
import N8nIcon from '../N8nIcon';
import N8nSpinner from '../N8nSpinner';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

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
	activeTab: undefined,
	handleSelect: undefined,
});

const $style = useCssModule();
const $route = useRoute();

const availableChildren = computed((): IMenuElement[] =>
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

const isActive = (item: IMenuElement): boolean => {
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

// Get self component to avoid dependency cycle
const N8nMenuItem = getCurrentInstance()?.type;

const getIconColor = (item: IMenuItem): IconColor | undefined => {
	if (typeof item.icon === 'string') {
		return undefined;
	}

	return item.icon?.color;
};
</script>

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
				<template v-if="item.icon">
					<div :class="$style.icon">
						<div :class="$style.notificationContainer">
							<N8nIcon
								v-if="typeof item.icon === 'string' || item.icon.type === 'icon'"
								:icon="typeof item.icon === 'object' ? item.icon.value : item.icon"
								:size="item.customIconSize || 'large'"
								:color="getIconColor(item)"
							/>
							<N8nText
								v-else-if="item.icon.type === 'emoji'"
								:size="item.customIconSize || 'large'"
								:color="getIconColor(item)"
							>
								{{ item.icon.value }}
							</N8nText>
							<div v-if="item.notification" :class="$style.notification">
								<div></div>
							</div>
						</div>
					</div>
				</template>
				<span v-if="!compact" :class="$style.label">{{ item.label }}</span>
				<span v-if="!item.icon && compact" :class="[$style.label, $style.compactLabel]">{{
					getInitials(item.label)
				}}</span>
			</template>
			<template v-for="child in availableChildren" :key="child.id">
				<component
					:is="child.component"
					v-if="isCustomMenuItem(child)"
					v-bind="child.props"
					:class="$style.custom"
				/>
				<N8nMenuItem
					v-else
					:item="child"
					:compact="false"
					:tooltip-delay="tooltipDelay"
					:popper-class="popperClass"
					:mode="mode"
					:active-tab="activeTab"
					:handle-select="handleSelect"
				/>
			</template>
		</ElSubMenu>
		<N8nTooltip
			v-else
			placement="right"
			:content="compact ? item.label : ''"
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
						[$style.small]: item.size === 'small',
					}"
					data-test-id="menu-item"
					:index="item.id"
					:disabled="item.disabled"
					@click="handleSelect?.(item)"
				>
					<template v-if="item.icon">
						<div :class="$style.icon">
							<div :class="$style.notificationContainer">
								<N8nIcon
									v-if="typeof item.icon === 'string' || item.icon.type === 'icon'"
									:icon="typeof item.icon === 'object' ? item.icon.value : item.icon"
									:size="item.customIconSize || 'large'"
									:color="getIconColor(item)"
								/>
								<N8nText
									v-else-if="item.icon.type === 'emoji'"
									:size="item.customIconSize || 'large'"
									:color="getIconColor(item)"
								>
									{{ item.icon.value }}
								</N8nText>
								<div v-if="item.notification" :class="$style.notification">
									<div></div>
								</div>
							</div>
						</div>
					</template>

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

	&.small {
		font-size: var(--font-size-2xs) !important;
		padding-top: var(--spacing-3xs) !important;
		padding-bottom: var(--spacing-3xs) !important;
		padding-left: var(--spacing-s) !important;
		padding-right: var(--spacing-xs) !important;

		.icon {
			margin-right: var(--spacing-3xs);
		}
	}
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
	line-height: 1;
	min-width: var(--spacing-s);
	margin-right: var(--spacing-xs);

	svg {
		margin-right: 0 !important;
	}
}

.notificationContainer {
	display: flex;
	position: relative;
}

.notification {
	display: flex;
	position: absolute;
	top: -0.15em;
	right: -0.3em;
	align-items: center;
	justify-content: center;

	div {
		height: 0.36em;
		width: 0.36em;
		background-color: var(--color-primary);
		border-radius: 50%;
	}
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
		padding: var(--spacing-3xs) var(--spacing-2xs) !important;
	}

	.menuItem {
		display: flex;
		padding: var(--spacing-2xs) !important;
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

	.custom {
		margin-left: 0 !important;
	}
}
</style>
