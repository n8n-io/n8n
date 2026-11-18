<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import AgentChatMessageAttachments from '@/features/agents/components/AgentChatMessageAttachments.vue';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { ASSISTANT_AGENT_ID } from './assistantAgentThreads';
import { getShareErrors, getSharedFiles } from './assistantSharedFiles';

const props = defineProps<{ toolCall: ToolCall }>();

const i18n = useI18n();

const files = computed(() => getSharedFiles(props.toolCall));
const errors = computed(() => getShareErrors(props.toolCall));
</script>

<template>
	<div v-if="files.length" :class="$style.sharedFiles" data-testid="assistant-shared-files">
		<!-- The chat panel provides the download URLs of the system channel, so no project is needed. -->
		<AgentChatMessageAttachments
			:attachments="files"
			project-id=""
			:agent-id="ASSISTANT_AGENT_ID"
		/>
		<N8nText
			v-for="(failure, index) in errors"
			:key="`${failure.path}-${index}`"
			tag="div"
			size="small"
			color="danger"
			:title="failure.error"
			data-testid="assistant-shared-files-error"
		>
			{{
				i18n.baseText('instanceAi.assistantAgent.sharedFiles.failed', {
					interpolate: { path: failure.path },
				})
			}}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.sharedFiles {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
</style>
