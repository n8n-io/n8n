<template>
	<el-checkbox
		v-bind="$props"
		ref="checkbox"
		:class="['n8n-checkbox', $style.n8nCheckbox]"
		:disabled="disabled"
		:indeterminate="indeterminate"
		:value="value"
		@change="onChange"
	>
		<n8n-input-label
			:label="label"
			:tooltipText="tooltipText"
			:bold="false"
			:size="labelSize"
			@click.prevent="onLabelClick"
		/>
	</el-checkbox>
</template>

<script lang="ts">
import Vue from 'vue';
import { Checkbox as ElCheckbox } from 'element-ui';
import N8nInputLabel from '../N8nInputLabel';

export default Vue.extend({
	name: 'n8n-checkbox',
	components: {
		ElCheckbox,
		N8nInputLabel,
	},
	props: {
		label: {
			type: String,
			required: true,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		tooltipText: {
			type: String,
			required: false,
		},
		indeterminate: {
			type: Boolean,
			default: false,
		},
		value: {
			type: Boolean,
			default: false,
		},
		labelSize: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean => ['small', 'medium'].includes(value),
		},
	},
	methods: {
		onChange(event: Event) {
			this.$emit('input', event);
		},
		onLabelClick() {
			const checkboxComponent = this.$refs.checkbox as ElCheckbox;
			if (!checkboxComponent) {
				return;
			}

			(checkboxComponent.$el as HTMLElement).click();
		},
	},
});
</script>

<style lang="scss" module>
.n8nCheckbox {
	display: flex !important;
	white-space: normal !important;

	span {
		white-space: normal;
	}

	label {
		cursor: pointer;
	}
}
</style>
