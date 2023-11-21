<template>
	<div>
		<div v-if="credentialOptions.length > 0" class="dropdown">
			<CredentialsDropdown
				:credential-type="credentialType"
				:credential-options="credentialOptions"
				:selected-credential-id="selectedCredentialId"
				@credential-selected="onCredentialSelected"
				@new-credential="createNewCredential"
			/>

			<n8n-icon-button
				icon="pen"
				type="secondary"
				:class="{
					edit: true,
					invisible: !selectedCredentialId,
				}"
				:title="$locale.baseText('nodeCredentials.updateCredential')"
				@click="editCredential()"
				data-test-id="credential-edit-button"
			/>
		</div>

		<n8n-button v-else :label="`Create new ${appName} credential`" @click="createNewCredential" />
	</div>
</template>

<script lang="ts">
import { useUIStore } from '@/stores';
import type { CredentialsStore } from '@/stores/credentials.store';
import { listenForCredentialChanges, useCredentialsStore } from '@/stores/credentials.store';
import { mapStores } from 'pinia';
import { defineComponent } from 'vue';
import { assert } from '@/utils/assert';
import CredentialsDropdown from './CredentialsDropdown.vue';

export default defineComponent({
	name: 'CredentialPicker',
	components: {
		CredentialsDropdown,
	},
	props: {
		appName: {
			type: String,
			required: true,
		},
		credentialType: {
			type: String,
			required: true,
		},
		selectedCredentialId: {
			type: String,
			required: false,
		},
	},
	emits: {
		credentialSelected: (_credentialId: string) => true,
		credentialDeselected: () => true,
	},
	data() {
		return {
			NEW_CREDENTIALS_TEXT: `- ${this.$locale.baseText('nodeCredentials.createNew')} -`,
		};
	},
	computed: {
		...mapStores(useCredentialsStore, useUIStore),
		availableCredentials() {
			return this.credentialsStore.getCredentialsByType(this.credentialType);
		},
		credentialOptions() {
			return this.availableCredentials.map((credential) => ({
				id: credential.id,
				name: credential.name,
				typeDisplayName: this.credentialsStore.getCredentialTypeByName(credential.type)
					?.displayName,
			}));
		},
	},
	methods: {
		onCredentialSelected(credentialId: string) {
			if (credentialId === this.NEW_CREDENTIALS_TEXT) {
				this.uiStore.openNewCredential(this.credentialType, true);
			} else {
				this.$emit('credentialSelected', credentialId);
			}
		},
		createNewCredential() {
			this.uiStore.openNewCredential(this.credentialType, true);
		},
		editCredential() {
			assert(this.selectedCredentialId);
			this.uiStore.openExistingCredential(this.selectedCredentialId);
		},
	},
	mounted() {
		listenForCredentialChanges({
			store: this.credentialsStore as CredentialsStore,
			onCredentialCreated: (credential) => {
				// TODO: We should have a better way to detect if credential created was due to
				// user opening the credential modal from this component, as there might be
				// two CredentialPicker components on the same page with same credential type.
				if (credential.type !== this.credentialType) {
					return;
				}

				this.$emit('credentialSelected', credential.id);
			},
			onCredentialDeleted: (deletedCredentialId) => {
				if (deletedCredentialId !== this.selectedCredentialId) {
					return;
				}

				const optionsWoDeleted = this.credentialOptions
					.map((credential) => credential.id)
					.filter((id) => id !== deletedCredentialId);
				if (optionsWoDeleted.length > 0) {
					this.$emit('credentialSelected', optionsWoDeleted[0]);
				} else {
					this.$emit('credentialDeselected');
				}
			},
		});
	},
});
</script>

<style lang="scss" scope>
.container {
	display: flex;
}

.dropdown {
	display: flex;
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	// color: var(--color-text-base);
	min-width: 20px;
	margin-left: var(--spacing-2xs);
	font-size: var(--font-size-s);
}

.input {
	display: flex;
	align-items: center;
}

.credentialOption {
	display: flex;
	flex-direction: column;
}

.invisible {
	visibility: hidden;
}
</style>
