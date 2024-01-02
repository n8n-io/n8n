<template>
	<N8nButton square v-bind="{ ...$attrs, ...$props }" />
</template>

<script lang="ts">
import N8nButton from '../N8nButton';

import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nIconButton',
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
