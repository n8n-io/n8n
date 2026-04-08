<script lang="ts" setup>
import type { InstanceAiMessage } from '@n8n/api-types';
import type { RatingFeedback } from '@n8n/design-system';
import { N8nCallout, N8nIcon, N8nIconButton, N8nMessageRating, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { useInstanceAiStore } from '../instanceAi.store';
import AgentActivityTree from './AgentActivityTree.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import ButtonLike from './ButtonLike.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	message: InstanceAiMessage;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
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

const attachments = computed(() => props.message.attachments ?? []);

/** Transient status message from the backend (e.g. "Recalling conversation..."). */
const statusMessage = computed(() => {
	if (!isStreaming.value || !props.message.agentTree) return '';
	return props.message.agentTree.statusMessage ?? '';
});

/**
 * Background task indicator: shows when the orchestrator run has finished
 * but child agents (e.g., workflow builder) are still working in the background.
 */
const hasActiveBackgroundTasks = computed(() => {
	if (!props.message.agentTree || props.message.isStreaming) return false;
	return props.message.agentTree.children.some((c) => c.status === 'active');
});

// --- Feedback ---
const responseId = computed(() => props.message.messageGroupId ?? props.message.id);

const isRateable = computed(
	() =>
		!isUser.value &&
		store.rateableResponseId === responseId.value &&
		!(responseId.value in store.feedbackByResponseId),
);

const hasSubmittedFeedback = computed(
	() => !isUser.value && responseId.value in store.feedbackByResponseId,
);

function onFeedback(payload: RatingFeedback) {
	store.submitFeedback(responseId.value, payload);
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
	<div :class="[isUser ? $style.userMessage : '']">
		<!-- User message -->
		<div v-if="isUser" :class="$style.userBubble" data-test-id="instance-ai-user-message">
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
		<div v-else :class="$style.assistantWrapper" data-test-id="instance-ai-assistant-message">
			<!-- Agent activity tree (handles reasoning, tool calls, sub-agents) -->
			<AgentActivityTree
				v-if="props.message.agentTree"
				:agent-node="props.message.agentTree"
				:is-root="true"
			/>

			<!-- Run-level error -->
			<N8nCallout v-if="runError" theme="danger">
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

			<!-- Background task indicator (run finished but sub-agents still working) -->
			<ButtonLike v-if="hasActiveBackgroundTasks">
				<N8nIcon icon="spinner" color="primary" spin size="small" />
				{{ i18n.baseText('instanceAi.backgroundTask.running') }}
			</ButtonLike>

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

			<N8nIconButton
				v-if="store.debugMode && !isUser"
				icon="code"
				variant="ghost"
				size="xsmall"
				:class="$style.actionBtn"
				@click="showDebugInfo = !showDebugInfo"
			/>
			<pre v-if="showDebugInfo" :class="$style.debugJson">{{ formatJson(props.message) }}</pre>
		</div>
	</div>
</template>

<style lang="scss" module>
.userMessage {
	align-self: flex-end;
	display: flex;
	justify-content: flex-end;
}

.userAttachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.userBubble {
	background: var(--color--background);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	white-space: pre-wrap;
	word-break: break-word;
}

.assistantWrapper {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	&:hover .actionBtn {
		opacity: 1;
	}
}

.actionBtn {
	opacity: 0;
	transition: opacity 0.15s ease;
	position: absolute;
	top: 0;
	right: 0;

	@media (hover: none) {
		opacity: 1;
	}
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

.statusDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--color--primary);
	animation: pulse 1.5s ease-in-out infinite;
}

@keyframes status-fade-in {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.3;
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
