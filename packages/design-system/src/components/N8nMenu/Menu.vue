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
			<div :class="$style.upperContent">
				<div v-if="$slots.menuPrefix" :class="$style.menuPrefix">
					<slot name="menuPrefix"></slot>
				</div>
				<el-menu
					:defaultActive="defaultActive"
					:collapse="collapsed"
					:router="router"
					v-on="$listeners"
				>
					<n8n-menu-item v-for="item in upperMenuItems" :key="item.id" :item="item" :compact="collapsed"/>
				</el-menu>
			</div>
			<div :class="$style.lowerContent">
				<el-menu
					:defaultActive="defaultActive"
					:collapse="collapsed"
					:router="router"
					v-on="$listeners"
				>
					<n8n-menu-item v-for="item in lowerMenuItems" :key="item.id" :item="item" :compact="collapsed"/>
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
		router: {
			type: Boolean,
		},
		items: {
			type: Array as PropType<IMenuItem[]>,
		},
	},
	computed: {
		upperMenuItems(): IMenuItem[] {
			return this.items.filter((item: IMenuItem) => item.position === 'top');
		},
		lowerMenuItems(): IMenuItem[] {
			return this.items.filter((item: IMenuItem) => item.position === 'bottom');
		},
	},
	methods: {
		onSelect(option: string): void {
			this.$emit('select', option);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	height: 100%;
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	display: flex;
	flex-direction: column;
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

.menuCollapsed {
	width: 65px;
	transition: width 150ms ease-in-out;

	.menuHeader, .menuFooter, .menuPrefix, .menuSuffix {
		display: none; // TODO: Remove this
	}
}

.menuHeader, .menuFooter {
	height: 50px; // TODO: See about this....
	padding: 12px 24px;
	display: flex;
	align-items: center;
	overflow: hidden;
	text-overflow: ellipsis;
}

.menuHeader {
	border-bottom: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);;
}

.menuFooter {
	border-top: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);;
}

.menuPrefix {
	padding: 12px 24px 0;
}

.menuSuffix {
	padding: 0 24px 12px;
}

</style>
