<script lang="ts" setup>
import type { InstanceAiMessage } from '@n8n/api-types';
import type { RatingFeedback } from '@n8n/design-system';
import {
	N8nButton,
	N8nCallout,
	N8nChatMessage,
	N8nIcon,
	N8nIconButton,
	N8nMessageRating,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useInstanceAiStore, useThread } from '../instanceAi.store';
import AgentActivityTree from './AgentActivityTree.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	message: InstanceAiMessage;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const thread = useThread();
const showDebugInfo = ref(false);

const isUser = computed(() => props.message.role === 'user');
const isStreaming = computed(() => props.message.isStreaming);
const showContent = computed(() => props.message.content.length > 0 || isStreaming.value);

const runError = computed(() => {
	const tree = props.message.agentTree;
	if (!tree || tree.status !== 'error' || !tree.error) return null;
	return tree.error;
});

const errorDetails = computed(() => {
	const tree = props.message.agentTree;
	if (!tree || tree.status !== 'error') return null;
	return tree.errorDetails ?? null;
});

const hasProviderError = computed(() => !!errorDetails.value?.provider);

/** The run failed because the user ran out of AI credits — show a tailored state. */
const isQuotaExhausted = computed(() => errorDetails.value?.code === 'quota_exhausted');

const { goToUpgrade } = usePageRedirectionHelper();

/** A run the user (or a timeout/shutdown) stopped before it completed. */
const runCancelled = computed(() => props.message.agentTree?.status === 'cancelled');

/** Attribute the stop to its cause; falls back to the generic label when unknown. */
const cancelledLabel = computed(() => {
	switch (props.message.agentTree?.cancellationReason) {
		case 'user':
			return i18n.baseText('instanceAi.agentTree.stoppedByUser');
		case 'timeout':
			return i18n.baseText('instanceAi.agentTree.timedOut');
		default:
			return i18n.baseText('instanceAi.agentTree.cancelled');
	}
});

const errorTitle = computed(() => {
	if (hasProviderError.value) {
		return `${errorDetails.value!.provider} ${i18n.baseText('instanceAi.agentTree.error')}`;
	}
	return runError.value ?? i18n.baseText('instanceAi.error.title');
});

const formattedTechnicalDetails = computed(() => {
	const details = errorDetails.value;
	if (!details?.technicalDetails) return null;
	try {
		return JSON.stringify(JSON.parse(details.technicalDetails), null, 2);
	} catch {
		return details.technicalDetails;
	}
});

const attachments = computed(() =>
	(props.message.attachments ?? []).map((attachment) => {
		if (attachment.type !== 'agent') return attachment;
		const name = thread.producedArtifacts.get(attachment.id)?.name;
		return name && name !== attachment.name ? { ...attachment, name } : attachment;
	}),
);

/** Transient status message from the backend (e.g. "Recalling conversation..."). */
const statusMessage = computed(() => {
	if (!isStreaming.value || !props.message.agentTree) return '';
	return props.message.agentTree.statusMessage ?? '';
});

// --- Feedback ---
const responseId = computed(() => props.message.messageGroupId ?? props.message.id);

const isRateable = computed(
	() =>
		!isUser.value &&
		thread.rateableResponseId === responseId.value &&
		!(responseId.value in thread.feedbackByResponseId),
);

const hasSubmittedFeedback = computed(
	() => !isUser.value && responseId.value in thread.feedbackByResponseId,
);

function onFeedback(payload: RatingFeedback) {
	thread.submitFeedback(responseId.value, payload);
}

function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
</script>

