<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import type { WorkflowSetupCard } from '../workflowSetup.types';

const props = defineProps<{
	card: WorkflowSetupCard;
	selectedCredentialId: string | null;
	projectId?: string;
	isComplete: boolean;
}>();

const emit = defineEmits<{
	credentialSelected: [payload: { credentialId: string | null }];
}>();

const i18n = useI18n();
const credentialsStore = useCredentialsStore();

const credentialType = computed(() => props.card.credentialType);

const displayName = computed(() => {
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType.value)?.displayName ??
		credentialType.value;
	const appName = getAppNameFromCredType(raw);
	return i18n.baseText('instanceAi.credential.setupTitle', { interpolate: { name: appName } });
});

// Mirror the selected credential onto node.credentials so NodeCredentials'
// dropdown stays in sync — it derives its selection from props.node.credentials.
const displayNode = computed<INodeUi>(() => {
	if (!props.selectedCredentialId) {
		const { credentials: _drop, ...rest } = props.card.node;
		return rest as INodeUi;
	}
	const cred =
		props.card.existingCredentials.find((c) => c.id === props.selectedCredentialId) ??
		credentialsStore.getCredentialById(props.selectedCredentialId);
	return {
		...props.card.node,
		credentials: cred ? { [credentialType.value]: { id: cred.id, name: cred.name } } : {},
	} as INodeUi;
});

function onCredentialSelected(update: INodeUpdatePropertiesInformation) {
	const data = update.properties.credentials?.[credentialType.value];
	const credentialId =
		typeof data === 'object' && data !== null && 'id' in data && typeof data.id === 'string'
			? data.id
			: null;
	emit('credentialSelected', { credentialId });
}
</script>

<template>
	<div :class="$style.card" data-test-id="instance-ai-workflow-setup-card">
		<header :class="$style.header">
			<CredentialIcon :credential-type-name="credentialType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ displayName }}
			</N8nText>
			<N8nText
				v-if="isComplete"
				data-test-id="instance-ai-workflow-setup-card-check"
				:class="$style.completeLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
		</header>

		<div :class="$style.body">
			<NodeCredentials
				:node="displayNode"
				:override-cred-type="credentialType"
				:project-id="projectId"
				standalone
				hide-issues
				@credential-selected="onCredentialSelected"
			/>
		</div>

		<slot name="footer" />
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
}

.title {
	flex: 1;
}

.completeLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.body {
	display: flex;
	flex-direction: column;
	padding: 0 var(--spacing--sm);

	:global(.node-credentials) {
		margin-top: 0;
	}
}
</style>
