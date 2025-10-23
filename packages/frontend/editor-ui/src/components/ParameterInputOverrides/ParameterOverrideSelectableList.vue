<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';

import { type INodeProperties } from 'n8n-workflow';
import { buildValueFromOverride, type FromAIOverride } from '../../utils/fromAIOverrideUtils';
import { computed } from 'vue';
import { N8nSelectableList } from '@n8n/design-system';
import ParameterInputFull from '@/components/ParameterInputFull.vue';

type Props = {
	parameter: INodeProperties;
	path: string;
	isReadOnly?: boolean;
};

const parameterOverride = defineModel<FromAIOverride>({ required: true });

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
});

const inputs = computed(() =>
	Object.entries(parameterOverride.value.extraProps).map(([name, prop]) => ({
		name,
		...prop,
	})),
);

function proper(s: string) {
	return s[0].toUpperCase() + s.slice(1);
}

const emit = defineEmits<{
	update: [value: IUpdateInformation];
}>();

function valueChanged(parameterData: IUpdateInformation) {
	emit('update', parameterData);
}

function onExtraPropValueRemove(name: string) {
	delete parameterOverride.value.extraPropValues[name];
	valueChanged({
		name: props.path,
		value: buildValueFromOverride(parameterOverride.value, props, true),
	});
}
</script>

<template>
	<N8nSelectableList
		v-model="parameterOverride.extraPropValues"
		class="mt-2xs"
		:inputs="inputs"
		:disabled="isReadOnly"
		@remove-item="onExtraPropValueRemove"
	>
		<template #displayItem="{ name, tooltip, initialValue, type, typeOptions }">
			<ParameterInputFull
				:parameter="{
					name,
					displayName: proper(name),
					type,
					default: initialValue,
					noDataExpression: true,
					description: tooltip,
					typeOptions,
				}"
				:is-read-only="isReadOnly"
				:value="parameterOverride?.extraPropValues[name]"
				:path="`${path}.${name}`"
				input-size="small"
				@update="
					(x: IUpdateInformation) => {
						parameterOverride.extraPropValues[name] = x.value;
						valueChanged({
							name: props.path,
							value: buildValueFromOverride(parameterOverride, props, true),
						});
					}
				"
			/>
		</template>
	</N8nSelectableList>
</template>
