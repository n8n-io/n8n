<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';

import ComposerField from './ComposerField.vue';
import ContextPill from './ContextPill.vue';
import MiniSpinner from './MiniSpinner.vue';
import StatusCycleText from './StatusCycleText.vue';

import { suggestionChipsFor } from '../assistant/contexts';
import { watchAssistantRun } from '../assistant/run-watcher';
import {
	dismissTaskResult,
	showTaskResult,
	type TaskResultCard,
} from '../assistant/task-result-store';
import { openChat } from '../chat/chat-overlay';
import { useAssistantContext } from '../assistant/use-assistant-context';
import { useAssistantScreen } from '../assistant/use-assistant-screen';
import { getThreadPromptWatcher } from '../permissions/thread-prompt-watcher';
import type { DesktopAssistantTaskRequest } from '../../shared/types';

type ComposerState = 'idle' | 'thinking' | 'doing';

// The result card itself floats at App level (task-result-store) so it stays
// visible over the chat overlay. A run that finishes with no outcome and no
// action shows no card at all: the agent replied in text, so the thread is
// opened in the chat overlay instead.

const MAX_LABEL_LENGTH = 60;

const i18n = useI18n();
const { goTo } = useAssistantScreen();

const text = ref('');
const state = ref<ComposerState>('idle');

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

/**
 * Store the result card (it floats at App level) and mirror it as a system
 * notification — the main process shows it only while the window is hidden,
 * and clicking it brings the window (with the card) back up.
 */
function showResult(card: TaskResultCard) {
	showTaskResult(card);
	const [title, body] =
		card.kind === 'done'
			? [
					`${i18n.baseText('desktopAssistant.composer.done')}: ${card.label}`,
					i18n.baseText('desktopAssistant.composer.keepPrompt'),
				]
			: card.kind === 'handoff'
				? [
						i18n.baseText('desktopAssistant.composer.handoffTitle'),
						card.message ?? i18n.baseText('desktopAssistant.composer.handoffMessage'),
					]
				: [i18n.baseText('desktopAssistant.composer.errorTitle'), card.message];
	window.electronAPI.notifyTaskResult(title, body).catch((error: unknown) => {
		console.error('Failed to show the task result notification', error);
	});
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

	dismissTaskResult();
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
			// No outcome and no action: the agent replied in text (conversational
			// answer or clarifying question) — continue in the chat instead of a card.
			openChat(created.threadId, { title: truncateLabel(value) });
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

// Exposed so sibling surfaces (e.g. an empty-state recommendation card) can fire
// a prompt through the same path as typing or clicking a suggestion chip.
defineExpose({ submit });
</script>

<template>
	<div :class="$style.composer">
		<div :class="$style.fieldArea">
			<!--
				Persistent live region: it stays mounted across states so screen
				readers announce the Thinking/Doing pill when its content changes,
				rather than missing the insertion of a fresh node.
			-->
			<div
				role="status"
				aria-live="polite"
				:aria-label="i18n.baseText('desktopAssistant.composer.statusAriaLabel')"
			>
				<!-- Thinking/Doing pill -->
				<div v-if="busy" :class="$style.statusPill">
					<MiniSpinner aria-hidden="true" />
					<StatusCycleText lead-key="desktopAssistant.composer.thinking" />
				</div>
			</div>

			<!-- Input field -->
			<ComposerField
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
