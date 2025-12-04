<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { listenForModalChanges, useUIStore } from '@/app/stores/ui.store';
import { listenForCredentialChanges, useCredentialsStore } from '../../credentials.store';
import { assert } from '@n8n/utils/assert';
import CredentialsDropdown from './CredentialsDropdown.vue';
import { useI18n } from '@n8n/i18n';
import { CREDENTIAL_EDIT_MODAL_KEY } from '../../credentials.constants';

import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useToast } from '@/app/composables/useToast';
import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '../../credentials.types';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
const props = defineProps<{
	appName: string;
	credentialType: string;
	selectedCredentialId: string | null;
	showDelete?: boolean;
	hideCreateNew?: boolean;
}>();

const emit = defineEmits<{
	credentialSelected: [credentialId: string];
	credentialDeselected: [];
	credentialModalOpened: [];
	credentialDeleted: [credentialId: string];
}>();

const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();

const wasModalOpenedFromHere = ref(false);
const currentCredential = ref<ICredentialsResponse | ICredentialsDecryptedResponse | null>(null);

const availableCredentials = computed(() => {
	const credByType = credentialsStore.getCredentialsByType(props.credentialType);
	// Only show personal credentials since templates are created in personal by default
	// Here, we don't care about sharing because credentials cannot be shared with personal project
	return credByType.filter(
		(credential) => !credential.homeProject || credential.homeProject?.type === 'personal',
	);
});

const credentialOptions = computed(() => {
	return availableCredentials.value.map((credential) => ({
		id: credential.id,
		name: credential.name,
		typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
	}));
});

async function loadCurrentCredential() {
	if (!props.selectedCredentialId) {
		return;
	}

	try {
		const currentCredentials = await credentialsStore.getCredentialData({
			id: props.selectedCredentialId,
		});

		if (!currentCredentials) {
			throw new Error(
				i18n.baseText('credentialEdit.credentialEdit.couldNotFindCredentialWithId') +
					':' +
					props.selectedCredentialId,
			);
		}

		currentCredential.value = currentCredentials;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.loadCredential.title'),
		);

		return;
	}
}

const homeProject = computed(() => {
	const { currentProject, personalProject } = projectsStore;
	return currentProject ?? personalProject;
});

const credentialPermissions = computed(() => {
	return getResourcePermissions(
		(currentCredential.value as ICredentialsResponse)?.scopes ?? homeProject.value?.scopes,
	).credential;
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
const deleteCredential = async () => {
	assert(props.selectedCredentialId);

	const credentialIdToDelete = props.selectedCredentialId;

	const deleteConfirmed = await message.confirm(
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.message', {
			interpolate: {
				savedCredentialName: currentCredential.value?.name ?? props.selectedCredentialId,
			},
		}),
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline'),
		{
			confirmButtonText: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
			),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await credentialsStore.deleteCredential({ id: credentialIdToDelete });
		currentCredential.value = null;
		emit('credentialDeleted', credentialIdToDelete);
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('credentialEdit.credentialEdit.showError.deleteCredential.title'),
		);
	}
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

watch(
	() => props.selectedCredentialId,
	() => {
		void loadCurrentCredential();
	},
	{ immediate: true },
);
</script>

<template>
	<div>
		<div v-if="credentialOptions.length > 0 || props.hideCreateNew" :class="$style.dropdown">
			<CredentialsDropdown
				:credential-type="props.credentialType"
				:credential-options="credentialOptions"
				:selected-credential-id="props.selectedCredentialId"
				data-test-id="credential-dropdown"
				:permissions="credentialPermissions"
				@credential-selected="onCredentialSelected"
				@new-credential="createNewCredential"
			/>

			<N8nTooltip
				:disabled="credentialPermissions.update"
				:content="i18n.baseText('nodeCredentials.updateCredential.permissionDenied')"
				:placement="'top'"
			>
				<N8nIconButton
					icon="pen"
					type="secondary"
					:class="{
						[$style.edit]: true,
						[$style.invisible]: !props.selectedCredentialId,
					}"
					:title="i18n.baseText('nodeCredentials.updateCredential')"
					data-test-id="credential-edit-button"
					:disabled="!credentialPermissions.update"
					@click="editCredential()"
				/>
			</N8nTooltip>

			<N8nTooltip
				:disabled="credentialPermissions.update"
				:content="i18n.baseText('nodeCredentials.deleteCredential.permissionDenied')"
				:placement="'top'"
			>
				<N8nIconButton
					v-if="props.showDelete && props.selectedCredentialId"
					native-type="button"
					:title="i18n.baseText('nodeCredentials.deleteCredential')"
					icon="trash-2"
					icon-size="large"
					type="secondary"
					:disabled="!credentialPermissions.delete"
					@click="deleteCredential()"
				/>
			</N8nTooltip>
		</div>

		<N8nButton
			v-else-if="!props.hideCreateNew"
			:label="`Create new ${props.appName} credential`"
			data-test-id="create-credential"
			:disabled="!credentialPermissions.create"
			@click="createNewCredential"
		/>
	</div>
</template>

<style lang="scss" module>
.dropdown {
	display: flex;
	gap: var(--spacing--2xs);
}

.edit {
	display: flex;
	justify-content: center;
	align-items: center;
	min-width: 20px;
	font-size: var(--font-size--sm);
}

.invisible {
	visibility: hidden;
}
</style>
