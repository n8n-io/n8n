<script setup lang="ts">
import { AGENT_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nInput, N8nLink, N8nText } from '@n8n/design-system';
import { AGENT_N8N_CHAT_VIEW } from '@/features/agents/constants';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { I18nT } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAgentProjectBreadcrumb } from '../../composables/useAgentProjectBreadcrumb';
import type { AgentChannelViewProps } from '../types';

const props = defineProps<
	AgentChannelViewProps & { savedDescription?: string; availableInChat?: boolean }
>();

const i18n = useI18n();
const router = useRouter();
const { projectName } = useAgentProjectBreadcrumb(computed(() => props.projectId));
const chatUrl = computed(() =>
	props.isPublished && props.availableInChat && props.agentId
		? router.resolve({ name: AGENT_N8N_CHAT_VIEW, params: { agentId: props.agentId } }).href
		: undefined,
);

const description = ref(props.savedDescription ?? '');

defineExpose({ description });
</script>

<template>
	<div :class="$style.editView">
		<N8nCallout theme="info">
			<I18nT keypath="agents.channels.n8nChat.callout" scope="global">
				<template #projectName
					><strong>{{ projectName }}</strong></template
				>
			</I18nT>
			{{ chatUrl ? ' ' : '' }}
			<N8nLink
				v-if="chatUrl"
				:to="chatUrl"
				:underline="false"
				size="small"
				theme="text"
				new-window
				rel="noopener noreferrer"
			>
				<span :class="$style.chatLink">
					<span :class="$style.chatLinkLabel">
						{{ i18n.baseText('agents.channels.n8nChat.talkToAgent') }}
					</span>
					<N8nIcon icon="external-link" />
				</span>
			</N8nLink>
		</N8nCallout>
		<div :class="$style.descriptionBlock">
			<div :class="$style.labelRow">
				<N8nText bold size="medium" color="text-dark">
					{{ i18n.baseText('agents.channels.n8nChat.description.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.channels.n8nChat.description.optional') }}
				</N8nText>
			</div>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.n8nChat.description.hint') }}
			</N8nText>
			<N8nInput
				v-model="description"
				type="textarea"
				:rows="3"
				:maxlength="AGENT_DESCRIPTION_MAX_LENGTH"
				:placeholder="i18n.baseText('agents.channels.n8nChat.description.placeholder')"
				data-testid="agent-channel-n8n-chat-description"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.descriptionBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.chatLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
}

.chatLinkLabel {
	text-decoration: underline;
}

.labelRow {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}
</style>
