<template functional>
	<component
		:is="$options.components.Avatar"
		:size="$options.methods.getSize(props.size)"
		:name="props.firstName + ' ' + props.lastName"
		variant="marble"
		:colors="$options.methods.getColors()"
	/>
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
		firstName: {
			type: String,
			required: true,
		},
		lastName: {
			type: String,
		},
		size: {
			type: String,
			default: 'medium',
		},
	},
	components: {
		Avatar,
	},
	methods: {
		getColors(): string[] {
			const style = getComputedStyle(document.body);
			const colors = ['--color-primary', '--color-secondary', '--color-avatar-accent-1', '--color-avatar-accent-2', '--color-primary-tint-1'];

			return colors.map((color: string) => style.getPropertyValue(color));
		},
		getSize(size: string): number {
			return sizes[size];
		},
	},
};
</script>
