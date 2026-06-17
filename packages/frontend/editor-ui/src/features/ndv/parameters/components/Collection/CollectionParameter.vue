<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';
import type { INodeParameters, INodeProperties } from 'n8n-workflow';

import { useCollectionOverhaul } from '@/app/composables/useCollectionOverhaul';
import CollectionParameterLegacy from './CollectionParameterLegacy.vue';
import CollectionParameterNew from './CollectionParameterNew.vue';

const { isEnabled: isCollectionOverhaulEnabled } = useCollectionOverhaul();

export interface Props {
	hideDelete?: boolean;
	nodeValues: INodeParameters;
	parameter: INodeProperties;
	path: string;
	values?: INodeParameters;
	isReadOnly?: boolean;
	isNested?: boolean;
	isNewlyAdded?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
	valueChanged: [value: IUpdateInformation];
	delete: [];
}>();
</script>

<template>
	<CollectionParameterLegacy
		v-if="!isCollectionOverhaulEnabled"
		v-bind="$props"
		@value-changed="emit('valueChanged', $event)"
	/>
	<CollectionParameterNew
		v-else
		v-bind="$props"
		@value-changed="emit('valueChanged', $event)"
		@delete="emit('delete')"
	/>
</template>
