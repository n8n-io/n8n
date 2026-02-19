<script setup lang="ts">
import { watch } from 'vue';
import { useWorkflowSetupState } from '@/features/setupPanel/composables/useWorkflowSetupState';
import TriggerSetupCard from '@/features/setupPanel/components/cards/TriggerSetupCard.vue';
import CredentialTypeSetupCard from '@/features/setupPanel/components/cards/CredentialTypeSetupCard.vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import type { SetupCardItem } from '@/features/setupPanel/setupPanel.types';

const i18n = useI18n();
const telemetry = useTelemetry();
const workflowsStore = useWorkflowsStore();
const { setupCards, isAllComplete, setCredential, unsetCredential, firstTriggerName } =
	useWorkflowSetupState();

watch(isAllComplete, (allComplete) => {
	if (allComplete) {
		telemetry.track('User completed all setup steps', {
			template_id: workflowsStore.workflow.meta?.templateId,
			workflow_id: workflowsStore.workflowId,
		});
	}
});

const onCredentialSelected = (payload: { credentialType: string; credentialId: string }) => {
	setCredential(payload.credentialType, payload.credentialId);
};

const onCredentialDeselected = (credentialType: string) => {
	unsetCredential(credentialType);
};

const cardKey = (card: SetupCardItem): string => {
	if (card.type === 'trigger') return `trigger-${card.state.node.id}`;
	return `credential-${card.state.credentialType}`;
};
</script>

<template>
	<div :class="$style.container" data-test-id="setup-panel-cards-container">
		<div
			v-if="setupCards.length === 0"
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
			<template v-for="(card, index) in setupCards" :key="cardKey(card)">
				<TriggerSetupCard
					v-if="card.type === 'trigger'"
					:state="card.state"
					:expanded="index === 0"
				/>
				<CredentialTypeSetupCard
					v-else
					:state="card.state"
					:first-trigger-name="firstTriggerName"
					:expanded="index === 0"
					@credential-selected="onCredentialSelected"
					@credential-deselected="onCredentialDeselected"
				/>
			</template>
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
