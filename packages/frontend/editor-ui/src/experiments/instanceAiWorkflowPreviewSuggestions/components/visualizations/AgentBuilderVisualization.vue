<script lang="ts" setup>
import { computed, ref, watch, onUnmounted } from 'vue';
import { N8nButton, N8nIcon, N8nIconButton } from '@n8n/design-system';
import {
	GMAIL_ICON_SVG,
	ANTHROPIC_ICON_SVG,
	GOOGLE_SHEETS_ICON_SVG,
} from '../../workflows/process-invoices';
import TelegramChatVisualization from './TelegramChatVisualization.vue';

const INSTRUCTIONS_TEXT =
	'You are a friendly support agent. Answer customer questions on Telegram, look up order details in Gmail and the FAQ sheet, and escalate to a human when unsure.';

const PANEL_APPEAR_MS = 150;
const CHANNEL_ADDED_MS = 900;
const TOOL_1_MS = 1550;
const TOOL_2_MS = 1900;
const SKILL_MS = 2350;
const SCROLL_1_MS = 2900;
const MODEL_MS = 3800;
const SCROLL_2_MS = 4450;
const TYPING_START_MS = 5000;
const TYPING_INTERVAL_MS = 14;
const CURSOR_APPEAR_MS = 200;
const CURSOR_MOVE_START_MS = 350;
const CURSOR_MOVE_DURATION_MS = 450;
const CLICK_MS = CURSOR_MOVE_START_MS + CURSOR_MOVE_DURATION_MS + 50;
const PUBLISH_PRESS_DURATION_MS = 180;
const CURSOR_FADE_MS = CLICK_MS + PUBLISH_PRESS_DURATION_MS + 320;
const COMPLETE_AFTER_PUBLISH_MS = CURSOR_FADE_MS + 600;
const REDUCED_MOTION_COMPLETE_HOLD_MS = 800;
const SPARKLE_DURATION_MS = 700;

const SPARKLE_DOTS = [
	{ x: '-26px', y: '-14px', delay: '0ms' },
	{ x: '-18px', y: '14px', delay: '60ms' },
	{ x: '-2px', y: '-20px', delay: '30ms' },
	{ x: '8px', y: '18px', delay: '80ms' },
	{ x: '22px', y: '-12px', delay: '20ms' },
	{ x: '28px', y: '8px', delay: '70ms' },
];

const props = defineProps<{
	active: boolean;
}>();

const emit = defineEmits<{ complete: [] }>();

const panelVisible = ref(false);
const channelAdded = ref(false);
const toolsShown = ref(0);
const skillAdded = ref(false);
const modelSelected = ref(false);
const typedText = ref('');
const typingDone = ref(false);
const scrollY = ref(0);
const publishPressed = ref(false);
const published = ref(false);
const sparklesVisible = ref(false);
const chatActive = ref(false);
const builderStarted = ref(false);
const cursorVisible = ref(false);
const cursorAtButton = ref(false);
const cursorClicking = ref(false);

const viewportRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const modelSectionRef = ref<HTMLElement | null>(null);
const instructionsSectionRef = ref<HTMLElement | null>(null);

const remainingChannels = computed(() =>
	channelAdded.value ? 'Slack, Linear' : 'Slack, Telegram, Linear',
);

let timers: Array<ReturnType<typeof setTimeout>> = [];
let typingInterval: ReturnType<typeof setInterval> | null = null;

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers = [];
	if (typingInterval) {
		clearInterval(typingInterval);
		typingInterval = null;
	}
}

function schedule(ms: number, fn: () => void) {
	timers.push(setTimeout(fn, ms));
}

function scrollToSection(el: HTMLElement | null, offset = 14) {
	if (!el || !contentRef.value || !viewportRef.value) return;
	const maxScroll = Math.max(0, contentRef.value.scrollHeight - viewportRef.value.clientHeight);
	scrollY.value = Math.min(Math.max(0, el.offsetTop - offset), maxScroll);
}

function startTyping(onDone: () => void) {
	let index = 0;
	typingInterval = setInterval(() => {
		index++;
		typedText.value = INSTRUCTIONS_TEXT.slice(0, index);
		if (index >= INSTRUCTIONS_TEXT.length) {
			if (typingInterval) clearInterval(typingInterval);
			typingInterval = null;
			typingDone.value = true;
			onDone();
		}
	}, TYPING_INTERVAL_MS);
}

