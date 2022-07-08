<template>
	<el-checkbox
		v-model="state"
		v-bind="$props"
		v-on="$listeners"
		:disabled="disabled"
	>
		<n8n-input-label
			:label="label"
			:tooltipText="tooltipText"
		></n8n-input-label>
	</el-checkbox>
</template>

<script lang="ts">
import Vue from 'vue';
import ElCheckbox from 'element-ui/lib/checkbox';
import N8nInputLabel from '../N8nInputLabel';

export default Vue.extend({
	name: 'n8n-checkbox',
	components: {
		ElCheckbox,
		N8nInputLabel,
	},
	props: {
		checked: {
			type: Boolean,
			default: false,
		},
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
	},
	data() {
		return {
			state: false,
		}
	},
	mounted() {
        this.state = this.checked;
    }
});
</script>

<style lang="scss" module>
.infoText {
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-regular);
	color: var(--color-text-base);
}
</style>
