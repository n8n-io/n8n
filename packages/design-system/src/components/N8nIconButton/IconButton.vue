<template functional>
	<component :is="$options.components.N8nButton"
		:type="props.type"
		:disabled="props.disabled"
		:size="props.size"
		:loading="props.loading"
		:title="props.title"
		:icon="props.icon"
		:theme="props.theme"
		@click="(e) => listeners.click && listeners.click(e)"
		circle
	/>
</template>

<script lang="ts">
import N8nButton from '../N8nButton';

export default {
	name: 'n8n-icon-button',
	components: {
		N8nButton,
	},
	props: {
		type: {
			type: String,
		},
		title: {
			type: String,
		},
		size: {
			type: String,
			default: 'medium',
		},
		loading: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		icon: {
			type: String,
			required: true,
		},
		theme: {
			type: String,
		},
	},
};
</script>
