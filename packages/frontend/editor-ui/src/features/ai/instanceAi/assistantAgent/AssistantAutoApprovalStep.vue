<script setup lang="ts">
import { N8nAiActivityStep } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { AgentsChatHostEvent, ChatMessage } from '@/features/ai/shared/agentsChat/types';

import { autoApprovalLabel, autoApprovalReason } from '../autoApproval';
import { parseAssistantAutoApproval } from './assistantAutoApproval';

const props = defineProps<{
	event: AgentsChatHostEvent;
	message: ChatMessage;
}>();

const i18n = useI18n();
const approval = computed(() => parseAssistantAutoApproval(props.event));
</script>

<template>
	<N8nAiActivityStep
		v-if="approval"
		:label="autoApprovalLabel(i18n, approval)"
		data-test-id="assistant-auto-approval"
	>
		<p :class="$style.reason">{{ autoApprovalReason(i18n, approval) }}</p>
	</N8nAiActivityStep>
</template>

<style lang="scss" module>
.reason {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
}
</style>
