<script setup lang="ts">
/**
 * The chat thread of one check, in the order of its run:
 * idle, preparing, awaiting-reply, analyzing, then pass, needs-work or error.
 * While it runs, a status line under the last turn says what happens now and the
 * working bands run along the bottom edge. After the run, the practice strip
 * joins under the thread.
 */
import { computed } from 'vue';
import { N8nButton, N8nCallout, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { usePracticeRunBannerDismissal } from '../composables/usePracticeRunBannerDismissal';
import AgentAiWorkingBands from './AgentAiWorkingBands.vue';
import AgentAnswerCard from './AgentAnswerCard.vue';
import AgentAvatar from './AgentAvatar.vue';
import AgentEvalToolCalls from './AgentEvalToolCalls.vue';
import ChatBubble from './ChatBubble.vue';

export type AgentThreadPreviewState =
	| 'idle'
	| 'preparing'
	| 'awaiting-reply'
	| 'analyzing'
	| 'pass'
	| 'needs-work'
	| 'error';

const props = defineProps<{
	state: AgentThreadPreviewState;
	input?: string | null;
	output?: string | null;
	/** The judge's reasoning on needs-work, or why the run failed on error. */
	message?: string | null;
	toolCalls?: ToolCall[];
	projectId?: string;
	/** Replaces the running status line, for a run with a reason of its own. */
	statusLabel?: string;
	hidePracticeNote?: boolean;
}>();

const i18n = useI18n();
const { dismissed: practiceNoteDismissed, dismiss: dismissPracticeNote } =
	usePracticeRunBannerDismissal();

const isRunning = computed(
	() =>
		props.state === 'preparing' || props.state === 'awaiting-reply' || props.state === 'analyzing',
);
const hasVerdict = computed(
	() => props.state === 'pass' || props.state === 'needs-work' || props.state === 'error',
);
const showPracticeNote = computed(
	() =>
		!props.hidePracticeNote &&
		!practiceNoteDismissed.value &&
		(props.state === 'pass' || props.state === 'needs-work'),
);

const STATUS_KEYS: Partial<Record<AgentThreadPreviewState, BaseTextKey>> = {
	preparing: 'agents.builder.agentEvals.thread.preparing',
	'awaiting-reply': 'agents.builder.agentEvals.thread.awaitingReply',
	analyzing: 'agents.builder.agentEvals.thread.analyzing',
};
const statusText = computed(() => {
	if (props.statusLabel) return props.statusLabel;
	const key = STATUS_KEYS[props.state];
	return key ? i18n.baseText(key) : '';
});

const showAnswer = computed(
	() =>
		(props.state === 'analyzing' || props.state === 'pass' || props.state === 'needs-work') &&
		Boolean(props.output),
);
const answerStatus = computed(() => {
	if (props.state === 'pass') return 'pass';
	if (props.state === 'needs-work') return 'work';
	return 'idle';
});
</script>

<template>
	<div :class="$style.root" :data-state="state" data-test-id="agent-thread-preview">
		<div
			:class="[
				$style.ground,
				{ [$style.running]: isRunning, [$style.joinedBelow]: showPracticeNote },
			]"
		>
			<!-- preparing: the request is still being written, so its bubble is dashed and empty. -->
			<div v-if="state === 'preparing'" :class="$style.draftMessage" aria-hidden="true">
				<span :class="$style.draftLine" />
				<span :class="[$style.draftLine, $style.draftLineShort]" />
			</div>
			<div v-else-if="input" :class="$style.userMessage">
				<ChatBubble :text="input" />
			</div>

			<div
				v-if="toolCalls && toolCalls.length > 0 && (showAnswer || hasVerdict)"
				:class="$style.tools"
			>
				<AgentEvalToolCalls :tool-calls="toolCalls" :project-id="projectId" />
			</div>

			<div :class="$style.answerGroup">
				<AgentAnswerCard v-if="showAnswer" :source="output ?? ''" :status="answerStatus" />
				<div v-else-if="state === 'awaiting-reply'" :class="$style.answerRow">
					<AgentAvatar kind="waiting" size="sm" />
					<div :class="$style.typingBubble" data-test-id="agent-thread-preview-typing">
						<span :class="$style.dot" />
						<span :class="$style.dot" />
						<span :class="$style.dot" />
					</div>
				</div>
				<div v-else-if="state === 'idle' || state === 'error'" :class="$style.answerRow">
					<AgentAvatar :kind="state === 'error' ? 'fail' : 'idle'" size="sm" />
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText(
								state === 'error'
									? 'agents.builder.agentEvals.thread.noReply'
									: 'agents.builder.agentEvals.thread.notRun',
							)
						}}
					</N8nText>
				</div>

				<div
					v-if="isRunning"
					:class="$style.status"
					role="status"
					data-test-id="agent-thread-preview-status"
				>
					<span :class="$style.statusText">{{ statusText }}</span>
				</div>

				<div v-else-if="hasVerdict" :class="$style.verdict">
					<N8nCallout v-if="state === 'pass'" theme="success" iconless>
						<strong>{{
							i18n.baseText('agents.builder.agentEvals.checks.status.followsRule')
						}}</strong>
					</N8nCallout>
					<N8nCallout v-else-if="state === 'needs-work'" theme="secondary" iconless>
						{{ i18n.baseText('agents.builder.agentEvals.checks.status.breaksRule') }}
						{{ message }}
					</N8nCallout>
					<N8nCallout v-else theme="danger" iconless>
						{{ message || i18n.baseText('agents.builder.agentEvals.thread.runFailed') }}
					</N8nCallout>
				</div>
			</div>

			<Transition
				:enter-active-class="$style.bandsFadeActive"
				:leave-active-class="$style.bandsFadeActive"
				:enter-from-class="$style.bandsFadeHidden"
				:leave-to-class="$style.bandsFadeHidden"
			>
				<AgentAiWorkingBands v-if="isRunning" />
			</Transition>
		</div>

		<div v-if="showPracticeNote" :class="$style.practiceNote">
			<N8nText size="small">
				<strong>{{ i18n.baseText('instanceAi.testAgentPreview.practiceRunTitle') }}.</strong>
				{{ i18n.baseText('instanceAi.testAgentPreview.practiceRunDescription') }}
			</N8nText>
			<N8nButton variant="ghost" size="xsmall" @click="dismissPracticeNote">
				{{ i18n.baseText('instanceAi.testAgentPreview.gotIt') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.root {
	--thread-preview--gutter: 30px;

	display: flex;
	flex-direction: column;
	width: 100%;
}

.ground {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--run-data--color--background);
	// The text colour flips with the theme, so the stripes show on light and dark run data.
	background-image: repeating-linear-gradient(
		135deg,
		color-mix(in srgb, var(--text-color) 3%, transparent) 0 5px,
		transparent 5px 10px
	);
	transition: padding-bottom var(--duration--snappy) var(--easing--ease-out);
}

// Room for the bands under the last line while they run.
.running {
	padding-bottom: var(--spacing--xl);
}

.joinedBelow {
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
}

.userMessage,
.draftMessage {
	max-width: 300px;
	width: 100%;
	align-self: flex-end;
}

.draftMessage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--2xs);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius--xl) var(--radius--xl) 0 var(--radius--xl);
}

