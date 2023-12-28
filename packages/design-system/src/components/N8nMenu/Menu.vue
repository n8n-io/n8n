<template>
	<div
		:class="{
			['menu-container']: true,
			[$style.container]: true,
			[$style.menuCollapsed]: collapsed,
			[$style.transparentBackground]: transparentBackground,
		}"
	>
		<div v-if="$slots.header" :class="$style.menuHeader">
			<slot name="header"></slot>
		</div>
		<div :class="$style.menuContent">
			<div :class="{ [$style.upperContent]: true, ['pt-xs']: $slots.menuPrefix }">
				<div v-if="$slots.menuPrefix" :class="$style.menuPrefix">
					<slot name="menuPrefix"></slot>
				</div>
				<ElMenu :default-active="defaultActive" :collapse="collapsed">
					<N8nMenuItem
						v-for="item in upperMenuItems"
						:key="item.id"
						:item="item"
						:compact="collapsed"
						:tooltip-delay="tooltipDelay"
						:mode="mode"
						:active-tab="activeTab"
						:handle-select="onSelect"
					/>
				</ElMenu>
			</div>
			<div :class="[$style.lowerContent, 'pb-2xs']">
				<slot name="beforeLowerMenu"></slot>
				<ElMenu :default-active="defaultActive" :collapse="collapsed">
					<N8nMenuItem
						v-for="item in lowerMenuItems"
						:key="item.id"
						:item="item"
						:compact="collapsed"
						:tooltip-delay="tooltipDelay"
						:mode="mode"
						:active-tab="activeTab"
						:handle-select="onSelect"
					/>
				</ElMenu>
				<div v-if="$slots.menuSuffix" :class="$style.menuSuffix">
					<slot name="menuSuffix"></slot>
				</div>
			</div>
		</div>
		<div v-if="$slots.footer" :class="$style.menuFooter">
			<slot name="footer"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import { ElMenu } from 'element-plus';
import N8nMenuItem from '../N8nMenuItem';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { IMenuItem, RouteObject } from '../../types';

export default defineComponent({
	name: 'N8nMenu',
	components: {
		ElMenu,
		N8nMenuItem,
	},
	props: {
		type: {
			type: String,
			default: 'primary',
			validator: (value: string): boolean => ['primary', 'secondary'].includes(value),
		},
		defaultActive: {
			type: String,
		},
		collapsed: {
			type: Boolean,
			default: false,
		},
		transparentBackground: {
			type: Boolean,
			default: false,
		},
		mode: {
			type: String,
			default: 'router',
			validator: (value: string): boolean => ['router', 'tabs'].includes(value),
		},
		tooltipDelay: {
			type: Number,
			default: 300,
		},
		items: {
			type: Array as PropType<IMenuItem[]>,
			default: (): IMenuItem[] => [],
		},
		modelValue: {
			type: [String, Boolean],
			default: '',
		},
	},
	data() {
		return {
			activeTab: this.value,
		};
	},
	computed: {
		upperMenuItems(): IMenuItem[] {
			return this.items.filter(
				(item: IMenuItem) => item.position === 'top' && item.available !== false,
			);
		},
		lowerMenuItems(): IMenuItem[] {
			return this.items.filter(
				(item: IMenuItem) => item.position === 'bottom' && item.available !== false,
			);
		},
		currentRoute(): RouteObject {
			return (
				(this as typeof this & { $route: RouteObject }).$route || {
					name: '',
					path: '',
				}
			);
		},
	},
	mounted() {
		if (this.mode === 'router') {
			const found = this.items.find((item) => {
				return (
					(Array.isArray(item.activateOnRouteNames) &&
						item.activateOnRouteNames.includes(this.currentRoute.name || '')) ||
					(Array.isArray(item.activateOnRoutePaths) &&
						item.activateOnRoutePaths.includes(this.currentRoute.path))
				);
			});
			this.activeTab = found ? found.id : '';
		} else {
			this.activeTab = this.items.length > 0 ? this.items[0].id : '';
		}

		this.$emit('update:modelValue', this.activeTab);
	},
	methods: {
		onSelect(item: IMenuItem): void {
			if (item && item.type === 'link' && item.properties) {
				const href: string = item.properties.href;
				if (!href) {
					return;
				}

				if (item.properties.newWindow) {
					window.open(href);
				} else {
					window.location.assign(item.properties.href);
				}
			}

			if (this.mode === 'tabs') {
				this.activeTab = item.id;
			}

			this.$emit('select', item.id);
			this.$emit('update:modelValue', item.id);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--menu-background, var(--color-background-xlight));
}

.menuContent {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex-grow: 1;

	& > div > :global(.el-menu) {
		background: none;
		padding: var(--menu-padding, 12px);
	}
}

.upperContent {
	ul {
		padding-top: 0 !important;
	}
}

.lowerContent {
	ul {
		padding-bottom: 0 !important;
	}
}

.menuCollapsed {
	transition: width 150ms ease-in-out;
	:global(.hideme) {
		display: none !important;
	}
}

.transparentBackground {
	background-color: transparent;
}
</style>