function resetState() {
	panelVisible.value = false;
	channelAdded.value = false;
	toolsShown.value = 0;
	skillAdded.value = false;
	modelSelected.value = false;
	typedText.value = '';
	typingDone.value = false;
	scrollY.value = 0;
	publishPressed.value = false;
	published.value = false;
	sparklesVisible.value = false;
	chatActive.value = false;
	builderStarted.value = false;
	cursorVisible.value = false;
	cursorAtButton.value = false;
	cursorClicking.value = false;
}

function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

function showFinalState() {
	builderStarted.value = true;
	panelVisible.value = true;
	channelAdded.value = true;
	toolsShown.value = 2;
	skillAdded.value = true;
	modelSelected.value = true;
	typedText.value = INSTRUCTIONS_TEXT;
	typingDone.value = true;
	scrollToSection(instructionsSectionRef.value, 40);
	published.value = true;
}

function runPublishSequence() {
	schedule(CURSOR_APPEAR_MS, () => (cursorVisible.value = true));
	schedule(CURSOR_MOVE_START_MS, () => (cursorAtButton.value = true));
	schedule(CLICK_MS, () => {
		cursorClicking.value = true;
		publishPressed.value = true;
	});
	schedule(CLICK_MS + PUBLISH_PRESS_DURATION_MS, () => {
		cursorClicking.value = false;
		publishPressed.value = false;
		published.value = true;
		sparklesVisible.value = true;
	});
	schedule(CLICK_MS + PUBLISH_PRESS_DURATION_MS + SPARKLE_DURATION_MS, () => {
		sparklesVisible.value = false;
	});
	schedule(CURSOR_FADE_MS, () => (cursorVisible.value = false));
	schedule(COMPLETE_AFTER_PUBLISH_MS, () => emit('complete'));
}

function runBuilderAnimation() {
	schedule(PANEL_APPEAR_MS, () => (panelVisible.value = true));
	schedule(CHANNEL_ADDED_MS, () => (channelAdded.value = true));
	schedule(TOOL_1_MS, () => (toolsShown.value = 1));
	schedule(TOOL_2_MS, () => (toolsShown.value = 2));
	schedule(SKILL_MS, () => (skillAdded.value = true));
	schedule(SCROLL_1_MS, () => scrollToSection(modelSectionRef.value, 150));
	schedule(MODEL_MS, () => (modelSelected.value = true));
	schedule(SCROLL_2_MS, () => scrollToSection(instructionsSectionRef.value, 40));
	schedule(TYPING_START_MS, () => {
		startTyping(runPublishSequence);
	});
}

function handleChatComplete() {
	builderStarted.value = true;
	runBuilderAnimation();
}

