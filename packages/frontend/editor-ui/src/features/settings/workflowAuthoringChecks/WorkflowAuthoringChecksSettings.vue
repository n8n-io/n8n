<script setup lang="ts">
import type { WorkflowAuthoringCheckSeverity, WorkflowCheckDto } from '@n8n/api-types';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElSwitch } from 'element-plus';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_AUTHORING_CHECK_FORM_MODAL_KEY } from '@/features/workflows/authoringChecks/authoringChecks.constants';
import { useWorkflowAuthoringChecksStore } from '@/features/workflows/authoringChecks/authoringChecks.store';

const store = useWorkflowAuthoringChecksStore();
const { instances, isLoading } = storeToRefs(store);
const { fetchInstances, fetchTypes, updateInstance, deleteInstance } = store;
const i18n = useI18n();
const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const uiStore = useUIStore();

onMounted(async () => {
	try {
		await Promise.all([fetchInstances(), fetchTypes()]);
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.fetchError'));
	}
});

function severityLabel(severity: WorkflowAuthoringCheckSeverity) {
	return severity === 'blocking'
		? i18n.baseText('workflowAuthoringChecks.severity.blocking')
		: i18n.baseText('workflowAuthoringChecks.severity.warning');
}

async function onToggleEnabled(instance: WorkflowCheckDto, value: string | number | boolean) {
	const enabled = typeof value === 'boolean' ? value : Boolean(value);
	try {
		await updateInstance(instance.id, { enabled });
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.updateError'));
	}
}

function onCreate() {
	uiStore.openModalWithData({
		name: WORKFLOW_AUTHORING_CHECK_FORM_MODAL_KEY,
		data: { mode: 'create' },
	});
}

function onEdit(instance: WorkflowCheckDto) {
	uiStore.openModalWithData({
		name: WORKFLOW_AUTHORING_CHECK_FORM_MODAL_KEY,
		data: { mode: 'edit', instanceId: instance.id },
	});
}

async function onDelete(instance: WorkflowCheckDto) {
	const confirmed = await confirm(
		i18n.baseText('settings.workflowAuthoringChecks.deleteConfirm.message', {
			interpolate: { name: instance.name },
		}),
		i18n.baseText('settings.workflowAuthoringChecks.deleteConfirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.workflowAuthoringChecks.deleteConfirm.confirm'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await deleteInstance(instance.id);
		showMessage({
			title: i18n.baseText('settings.workflowAuthoringChecks.deleteAction'),
			type: 'success',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.workflowAuthoringChecks.deleteError'));
	}
}
</script>

<template>
	<div class="pb-3xl" data-test-id="workflow-authoring-checks-settings">
		<div :class="$style.headerBar">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.workflowAuthoringChecks.title') }}
				</N8nHeading>
				<N8nText color="text-base" size="medium">
					{{ i18n.baseText('settings.workflowAuthoringChecks.description') }}
				</N8nText>
			</div>
			<N8nButton
				data-test-id="workflow-authoring-checks-create-button"
				:label="i18n.baseText('settings.workflowAuthoringChecks.createButton')"
				@click="onCreate"
			/>
		</div>

		<div v-if="isLoading && instances.length === 0" :class="$style.emptyState">
			<N8nText color="text-light">
				{{ i18n.baseText('settings.workflowAuthoringChecks.loading') }}
			</N8nText>
		</div>

		<div
			v-else-if="instances.length === 0"
			:class="$style.emptyState"
			data-test-id="workflow-authoring-checks-empty-state"
		>
			<N8nText color="text-light">
				{{ i18n.baseText('settings.workflowAuthoringChecks.empty') }}
			</N8nText>
		</div>

		<div
			v-for="instance in instances"
			v-else
			:key="instance.id"
			:class="$style.settingsSection"
			:data-test-id="`workflow-authoring-check-row-${instance.id}`"
		>
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true">{{ instance.name }}</N8nText>
					<N8nText size="small" color="text-light">
						{{ instance.typeTitle }} · {{ severityLabel(instance.severity) }}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<N8nButton
						variant="outline"
						:label="i18n.baseText('settings.workflowAuthoringChecks.editAction')"
						:data-test-id="`workflow-authoring-check-edit-${instance.id}`"
						@click="onEdit(instance)"
					/>
					<N8nButton
						v-if="!instance.static"
						variant="outline"
						:label="i18n.baseText('settings.workflowAuthoringChecks.deleteAction')"
						:data-test-id="`workflow-authoring-check-delete-${instance.id}`"
						@click="onDelete(instance)"
					/>
					<ElSwitch
						:model-value="instance.enabled"
						size="large"
						:data-test-id="`workflow-authoring-check-toggle-${instance.id}`"
						@update:model-value="(value) => onToggleEnabled(instance, value)"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style module>
.headerBar {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--xl);
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--sm);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
	gap: var(--spacing--sm);
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--sm) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--sm);
	flex-shrink: 0;
}

.emptyState {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