.draftLine {
	height: 8px;
	border-radius: 4px;
	background-color: var(--border-color);
	@include motion.fade-in-up;
}

.draftLineShort {
	width: 60%;
}

.tools {
	margin-left: var(--thread-preview--gutter);
}

.answerGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.answerRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.typingBubble {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 38px;
	padding: 0 var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl) var(--radius--xl) var(--radius--xl) 0;
	background-color: var(--background--surface);
}

.dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background-color: var(--text-color--subtler);
	animation: typing-pulse 1.2s ease-in-out infinite;

	&:nth-child(2) {
		animation-delay: 0.2s;
	}

	&:nth-child(3) {
		animation-delay: 0.4s;
	}

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}

@keyframes typing-pulse {
	0%,
	100% {
		opacity: 0.4;
	}
	50% {
		opacity: 1;
	}
}

.status,
.verdict {
	padding-left: var(--thread-preview--gutter);
}

.statusText {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: var(--text-color--subtle);
	--animation--shimmer--foreground: var(--text-color--subtler);
	@include motion.shimmer;
}

.verdict {
	width: fit-content;
	max-width: 100%;
}

.bandsFadeActive {
	transition: opacity var(--duration--base) var(--easing--ease-out);
}

.bandsFadeHidden {
	opacity: 0;
}

.practiceNote {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-top: calc(-1 * var(--border-width));
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--3xs) var(--spacing--xs);
	border: var(--border-width) solid var(--callout--border-color--warning);
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	background-color: var(--callout--color--background--warning);
	color: var(--callout--color--text--warning);
}
</style>
