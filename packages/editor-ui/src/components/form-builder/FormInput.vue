<template>
	<div>
		<n8n-input-label v-if="label" :label="label" />
		<n8n-input :type="type" :placeholder="placeholder" v-model="value" />
	</div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { FormInputSettings } from './settings';

export default defineComponent({
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
	setup(props) {
		const value = ref(props.defaultValue);

		return {
			value,
		};
	},
});
</script>
