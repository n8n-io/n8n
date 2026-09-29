<script setup lang="ts">
import { computed } from 'vue';
import { N8nApprovalCard, N8nIcon, N8nText, type ApprovalOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ApprovalInput, ApprovalResume } from '@/features/ai/shared/agentsChat/types';

const props = defineProps<{
	input: ApprovalInput;
	disabled?: boolean;
	resolvedValue?: ApprovalResume;
}>();

const emit = defineEmits<{
	submit: [resumeData: ApprovalResume];
}>();

const i18n = useI18n();

const toolLabel = computed(() => props.input.displayName ?? props.input.toolName);

const options = computed<ApprovalOption[]>(() => {
	const result: ApprovalOption[] = [];
	if (props.input.supportsSessionApproval) {
		result.push({
			key: 'session',
			icon: 'check-check',
			label: i18n.baseText('agents.chat.approval.allowForSession'),
			testId: 'agent-approval-session',
		});
	}
	result.push(
		{
			key: 'approve',
			icon: 'check',
			label: i18n.baseText('agents.chat.approval.approve'),
			testId: 'agent-approval-approve',
		},
		{
			key: 'reject',
			icon: 'ban',
			label: i18n.baseText('agents.chat.approval.reject'),
			testId: 'agent-approval-reject',
		},
	);
	return result;
});

const detailsText = computed(() => {
	const details = props.input.details ?? props.input.args;
	if (details === undefined) return '';
	try {
		return JSON.stringify(details, null, 2) ?? '';
	} catch {
		return String(details);
	}
});

function submit(key: string) {
	if (props.disabled) return;
	if (key === 'session') {
		emit('submit', { approved: true, scope: 'session' });
		return;
	}
	if (key === 'approve' || key === 'reject') {
		emit('submit', { approved: key === 'approve' });
	}
}
</script>

<template>
	<N8nApprovalCard
		:title="i18n.baseText('agents.chat.approval.title')"
		:description="
			i18n.baseText('agents.chat.approval.description', {
				interpolate: { toolName: toolLabel },
			})
		"
		:options="options"
		:disabled="disabled"
		:autofocus="false"
		data-testid="agent-approval-card"
		@select="submit"
	>
		<details v-if="detailsText" data-testid="agent-approval-tool-details">
			<summary :class="$style.detailsSummary">
				<N8nText size="small">
					{{ i18n.baseText('agents.chat.approval.viewToolDetails') }}
				</N8nText>
			</summary>
			<pre :class="$style.args">{{ detailsText }}</pre>
		</details>

		<template v-if="disabled && resolvedValue" #footer>
			<div :class="$style.resolved">
				<N8nIcon
					:icon="resolvedValue.approved ? 'circle-check' : 'circle-x'"
					size="small"
					:color="resolvedValue.approved ? 'success' : 'danger'"
				/>
				<N8nText size="small">
					{{
						i18n.baseText(
							resolvedValue.approved
								? 'agents.chat.approval.approved'
								: 'agents.chat.approval.rejected',
						)
					}}
				</N8nText>
			</div>
		</template>
	</N8nApprovalCard>
</template>

<style lang="scss" module>
.resolved {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.args {
	margin: var(--spacing--2xs) 0 0;
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	white-space: pre-wrap;
	word-break: break-word;
}

.detailsSummary {
	cursor: pointer;
}
</style>
