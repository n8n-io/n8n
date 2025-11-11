<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import dateformat from 'dateformat';
import { toDayMonth } from '@/utils/formatters/dateFormatter';
import Modal from '@/components/Modal.vue';
import { WORKFLOW_PUBLISH_MODAL_KEY } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { N8nHeading, N8nCallout, N8nText, N8nInput, N8nButton, N8nBadge } from '@n8n/design-system';
import { getActivatableTriggerNodes } from '@/utils/nodeTypesUtils';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';

const modalBus = createEventBus();
const i18n = useI18n();

const workflowsStore = useWorkflowsStore();

// TODO: we should use workflow publish history here instead but that table is not yet implemented
const workflowHistoryStore = useWorkflowHistoryStore();
const hasAnyPublishedVersions = ref(false);
const description = ref('');

const foundTriggers = computed(() =>
	getActivatableTriggerNodes(workflowsStore.workflowTriggerNodes),
);

const containsTrigger = computed((): boolean => {
	return foundTriggers.value.length > 0;
});

const hasPublishedVersion = computed(() => {
	return !!workflowsStore.workflow.activeVersion;
});

const wfHasAnyChanges = computed(() => {
	return workflowsStore.workflow.versionId !== workflowsStore.workflow.activeVersion?.versionId;
});

const actionText = computed(() => {
	if (!hasPublishedVersion.value && wfHasAnyChanges.value) {
		return i18n.baseText('generic.create');
	}
	return '';
});

const currentVersionText = computed(() => {
	if (hasPublishedVersion.value) {
		// TODO: this should be using the workflow publish history
		return 'Version X';
	}
	return '';
});

const newVersionText = computed(() => {
	if (wfHasAnyChanges.value) {
		// TODO: this should be using the workflow publish history
		return 'Version Y';
	}
	return '';
});

const isPublishDisabled = computed(() => {
	return !wfHasAnyChanges.value || !containsTrigger.value;
});

const publishedInfoText = computed(() => {
	if (!hasPublishedVersion.value || !workflowsStore.workflow.activeVersion) {
		return i18n.baseText('workflows.publishModal.noPublishedVersionMessage');
	}

	const activeVersion = workflowsStore.workflow.activeVersion;
	const authorName = activeVersion.authors.split(', ')[0];
	const date = toDayMonth(activeVersion.createdAt);
	const time = dateformat(activeVersion.createdAt, 'HH:MM');

	return i18n.baseText('workflows.publishModal.lastPublished', {
		interpolate: {
			author: authorName,
			date,
			time,
		},
	});
});

watchEffect(async () => {
	const workflowHistory = await workflowHistoryStore.getWorkflowHistory(
		workflowsStore.workflow.id,
		{ take: 1 },
	);
	hasAnyPublishedVersions.value = workflowHistory.length > 1;
});
</script>

<template>
	<Modal
		max-width="500px"
		max-height="85vh"
		:name="WORKFLOW_PUBLISH_MODAL_KEY"
		:center="true"
		:show-close="true"
		:event-bus="modalBus"
	>
		<template #header>
			<N8nHeading size="xlarge">{{ i18n.baseText('workflows.publishModal.title') }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nCallout v-if="!containsTrigger" theme="danger" icon="status-error">
					{{ i18n.baseText('workflows.publishModal.noTriggerMessage') }}
				</N8nCallout>
				<div :class="$style.versionTextContainer">
					<div :class="$style.versionRow">
						<N8nText v-if="actionText" color="text-light"> {{ actionText }}{{ ' ' }} </N8nText>
						<N8nText v-if="currentVersionText">
							{{ currentVersionText }}
						</N8nText>
						<N8nBadge v-if="currentVersionText && !wfHasAnyChanges" theme="tertiary" size="small">
							{{ i18n.baseText('workflows.publishModal.noChanges') }}
						</N8nBadge>
						<N8nText v-if="currentVersionText && newVersionText" color="text-light"> -> </N8nText>
						<N8nText color="text-dark">
							{{ newVersionText }}
						</N8nText>
						<N8nBadge v-if="currentVersionText && newVersionText" theme="warning" size="small">
							{{ i18n.baseText('workflows.publishModal.modified') }}
						</N8nBadge>
					</div>
					<div>
						<N8nText color="text-light" size="small">
							{{ publishedInfoText }}
						</N8nText>
					</div>
				</div>
				<div :class="$style.inputButtonContainer">
					<N8nInput
						v-model="description"
						:placeholder="i18n.baseText('workflows.publishModal.descriptionPlaceholder')"
						:class="$style.descriptionInput"
						:disabled="isPublishDisabled"
						size="small"
						data-test-id="workflow-publish-description-input"
					/>
					<N8nButton
						:disabled="isPublishDisabled"
						:label="i18n.baseText('workflows.publish')"
						size="small"
						data-test-id="workflow-publish-button"
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
.versionTextContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.versionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.inputButtonContainer {
	display: flex;
	gap: var(--spacing--xs);
}

.descriptionInput {
	flex: 1;
}
</style>
