<template>
	<div :class="['n8n-menu-item', $style.item]">
		<el-submenu
			v-if="item.children && item.children.length > 0"
			:id="item.id"
			:class="{
				[$style.submenu]: true,
				[$style.compact]: compact,
				[$style.active]: mode === 'router' && isItemActive(item)
			}"
			:index="item.id"
			popper-append-to-body
			:popper-class="`${$style.submenuPopper} ${popperClass}`"
		>
			<template slot="title">
				<n8n-icon v-if="item.icon" :class="$style.icon" :icon="item.icon" :size="item.customIconSize || 'large'" />
				<span :class="$style.label">{{ item.label }}</span>
			</template>
			<el-menu-item
				v-for="child in availableChildren"
				:key="child.id"
				:id="child.id"
				:class="{
					[$style.menuItem]: true,
					[$style.disableActiveStyle]: !isItemActive(child),
					[$style.active]: isItemActive(child),
				}"
				:index="child.id"
				@click="onItemClick(child)"
			>
				<n8n-icon v-if="child.icon" :class="$style.icon" :icon="child.icon" />
				<span :class="$style.label">{{ child.label }}</span>
			</el-menu-item>
		</el-submenu>
		<n8n-tooltip v-else placement="right" :content="item.label" :disabled="!compact" :open-delay="tooltipDelay">
			<el-menu-item
				:id="item.id"
				:class="{
					[$style.menuItem]: true,
					[$style.item]: true,
					[$style.disableActiveStyle]: !isItemActive(item),
					[$style.active]: isItemActive(item),
					[$style.compact]: compact
				}"
				:index="item.id"
				@click="onItemClick(item)"
			>
				<n8n-icon v-if="item.icon" :class="$style.icon" :icon="item.icon" :size="item.customIconSize || 'large'" />
				<span :class="$style.label">{{ item.label }}</span>
			</el-menu-item>
		</n8n-tooltip>
	</div>
</template>

<script lang="ts">
import ElSubmenu from 'element-ui/lib/submenu';
import ElMenuItem from 'element-ui/lib/menu-item';
import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';
import { IMenuItem } from '../../types';
import Vue from 'vue';
import { Route } from 'vue-router';

export default Vue.extend({
	name: 'n8n-menu-item',
	components: {
		ElSubmenu, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
		ElMenuItem, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
		N8nIcon,
		N8nTooltip,
	},
	props: {
		item: {
			type: Object as () => IMenuItem,
			required: true,
		},
		compact: {
			type: Boolean,
			default: false,
		},
		tooltipDelay: {
			type: Number,
			default: 300,
		},
		popperClass: {
			type: String,
			default: '',
		},
		mode: {
			type: String,
			default: 'router',
			validator: (value: string): boolean => ['router', 'tabs'].includes(value),
		},
		activeTab: {
			type: String,
		},
	},
	computed: {
		availableChildren(): IMenuItem[] {
			return Array.isArray(this.item.children) ? this.item.children.filter(child => child.available !== false) : [];
		},
	},
	methods: {
		isItemActive(item: IMenuItem): boolean {
			const isItemActive = this.isActive(item);
			const hasActiveChild = Array.isArray(item.children) && item.children.some(child => this.isActive(child));
			return isItemActive || hasActiveChild;
		},
		isActive(item: IMenuItem): boolean {
			if (this.mode === 'router') {
				if (item.activateOnRoutePaths) {
					return Array.isArray(item.activateOnRoutePaths) && item.activateOnRoutePaths.includes(this.$route.path);
				} else if (item.activateOnRouteNames) {
					return Array.isArray(item.activateOnRouteNames) && item.activateOnRouteNames.includes(this.$route.name || '');
				}
				return false;
			} else {
				return item.id === this.activeTab;
			}
		},
		onItemClick(item: IMenuItem, event: MouseEvent) {
			if (item && item.type === 'link' && item.properties) {
				const href: string = item.properties.href;
				if (!href) {
					return;
				}

				if (item.properties.newWindow) {
					window.open(href);
				}
				else {
					window.location.assign(item.properties.href);
				}

			}
			this.$emit('click', event, item.id);
		},
	},
});

</script>

<style module lang="scss">
// Element menu-item overrides
:global(.el-menu-item), :global(.el-submenu__title) {
	--menu-font-color: var(--color-text-base);
	--menu-item-active-background-color: var(--color-foreground-base);
	--menu-item-active-font-color: var(--color-text-dark);
	--menu-item-hover-fill: var(--color-foreground-base);
	--menu-item-hover-font-color: var(--color-text-dark);
	--menu-item-height: 35px;
	--submenu-item-height: 27px;
}


.submenu {
	background: none !important;

	&.compact :global(.el-submenu__title) {
		i {
			display: none;
		}
	}

	:global(.el-submenu__title) {
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
			.icon { color: var(--color-text-dark) }
		}
	}

	.menuItem {
		height: var(--submenu-item-height) !important;
		min-width: auto !important;
		margin: var(--spacing-2xs) 0 !important;
		padding-left: var(--spacing-l) !important;
		user-select: none;

		&:hover {
			.icon { color: var(--color-text-dark) }
		}
	};
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
		&:global(.el-submenu) {
			background-color: unset !important;
		}
	}
}

.active {
	&, & :global(.el-submenu__title) {
		background-color: var(--color-foreground-base);
		border-radius: var(--border-radius-base);
		.icon { color: var(--color-text-dark) }
	}
}

.menuItem {
	display: flex;
	padding: var(--spacing-2xs) var(--spacing-xs) !important;
	margin: 0 !important;
	border-radius: var(--border-radius-base) !important;
}

.icon {
	min-width: var(--spacing-s);
	margin-right: var(--spacing-xs);
	text-align: center;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	user-select: none;
}

.item + .item {
	margin-top: 8px !important;
}

.compact {
	width: 40px;
	.icon {
		margin: 0;
		overflow: visible !important;
		visibility: visible !important;
		width: initial !important;
		height: initial !important;
	}
	.label {
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

	.label {
		display: block;
	}
}
</style>
