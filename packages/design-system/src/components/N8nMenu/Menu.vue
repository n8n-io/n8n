<template functional>
	<component
		:is="$options.components.ElMenu"
		:defaultActive="props.defaultActive"
		:collapse="props.collapse"
		:class="$style[props.type + (props.light ? '-light' : '')]"
		@select="listeners.select"
	>
		<slot></slot>
	</component>
</template>

<script lang="ts">
import ElMenu from 'element-ui/lib/menu';

export default {
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
	},
	components: {
		ElMenu,
	},
};
</script>

<style lang="scss" module>
.menu {
	max-width: 200px;
}

.primary {
	composes: menu;
}

.secondary {
	composes: menu;
	--menu-font-color: var(--color-text-base);
	--menu-item-font-color: var(--font-weight-regular);
	--menu-background-color: transparent;
	--menu-item-hover-font-color: var(--color-primary);
	--menu-item-active-font-color: var(--color-text-dark);
	--menu-item-active-background-color: var(--color-foreground-base);
	--menu-item-border-radius: 4px;
	--menu-item-height: 38px;
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
