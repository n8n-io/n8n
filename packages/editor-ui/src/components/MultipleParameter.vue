<template>
	<div class="duplicate-parameter" @keydown.stop>
		<n8n-input-label
			:label="$locale.nodeText().inputLabelDisplayName(parameter, path)"
			:tooltip-text="$locale.nodeText().inputLabelDescription(parameter, path)"
			:underline="true"
			size="small"
			color="text-dark"
		/>

		<div
			v-for="(value, index) in mutableValues"
			:key="index"
			class="duplicate-parameter-item"
			:class="parameter.type"
		>
			<div v-if="!isReadOnly" class="delete-item clickable">
				<font-awesome-icon
					icon="trash"
					:title="$locale.baseText('multipleParameter.deleteItem')"
					@click="deleteItem(index)"
				/>
				<div v-if="sortable">
					<font-awesome-icon
						v-if="index !== 0"
						icon="angle-up"
						class="clickable"
						:title="$locale.baseText('multipleParameter.moveUp')"
						@click="moveOptionUp(index)"
					/>
					<font-awesome-icon
						v-if="index !== mutableValues.length - 1"
						icon="angle-down"
						class="clickable"
						:title="$locale.baseText('multipleParameter.moveDown')"
						@click="moveOptionDown(index)"
					/>
				</div>
			</div>
			<div v-if="parameter.type === 'collection'">
				<CollectionParameter
					:parameter="parameter"
					:values="value"
					:node-values="nodeValues"
					:path="getPath(index)"
					:hide-delete="hideDelete"
					:is-read-only="isReadOnly"
					@value-changed="valueChanged"
				/>
			</div>
			<div v-else>
				<ParameterInputFull
					class="duplicate-parameter-input-item"
					:parameter="parameter"
					:value="value"
					:display-options="true"
					:hide-label="true"
					:path="getPath(index)"
					input-size="small"
					:is-read-only="isReadOnly"
					@update="valueChanged"
				/>
			</div>
		</div>

		<div class="add-item-wrapper">
			<div
				v-if="(mutableValues && mutableValues.length === 0) || isReadOnly"
				class="no-items-exist"
			>
				<n8n-text size="small">{{
					$locale.baseText('multipleParameter.currentlyNoItemsExist')
				}}</n8n-text>
			</div>
			<n8n-button
				v-if="!isReadOnly"
				type="tertiary"
				block
				:label="addButtonText"
				@click="addItem()"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { IUpdateInformation } from '@/Interface';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import CollectionParameter from '@/components/CollectionParameter.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';

import { get } from 'lodash-es';

export default defineComponent({
	name: 'MultipleParameter',
	components: {
		CollectionParameter,
		ParameterInputFull,
	},
	props: {
		nodeValues: {
			type: Object as PropType<INodeParameters>,
			required: true,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
			required: true,
		},
		path: {
			type: String,
			required: true,
		},
		values: {
			type: Array as PropType<INodeParameters[]>,
			default: () => [],
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			mutableValues: [] as INodeParameters[],
		};
	},
	computed: {
		addButtonText(): string {
			if (
				!this.parameter.typeOptions ||
				(this.parameter.typeOptions && !this.parameter.typeOptions.multipleValueButtonText)
			) {
				return this.$locale.baseText('multipleParameter.addItem');
			}

			return this.$locale.nodeText().multipleValueButtonText(this.parameter);
		},
		hideDelete(): boolean {
			return this.parameter.options?.length === 1;
		},
		sortable(): boolean {
			return !!this.parameter.typeOptions?.sortable;
		},
	},
	watch: {
		values: {
			handler(newValues: INodeParameters[]) {
				this.mutableValues = deepCopy(newValues);
			},
			deep: true,
		},
	},
	created() {
		this.mutableValues = deepCopy(this.values);
	},
	methods: {
		addItem() {
			const name = this.getPath();
			const currentValue = get(this.nodeValues, name, []) as INodeParameters[];

			currentValue.push(deepCopy(this.parameter.default as INodeParameters));

			const parameterData = {
				name,
				value: currentValue,
			};

			this.$emit('valueChanged', parameterData);
		},
		deleteItem(index: number) {
			const parameterData = {
				name: this.getPath(index),
				value: undefined,
			};

			this.$emit('valueChanged', parameterData);
		},
		getPath(index?: number): string {
			return this.path + (index !== undefined ? `[${index}]` : '');
		},
		moveOptionDown(index: number) {
			this.mutableValues.splice(index + 1, 0, this.mutableValues.splice(index, 1)[0]);

			const parameterData = {
				name: this.path,
				value: this.mutableValues,
			};

			this.$emit('valueChanged', parameterData);
		},
		moveOptionUp(index: number) {
			this.mutableValues.splice(index - 1, 0, this.mutableValues.splice(index, 1)[0]);

			const parameterData = {
				name: this.path,
				value: this.mutableValues,
			};

			this.$emit('valueChanged', parameterData);
		},
		valueChanged(parameterData: IUpdateInformation) {
			this.$emit('valueChanged', parameterData);
		},
	},
});
</script>

<style scoped lang="scss">
.duplicate-parameter {
	:deep(.button) {
		--button-background-color: var(--color-background-base);
		--button-border-color: var(--color-foreground-base);
	}

	:deep(.duplicate-parameter-item) {
		position: relative;

		.multi > .delete-item {
			top: 0.1em;
		}
	}

	:deep(.duplicate-parameter-input-item) {
		margin: 0.5em 0 0.25em 2em;
	}

	:deep(.duplicate-parameter-item + .duplicate-parameter-item) {
		.collection-parameter-wrapper {
			border-top: 1px dashed #999;
			margin-top: var(--spacing-xs);
		}
	}
}

.duplicate-parameter-item {
	~ .add-item-wrapper {
		margin-top: var(--spacing-xs);
	}
}

.delete-item {
	display: none;
	position: absolute;
	left: 0.1em;
	top: 0.3em;
	z-index: 999;
	color: #f56c6c;
	width: 15px;
	font-size: var(--font-size-2xs);

	:hover {
		color: #ff0000;
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

.duplicate-parameter-item .multi > .delete-item {
	top: 0.1em;
}
</style>
