<script setup lang="ts">
import { computed } from 'vue';
import { useUIStore } from '@/stores';
import { listenForCredentialChanges, useCredentialsStore } from '@/stores/credentials.store';
import { assert } from '@/utils/assert';
import CredentialsDropdown from './CredentialsDropdown.vue';
import { useI18n } from '@/composables/useI18n';

const props = defineProps({
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
});

const $emit = defineEmits({
	credentialSelected: (_credentialId: string) => true,
	credentialDeselected: () => true,
});

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const i18n = useI18n();

const availableCredentials = computed(() => {
	return credentialsStore.getCredentialsByType(props.credentialType);
});

const credentialOptions = computed(() => {
	return availableCredentials.value.map((credential) => ({
		id: credential.id,
		name: credential.name,
		typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
	}));
});

const onCredentialSelected = (credentialId: string) => {
	$emit('credentialSelected', credentialId);
};
const createNewCredential = () => {
	uiStore.openNewCredential(props.credentialType, true);
};
const editCredential = () => {
	assert(props.selectedCredentialId);
	uiStore.openExistingCredential(props.selectedCredentialId);
};

listenForCredentialChanges({
	store: credentialsStore,
	onCredentialCreated: (credential) => {
		// TODO: We should have a better way to detect if credential created was due to
		// user opening the credential modal from this component, as there might be
		// two CredentialPicker components on the same page with same credential type.
		if (credential.type !== props.credentialType) {
			return;
		}

		$emit('credentialSelected', credential.id);
	},
	onCredentialDeleted: (deletedCredentialId) => {
		if (deletedCredentialId !== props.selectedCredentialId) {
			return;
		}

		const optionsWoDeleted = credentialOptions.value
			.map((credential) => credential.id)
			.filter((id) => id !== deletedCredentialId);
		if (optionsWoDeleted.length > 0) {
			$emit('credentialSelected', optionsWoDeleted[0]);
		} else {
			$emit('credentialDeselected');
		}
	},
});
</script>

<template>
	<div>
		<div v-if="credentialOptions.length > 0" :class="$style.dropdown">
			<CredentialsDropdown
				:credential-type="props.credentialType"
				:credential-options="credentialOptions"
				:selected-credential-id="props.selectedCredentialId"
				@credential-selected="onCredentialSelected"
				@new-credential="createNewCredential"
			/>

			<n8n-icon-button
				icon="pen"
				type="secondary"
				:class="{
					[$style.edit]: true,
					[$style.invisible]: !props.selectedCredentialId,
				}"
				:title="i18n.baseText('nodeCredentials.updateCredential')"
				@click="editCredential()"
				data-test-id="credential-edit-button"
			/>
		</div>

		<n8n-button
			v-else
			:label="`Create new ${props.appName} credential`"
			@click="createNewCredential"
			data-test-id="create-credential"
		/>
	</div>
</template>

<style lang="scss" module>
.dropdown {
	display: flex;
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	min-width: 20px;
	margin-left: var(--spacing-2xs);
	font-size: var(--font-size-s);
}

.invisible {
	visibility: hidden;
}
</style>
