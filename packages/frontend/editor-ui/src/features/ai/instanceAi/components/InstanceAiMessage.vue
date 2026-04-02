<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nIcon, N8nIconButton, N8nMessageRating } from '@n8n/design-system';
import type { RatingFeedback } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AgentActivityTree from './AgentActivityTree.vue';
import type { InstanceAiMessage } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';

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
	<div :class="[$style.message, isUser ? $style.userMessage : $style.assistantMessage]">
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
			<span>{{ props.message.content }}</span>
		</div>

		<!-- Assistant message -->
		<div v-else :class="$style.assistantWrapper" data-test-id="instance-ai-assistant-message">
			<div :class="$style.assistantContent">
				<!-- Agent activity tree (handles reasoning, tool calls, sub-agents) -->
				<AgentActivityTree
					v-if="props.message.agentTree"
					:agent-node="props.message.agentTree"
					:is-root="true"
				/>

				<!-- Run-level error -->
				<div v-if="runError" :class="$style.errorBubble" role="alert">
					<div :class="$style.errorIcon">
						<N8nIcon icon="triangle-alert" size="medium" />
					</div>
					<div :class="$style.errorBody">
						<div :class="$style.errorHeader">
							<span :class="$style.errorTitle">{{ errorTitle }}</span>
							<span v-if="errorDetails?.statusCode" :class="$style.errorStatusCode">{{
								errorDetails.statusCode
							}}</span>
						</div>
						<p v-if="hasProviderError" :class="$style.errorDescription">{{ runError }}</p>
						<details v-if="formattedTechnicalDetails" :class="$style.errorDetailsCollapsible">
							<summary :class="$style.errorDetailsSummary">
								{{ i18n.baseText('instanceAi.error.technicalDetails') }}
							</summary>
							<pre :class="$style.errorDetailsContent">{{ formattedTechnicalDetails }}</pre>
						</details>
					</div>
				</div>

				<!-- Text content (shown when no agentTree, or streaming dots) -->
				<div v-if="showContent && !props.message.agentTree" :class="$style.textContent">
					<InstanceAiMarkdown v-if="props.message.content" :content="props.message.content" />
				</div>

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
				<div v-if="hasActiveBackgroundTasks" :class="$style.backgroundStatus">
					<N8nIcon icon="spinner" spin size="small" />
					<span>{{ i18n.baseText('instanceAi.backgroundTask.running') }}</span>
				</div>
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

			<div :class="$style.actionButtons">
				<N8nIconButton
					v-if="store.debugMode && !isUser"
					icon="code"
					variant="ghost"
					size="xsmall"
					:class="$style.actionBtn"
					@click="showDebugInfo = !showDebugInfo"
				/>
			</div>
			<pre v-if="showDebugInfo" :class="$style.debugJson">{{ formatJson(props.message) }}</pre>
		</div>
	</div>
</template>

<style lang="scss" module>
.message {
	padding: var(--spacing--sm) 0;
}

.userMessage {
	display: flex;
	justify-content: flex-end;
}

.assistantMessage {
	display: flex;
	justify-content: flex-start;
}

.userAttachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.userBubble {
	background: var(--color--background);
	color: var(--color--text);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	max-width: 80%;
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
}

.assistantWrapper {
	position: relative;
	max-width: 90%;
	width: 100%;

	&:hover .actionBtn {
		opacity: 1;
	}
}

.assistantContent {
	width: 100%;
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.actionButtons {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	gap: var(--spacing--4xs);
}

.actionBtn {
	opacity: 0;
	transition: opacity 0.15s ease;

	@media (hover: none) {
		opacity: 1;
	}
}

.feedbackSuccess {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	margin: var(--spacing--2xs) 0 0;
}

.backgroundStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) 0;
	margin-top: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
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

.errorBubble {
	display: flex;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--callout--border-color--danger);
	border-radius: var(--radius);
	background-color: var(--callout--color--background--danger);
	color: var(--callout--color--text--danger);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}

.errorIcon {
	flex-shrink: 0;
	color: var(--callout--icon-color--danger);
	line-height: 1;
	padding-top: var(--spacing--5xs);
}

.errorBody {
	flex: 1;
	min-width: 0;
}

.errorHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.errorTitle {
	font-weight: var(--font-weight--bold);
}

.errorStatusCode {
	margin-left: auto;
	font-weight: var(--font-weight--bold);
	opacity: 0.7;
}

.errorDescription {
	margin: var(--spacing--4xs) 0 0;
	white-space: pre-wrap;
	word-break: break-word;
}

.errorDetailsCollapsible {
	margin-top: var(--spacing--2xs);
}

.errorDetailsSummary {
	cursor: pointer;
	user-select: none;
	opacity: 0.7;

	&:hover {
		opacity: 1;
	}
}

.errorDetailsContent {
	margin-top: var(--spacing--4xs);
	padding: var(--spacing--2xs);
	background: color-mix(in srgb, var(--callout--color--background--danger) 50%, transparent);
	border-radius: var(--radius);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	max-height: 200px;
	overflow-y: auto;
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
