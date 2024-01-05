<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { useSetupWorkflowCredentialsModalState } from '@/components/SetupWorkflowCredentialsModal/useSetupWorkflowCredentialsModalState';
import { useI18n } from '@/composables/useI18n';
import N8nHeading from 'n8n-design-system/components/N8nHeading';
import AppsRequiringCredsNotice from '@/views/SetupWorkflowFromTemplateView/AppsRequiringCredsNotice.vue';
import SetupTemplateFormStep from '@/views/SetupWorkflowFromTemplateView/SetupTemplateFormStep.vue';
import { onMounted } from 'vue';

const i18n = useI18n();

const props = defineProps<{
	modalName: string;
	data: {};
}>();

const {
	appCredentials,
	credentialUsages,
	selectedCredentialIdByKey,
	setInitialCredentialSelection,
	setCredential,
	unsetCredential,
} = useSetupWorkflowCredentialsModalState();

onMounted(() => {
	setInitialCredentialSelection();
});
</script>

<template>
	<Modal width="900px" max-height="90%" :name="props.modalName">
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
	</Modal>
</template>

<style lang="scss" module>
.grid {
	margin: 0 auto;
	margin-top: var(--spacing-l);
	display: flex;
	flex-direction: column;
	justify-content: center;
	max-width: 768px;
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
</style>
