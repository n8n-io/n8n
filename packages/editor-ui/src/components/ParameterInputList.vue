<template>
	<div class="paramter-input-list-wrapper">
		<div v-for="parameter in filteredParameters" :key="parameter.name">
			<div
				v-if="multipleValues(parameter) === true && parameter.type !== 'fixedCollection'"
				class="parameter-item"
			>
				<multiple-parameter
					:parameter="parameter"
					:values="getParameterValue(nodeValues, parameter.name, path)"
					:nodeValues="nodeValues"
					:path="getPath(parameter.name)"
					@valueChanged="valueChanged"
				/>
			</div>

			<div
				v-else-if="['collection', 'fixedCollection'].includes(parameter.type)"
				class="multi-parameter"
			>
				<div class="parameter-name" :title="parameter.displayName">
					<div class="delete-option clickable" title="Delete" v-if="hideDelete !== true && !isReadOnly">
						<font-awesome-icon
							icon="trash"
							class="reset-icon clickable"
							title="Parameter Options"
							@click="deleteOption(parameter.name)"
						/>
					</div>
					{{parameter.displayName}}:
					<el-tooltip placement="top" class="parameter-info" v-if="parameter.description" effect="light">
						<div slot="content" v-html="parameter.description"></div>
						<font-awesome-icon icon="question-circle"/>
					</el-tooltip>
				</div>
				<div>
					<collection-parameter
						v-if="parameter.type === 'collection'"
						:parameter="parameter"
						:values="getParameterValue(nodeValues, parameter.name, path)"
						:nodeValues="nodeValues"
						:path="getPath(parameter.name)"
						@valueChanged="valueChanged"
					/>
					<fixed-collection-parameter
						v-else-if="parameter.type === 'fixedCollection'"
						:parameter="parameter"
						:values="getParameterValue(nodeValues, parameter.name, path)"
						:nodeValues="nodeValues"
						:path="getPath(parameter.name)"
						@valueChanged="valueChanged"
					/>
				</div>
			</div>

			<div v-else-if="displayNodeParameter(parameter)" class="parameter-item">
				<div class="delete-option clickable" title="Delete" v-if="hideDelete !== true && !isReadOnly">
					<font-awesome-icon
						icon="trash"
						class="reset-icon clickable"
						title="Delete Parameter"
						@click="deleteOption(parameter.name)"
					/>
				</div>

				<parameter-input-full
					:parameter="parameter"
					:value="getParameterValue(nodeValues, parameter.name, path)"
					:displayOptions="true"
					:path="getPath(parameter.name)"
					@valueChanged="valueChanged"
				/>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import {
	INodeParameters,
	INodeProperties,
} from 'n8n-workflow';

import { IUpdateInformation } from '@/Interface';

import MultipleParameter from '@/components/MultipleParameter.vue';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';
import ParameterInputFull from '@/components/ParameterInputFull.vue';

import { get } from 'lodash';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	workflowHelpers,
)
	.extend({
		name: 'ParameterInputList',
		components: {
			MultipleParameter,
			ParameterInputFull,
		},
		props: [
			'nodeValues', // INodeParameters
			'parameters', // INodeProperties
			'path', // string
			'hideDelete', // boolean
		],
		computed: {
			filteredParameters (): INodeProperties {
				return this.parameters.filter((parameter: INodeProperties) => this.displayNodeParameter(parameter));
			},
		},
		methods: {
			multipleValues (parameter: INodeProperties): boolean {
				if (this.getArgument('multipleValues', parameter) === true) {
					return true;
				}
				return false;
			},
			getArgument (
				argumentName: string,
				parameter: INodeProperties,
			): string | string[] | number | boolean | undefined{
				if (parameter.typeOptions === undefined) {
					return undefined;
				}

				if (parameter.typeOptions[argumentName] === undefined) {
					return undefined;
				}

				return parameter.typeOptions[argumentName];
			},
			getPath (parameterName: string): string {
				return (this.path ? `${this.path}.` : '') + parameterName;
			},
			deleteOption (optionName: string): void {
				const parameterData = {
					name: this.getPath(optionName),
					value: undefined,
				};

				// TODO: If there is only one option it should delete the whole one

				this.$emit('valueChanged', parameterData);
			},
			displayNodeParameter (parameter: INodeProperties): boolean {
				if (parameter.type === 'hidden') {
					return false;
				}

				if (parameter.displayOptions === undefined) {
					// If it is not defined no need to do a proper check
					return true;
				}

				const nodeValues: INodeParameters = {};
				let rawValues = this.nodeValues;
				if (this.path) {
					rawValues = get(this.nodeValues, this.path);
				}

				// Resolve expressions
				const resolveKeys = Object.keys(rawValues);
				let key: string;
				let i = 0;
				do {
					key = resolveKeys.shift() as string;
					if (typeof rawValues[key] === 'string' && rawValues[key].charAt(0) === '=') {
						// Contains an expression that
						if (rawValues[key].includes('$parameter') && resolveKeys.some(parameterName => rawValues[key].includes(parameterName))) {
							// Contains probably an expression of a missing parameter so skip
							resolveKeys.push(key);
							continue;
						} else {
							// Contains probably no expression with a missing parameter so resolve
							nodeValues[key] = this.resolveExpression(rawValues[key], nodeValues);
						}
					} else {
						// Does not contain an expression, add directly
						nodeValues[key] = rawValues[key];
					}
					// TODO: Think about how to calculate this best
					if (i++ > 50) {
						// Make sure we do not get caught
						break;
					}
				} while(resolveKeys.length !== 0);

				return this.displayParameter(nodeValues, parameter, '');
			},
			valueChanged (parameterData: IUpdateInformation): void {
				this.$emit('valueChanged', parameterData);
			},
		},
		beforeCreate: function () { // tslint:disable-line
		// Because we have a circular dependency on CollectionParameter import it here
		// to not break Vue.
		this.$options!.components!.FixedCollectionParameter = require('./FixedCollectionParameter.vue').default;
		this.$options!.components!.CollectionParameter = require('./CollectionParameter.vue').default;
		},
	});
</script>

<style lang="scss">
.paramter-input-list-wrapper {
	.delete-option {
		display: none;
		position: absolute;
		z-index: 999;
		color: #f56c6c;

		&:hover {
			color: #ff0000;
		}
	}

	.multi-parameter {
		position: relative;
		margin: 0.5em 0;
		padding: 0.5em 0;

		>.parameter-name {
			font-weight: 600;
			border-bottom: 1px solid #999;

			&:hover {
				.parameter-info {
					display: inline;
				}
			}

			.delete-option {
				top: 0;
				left: -0.9em;
			}

			.parameter-info {
				display: none;
			}

		}
	}

	.parameter-item {
		position: relative;

		>.delete-option {
			left: -0.9em;
			top: 0.6em;
		}
	}
	.parameter-item:hover > .delete-option,
	.parameter-name:hover > .delete-option {
		display: block;
	}
}

</style>
