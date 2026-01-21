<script setup lang="ts">
import { computed, provide } from 'vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import useEnvironmentsStore from '@/features/settings/environments.ee/environments.store';
import { useI18n } from '@n8n/i18n';
import type { NodeParameterValueType, Workflow } from 'n8n-workflow';
import type { NodeRequiredParameters, ParameterKey } from '../templates.types';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import { ExpressionLocalResolveContextSymbol } from '@/app/constants';

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
const workflowsStore = useWorkflowsStore();
const environmentsStore = useEnvironmentsStore();
const i18n = useI18n();

const nodeType = computed(() => nodeTypesStore.getNodeType(props.nodeParameters.nodeType));

const node = computed(() => workflowsStore.getNodeByName(props.nodeParameters.nodeName));

const workflowObject = computed(() => workflowsStore.workflowObject as Workflow);

/**
 * Provides expression resolution context for ParameterInputFull and its children
 * (including ResourceLocator) when rendered outside of NDV.
 */
const expressionResolveCtx = computed<ExpressionLocalResolveContext | undefined>(() => {
	if (!node.value) {
		return undefined;
	}

	const nodeName = node.value.name;

	// Find input node for expression resolution
	const inputs = workflowObject.value.getParentNodesByDepth(nodeName, 1);
	const inputNode =
		inputs.length > 0
			? {
					name: inputs[0].name,
					branchIndex: inputs[0].indicies[0] ?? 0,
					runIndex: 0,
				}
			: undefined;

	return {
		localResolve: true,
		envVars: environmentsStore.variablesAsObject,
		workflow: workflowObject.value,
		execution: workflowsStore.workflowExecutionData,
		nodeName,
		additionalKeys: {},
		inputNode,
		connections: workflowsStore.connectionsBySourceNode,
	};
});

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
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
