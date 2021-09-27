<template functional>
	<component
		:is="$options.components.Avatar"
		:size="$options.methods.getSize(props.size)"
		:name="props.firstName + ' ' + props.lastName"
		variant="marble"
		:colors="['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51']"
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
		getSize(size: string): number {
			return sizes[size];
		},
	},
};
</script>

<style lang="scss" module>
</style>
