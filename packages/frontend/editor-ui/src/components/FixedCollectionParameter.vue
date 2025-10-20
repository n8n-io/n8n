<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';

import type {
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { FixedCollectionRenderVariant } from '@/types/collection-parameter.types';
import { deepCopy, isINodePropertyCollectionList } from 'n8n-workflow';

import get from 'lodash/get';

import { computed, ref, watch, onBeforeMount, nextTick } from 'vue';
import { useI18n } from '@n8n/i18n';
import ParameterInputList from './ParameterInputList.vue';
import Draggable from 'vuedraggable';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { telemetry } from '@/plugins/telemetry';
import { storeToRefs } from 'pinia';
import { useCollectionOverhaul } from '@/composables/useCollectionOverhaul';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';

import {
	N8nButton,
	N8nCollapsiblePanel,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nSectionHeader,
	N8nSelect,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
const locale = useI18n();
const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();
const { resolveExpression } = useWorkflowHelpers();

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[]>;
	isReadOnly?: boolean;
	isNested?: boolean;
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

const props = withDefaults(defineProps<Props>(), {
	values: () => ({}),
	isReadOnly: false,
});

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
}>();

const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();

const { activeNode } = storeToRefs(ndvStore);

const mutableValues = ref({} as Record<string, INodeParameters[]>);
const selectedOption = ref<string | null | undefined>(null);
const collapsedItems = ref<Record<string, boolean>>({});
const lastAddedItemKey = ref<string | null>(null);
const previousValueKeys = ref<Set<string>>(new Set());

const getOptionProperties = (optionName: string): INodePropertyCollection | undefined => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return undefined;
	return props.parameter.options.find((option) => option.name === optionName);
};

const getPropertyPath = (name: string, index?: number): string => {
	return `${props.path}.${name}${index !== undefined ? `[${index}]` : ''}`;
};

const multipleValues = computed(() => !!props.parameter.typeOptions?.multipleValues);
const sortable = computed(() => {
	// Fixed collection become default sortable
	if (isCollectionOverhaulEnabled.value) {
		return props.parameter.typeOptions?.sortable !== false;
	}

	return !!props.parameter.typeOptions?.sortable;
});

const getPlaceholderText = computed(() => {
	const placeholder = locale
		.nodeText(activeNode.value?.type)
		.placeholder(props.parameter, props.path);
	return placeholder || locale.baseText('fixedCollectionParameter.choose');
});

const propertyNames = computed(() => new Set(Object.keys(mutableValues.value || {})));

const getProperties = computed(() => {
	const properties: INodePropertyCollection[] = [];
	for (const name of propertyNames.value) {
		const prop = getOptionProperties(name);
		if (prop) properties.push(prop);
	}
	return properties;
});

const parameterOptions = computed(() => {
	if (!isINodePropertyCollectionList(props.parameter.options)) return [];
	if (multipleValues.value) return props.parameter.options;
	return props.parameter.options.filter((option) => !propertyNames.value.has(option.name));
});

const renderVariant = computed((): FixedCollectionRenderVariant => {
	if (!isCollectionOverhaulEnabled.value) {
		return multipleValues.value ? 'legacy-multiple' : 'legacy-single';
	}

	if (props.isNested && multipleValues.value) return 'nested-multiple-wrapper';
	if (!props.isNested && multipleValues.value) return 'top-level-multiple';
	if (props.isNested && !multipleValues.value) return 'nested-single';
	return 'top-level-single';
});

const showWrapper = computed(() => renderVariant.value === 'nested-multiple-wrapper');
const showLegacyUI = computed(() => renderVariant.value.startsWith('legacy'));

const getDefaultExpandedState = (index: number): boolean => {
	const defaultCollapsed = props.parameter.typeOptions?.fixedCollection?.defaultCollapsed ?? 'all';

	if (defaultCollapsed === 'all') return false; // All collapsed = none expanded
	if (defaultCollapsed === 'none') return true; // None collapsed = all expanded
	// 'first-expanded': first item is expanded, rest are collapsed
	return index === 0;
};

