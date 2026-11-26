<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import {
	WORKFLOW_VERSION_NAME_MAX_LENGTH,
	WORKFLOW_VERSION_DESCRIPTION_MAX_LENGTH,
	type UpdateAgentVersionDto,
} from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { generateVersionLabelFromId } from '@n8n/composables/useWorkflowVersionLabel';
import { useUIStore } from '@/app/stores/ui.store';
import WorkflowVersionForm from '@/app/components/WorkflowVersionForm.vue';
import { AGENT_N8N_CHAT_VIEW } from '../constants';
import AgentModal from './modals/AgentModal.vue';

type SubmitAction = 'submit' | 'publishAndTalk';

export type AgentVersionMetadataModalData = {
	mode: 'edit' | 'publish';
	versionId: string;
	name?: string | null;
	description?: string | null;
	/** Set when publishing adds this agent to n8n Chat. */
	n8nChatAgentId?: string;
	onSubmit: (metadata: UpdateAgentVersionDto) => Promise<boolean>;
	onClose: (saved: boolean) => void;
};

const props = defineProps<{ modalName: string; data: AgentVersionMetadataModalData }>();
const i18n = useI18n();
const uiStore = useUIStore();
const router = useRouter();
const open = computed(() => uiStore.modalsById[props.modalName]?.open === true);
const canTalkToAgent = computed(() => props.data.mode === 'publish' && !!props.data.n8nChatAgentId);
const versionForm = useTemplateRef<InstanceType<typeof WorkflowVersionForm>>('versionForm');
const name = ref(
	props.data.name?.trim() ? props.data.name : generateVersionLabelFromId(props.data.versionId),
);
const description = ref(props.data.description ?? '');
const submitting = ref(false);
const submittingAction = ref<SubmitAction>('submit');
const error = ref('');
const isSubmitDisabled = computed(() => submitting.value || name.value.trim().length === 0);
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

async function submit(action: SubmitAction = 'submit') {
	if (isSubmitDisabled.value) return;

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

	// Open the tab before the publish request: browsers block `window.open` after an await.
	const chatTab =
		action === 'publishAndTalk' && props.data.n8nChatAgentId ? window.open('', '_blank') : null;
	if (chatTab) chatTab.opener = null;
	let chatOpened = false;

	submittingAction.value = action;
	submitting.value = true;

	try {
		if (
			await props.data.onSubmit({
				name: name.value.trim(),
				description: description.value || null,
			})
		) {
			uiStore.closeModal(props.modalName);
			props.data.onClose(true);
			if (chatTab && props.data.n8nChatAgentId) {
				chatTab.location.href = router.resolve({
					name: AGENT_N8N_CHAT_VIEW,
					params: { agentId: props.data.n8nChatAgentId },
				}).href;
				chatOpened = true;
			}
		}
	} finally {
		submitting.value = false;
		if (chatTab && !chatOpened) chatTab.close();
	}
}
</script>

<template>
	<AgentModal
		:open="open"
		:title="title"
		:busy="submitting"
		:show-cancel="!canTalkToAgent"
		size="large"
		data-testid="agent-version-metadata-modal"
		@update:open="!$event && close()"
	>
		<N8nCallout
			v-if="data.mode === 'publish'"
			theme="info"
			:class="$style.publishCallout"
			data-testid="agent-version-metadata-publish-callout"
		>
			{{ i18n.baseText('agents.versionHistory.metadata.changesNotPublished') }}
		</N8nCallout>
		<WorkflowVersionForm
			ref="versionForm"
			v-model:version-name="name"
			v-model:description="description"
			:name-required="true"
			:disabled="submitting"
			version-name-test-id="agent-version-name"
			description-test-id="agent-version-description"
			@focusin.once="versionForm?.focusInput()"
			@submit="submit"
		/>
		<N8nText v-if="error" color="danger" role="alert">{{ error }}</N8nText>
		<!-- Three actions crowd the right side, so Cancel moves to the left. -->
		<template v-if="canTalkToAgent" #footerLeft>
			<N8nButton
				variant="outline"
				:disabled="submitting"
				data-testid="agent-version-metadata-cancel"
				@click="close"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
		</template>
		<template #footerActions>
			<N8nButton
				:variant="canTalkToAgent ? 'outline' : 'solid'"
				:loading="submitting && submittingAction === 'submit'"
				:disabled="isSubmitDisabled"
				data-testid="agent-version-metadata-submit"
				@click="submit()"
			>
				{{
					i18n.baseText(data.mode === 'publish' ? 'agents.publish.button.publish' : 'generic.save')
				}}
			</N8nButton>
			<N8nButton
				v-if="canTalkToAgent"
				:loading="submitting && submittingAction === 'publishAndTalk'"
				:disabled="isSubmitDisabled"
				data-testid="agent-version-metadata-publish-and-talk"
				@click="submit('publishAndTalk')"
			>
				{{ i18n.baseText('agents.versionHistory.metadata.publishAndTalkToAgent') }}
				<N8nIcon icon="external-link" size="small" aria-hidden="true" />
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.publishCallout {
	margin-bottom: var(--spacing--sm);
}
</style>
