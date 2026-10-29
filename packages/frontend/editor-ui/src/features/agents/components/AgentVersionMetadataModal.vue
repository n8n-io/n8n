<script setup lang="ts">
import { computed, ref } from 'vue';
import {
	WORKFLOW_VERSION_NAME_MAX_LENGTH,
	WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH,
	type UpdateAgentVersionDto,
} from '@n8n/api-types';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import AgentModal from './modals/AgentModal.vue';

export type AgentVersionMetadataModalData = {
	mode: 'edit' | 'publish';
	name?: string | null;
	description?: string | null;
	onSubmit: (metadata: UpdateAgentVersionDto) => Promise<boolean>;
	onClose: (saved: boolean) => void;
};

const props = defineProps<{ modalName: string; data: AgentVersionMetadataModalData }>();
const i18n = useI18n();
const uiStore = useUIStore();
const open = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const name = ref(props.data.name ?? '');
const description = ref(props.data.description ?? '');
const submitting = ref(false);
const error = ref('');
const title = computed(() =>
	i18n.baseText(
		props.data.mode === 'publish'
			? 'agents.versionHistory.metadata.publishTitle'
			: 'agents.versionHistory.metadata.editTitle',
	),
);

function close() {
	if (submitting.value) return;
	uiStore.closeModal(props.modalName);
	props.data.onClose(false);
}

async function submit() {
	if (submitting.value) return;
	error.value = '';
	if (
		name.value.length > WORKFLOW_VERSION_NAME_MAX_LENGTH ||
		description.value.length > WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH
	) {
		error.value = i18n.baseText('agents.versionHistory.metadata.tooLong', {
			interpolate: {
				nameMax: WORKFLOW_VERSION_NAME_MAX_LENGTH,
				descriptionMax: WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH,
			},
		});
		return;
	}
	submitting.value = true;
	try {
		if (
			await props.data.onSubmit({
				name: name.value.trim() || null,
				description: description.value || null,
			})
		) {
			uiStore.closeModal(props.modalName);
			props.data.onClose(true);
		}
	} finally {
		submitting.value = false;
	}
}
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:busy="submitting"
		size="large"
		data-testid="agent-version-metadata-modal"
		@update:open="!$event && close()"
	>
		<WorkflowVersionForm
			v-model:version-name="name"
			v-model:description="description"
			:name-required="false"
			:disabled="submitting"
			version-name-test-id="agent-version-name"
			description-test-id="agent-version-description"
			@submit="submit"
		/>
		<N8nText v-if="error" color="danger" role="alert">{{ error }}</N8nText>
		<template #footerActions>
			<N8nButton :loading="submitting" data-testid="agent-version-metadata-submit" @click="submit">
				{{
					i18n.baseText(data.mode === 'publish' ? 'agents.publish.button.publish' : 'generic.save')
				}}
			</N8nButton>
		</template>
	</AgentModal>
</template>