const getItemTitle = (optionName: string, index: number): string => {
	const property = getOptionProperties(optionName);
	if (!property) return optionName;

	// Default title: use property display name + index
	const defaultTitle = `${property.displayName} ${index + 1}`;

	const titleTemplate = props.parameter.typeOptions?.fixedCollection?.itemTitle;
	if (titleTemplate) {
		const items = mutableValues.value[optionName];
		if (!items) return defaultTitle;

		// Handle both array (multipleValues) and single object cases
		const itemData = Array.isArray(items) ? items[index] : items;
		if (!itemData) return defaultTitle;

		// Resolve expression with $collection.item and $collection.index as additional context
		try {
			const resolved = resolveExpression(titleTemplate, undefined, {
				additionalKeys: {
					$collection: {
						item: {
							value: itemData,
							index,
							properties: property.values,
						},
					},
				},
			}) as string;
			const result = String(resolved);
			// If expression returns empty, undefined, or null string, use default
			return result && result !== 'undefined' && result !== 'null' ? result : defaultTitle;
		} catch {
			// If expression resolution fails, fall back to default
			return defaultTitle;
		}
	}

	return defaultTitle;
};

const getItemActions = (optionName: string, index: number) => {
	if (props.isReadOnly) return [];

	const actions = [];
	const itemName = getItemTitle(optionName, index);

	// Add delete button first
	actions.push({
		icon: 'trash-2' as const,
		label: locale.baseText('fixedCollectionParameter.deleteItem'),
		tooltip: locale.baseText('fixedCollectionParameter.deleteParameter', {
			interpolate: { parameter: itemName },
		}),
		onClick: () => deleteOption(optionName, index),
		danger: true,
	});

	// Add drag handle after delete button (if sortable)
	if (sortable.value) {
		actions.push({
			icon: 'grip-vertical' as const,
			label: locale.baseText('fixedCollectionParameter.dragItem'),
			onClick: () => {},
		});
	}

	return actions;
};

const initializeCollapsedStates = () => {
	const newCollapsedItems: Record<string, boolean> = {};
	const previousKeys = new Set(Object.keys(collapsedItems.value));
	const hasExistingState = previousKeys.size > 0;

	// Initialize wrapper state for nested multiple-values fixedCollections
	if (props.isNested && multipleValues.value) {
		newCollapsedItems['_wrapper'] = collapsedItems.value['_wrapper'] ?? true; // Default to expanded
	}

	// Check if this fixedCollection was just added to a parent collection
	// This happens when the entire component receives new values that didn't exist before
	const currentKeys = new Set(Object.keys(mutableValues.value));
	const wasJustAdded =
		props.isNested &&
		isCollectionOverhaulEnabled.value &&
		previousValueKeys.value.size === 0 &&
		currentKeys.size > 0;

	for (const [optionName, items] of Object.entries(mutableValues.value)) {
		if (Array.isArray(items)) {
			items.forEach((_, index) => {
				const key = `${optionName}-${index}`;
				const isNewItem = hasExistingState && !previousKeys.has(key);

				if (collapsedItems.value[key] === undefined) {
					// If we have existing state and this key is new, it's a newly added item - expand it
					// If this fixedCollection was just added to a parent collection - expand it
					// Otherwise, use default state (collapsed for 'all', expanded for first item if 'first-expanded')
					newCollapsedItems[key] =
						isNewItem || wasJustAdded ? true : getDefaultExpandedState(index);
				} else {
					// Existing item - preserve its state
					newCollapsedItems[key] = collapsedItems.value[key];
				}
			});
		} else {
			// Handle non-multiple fixed collections (single object)
			const key = optionName;
			const isNewItem = hasExistingState && !previousKeys.has(key);

			if (collapsedItems.value[key] === undefined) {
				// If we have existing state and this key is new, it's a newly added item - expand it
				// If this fixedCollection was just added to a parent collection - expand it
				// Otherwise, use default state
				newCollapsedItems[key] = isNewItem || wasJustAdded ? true : getDefaultExpandedState(0);
			} else {
				// Existing item - preserve its state
				newCollapsedItems[key] = collapsedItems.value[key];
			}
		}
	}

	collapsedItems.value = newCollapsedItems;
};