function runAnimation() {
	resetState();

	if (prefersReducedMotion()) {
		schedule(PANEL_APPEAR_MS, showFinalState);
		schedule(PANEL_APPEAR_MS + REDUCED_MOTION_COMPLETE_HOLD_MS, () => emit('complete'));
		return;
	}

	chatActive.value = true;
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
	<div :class="$style.stage">
		<div :class="[$style.panel, panelVisible && $style.panelVisible]">
			<div
				aria-hidden="true"
				inert
				:class="[$style.publishGroup, publishPressed && $style.publishPressed]"
			>
				<N8nButton
					:class="$style.groupButtonLeft"
					:disabled="published"
					variant="ghost"
					data-testid="publish-agent-button"
					tabindex="-1"
				>
					<div :class="$style.publishFlex">
						<span v-if="published" :class="[$style.indicatorDot, $style.indicatorPublished]" />
						<span :class="{ [$style.indicatorPublishedText]: published }">
							{{ published ? 'Published' : 'Publish' }}
						</span>
					</div>
				</N8nButton>
				<N8nIconButton
					:class="$style.groupButtonRight"
					variant="ghost"
					icon="chevron-down"
					aria-label="Publish options"
					tabindex="-1"
				/>
				<span v-if="sparklesVisible" :class="$style.sparkles">
					<span
						v-for="(dot, index) in SPARKLE_DOTS"
						:key="index"
						:class="$style.sparkleDot"
						:style="{ '--sx': dot.x, '--sy': dot.y, animationDelay: dot.delay }"
					/>
				</span>
			</div>
			<svg
				aria-hidden="true"
				:class="[
					$style.cursor,
					cursorVisible && $style.cursorVisible,
					cursorAtButton && $style.cursorAtButton,
					cursorClicking && $style.cursorClicking,
				]"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
			>
				<path
					d="M5.5 2.6v16.2l3.8-3.7 2.5 5.7 2.4-1-2.5-5.7h5.4L5.5 2.6Z"
					fill="#ffffff"
					stroke="#000000"
					stroke-width="1.3"
					stroke-linejoin="round"
				/>
			</svg>
			<div ref="viewportRef" :class="$style.panelViewport">
				<div
					ref="contentRef"
					:class="$style.content"
					:style="{ transform: `translateY(-${scrollY}px)` }"
				>
					<div :class="$style.sections">
						<div :class="$style.channelsSection">
							<div :class="$style.sectionLabel">Channels</div>
							<div :class="$style.channelGrid">
								<div v-if="channelAdded" :class="[$style.channelCard, $style.popIn]">
									<N8nIcon icon="telegram" :size="20" :class="$style.channelIcon" />
									<div :class="$style.channelCardText">
										<span :class="$style.channelCardTitle">Telegram</span>
										<span :class="$style.channelCardSubtitle">Telegram account</span>
									</div>
								</div>
								<div :class="$style.channelCard">
									<N8nIcon icon="plus" :size="24" :class="$style.channelPlusIcon" />
									<div :class="$style.channelCardText">
										<span :class="$style.channelCardTitle">Add channel</span>
										<span :class="$style.channelCardSubtitle">{{ remainingChannels }}</span>
									</div>
								</div>
							</div>
						</div>

						<div :class="$style.capabilityRow">
							<div :class="$style.rowLabel">Tools</div>
							<div :class="$style.chips">
								<template v-if="toolsShown > 0">
									<div :class="[$style.chip, $style.popIn]">
										<img :src="GMAIL_ICON_SVG" :class="$style.chipBrandIcon" alt="" />
										<span :class="$style.chipText">Gmail</span>
									</div>
									<div v-if="toolsShown > 1" :class="[$style.chip, $style.popIn]">
										<img :src="GOOGLE_SHEETS_ICON_SVG" :class="$style.chipBrandIcon" alt="" />
										<span :class="$style.chipText">Google Sheets</span>
									</div>
									<div :class="$style.plusButton">
										<N8nIcon icon="plus" :size="16" />
									</div>
								</template>
								<div v-else :class="$style.emptyCta">Add tool</div>
							</div>
						</div>

						<div :class="$style.capabilityRow">
							<div :class="$style.rowLabel">Skills</div>
							<div :class="$style.chips">
								<template v-if="skillAdded">
									<div :class="[$style.chip, $style.popIn]">
										<N8nIcon icon="sparkles" :size="16" :class="$style.chipIcon" />
										<span :class="$style.chipText">Summarize conversations</span>
									</div>
									<div :class="$style.plusButton">
										<N8nIcon icon="plus" :size="16" />
									</div>
								</template>
								<div v-else :class="$style.emptyCta">Add skill</div>
							</div>
						</div>

						<div :class="$style.capabilityRow">
							<div :class="$style.emptyCta">Add sub-agent</div>
						</div>

						<div :class="$style.capabilityRow">
							<div :class="$style.rowLabel">Schedules</div>
							<div :class="$style.chips">
								<div :class="$style.emptyCta">Add schedule</div>
							</div>
						</div>

						<div ref="modelSectionRef" :class="$style.fieldSection">
							<div :class="$style.sectionLabel">Model</div>
							<div :class="$style.modelTrigger">
								<div :class="$style.modelSelected">
									<template v-if="modelSelected">
										<img
											:src="ANTHROPIC_ICON_SVG"
											:class="[$style.modelBrandIcon, $style.popIn]"
											alt=""
										/>
										<span :class="[$style.modelName, $style.popIn]">Claude Opus 5</span>
										<span :class="[$style.modelCredential, $style.popIn]">Anthropic account</span>
									</template>
									<template v-else>
										<N8nIcon icon="bot" :size="16" :class="$style.modelPlaceholderIcon" />
										<span :class="$style.modelPlaceholder">Select model</span>
									</template>
								</div>
								<N8nIcon icon="chevron-down" :size="16" :class="$style.modelChevron" />
							</div>
						</div>

						<div ref="instructionsSectionRef" :class="$style.fieldSection">
							<div :class="$style.sectionLabel">Instructions</div>
							<div :class="$style.editor">
								<div :class="$style.editorToolbar">
									<div :class="$style.toolbarGroup">
										<N8nIcon icon="type" :size="14" />
										<N8nIcon icon="chevron-down" :size="12" />
									</div>
									<div :class="$style.toolbarDivider" />
									<N8nIcon icon="bold" :size="14" />
									<N8nIcon icon="italic" :size="14" />
									<N8nIcon icon="strikethrough" :size="14" />
									<div :class="$style.toolbarDivider" />
									<N8nIcon icon="list" :size="14" />
									<N8nIcon icon="list-checks" :size="14" />
									<N8nIcon icon="file-code" :size="14" />
									<N8nIcon icon="quote" :size="14" />
									<div :class="$style.toolbarDivider" />
									<N8nIcon icon="undo-2" :size="14" />
									<N8nIcon icon="redo-2" :size="14" />
								</div>
								<div :class="$style.editorContent">
									<span>{{ typedText }}</span>
									<span v-if="!typingDone" :class="$style.caret" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div :class="[$style.chatSlot, builderStarted && $style.chatHidden]">
			<TelegramChatVisualization :active="chatActive" @complete="handleChatComplete" />
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';
.stage {
	display: grid;
	place-items: center;

	> * {
		grid-area: 1 / 1;
	}
}

