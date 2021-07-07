<template>
	<div @keydown.stop class="fixed-collection-parameter">
		<div v-if="getProperties.length === 0" class="no-items-exist">
			Currently no items exist
		</div>

		<div v-for="property in getProperties" :key="property.name" class="fixed-collection-parameter-property">
			<div class="parameter-name" :title="property.displayName">{{property.displayName}}:</div>

			<div v-if="multipleValues === true">
				<div v-for="(value, index) in values[property.name]" :key="property.name + index" class="parameter-item">
					<div class="parameter-item-wrapper">
						<div class="delete-option" v-if="!isReadOnly">
							<font-awesome-icon icon="trash" class="reset-icon clickable" title="Delete Item" @click="deleteOption(property.name, index)" />
							<div v-if="sortable">
								<font-awesome-icon v-if="index !== 0" icon="angle-up" class="clickable" title="Move up" @click="moveOptionUp(property.name, index)" />
								<font-awesome-icon v-if="index !== (values[property.name].length -1)" icon="angle-down" class="clickable" title="Move down" @click="moveOptionDown(property.name, index)" />
							</div>
						</div>
						<parameter-input-list :parameters="property.values" :nodeValues="nodeValues" :path="getPropertyPath(property.name, index)" :hideDelete="true" @valueChanged="valueChanged" />
					</div>
				</div>
			</div>
			<div v-else class="parameter-item">
				<div class="parameter-item-wrapper">
					<div class="delete-option" v-if="!isReadOnly">
						<font-awesome-icon icon="trash" class="reset-icon clickable" title="Delete Item" @click="deleteOption(property.name)" />
					</div>
					<parameter-input-list :parameters="property.values" :nodeValues="nodeValues" :path="getPropertyPath(property.name)" class="parameter-item" @valueChanged="valueChanged" :hideDelete="true" />
				</div>
			</div>
		</div>

		<div v-if="parameterOptions.length > 0 && !isReadOnly">
			<el-button v-if="parameter.options.length === 1" size="small" class="add-option" @click="optionSelected(parameter.options[0].name)">{{ getPlaceholderText }}</el-button>
			<el-select v-else v-model="selectedOption" :placeholder="getPlaceholderText" size="small" class="add-option" @change="optionSelected" filterable>
				<el-option
					v-for="item in parameterOptions"
					:key="item.name"
					:label="item.displayName"
					:value="item.name">
				</el-option>
			</el-select>
		</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	IUpdateInformation,
} from '@/Interface';

import {
	INodeParameters,
	INodePropertyCollection,
} from 'n8n-workflow';

