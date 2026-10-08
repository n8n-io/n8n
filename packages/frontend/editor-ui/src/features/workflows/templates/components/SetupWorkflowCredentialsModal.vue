<script lang="ts" setup>
import { useSetupWorkflowCredentialsModalState } from '../composables/useSetupWorkflowCredentialsModalState';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import AppsRequiringCredsNotice from './AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from './SetupTemplateFormStep.vue';
import { computed, onMounted, onUnmounted } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton, N8nDialog, N8nDialogBody, N8nDialogFooter } from '@n8n/design-system';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
const i18n = useI18n();
const telemetry = useTelemetry();
const workflowDocumentStore = injectWorkflowDocumentStore();
const uiStore = useUIStore();

export type SetupCredentialsModalSource = 'template' | 'builder';

interface ModalData {
	source?: SetupCredentialsModalSource;
}

const props = defineProps<{
	modalName: string;
	data: ModalData;
}>();

const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

function closeDialog() {
	if (uiStore.modalsById[props.modalName]?.open !== true) return;
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

const modalTitle = computed(() => {
	if (props.data?.source === 'builder') {
		return i18n.baseText('setupCredentialsModal.title.builder' as BaseTextKey);
	}
	return i18n.baseText('setupCredentialsModal.title');
});

const {
	appCredentials,
	credentialUsages,
	numFilledCredentials,
	selectedCredentialIdByKey,
	setInitialCredentialSelection,
	setCredential,
	unsetCredential,
} = useSetupWorkflowCredentialsModalState();

onMounted(() => {
	setInitialCredentialSelection();

	telemetry.track('User opened cred setup', { source: props.data?.source ?? 'canvas' });
});

onUnmounted(() => {
	telemetry.track('User closed cred setup', {
		completed: numFilledCredentials.value === credentialUsages.value.length,
		creds_filled: numFilledCredentials.value,
		creds_needed: credentialUsages.value.length,
		workflow_id: workflowDocumentStore.value.workflowId,
		source: props.data?.source ?? 'canvas',
	});
});
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="2xlarge"
		:container-class="$style.dialog"
		:header="modalTitle"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div :class="$style.grid" :data-test-id="`${modalName}-modal`">
				<div :class="$style.notice" data-test-id="info-callout">
					<AppsRequiringCredsNotice
						:app-credentials="appCredentials"
						:source="props.data?.source"
					/>
				</div>

				<div>
					<ol :class="$style.appCredentialsContainer">
						<SetupTemplateFormStep
							v-for="(credentials, index) in credentialUsages"
							:key="credentials.key"
							:class="$style.appCredential"
							:order="index + 1"
							:credentials="credentials"
							:selected-credential-id="selectedCredentialIdByKey[credentials.key]"
							:source="props.data?.source"
							@credential-selected="setCredential($event.credentialUsageKey, $event.credentialId)"
							@credential-deselected="unsetCredential($event.credentialUsageKey)"
						/>
					</ol>
				</div>
			</div>
		</N8nDialogBody>

		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					:label="i18n.baseText('templateSetup.continue.button')"
					:disabled="numFilledCredentials === 0"
					data-test-id="continue-button"
					@click="closeDialog"
				/>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.dialog {
	display: flex;
	flex-direction: column;
	max-height: 90%;
}

.grid {
	min-height: 0;
	overflow-y: auto;
	margin: 0 auto;
	margin-top: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.notice {
	margin-bottom: var(--spacing--2xl);
}

.appCredentialsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
	margin-bottom: var(--spacing--2xl);
}

.appCredential:not(:last-of-type) {
	padding-bottom: var(--spacing--2xl);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
