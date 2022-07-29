<template>
	<el-menu
		:defaultActive="defaultActive"
		:collapse="collapse"
		:router="router"
		:class="['n8n-menu', $style[type + (light ? '-light' : '')]]"
		v-on="$listeners"
	>
		<slot></slot>
	</el-menu>
</template>

<script lang="ts">
import ElMenu from 'element-ui/lib/menu';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-menu',
	props: {
		type: {
			type: String,
			default: 'primary',
			validator: (value: string): boolean => ['primary', 'secondary'].includes(value),
		},
		defaultActive: {
			type: String,
		},
		collapse: {
			type: Boolean,
		},
		light: {
			type: Boolean,
		},
		router: {
			type: Boolean,
		},
	},
	components: {
		ElMenu,
	},
});
</script>

<style lang="scss" module>
.menu {
	max-width: 200px;
}

.primary {
	composes: menu;
	--menu-item-hover-font-color: var(--color-primary);
}

.secondary {
	composes: menu;
	--menu-font-color: var(--color-text-base);
	--menu-item-font-weight: var(--font-weight-regular);
	--menu-background-color: transparent;
	--menu-item-active-font-color: var(--color-text-dark);
	--menu-item-active-background-color: var(--color-foreground-base);
	--menu-item-hover-font-color: var(--color-primary);
	--menu-item-border-radius: 4px;
	--menu-item-height: 38px;

	li {
		padding-left: 12px !important;
	}
}

.secondary-light {
	composes: secondary;
	--menu-item-active-background-color: hsl(
		var(--color-foreground-base-h),
		var(--color-foreground-base-s),
		var(--color-foreground-base-l),
		0.7
	);
}
</style>
