<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowStatus } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { hasPermission } from '@/utils/rbac/permissions';
import { useToast } from '@/composables/useToast';

const workflowsStore = useWorkflowsStore();
const locale = useI18n();
const toast = useToast();
const props = defineProps<{
	workflow_id: string;
	audit_status: WorkflowStatus;
}>();

function showAuditFinishedToast() {
	let toastTitle = locale.baseText('audit.submission.result.success');
	let toastText = locale.baseText('audit.submission.refresh');

	toast.showMessage({
		title: toastTitle,
		message: toastText,
		type: 'success',
	});
}

function showAuditSubmittedToast() {
	let toastTitle = locale.baseText('audit.submission.request.success');
	let toastText = locale.baseText('audit.submission.refresh');

	toast.showMessage({
		title: toastTitle,
		message: toastText,
		type: 'success',
	});
}

async function onApproveWorkflow() {
	await workflowsStore.updateWorkflowAuditStatus(props.workflow_id, 'approved' as WorkflowStatus);
	showAuditFinishedToast();
}

async function onDeclineWorkflow() {
	await workflowsStore.updateWorkflowAuditStatus(props.workflow_id, 'declined' as WorkflowStatus);
	showAuditFinishedToast();
}
async function onSubmitWorkflowForAudit() {
	await workflowsStore.updateWorkflowAuditStatus(props.workflow_id, 'submitted' as WorkflowStatus);
	showAuditSubmittedToast();
}
</script>

<template>
	<div :class="$style.auditButtons">
		<n8n-button
			v-if="
				props.audit_status === 'submitted' &&
				hasPermission(['rbac'], { rbac: { scope: 'audit:view' } })
			"
			@click="onApproveWorkflow"
		>
			{{ locale.baseText('audit.status.approve') }}
		</n8n-button>
		<n8n-button
			v-if="
				props.audit_status === 'submitted' &&
				hasPermission(['rbac'], { rbac: { scope: 'audit:view' } })
			"
			@click="onDeclineWorkflow"
			type="secondary"
		>
			{{ locale.baseText('audit.status.decline') }}
		</n8n-button>
		<n8n-button
			v-if="
				props.audit_status === 'created' &&
				!hasPermission(['rbac'], { rbac: { scope: 'audit:view' } })
			"
			@click="onSubmitWorkflowForAudit"
		>
			{{ locale.baseText('audit.status.submit') }}
		</n8n-button>
		<n8n-button
			v-if="
				props.audit_status === 'declined' &&
				!hasPermission(['rbac'], { rbac: { scope: 'audit:view' } })
			"
			@click="onSubmitWorkflowForAudit"
		>
			{{ locale.baseText('audit.status.resubmit') }}
		</n8n-button>
	</div>
</template>

<style lang="scss" module>
.auditButtons {
	display: flex;
	flex-direction: row;
	gap: var(--spacing-2xs);
}
</style>
