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
				:value="credentialData[parameter.name]"
				:documentation-url="documentationUrl"
				:show-validation-warnings="showValidationWarnings"
				:label="label"
				event-source="credentials"
				@update="valueChanged"
			/>
		</form>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { IParameterLabel } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import ParameterInputExpanded from '../ParameterInputExpanded.vue';

export default defineComponent({
	name: 'CredentialsInput',
	components: {
		ParameterInputExpanded,
	},
	props: [
		'credentialProperties',
		'credentialData', // ICredentialsDecryptedResponse
		'documentationUrl',
		'showValidationWarnings',
	],
	data(): { label: IParameterLabel } {
		return {
			label: {
				size: 'medium',
			},
		};
	},
	methods: {
		valueChanged(parameterData: IUpdateInformation) {
			const name = parameterData.name.split('.').pop();

			this.$emit('update', {
				name,
				value: parameterData.value,
			});
		},
	},
});
</script>

<style lang="scss" module>
.container {
	> * {
		margin-bottom: var(--spacing-l);
	}
}
</style>
