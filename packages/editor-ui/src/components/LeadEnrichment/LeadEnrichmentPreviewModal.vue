<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { LEAD_ENRICHMENT_FLAG, LEAD_ENRICHMENT_PREVIEW_MODAL_KEY, VIEWS } from '@/constants';
import type { IWorkflowDb, LeadEnrichmentWorkflowPreview } from '@/Interface';
import Modal from '@/components/Modal.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

const props = defineProps<{
	modalName: string;
	data: {
		workflow: LeadEnrichmentWorkflowPreview;
	};
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const toast = useToast();
const telemetry = useTelemetry();

function showConfirmationMessage(event: PointerEvent) {
	if (event.target instanceof HTMLAnchorElement) {
		event.preventDefault();
		// @ts-expect-error Additional parameters are not necessary for this function
		toast.showMessage({
			title: i18n.baseText('leadEnrichment.notification.confirmation.title'),
			message: i18n.baseText('leadEnrichment.notification.confirmation.message'),
			type: 'success',
		});
		telemetry.track('User wants to be notified once template is ready', undefined, {
			withPostHog: true,
		});
		localStorage.setItem(LEAD_ENRICHMENT_FLAG, 'false');
		uiStore.deleteLeadEnrichmentTemplates();
	}
}

function openCanvas() {
	uiStore.setNodeViewNotifications([
		{
			title: i18n.baseText('leadEnrichment.notification.comingSoon.title'),
			message: i18n.baseText('leadEnrichment.notification.comingSoon.message'),
			type: 'info',
			onClick: showConfirmationMessage,
		},
	]);
	uiStore.closeModal(LEAD_ENRICHMENT_PREVIEW_MODAL_KEY);
	uiStore.nodeViewInitialized = false;
	void router.push({ name: VIEWS.NEW_WORKFLOW });
	telemetry.track('User clicked Use Template button', undefined, { withPostHog: true });
}
</script>

<template>
	<Modal width="900px" height="640px" :name="props.modalName">
		<template #header>
			<n8n-heading tag="h2" size="xlarge">
				{{ $props.data.workflow.title }}
			</n8n-heading>
		</template>
		<template #content>
			<workflow-preview
				:loading="false"
				:workflow="$props.data.workflow.preview as IWorkflowDb"
				:canOpenNDV="false"
				:hideNodeIssues="true"
				@close="uiStore.closeModal(LEAD_ENRICHMENT_PREVIEW_MODAL_KEY)"
			/>
		</template>
		<template #footer>
			<div>
				<n8n-text> {{ $props.data.workflow.description }} </n8n-text>
			</div>
			<div :class="$style.footerButtons">
				<n8n-button
					@click="openCanvas"
					float="right"
					:label="$locale.baseText('leadEnrichment.modal.button.label')"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.footerButtons {
	margin-top: var(--spacing-xl);
}
</style>
