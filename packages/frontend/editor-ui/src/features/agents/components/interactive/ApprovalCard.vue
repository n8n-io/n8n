<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
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

const argsText = computed(() => {
	if (props.input.args === undefined) return '';
	try {
		return JSON.stringify(props.input.args, null, 2) ?? '';
	} catch {
		return String(props.input.args);
	}
});

function submit(approved: boolean) {
	if (props.disabled) return;
	emit('submit', { approved });
}
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="agent-approval-card">
		<div :class="$style.cardBody">
			<N8nText tag="p" bold :class="$style.title">
				{{ i18n.baseText('agents.chat.approval.title') }}
			</N8nText>

			<N8nText tag="p" size="small" :class="$style.description">
				{{
					i18n.baseText('agents.chat.approval.description', {
						interpolate: { toolName: toolLabel },
					})
				}}
			</N8nText>

			<pre v-if="argsText" :class="$style.args">{{ argsText }}</pre>

			<div v-if="disabled && resolvedValue" :class="$style.resolved">
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

			<div v-else :class="$style.actions">
				<N8nButton
					size="medium"
					type="primary"
					:disabled="disabled"
					data-testid="agent-approval-approve"
					@click="submit(true)"
				>
					{{ i18n.baseText('agents.chat.approval.approve') }}
				</N8nButton>
				<N8nButton
					size="medium"
					variant="outline"
					:disabled="disabled"
					data-testid="agent-approval-reject"
					@click="submit(false)"
				>
					{{ i18n.baseText('agents.chat.approval.reject') }}
				</N8nButton>
			</div>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	width: 90%;
	max-width: 90%;
}

.disabled {
	opacity: 0.75;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.resolved,
.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.title,
.description {
	margin: 0;
}

.title {
	font-size: var(--font-size--sm);
}

.args {
	margin: 0;
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

.actions {
	justify-content: flex-end;
	padding-top: var(--spacing--2xs);
}
</style>