.panel {
	position: relative;
	width: 660px;
	height: 384px;
	background: light-dark(var(--background--surface), var(--background--subtle));
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--md, var(--shadow--sm));
	overflow: hidden;
	opacity: 0;
	transform: translateY(10px) scale(0.98);
	transition:
		opacity 0.35s ease,
		transform 0.35s ease;
	@include motion.reduced-motion;
}

.panelVisible {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.publishGroup {
	position: absolute;
	top: var(--spacing--sm);
	right: var(--spacing--sm);
	z-index: 1;
	display: inline-flex;
	border: var(--border);
	border-radius: var(--radius--3xs);
	background: light-dark(var(--background--surface), var(--background--subtle));
	transition: transform 0.15s ease;
	@include motion.reduced-motion;
}

.publishPressed {
	transform: scale(0.94);
}

.sparkles {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.sparkleDot {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 5px;
	height: 5px;
	margin: -2.5px 0 0 -2.5px;
	border-radius: 50%;
	background-color: color-mix(in srgb, var(--background--brand) 68%, var(--text-color));
	box-shadow: 0 0 4px color-mix(in srgb, var(--background--brand) 60%, transparent);
	opacity: 0;
	animation: agent-builder-sparkle 0.55s ease-out both;
	@include motion.reduced-motion;
}

@keyframes agent-builder-sparkle {
	0% {
		opacity: 0;
		transform: translate(0, 0) scale(0.4);
	}

	25% {
		opacity: 0.9;
	}

	100% {
		opacity: 0;
		transform: translate(var(--sx), var(--sy)) scale(1);
	}
}

.cursor {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 2;
	opacity: 0;
	transform: translate(555px, 95px);
	transform-origin: 4px 2px;
	transition:
		transform 0.45s cubic-bezier(0.3, 0.7, 0.25, 1),
		opacity 0.25s ease;
	filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
	pointer-events: none;
	@include motion.reduced-motion;
}

.cursorVisible {
	opacity: 1;
}

.cursorAtButton {
	transform: translate(583px, 26px);
}

.cursorAtButton.cursorClicking {
	transform: translate(583px, 26px) scale(0.82);
	transition:
		transform 0.12s ease,
		opacity 0.25s ease;
	@include motion.reduced-motion;
}

.groupButtonLeft,
.groupButtonLeft:disabled,
.groupButtonLeft:hover:disabled {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-right-color: transparent;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: var(--border);
}

.publishFlex {
	display: flex;
	align-items: center;
}

.indicatorDot {
	display: inline-block;
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	margin-right: var(--spacing--2xs);
	border-radius: 50%;
}

.indicatorPublished {
	background-color: var(--color--mint-600);
}

.indicatorPublishedText {
	color: var(--color--text--tint-1);
}

.chatSlot {
	pointer-events: none;
	transition:
		opacity 0.35s ease,
		transform 0.35s ease;
	@include motion.reduced-motion;
}

.chatHidden {
	opacity: 0;
	transform: translateY(-6px) scale(0.98);
}

.panelViewport {
	position: relative;
	height: 100%;
	overflow: hidden;
	mask-image: linear-gradient(
		to bottom,
		transparent 0,
		black 14px,
		black calc(100% - 14px),
		transparent 100%
	);
}

.content {
	position: relative;
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg) var(--spacing--xl);
	transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
	will-change: transform;
	@include motion.reduced-motion;
}

.sections {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.sectionLabel {
	line-height: var(--height--lg);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color, var(--color--text--base));
}

.channelsSection {
	display: flex;
	flex-direction: column;
}

.channelGrid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--xs);
}

