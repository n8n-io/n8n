<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import { useSetupWorkflowCredentialsModalState } from '../composables/useSetupWorkflowCredentialsModalState';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import AppsRequiringCredsNotice from './AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from './SetupTemplateFormStep.vue';
import { computed, onMounted, onUnmounted } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton, N8nHeading } from '@n8n/design-system';
const i18n = useI18n();
const telemetry = useTelemetry();
const workflowStore = useWorkflowsStore();
const uiStore = useUIStore();

export type SetupCredentialsModalSource = 'template' | 'builder';

interface ModalData {
	source?: SetupCredentialsModalSource;
}

const props = defineProps<{
	modalName: string;
	data: ModalData;
}>();

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

	telemetry.track('User opened cred setup', { source: 'canvas' });
});

onUnmounted(() => {
	telemetry.track('User closed cred setup', {
		completed: numFilledCredentials.value === credentialUsages.value.length,
		creds_filled: numFilledCredentials.value,
		creds_needed: credentialUsages.value.length,
		workflow_id: workflowStore.workflowId,
	});
});
</script>

<template>
	<Modal width="700px" max-height="90%" :name="props.modalName">
		<template #header>
			<N8nHeading tag="h2" size="xlarge">
				{{ modalTitle }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.grid">
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
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					:label="i18n.baseText('templateSetup.continue.button')"
					:disabled="numFilledCredentials === 0"
					data-test-id="continue-button"
					@click="uiStore.closeModal(props.modalName)"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.grid {
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
