<script setup lang="ts">
import { N8nIcon, type IconName } from '@n8n/design-system';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

// Looping "prompt → workflow" micro-story in two acts: a prompt is typed into
// a mini AI Assistant input and sent, a small workflow assembles itself node
// by node and executes; then a follow-up prompt inserts a filter node after
// the trigger and the workflow executes again. Purely decorative (the parent
// panel is aria-hidden); the copy is mock content, matching the other
// visualization components.
const PROMPT_BUILD = 'Summarize new emails in Slack';
const PROMPT_ITERATE = 'Filter emails by subject';

// Slack logo inlined as a data URI, same approach as the workflow preview
// suggestion experiment (packages/nodes-base icons aren't importable here).
const SLACK_ICON_SVG =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' fill='%23fff' fill-rule='evenodd' stroke='%23000' stroke-linecap='round' stroke-linejoin='round' viewBox='0 0 150.852 150.852'%3E%3Cuse xlink:href='%23a' x='.926' y='.926'/%3E%3Csymbol id='a' overflow='visible'%3E%3Cg stroke-width='1.852'%3E%3Cpath fill='%23e01e5a' stroke='%23e01e5a' d='M40.741 93.55c0-8.735 6.607-15.772 14.815-15.772s14.815 7.037 14.815 15.772v38.824c0 8.737-6.607 15.774-14.815 15.774s-14.815-7.037-14.815-15.772z'/%3E%3Cpath fill='%23ecb22d' stroke='%23ecb22d' d='M93.55 107.408c-8.735 0-15.772-6.607-15.772-14.815s7.037-14.815 15.772-14.815h38.826c8.735 0 15.772 6.607 15.772 14.815s-7.037 14.815-15.772 14.815z'/%3E%3Cpath fill='%232fb67c' stroke='%232fb67c' d='M77.778 15.772C77.778 7.037 84.385 0 92.593 0s14.815 7.037 14.815 15.772v38.826c0 8.735-6.607 15.772-14.815 15.772s-14.815-7.037-14.815-15.772z'/%3E%3Cpath fill='%2336c5f1' stroke='%2336c5f1' d='M15.772 70.371C7.037 70.371 0 63.763 0 55.556s7.037-14.815 15.772-14.815h38.826c8.735 0 15.772 6.607 15.772 14.815s-7.037 14.815-15.772 14.815z'/%3E%3Cg stroke-linejoin='miter'%3E%3Cpath fill='%23ecb22d' stroke='%23ecb22d' d='M77.778 133.333c0 8.208 6.607 14.815 14.815 14.815s14.815-6.607 14.815-14.815-6.607-14.815-14.815-14.815H77.778z'/%3E%3Cpath fill='%232fb67c' stroke='%232fb67c' d='M133.334 70.371h-14.815V55.556c0-8.207 6.607-14.815 14.815-14.815s14.815 6.607 14.815 14.815-6.607 14.815-14.815 14.815z'/%3E%3Cpath fill='%23e01e5a' stroke='%23e01e5a' d='M14.815 77.778H29.63v14.815c0 8.207-6.607 14.815-14.815 14.815S0 100.8 0 92.593s6.607-14.815 14.815-14.815z'/%3E%3Cpath fill='%2336c5f1' stroke='%2336c5f1' d='M70.371 14.815V29.63H55.556c-8.207 0-14.815-6.607-14.815-14.815S47.348 0 55.556 0s14.815 6.607 14.815 14.815z'/%3E%3C/g%3E%3C/g%3E%3C/symbol%3E%3C/svg%3E";

type NudgeNode = { icon: IconName; isAi?: boolean } | { imageSrc: string };

// The filter node exists in the DOM from the start (inside a zero-width
// container) so inserting it mid-flow is a pure width transition instead of a
// layout jump.
const FILTER_NODE_INDEX = 1;

const NODES: NudgeNode[] = [
	{ icon: 'mail' },
	{ icon: 'filter' },
	{ icon: 'sparkles', isAi: true },
	{ imageSrc: SLACK_ICON_SVG },
];

const FIRST_PASS_NODES = [0, 2, 3];
const ALL_NODES = NODES.map((_, index) => index);

type NodeState = 'idle' | 'running' | 'success';
type Phase = 'hidden' | 'typing' | 'sending' | 'building' | 'executing' | 'done';

const TYPE_INTERVAL_MS = 34;
const NODE_APPEAR_INTERVAL_MS = 300;
const NODE_RUNNING_DURATION_MS = 500;

const phase = ref<Phase>('hidden');
const activePrompt = ref(PROMPT_BUILD);
const typedLength = ref(0);
const nodeVisible = reactive(NODES.map(() => false));
const filterInserted = ref(false);
const nodeStates = reactive<NodeState[]>(NODES.map(() => 'idle'));
const fading = ref(false);

const typedText = computed(() => activePrompt.value.slice(0, typedLength.value));

let stopped = false;
let timer: ReturnType<typeof setTimeout> | null = null;

