<script setup lang="ts">
import { N8nIcon, N8nMarkdown, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import AssistantButton from './AssistantButton.vue';
import ComposerField from './ComposerField.vue';
import ContextPill from './ContextPill.vue';
import MiniSpinner from './MiniSpinner.vue';

import { suggestionChipsFor } from '../assistant/contexts';
import { watchAssistantRun } from '../assistant/run-watcher';
import { useAssistantContext } from '../assistant/use-assistant-context';
import { useAssistantScreen } from '../assistant/use-assistant-screen';
import { usePendingTasks } from '../assistant/use-pending-tasks';
import { getThreadPromptWatcher } from '../permissions/thread-prompt-watcher';
import type { DesktopAssistantTaskRequest } from '../../shared/types';

type ComposerState = 'idle' | 'thinking' | 'doing';

/**
 * The card shown above the input once a run finishes:
 * - `done`: the assistant did the thing — offer to keep it as a saved task.
 *   `label` is the agent's outcome title (or the truncated prompt) and doubles
 *   as the workflow name when the task is kept. `details` is the task's actual
 *   output (markdown) for information deliverables — a summary, an answer —
 *   and this card is the only place the user ever sees it.
 * - `handoff`: the run finished but the task wasn't done (declined, ambiguous,
 *   or failed per the agent's own outcome report) — point the user to the
 *   instance UI; `message` is the agent's failure reason when it gave one.
 * - `error`: the run errored, timed out, or was canceled.
 */
type ResultCard =
	| {
			kind: 'done';
			threadId: string;
			label: string;
			icon?: string;
			summary?: string;
			details?: string;
	  }
	| { kind: 'handoff'; message?: string }
	| { kind: 'error'; message: string };

const MAX_LABEL_LENGTH = 60;

const i18n = useI18n();
const pendingTasks = usePendingTasks();
const { goTo } = useAssistantScreen();

const emit = defineEmits<{ kept: [] }>();

const text = ref('');
const state = ref<ComposerState>('idle');
const resultCard = ref<ResultCard | null>(null);

// Context selection is shared app-wide (see use-assistant-context). `detected` is
// the chosen raw context we forward to the backend; `activeContext`/`contextOptions`
// are its UI projection; `selectContext` drives the pill.
const { detected, activeContext, contextOptions, ensureDetection, selectContext } =
	useAssistantContext();

// Screenshot opt-in: off by default, auto-on when the context is just "the
// screen" (kind 'other'), where pixels are the only signal. User can override.
const screenshotEnabled = ref(false);
watch(
	() => activeContext.value.kind,
	(kind) => {
		screenshotEnabled.value = kind === 'other';
	},
	{ immediate: true },
);

const screenshotTooltip = computed(() =>
	i18n.baseText(
		screenshotEnabled.value
			? 'desktopAssistant.composer.screenshotOnTooltip'
			: 'desktopAssistant.composer.screenshotOffTooltip',
	),
);

onMounted(ensureDetection);

const inputRef = ref<InstanceType<typeof ComposerField> | null>(null);
const resultCardRef = ref<HTMLElement | null>(null);

const busy = computed(() => state.value === 'thinking' || state.value === 'doing');

/** Thread of the in-flight run, so the stop button can cancel it. */
const activeThreadId = ref<string | null>(null);

/** Best-effort: the run's own `run-finish` (status `cancelled`) resolves the watcher. */
function stop() {
	if (activeThreadId.value) void window.electronAPI.cancelThreadRun(activeThreadId.value);
}

const chips = computed(() =>
	suggestionChipsFor(activeContext.value.kind, activeContext.value.fileType),
);

// Fill the input before submitting so the user sees what the chip asked for,
// and it clears on success exactly like a typed prompt.
function submitChip(label: string) {
	if (busy.value) return;
	text.value = label;
	void submit();
}

function truncateLabel(value: string): string {
	return value.length > MAX_LABEL_LENGTH ? `${value.slice(0, MAX_LABEL_LENGTH - 1)}…` : value;
}

function showResult(card: ResultCard) {
	resultCard.value = card;
	// The card is interactive and appears far from the input, so move focus to
	// it; the live region still announces it for screen readers.
	void nextTick(() => resultCardRef.value?.focus());
}

/**
 * The detected context (and an optional screenshot of the selected window) the
 * one-shot request carries. A failed capture degrades to context-without-pixels
 * rather than blocking the task.
 */
async function buildTaskContext(): Promise<DesktopAssistantTaskRequest['context']> {
	const ctx = detected.value;
	const context: NonNullable<DesktopAssistantTaskRequest['context']> = {
		kind: ctx.kind,
		fileType: ctx.fileType,
		app: ctx.app,
		windowTitle: ctx.windowTitle,
		url: ctx.url,
		path: ctx.path,
	};
	if (screenshotEnabled.value) {
		try {
			// Capture just the selected window (so our own window isn't in the shot);
			// falls back to full screen in the main process when it can't be matched.
			const shot = await window.electronAPI.captureScreenshot({
				windowId: ctx.id,
				app: ctx.app,
				title: ctx.windowTitle,
			});
			context.attachments = [shot];
		} catch (error) {
			console.error('Screenshot capture failed; sending the task without it', error);
		}
	}
	return context;
}

async function submit(prompt?: string) {
	const value = (prompt ?? text.value).trim();
	if (!value || busy.value) return;

	resultCard.value = null;
	state.value = 'thinking';

	const releasePrompt = () => {
		if (prompt === undefined) text.value = '';
	};

	try {
		const created = await window.electronAPI.createAssistantTask({
			prompt: value,
			context: await buildTaskContext(),
		});
		if (!created.ok || !created.threadId || !created.runId) {
			showResult({
				kind: 'error',
				message: created.error ?? i18n.baseText('desktopAssistant.composer.errorFallback'),
			});
			return;
		}

		// Watch the new thread app-wide so its permission prompts surface even
		// though no chat view is open; auto-released when the run finishes.
		getThreadPromptWatcher().trackTaskThread(created.threadId, created.runId);
		activeThreadId.value = created.threadId;

		// The run executes on the user's machine and can take minutes; the input
		// stays disabled and the Doing pill stays up until it resolves.
		state.value = 'doing';
		const run = await watchAssistantRun(created.threadId, created.runId);

		if (run.status === 'success') releasePrompt();

		// The agent proposed a task plan instead of executing — hand the user over
		// to the draft view to review and promote it (the finally block resets us).
		if (run.plan) {
			goTo({ name: 'draft', threadId: created.threadId, plan: run.plan });
			return;
		}

		// Prefer the agent's structured outcome report over the tookAction heuristic.
		if (run.outcome?.success) {
			showResult({
				kind: 'done',
				threadId: created.threadId,
				label: run.outcome.title,
				icon: run.outcome.icon,
				summary: run.outcome.summary,
				details: run.outcome.details,
			});
		} else if (run.outcome) {
			showResult({ kind: 'handoff', message: run.outcome.failureReason });
		} else if (run.status === 'success' && run.tookAction) {
			showResult({ kind: 'done', threadId: created.threadId, label: truncateLabel(value) });
		} else if (run.status === 'success') {
			showResult({ kind: 'handoff' });
		} else if (run.status === 'canceled') {
			// The user stopped the run — reset quietly, no result card.
		} else {
			showResult({
				kind: 'error',
				message: run.error ?? i18n.baseText('desktopAssistant.composer.errorFallback'),
			});
		}
	} catch (error) {
		showResult({
			kind: 'error',
			message:
				error instanceof Error
					? error.message
					: i18n.baseText('desktopAssistant.composer.errorFallback'),
		});
	} finally {
		activeThreadId.value = null;
		state.value = 'idle';
	}
}

// Return focus to the input once the result card goes away, so keyboard users
// aren't stranded on the removed card.
function returnFocusToInput() {
	void nextTick(() => inputRef.value?.focus());
}

/** Keep the one-off: promote its thread into a saved task and show the Tasks list. */
function keepTask() {
	if (resultCard.value?.kind !== 'done') return;
	const { threadId, label, icon } = resultCard.value;
	// The icon (from the agent's outcome report) lands on the workflow's meta, not in its name.
	pendingTasks.promote(threadId, label, icon);
	resultCard.value = null;
	returnFocusToInput();
	emit('kept');
}

function dismissResult() {
	resultCard.value = null;
	returnFocusToInput();
}

// Exposed so sibling surfaces (e.g. an empty-state recommendation card) can fire
// a prompt through the same path as typing or clicking a suggestion chip.
defineExpose({ submit });
</script>

<template>
	<div :class="$style.composer">
		<div :class="$style.fieldArea">
			<!--
				Persistent live region: it stays mounted across states so screen
				readers announce the Thinking/Doing pill and the result cards when
				their content changes, rather than missing the insertion of a fresh node.
			-->
			<div
				role="status"
				aria-live="polite"
				:aria-label="i18n.baseText('desktopAssistant.composer.statusAriaLabel')"
			>
				<!-- Thinking/Doing pill -->
				<div v-if="busy" :class="$style.statusPill">
					<MiniSpinner aria-hidden="true" />
					<span>{{
						state === 'doing'
							? i18n.baseText('desktopAssistant.composer.working')
							: i18n.baseText('desktopAssistant.composer.thinking')
					}}</span>
				</div>

				<!-- Done card -->
				<div
					v-if="resultCard?.kind === 'done'"
					ref="resultCardRef"
					tabindex="-1"
					:class="[$style.resultCard, $style.doneCard]"
					data-testid="composer-done-card"
				>
					<div :class="[$style.resultHeader, $style.doneHeader]">
						<span :class="[$style.resultBadge, $style.doneBadge]">
							<N8nIcon icon="check" :size="13" aria-hidden="true" />
						</span>
						<span :class="[$style.resultTitle, $style.doneTitle]">{{
							i18n.baseText('desktopAssistant.composer.done')
						}}</span>
						<span :class="$style.resultSubtitle">{{ resultCard.label }}</span>
						<button
							type="button"
							:class="$style.resultDismiss"
							:aria-label="i18n.baseText('desktopAssistant.composer.dismiss')"
							@click="dismissResult"
						>
							<N8nIcon icon="x" :size="14" aria-hidden="true" />
						</button>
					</div>
					<div :class="[$style.resultBody, $style.doneBody]">
						<div v-if="resultCard.summary" :class="$style.resultMessage">
							{{ resultCard.summary }}
						</div>
						<div
							v-if="resultCard.details"
							:class="$style.detailsScroll"
							tabindex="0"
							:aria-label="i18n.baseText('desktopAssistant.composer.resultDetailsAriaLabel')"
						>
							<N8nMarkdown :content="resultCard.details" />
						</div>
						<div :class="$style.resultMessage">
							{{ i18n.baseText('desktopAssistant.composer.keepPrompt') }}
						</div>
						<div :class="$style.resultActions">
							<AssistantButton @click="dismissResult">
								{{ i18n.baseText('desktopAssistant.composer.noThanks') }}
							</AssistantButton>
							<AssistantButton variant="solid" @click="keepTask">
								{{ i18n.baseText('desktopAssistant.composer.saveAsReady') }}
							</AssistantButton>
						</div>
					</div>
				</div>

				<!-- Handoff card -->
				<div
					v-if="resultCard?.kind === 'handoff'"
					ref="resultCardRef"
					tabindex="-1"
					:class="[$style.resultCard, $style.handoffCard]"
					data-testid="composer-handoff-card"
				>
					<div :class="[$style.resultHeader, $style.handoffHeader]">
						<span :class="[$style.resultBadge, $style.handoffBadge]">
							<N8nIcon icon="info" :size="13" aria-hidden="true" />
						</span>
						<span :class="[$style.resultTitle, $style.handoffTitle]">{{
							i18n.baseText('desktopAssistant.composer.handoffTitle')
						}}</span>
						<button
							type="button"
							:class="$style.resultDismiss"
							:aria-label="i18n.baseText('desktopAssistant.composer.dismiss')"
							@click="dismissResult"
						>
							<N8nIcon icon="x" :size="14" aria-hidden="true" />
						</button>
					</div>
					<div :class="$style.resultBody">
						<div :class="$style.resultMessage">
							{{ resultCard.message ?? i18n.baseText('desktopAssistant.composer.handoffMessage') }}
						</div>
					</div>
				</div>

				<!-- Error card -->
				<div
					v-if="resultCard?.kind === 'error'"
					ref="resultCardRef"
					tabindex="-1"
					:class="[$style.resultCard, $style.errorCard]"
					data-testid="composer-error-card"
				>
					<div :class="[$style.resultHeader, $style.errorHeader]">
						<span :class="[$style.resultBadge, $style.errorBadge]">
							<N8nIcon icon="triangle-alert" :size="13" aria-hidden="true" />
						</span>
						<span :class="[$style.resultTitle, $style.errorTitle]">{{
							i18n.baseText('desktopAssistant.composer.errorTitle')
						}}</span>
						<button
							type="button"
							:class="$style.resultDismiss"
							:aria-label="i18n.baseText('desktopAssistant.composer.dismiss')"
							@click="dismissResult"
						>
							<N8nIcon icon="x" :size="14" aria-hidden="true" />
						</button>
					</div>
					<div :class="$style.resultBody">
						<div :class="$style.resultMessage">{{ resultCard.message }}</div>
					</div>
				</div>
			</div>

			<!-- Input field -->
			<ComposerField
				ref="inputRef"
				v-model="text"
				:disabled="busy"
				:busy="busy"
				:input-aria-label="i18n.baseText('desktopAssistant.composer.inputAriaLabel')"
				:placeholder="i18n.baseText('desktopAssistant.composer.placeholder')"
				:send-aria-label="i18n.baseText('desktopAssistant.composer.send')"
				:stop-aria-label="i18n.baseText('desktopAssistant.composer.stop')"
				@submit="submit()"
				@stop="stop"
			/>
		</div>

		<div :class="$style.pillRow">
			<ContextPill
				:context="activeContext"
				:options="contextOptions"
				@select="selectContext($event)"
			/>
			<N8nTooltip :content="screenshotTooltip" placement="top">
				<button
					type="button"
					:class="[$style.screenshotToggle, { [$style.screenshotOn]: screenshotEnabled }]"
					:aria-pressed="screenshotEnabled"
					:aria-label="i18n.baseText('desktopAssistant.composer.attachScreenshot')"
					@click="screenshotEnabled = !screenshotEnabled"
				>
					<N8nIcon icon="image" :size="13" aria-hidden="true" />
				</button>
			</N8nTooltip>
		</div>

		<div :class="$style.chipRow">
			<div :class="[$style.chipFade, $style.chipFadeLeft]" aria-hidden="true" />
			<button
				v-for="chip in chips"
				:key="chip.label"
				type="button"
				:class="$style.chip"
				@click="submitChip(chip.label)"
			>
				<N8nIcon :icon="chip.icon" :size="12" aria-hidden="true" />
				{{ chip.label }}
			</button>
			<div :class="[$style.chipFade, $style.chipFadeRight]" aria-hidden="true" />
		</div>
	</div>
</template>

<style module>
.composer {
	padding: var(--spacing--xs);
	background: var(--da-bg);
	border-top: 1px solid var(--da-border);
}

.fieldArea {
	position: relative;
}

.statusPill {
	position: absolute;
	right: 0;
	bottom: calc(100% + var(--spacing--2xs));
	display: inline-flex;
	align-items: center;
	gap: 7px;
	padding: var(--spacing--3xs) 11px;
	font-size: 12px;
	color: var(--da-subtler);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--full);
	box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

/* Shared result-card shell; the done/handoff/error variants only swap accents. */
.resultCard {
	position: absolute;
	right: 0;
	bottom: calc(100% + var(--spacing--2xs));
	left: 0;
	overflow: hidden;
	background: var(--da-surface-2);
	border-radius: var(--da-radius);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

/* The card receives programmatic focus when it appears; suppress the ring there
   (it's an announcement target, not an interactive control). */
.resultCard:focus {
	outline: none;
}

.resultHeader {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px var(--spacing--xs);
}

.resultBadge {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
}

.resultTitle {
	font-size: 13px;
	font-weight: 600;
}

.resultSubtitle {
	overflow: hidden;
	font-size: 12px;
	color: var(--da-subtler);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.resultDismiss {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	margin-left: auto;
	color: var(--da-subtler);
	cursor: pointer;
	background: none;
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		color 0.12s;
}

.resultDismiss:hover {
	color: var(--da-text);
	background: var(--da-surface);
}

.resultDismiss:focus-visible {
	color: var(--da-text);
	background: var(--da-surface);
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.resultBody {
	padding: var(--spacing--xs);
}

.resultMessage {
	font-size: 12px;
	color: var(--da-subtler);
}

.resultActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: space-between;
	margin-top: var(--spacing--xs);
}

/* Done variant: green accents. A flex column capped near the window height so
   an information deliverable (the details block) can take all the spare room
   while the header, summary, and keep-prompt/actions stay visible. */
.doneCard {
	display: flex;
	flex-direction: column;
	max-height: calc(100vh - 200px);
	border: 1px solid rgba(63, 207, 142, 0.45);
}

.doneBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-height: 0;
}

/* Only the details region absorbs the height cap; everything else keeps its size. */
.doneBody > :not(.detailsScroll) {
	flex-shrink: 0;
}

.detailsScroll {
	flex: 1;
	min-height: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	overflow-y: auto;
	overflow-wrap: anywhere;
	font-size: 12px;
	color: var(--da-text);
	background: var(--da-surface);
	border: 1px solid var(--da-border);
	border-radius: 7px;
	/* N8nMarkdown colors its text, code blocks, and blockquotes with design-system
	   tokens that default to the light theme (dark on dark here); pin them to the
	   assistant palette. */
	--color--text: var(--da-text);
	--color--text--shade-1: var(--da-text);
	--color--background: var(--da-surface-2);
	--border-color: var(--da-border-strong);
	--color--primary: var(--da-accent);
}

.detailsScroll:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.doneHeader {
	background: rgba(63, 207, 142, 0.12);
	border-bottom: 1px solid rgba(63, 207, 142, 0.22);
}

.doneBadge {
	color: var(--da-green);
	background: rgba(63, 207, 142, 0.2);
}

.doneTitle {
	color: var(--da-green);
}

/* Handoff variant: amber accents — informational, not a failure. */
.handoffCard {
	border: 1px solid rgba(245, 184, 75, 0.45);
}

.handoffHeader {
	background: rgba(245, 184, 75, 0.12);
	border-bottom: 1px solid rgba(245, 184, 75, 0.22);
}

.handoffBadge {
	color: var(--da-amber);
	background: rgba(245, 184, 75, 0.2);
}

.handoffTitle {
	color: var(--da-amber);
}

/* Error variant: red accents. */
.errorCard {
	border: 1px solid rgba(255, 107, 107, 0.45);
}

.errorHeader {
	background: rgba(255, 107, 107, 0.12);
	border-bottom: 1px solid rgba(255, 107, 107, 0.22);
}

.errorBadge {
	color: var(--da-red);
	background: rgba(255, 107, 107, 0.2);
}

.errorTitle {
	color: var(--da-red);
}

.pillRow {
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
	margin-top: 10px;
}

.screenshotToggle {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	color: var(--da-subtler);
	cursor: pointer;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--full);
	transition:
		background 0.12s,
		border-color 0.12s,
		color 0.12s;
}

.screenshotToggle:hover {
	color: var(--da-text);
	border-color: var(--da-subtler);
}

.screenshotToggle:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.screenshotOn {
	color: var(--da-purple);
	background: rgba(167, 139, 250, 0.1);
	border-color: rgba(167, 139, 250, 0.35);
}

.chipRow {
	display: flex;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--2xs);
	overflow-x: auto;
	scrollbar-width: none;
	container-type: scroll-state;
}

