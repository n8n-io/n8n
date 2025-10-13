<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import get from 'lodash/get';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

import { useI18n } from '@n8n/i18n';
import type { IUpdateInformation } from '@/Interface';
import CollectionParameter from '@/components/CollectionParameter.vue';
import ParameterInputFull from '@/components/ParameterInputFull.vue';
import { useNDVStore } from '@/stores/ndv.store';
import { storeToRefs } from 'pinia';

import { N8nButton, N8nIcon, N8nInputLabel, N8nText } from '@n8n/design-system';
defineOptions({ name: 'MultipleParameter' });

const props = withDefaults(
	defineProps<{
		nodeValues: INodeParameters;
		parameter: INodeProperties;
		path: string;
		values?: INodeParameters[];
		isReadOnly?: boolean;
	}>(),
	{
		values: () => [] as INodeParameters[],
		isReadOnly: false,
	},
);

const emit = defineEmits<{
	valueChanged: [parameterData: IUpdateInformation];
}>();

const ndvStore = useNDVStore();
const i18n = useI18n();

const { activeNode } = storeToRefs(ndvStore);

const mutableValues = ref<INodeParameters[]>(deepCopy(props.values));

watch(
	() => props.values,
	(newValues) => {
		mutableValues.value = deepCopy(newValues);
	},
	{ deep: true },
);

const addButtonText = computed(() => {
	if (!props.parameter.typeOptions?.multipleValueButtonText) {
		return i18n.baseText('multipleParameter.addItem');
	}

	return i18n.nodeText(activeNode.value?.type).multipleValueButtonText(props.parameter);
});

const hideDelete = computed(() => props.parameter.options?.length === 1);

const sortable = computed(() => !!props.parameter.typeOptions?.sortable);

const addItem = () => {
	const name = getPath();
	const currentValue = get(props.nodeValues, name, []) as INodeParameters[];

	currentValue.push(deepCopy(props.parameter.default as INodeParameters));

	const parameterData = {
		name,
		value: currentValue,
	};

	emit('valueChanged', parameterData);
};

const deleteItem = (index: number) => {
	const parameterData = {
		name: getPath(index),
		value: undefined,
	};

	emit('valueChanged', parameterData);
};

const getPath = (index?: number) => {
	return props.path + (index !== undefined ? `[${index}]` : '');
};

const moveOptionDown = (index: number) => {
	mutableValues.value.splice(index + 1, 0, mutableValues.value.splice(index, 1)[0]);

	emit('valueChanged', {
		name: props.path,
		value: mutableValues.value,
	});
};

const moveOptionUp = (index: number) => {
	mutableValues.value.splice(index - 1, 0, mutableValues.value.splice(index, 1)[0]);

	emit('valueChanged', {
		name: props.path,
		value: mutableValues.value,
	});
};

const valueChanged = (parameterData: IUpdateInformation) => {
	emit('valueChanged', parameterData);
};
</script>

<template>
	<div class="duplicate-parameter" @keydown.stop>
		<N8nInputLabel
			:label="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:tooltip-text="i18n.nodeText(activeNode?.type).inputLabelDescription(parameter, path)"
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
				<N8nIcon
					icon="trash-2"
					:title="i18n.baseText('multipleParameter.deleteItem')"
					@click="deleteItem(index)"
				/>
				<div v-if="sortable">
					<N8nIcon
						v-if="index !== 0"
						icon="chevron-up"
						class="clickable"
						:title="i18n.baseText('multipleParameter.moveUp')"
						@click="moveOptionUp(index)"
					/>
					<N8nIcon
						v-if="index !== mutableValues.length - 1"
						icon="chevron-down"
						class="clickable"
						:title="i18n.baseText('multipleParameter.moveDown')"
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
				<N8nText size="small">{{
					i18n.baseText('multipleParameter.currentlyNoItemsExist')
				}}</N8nText>
			</div>
			<N8nButton
				v-if="!isReadOnly"
				type="tertiary"
				block
				:label="addButtonText"
				@click="addItem()"
			/>
		</div>
	</div>
</template>

<style scoped lang="scss">
.duplicate-parameter {
	:deep(.button) {
		--button-background-color: var(--color--background);
		--button-border-color: var(--color--foreground);
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
			margin-top: var(--spacing--xs);
		}
	}
}

.duplicate-parameter-item {
	~ .add-item-wrapper {
		margin-top: var(--spacing--xs);
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
	font-size: var(--font-size--2xs);

	:hover {
		color: #f00;
	}
}

.no-items-exist {
	margin: var(--spacing--xs) 0;
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
