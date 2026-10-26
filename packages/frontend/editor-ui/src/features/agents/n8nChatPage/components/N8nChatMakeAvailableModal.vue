<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8N_CHAT_INTEGRATION_TYPE, type AgentChatListItem } from '@n8n/api-types';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import AgentModal from '../../components/modals/AgentModal.vue';
import { connectIntegration, publishAgent } from '../../composables/useAgentApi';
import { useAgentProjectBreadcrumb } from '../../composables/useAgentProjectBreadcrumb';
import { upsertProjectAgentsListCache } from '../../composables/useProjectAgentsList';

const props = defineProps<{
	agent: AgentChatListItem;
}>();

const emit = defineEmits<{
	close: [];
	available: [agent: AgentChatListItem];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const { projectName } = useAgentProjectBreadcrumb(computed(() => props.agent.project.id));

const submitting = ref(false);

async function onConfirm(): Promise<void> {
	if (submitting.value) return;
	const agent = props.agent;
	submitting.value = true;
	try {
		const { project, id } = agent;
		await connectIntegration(
			rootStore.restApiContext,
			project.id,
			id,
			N8N_CHAT_INTEGRATION_TYPE,
			'',
		);
		const published = await publishAgent(rootStore.restApiContext, project.id, id);
		upsertProjectAgentsListCache(project.id, published);
		emit('available', { ...agent, availableInChat: true });
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.n8nChatPage.makeAvailable.error'));
	} finally {
		submitting.value = false;
	}
}

function onOpenChange(open: boolean): void {
	if (!open) emit('close');
}
</script>

<template>
	<AgentModal
		:open="true"
		:title="
			i18n.baseText('agents.n8nChatPage.makeAvailable.title', {
				interpolate: { name: agent.name },
			})
		"
		:busy="submitting"
		:show-cancel="false"
		size="medium"
		data-test-id="n8n-chat-make-available-modal"
		@update:open="onOpenChange"
	>
		<div :class="$style.content">
			<N8nText>
				{{
					i18n.baseText('agents.n8nChatPage.makeAvailable.description', {
						interpolate: { projectName: projectName ?? agent.project.name },
					})
				}}
			</N8nText>
			<N8nCallout theme="info">
				{{ i18n.baseText('agents.n8nChatPage.makeAvailable.publishNotice') }}
			</N8nCallout>
		</div>
		<template #footerActions>
			<N8nButton variant="outline" :disabled="submitting" @click="emit('close')">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				:loading="submitting"
				data-test-id="n8n-chat-make-available-confirm"
				@click="onConfirm"
			>
				{{ i18n.baseText('agents.n8nChatPage.makeAvailable.confirm') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
