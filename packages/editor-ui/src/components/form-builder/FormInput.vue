<template>
	<div>
		<n8n-input-label v-if="label" :label="label" />
		<n8n-input :type="type" :placeholder="placeholder" :value="defaultValue" />
	</div>
</template>

<script lang="ts">
import { FormInputSettings } from './settings';

export default {
	props: {
		label: {
			type: String,
			default: '',
		},
		type: {
			type: String,
			default: 'text',
		},
		placeholder: {
			type: String,
			default: '',
		},
		defaultValue: {
			type: String,
			default: '',
		},
	},
	craft: {
		defaultProps: {
			label: 'My input',
			type: 'text',
			placeholder: 'Enter a value',
			defaultValue: '',
		},
		settings: {
			FormInputSettings,
		},
	},
	setup() {
		return {};
	},
};
</script>
