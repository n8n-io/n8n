<template>
	<n8n-button :type="color" @click="onClick">{{ content }}</n8n-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { FormSubmitSettings } from './settings';
import { useMessage, useToast } from '@/composables';

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
		const toast = useToast();

		function onClick() {
			fetch('http://localhost:5678/webhook-test/form/1', {
				method: 'POST',
				body: JSON.stringify({
					myInput: 'foo',
				}),
				headers: {
					'Content-type': 'application/json; charset=UTF-8',
				},
			})
				.then((response) => response.json())
				.then((json) => {
					toast.showMessage({
						title: 'Form submitted successfully',
						type: 'success',
					});
				});
		}

		return {
			onClick,
		};
	},
});
</script>
