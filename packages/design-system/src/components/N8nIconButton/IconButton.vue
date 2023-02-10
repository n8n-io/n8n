<template>
	<n8n-button square v-bind="$props" v-on="$listeners" />
</template>

<script lang="ts">
import N8nButton from '../N8nButton';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-icon-button',
	components: {
		N8nButton,
	},
	props: {
		type: {
			type: String,
			default: 'primary',
		},
		size: {
			type: String,
			default: 'medium',
		},
		loading: {
			type: Boolean,
			default: false,
		},
		outline: {
			type: Boolean,
			default: false,
		},
		text: {
			type: Boolean,
			default: false,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		active: {
			type: Boolean,
			default: false,
		},
		icon: {
			type: [String, Array],
			required: true,
		},
		float: {
			type: String,
			validator: (value: string): boolean => ['left', 'right'].includes(value),
		},
	},
});
</script>
