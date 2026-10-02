<script setup lang="ts">
import ChatBubble from './ChatBubble.vue';
import AgentAnswerCard from './AgentAnswerCard.vue';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type AgentAvatarKind } from './AgentAvatar.vue';

defineProps<{
	previewInput: string;
	previewOutput: string;
	errorMessage?: string;
	status?: AgentAvatarKind;
}>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.evalPreview">
		<div :class="$style.evalPreviewUserMessage">
			<ChatBubble :text="previewInput" :status="status" />
		</div>

		<AgentAnswerCard
			data-test-id="instance-ai-test-agent-preview-output"
			:source="previewOutput"
			:status="status"
		/>
		<div v-if="previewOutput" :class="$style.calloutPadding">
			<N8nCallout :theme="!!errorMessage ? 'warning' : 'success'" iconless>
				<strong
					>{{
						i18n.baseText(
							errorMessage
								? 'agents.builder.agentEvals.checks.status.breaksRule'
								: 'agents.builder.agentEvals.checks.status.followsRule',
						)
					}}.</strong
				>
				{{ errorMessage }}
			</N8nCallout>
		</div>
	</div>
</template>

<style module lang="scss">
.evalPreview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--run-data--color--background);
	background-image: repeating-linear-gradient(
		135deg,
		oklch(0% 0 0 / 0.025) 0 5px,
		transparent 5px 10px
	);

	&UserMessage {
		width: 300px;
		align-self: flex-end;
	}
}

.calloutPadding {
	margin-left: 30px;
	margin-top: -10px;
	width: fit-content;
	max-width: 100%;
}
</style>