.chipRow::-webkit-scrollbar {
	display: none;
}

.chip {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: 5px;
	padding: 5px 10px;
	font: inherit;
	font-size: 11px;
	color: var(--da-subtler);
	white-space: nowrap;
	cursor: pointer;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
	border-radius: var(--radius--full);
	transition:
		border-color 0.12s,
		color 0.12s,
		background 0.12s;
}

.chip:hover {
	color: var(--da-text);
	background: var(--da-surface);
	border-color: var(--da-border-strong);
}

/* Box-shadow ring instead of an outline so it isn't clipped by the row's
   horizontal scroll overflow. */
.chip:focus-visible {
	outline: none;
	color: var(--da-text);
	box-shadow: var(--da-focus-shadow);
}

/* Edge fades, no JS: zero-width sticky flex items pinned to each edge of the
   scrollport; their ::before paints the gradient and a scroll-state container
   query (Chromium 133+) shows it only while more chips remain in that
   direction. The negative margin cancels the slot each fade adds to the row's
   gap so the chips lay out as if the fades weren't there. */
.chipFade {
	position: sticky;
	z-index: 1;
	flex: none;
	width: 0;
	pointer-events: none;
}

.chipFadeLeft {
	left: 0;
	margin-right: calc(-1 * var(--spacing--3xs));
}

.chipFadeRight {
	right: 0;
	margin-left: calc(-1 * var(--spacing--3xs));
}

.chipFade::before {
	content: '';
	position: absolute;
	top: 0;
	bottom: 0;
	width: var(--spacing--xl);
	opacity: 0;
	transition: opacity 0.12s;
}

.chipFadeLeft::before {
	left: 0;
	background: linear-gradient(to left, rgba(33, 33, 33, 0), var(--da-bg));
}

.chipFadeRight::before {
	right: 0;
	background: linear-gradient(to right, rgba(33, 33, 33, 0), var(--da-bg));
}

@container scroll-state(scrollable: left) {
	.chipFadeLeft::before {
		opacity: 1;
	}
}

@container scroll-state(scrollable: right) {
	.chipFadeRight::before {
		opacity: 1;
	}
}
</style>
