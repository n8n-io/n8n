<script lang="ts" setup>
import type { INodeParameters, INodePropertyCollection } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';

import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCollapsiblePanel, N8nHeaderAction } from '@n8n/design-system';
import ParameterInputList from '../ParameterInputList.vue';
import { useCollectionOverhaul } from '@/composables/useCollectionOverhaul';
import { useResolvedExpression } from '@/composables/useResolvedExpression';

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
	titleTemplate?: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:isExpanded': [value: boolean];
	valueChanged: [value: IUpdateInformation];
	delete: [];
}>();

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
				test-id="fixed-collection-item-drag"
			/>
		</template>

		<ParameterInputList
			hide-delete
			is-nested
			:parameters="property.values"
			:node-values="nodeValues"
			:path="propertyPath"
			:is-read-only="isReadOnly"
			:remove-first-parameter-margin="isCollectionOverhaulEnabled"
			:remove-last-parameter-margin="isCollectionOverhaulEnabled"
			@value-changed="handleValueChanged"
		/>
	</N8nCollapsiblePanel>
</template>
