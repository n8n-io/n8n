<template>
	<div @keydown.stop :class="$style.container" v-if="credentialProperties.length">
		<form
			v-for="parameter in credentialProperties"
			:key="parameter.name"
			autocomplete="off"
			data-test-id="credential-connection-parameter"
			@submit.prevent
		>
			<!-- Why form? to break up inputs, to prevent Chrome autofill -->
			<n8n-notice v-if="parameter.type === 'notice'" :content="parameter.displayName" />
			<parameter-input-expanded
				v-else
				:parameter="parameter"
				:value="credentialData[parameter.name]"
				:documentationUrl="documentationUrl"
				:showValidationWarnings="showValidationWarnings"
				eventSource="credentials"
				@change="valueChanged"
			/>
		</form>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { IUpdateInformation } from '../../Interface';

import ParameterInputExpanded from '../ParameterInputExpanded.vue';

export default Vue.extend({
	name: 'CredentialsInput',
	props: [
		'credentialProperties',
		'credentialData', // ICredentialsDecryptedResponse
		'documentationUrl',
		'showValidationWarnings',
	],
	components: {
		ParameterInputExpanded,
	},
	methods: {
		valueChanged(parameterData: IUpdateInformation) {
			const name = parameterData.name.split('.').pop();

			this.$emit('change', {
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