watch(
	() => props.values,
	(newValues: Record<string, INodeParameters[]>) => {
		mutableValues.value = deepCopy(newValues);
		if (isCollectionOverhaulEnabled.value) {
			initializeCollapsedStates();
			// Update tracked keys after initialization
			previousValueKeys.value = new Set(Object.keys(mutableValues.value));
		}
	},
	{ deep: true },
);

onBeforeMount(() => {
	mutableValues.value = deepCopy(props.values);
	if (isCollectionOverhaulEnabled.value) {
		initializeCollapsedStates();
		// Initialize tracked keys
		previousValueKeys.value = new Set(Object.keys(mutableValues.value));
	}
});

const deleteOption = (optionName: string, index?: number) => {
	const currentOptionsOfSameType = mutableValues.value[optionName];
	if (!currentOptionsOfSameType || currentOptionsOfSameType.length > 1) {
		// it's not the only option of this type, so just remove it.
		emit('valueChanged', {
			name: getPropertyPath(optionName, index),
			value: undefined,
		});
	} else {
		// it's the only option, so remove the whole type
		// For non-multiple fixedCollections nested in collections, remove the parent collection item
		if (!multipleValues.value && props.isNested) {
			// Remove the entire parent collection property (go up one level in the path)
			const pathParts = props.path.split('.');
			const parentPath = pathParts.slice(0, -1).join('.');
			const parentPropertyName = pathParts[pathParts.length - 1];
			emit('valueChanged', {
				name: parentPath ? `${parentPath}.${parentPropertyName}` : parentPropertyName,
				value: undefined,
			});
		} else {
			// Normal behavior: just remove the fixedCollection property
			emit('valueChanged', {
				name: getPropertyPath(optionName),
				value: undefined,
			});
		}
	}
};

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

	const newItems = Array.isArray(defaultValue)
		? deepCopy(defaultValue)
		: defaultValue !== '' && typeof defaultValue !== 'object'
			? [deepCopy(defaultValue)]
			: [];

	return existingArray.concat(newItems);
};

