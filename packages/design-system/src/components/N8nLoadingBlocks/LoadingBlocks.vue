<template functional>
	<div>
		<n8n-loading
			v-for="(block, index) in props.blocks"
			:key="index"
			:animated="props.animated"
			:loading="props.loading"
			:rows="props.rows"
			:variant="props.variant"
		/>
  </div>
</template>

<script lang="ts">
import N8nLoading from '../N8nLoading';

export default {
	name: 'n8n-loading-blocks',
	components: {
		N8nLoading,
	},
	props: {
		animated: {
			type: Boolean,
			default: true,
		},
		blocks: {
			type: Number,
			default: 4,
		},
		loading: {
			type: Boolean,
		},
		rows: {
			type: Number,
			default: 1,
		},
		variant: {
			type: String,
			default: 'p',
		},
	},
};
</script>
