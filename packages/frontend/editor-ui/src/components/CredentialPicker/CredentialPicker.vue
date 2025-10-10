<script setup lang="ts">
import { computed, ref } from 'vue';
import { listenForModalChanges, useUIStore } from '@/stores/ui.store';
import { listenForCredentialChanges, useCredentialsStore } from '@/stores/credentials.store';
import { assert } from '@n8n/utils/assert';
import CredentialsDropdown from './CredentialsDropdown.vue';
import { useI18n } from '@n8n/i18n';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/constants';

import { N8nButton, N8nIconButton } from '@n8n/design-system';
const props = defineProps<{
	appName: string;
	credentialType: string;
	selectedCredentialId: string | null;
}>();

const emit = defineEmits<{
	credentialSelected: [credentialId: string];
	credentialDeselected: [];
	credentialModalOpened: [];
}>();

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const i18n = useI18n();

const wasModalOpenedFromHere = ref(false);

const availableCredentials = computed(() => {
	const credByType = credentialsStore.getCredentialsByType(props.credentialType);
	// Only show personal credentials since templates are created in personal by default
	// Here, we don't care about sharing because credentials cannot be shared with personal project
	return credByType.filter((credential) => credential.homeProject?.type === 'personal');
});

const credentialOptions = computed(() => {
	return availableCredentials.value.map((credential) => ({
		id: credential.id,
		name: credential.name,
		typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
	}));
});

const onCredentialSelected = (credentialId: string) => {
	emit('credentialSelected', credentialId);
};
const createNewCredential = () => {
	uiStore.openNewCredential(props.credentialType, true);
	wasModalOpenedFromHere.value = true;
	emit('credentialModalOpened');
};
const editCredential = () => {
	assert(props.selectedCredentialId);
	uiStore.openExistingCredential(props.selectedCredentialId);
	wasModalOpenedFromHere.value = true;
	emit('credentialModalOpened');
};

listenForCredentialChanges({
	store: credentialsStore,
	onCredentialCreated: (credential) => {
		if (!wasModalOpenedFromHere.value) {
			return;
		}

		emit('credentialSelected', credential.id);
	},
	onCredentialDeleted: (deletedCredentialId) => {
		if (!wasModalOpenedFromHere.value) {
			return;
		}

		if (deletedCredentialId !== props.selectedCredentialId) {
			return;
		}

		const optionsWoDeleted = credentialOptions.value
			.map((credential) => credential.id)
			.filter((id) => id !== deletedCredentialId);
		if (optionsWoDeleted.length > 0) {
			emit('credentialSelected', optionsWoDeleted[0]);
		} else {
			emit('credentialDeselected');
		}
	},
});

listenForModalChanges({
	store: uiStore,
	onModalClosed(modalName) {
		if (modalName === CREDENTIAL_EDIT_MODAL_KEY && wasModalOpenedFromHere.value) {
			wasModalOpenedFromHere.value = false;
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
				data-test-id="credential-dropdown"
				@credential-selected="onCredentialSelected"
				@new-credential="createNewCredential"
			/>

			<N8nIconButton
				icon="pen"
				type="secondary"
				:class="{
					[$style.edit]: true,
					[$style.invisible]: !props.selectedCredentialId,
				}"
				:title="i18n.baseText('nodeCredentials.updateCredential')"
				data-test-id="credential-edit-button"
				@click="editCredential()"
			/>
		</div>

		<N8nButton
			v-else
			:label="`Create new ${props.appName} credential`"
			data-test-id="create-credential"
			@click="createNewCredential"
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
	margin-left: var(--spacing--2xs);
	font-size: var(--font-size--sm);
}

.invisible {
	visibility: hidden;
}
</style>