.channelCard {
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: var(--spacing--xs);
	border-radius: var(--radius--xs);
	gap: var(--spacing--xs);
	background-color: var(--background--surface);
	border: var(--border);
	box-shadow: var(--shadow--xs);
}

.channelIcon {
	color: var(--text-color, var(--color--text--base));
}

.channelPlusIcon {
	color: var(--text-color--subtler, var(--color--text--light));
}

.channelCardText {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	min-width: 0;
	white-space: nowrap;
}

.channelCardTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--text-color, var(--color--text--base));
}

.channelCardSubtitle {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtler, var(--color--text--light));
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 100%;
}

.capabilityRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
}

.rowLabel {
	flex: 0 0 max(11%, calc(var(--spacing--3xl) + var(--spacing--sm)));
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--height--md);
	color: var(--text-color, var(--color--text--base));
}

.chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--md);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
}

.chipIcon {
	color: var(--text-color--subtler, var(--color--text--light));
	flex-shrink: 0;
}

.chipBrandIcon {
	width: 16px;
	height: 16px;
	object-fit: contain;
	flex-shrink: 0;
	transform: scale(1.3);
	transform-origin: center;
}

.chipText {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
	color: var(--text-color, var(--color--text--base));
	padding-right: var(--spacing--4xs);
}

.plusButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--md);
	height: var(--height--md);
	color: var(--text-color--subtler, var(--color--text--light));
}

.emptyCta {
	font-size: var(--font-size--sm);
	line-height: var(--height--md);
	color: var(--text-color--subtler, var(--color--text--light));
}

.fieldSection {
	display: flex;
	flex-direction: column;
}

.modelTrigger {
	display: flex;
	align-items: center;
	height: var(--height--lg);
	padding: 0 var(--spacing--xs);
	gap: var(--spacing--xs);
	border: var(--border);
	background-color: var(--background--surface);
	border-radius: var(--radius--2xs);
	font-size: var(--font-size--sm);
}

.modelSelected {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	gap: var(--spacing--2xs);
}

.modelBrandIcon {
	width: 18px;
	height: 18px;
	object-fit: contain;
	flex-shrink: 0;
}

.modelName {
	font-weight: var(--font-weight--bold);
	color: var(--text-color, var(--color--text--base));
}

.modelCredential {
	font-weight: var(--font-weight--bold);
	color: var(--text-color--subtler, var(--color--text--light));
}

.modelPlaceholderIcon {
	color: var(--text-color--subtler, var(--color--text--light));
}

.modelPlaceholder {
	color: var(--text-color, var(--color--text--base));
}

.modelChevron {
	color: var(--text-color--subtler, var(--color--text--light));
	flex-shrink: 0;
}

.editor {
	border: var(--border);
	border-radius: var(--radius--2xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.editorToolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
	color: var(--text-color--subtler, var(--color--text--light));
}

.toolbarGroup {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.toolbarDivider {
	width: 1px;
	height: 14px;
	background-color: var(--border-color);
}

.editorContent {
	min-height: 96px;
	padding: var(--spacing--xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--text-color, var(--color--text--base));
}

.caret {
	display: inline-block;
	width: 1.5px;
	height: 1em;
	margin-left: 1px;
	vertical-align: text-bottom;
	background-color: var(--text-color, var(--color--text--base));
	animation: agent-builder-caret-blink 1s step-end infinite;
	@include motion.reduced-motion;
}

.popIn {
	animation: agent-builder-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
	@include motion.reduced-motion;
}

@keyframes agent-builder-pop-in {
	from {
		opacity: 0;
		transform: scale(0.9);
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes agent-builder-caret-blink {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.panel,
	.content,
	.publishGroup,
	.cursor,
	.chatSlot {
		transition: none;
	}

	.popIn {
		animation: none;
	}

	.sparkleDot {
		animation: none;
	}
}
</style>
