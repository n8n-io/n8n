<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';

import { type INodeProperties } from 'n8n-workflow';
import { type ParameterOverride } from './parameterInputOverrides';

type Props = {
	parameter: INodeProperties;
	path: string;
	isReadOnly?: boolean;
};

const parameterOverride = defineModel<ParameterOverride>({ required: true });

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
});
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
		:class="$style.overrideSelectableList"
		:inputs="
			Object.entries(parameterOverride.extraProps).map(([name, prop]) => ({
				name,
				...prop,
			}))
		"
		:disabled="isReadOnly"
	>
		<template #displayItem="{ name, tooltip, initialValue, type, typeOptions }">
			<ParameterInputFull
				:parameter="{
					name,
					displayName: name[0].toUpperCase() + name.slice(1),
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

<style lang="scss" module>
.overrideSelectableList {
	margin-top: var(--spacing-2xs);
}
</style>
