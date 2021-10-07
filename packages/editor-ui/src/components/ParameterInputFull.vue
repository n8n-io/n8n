<template>
	<el-row class="parameter-wrapper">
		<el-col class="parameter-name">
			<span class="title" :title="parameter.displayName">{{parameter.displayName}}</span>:
			<n8n-tooltip class="parameter-info" placement="top" v-if="parameter.description" >
				<div slot="content" v-html="addTargetBlank(parameter.description)"></div>
				<font-awesome-icon icon="question-circle" />
			</n8n-tooltip>
		</el-col>
		<el-col class="parameter-value">
			<parameter-input :parameter="parameter" :value="value" :displayOptions="displayOptions" :path="path" :isReadOnly="isReadOnly" @valueChanged="valueChanged" inputSize="small" />
		</el-col>
	</el-row>
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

<style lang="scss">

.parameter-wrapper {
	display: flex;
	align-items: center;
	flex-direction: column;

	.option {
		margin: 1em;
	}

	.parameter-info {
		background-color: #ffffffaa;
		display: none;
		position: absolute;
		right: 2px;
		top: 1px;
	}

	.parameter-name {
		position: relative;
		line-height: 1.5em;

		&:hover {
			.parameter-info {
				display: inline;
			}
		}
	}

	.title {
		font-weight: 400;
	}
}

</style>
