<script lang="ts" setup>
import type { INodeParameters, INodeProperties, NodeParameterValueType } from 'n8n-workflow';
import { useCollectionOverhaul } from '@/app/composables/useCollectionOverhaul';
import FixedCollectionParameterLegacy from './FixedCollectionParameterLegacy.vue';
import FixedCollectionParameterNew from './FixedCollectionParameterNew.vue';

const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();

export type Props = {
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: Record<string, INodeParameters[] | INodeParameters>;
	isReadOnly?: boolean;
	isNested?: boolean;
	isNewlyAdded?: boolean;
	canDelete?: boolean;
	hiddenIssuesInputs?: string[];
};

type ValueChangedEvent = {
	name: string;
	value: NodeParameterValueType;
	type?: 'optionsOrderChanged';
};

withDefaults(defineProps<Props>(), { values: undefined, hiddenIssuesInputs: () => [] });

const emit = defineEmits<{
	valueChanged: [value: ValueChangedEvent];
	delete: [];
}>();
</script>

<template>
	<FixedCollectionParameterLegacy
		v-if="!isCollectionOverhaulEnabled"
		v-bind="$props"
		@value-changed="emit('valueChanged', $event)"
	/>
	<FixedCollectionParameterNew
		v-else
		v-bind="$props"
		@value-changed="emit('valueChanged', $event)"
		@delete="emit('delete')"
	/>
</template>
