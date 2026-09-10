<script setup lang="ts">
import type {
	ICredentialDataDecryptedObject,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import CopyInput from '@/app/components/CopyInput.vue';
import ParameterInputExpanded from '@/features/ndv/parameters/components/ParameterInputExpanded.vue';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { computed } from 'vue';

import { N8nInput, N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
type Props = {
	credentialProperties: INodeProperties[];
	credentialData: ICredentialDataDecryptedObject;
	documentationUrl: string;
	showValidationWarnings?: boolean;
	compact?: boolean;
	credentialType?: string;
};

const props = defineProps<Props>();
const i18n = useI18n();

const { check: envFeatureFlag } = useEnvFeatureFlag();

const credentialDataValues = computed(
	() => props.credentialData as Record<string, NodeParameterValueType>,
);

const visibleProperties = computed(() =>
	props.credentialProperties.filter(
		(parameter) => !parameter.envFeatureFlag || envFeatureFlag.value(parameter.envFeatureFlag),
	),
);

const emit = defineEmits<{
	update: [value: IUpdateInformation];
}>();

function valueChanged(parameterData: IUpdateInformation) {
	emit('update', parameterData);
}
</script>

<template>
	<div
		v-if="visibleProperties.length"
		:class="[$style.container, { [$style.compact]: compact }]"
		@keydown.stop
	>
		<form
			v-for="parameter in visibleProperties"
			:key="parameter.name"
			autocomplete="off"
			data-test-id="credential-connection-parameter"
			@submit.prevent
		>
			<!-- Why form? to break up inputs, to prevent Chrome autofill -->
			<N8nNotice v-if="parameter.type === 'notice'" :content="parameter.displayName" />
			<CopyInput
				v-else-if="parameter.type === 'string' && parameter.typeOptions?.copyButton"
				:label="parameter.displayName"
				:hint="parameter.description"
				:value="String(credentialDataValues[parameter.name] ?? parameter.default ?? '')"
			/>
			<N8nInput
				v-else-if="compact && parameter.type === 'string'"
				:model-value="
					typeof credentialDataValues[parameter.name] === 'string'
						? String(credentialDataValues[parameter.name])
						: ''
				"
				:type="parameter.typeOptions?.password ? 'password' : 'text'"
				:placeholder="i18n.credText(credentialType ?? '').inputLabelDisplayName(parameter)"
				:aria-label="i18n.credText(credentialType ?? '').inputLabelDisplayName(parameter)"
				:autocomplete="parameter.typeOptions?.password ? 'new-password' : 'off'"
				size="small"
				@update:model-value="valueChanged({ name: parameter.name, value: $event })"
			/>
			<ParameterInputExpanded
				v-else
				:parameter="parameter"
				:value="credentialDataValues[parameter.name]"
				:node-values="credentialDataValues"
				:documentation-url="documentationUrl"
				:show-validation-warnings="showValidationWarnings"
				:label="{ size: compact ? 'small' : 'medium' }"
				event-source="credentials"
				@update="valueChanged"
			/>
		</form>
	</div>
</template>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing--lg);
	}
}

.compact {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	> * {
		margin-bottom: 0;
	}
}
</style>
