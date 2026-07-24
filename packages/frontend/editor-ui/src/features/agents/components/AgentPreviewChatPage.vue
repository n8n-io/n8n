<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nCallout, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useStorage } from '@/app/composables/useStorage';
import { LOCAL_STORAGE_AGENT_EPISODIC_MEMORY_CALLOUT_DISMISSED } from '@/app/constants';
import { useUsersStore } from '@/features/settings/users/users.store';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { AgentJsonConfig, AgentResource } from '../types';
import AgentChatPanel from './AgentChatPanel.vue';

const props = defineProps<{
	initialized: boolean;
	projectId: string;
	agentId: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	effectiveSessionId?: string;
	initialPrompt?: string;
	canSendToAssistant?: boolean;
}>();

const emit = defineEmits<{
	'continue-loaded': [count: number];
	'open-build': [];
	'send-to-assistant': [executionId?: string];
	'open-memory-settings': [];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();
const inputDraft = ref('');
const episodicMemoryCalloutDismissed = useStorage(
	LOCAL_STORAGE_AGENT_EPISODIC_MEMORY_CALLOUT_DISMISSED(usersStore.currentUserId ?? 'anonymous'),
);
const episodicMemoryEnabled = computed(
	() => props.localConfig?.memory?.episodicMemory?.enabled === true,
);
const showEpisodicMemoryCallout = computed(
	() => !episodicMemoryEnabled.value && episodicMemoryCalloutDismissed.value !== 'true',
);
</script>

<template>
	<main :class="$style.previewPage" data-testid="agent-preview-chat-page">
		<div :class="$style.chatFrame">
			<AgentChatPanel
				v-if="initialized && effectiveSessionId"
				:key="`preview-${effectiveSessionId}`"
				v-model:input-draft="inputDraft"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				:continue-session-id="effectiveSessionId"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:can-send-to-assistant="canSendToAssistant"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			>
				<template #above-input>
					<N8nCallout
						v-if="showEpisodicMemoryCallout"
						theme="info"
						icon-size="large"
						icon="brain"
						:class="$style.episodicMemoryCallout"
						data-testid="agent-preview-episodic-memory-callout"
					>
						<N8nText step="sm" bold :class="$style.episodicMemoryCalloutTitle">
							{{ i18n.baseText('agents.builder.memory.episodicMemory.label') }}
						</N8nText>
						<N8nText step="sm" color="text-light">{{
							i18n.baseText('agents.preview.episodicMemoryCallout.text' as BaseTextKey)
						}}</N8nText>

						<template #trailingContent>
							<div :class="$style.episodicMemoryCalloutTrailingContent">
								<N8nButton
									variant="subtle"
									size="small"
									data-testid="agent-preview-episodic-memory-callout-action"
									@click="emit('open-memory-settings')"
								>
									{{ i18n.baseText('agents.preview.episodicMemoryCallout.action' as BaseTextKey) }}
								</N8nButton>
								<N8nTooltip :content="i18n.baseText('generic.dismiss')">
									<N8nIconButton
										icon="x"
										icon-size="medium"
										variant="ghost"
										size="small"
										:aria-label="i18n.baseText('generic.dismiss')"
										data-testid="agent-preview-episodic-memory-callout-dismiss"
										@click="episodicMemoryCalloutDismissed = 'true'"
									/>
								</N8nTooltip>
							</div>
						</template>
					</N8nCallout>
				</template>
			</AgentChatPanel>
		</div>
	</main>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.previewPage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	background-color: var(--background--surface);
	overflow: hidden;
}

.chatFrame {
	width: 100%;
	max-width: 45rem;
	min-height: 0;
	display: flex;
}

.episodicMemoryCallout {
	@include motion.fade-in-up;

	box-shadow: var(--shadow--xs);
	border-radius: var(--radius--lg);
}
.episodicMemoryCalloutTitle {
	margin-right: var(--spacing--3xs);
}
.episodicMemoryCalloutTrailingContent {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}
</style>
