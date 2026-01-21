<script setup lang="ts">
import { computed } from 'vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n } from '@n8n/i18n';
import type { NodeParameterValueType } from 'n8n-workflow';
import type { NodeRequiredParameters, ParameterKey } from '../templates.types';

import { N8nHeading } from '@n8n/design-system';
import ParameterInputFull from '@/features/ndv/parameters/components/ParameterInputFull.vue';

const props = defineProps<{
	order: number;
	nodeParameters: NodeRequiredParameters;
	parameterValues: Record<ParameterKey, NodeParameterValueType>;
}>();

const emit = defineEmits<{
	parameterChanged: [event: { parameterKey: ParameterKey; value: NodeParameterValueType }];
}>();

const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();

const nodeType = computed(() => nodeTypesStore.getNodeType(props.nodeParameters.nodeType));

const allParametersFilled = computed(() => {
	return props.nodeParameters.parameters.every((param) => {
		const value = props.parameterValues[param.key] ?? param.currentValue;
		return value !== undefined && value !== '' && value !== null;
	});
});
</script>

<template>
	<li :class="$style.container" data-test-id="setup-parameters-form-step">
		<N8nHeading tag="h2" size="large">
			<div v-if="nodeType" :class="$style.heading" data-test-id="parameter-step-heading">
				<span :class="$style.headingOrder">{{ order }}.</span>
				<span :class="$style.headingIcon"><NodeIcon :node-type="nodeType" /></span>
				{{ nodeParameters.nodeDisplayName }}
			</div>
		</N8nHeading>

		<p :class="$style.description" data-test-id="parameter-step-description">
			{{
				i18n.baseText('templateSetup.parameters.description', {
					interpolate: { nodeName: nodeParameters.nodeName },
				})
			}}
		</p>

		<div :class="$style.parameters">
			<ParameterInputFull
				v-for="param in nodeParameters.parameters"
				:key="param.key"
				:parameter="param.parameter"
				:hide-issues="false"
				:value="parameterValues[param.key] ?? param.currentValue"
				:path="`parameters.${param.key}`"
				:is-read-only="false"
				:hide-label="false"
				:node-values="parameterValues"
				:show-delete="false"
				@update="emit('parameterChanged', { parameterKey: param.key, value: $event.value })"
			/>
		</div>
	</li>
</template>

<style lang="scss" module>
.container {
	list-style: none;
}

.heading {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing--2xs);
}

.headingOrder {
	font-weight: var(--font-weight--bold);
	margin-right: var(--spacing--xs);
}

.headingIcon {
	margin-right: var(--spacing--2xs);
}

.description {
	margin-bottom: var(--spacing--lg);
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.parameters {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: 400px;
}

.parameterOk {
	margin-top: var(--spacing--sm);
	font-size: 24px;
}

.invisible {
	visibility: hidden;
}
</style>
