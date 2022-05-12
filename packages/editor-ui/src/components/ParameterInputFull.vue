<template>
	<n8n-input-label
		:label="$locale.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltipText="$locale.nodeText().inputLabelDescription(parameter, path)"
		:showTooltip="focused"
		:bold="false"
		size="small"
	>
		<parameter-input
			:parameter="parameter"
			:value="value"
			:displayOptions="displayOptions"
			:path="path"
			:isReadOnly="isReadOnly"
			@valueChanged="valueChanged"
			@focus="focused = true"
			@blur="focused = false"
			inputSize="small" />
		<input-hint :class="$style.hint" :hint="$locale.nodeText().hint(parameter, path)" />
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	IUpdateInformation,
} from '@/Interface';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';

export default Vue
	.extend({
		name: 'ParameterInputFull',
		components: {
			ParameterInput,
			InputHint,
		},
		data() {
			return {
				focused: false,
			};
		},
		props: [
			'displayOptions',
			'isReadOnly',
			'parameter',
			'path',
			'value',
		],
		methods: {
			getArgument (argumentName: string): string | number | boolean | undefined {
				if (this.parameter.typeOptions === undefined) {
					return undefined;
				}

				if (this.parameter.typeOptions[argumentName] === undefined) {
					return undefined;
				}

				return this.parameter.typeOptions[argumentName];
			},
			valueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
		},
	});
</script>

<style lang="scss" module>
	.hint {
		margin-top: var(--spacing-4xs);
	}
</style>
