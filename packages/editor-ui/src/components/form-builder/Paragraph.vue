<template>
	<n8n-text tag="p">{{ content }}</n8n-text>
</template>

<script lang="ts">
import { ParagraphSettings } from './settings';

export default {
	props: {
		content: {
			type: String,
			default: '',
		},
	},
	craft: {
		defaultProps: {
			content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
		},
		settings: {
			ParagraphSettings,
		},
	},
};
</script>
