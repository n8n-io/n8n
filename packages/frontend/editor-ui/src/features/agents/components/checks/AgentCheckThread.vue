<script setup lang="ts">
/**
 * A replayed example on the practice surface: the customer message, the tool
 * calls the agent would have made (eval runs mock every side effect), and the
 * reply with its reaction head. With `verdict`, the judge's verdict sits under
 * the reply it judges. The first surface a person sees explains the practice
 * run in a footer; once dismissed, every surface keeps a folded corner instead.
 */
import { ref } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useAgentChecksPractice } from '../../composables/useAgentChecksPractice';
import type { AgentCheckExample } from '../../utils/agentChecks.utils';
import { toolCallParts } from '../../utils/agentChecks.utils';
import AgentClampText from './AgentClampText.vue';
import AgentReaction from './AgentReaction.vue';

defineProps<{
	example: AgentCheckExample;
	verdict?: boolean;
	/** Offer a thumbs-down next to a passing reply, for when the verdict is wrong. */
	flaggable?: boolean;
}>();

const emit = defineEmits<{
	flag: [example: AgentCheckExample];
}>();

const i18n = useI18n();
const { seen, dismiss } = useAgentChecksPractice();
const curled = ref(false);

const callLabel = (call: AgentCheckExample['toolCalls'][number]) => {
	const { tool, detail } = toolCallParts(call);
	return detail
		? i18n.baseText('agents.builder.agentChecks.thread.wouldHaveWith', {
				interpolate: { tool, detail },
			})
		: i18n.baseText('agents.builder.agentChecks.thread.wouldHave', { interpolate: { tool } });
};
</script>

<template>
	<div :class="$style.threadWrap">
		<div
			:class="[$style.thread, { [$style.cut]: seen, [$style.cutOpen]: seen && curled }]"
			data-testid="agent-check-thread"
		>
			<div :class="$style.you"><AgentClampText :text="example.input" :lines="3" /></div>
			<div
				v-for="(call, index) in example.toolCalls"
				:key="index"
				:class="[$style.call, { [$style.callError]: !!call.error }]"
			>
				<N8nIcon icon="wrench" size="small" />
				<span :class="$style.callLabel">{{ callLabel(call) }}</span>
			</div>
			<div v-if="example.reply !== null" :class="$style.agent">
				<AgentReaction
					:kind="example.state === 'needs_work' ? 'needs_work' : 'pass'"
					size="xs"
					:class="$style.agentHead"
				/>
				<div :class="$style.answer">
					<div :class="$style.replyRow">
						<div :class="[$style.reply, { [$style.flagged]: example.state === 'needs_work' }]">
							<AgentClampText :text="example.reply" markdown />
						</div>
						<N8nIconButton
							v-if="flaggable && example.state === 'pass'"
							icon="thumbs-down"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('agents.builder.agentChecks.onboarding.notRight')"
							:title="i18n.baseText('agents.builder.agentChecks.onboarding.notRight')"
							:class="$style.flag"
							data-testid="agent-check-flag"
							@click="emit('flag', example)"
						/>
					</div>
					<div
						v-if="verdict && example.state === 'needs_work'"
						:class="[$style.verdict, $style.verdictBad]"
						data-testid="agent-check-verdict"
					>
						<b>{{ i18n.baseText('agents.builder.agentChecks.verdict.breaks') }}</b>
						{{ example.reason }}
					</div>
					<div
						v-else-if="verdict && example.state === 'pass'"
						:class="[$style.verdict, $style.verdictOk]"
						data-testid="agent-check-verdict"
					>
						<b>{{ i18n.baseText('agents.builder.agentChecks.verdict.follows') }}</b>
					</div>
				</div>
			</div>
			<div v-else :class="$style.empty">
				{{ i18n.baseText('agents.builder.agentChecks.thread.noReply') }}
			</div>

			<Transition :leave-active-class="$style.footerLeave" :leave-to-class="$style.footerGone">
				<div v-if="!seen" :class="$style.footer" data-testid="agent-check-practice-footer">
					<span :class="$style.footerText">
						<b>{{ i18n.baseText('agents.builder.agentChecks.practice.title') }}</b>
						{{ i18n.baseText('agents.builder.agentChecks.practice.body') }}
					</span>
					<N8nButton
						variant="ghost"
						size="small"
						:class="$style.footerButton"
						data-testid="agent-check-practice-dismiss"
						@click="dismiss"
					>
						{{ i18n.baseText('agents.builder.agentChecks.practice.gotIt') }}
					</N8nButton>
				</div>
			</Transition>
		</div>
		<!-- Outside the clipped surface, so the cut corner never drops the hover. -->
		<button
			v-if="seen"
			type="button"
			:class="[$style.corner, { [$style.curled]: curled }]"
			:aria-label="i18n.baseText('agents.builder.agentChecks.practice.what')"
			:aria-expanded="curled"
			data-testid="agent-check-practice-corner"
			@click="curled = !curled"
			@blur="curled = false"
		>
			<span :class="$style.fold" aria-hidden="true" />
			<span :class="$style.tip" role="tooltip">
				<b>{{ i18n.baseText('agents.builder.agentChecks.practice.title') }}</b>
				{{ i18n.baseText('agents.builder.agentChecks.practice.tip') }}
			</span>
		</button>
	</div>
