<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';

import { type INodeProperties } from 'n8n-workflow';
import { type ParameterOverride } from './parameterInputOverrides';
import { computed } from 'vue';

type Props = {
	parameter: INodeProperties;
	path: string;
	isReadOnly?: boolean;
};

const parameterOverride = defineModel<ParameterOverride>({ required: true });

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
</script>

<template>
	<N8nSelectableList
		v-model="parameterOverride.extraPropValues"
		class="mt-2xs"
		:inputs="inputs"
		:disabled="isReadOnly"
	>
		<template #displayItem="{ name, tooltip, initialValue, type, typeOptions }">
			<ParameterInputFull
				:parameter="{
					name,
					displayName: proper(name[0]),
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
					(x) => {
						parameterOverride.extraPropValues[name] = x.value;
						valueChanged({
							name: props.path,
							value: parameterOverride.buildValueFromOverride(props, true),
						});
					}
				"
			/>
		</template>
	</N8nSelectableList>
</template>
