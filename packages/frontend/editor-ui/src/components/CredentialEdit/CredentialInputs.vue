<script setup lang="ts">
import type {
	ICredentialDataDecryptedObject,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import ParameterInputExpanded from '../ParameterInputExpanded.vue';
import { computed } from 'vue';

type Props = {
	credentialProperties: INodeProperties[];
	credentialData: ICredentialDataDecryptedObject;
	documentationUrl: string;
	showValidationWarnings?: boolean;
};

const props = defineProps<Props>();

const credentialDataValues = computed(
	() => props.credentialData as Record<string, NodeParameterValueType>,
);

const emit = defineEmits<{
	update: [value: IUpdateInformation];
}>();

function valueChanged(parameterData: IUpdateInformation) {
	const name = parameterData.name.split('.').pop() ?? parameterData.name;

	emit('update', {
		name,
		value: parameterData.value,
	});
}
</script>

<template>
	<div v-if="credentialProperties.length" :class="$style.container" @keydown.stop>
		<form
			v-for="parameter in credentialProperties"
			:key="parameter.name"
			autocomplete="off"
			data-test-id="credential-connection-parameter"
			@submit.prevent
		>
			<!-- Why form? to break up inputs, to prevent Chrome autofill -->
			<n8n-notice v-if="parameter.type === 'notice'" :content="parameter.displayName" />
			<ParameterInputExpanded
				v-else
				:parameter="parameter"
				:value="credentialDataValues[parameter.name]"
				:documentation-url="documentationUrl"
				:show-validation-warnings="showValidationWarnings"
				:label="{ size: 'medium' }"
				event-source="credentials"
				@update="valueChanged"
			/>
		</form>
	</div>
</template>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-l);
	}
}
</style>
