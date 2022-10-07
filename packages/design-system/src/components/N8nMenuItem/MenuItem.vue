<template>
	<el-submenu
		v-if="item.children && item.children.length > 0"
		:class="{
			[$style.submenu]: true,
			[$style.item]: true,
			[$style.compact]: compact
		}"
		:index="item.id"
		:popper-append-to-body="false"
		:popper-class="`${$style.submenuPopper} ${popperClass}`"
	>
			<template slot="title">
				<n8n-icon v-if="item.icon" :class="$style.icon" :icon="item.icon" />
				<span :class="$style.label">{{ item.label }}</span>
			</template>
		<el-menu-item
			v-for="child in item.children"
			:key="child.id"
			:class="[$style.menuItem, $style.disableActiveStyle]"
			:index="child.id"
			@click="onItemClick(child)"
		>
			<n8n-icon v-if="child.icon" :class="$style.icon" :icon="child.icon" />
			<span :class="$style.label">{{ child.label }}</span>
		</el-menu-item>
	</el-submenu>
	<n8n-tooltip v-else placement="right" :content="item.label" :disabled="!compact" :open-delay="tooltipDelay">
		<el-menu-item
			:class="{
				[$style.menuItem]: true,
				[$style.item]: true,
				[$style.disableActiveStyle]: true,
				[$style.compact]: compact
			}"
			:index="item.id"
			@click="onItemClick(item)"
		>
			<n8n-icon v-if="item.icon" :class="$style.icon" :icon="item.icon" />
			<span :class="$style.label">{{ item.label }}</span>
		</el-menu-item>
	</n8n-tooltip>
</template>

<script lang="ts">
import ElSubmenu from 'element-ui/lib/submenu';
import ElMenuItem from 'element-ui/lib/menu-item';
import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';
import { IMenuItem } from '../../types';
import Vue from 'vue';


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
	},
	methods: {
		onMouseEnter(event: MouseEvent) {
			console.log('MOUSE ENTER');
			event.preventDefault();
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
			this.$emit('click', event);
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
	:global(.el-submenu__title) {
		display: flex;
		align-items: center;
		border-radius: var(--border-radius-base);
		padding: var(--spacing-2xs) var(--spacing-xs) !important;
		user-select: none;

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

.menuItem {
	display: flex;
	padding: var(--spacing-2xs) var(--spacing-xs) !important;
	margin: 0 !important;
	border-radius: var(--border-radius-base) !important;

	&.disableActiveStyle {
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
}

.icon {
	margin-right: var(--spacing-xs);
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
}

.item + .item {
	margin-top: 8px !important;
}

.compact {
	width: fit-content;
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
	left: 40px !important;
	bottom: 110px !important;
	top: auto !important;

	ul {
		padding: 0 var(--spacing-xs) !important;
	}
	.menuItem {
		display: flex;
		padding: var(--spacing-2xs) var(--spacing-xs) !important;
	}

	.icon {
		margin-right: var(--spacing-xs);
	}

	.label {
		display: block;
	}
}
</style>
