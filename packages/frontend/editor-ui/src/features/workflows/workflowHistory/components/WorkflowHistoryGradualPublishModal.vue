<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { N8nHeading, N8nButton, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { useUIStore } from '@/app/stores/ui.store';
import { ref, computed, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';
import { generateVersionName } from '@/features/workflows/workflowHistory/utils';
import type { EventBus } from '@n8n/utils/event-bus';

export type WorkflowHistoryGradualPublishModalEventBusEvents = {
	submit: { versionId: string; percentage: number; name: string; description: string };
	cancel: undefined;
};

export type WorkflowHistoryGradualPublishModalData = {
	versionId: string;
	versionName?: string;
	description?: string;
	submitting?: boolean;
	eventBus: EventBus<WorkflowHistoryGradualPublishModalEventBusEvents>;
};

const props = defineProps<{
	modalName: string;
	data: WorkflowHistoryGradualPublishModalData;
}>();

const i18n = useI18n();
const modalEventBus = createEventBus();
const uiStore = useUIStore();

const versionForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('versionForm');
const percentageInput = useTemplateRef<InstanceType<typeof N8nInput>>('percentageInput');

const percentage = ref(20);
const versionName = ref('');
const description = ref('');

const submitting = computed(() => props.data.submitting ?? false);

const isPercentageValid = computed(() => {
	const value = Number(percentage.value);
	return Number.isInteger(value) && value >= 0 && value <= 100;
});

const isSubmitDisabled = computed(() => {
	return versionName.value.trim().length === 0 || !isPercentageValid.value;
});

function onModalOpened() {
	percentageInput.value?.focus();
}

onMounted(() => {
	if (props.data.versionName) {
		versionName.value = props.data.versionName;
	} else if (props.data.versionId) {
		versionName.value = generateVersionName(props.data.versionId);
	}
	if (props.data.description) {
		description.value = props.data.description;
	}
	modalEventBus.on('opened', onModalOpened);
});

onBeforeUnmount(() => {
	modalEventBus.off('opened', onModalOpened);
});

const closeModal = () => {
	uiStore.closeModal(props.modalName);
};

const onCancel = () => {
	props.data.eventBus.emit('cancel');
	closeModal();
};

const handleSubmit = () => {
	if (isSubmitDisabled.value) {
		return;
	}
	props.data.eventBus.emit('submit', {
		versionId: props.data.versionId,
		percentage: Number(percentage.value),
		name: versionName.value,
		description: description.value,
	});
};
</script>

<template>
	<Modal
		width="500px"
		max-height="85vh"
		:name="modalName"
		:event-bus="modalEventBus"
		:center="true"
		:before-close="onCancel"
	>
		<template #header>
			<N8nHeading size="xlarge">{{
				i18n.baseText('workflowHistory.gradualPublishModal.title', {
					interpolate: { versionName: data.versionName ?? '' },
				})
			}}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nText>{{ i18n.baseText('workflowHistory.gradualPublishModal.description') }}</N8nText>
				<N8nInputLabel
					input-name="gradual-publish-percentage"
					:label="i18n.baseText('workflowHistory.gradualPublishModal.percentageLabel')"
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
							:disabled="submitting"
							size="large"
							data-test-id="history-gradual-publish-percentage-input"
						/>
						<span :class="$style.percentageSymbol">%</span>
					</div>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('workflowHistory.gradualPublishModal.percentageHint') }}
					</N8nText>
				</N8nInputLabel>
				<WorkflowVersionForm
					ref="versionForm"
					v-model:version-name="versionName"
					v-model:description="description"
					:disabled="submitting"
					:version-name-test-id="`${modalName}-version-name-input`"
					:description-test-id="`${modalName}-description-input`"
					@submit="handleSubmit"
				/>
				<div :class="$style.actions">
					<N8nButton
						:disabled="submitting"
						type="secondary"
						:label="i18n.baseText('workflowHistory.gradualPublishModal.button.cancel')"
						:data-test-id="`${modalName}-cancel-button`"
						@click="onCancel"
					/>
					<N8nButton
						:loading="submitting"
						:disabled="isSubmitDisabled"
						:label="i18n.baseText('workflowHistory.gradualPublishModal.button.publish')"
						:data-test-id="`${modalName}-submit-button`"
						@click="handleSubmit"
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
