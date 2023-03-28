<template>
	<n8n-heading :tag="level" :size="size" bold>{{ content }}</n8n-heading>
</template>

<script lang="ts">
import { HeadingSettings } from './settings';
import { computed } from 'vue';

export default {
	props: {
		content: {
			type: String,
			default: '',
		},
		level: {
			type: String,
			default: 'h1',
		},
	},
	craft: {
		defaultProps: {
			content: 'My awesome form',
			level: 'h1',
		},
		settings: {
			HeadingSettings,
		},
	},
	setup(props) {
		const sizeMap = {
			h1: '2xlarge',
			h2: 'xlarge',
			h3: 'large',
			h4: 'medium',
			h5: 'small',
			h6: 'xsmall',
		};
		const size = computed(() => sizeMap[props.level]);

		return { size };
	},
};
</script>
