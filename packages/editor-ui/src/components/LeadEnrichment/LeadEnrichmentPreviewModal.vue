<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { LEAD_ENRICHMENT_PREVIEW_MODAL_KEY, VIEWS } from '@/constants';
import { IWorkflowDb, type LeadEnrichmentWorkflowPreview } from '@/Interface';
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

function showConfirmationMessage(event: PointerEvent) {
	if (event.target instanceof HTMLAnchorElement) {
		event.preventDefault();
		// @ts-expect-error Additional parameters are not necessary for this function
		toast.showMessage({
			title: i18n.baseText('leadEnrichment.notification.confirmation.title'),
			message: i18n.baseText('leadEnrichment.notification.confirmation.message'),
			type: 'success',
		});
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
}
</script>

<template>
	<Modal width="640px" height="640px" :name="props.modalName">
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
	margin-top: 40px;
}
</style>
