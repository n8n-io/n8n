<script setup lang="ts">
import { watch } from 'vue';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import NodeSetupCard from './NodeSetupCard.vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { NodeSetupState } from '../setupPanel.types';

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const { nodeSetupStates, isAllComplete, setCredential, unsetCredential } = useWorkflowSetupState();

const isCardLoading = (state: NodeSetupState): boolean => {
	return state.credentialRequirements.some(
		(req) =>
			req.selectedCredentialId &&
			credentialsStore.isCredentialTestPending(req.selectedCredentialId),
	);
};

watch(isAllComplete, (allComplete) => {
	if (allComplete) {
		telemetry.track('User completed all setup steps', {
			template_id: workflowsStore.workflow.meta?.templateId,
			workflow_id: workflowsStore.workflowId,
		});
	}
});

const onCredentialSelected = (
	nodeName: string,
	payload: { credentialType: string; credentialId: string },
) => {
	setCredential(nodeName, payload.credentialType, payload.credentialId);
};

const onCredentialDeselected = (nodeName: string, credentialType: string) => {
	unsetCredential(nodeName, credentialType);
};
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-cards-container">
		<div
			v-if="nodeSetupStates.length === 0"
			:class="$style['empty-state']"
			data-test-id="setup-cards-empty"
		>
			<N8nIcon icon="list-checks" :class="$style['empty-icon']" :size="24" color="text-base" />
			<div :class="$style['empty-text']">
				<N8nText
					size="medium"
					color="text-base"
					:bold="true"
					data-test-id="setup-cards-empty-heading"
				>
					{{ i18n.baseText('setupPanel.empty.heading') }}
				</N8nText>
				<N8nText size="medium" color="text-light" data-test-id="setup-cards-empty-description">
					{{ i18n.baseText('setupPanel.empty.description') }}
				</N8nText>
			</div>
		</div>
		<div v-else :class="$style['card-list']" data-test-id="setup-cards-list">
			<NodeSetupCard
				v-for="(state, index) in nodeSetupStates"
				:key="state.node.id"
				:state="state"
				:loading="isCardLoading(state)"
				:expanded="index === 0"
				@credential-selected="onCredentialSelected(state.node.name, $event)"
				@credential-deselected="onCredentialDeselected(state.node.name, $event)"
			/>
			<div
				v-if="isAllComplete"
				:class="$style['complete-message']"
				data-test-id="setup-cards-complete-message"
			>
				<N8nText size="medium" color="text-base">
					{{ i18n.baseText('setupPanel.everythingConfigured.message') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container,
.card-list {
	display: flex;
	flex: 1;
	flex-direction: column;
	width: 100%;
	gap: var(--spacing--sm);
}

.empty-state {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}

.empty-text {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.complete-message {
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
	padding: var(--spacing--sm);
}
</style>