<template>
	<N8nChatMessage
		:role="props.message.role"
		:data-test-id="isUser ? 'instance-ai-user-message' : 'instance-ai-assistant-message'"
	>
		<!-- User message -->
		<div v-if="isUser">
			<div v-if="attachments.length > 0" :class="$style.userAttachments">
				<AttachmentPreview
					v-for="(attachment, index) in attachments"
					:key="index"
					:attachment="attachment"
					:is-removable="false"
				/>
			</div>
			<N8nText size="large">{{ props.message.content }}</N8nText>
		</div>

		<!-- Assistant message -->
		<template v-else>
			<!-- Agent activity tree (handles reasoning, tool calls, sub-agents) -->
			<AgentActivityTree v-if="props.message.agentTree" :agent-node="props.message.agentTree" />

			<!-- Out-of-credits (quota exhausted): tailored state, hides raw provider/status noise -->
			<N8nCallout v-if="isQuotaExhausted" theme="warning" data-test-id="instance-ai-out-of-credits">
				{{ i18n.baseText('instanceAi.error.outOfCredits.title') }}
				<template #trailingContent>
					<N8nButton
						variant="outline"
						size="xsmall"
						data-test-id="instance-ai-out-of-credits-upgrade"
						@click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
					>
						{{ i18n.baseText('instanceAi.error.outOfCredits.upgrade') }}
					</N8nButton>
				</template>
			</N8nCallout>

			<!-- Run-level error -->
			<N8nCallout v-else-if="runError" theme="danger">
				<div :class="$style.runLevelError">
					<N8nText bold tag="div">{{ errorTitle }}</N8nText>
					<N8nText v-if="hasProviderError" tag="div">{{ runError }}</N8nText>
					<details v-if="formattedTechnicalDetails">
						<summary :class="$style.errorDetailsSummary">
							{{ i18n.baseText('instanceAi.error.technicalDetails') }}
						</summary>
						<pre :class="$style.runLevelErrorDetails">{{ formattedTechnicalDetails }}</pre>
					</details>
				</div>

				<template v-if="errorDetails?.statusCode" #trailingContent>
					{{ errorDetails.statusCode }}
				</template>
			</N8nCallout>

			<!-- Text content (shown when no agentTree, or streaming dots) -->
			<N8nText v-if="showContent && !props.message.agentTree && props.message.content" size="large">
				<InstanceAiMarkdown :content="props.message.content" />
			</N8nText>

			<!-- Status indicator while preparing context -->
			<div v-if="statusMessage && !props.message.content" :class="$style.statusIndicator">
				<span :class="$style.statusDot" />
				<span>{{ statusMessage }}</span>
			</div>

			<!-- Blinking cursor while waiting for response -->
			<span
				v-else-if="isStreaming && !props.message.content && !props.message.agentTree"
				:class="$style.blinkingCursor"
			/>

			<!-- Run stopped indicator (survives reload via the persisted cancelled status) -->
			<div
				v-if="runCancelled"
				:class="$style.cancelledIndicator"
				data-test-id="instance-ai-run-cancelled"
			>
				<N8nIcon icon="circle-x" size="small" />
				<span>{{ cancelledLabel }}</span>
			</div>

			<!-- Response feedback -->
			<N8nMessageRating
				v-if="isRateable"
				minimal
				data-test-id="instance-ai-message-rating"
				@feedback="onFeedback"
			/>
			<p
				v-else-if="hasSubmittedFeedback"
				:class="$style.feedbackSuccess"
				data-test-id="instance-ai-feedback-success"
			>
				{{ i18n.baseText('instanceAi.feedback.success') }}
			</p>

			<pre v-if="showDebugInfo" :class="$style.debugJson">{{ formatJson(props.message) }}</pre>
		</template>

		<template v-if="store.debugMode && !isUser" #actions>
			<N8nIconButton
				icon="code"
				variant="ghost"
				size="xsmall"
				@click="showDebugInfo = !showDebugInfo"
			/>
		</template>
	</N8nChatMessage>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.userAttachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.statusIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) 0;
	animation: status-fade-in 0.2s ease;
}

.cancelledIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.statusDot {
	--animation--opacity-pulse--duration: 1.5s;
	--animation--opacity-pulse--opacity-end: 0.3;

	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color--primary);
	@include motion.opacity-pulse;
}

@keyframes status-fade-in {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

.blinkingCursor {
	display: inline-block;
	width: 2px;
	height: 1.2em;
	background: var(--color--text);
	animation: cursor-blink 1s step-end infinite;
	vertical-align: text-bottom;
}

@keyframes cursor-blink {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0;
	}
}

.runLevelError {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.runLevelErrorDetails {
	margin-top: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 200px;
	overflow-y: auto;
}

.errorDetailsSummary {
	cursor: pointer;
	user-select: none;
	opacity: 0.7;

	&:hover {
		opacity: 1;
	}
}

.feedbackSuccess {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	margin: var(--spacing--2xs) 0 0;
}

.debugJson {
	margin-top: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 300px;
	overflow-y: auto;
	color: var(--color--text--tint-1);
}
</style>
