<template functional>
	<span :class="$style.container">
		<component
			v-if="props.name"
			:is="$options.components.Avatar"
			:size="$options.methods.getSize(props.size)"
			:name="props.name"
			variant="marble"
			:colors="$options.methods.getColors(props.colors)"
		/>
		<div
			v-else
			:class="$style.empty"
			:style="$options.methods.getBlankStyles(props.size)">
		</div>
	</span>
</template>

<script lang="ts">
import Avatar from 'vue2-boring-avatars';

const sizes: {[size: string]: number} = {
	small: 28,
	large: 48,
	medium: 40,
};

export default {
	name: 'n8n-avatar',
	props: {
		name: {
			type: String,
		},
		size: {
			type: String,
			default: 'medium',
		},
		colors: {
			default: () => (['--color-primary', '--color-secondary', '--color-avatar-accent-1', '--color-avatar-accent-2', '--color-primary-tint-1']),
		},
	},
	components: {
		Avatar,
	},
	methods: {
		getBlankStyles(size): {height: string, width: string} {
			const px = sizes[size];
			return { height: `${px}px`, width: `${px}px` };
		},
		getColors(colors): string[] {
			const style = getComputedStyle(document.body);
			return colors.map((color: string) => style.getPropertyValue(color));
		},
		getSize(size: string): number {
			return sizes[size];
		},
	},
};
</script>

<style lang="scss" module>
.container {
	display: inline-flex;
}

.empty {
	border-radius: 50%;
	background-color: var(--color-foreground-dark);
}
</style>
