<template functional>
	<component
		:is="$options.components.N8nIcon"
		icon="spinner"
		:size="props.size"
		spin
	/>
</template>

<script lang="ts">
import N8nIcon from '../N8nIcon';

export default {
	name: 'n8n-spinner',
	components: {
		N8nIcon,
	},
	props: {
		size: {
			type: String,
			validator: function (value: string): boolean {
				return ['small', 'medium', 'large'].includes(value);
			},
		},
	},
};
</script>
