<template>
	<div
		:class="{
			['menu-container']: true,
			[$style.container]: true,
			[$style.menuCollapsed]: collapsed,
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
				<el-menu :defaultActive="defaultActive" :collapse="collapsed" v-on="$listeners">
					<n8n-menu-item
						v-for="item in upperMenuItems"
						:key="item.id"
						:item="item"
						:compact="collapsed"
						:tooltipDelay="tooltipDelay"
						:mode="mode"
						:activeTab="activeTab"
						@click="onSelect"
					/>
				</el-menu>
			</div>
			<div :class="[$style.lowerContent, 'pb-2xs']">
				<el-menu :defaultActive="defaultActive" :collapse="collapsed" v-on="$listeners">
					<n8n-menu-item
						v-for="item in lowerMenuItems"
						:key="item.id"
						:item="item"
						:compact="collapsed"
						:tooltipDelay="tooltipDelay"
						:mode="mode"
						:activeTab="activeTab"
						@click="onSelect"
					/>
				</el-menu>
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
import { Menu as ElMenu } from 'element-ui';
import N8nMenuItem from '../N8nMenuItem';
import { defineComponent, PropType } from 'vue';
import type { IMenuItem, RouteObject } from '../../types';

export default defineComponent({
	name: 'n8n-menu',
	components: {
		ElMenu,
		N8nMenuItem,
	},
	data() {
		return {
			activeTab: this.value,
		};
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
		value: {
			type: String,
			default: '',
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

		this.$emit('input', this.activeTab);
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
	methods: {
		onSelect(event: MouseEvent, option: string): void {
			if (this.mode === 'tabs') {
				this.activeTab = option;
			}
			this.$emit('select', option);
			this.$emit('input', this.activeTab);
		},
	},
	watch: {
		value(value: string) {
			this.activeTab = value;
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

.menuPrefix,
.menuSuffix {
	padding: var(--spacing-xs) var(--spacing-l);
}
</style>
