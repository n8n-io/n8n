<template>
	<div @keydown.stop class="duplicate-parameter">

		<div class="parameter-name">
			{{parameter.displayName}}:
			<n8n-tooltip v-if="parameter.description" class="parameter-info" placement="top" >
				<div slot="content" v-html="parameter.description"></div>
				<font-awesome-icon icon="question-circle" />
			</n8n-tooltip>
		</div>

		<div v-for="(value, index) in values" :key="index" class="duplicate-parameter-item" :class="parameter.type">
			<div class="delete-item clickable" v-if="!isReadOnly">
				<font-awesome-icon icon="trash" title="Delete Item" @click="deleteItem(index)" />
				<div v-if="sortable">
					<font-awesome-icon v-if="index !== 0" icon="angle-up" class="clickable" title="Move up" @click="moveOptionUp(index)" />
					<font-awesome-icon v-if="index !== (values.length -1)" icon="angle-down" class="clickable" title="Move down" @click="moveOptionDown(index)" />
				</div>
			</div>
			<div v-if="parameter.type === 'collection'">
				<collection-parameter :parameter="parameter" :values="value" :nodeValues="nodeValues" :path="getPath(index)" :hideDelete="hideDelete" @valueChanged="valueChanged" />
			</div>
			<div v-else>
				<parameter-input class="duplicate-parameter-input-item" :parameter="parameter" :value="value" :displayOptions="true" :path="getPath(index)" @valueChanged="valueChanged" inputSize="small" />
			</div>
		</div>

		<div class="add-item-wrapper">
			<div v-if="values && Object.keys(values).length === 0 || isReadOnly" class="no-items-exist">
				Currently no items exist
			</div>
			<n8n-button v-if="!isReadOnly" fullWidth @click="addItem()" :label="addButtonText" />
		</div>

	</div>
</template>

<script lang="ts">
import {
	IUpdateInformation,
} from '@/Interface';

import CollectionParameter from '@/components/CollectionParameter.vue';
import ParameterInput from '@/components/ParameterInput.vue';

import { get } from 'lodash';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';
import { addTargetBlank } from './helpers';

export default mixins(genericHelpers)
	.extend({
		name: 'MultipleParameter',
		components: {
			CollectionParameter,
			ParameterInput,
		},
		props: [
			'nodeValues', // NodeParameters
			'parameter', // NodeProperties
			'path', // string
			'values', // NodeParameters[]
		],
		computed: {
			addButtonText (): string {
				return (this.parameter.typeOptions && this.parameter.typeOptions.multipleValueButtonText) ? this.parameter.typeOptions.multipleValueButtonText : 'Add item';
			},
			hideDelete (): boolean {
				return this.parameter.options.length === 1;
			},
			sortable (): string {
				return this.parameter.typeOptions && this.parameter.typeOptions.sortable;
			},
		},
		methods: {
			addItem () {
				const name = this.getPath();
				let currentValue = get(this.nodeValues, name);

				if (currentValue === undefined) {
					currentValue = [];
				}

				currentValue.push(JSON.parse(JSON.stringify(this.parameter.default)));

				const parameterData = {
					name,
					value: currentValue,
				};

				this.$emit('valueChanged', parameterData);
			},
			addTargetBlank,
			deleteItem (index: number) {
				const parameterData = {
					name: this.getPath(index),
					value: undefined,
				};

				this.$emit('valueChanged', parameterData);
			},
			getPath (index?: number): string {
				return this.path + (index !== undefined ? `[${index}]` : '');
			},
			moveOptionDown (index: number) {
				this.values.splice(index + 1, 0, this.values.splice(index, 1)[0]);

				const parameterData = {
					name: this.path,
					value: this.values,
				};

				this.$emit('valueChanged', parameterData);
			},
			moveOptionUp (index: number) {
				this.values.splice(index - 1, 0, this.values.splice(index, 1)[0]);

				const parameterData = {
					name: this.path,
					value: this.values,
				};

				this.$emit('valueChanged', parameterData);
			},
			valueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
		},
	});
</script>

<style scoped lang="scss">

.duplicate-parameter-item ~.add-item-wrapper {
	margin: 1.5em 0 0em 0em;
}

.add-item-wrapper {
	margin: 0.5em 0 0em 2em;
}

.delete-item {
	display: none;
	position: absolute;
	left: 0.1em;
	top: .3em;
	z-index: 999;
	color: #f56c6c;
	width: 15px;

	:hover {
		color: #ff0000;
	}
}

.duplicate-parameter {
	margin-top: 0.5em;
	.parameter-name {
		border-bottom: 1px solid #999;
	}
}

::v-deep .duplicate-parameter-item {
	position: relative;
	margin-top: 0.5em;
	padding-top: 0.5em;

	.multi > .delete-item{
		top: 0.1em;
	}
}

::v-deep .duplicate-parameter-input-item {
	margin: 0.5em 0 0.25em 2em;
}

::v-deep .duplicate-parameter-item + .duplicate-parameter-item {
	.collection-parameter-wrapper {
		border-top: 1px dashed #999;
		padding-top: 0.5em;
	}
}

.no-items-exist {
	margin: 0 0 1em 0;
}
</style>

<style>
.duplicate-parameter-item:hover > .delete-item {
	display: inline;
}

.duplicate-parameter-item .multi > .delete-item{
	top: 0.1em;
}
</style>
