<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { WORKFLOW_GRADUAL_PUBLISH_MODAL_KEY } from '@/app/constants';
import { telemetry } from '@/app/plugins/telemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import {
	N8nHeading,
	N8nText,
	N8nCallout,
	N8nButton,
	N8nInput,
	N8nInputLabel,
} from '@n8n/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { getActivatableTriggerNodes } from '@/app/utils/nodeTypesUtils';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { generateVersionName } from '@/features/workflows/workflowHistory/utils';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();
const workflowActivate = useWorkflowActivate();
const publishing = ref(false);

const publishForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('publishForm');
const percentageInput = useTemplateRef<InstanceType<typeof N8nInput>>('percentageInput');

const percentage = ref(20);
const description = ref('');
const versionName = ref('');

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const hasWebhookTrigger = computed(() => {
	return foundTriggers.value.some((node) => node.webhookId !== undefined);
});

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const hasNodeIssues = computed(() => workflowsStore.nodesIssuesExist);

const isMaxVersionsReached = computed(() => workflowsStore.isGradualRolloutMaxVersionsReached);

const isPercentageValid = computed(() => {
	const value = Number(percentage.value);
	return Number.isInteger(value) && value >= 0 && value <= 100;
});

const inputsDisabled = computed(() => {
	return (
		!containsTrigger.value ||
		hasNodeIssues.value ||
		!hasWebhookTrigger.value ||
		isMaxVersionsReached.value ||
		publishing.value
	);
});

const isPublishDisabled = computed(() => {
	return inputsDisabled.value || versionName.value.trim().length === 0 || !isPercentageValid.value;
});

type GradualPublishCalloutId = 'noTrigger' | 'nodeIssues' | 'noWebhook' | 'maxVersions';

const activeCalloutId = computed<GradualPublishCalloutId | null>(() => {
	if (!containsTrigger.value) {
		return 'noTrigger';
	}
	if (hasNodeIssues.value) {
		return 'nodeIssues';
	}
	if (!hasWebhookTrigger.value) {
		return 'noWebhook';
	}
	if (isMaxVersionsReached.value) {
		return 'maxVersions';
	}
	return null;
});

function onModalOpened() {
	percentageInput.value?.focus();
}

onMounted(() => {
	const versionData = workflowsStore.versionData;
	if (!versionName.value) {
		if (versionData?.name) {
			versionName.value = versionData.name;
		} else {
			versionName.value = generateVersionName(workflowsStore.workflow.versionId);
		}
	}
	if (!description.value && versionData?.description) {
		description.value = versionData.description;
	}
	modalBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalBus.off('opened', onModalOpened);
});

async function handleGradualPublish() {
	if (isPublishDisabled.value) {
		return;
	}
	publishing.value = true;
	const percentageNumber = Number(percentage.value);
	const { success } = await workflowActivate.gradualPublishWorkflow(workflowsStore.workflow.id, {
		versionId: workflowsStore.workflow.versionId,
		percentage: percentageNumber,
		name: versionName.value,
		description: description.value,
	});
	if (success) {
		telemetry.track('User started gradual rollout from canvas', {
			workflow_id: workflowsStore.workflow.id,
			percentage: percentageNumber,
		});
		modalBus.emit('close');
	}
	publishing.value = false;
}
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:name="WORKFLOW_GRADUAL_PUBLISH_MODAL_KEY"
		:center="true"
		:show-close="true"
		:close-on-click-modal="false"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{
				i18n.baseText('workflows.gradualPublishModal.title')
			}}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText>{{ i18n.baseText('workflows.gradualPublishModal.description') }}</N8nText>
				<N8nCallout v-if="activeCalloutId === 'noTrigger'" theme="danger" icon="status-error">
					{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'nodeIssues'" theme="danger" icon="status-error">
					{{
						i18n.baseText('workflowActivator.showMessage.activeChangedNodesIssuesExistTrue.title', {
							interpolate: { count: workflowsStore.nodesWithIssues.length },
							adjustToNumber: workflowsStore.nodesWithIssues.length,
						})
					}}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'noWebhook'" theme="warning">
					{{ i18n.baseText('workflows.gradualPublishModal.webhookRequired') }}
				</N8nCallout>
				<N8nCallout v-else-if="activeCalloutId === 'maxVersions'" theme="warning">
					{{ i18n.baseText('workflows.gradualPublishModal.maxVersionsReached') }}
				</N8nCallout>
				<N8nInputLabel
					input-name="gradual-publish-percentage"
					:label="i18n.baseText('workflows.gradualPublishModal.percentageLabel')"
					:required="true"
					:class="$style.inputWrapper"
				>
					<div :class="$style.percentageInputWrapper">
						<N8nInput
							id="gradual-publish-percentage"
							ref="percentageInput"
							v-model="percentage"
							type="number"
							:min="0"
							:max="100"
							:disabled="inputsDisabled"
							size="large"
							data-test-id="gradual-publish-percentage-input"
						/>
						<span :class="$style.percentageSymbol">%</span>
					</div>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('workflows.gradualPublishModal.percentageHint') }}
					</N8nText>
				</N8nInputLabel>
				<WorkflowVersionForm
					ref="publishForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:disabled="inputsDisabled"
					version-name-test-id="gradual-publish-version-name-input"
					description-test-id="gradual-publish-description-input"
					@submit="handleGradualPublish"
				/>
				<div :class="$style.actions">
					<N8nButton
						:disabled="publishing"
						type="secondary"
						:label="i18n.baseText('workflows.gradualPublishModal.button.cancel')"
						data-test-id="gradual-publish-cancel-button"
						@click="modalBus.emit('close')"
					/>
					<N8nButton
						:disabled="isPublishDisabled"
						:loading="publishing"
						:label="i18n.baseText('workflows.gradualPublishModal.button.start')"
						data-test-id="gradual-publish-button"
						@click="handleGradualPublish"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
.inputWrapper {
	width: 100%;
}
.percentageInputWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--4xs);
}
.percentageInputWrapper input {
	width: 100px;
}
.percentageSymbol {
	font-size: var(--font-size--md);
	color: var(--color--text--tint-1);
}
.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