async function delay(ms: number) {
	await new Promise<void>((resolve) => {
		timer = setTimeout(resolve, ms);
	});
}

function resetState() {
	phase.value = 'hidden';
	activePrompt.value = PROMPT_BUILD;
	typedLength.value = 0;
	nodeVisible.fill(false);
	filterInserted.value = false;
	nodeStates.fill('idle');
}

/** Static end frame, used when the user prefers reduced motion. */
function showFinalState() {
	phase.value = 'done';
	activePrompt.value = PROMPT_ITERATE;
	typedLength.value = PROMPT_ITERATE.length;
	nodeVisible.fill(true);
	filterInserted.value = true;
	nodeStates.fill('success');
}

/** Types a prompt into the input, then presses send. */
async function typeAndSend(prompt: string) {
	activePrompt.value = prompt;
	typedLength.value = 0;
	phase.value = 'typing';
	for (let i = 1; i <= prompt.length; i++) {
		typedLength.value = i;
		await delay(TYPE_INTERVAL_MS);
		if (stopped) return;
	}
	await delay(280);
	if (stopped) return;

	phase.value = 'sending';
	await delay(280);
}

async function executeNodes(indices: number[]) {
	phase.value = 'executing';
	for (const i of indices) {
		nodeStates[i] = 'running';
		await delay(NODE_RUNNING_DURATION_MS);
		if (stopped) return;
		nodeStates[i] = 'success';
		await delay(140);
		if (stopped) return;
	}
	phase.value = 'done';
}

async function runLoop() {
	while (!stopped) {
		resetState();
		await delay(350);
		if (stopped) return;

		// Act 1: prompt → workflow assembles and executes.
		await typeAndSend(PROMPT_BUILD);
		if (stopped) return;

		phase.value = 'building';
		for (const i of FIRST_PASS_NODES) {
			nodeVisible[i] = true;
			await delay(NODE_APPEAR_INTERVAL_MS);
			if (stopped) return;
		}

		await executeNodes(FIRST_PASS_NODES);
		if (stopped) return;
		await delay(1400);
		if (stopped) return;

		// Act 2: iteration prompt inserts a filter node after the trigger,
		// then the workflow executes again.
		await typeAndSend(PROMPT_ITERATE);
		if (stopped) return;

		phase.value = 'building';
		nodeStates.fill('idle');
		filterInserted.value = true;
		await delay(320);
		if (stopped) return;
		nodeVisible[FILTER_NODE_INDEX] = true;
		await delay(400);
		if (stopped) return;

		await executeNodes(ALL_NODES);
		if (stopped) return;
		await delay(1700);
		if (stopped) return;

		fading.value = true;
		await delay(400);
		fading.value = false;
	}
}

onMounted(() => {
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
		showFinalState();
		return;
	}
	void runLoop();
});

onUnmounted(() => {
	stopped = true;
	if (timer) clearTimeout(timer);
});
</script>

<template>
	<div :class="[$style.scene, fading && $style.fading]">
		<div :class="[$style.input, phase !== 'hidden' && $style.inputVisible]">
			<span v-if="typedLength === 0" :class="$style.placeholder">Ask AI Assistant…</span>
			<span v-else :class="$style.promptText">
				{{ typedText }}<span v-if="phase === 'typing'" :class="$style.caret" />
			</span>
			<!-- Mimics N8nSendStopButton: solid brand button with an arrow-up icon. -->
			<span :class="[$style.sendButton, phase === 'sending' && $style.sendButtonPressed]">
				<N8nIcon icon="arrow-up" size="small" />
			</span>
		</div>

		<div :class="$style.flow">
			<template v-for="(node, index) in NODES" :key="index">
				<span
					:class="[
						$style.unit,
						index === FILTER_NODE_INDEX && $style.insertUnit,
						index === FILTER_NODE_INDEX && !filterInserted && $style.insertUnitCollapsed,
					]"
				>
					<span
						v-if="index > 0"
						:class="[
							$style.segment,
							nodeVisible[index] && $style.segmentVisible,
							nodeStates[index] === 'success' && $style.segmentSuccess,
						]"
					/>
					<span :class="[$style.nodePop, nodeVisible[index] && $style.nodePopVisible]">
						<span
							:class="[
								$style.node,
								index === 0 && $style.trigger,
								nodeStates[index] === 'running' && $style.running,
								nodeStates[index] === 'success' && $style.success,
							]"
						>
							<N8nIcon
								v-if="'icon' in node"
								:icon="node.icon"
								size="medium"
								:class="node.isAi && $style.aiIcon"
							/>
							<img v-else :src="node.imageSrc" :class="$style.nodeImage" alt="" />
						</span>
					</span>
				</span>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
$spring: cubic-bezier(0.34, 1.56, 0.64, 1);

.scene {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	padding: var(--spacing--md);
	transition: opacity 0.4s var(--easing--ease-in, ease-in);
}

.fading {
	opacity: 0;
}

