<script lang="ts" setup>
import { ref, watch, onUnmounted } from 'vue';
import { N8nIcon } from '@n8n/design-system';

interface ChatMessage {
	from: 'user' | 'agent';
	text: string;
	time: string;
}

const MESSAGES: ChatMessage[] = [
	{ from: 'user', text: 'Hi! Any update on my order #4712?', time: '9:41' },
	{
		from: 'agent',
		text: 'I found your receipt in Gmail - order #4712 shipped yesterday and arrives Thursday.',
		time: '9:41',
	},
	{ from: 'user', text: 'Can I still change the delivery address?', time: '9:42' },
	{
		from: 'agent',
		text: "Yes, until it leaves the warehouse. I've looped in a teammate to confirm the change.",
		time: '9:42',
	},
];

const WINDOW_APPEAR_MS = 250;
const FIRST_MESSAGE_MS = 700;
const MESSAGE_GAP_MS = 1000;
const AGENT_TYPING_MS = 1200;
const COMPLETE_HOLD_MS = 1400;

const props = defineProps<{
	active: boolean;
}>();

const emit = defineEmits<{ complete: [] }>();

const visible = ref(false);
const shownCount = ref(0);
const agentTyping = ref(false);

let timers: Array<ReturnType<typeof setTimeout>> = [];

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers = [];
}

function schedule(ms: number, fn: () => void) {
	timers.push(setTimeout(fn, ms));
}

function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

function resetState() {
	visible.value = false;
	shownCount.value = 0;
	agentTyping.value = false;
}

function runAnimation() {
	resetState();

	if (prefersReducedMotion()) {
		schedule(WINDOW_APPEAR_MS, () => {
			visible.value = true;
			shownCount.value = MESSAGES.length;
		});
		schedule(WINDOW_APPEAR_MS + COMPLETE_HOLD_MS, () => emit('complete'));
		return;
	}

	schedule(WINDOW_APPEAR_MS, () => (visible.value = true));

	let at = WINDOW_APPEAR_MS + FIRST_MESSAGE_MS;
	MESSAGES.forEach((message, index) => {
		if (message.from === 'agent') {
			schedule(at, () => (agentTyping.value = true));
			at += AGENT_TYPING_MS;
		}
		schedule(at, () => {
			agentTyping.value = false;
			shownCount.value = index + 1;
		});
		at += MESSAGE_GAP_MS;
	});

	schedule(at - MESSAGE_GAP_MS + COMPLETE_HOLD_MS, () => emit('complete'));
}

watch(
	() => props.active,
	(val) => {
		if (val) {
			runAnimation();
		} else {
			clearTimers();
			resetState();
		}
	},
	{ immediate: true },
);

onUnmounted(clearTimers);
</script>

<template>
	<div :class="[$style.window, visible && $style.windowVisible]">
		<div :class="$style.header">
			<div :class="$style.avatar">
				<N8nIcon icon="telegram" :size="42" />
			</div>
			<div :class="$style.headerText">
				<span :class="$style.headerName">Support Agent</span>
				<span :class="$style.headerStatus">bot</span>
			</div>
		</div>

		<div :class="$style.messages">
			<template v-for="(message, index) in MESSAGES" :key="index">
				<div
					v-if="index < shownCount"
					:class="[$style.bubbleRow, message.from === 'user' && $style.bubbleRowOutgoing]"
				>
					<div
						:class="[
							$style.bubble,
							message.from === 'user' ? $style.bubbleOutgoing : $style.bubbleIncoming,
						]"
					>
						<p :class="$style.bubbleText">{{ message.text }}</p>
						<span :class="$style.bubbleMeta">
							{{ message.time }}
							<svg
								v-if="message.from === 'user'"
								:class="$style.readTicks"
								width="15"
								height="10"
								viewBox="0 0 18 12"
								fill="none"
							>
								<path
									d="M1 6 L4.5 9.5 L10 2"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M6.5 6 L10 9.5 L15.5 2"
									stroke="currentColor"
									stroke-width="1.6"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</div>
				</div>
			</template>

			<div v-if="agentTyping" :class="$style.bubbleRow">
				<div :class="[$style.bubble, $style.bubbleIncoming, $style.typingBubble]">
					<span :class="$style.typingDot" />
					<span :class="$style.typingDot" />
					<span :class="$style.typingDot" />
				</div>
			</div>
		</div>

		<div :class="$style.inputBar">
			<div :class="$style.roundButton">
				<N8nIcon icon="paperclip" :size="18" />
			</div>
			<div :class="$style.messageInput">Message</div>
			<div :class="$style.roundButton">
				<N8nIcon icon="mic" :size="18" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.window {
	display: flex;
	flex-direction: column;
	width: 460px;
	height: 400px;
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--md, var(--shadow--sm));
	overflow: hidden;
	background: light-dark(#e7ebf0, #0e1621);
	opacity: 0;
	transform: translateY(10px) scale(0.98);
	transition:
		opacity 0.35s ease,
		transform 0.35s ease;
}

