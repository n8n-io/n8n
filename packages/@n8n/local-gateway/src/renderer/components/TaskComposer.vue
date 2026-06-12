<script setup lang="ts">
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';

import ComposerField from './ComposerField.vue';
import ContextPill from './ContextPill.vue';
import MiniSpinner from './MiniSpinner.vue';

import { suggestionChipsFor } from '../assistant/contexts';
import { watchAssistantRun } from '../assistant/run-watcher';
import {
	dismissTaskResult,
	showTaskResult,
	type TaskResultCard,
} from '../assistant/task-result-store';
import { openChat } from '../chat/chat-overlay';
import { useAssistantContext } from '../assistant/use-assistant-context';
import { getThreadPromptWatcher } from '../permissions/thread-prompt-watcher';
import type { DesktopAssistantTaskRequest } from '../../shared/types';

type ComposerState = 'idle' | 'thinking' | 'doing';

// The result card itself floats at App level (task-result-store) so it stays
// visible over the chat overlay. A run that finishes with no outcome and no
// action shows no card at all: the agent replied in text, so the thread is
// opened in the chat overlay instead.

const MAX_LABEL_LENGTH = 60;

const i18n = useI18n();

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

const chips = computed(() =>
	suggestionChipsFor(activeContext.value.kind, activeContext.value.fileType),
);

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

	text.value = '';
	dismissTaskResult();
	state.value = 'thinking';

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

		// The run executes on the user's machine and can take minutes; the input
		// stays disabled and the Doing pill stays up until it resolves.
		state.value = 'doing';
		const run = await watchAssistantRun(created.threadId, created.runId);

		// Prefer the agent's structured outcome report over the tookAction heuristic.
		if (run.outcome?.success) {
			showResult({
				kind: 'done',
				threadId: created.threadId,
				label: run.outcome.title,
				icon: run.outcome.icon,
			});
		} else if (run.outcome) {
			showResult({ kind: 'handoff', message: run.outcome.failureReason });
		} else if (run.status === 'success' && run.tookAction) {
			showResult({ kind: 'done', threadId: created.threadId, label: truncateLabel(value) });
		} else if (run.status === 'success') {
			// No outcome and no action: the agent replied in text (conversational
			// answer or clarifying question) — continue in the chat instead of a card.
			openChat(created.threadId, { title: truncateLabel(value) });
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
					<span>{{
						state === 'doing'
							? i18n.baseText('desktopAssistant.composer.working')
							: i18n.baseText('desktopAssistant.composer.thinking')
					}}</span>
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
				@submit="submit()"
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

		<div :class="$style.chipRowWrapper">
			<div :class="$style.chipRow">
				<button
					v-for="chip in chips"
					:key="chip.label"
					type="button"
					:class="$style.chip"
					@click="submit(chip.label)"
				>
					<N8nIcon :icon="chip.icon" :size="12" aria-hidden="true" />
					{{ chip.label }}
				</button>
			</div>
			<div :class="$style.chipFade" aria-hidden="true" />
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

.chipRowWrapper {
	position: relative;
	margin-top: var(--spacing--2xs);
}

.chipRow {
	display: flex;
	gap: var(--spacing--3xs);
	overflow-x: auto;
	scrollbar-width: none;
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

.chipFade {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: var(--spacing--xl);
	pointer-events: none;
	background: linear-gradient(to right, rgba(33, 33, 33, 0), var(--da-bg));
}
</style>