const optionSelected = async (optionName: string) => {
	const option = getOptionProperties(optionName);
	if (!option) return;

	const name = `${props.path}.${option.name}`;

	// Build new parameter value from option values
	const newParameterValue = option.values.reduce<INodeParameters>((acc, optionParameter) => {
		acc[optionParameter.name] = initializeParameterValue(optionParameter);
		return acc;
	}, {});

	// Handle multiple collection values
	const existingValues = get(props.nodeValues, name, []) as INodeParameters[];
	const newValue: NodeParameterValueType = multipleValues.value
		? [...existingValues, newParameterValue]
		: newParameterValue;

	// Calculate the key for the newly added item
	if (isCollectionOverhaulEnabled.value) {
		if (multipleValues.value) {
			// For multiple values, the new item will be at index existingValues.length
			lastAddedItemKey.value = `${optionName}-${existingValues.length}`;
		} else {
			// For single value, just use the option name
			lastAddedItemKey.value = optionName;
		}

		// If this is a nested multiple-values fixedCollection, expand the wrapper panel
		if (props.isNested && multipleValues.value) {
			collapsedItems.value['_wrapper'] = true; // true = expanded
		}
	}

	emit('valueChanged', { name, value: newValue });
	selectedOption.value = undefined;

	// Scroll the newly added item into view after DOM update (only if needed)
	if (isCollectionOverhaulEnabled.value && lastAddedItemKey.value) {
		await nextTick();
		const element = document.querySelector(
			`[data-item-key="${lastAddedItemKey.value}"]`,
		) as HTMLElement;
		if (element) {
			// Check if element is already visible in viewport
			const rect = element.getBoundingClientRect();
			const isVisible =
				rect.top >= 0 &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
				rect.right <= (window.innerWidth || document.documentElement.clientWidth);

			// Only scroll if not already visible
			if (!isVisible) {
				element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
		lastAddedItemKey.value = null;
	}
};

const onAddButtonClick = async (optionName: string) => {
	await optionSelected(optionName);
	if (props.parameter.name === 'workflowInputs') {
		trackWorkflowInputFieldAdded();
	}
};

const valueChanged = (parameterData: IUpdateInformation) => {
	emit('valueChanged', parameterData);
	if (props.parameter.name === 'workflowInputs') {
		trackWorkflowInputFieldTypeChange(parameterData);
	}
};
const onDragChange = (optionName: string) => {
	const parameterData: ValueChangedEvent = {
		name: getPropertyPath(optionName),
		value: mutableValues.value[optionName],
		type: 'optionsOrderChanged',
	};

	emit('valueChanged', parameterData);
};

const trackWorkflowInputFieldTypeChange = (parameterData: IUpdateInformation) => {
	telemetry.track('User changed workflow input field type', {
		type: parameterData.value,
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

const trackWorkflowInputFieldAdded = () => {
	telemetry.track('User added workflow input field', {
		workflow_id: workflowsStore.workflow.id,
		node_id: ndvStore.activeNode?.id,
	});
};

function getItemKey(item: INodeParameters, property: INodePropertyCollection) {
	return mutableValues.value[property.name]?.indexOf(item) ?? -1;
}
</script>

<template>
	<div
		:class="[
			$style.fixedCollectionParameter,
			{
				[$style.overhaul]: isCollectionOverhaulEnabled,
				[$style.empty]: getProperties.length === 0,
			},
		]"
		:data-test-id="`fixed-collection-${props.parameter?.name}`"
		@keydown.stop
	>
		<N8nSectionHeader
			v-if="renderVariant === 'top-level-multiple' && parameter.displayName !== ''"
			:title="locale.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:bordered="getProperties.length === 0"
			:class="$style.fixedCollectionSectionHeader"
		>
			<template v-if="!isReadOnly" #actions>
				<N8nTooltip :show-after="TOOLTIP_DELAY_MS">
					<template #content>
						{{
							locale.baseText('fixedCollectionParameter.addParameter', {
								interpolate: {
									parameter: locale
										.nodeText(activeNode?.type)
										.inputLabelDisplayName(parameter, path),
								},
							})
						}}
					</template>
					<N8nIconButton
						type="secondary"
						text
						size="small"
						icon="plus"
						icon-size="large"
						:aria-label="locale.baseText('fixedCollectionParameter.addItem')"
						data-test-id="fixed-collection-add-header"
						@click="onAddButtonClick(getProperties[0].name)"
					/>
				</N8nTooltip>
			</template>
		</N8nSectionHeader>

		<div v-if="getProperties.length === 0 && showLegacyUI" :class="$style.noItemsExist">
			<N8nText size="small">{{
				locale.baseText('fixedCollectionParameter.currentlyNoItemsExist')
			}}</N8nText>
		</div>

		<N8nCollapsiblePanel
			v-if="showWrapper && parameter.displayName !== ''"
			v-model="collapsedItems['_wrapper']"
			:title="locale.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
			:show-actions-on-hover="false"
		>
			<template #actions>
				<N8nTooltip
					v-if="!isReadOnly && parameterOptions.length > 0"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<template #content>
						{{
							locale.baseText('fixedCollectionParameter.addParameter', {
								interpolate: {
									parameter: locale
										.nodeText(activeNode?.type)
										.inputLabelDisplayName(parameter, path),
								},
							})
						}}
					</template>
					<N8nIconButton
						type="secondary"
						text
						size="small"
						icon="plus"
						icon-size="large"
						:aria-label="locale.baseText('fixedCollectionParameter.addItem')"
						data-test-id="fixed-collection-add-header-nested"
						@click="onAddButtonClick(parameterOptions[0].name)"
					/>
				</N8nTooltip>
			</template>

			<div>
				<div
					v-for="property in getProperties"
					:key="property.name"
					:class="$style.fixedCollectionParameterProperty"
				>
					<div>
						<Draggable
							v-model="mutableValues[property.name]"
							:item-key="(item: INodeParameters) => getItemKey(item, property)"
							handle=".drag-handle"
							drag-class="dragging"
							ghost-class="ghost"
							chosen-class="chosen"
							@change="onDragChange(property.name)"
						>
							<template #item="{ index }">
								<N8nCollapsiblePanel
									:key="`${property.name}-${index}`"
									v-model="collapsedItems[`${property.name}-${index}`]"
									:title="getItemTitle(property.name, index)"
									:actions="getItemActions(property.name, index)"
									:data-item-key="`${property.name}-${index}`"
								>
									<Suspense>
										<ParameterInputList
											:parameters="property.values"
											:node-values="nodeValues"
											:path="getPropertyPath(property.name, index)"
											:hide-delete="true"
											:is-read-only="isReadOnly"
											:is-nested="true"
											:remove-first-parameter-margin="isCollectionOverhaulEnabled"
											:remove-last-parameter-margin="isCollectionOverhaulEnabled"
											@value-changed="valueChanged"
										/>
									</Suspense>
								</N8nCollapsiblePanel>
							</template>
						</Draggable>
					</div>
				</div>

				<div v-if="parameterOptions.length > 0 && !isReadOnly" :class="$style.controls">
					<N8nButton
						v-if="parameter.options && parameter.options.length === 1"
						type="secondary"
						icon="plus"
						data-test-id="fixed-collection-add-nested"
						:label="getPlaceholderText"
						@click="onAddButtonClick(parameter.options[0].name)"
					/>
					<div v-else :class="$style.addOption">
						<N8nSelect
							v-model="selectedOption"
							:placeholder="getPlaceholderText"
							size="small"
							filterable
							@update:model-value="optionSelected"
						>
							<N8nOption
								v-for="item in parameterOptions"
								:key="item.name"
								:label="
									locale
										.nodeText(activeNode?.type)
										.collectionOptionDisplayName(parameter, item, path)
								"
								:value="item.name"
							></N8nOption>
						</N8nSelect>
					</div>
				</div>
			</div>
		</N8nCollapsiblePanel>

		<div
			v-for="property in getProperties"
			v-else
			:key="property.name"
			:class="$style.fixedCollectionParameterProperty"
		>
			<N8nInputLabel
				v-if="
					showLegacyUI &&
					property.displayName !== '' &&
					parameter.options &&
					parameter.options.length !== 1
				"
				:label="locale.nodeText(activeNode?.type).inputLabelDisplayName(property, path)"
				:underline="true"
				size="small"
				color="text-dark"
			/>

			<template v-if="renderVariant === 'top-level-multiple'">
				<Draggable
					v-model="mutableValues[property.name]"
					:item-key="(item: INodeParameters) => getItemKey(item, property)"
					handle=".drag-handle"
					drag-class="dragging"
					ghost-class="ghost"
					chosen-class="chosen"
					@change="onDragChange(property.name)"
				>
					<template #item="{ index }">
						<N8nCollapsiblePanel
							:key="`${property.name}-${index}`"
							v-model="collapsedItems[`${property.name}-${index}`]"
							:title="getItemTitle(property.name, index)"
							:actions="getItemActions(property.name, index)"
							:data-item-key="`${property.name}-${index}`"
						>
							<Suspense>
								<ParameterInputList
									:parameters="property.values"
									:node-values="nodeValues"
									:path="getPropertyPath(property.name, index)"
									:hide-delete="true"
									:is-read-only="isReadOnly"
									:is-nested="true"
									:remove-first-parameter-margin="isCollectionOverhaulEnabled"
									:remove-last-parameter-margin="isCollectionOverhaulEnabled"
									@value-changed="valueChanged"
								/>
							</Suspense>
						</N8nCollapsiblePanel>
					</template>
				</Draggable>
			</template>

			<template v-else-if="renderVariant === 'legacy-multiple'">
				<Draggable
					v-model="mutableValues[property.name]"
					:item-key="(item: INodeParameters) => getItemKey(item, property)"
					handle=".drag-handle"
					drag-class="dragging"
					ghost-class="ghost"
					chosen-class="chosen"
					@change="onDragChange(property.name)"
				>
					<template #item="{ index }">
						<div :key="property.name + '-' + index" :class="$style.parameterItem">
							<div :class="[$style.parameterItemWrapper, { [$style.borderTopDashed]: index }]">
								<div v-if="!isReadOnly" :class="[$style.iconButton, $style.defaultTopPadding]">
									<N8nIconButton
										v-if="sortable"
										type="tertiary"
										text
										size="small"
										icon="grip-vertical"
										:title="locale.baseText('fixedCollectionParameter.dragItem')"
										class="drag-handle"
									/>
								</div>
								<div v-if="!isReadOnly" :class="[$style.iconButton, $style.extraTopPadding]">
									<N8nIconButton
										type="tertiary"
										text
										size="small"
										icon="trash-2"
										data-test-id="fixed-collection-delete"
										:title="locale.baseText('fixedCollectionParameter.deleteItem')"
										@click="deleteOption(property.name, index)"
									/>
								</div>
								<Suspense>
									<ParameterInputList
										:parameters="property.values"
										:node-values="nodeValues"
										:path="getPropertyPath(property.name, index)"
										:hide-delete="true"
										:is-read-only="isReadOnly"
										:is-nested="isNested"
										@value-changed="valueChanged"
									/>
								</Suspense>
							</div>
						</div>
					</template>
				</Draggable>
			</template>

			<N8nCollapsiblePanel
				v-else-if="renderVariant === 'nested-single'"
				v-model="collapsedItems[property.name]"
				:title="property.displayName"
				:actions="
					!isReadOnly
						? [
								{
									icon: 'trash-2' as const,
									label: locale.baseText('fixedCollectionParameter.deleteItem'),
									onClick: () => deleteOption(property.name),
									danger: true,
								},
							]
						: []
				"
				:data-item-key="property.name"
			>
				<Suspense>
					<ParameterInputList
						:parameters="property.values"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name)"
						:is-read-only="isReadOnly"
						:is-nested="true"
						:remove-first-parameter-margin="true"
						:remove-last-parameter-margin="true"
						@value-changed="valueChanged"
					/>
				</Suspense>
			</N8nCollapsiblePanel>

			<div v-else-if="renderVariant === 'legacy-single'" :class="$style.parameterItem">
				<div :class="$style.parameterItemWrapper">
					<div v-if="!isReadOnly" :class="$style.iconButton">
						<N8nIconButton
							type="tertiary"
							text
							size="small"
							icon="trash-2"
							data-test-id="fixed-collection-delete"
							:title="locale.baseText('fixedCollectionParameter.deleteItem')"
							@click="deleteOption(property.name)"
						></N8nIconButton>
					</div>
					<ParameterInputList
						:parameters="property.values"
						:node-values="nodeValues"
						:path="getPropertyPath(property.name)"
						:is-read-only="isReadOnly"
						:is-nested="isNested"
						:class="$style.parameterItem"
						:hide-delete="true"
						@value-changed="valueChanged"
					/>
				</div>
			</div>
		</div>

		<div v-if="parameterOptions.length > 0 && !isReadOnly && !showWrapper" :class="$style.controls">
			<N8nButton
				v-if="parameter.options && parameter.options.length === 1"
				:type="showLegacyUI ? 'tertiary' : 'secondary'"
				:block="showLegacyUI"
				:icon="showLegacyUI ? undefined : 'plus'"
				data-test-id="fixed-collection-add"
				:label="getPlaceholderText"
				@click="onAddButtonClick(parameter.options[0].name)"
			/>
			<div v-else :class="$style.addOption">
				<N8nSelect
					v-model="selectedOption"
					:placeholder="getPlaceholderText"
					size="small"
					filterable
					@update:model-value="optionSelected"
				>
					<N8nOption
						v-for="item in parameterOptions"
						:key="item.name"
						:label="
							locale.nodeText(activeNode?.type).collectionOptionDisplayName(parameter, item, path)
						"
						:value="item.name"
					></N8nOption>
				</N8nSelect>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.fixedCollectionParameter {
	padding-left: var(--spacing--sm);

	&.overhaul {
		padding-left: 0;
	}
}

.empty .fixedCollectionSectionHeader {
	margin-bottom: var(--spacing--xs);
}

.iconButton {
	display: flex;
	flex-direction: column;
	position: absolute;
	opacity: 0;
	top: -3px;
	left: calc(-0.5 * var(--spacing--xs));
	transition: opacity 100ms ease-in;
}

// New UI: Custom styling for secondary button
.fixedCollectionParameter.overhaul .controls {
	margin-top: var(--spacing--xs);

	:global(.button) {
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
}

// Old UI: Custom styling for tertiary button to look like input
.fixedCollectionParameter:not(.overhaul) .controls {
	:global(.button) {
		font-weight: var(--font-weight-normal);
		--button--color--text: var(--color--text--shade-1);
		--button--border-color: var(--color--foreground);
		--button--color--background: var(--color--background);

		--button--color--text--hover: var(--color--text--shade-1);
		--button--border-color--hover: var(--color--foreground);
		--button--color--background--hover: var(--color--background);

		--button--color--text--active: var(--color--text--shade-1);
		--button--border-color--active: var(--color--foreground);
		--button--color--background--active: var(--color--background);

		--button--color--text--focus: var(--color--text--shade-1);
		--button--border-color--focus: var(--color--foreground);
		--button--color--background--focus: var(--color--background);

		&:active,
		&.active,
		&:focus {
			outline: none;
		}
	}
}

.parameterItem {
	position: relative;
	padding: 0 0 var(--spacing--sm) var(--spacing--sm);

	&:hover > .parameterItemWrapper > .iconButton {
		opacity: 1;
	}

	+ .parameterItem {
		.parameterItemWrapper {
			.defaultTopPadding {
				top: calc(1.2 * var(--spacing--sm));
			}
			.extraTopPadding {
				top: calc(2.2 * var(--spacing--sm));
			}
		}
	}

	&:first-of-type {
		.parameterItemWrapper {
			.defaultTopPadding {
				top: var(--spacing--3xs);
			}
			.extraTopPadding {
				top: var(--spacing--lg);
			}
		}
	}
}

.borderTopDashed {
	border-top: var(--border-width) dashed var(--color--foreground--shade-1);
}

.noItemsExist {
	margin: var(--spacing--xs) 0;
}

:global(.ghost),
:global(.dragging) {
	border-radius: var(--radius);
	padding-right: var(--spacing--xs);
}

:global(.ghost) {
	background-color: var(--color--background);
	opacity: 0.5;
}

:global(.dragging) {
	background-color: var(--color--background--light-3);
	opacity: 0.7;

	.parameterItemWrapper {
		border: none;
	}
}
</style>
