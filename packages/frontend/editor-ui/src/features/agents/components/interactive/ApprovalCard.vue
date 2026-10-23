<script setup lang="ts">
import { computed } from 'vue';
import { N8nApprovalCard } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import type { ApprovalInput, ApprovalResume } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	input: ApprovalInput;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: ApprovalResume];
}>();

const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();

const toolLabel = computed(() => props.input.displayName ?? props.input.toolName);

function submit(key: string) {
	if (props.disabled) return;
	if (key === 'always-allow') {
		emit('submit', { approved: true, scope: 'session' });
		return;
	}
	if (key === 'allow-once' || key === 'deny') {
		emit('submit', { approved: key === 'allow-once' });
	}
}
</script>

<template>
	<N8nApprovalCard
		:title="i18n.baseText('agents.chat.approval.title')"
		:labels="approvalLabels"
		:description="
			i18n.baseText('agents.chat.approval.description', {
				interpolate: { toolName: toolLabel },
			})
		"
		:args="input.args"
		:supports-session-approval="input.supportsSessionApproval"
		:disabled="disabled"
		data-testid="agent-approval-card"
		@select="submit"
	/>
</template>
