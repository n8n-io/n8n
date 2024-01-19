<script lang="ts" setup>
import { useI18n } from '@/composables/useI18n';
import { useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	SUGGESTED_TEMPLATES_FLAG,
	SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY,
	VIEWS,
} from '@/constants';
import type { IWorkflowDb, SuggestedTemplatesWorkflowPreview } from '@/Interface';
import Modal from '@/components/Modal.vue';
import WorkflowPreview from '@/components/WorkflowPreview.vue';

const props = defineProps<{
	modalName: string;
	data: {
		workflow: SuggestedTemplatesWorkflowPreview;
	};
}>();

const i18n = useI18n();
const router = useRouter();
const uiStore = useUIStore();
const usersStore = useUsersStore();
const toast = useToast();
const telemetry = useTelemetry();

function showConfirmationMessage(event: PointerEvent) {
	if (event.target instanceof HTMLAnchorElement) {
		event.preventDefault();
		// @ts-expect-error Additional parameters are not necessary for this function
		toast.showMessage({
			title: i18n.baseText('suggestedTemplates.notification.confirmation.title'),
			message: i18n.baseText('suggestedTemplates.notification.confirmation.message'),
			type: 'success',
		});
		telemetry.track(
			'User wants to be notified once template is ready',
			{ templateName: props.data.workflow.title, email: usersStore.currentUser?.email },
			{
				withPostHog: true,
			},
		);
	}
}

function openCanvas() {
	uiStore.setNotificationsForView(VIEWS.WORKFLOW, [
		{
			title: i18n.baseText('suggestedTemplates.notification.comingSoon.title'),
			message: i18n.baseText('suggestedTemplates.notification.comingSoon.message'),
			type: 'info',
			duration: 10000,
			onClick: showConfirmationMessage,
		},
	]);
	localStorage.setItem(SUGGESTED_TEMPLATES_FLAG, 'false');
	uiStore.deleteSuggestedTemplates();
	uiStore.closeModal(SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY);
	uiStore.nodeViewInitialized = false;
	void router.push({ name: VIEWS.NEW_WORKFLOW });
	telemetry.track(
		'User clicked Use Template button',
		{ templateName: props.data.workflow.title },
		{ withPostHog: true },
	);
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
			<WorkflowPreview
				:loading="false"
				:workflow="$props.data.workflow.preview as IWorkflowDb"
				:can-open-n-d-v="false"
				:hide-node-issues="true"
				@close="uiStore.closeModal(SUGGESTED_TEMPLATES_PREVIEW_MODAL_KEY)"
			/>
		</template>
		<template #footer>
			<div>
				<n8n-text> {{ $props.data.workflow.description }} </n8n-text>
			</div>
			<div :class="$style.footerButtons">
				<n8n-button
					float="right"
					data-test-id="use-template-button"
					:label="$locale.baseText('suggestedTemplates.modal.button.label')"
					@click="openCanvas"
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
