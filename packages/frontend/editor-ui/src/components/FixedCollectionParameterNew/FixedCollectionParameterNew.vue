<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';
import type {
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
} from 'n8n-workflow';
import { deepCopy, isINodePropertyCollectionList } from 'n8n-workflow';
import get from 'lodash/get';
import { computed, ref, watch, onBeforeMount, nextTick } from 'vue';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { useNDVStore } from '@/features/ndv/ndv.store';
import { useFixedCollectionItemState } from '@/composables/useFixedCollectionItemState';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { telemetry } from '@/plugins/telemetry';
import type { RekaSelectOption } from '@n8n/design-system';
import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nHeaderAction,
	N8nIconButton,
	N8nRekaSelect,
	N8nSectionHeader,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import ParameterInputList from '../ParameterInputList.vue';
import FixedCollectionItemList from './FixedCollectionItemList.vue';
import type { ComponentExposed } from 'vue-component-type-helpers';

const locale = useI18n();
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();
const { activeNode } = storeToRefs(ndvStore);

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[] | INodeParameters>;
	isReadOnly?: boolean;
	isNested?: boolean;
	isNewlyAdded?: boolean;
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

const props = withDefaults(defineProps<Props>(), {
	values: () => ({}),
	isReadOnly: false,
	isNewlyAdded: false,
});

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
}>();

const mutableValues = ref({} as Record<string, INodeParameters[] | INodeParameters>);
const addDropdownRef = ref<ComponentExposed<typeof N8nRekaSelect>>();
const selectedOption = ref<string | undefined>(undefined);

const storageKey = computed(() => `${activeNode.value?.id ?? 'unknown'}-${props.path}`);
const itemState = useFixedCollectionItemState(storageKey);

const isWrapperExpanded = ref(
	itemState.wrapperExpanded.value !== null
		? itemState.wrapperExpanded.value
		: !props.isNested || props.isNewlyAdded,
);

const getOptionProperties = (optionName: string): INodePropertyCollection | undefined => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return undefined;
	return props.parameter.options.find((option) => option.name === optionName);
};

const getPropertyPath = (name: string, index?: number): string => {
	return `${props.path}.${name}${index !== undefined ? `[${index}]` : ''}`;
};

const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);

const propertyNames = computed(() => new Set(Object.keys(mutableValues.value ?? {})));

const properties = computed(() =>
	Array.from(propertyNames.value)
		.map(getOptionProperties)
		.filter((prop): prop is INodePropertyCollection => prop !== undefined),
);

const parameterOptions = computed(() => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return [];
	if (multipleValues.value) return props.parameter.options;
	return props.parameter.options.filter((option) => !propertyNames.value.has(option.name));
});

const displayName = computed(() =>
	locale.nodeText(activeNode.value?.type).inputLabelDisplayName(props.parameter, props.path),
);

const isAddDisabled = computed(() => parameterOptions.value.length === 0);

const placeholder = computed(
	() =>
		locale.nodeText(activeNode.value?.type).placeholder(props.parameter, props.path) ||
		locale.baseText('fixedCollectionParameter.choose'),
);

const addTooltipText = computed(() =>
	isAddDisabled.value
		? locale.baseText('fixedCollectionParameter.allOptionsAdded')
		: locale.baseText('fixedCollectionParameter.addParameter', {
				interpolate: {
					parameter: displayName.value,
				},
			}),
);

const dropdownOptions = computed(
	() =>
		parameterOptions.value.map((option) => ({
			label: locale
				.nodeText(activeNode.value?.type)
				.collectionOptionDisplayName(props.parameter, option, props.path),
			value: option.name,
		})) as Array<RekaSelectOption<string>>,
);

const shouldShowSectionHeader = computed(
	() => !props.isNested && props.parameter.displayName !== '',
);

const shouldWrapInCollapsible = computed(() => props.isNested);

const shouldShowAddControl = computed(() => parameterOptions.value.length > 0 && !props.isReadOnly);

const shouldShowAddInHeader = computed(() => shouldShowSectionHeader.value && !props.isReadOnly);

const shouldShowAddAtBottom = computed(
	() =>
		shouldShowAddControl.value &&
		(shouldShowSectionHeader.value || (shouldWrapInCollapsible.value && multipleValues.value)),
);

const shouldShowAddInCollapsibleActions = computed(
	() => shouldWrapInCollapsible.value && shouldShowAddControl.value,
);

const hasSingleOption = computed(() => dropdownOptions.value.length === 1);
const hasMultipleOptions = computed(() => dropdownOptions.value.length > 1);

