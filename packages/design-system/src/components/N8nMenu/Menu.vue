<template>
	<div :class="{
		['menu-container']: true,
		[$style.container]: true,
		[$style.menuCollapsed]: collapsed
	}">
		<div v-if="$slots.header" :class="$style.menuHeader">
			<slot name="header"></slot>
		</div>
		<div :class="$style.menuContent">
			<div :class="{[$style.upperContent]: true, ['pt-xs']: $slots.menuPrefix === undefined  }">
				<div v-if="$slots.menuPrefix" :class="$style.menuPrefix">
					<slot name="menuPrefix"></slot>
				</div>
				<el-menu
					:defaultActive="defaultActive"
					:collapse="collapsed"
					v-on="$listeners"
				>
					<n8n-menu-item
						v-for="item in upperMenuItems"
						:key="item.id"
						:item="item"
						:compact="collapsed"
						:popperClass="$style.submenuPopper"
						:tooltipDelay="tooltipDelay"
						:mode="mode"
						:activeTab="activeTab"
						@click="onSelect"
					/>
				</el-menu>
			</div>
			<div :class="{[$style.lowerContent]: true, ['pb-xs']: $slots.menuSuffix === undefined}">
				<el-menu
					:defaultActive="defaultActive"
					:collapse="collapsed"
					v-on="$listeners"
				>
					<n8n-menu-item
						v-for="item in lowerMenuItems"
						:key="item.id"
						:item="item"
						:compact="collapsed"
						:popperClass="$style.submenuPopper"
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
import ElMenu from 'element-ui/lib/menu';
import N8nMenuItem from '../N8nMenuItem';

import Vue, { PropType } from 'vue';
import { IMenuItem } from '../../types';

export default Vue.extend({
	name: 'n8n-menu',
	components: {
		ElMenu, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
		N8nMenuItem,
	},
	data() {
		return {
			activeTab: '',
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
		},
	},
	mounted() {
		if (this.mode === 'router') {
			this.activeTab = this.items.find(
				// @ts-ignore
				item => item.activateOnRouteNames !== undefined && (item.activateOnRouteNames ).includes(this.$route.name))?.id || '';
			if (this.activeTab === '') {
				this.activeTab = this.items.find(
					// @ts-ignore
					item => item.activateOnRoutePaths !== undefined && (item.activateOnRoutePaths).includes(this.$route.path))?.id || '';
			}
		} else {
			this.activeTab =  this.items.length > 0 ? this.items[0].id : '';
		}
	},
	computed: {
		upperMenuItems(): IMenuItem[] {
			return this.items.filter((item: IMenuItem) => item.position === 'top' && item.available !== false);
		},
		lowerMenuItems(): IMenuItem[] {
			return this.items.filter((item: IMenuItem) => item.position === 'bottom' && item.available !== false);
		},
	},
	methods: {
		onSelect(event: MouseEvent, option: string): void {
			if (this.mode === 'tabs') {
				this.activeTab = option;
			}
			this.$emit('select', option);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	display: flex;
	flex-direction: column;
	background-color: var(--color-background-xlight);
}

.menuContent {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex-grow: 1;

	& > div > :global(.el-menu) {
		background: none;
		padding: 12px;
	}
}

.upperContent {
	ul {
		padding-top: 0 !important;
	}
	.submenuPopper {
		bottom: auto !important;
		top: 0 !important;
	}
}

.lowerContent {
	ul {
		padding-bottom: 0 !important;
	}
}

.menuCollapsed {
	transition: width 150ms ease-in-out;
}

.menuPrefix, .menuSuffix {
	padding: var(--spacing-xs) var(--spacing-l);
}

</style>
