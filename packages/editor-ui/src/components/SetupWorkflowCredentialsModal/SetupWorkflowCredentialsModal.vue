<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { useSetupWorkflowCredentialsModalState } from '@/components/SetupWorkflowCredentialsModal/useSetupWorkflowCredentialsModalState';
import { useI18n } from '@/composables/useI18n';
import N8nHeading from 'n8n-design-system/components/N8nHeading';
import AppsRequiringCredsNotice from '@/views/SetupWorkflowFromTemplateView/AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from '@/views/SetupWorkflowFromTemplateView/SetupTemplateFormStep.vue';
import { onMounted, onUnmounted } from 'vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowStore = useWorkflowsStore();
const uiStore = useUIStore();

const props = defineProps<{
	modalName: string;
	data: {};
}>();

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

	telemetry.track('User opened cred setup', { source: 'canvas' }, { withPostHog: true });
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
				{{ i18n.baseText('setupCredentialsModal.title') }}
			</N8nHeading>
		</template>

		<template #content>
			<div :class="$style.grid">
				<div :class="$style.notice" data-test-id="info-callout">
					<AppsRequiringCredsNotice :app-credentials="appCredentials" />
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
							@credential-selected="setCredential($event.credentialUsageKey, $event.credentialId)"
							@credential-deselected="unsetCredential($event.credentialUsageKey)"
						/>
					</ol>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<n8n-button
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
	margin-top: var(--spacing-l);
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.notice {
	margin-bottom: var(--spacing-2xl);
}

.appCredentialsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xl);
	margin-bottom: var(--spacing-2xl);
}

.appCredential:not(:last-of-type) {
	padding-bottom: var(--spacing-2xl);
	border-bottom: 1px solid var(--color-foreground-light);
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
