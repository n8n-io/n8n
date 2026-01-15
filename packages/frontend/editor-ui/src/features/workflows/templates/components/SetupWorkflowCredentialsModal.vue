<script lang="ts" setup>
import Modal from '@/app/components/Modal.vue';
import { useSetupWorkflowCredentialsModalState } from '../composables/useSetupWorkflowCredentialsModalState';
import { useI18n } from '@n8n/i18n';
import AppsRequiringCredsNotice from './AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from './SetupTemplateFormStep.vue';
import SetupTemplateFormParameterStep from './SetupTemplateFormParameterStep.vue';
import { onMounted, onUnmounted } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';

import { N8nButton, N8nHeading } from '@n8n/design-system';
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
	// Parameter-related
	nodesWithRequiredParameters,
	parameterValues,
	setParameterValue,
	setInitialParameterValues,
} = useSetupWorkflowCredentialsModalState();

onMounted(() => {
	setInitialCredentialSelection();
	setInitialParameterValues();

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

				<div
					v-if="nodesWithRequiredParameters.length > 0"
					:class="$style.parametersSection"
					data-test-id="parameters-section"
				>
					<N8nHeading tag="h3" size="medium" :class="$style.sectionTitle">
						{{ i18n.baseText('templateSetup.parameters.sectionTitle') }}
					</N8nHeading>

					<ol :class="$style.appCredentialsContainer">
						<SetupTemplateFormParameterStep
							v-for="(nodeParams, index) in nodesWithRequiredParameters"
							:key="nodeParams.nodeName"
							:class="$style.appCredential"
							:order="credentialUsages.length + index + 1"
							:node-parameters="nodeParams"
							:parameter-values="parameterValues"
							@parameter-changed="setParameterValue($event.parameterKey, $event.value)"
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

.parametersSection {
	margin-top: var(--spacing--2xl);
	padding-top: var(--spacing--2xl);
	border-top: 1px solid var(--color--foreground--tint-1);
}

.sectionTitle {
	margin-bottom: var(--spacing--lg);
}
</style>