import { get } from 'lodash';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers)
	.extend({
		name: 'FixedCollectionParameter',
		props: [
			'nodeValues', // INodeParameters
			'parameter', // INodeProperties
			'path', // string
			'values', // INodeParameters
		],
		data () {
			return {
				selectedOption: undefined,
			};
		},
		computed: {
			getPlaceholderText (): string {
				return this.parameter.placeholder ? this.parameter.placeholder : 'Choose Option To Add';
			},
			getProperties (): INodePropertyCollection[] {
				const returnProperties = [];
				let tempProperties;
				for (const name of this.propertyNames) {
					tempProperties = this.getOptionProperties(name);
					if (tempProperties !== undefined) {
						returnProperties.push(tempProperties);
					}
				}
				return returnProperties;
			},
			multipleValues (): boolean {
				if (this.parameter.typeOptions !== undefined && this.parameter.typeOptions.multipleValues === true) {
					return true;
				}
				return false;
			},

			parameterOptions (): INodePropertyCollection[] {
				if (this.multipleValues === true) {
					return this.parameter.options;
				}

				return (this.parameter.options as INodePropertyCollection[]).filter((option) => {
					return !this.propertyNames.includes(option.name);
				});
			},
			propertyNames (): string[] {
				if (this.values) {
					return Object.keys(this.values);
				}
				return [];
			},
			sortable (): string {
				return this.parameter.typeOptions && this.parameter.typeOptions.sortable;
			},
		},
		methods: {
			deleteOption (optionName: string, index?: number) {
				const parameterData = {
					name: this.getPropertyPath(optionName, index),
					value: undefined,
				};

				this.$emit('valueChanged', parameterData);
			},
			getPropertyPath (name: string, index?: number) {
				return `${this.path}.${name}` + (index !== undefined ? `[${index}]` : '');
			},
			getOptionProperties (optionName: string): INodePropertyCollection | undefined {
				for (const option of this.parameter.options) {
					if (option.name === optionName) {
						return option;
					}
				}

				return undefined;
			},
			moveOptionDown (optionName: string, index: number) {
				this.values[optionName].splice(index + 1, 0, this.values[optionName].splice(index, 1)[0]);

				const parameterData = {
					name: this.getPropertyPath(optionName),
					value: this.values[optionName],
				};

				this.$emit('valueChanged', parameterData);
			},
			moveOptionUp (optionName: string, index: number) {
				this.values[optionName].splice(index - 1, 0, this.values[optionName].splice(index, 1)[0]);

				const parameterData = {
					name: this.getPropertyPath(optionName),
					value: this.values[optionName],
				};

				this.$emit('valueChanged', parameterData);
			},
			optionSelected (optionName: string) {
				const option = this.getOptionProperties(optionName);
				if (option === undefined) {
					return;
				}
				const name = `${this.path}.${option.name}`;

				let parameterData;

				const newParameterValue: INodeParameters = {};

				for (const optionParameter of option.values) {
					if (optionParameter.type === 'fixedCollection' && optionParameter.typeOptions !== undefined && optionParameter.typeOptions.multipleValues === true) {
						newParameterValue[optionParameter.name] = {};
					} else if (optionParameter.typeOptions !== undefined && optionParameter.typeOptions.multipleValues === true) {
						// Multiple values are allowed so append option to array
						newParameterValue[optionParameter.name] = get(this.nodeValues, `${this.path}.${optionParameter.name}`, []);
						if (Array.isArray(optionParameter.default)) {
							(newParameterValue[optionParameter.name] as INodeParameters[]).push(...JSON.parse(JSON.stringify(optionParameter.default)));
						} else if (optionParameter.default !== '' && typeof optionParameter.default !== 'object') {
							(newParameterValue[optionParameter.name] as INodeParameters[]).push(JSON.parse(JSON.stringify(optionParameter.default)));
						}
					} else {
						// Add a new option
						newParameterValue[optionParameter.name] = JSON.parse(JSON.stringify(optionParameter.default));
					}
				}

				let newValue;
				if (this.multipleValues === true) {
					newValue = get(this.nodeValues, name, []);

					newValue.push(newParameterValue);
				} else {
					newValue = newParameterValue;
				}

				parameterData = {
					name,
					value: newValue,
				};

				this.$emit('valueChanged', parameterData);
				this.selectedOption = undefined;
			},
			valueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
		},
		beforeCreate: function () { // tslint:disable-line
			// Because we have a circular dependency on ParameterInputList import it here
			// to not break Vue.
			this.$options!.components!.ParameterInputList = require('./ParameterInputList.vue').default;
		},
	});
</script>

<style scoped lang="scss">

.add-option {
	width: 100%;
}

.fixed-collection-parameter {
	padding: 0 0 0 1em;
}

.fixed-collection-parameter-property {
	margin: 0.5em 0;
	padding: 0.5em 0;

	.parameter-name {
		border-bottom: 1px solid #999;
	}
}

.delete-option {
	display: none;
	position: absolute;
	z-index: 999;
	color: #f56c6c;
	left: 0;
	top: 0;
	width: 15px;
	height: 100%;
}

.parameter-item-wrapper:hover > .delete-option {
	display: block;
}

.parameter-item {
	position: relative;
	padding: 0 0 0 1em;
	margin: 0.6em 0 0.5em 0.1em;

	+ .parameter-item {
		.parameter-item-wrapper {
			padding-top: 0.5em;
			border-top: 1px dashed #999;
		}
	}
}

.no-items-exist {
	margin: 0.8em 0;
}
</style>
