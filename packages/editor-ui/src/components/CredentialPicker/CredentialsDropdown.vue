<template>
	<n8n-select
		size="small"
		:modelValue="selectedCredentialId"
		@update:modelValue="onCredentialSelected"
	>
		<n8n-option
			v-for="item in credentialOptions"
			:data-test-id="`node-credentials-select-item-${item.id}`"
			:key="item.id"
			:label="item.name"
			:value="item.id"
		>
			<div class="credentialOption mt-2xs mb-2xs">
				<n8n-text bold>{{ item.name }}</n8n-text>
				<n8n-text size="small">{{ item.typeDisplayName }}</n8n-text>
			</div>
		</n8n-option>
		<n8n-option
			data-test-id="node-credentials-select-item-new"
			:key="NEW_CREDENTIALS_TEXT"
			:value="NEW_CREDENTIALS_TEXT"
			:label="NEW_CREDENTIALS_TEXT"
		>
		</n8n-option>
	</n8n-select>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export type CredentialOption = {
	id: string;
	name: string;
	typeDisplayName: string | undefined;
};

export default defineComponent({
	name: 'CredentialsDropdown',
	props: {
		credentialType: {
			type: String,
			required: true,
		},
		credentialOptions: {
			type: Array as PropType<CredentialOption[]>,
			required: true,
		},
		selectedCredentialId: {
			type: String,
			required: false,
		},
	},
	emits: {
		credentialSelected: (_credentialId: string) => true,
		newCredential: () => true,
	},
	data() {
		return {
			NEW_CREDENTIALS_TEXT: `- ${this.$locale.baseText('nodeCredentials.createNew')} -`,
		};
	},
	computed: {},
	methods: {
		onCredentialSelected(credentialId: string) {
			if (credentialId === this.NEW_CREDENTIALS_TEXT) {
				this.$emit('newCredential');
			} else {
				this.$emit('credentialSelected', credentialId);
			}
		},
	},
});
</script>

<style lang="scss" scope>
.credentialOption {
	display: flex;
	flex-direction: column;
}
</style>
