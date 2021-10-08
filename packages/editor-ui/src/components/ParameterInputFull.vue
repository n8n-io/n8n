<template>
	<n8n-input-label
		:label="parameter.displayName"
		:tooltipText="parameter.description"
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
			inputSize="small" />
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	IUpdateInformation,
} from '@/Interface';

import ParameterInput from '@/components/ParameterInput.vue';
import { addTargetBlank } from './helpers';

export default Vue
	.extend({
		name: 'ParameterInputFull',
		components: {
			ParameterInput,
		},
		computed: {
			isMultiLineParameter () {
				if (this.level > 4) {
					return true;
				}
				const rows = this.getArgument('rows');
				if (rows !== undefined && rows > 1) {
					return true;
				}

				return false;
			},
			level (): number {
				return this.path.split('.').length;
			},
		},
		props: [
			'displayOptions',
			'isReadOnly',
			'parameter',
			'path',
			'value',
		],
		methods: {
			addTargetBlank,
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
