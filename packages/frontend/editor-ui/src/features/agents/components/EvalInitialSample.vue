<script setup lang="ts">
import ChatBubble from './ChatBubble.vue';
import AgentAnswerCard from './AgentAnswerCard.vue';
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { type AgentAvatarKind } from './AgentAvatar.vue';

const props = defineProps<{
	previewInput: string;
	previewOutput: string;
	errorMessage?: string;
	status?: AgentAvatarKind;
}>();

const i18n = useI18n();

// Keyed to `status`, not to whether an `errorMessage` happens to be set — a
// local "Actually fine" override changes `status` to pass without touching
// `errorMessage`, and the banner must follow that, not keep showing the old
// failure text.
const isFailing = computed(() => props.status === 'work' || props.status === 'fail');
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
			<N8nCallout :theme="isFailing ? 'warning' : 'success'" iconless>
				<strong>{{
					i18n.baseText(
						isFailing
							? 'agents.builder.agentEvals.checks.status.breaksRule'
							: 'agents.builder.agentEvals.checks.status.followsRule',
					)
				}}</strong>
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
