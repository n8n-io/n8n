<script setup lang="ts">
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useCredentialsStore } from '../credentials.store';
import { useUIStore } from '@/app/stores/ui.store';
import { computed, onMounted, ref } from 'vue';
import { CREDENTIAL_SELECT_MODAL_KEY } from '../credentials.constants';
import { useI18n } from '@n8n/i18n';
import type { NewCredentialsModal } from '@/Interface';

import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nSpinner,
} from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useInstanceAiCredentialHelp } from '@/features/ai/instanceAi/composables/useInstanceAiCredentialHelp';
const externalHooks = useExternalHooks();
const telemetry = useTelemetry();
const i18n = useI18n();

const selected = ref('');
const loading = ref(true);
const selectRef = ref<HTMLSelectElement>();

const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const instanceAiCredentialHelp = useInstanceAiCredentialHelp();

const searchQuery = ref('');

const presetUsageScope = computed<NewCredentialsModal['usageScope']>(() => {
	const data = uiStore.modalsById[CREDENTIAL_SELECT_MODAL_KEY]?.data;
	return data?.usageScope === 'instance' ? 'instance' : undefined;
});

onMounted(async () => {
	try {
		await credentialsStore.fetchCredentialTypes(false);
	} catch (e) {}

	loading.value = false;

	setTimeout(() => {
		if (selectRef.value) {
			selectRef.value.focus();
		}
	}, 0);
});

// Exclude hidden and purpose-built credentials for ChatHub
const allSelectableCredentialTypes = computed(() =>
	credentialsStore.allCredentialTypes.filter(
		(credentialType) => !credentialType.hidden && !credentialType.name.startsWith('chatHub'),
	),
);

const selectableCredentialTypes = computed(() => {
	if (!searchQuery.value) return allSelectableCredentialTypes.value;
	const q = searchQuery.value.toLowerCase();
	return allSelectableCredentialTypes.value.filter((c) => c.displayName.toLowerCase().includes(q));
});

function filterCredentials(query: string) {
	searchQuery.value = query;
}

function onSelect(type: string) {
	selected.value = type;
}

const modalOpen = computed(() => uiStore.modalsById[CREDENTIAL_SELECT_MODAL_KEY]?.open === true);

function closeDialog() {
	uiStore.closeModal(CREDENTIAL_SELECT_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

function openCredentialType() {
	closeDialog();
	// Carry the credentials-list credential help into the new-credential dialog so
	// it offers the Instance AI button (not the legacy assistant) like the rest of
	// the list does.
	uiStore.openNewCredential(
		selected.value,
		false,
		false,
		undefined,
		undefined,
		undefined,
		undefined,
		{
			instanceAiCredentialHelp: instanceAiCredentialHelp(),
			usageScope: presetUsageScope.value,
		},
	);

	const telemetryPayload = {
		credential_type: selected.value,
		source: 'primary_menu',
		new_credential: true,
		workflow_id: workflowDocumentStore.value.workflowId,
	};

	telemetry.track('User opened Credential modal', telemetryPayload);
	void externalHooks.run('credentialsSelectModal.openCredentialType', telemetryPayload);
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:container-class="$style.dialog"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody v-if="loading">
			<N8nSpinner />
		</N8nDialogBody>
		<template v-else>
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{ i18n.baseText('credentialSelectModal.addNewCredential') }}
				</N8nDialogTitle>
			</N8nDialogHeader>
			<N8nDialogBody>
				<div>
					<div :class="$style.subtitle">
						{{ i18n.baseText('credentialSelectModal.selectAnAppOrServiceToConnectTo') }}
					</div>
					<N8nSelect
						ref="selectRef"
						filterable
						default-first-option
						:placeholder="i18n.baseText('credentialSelectModal.searchForApp')"
						size="xlarge"
						:model-value="selected"
						:filter-method="filterCredentials"
						data-test-id="new-credential-type-select"
						@update:model-value="onSelect"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
						<N8nOption
							v-for="credential in selectableCredentialTypes"
							:key="credential.name"
							:value="credential.name"
							:label="credential.displayName"
							filterable
							data-test-id="new-credential-type-select-option"
						/>
					</N8nSelect>
				</div>
			</N8nDialogBody>
			<N8nDialogFooter>
				<div :class="$style.footer">
					<N8nButton
						:label="i18n.baseText('credentialSelectModal.continue')"
						float="right"
						size="large"
						:disabled="!selected"
						data-test-id="new-credential-type-button"
						@click="openCredentialType"
					/>
				</div>
			</N8nDialogFooter>
		</template>
	</N8nDialog>
</template>

<style module lang="scss">
.dialog {
	/* Previous dialog min-height. No spacing token. */
	// min-height: 250px;
}

.subtitle {
	margin-bottom: var(--spacing--sm);
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
}
</style>
