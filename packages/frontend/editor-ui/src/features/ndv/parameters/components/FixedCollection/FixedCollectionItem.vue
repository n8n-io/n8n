<script lang="ts" setup>
import type { INodeParameters, INodeProperties, INodePropertyCollection } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';

import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { ActionDropdownItem } from '@n8n/design-system';
import {
	N8nActionDropdown,
	N8nButton,
	N8nCollapsiblePanel,
	N8nHeaderAction,
} from '@n8n/design-system';
import ParameterInputList from '../ParameterInputList.vue';
import { useCollectionOverhaul } from '@/app/composables/useCollectionOverhaul';
import { useResolvedExpression } from '@/app/composables/useResolvedExpression';

const locale = useI18n();
const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();

export type Props = {
	itemId: string;
	property: INodePropertyCollection;
	itemData: INodeParameters;
	itemIndex: number;
	stableIndex: number;
	nodeValues: INodeParameters;
	propertyPath: string;
	isReadOnly: boolean;
	isExpanded: boolean;
	sortable: boolean;
	disableAnimation: boolean;
	isDragging: boolean;
	titleTemplate?: string;
	visiblePropertyValues: INodeProperties[];
	pickerPropertyValues: INodeProperties[];
	isOptionalValueAdded: (valueName: string) => boolean;
	addOptionalFieldButtonText: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:isExpanded': [value: boolean];
	valueChanged: [value: IUpdateInformation];
	delete: [];
	toggleOptionalValue: [valueName: string];
}>();

const hasOptionalFieldsToAdd = computed(
	() => props.pickerPropertyValues.length > 0 && !props.isReadOnly,
);

const pickerDropdownItems = computed(
	(): Array<ActionDropdownItem<string>> =>
		props.pickerPropertyValues.map((value) => ({
			id: value.name,
			label: value.displayName || value.name,
			checked: props.isOptionalValueAdded(value.name),
		})),
);

const defaultTitle = computed(() => `${props.property.displayName} ${props.stableIndex + 1}`);

const { resolvedExpression } = useResolvedExpression({
	expression: () => props.titleTemplate ?? '',
	additionalData: () => ({
		$collection: {
			item: {
				value: props.itemData,
				index: props.stableIndex,
				properties: props.property.values,
			},
		},
	}),
});

const isValidResolvedTitle = (resolved: unknown): resolved is string =>
	!!resolved && resolved !== 'undefined' && resolved !== 'null' && typeof resolved === 'string';

const itemTitle = computed(() => {
	if (!props.titleTemplate) return defaultTitle.value;
	const resolved = resolvedExpression.value;
	return isValidResolvedTitle(resolved) ? resolved : defaultTitle.value;
});

const handleValueChanged = (parameterData: IUpdateInformation) =>
	emit('valueChanged', parameterData);
</script>

<template>
	<N8nCollapsiblePanel
		:key="itemId"
		:model-value="isExpanded"
		:title="itemTitle"
		:data-item-key="itemId"
		:disable-animation="disableAnimation"
		@update:model-value="emit('update:isExpanded', $event)"
	>
		<template v-if="!isReadOnly" #actions>
			<N8nHeaderAction
				icon="trash-2"
				:label="locale.baseText('fixedCollectionParameter.deleteItem')"
				:tooltip="
					locale.baseText('fixedCollectionParameter.deleteParameter', {
						interpolate: { parameter: itemTitle },
					})
				"
				danger
				test-id="fixed-collection-item-delete"
				@click="emit('delete')"
			/>
			<N8nHeaderAction
				v-if="sortable"
				icon="grip-vertical"
				:label="locale.baseText('fixedCollectionParameter.dragItem')"
				:class="['drag-handle', $style.dragHandle, { [$style.dragging]: isDragging }]"
				test-id="fixed-collection-item-drag"
			/>
		</template>

		<ParameterInputList
			hide-delete
			is-nested
			:parameters="visiblePropertyValues"
			:node-values="nodeValues"
			:path="propertyPath"
			:is-read-only="isReadOnly"
			:remove-first-parameter-margin="isCollectionOverhaulEnabled"
			:remove-last-parameter-margin="isCollectionOverhaulEnabled"
			@value-changed="handleValueChanged"
		/>
		<div
			v-if="hasOptionalFieldsToAdd"
			:class="$style.addOption"
			data-test-id="fixed-collection-add-property"
		>
			<N8nActionDropdown :items="pickerDropdownItems" @select="emit('toggleOptionalValue', $event)">
				<template #activator>
					<N8nButton
						class="n8n-button--highlightFill"
						variant="subtle"
						icon="plus"
						:label="addOptionalFieldButtonText"
					/>
				</template>
			</N8nActionDropdown>
		</div>
	</N8nCollapsiblePanel>
</template>

<style lang="scss" module>
.dragHandle {
	cursor: grab;
}

.dragging {
	cursor: grabbing;
}

.addOption {
	margin-bottom: var(--spacing--xs);
	padding-left: var(--spacing--xs);
}
</style>
