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
			const primary = style.getPropertyValue('--color-primary');
			const secondary = style.getPropertyValue('--color-secondary');
			console.log(primary, secondary);

			return [primary, secondary, '#e9c46a', '#f4a261', '#e76f51'];
		},
		getSize(size: string): number {
			return sizes[size];
		},
	},
};
</script>

<style lang="scss" module>
</style>
