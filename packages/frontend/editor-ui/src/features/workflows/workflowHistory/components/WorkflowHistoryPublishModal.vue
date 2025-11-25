<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { N8nHeading, N8nButton, N8nCallout, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { WORKFLOW_HISTORY_PUBLISH_MODAL_KEY } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { useWorkflowActivate } from '@/app/composables/useWorkflowActivate';
import { ref, onMounted } from 'vue';
import { generateVersionName } from '@/features/workflows/workflowHistory/utils';

const props = defineProps<{
	modalName: string;
	data: {
		versionId: string;
		workflowId: string;
		formattedCreatedAt: string;
		versionName?: string;
		description?: string;
		onSuccess?: (data: { versionId: string; name: string; description: string }) => void;
	};
}>();

const i18n = useI18n();
const eventBus = createEventBus();
const workflowActivate = useWorkflowActivate();

const versionName = ref('');
const description = ref('');

onMounted(() => {
	// Populate version name from existing data or generate from version ID
	if (props.data.versionName) {
		versionName.value = props.data.versionName;
	} else if (props.data.versionId) {
		versionName.value = generateVersionName(props.data.versionId);
	}

	// Populate description if available
	if (props.data.description) {
		description.value = props.data.description;
	}
});

const isPublishDisabled = ref(false);

const handlePublish = async () => {
	if (versionName.value.trim().length === 0) {
		return;
	}

	isPublishDisabled.value = true;
	const success = await workflowActivate.publishWorkflowFromHistory(
		props.data.workflowId,
		props.data.versionId,
		{
			name: versionName.value,
			description: description.value,
		},
	);

	isPublishDisabled.value = false;

	if (success) {
		props.data.onSuccess?.({
			versionId: props.data.versionId,
			name: versionName.value,
			description: description.value,
		});
		eventBus.emit('close');
	}
};
</script>

<template>
	<Modal
		width="500px"
		max-height="85vh"
		:name="WORKFLOW_HISTORY_PUBLISH_MODAL_KEY"
		:event-bus="eventBus"
		:center="true"
		:show-close="true"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.publishModal.title') }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nCallout theme="warning" icon="triangle-alert">
					{{ i18n.baseText('workflowHistory.publishModal.description') }}
				</N8nCallout>
				<div :class="$style.inputContainer">
					<N8nInputLabel
						input-name="workflow-version-name"
						:label="i18n.baseText('workflows.publishModal.versionNameLabel')"
						:required="true"
						:class="$style.versionNameInput"
					>
						<N8nInput
							id="workflow-version-name"
							v-model="versionName"
							size="large"
							data-test-id="workflow-history-publish-version-name-input"
						/>
					</N8nInputLabel>
				</div>
				<div :class="$style.descriptionContainer">
					<N8nInputLabel
						input-name="workflow-version-description"
						:label="i18n.baseText('workflows.publishModal.descriptionPlaceholder')"
					>
						<N8nInput
							id="workflow-version-description"
							v-model="description"
							type="textarea"
							:rows="4"
							size="large"
							data-test-id="workflow-history-publish-description-input"
						/>
					</N8nInputLabel>
				</div>
				<div :class="$style.actions">
					<N8nButton
						type="secondary"
						:label="i18n.baseText('generic.cancel')"
						data-test-id="workflow-history-publish-cancel-button"
						@click="eventBus.emit('close')"
					/>
					<N8nButton
						:disabled="isPublishDisabled || versionName.trim().length === 0"
						:label="i18n.baseText('workflows.publish')"
						data-test-id="workflow-history-publish-button"
						@click="handlePublish"
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

.inputContainer {
	display: flex;
	gap: var(--spacing--xs);
}

.descriptionContainer {
	width: 100%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.versionNameInput {
	width: 100%;
}
</style>