.input {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: 32px;
	padding: var(--spacing--4xs) var(--spacing--4xs) var(--spacing--4xs) var(--spacing--2xs);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	box-shadow: var(--shadow--xs, none);
	opacity: 0;
	transform: translateY(4px) scale(0.96);
	transition:
		opacity 0.25s var(--easing--ease-out, ease-out),
		transform 0.25s $spring;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.inputVisible {
	opacity: 1;
	transform: none;
}

.placeholder,
.promptText {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm, 1.4);
	white-space: nowrap;
	overflow: hidden;
}

.placeholder {
	color: var(--color--text--tint-1);
}

.promptText {
	color: var(--color--text);
}

.caret {
	display: inline-block;
	width: 1px;
	height: 0.9em;
	margin-left: 1px;
	vertical-align: text-bottom;
	background-color: currentColor;
	animation: caretBlink 0.9s step-end infinite;
}

.sendButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	flex-shrink: 0;
	border-radius: var(--radius--3xs);
	background-color: var(--background--brand);
	color: var(--color--neutral-white, #fff);
	transition: transform 0.15s var(--easing--ease-out, ease-out);
}

.sendButtonPressed {
	transform: scale(0.82);
}

.flow {
	display: flex;
	align-items: center;
	align-self: center;
}

.unit {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

// The filter node's slot: collapsed to zero width until the iteration prompt
// inserts it, then the width transition pushes the neighbouring nodes apart
// before the segment and node animate into the opened gap.
.insertUnit {
	width: 52px; // segment (18px) + node (34px)
	transition: width 0.3s var(--easing--ease-out, ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.insertUnitCollapsed {
	width: 0;
}

// Pop-in lives on a wrapper: the rotating gradient ring below relies on the
// node NOT creating a stacking context (a transform on .node would pull the
// negative z-index ::after in front of the node background, filling the whole
// node with the gradient instead of just the border).
.nodePop {
	display: flex;
	flex-shrink: 0;
	opacity: 0;
	transform: scale(0.4);
	transition:
		opacity 0.2s var(--easing--ease-out, ease-out),
		transform 0.25s $spring;
	// Contain the node's negative z-index gradient ring: without a local
	// stacking context it drops behind the panel's opaque background (the
	// nearest stacking context is the fixed-position nudge card) and is
	// invisible while running.
	isolation: isolate;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.nodePopVisible {
	opacity: 1;
	transform: none;
}

// Miniature of WorkflowPreviewNode: same border treatment, rotating conic
// gradient while running, green border on success.
.node {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	flex-shrink: 0;
	background: var(--node--color--background, var(--background--surface));
	border: 1.5px solid
		light-dark(
			oklch(from var(--color--neutral-black) l c h / 0.1),
			oklch(from var(--color--neutral-white) l c h / 0.15)
		);
	border-radius: var(--radius--2xs);
	color: var(--color--text--base);
	transition: border-color 0.2s ease;

	&::after {
		content: '';
		position: absolute;
		inset: -2.5px;
		border-radius: calc(var(--radius--2xs) + 1.5px);
		z-index: -1;
		opacity: 0;
		background: conic-gradient(
			from var(--nudge-node--gradient-angle),
			rgba(255, 109, 90, 1),
			rgba(255, 109, 90, 1) 20%,
			rgba(255, 109, 90, 0.2) 35%,
			rgba(255, 109, 90, 0.2) 65%,
			rgba(255, 109, 90, 1) 90%,
			rgba(255, 109, 90, 1)
		);
		transition: opacity 0.15s ease;
	}
}

.trigger {
	// n8n trigger nodes have a rounded leading edge.
	border-radius: 17px var(--radius--2xs) var(--radius--2xs) 17px;

	&::after {
		border-radius: 19px calc(var(--radius--2xs) + 1.5px) calc(var(--radius--2xs) + 1.5px) 19px;
	}
}

.running {
	border-color: transparent;

	&::after {
		opacity: 1;
		animation: nudgeBorderRotate 1.5s linear infinite;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}
}

.success {
	border-color: var(--color--success);
}

.aiIcon {
	color: var(--color--neutral-white, #fff);
}

.nodeImage {
	width: 16px;
	height: 16px;
}

.segment {
	width: 18px;
	height: 2px;
	flex-shrink: 0;
	background-color: var(--color--foreground--shade-1, var(--border-color));
	transform: scaleX(0);
	transform-origin: left center;
	transition:
		transform 0.25s var(--easing--ease-out, ease-out),
		background-color 0.3s ease;

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.segmentVisible {
	transform: scaleX(1);
}

.segmentSuccess {
	background-color: var(--color--success);
}

@keyframes caretBlink {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0;
	}
}

@property --nudge-node--gradient-angle {
	syntax: '<angle>';
	initial-value: 0deg;
	inherits: false;
}

@keyframes nudgeBorderRotate {
	from {
		--nudge-node--gradient-angle: 0deg;
	}

	to {
		--nudge-node--gradient-angle: 360deg;
	}
}
</style>
