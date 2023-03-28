<template>
	<n8n-button :type="color">{{ content }}</n8n-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { FormSubmitSettings } from './settings';

export default defineComponent({
	props: {
		content: {
			type: String,
			default: '',
		},
		color: {
			type: String,
			default: 'primary',
		},
	},
	craft: {
		defaultProps: {
			content: 'Submit',
			color: 'primary',
		},
		settings: {
			FormSubmitSettings,
		},
	},
	setup(props) {
		function onClick() {}

		return {
			onClick,
		};
	},
});
</script>