</template>

<style lang="scss" module>
// The reply with its thumbs-down beside it, at the bubble's foot.
.replyRow {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--4xs);
	min-width: 0;

	> :first-child {
		min-width: 0;
	}
}

.flag {
	flex-shrink: 0;
}

.thread {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border-radius: var(--radius--lg);
	background-color: var(--background--subtle);
	// Same faint diagonal stripe as the preview dock, so a replay reads as a preview.
	background-image: repeating-linear-gradient(
		135deg,
		color-mix(in srgb, var(--text-color) 3%, transparent) 0 5px,
		transparent 5px 10px
	);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.you,
.reply {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	background: var(--background--surface);
	color: var(--text-color);
	white-space: pre-wrap;
}

.you {
	align-self: flex-end;
	max-width: 85%;
	border-radius: var(--radius--xl) var(--radius--xl) var(--radius--3xs) var(--radius--xl);
}

.call {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-left: var(--spacing--lg);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) transparent;
	border-radius: var(--radius--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
}

.callError {
	background: var(--background--warning);
	border-color: var(--border-color--warning);
	color: var(--text-color--warning);
}

.callLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.agent {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.agentHead {
	margin-top: var(--spacing--3xs);
}

.answer {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
	max-width: 90%;
}

.reply {
	border-radius: var(--radius--xl) var(--radius--xl) var(--radius--xl) var(--radius--3xs);
}

.flagged {
	border-color: var(--border-color--warning);
}

.verdict {
	align-self: flex-start;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--xs);

	b {
		font-weight: var(--font-weight--bold);
	}
}

.verdictBad {
	background: var(--background--warning);
	color: var(--text-color--warning);
}

.verdictOk {
	background: var(--background--success);
	color: var(--text-color--success);
}

.empty {
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	// A full-width warning strip stuck to the bottom of the surface, so it reads apart from the messages.
	margin: var(--spacing--4xs) calc(-1 * var(--spacing--xs)) calc(-1 * var(--spacing--xs));
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--border-color--warning);
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	background: var(--background--warning);
	color: var(--text-color--warning);
	font-size: var(--font-size--xs);
	clip-path: inset(0 0 0 0);

	b {
		font-weight: var(--font-weight--bold);
	}
}

.footerButton {
	flex-shrink: 0;
	color: var(--text-color--warning);
}

// Got it shrinks the strip into the bottom-right corner, where the dog-ear takes over.
.footerLeave {
	transition: clip-path 0.3s ease;
}

.footerGone {
	clip-path: inset(calc(100% - 13px) 0 0 calc(100% - 13px));
}

.footerText {
	flex: 1;
	min-width: 0;
}

// Once the explanation is dismissed, the surface's corner is cut along the fold's diagonal,
// so its fill and border stop there; hovering the corner folds it further.
.cut {
	--cut: 13px;
	clip-path: polygon(
		0 0,
		100% 0,
		100% calc(100% - var(--cut)),
		calc(100% - var(--cut)) 100%,
		0 100%
	);
	transition: clip-path 0.22s ease;
}

.threadWrap {
	position: relative;
	min-width: 0;
}

.threadWrap:has(.corner:hover) > .cut,
.threadWrap:has(.corner:focus-visible) > .cut {
	--cut: 22px;
}

.cutOpen {
	--cut: 22px;
}

// The folded corner; its tooltip opens up and to the left, inside the clipped surface.
.corner {
	position: absolute;
	z-index: 1;
	right: 0;
	bottom: 0;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	padding: 0;
	border: 0;
	background: none;
	cursor: help;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: 2px;
	}
}

.fold {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 13px;
	height: 13px;
	// Only the fold half is painted; the cut half is clipped off the surface itself.
	background: linear-gradient(315deg, transparent 0 50%, var(--border-color--warning) 50% 100%);
	filter: drop-shadow(-1px -1px 1px color-mix(in srgb, var(--text-color) 12%, transparent));
	transition:
		width 0.22s ease,
		height 0.22s ease;
}

.corner:hover .fold,
.corner:focus-visible .fold,
.curled .fold {
	width: 22px;
	height: 22px;
}

.tip {
	position: absolute;
	right: var(--spacing--4xs);
	bottom: calc(100% + var(--spacing--4xs));
	width: 248px;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
	box-shadow: var(--shadow--md);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
	text-align: left;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.14s ease;

	b {
		display: block;
		color: var(--text-color);
	}
}

.corner:hover .tip,
.corner:focus-visible .tip,
.curled .tip {
	opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
	.fold,
	.tip,
	.cut,
	.footerLeave {
		transition: none;
	}
}
</style>
