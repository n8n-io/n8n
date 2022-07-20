<template>
	<div @keydown.stop class="duplicate-parameter">
		<n8n-input-label
			:label="$locale.nodeText().inputLabelDisplayName(parameter, path)"
			:tooltipText="$locale.nodeText().inputLabelDescription(parameter, path)"
			:underline="true"
			size="small"
		/>

		<div v-for="(value, index) in values" :key="index" class="duplicate-parameter-item" :class="parameter.type">
			<div class="delete-item clickable" v-if="!isReadOnly">
				<font-awesome-icon icon="trash" :title="$locale.baseText('multipleParameter.deleteItem')" @click="deleteItem(index)" />
				<div v-if="sortable">
					<font-awesome-icon v-if="index !== 0" icon="angle-up" class="clickable" :title="$locale.baseText('multipleParameter.moveUp')" @click="moveOptionUp(index)" />
					<font-awesome-icon v-if="index !== (values.length -1)" icon="angle-down" class="clickable" :title="$locale.baseText('multipleParameter.moveDown')" @click="moveOptionDown(index)" />
				</div>
			</div>
			<div v-if="parameter.type === 'collection'">
				<collection-parameter :parameter="parameter" :values="value" :nodeValues="nodeValues" :path="getPath(index)" :hideDelete="hideDelete" @valueChanged="valueChanged" />
			</div>
			<div v-else>
				<parameter-input-full class="duplicate-parameter-input-item" :parameter="parameter" :value="value" :displayOptions="true" :hideLabel="true" :path="getPath(index)" @valueChanged="valueChanged" inputSize="small" :isReadOnly="isReadOnly" />
			</div>
		</div>

		<div class="add-item-wrapper">
			<div v-if="values && Object.keys(values).length === 0 || isReadOnly" class="no-items-exist">
				<n8n-text size="small">{{ $locale.baseText('multipleParameter.currentlyNoItemsExist') }}</n8n-text>
			</div>
			<n8n-button v-if="!isReadOnly" type="tertiary" fullWidth @click="addItem()" :label="addButtonText" />
		</div>
	</div>
</template>

<script lang="ts">
import {
	IUpdateInformation,
} from '@/Interface';

import CollectionParameter from '@/components/CollectionParameter.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';

import { get } from 'lodash';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers)
	.extend({
		name: 'MultipleParameter',
		components: {
			CollectionParameter,
			ParameterInputFull,
		},
		props: [
			'nodeValues', // NodeParameters
			'parameter', // NodeProperties
			'path', // string
			'values', // NodeParameters[]
		],
		computed: {
			addButtonText (): string {
				if (
					!this.parameter.typeOptions ||
					(this.parameter.typeOptions && !this.parameter.typeOptions.multipleValueButtonText)
				) {
					return this.$locale.baseText('multipleParameter.addItem');
				}

				return this.$locale.nodeText().multipleValueButtonText(this.parameter);
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
.duplicate-parameter-item {
	~ .add-item-wrapper {
		margin-top: var(--spacing-xs);
	}
}

.delete-item {
	display: none;
	position: absolute;
	left: 0.1em;
	top: .3em;
	z-index: 999;
	color: #f56c6c;
	width: 15px;
	font-size: var(--font-size-2xs);

	:hover {
		color: #ff0000;
	}
}

::v-deep {
	.button {
		--button-background-color: var(--color-background-base);
		--button-border-color: var(--color-foreground-base);
	}

	.duplicate-parameter-item {
		position: relative;

		.multi > .delete-item{
			top: 0.1em;
		}
	}

	.duplicate-parameter-input-item {
		margin: 0.5em 0 0.25em 2em;
	}

	.duplicate-parameter-item + .duplicate-parameter-item {
		.collection-parameter-wrapper {
			border-top: 1px dashed #999;
			margin-top: var(--spacing-xs);
		}
	}
}
.no-items-exist {
	margin: var(--spacing-xs) 0;
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
