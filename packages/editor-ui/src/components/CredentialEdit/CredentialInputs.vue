<template>
	<div @keydown.stop :class="$style.container">
		<div v-for="parameter in credentialProperties" :key="parameter.name">
			<n8n-input-label
				:label="parameter.displayName"
				:tooltipText="parameter.description"
				:required="parameter.required"
			>
				<parameter-input
					:parameter="parameter"
					:value="credentialData[parameter.name]"
					:path="parameter.name"
					:hideIssues="true"
					:displayOptions="true"
					:documentationUrl="documentationUrl"
					:validateRequired="true"
					:showValidationWarnings="showValidationWarnings"

					@textInput="valueChanged"
					@valueChanged="valueChanged"
					inputSize="large"
				/>
			</n8n-input-label>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import { IUpdateInformation } from '../../Interface';

import ParameterInput from '../ParameterInput.vue';

export default Vue.extend({
	name: 'CredentialsInput',
	props: [
		'credentialProperties',
		'credentialData', // ICredentialsDecryptedResponse
		'documentationUrl',
		'showValidationWarnings',
	],
	components: {
		ParameterInput,
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
