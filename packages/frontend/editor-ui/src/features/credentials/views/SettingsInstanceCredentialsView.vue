<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import dateformat from 'dateformat';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nLoading2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import TimeAgo from '@/app/components/TimeAgo.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '../credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY, CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import CredentialIcon from '../components/CredentialIcon.vue';
import type { ICredentialsResponse } from '../credentials.types';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const message = useMessage();
const toast = useToast();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();

const credentials = ref<ICredentialsResponse[]>([]);
const isLoading = ref(true);

const CREDENTIAL_ITEM_ACTIONS = {
	EDIT: 'edit',
	DELETE: 'delete',
} as const;

const actions = computed(() => [
	{ label: i18n.baseText('generic.edit'), value: CREDENTIAL_ITEM_ACTIONS.EDIT },
	{ label: i18n.baseText('generic.delete'), value: CREDENTIAL_ITEM_ACTIONS.DELETE },
]);

const currentYear = new Date().getFullYear().toString();

function formatCreatedAt(date: string): string {
	return dateformat(date, `d mmmm${String(date).startsWith(currentYear) ? '' : ', yyyy'}`);
}

function getTypeDisplayName(type: string): string {
	return credentialsStore.getCredentialTypeByName(type)?.displayName ?? type;
}

async function fetchCredentials() {
	try {
		credentials.value = await credentialsStore.fetchInstanceCredentials();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.instanceCredentials.showError.fetch.title'));
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.instanceCredentials'));
	try {
		await Promise.all([
			// Types drive the icon and display name; a failure there shouldn't block the list.
			credentialsStore.fetchCredentialTypes(false).catch(() => {}),
			fetchCredentials(),
		]);
	} finally {
		isLoading.value = false;
	}
});

// Re-fetch when the credential edit modal closes: it covers create, rotate and rename.
watch(
	() => uiStore.isModalActiveById[CREDENTIAL_EDIT_MODAL_KEY],
	async (isOpen, wasOpen) => {
		if (wasOpen && !isOpen) {
			await fetchCredentials();
		}
	},
);

function addCredential() {
	// The type-select modal reads `availability` from its modal data and presets
	// it on the credential created from it.
	uiStore.openModalWithData({
		name: CREDENTIAL_SELECT_MODAL_KEY,
		data: { availability: 'instance' },
	});
}

function editCredential(credential: ICredentialsResponse) {
	uiStore.openExistingCredential(credential.id);
}

async function deleteCredential(credential: ICredentialsResponse) {
	const deleteConfirmed = await message.confirm(
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.message', {
			interpolate: { savedCredentialName: credential.name },
		}),
		i18n.baseText('credentialEdit.credentialEdit.confirmMessage.deleteCredential.headline'),
		{
			confirmButtonText: i18n.baseText(
				'credentialEdit.credentialEdit.confirmMessage.deleteCredential.confirmButtonText',
			),
		},
	);
	if (deleteConfirmed !== MODAL_CONFIRM) return;

	try {
		await credentialsStore.deleteCredential({ id: credential.id });
		credentials.value = credentials.value.filter((c) => c.id !== credential.id);
	} catch (error) {
		// The backend refuses deletion while an instance-level feature (e.g. the
		// AI Assistant model) still references the credential; surface its message.
		toast.showError(error, i18n.baseText('settings.instanceCredentials.showError.delete.title'));
	}
}

async function onAction(action: string, credential: ICredentialsResponse) {
	switch (action) {
		case CREDENTIAL_ITEM_ACTIONS.EDIT:
			editCredential(credential);
			break;
		case CREDENTIAL_ITEM_ACTIONS.DELETE:
			await deleteCredential(credential);
			break;
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="instance-credentials-settings">
		<div class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.instanceCredentials') }}
				</N8nHeading>
				<N8nText color="text-base" size="medium">
					{{ i18n.baseText('settings.instanceCredentials.description') }}
				</N8nText>
			</div>
		</div>

		<N8nLoading2 v-if="isLoading" :rows="5" :shrink-last="false" />

		<div v-else-if="credentials.length === 0">
			<N8nActionBox
				class="mt-2xl mb-l"
				:heading="i18n.baseText('settings.instanceCredentials.empty.heading')"
				:description="i18n.baseText('settings.instanceCredentials.empty.description')"
				:button-text="i18n.baseText('settings.instanceCredentials.add')"
				data-test-id="instance-credentials-empty-state"
				@click:button="addCredential"
			/>
		</div>

		<div v-else>
			<div :class="$style.actionBar">
				<N8nButton
					variant="solid"
					class="ml-auto"
					icon="plus"
					data-test-id="instance-credentials-add-button"
					@click="addCredential"
				>
					{{ i18n.baseText('settings.instanceCredentials.add') }}
				</N8nButton>
			</div>
			<N8nCard
				v-for="credential in credentials"
				:key="credential.id"
				class="mb-2xs"
				hoverable
				data-test-id="instance-credential-card"
				@click.stop="editCredential(credential)"
			>
				<template #prepend>
					<CredentialIcon :credential-type-name="credential.type" />
				</template>
				<template #header>
					<N8nText tag="h2" bold>{{ credential.name }}</N8nText>
				</template>
				<div :class="$style.cardDescription">
					<N8nText color="text-light" size="small">
						{{ getTypeDisplayName(credential.type) }} |
					</N8nText>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('credentials.item.updated') }}
						<TimeAgo :date="credential.updatedAt" /> |
					</N8nText>
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('credentials.item.created') }}
						{{ formatCreatedAt(credential.createdAt) }}
					</N8nText>
				</div>
				<template #append>
					<div @click.stop>
						<N8nActionToggle
							:actions="actions"
							data-test-id="instance-credential-card-actions"
							@action="onAction($event, credential)"
						/>
					</div>
				</template>
			</N8nCard>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: var(--spacing--xl);
	max-width: 702px;
	margin: 0 auto;
}

.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.actionBar {
	display: flex;
	align-items: center;
	margin-bottom: var(--spacing--sm);
}

.cardDescription {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}
</style>