const shouldDeleteEntireCollection = (optionName: string, index?: number): boolean => {
	if (index !== undefined) return false;
	const items = mutableValues.value[optionName];
	return !items || !Array.isArray(items) || items.length <= 1;
};

const getParentPath = (): string => {
	const pathParts = props.path.split('.');
	const parentPropertyName = pathParts.at(-1) ?? '';
	const parentPath = pathParts.slice(0, -1).join('.');
	return parentPath ? `${parentPath}.${parentPropertyName}` : parentPropertyName;
};

const getDeletionPath = (optionName: string, index?: number): string => {
	if (index !== undefined) return getPropertyPath(optionName, index);
	if (!multipleValues.value && props.isNested) return getParentPath();
	return getPropertyPath(optionName);
};

const handleDelete = (optionName: string, index?: number) => {
	if (index !== undefined) {
		itemState.cleanupItem(optionName, index);
	} else if (shouldDeleteEntireCollection(optionName, index)) {
		itemState.cleanupProperty(optionName);
	}

	emit('valueChanged', { name: getDeletionPath(optionName, index), value: undefined });
};

const trackFieldAdded = () => {
	telemetry.track('User added workflow input field', {
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

const trackFieldTypeChange = (parameterData: IUpdateInformation) => {
	telemetry.track('User changed workflow input field type', {
		type: parameterData.value,
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

const normalizeToArray = (items: INodeParameters[] | INodeParameters): INodeParameters[] =>
	Array.isArray(items) ? items : [items];

const initExpandedState = () => {
	Object.entries(mutableValues.value).forEach(([propertyName, items]) =>
		itemState.initExpandedState(propertyName, normalizeToArray(items), multipleValues.value),
	);
};

watch(
	() => props.values,
	(newValues: Record<string, INodeParameters[] | INodeParameters>) => {
		mutableValues.value = deepCopy(newValues);

		Object.entries(mutableValues.value).forEach(([propertyName, items]) =>
			itemState.trimArrays(propertyName, normalizeToArray(items).length),
		);

		initExpandedState();
	},
	{ deep: true },
);

onBeforeMount(() => {
	mutableValues.value = deepCopy(props.values);
	initExpandedState();
});

const initializeParameterValue = (optionParameter: INodeProperties): NodeParameterValueType => {
	const hasMultipleValues = optionParameter.typeOptions?.multipleValues === true;

	if (!hasMultipleValues) {
		return deepCopy(optionParameter.default);
	}

	if (optionParameter.type === 'fixedCollection') {
		return {};
	}

	const existingArray = get(props.nodeValues, [props.path, optionParameter.name], []);
	const defaultValue = optionParameter.default;

	const normalizeDefault = (value: typeof defaultValue) => {
		if (Array.isArray(value)) return deepCopy(value);
		if (value !== '' && typeof value !== 'object') return [deepCopy(value)];
		return [];
	};

	return [...existingArray, ...normalizeDefault(defaultValue)];
};

const optionSelected = (optionName: string) => {
	const option = getOptionProperties(optionName);
	if (!option) return;

	const name = `${props.path}.${option.name}`;

	const newParameterValue = Object.fromEntries(
		option.values.map((optionParameter) => [
			optionParameter.name,
			initializeParameterValue(optionParameter),
		]),
	);

	const existingValues = get(props.nodeValues, name, []) as INodeParameters[];
	const newValue: NodeParameterValueType = multipleValues.value
		? [...existingValues, newParameterValue]
		: newParameterValue;

	emit('valueChanged', { name, value: newValue });

	itemState.setExpandedState(option.name, existingValues.length, true);

	if (props.parameter.name === 'workflowInputs') {
		trackFieldAdded();
	}

	selectedOption.value = undefined;
};

const valueChanged = (parameterData: IUpdateInformation) => {
	emit('valueChanged', parameterData);
	if (props.parameter.name === 'workflowInputs') {
		trackFieldTypeChange(parameterData);
	}
};

const onDragChange = (
	optionName: string,
	event: { moved?: { oldIndex: number; newIndex: number } },
) => {
	if (event.moved) {
		itemState.reorderItems(optionName, event.moved.oldIndex, event.moved.newIndex);

		const items = mutableValues.value[optionName];
		if (Array.isArray(items)) {
			const reorderedItems = [...items];
			const [movedItem] = reorderedItems.splice(event.moved.oldIndex, 1);
			reorderedItems.splice(event.moved.newIndex, 0, movedItem);
			mutableValues.value[optionName] = reorderedItems;
		}
	}

	const parameterData: ValueChangedEvent = {
		name: getPropertyPath(optionName),
		value: mutableValues.value[optionName],
		type: 'optionsOrderChanged',
	};

	emit('valueChanged', parameterData);
};

const onHeaderAddClick = async () => {
	if (shouldShowSectionHeader.value && !multipleValues.value && addDropdownRef.value) {
		addDropdownRef.value.open();
		await nextTick();
		addDropdownRef.value.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	} else if (properties.value[0]) {
		optionSelected(properties.value[0].name);
	}
};

const onAddButtonClick = () => {
	if (hasSingleOption.value && dropdownOptions.value[0]) {
		optionSelected(dropdownOptions.value[0].value);
	}
};

const onDropdownSelect = (value: string | number) => {
	if (typeof value !== 'string') return;
	optionSelected(value);
};
</script>

<template>
	<div
		:class="[$style.fixedCollectionParameter, { [$style.empty]: properties.length === 0 }]"
		:data-test-id="`fixed-collection-${props.parameter?.name}`"
		@keydown.stop
	>
		<!-- Header variant: Section header with add button -->
		<template v-if="shouldShowSectionHeader">
			<N8nSectionHeader
				:title="displayName"
				:bordered="properties.length === 0"
				:class="$style.sectionHeader"
			>
				<template v-if="shouldShowAddInHeader" #actions>
					<N8nTooltip :disabled="!isAddDisabled" :show-after="TOOLTIP_DELAY_MS">
						<template #content>{{ addTooltipText }}</template>
						<N8nIconButton
							type="secondary"
							text
							size="small"
							icon="plus"
							icon-size="large"
							:disabled="isAddDisabled"
							:aria-label="locale.baseText('fixedCollectionParameter.addItem')"
							:data-test-id="
								multipleValues
									? 'fixed-collection-add-header'
									: 'fixed-collection-add-header-top-level'
							"
							@click="onHeaderAddClick"
						/>
					</N8nTooltip>
				</template>
			</N8nSectionHeader>

			<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
				<template v-if="multipleValues && mutableValues[property.name]">
					<FixedCollectionItemList
						:property="property"
						:values="mutableValues[property.name] as INodeParameters[]"
						:node-values="nodeValues"
						:get-property-path="getPropertyPath"
						:item-state="itemState"
						:is-read-only="!!isReadOnly"
						:sortable="true"
						:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
						@value-changed="valueChanged"
						@delete="handleDelete"
						@drag-change="onDragChange"
					/>
				</template>

				<N8nCollapsiblePanel
					v-else
					:model-value="itemState.getExpandedState(property.name, 0)"
					:title="property.displayName"
					:data-item-key="property.name"
					@update:model-value="itemState.setExpandedState(property.name, 0, $event)"
				>
					<template v-if="!isReadOnly" #actions>
						<N8nHeaderAction
							icon="trash-2"
							:label="locale.baseText('fixedCollectionParameter.deleteItem')"
							danger
							@click="handleDelete(property.name)"
						/>
					</template>

					<ParameterInputList
						hide-delete
						:parameters="property.values"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name, 0)"
						:is-read-only="!!isReadOnly"
						:is-nested="false"
						:remove-first-parameter-margin="true"
						:remove-last-parameter-margin="true"
						@value-changed="valueChanged"
					/>
				</N8nCollapsiblePanel>
			</div>

			<div v-if="shouldShowAddAtBottom" :class="$style.controls">
				<N8nButton
					v-if="hasSingleOption"
					type="secondary"
					icon="plus"
					:data-test-id="`fixed-collection-add-top-level-button`"
					:label="placeholder"
					:disabled="isAddDisabled"
					:class="$style.addButton"
					@click="onAddButtonClick"
				/>
				<N8nRekaSelect
					v-else-if="hasMultipleOptions"
					ref="addDropdownRef"
					v-model="selectedOption"
					:options="dropdownOptions"
					:class="$style.dropdown"
					:data-test-id="`fixed-collection-add-top-level-dropdown`"
					:disabled="isAddDisabled"
					@update:model-value="onDropdownSelect"
				>
					<template #trigger>
						<N8nButton
							type="secondary"
							icon="plus"
							:label="placeholder"
							:disabled="isAddDisabled"
							:class="$style.addButton"
						/>
					</template>
				</N8nRekaSelect>
			</div>
		</template>

		<!-- Nested variant: Collapsible wrapper with add in actions -->
		<N8nCollapsiblePanel
			v-else-if="shouldWrapInCollapsible"
			v-model="isWrapperExpanded"
			:title="displayName"
			:show-actions-on-hover="false"
		>
			<template #actions>
				<N8nTooltip v-if="shouldShowAddInCollapsibleActions" :show-after="TOOLTIP_DELAY_MS">
					<template #content>{{ addTooltipText }}</template>
					<N8nIconButton
						type="secondary"
						text
						size="small"
						icon="plus"
						icon-size="large"
						:aria-label="locale.baseText('fixedCollectionParameter.addItem')"
						:data-test-id="`fixed-collection-add-header-nested`"
						@click="optionSelected(dropdownOptions[0]?.value)"
					/>
				</N8nTooltip>
			</template>

			<div>
				<template v-if="multipleValues">
					<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
						<FixedCollectionItemList
							v-if="mutableValues[property.name]"
							:property="property"
							:values="mutableValues[property.name] as INodeParameters[]"
							:node-values="nodeValues"
							:get-property-path="getPropertyPath"
							:item-state="itemState"
							:is-read-only="!!isReadOnly"
							:sortable="true"
							:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
							@value-changed="valueChanged"
							@delete="handleDelete"
							@drag-change="onDragChange"
						/>
					</div>

					<div v-if="shouldShowAddAtBottom" :class="$style.controls">
						<N8nButton
							v-if="hasSingleOption"
							type="secondary"
							icon="plus"
							:data-test-id="`fixed-collection-add-nested-button`"
							:label="placeholder"
							:class="$style.addButton"
							@click="onAddButtonClick"
						/>
						<N8nRekaSelect
							v-else-if="hasMultipleOptions"
							v-model="selectedOption"
							:options="dropdownOptions"
							:class="$style.dropdown"
							:data-test-id="`fixed-collection-add-nested-dropdown`"
							@update:model-value="onDropdownSelect"
						>
							<template #trigger>
								<N8nButton
									type="secondary"
									icon="plus"
									:label="placeholder"
									:class="$style.addButton"
								/>
							</template>
						</N8nRekaSelect>
					</div>
				</template>

				<template v-else>
					<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
						<ParameterInputList
							hide-delete
							:parameters="property.values"
							:node-values="nodeValues"
							:path="getPropertyPath(property.name)"
							:is-read-only="!!isReadOnly"
							:is-nested="true"
							:remove-first-parameter-margin="true"
							:remove-last-parameter-margin="true"
							@value-changed="valueChanged"
						/>
					</div>
				</template>
			</div>
		</N8nCollapsiblePanel>

		<!-- Default variant: Simple rendering without wrapper -->
		<template v-else>
			<div v-for="property in properties" :key="property.name" :class="$style.propertySection">
				<template v-if="multipleValues && mutableValues[property.name]">
					<FixedCollectionItemList
						:property="property"
						:values="mutableValues[property.name] as INodeParameters[]"
						:node-values="nodeValues"
						:get-property-path="getPropertyPath"
						:item-state="itemState"
						:is-read-only="!!isReadOnly"
						:sortable="true"
						:title-template="parameter.typeOptions?.fixedCollection?.itemTitle"
						@value-changed="valueChanged"
						@delete="handleDelete"
						@drag-change="onDragChange"
					/>
				</template>

				<N8nCollapsiblePanel
					v-else
					:model-value="itemState.getExpandedState(property.name, 0)"
					:title="property.displayName"
					:data-item-key="property.name"
					@update:model-value="itemState.setExpandedState(property.name, 0, $event)"
				>
					<template v-if="!isReadOnly" #actions>
						<N8nHeaderAction
							icon="trash-2"
							:label="locale.baseText('fixedCollectionParameter.deleteItem')"
							danger
							@click="handleDelete(property.name)"
						/>
					</template>

					<ParameterInputList
						hide-delete
						:parameters="property.values"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name, 0)"
						:is-read-only="!!isReadOnly"
						:is-nested="false"
						:remove-first-parameter-margin="true"
						:remove-last-parameter-margin="true"
						@value-changed="valueChanged"
					/>
				</N8nCollapsiblePanel>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.fixedCollectionParameter {
	padding-left: 0;
}

.propertySection {
	margin-bottom: var(--spacing--xs);

	&:last-child {
		margin-bottom: 0;
	}
}

.sectionHeader {
	margin-bottom: 0;
}

.controls {
	margin-top: var(--spacing--xs);
}

.addButton {
	--button--color--background: var(--color--background);
	--button--color--background--hover: var(--color--background);
	--button--color--background--active: var(--color--background);
	--button--color--background--focus: var(--color--background);
	--button--border-color: transparent;
	--button--border-color--hover: transparent;
	--button--border-color--active: transparent;
	--button--border-color--focus: transparent;
	--button--color--text--hover: var(--color--primary);
	--button--color--text--active: var(--color--primary);
	--button--color--text--focus: var(--color--primary);
}

.dropdown {
	display: inline-flex;
}
</style>
