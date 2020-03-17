<template>
	<div class="parameter-input-list-wrapper el-row">
		<el-col :span="24" :sm="size('sm')" :xs="size('xs')" :md="size('md')" :lg="size('lg')" :xl="size('xl')">
			<el-col v-for="(parameter, index) in filteredParameters" :key="parameter.name">
				<div v-if="index <= filteredParameters.length/2">
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
						<div>
							<collection-parameter
									v-if="parameter.type === 'collection'"
									:hideDelete="hideDelete"
									:parameter="parameter"
									:values="getParameterValue(nodeValues, parameter.name, path)"
									:nodeValues="nodeValues"
									:path="getPath(parameter.name)"
									@valueChanged="valueChanged"
									@deleteOption="deleteOption"
							/>
							<fixed-collection-parameter
									v-else-if="parameter.type === 'fixedCollection'"
									:hideDelete="hideDelete"
									:parameter="parameter"
									:values="getParameterValue(nodeValues, parameter.name, path)"
									:nodeValues="nodeValues"
									:path="getPath(parameter.name)"
									@valueChanged="valueChanged"
									@deleteOption="deleteOption"
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
			</el-col>
		</el-col>
		<el-col :span="24" :sm="size('sm')" :xs="size('xs')" :md="size('md')" :lg="size('lg')" :xl="size('xl')">
			<el-col v-for="(parameter, index) in filteredParameters" :key="parameter.name">
				<div v-if="index > filteredParameters.length/2">
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
						<div>
							<collection-parameter
									v-if="parameter.type === 'collection'"
									:hideDelete="hideDelete"
									:parameter="parameter"
									:values="getParameterValue(nodeValues, parameter.name, path)"
									:nodeValues="nodeValues"
									:path="getPath(parameter.name)"
									@valueChanged="valueChanged"
									@deleteOption="deleteOption"
							/>
							<fixed-collection-parameter
									v-else-if="parameter.type === 'fixedCollection'"
									:hideDelete="hideDelete"
									:parameter="parameter"
									:values="getParameterValue(nodeValues, parameter.name, path)"
									:nodeValues="nodeValues"
									:path="getPath(parameter.name)"
									@valueChanged="valueChanged"
									@deleteOption="deleteOption"
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
			</el-col>
		</el-col>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	INodeProperties,
} from 'n8n-workflow';

import { IUpdateInformation } from '@/Interface';

import MultipleParameter from '@/components/MultipleParameter.vue';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import ParameterInputFull from '@/components/ParameterInputFull.vue';

import { get } from 'lodash';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	nodeHelpers,
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
			'showDelete', // boolean
		],
		computed: {
			filteredParameters (): INodeProperties {
				return this.parameters.filter((parameter: INodeProperties) => this.displayNodeParameter(parameter));
			},
		},
		methods: {
			size (type: string): number {
				const sizes: {[index: string]:number[]} = {
					"xs": [24, 24],
					"sm": [24, 24],
					"md": [12, 24],
					"lg": [12, 24],
					"xl": [12, 24],
				};
				const isSub = this!.$parent!.multipleValues! === true;
				return sizes[type][isSub ? 1 : 0];
			},
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
			deleteInputList (optionName: string) {
				this.$emit('deleteOption', optionName);
			},
			displayNodeParameter (parameter: INodeProperties): boolean {
				if (parameter.displayOptions === undefined) {
					// If it is not defined no need to do a proper check
					return true;
				}
				return this.displayParameter(this.nodeValues, parameter, this.path);
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