.windowVisible {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background: light-dark(#fff, #17212b);
	border-bottom: 1px solid light-dark(#e3e6e8, #101921);
	flex-shrink: 0;
}

.avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: 50%;
	background: #fff;
	overflow: hidden;
	flex-shrink: 0;
}

.headerText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.headerName {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: light-dark(#000, #f5f5f5);
	line-height: 1.25;
}

.headerStatus {
	font-size: var(--font-size--xs);
	color: light-dark(#787f85, #708499);
	line-height: 1.25;
}

.messages {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	flex: 1;
	min-height: 0;
	padding: var(--spacing--sm);
	overflow: hidden;
}

.bubbleRow {
	display: flex;
	justify-content: flex-start;
}

.bubbleRowOutgoing {
	justify-content: flex-end;
}

.bubble {
	max-width: 78%;
	padding: 6px 10px;
	border-radius: 12px;
	animation: telegram-bubble-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.bubbleIncoming {
	background: light-dark(#fff, #182533);
	border-bottom-left-radius: 4px;
}

.bubbleOutgoing {
	background: light-dark(#effdde, #2b5278);
	border-bottom-right-radius: 4px;
}

.bubbleText {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: 1.45;
	color: light-dark(#000, #f5f5f5);
}

.bubbleMeta {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 3px;
	margin-top: 1px;
	font-size: 10px;
	color: light-dark(#a0acb6, #708499);
}

.bubbleOutgoing .bubbleMeta {
	color: light-dark(#4fae4e, #71baf5);
}

.readTicks {
	flex-shrink: 0;
}

.typingBubble {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	min-height: 28px;
}

.typingDot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: light-dark(#a0acb6, #708499);
	animation: telegram-typing-bounce 1.2s ease-in-out infinite;

	&:nth-child(2) {
		animation-delay: 0.15s;
	}

	&:nth-child(3) {
		animation-delay: 0.3s;
	}
}

.inputBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: light-dark(#fff, #17212b);
	border-top: 1px solid light-dark(#e3e6e8, #101921);
	flex-shrink: 0;
}

.roundButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: light-dark(#f1f4f7, #242f3d);
	color: light-dark(#787f85, #708499);
	flex-shrink: 0;
}

.messageInput {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	height: 36px;
	padding: 0 var(--spacing--sm);
	border-radius: var(--radius--full);
	background: light-dark(#f1f4f7, #242f3d);
	font-size: var(--font-size--sm);
	color: light-dark(#a0acb6, #708499);
}

@keyframes telegram-bubble-pop {
	from {
		opacity: 0;
		transform: scale(0.85);
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes telegram-typing-bounce {
	0%,
	60%,
	100% {
		opacity: 0.4;
		transform: translateY(0);
	}

	30% {
		opacity: 1;
		transform: translateY(-3px);
	}
}

@media (prefers-reduced-motion: reduce) {
	.window {
		transition: none;
	}

	.bubble {
		animation: none;
	}

	.typingDot {
		animation: none;
	}
}
</style>
