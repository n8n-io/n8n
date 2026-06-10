<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, nextTick, ref } from 'vue';

import ContextPill from './ContextPill.vue';
import MiniSpinner from './MiniSpinner.vue';

import { ASSISTANT_CONTEXTS, suggestionChipsFor } from '../assistant/contexts';
import { addReadyTaskFromPlan } from '../assistant/draft-tasks';
import { formatMinutes } from '../assistant/format';
import { buildFallbackPlan, planTask, type Plan } from '../assistant/planner';
import { useAssistantScreen } from '../assistant/use-assistant-screen';

type ComposerState = 'idle' | 'thinking' | 'doing';

interface DoneCard {
	plan: Plan;
}

const i18n = useI18n();
const { goTo } = useAssistantScreen();

const text = ref('');
const state = ref<ComposerState>('idle');
const doneCard = ref<DoneCard | null>(null);
const activeContextKey = ref(ASSISTANT_CONTEXTS[0].key);

const inputRef = ref<HTMLInputElement | null>(null);
const doneCardRef = ref<HTMLElement | null>(null);

const busy = computed(() => state.value === 'thinking' || state.value === 'doing');

const activeContext = computed(
	() => ASSISTANT_CONTEXTS.find((c) => c.key === activeContextKey.value) ?? ASSISTANT_CONTEXTS[0],
);

const chips = computed(() => suggestionChipsFor(activeContext.value.kind));

const doneSubtitle = computed(() => {
	if (!doneCard.value) return '';
	const { plan } = doneCard.value;
	return plan.timeSavedMin
		? `${plan.title} · ${i18n.baseText('desktopAssistant.composer.savedAmount', {
				interpolate: { amount: formatMinutes(plan.timeSavedMin) },
			})}`
		: plan.title;
});

const DOING_DURATION_MS = 2000;

/** One-off plans never navigate — they "do" for 2s then offer the Done card. */
function runOneOff(plan: Plan) {
	state.value = 'doing';
	window.setTimeout(() => {
		state.value = 'idle';
		doneCard.value = { plan };
		// The card is interactive and appears far from the input, so move focus to
		// it; the live region still announces it for screen readers.
		void nextTick(() => doneCardRef.value?.focus());
	}, DOING_DURATION_MS);
}

async function submit(prompt?: string) {
	const value = (prompt ?? text.value).trim();
	if (!value || busy.value) return;

	text.value = '';
	doneCard.value = null;
	state.value = 'thinking';

	try {
		const plan = await planTask(value, activeContext.value.kind);
		const isOneOff = !plan.recurring && !plan.trigger && plan.requiredConnections.length === 0;

		if (plan.complex) {
			state.value = 'idle';
			goTo({ name: 'complex', plan });
		} else if (isOneOff) {
			runOneOff(plan);
		} else {
			state.value = 'idle';
			goTo({ name: 'draft', plan });
		}
	} catch {
		// On planning failure, fall back to the confirmation screen with a best-effort plan.
		state.value = 'idle';
		goTo({ name: 'draft', plan: buildFallbackPlan(value) });
	}
}

// Return focus to the input once the Done card goes away, so keyboard users
// aren't stranded on the removed card.
function returnFocusToInput() {
	void nextTick(() => inputRef.value?.focus());
}

// "Save as ready to run" persists the one-off as a runnable task; dismiss just clears.
function saveAsReady() {
	if (!doneCard.value) return;
	addReadyTaskFromPlan(doneCard.value.plan);
	doneCard.value = null;
	returnFocusToInput();
}

function dismissDone() {
	doneCard.value = null;
	returnFocusToInput();
}
</script>

<template>
	<div :class="$style.composer">
		<div :class="$style.fieldArea">
			<!--
				Persistent live region: it stays mounted across states so screen
				readers announce the Thinking/Doing pill and the Done card when their
				content changes, rather than missing the insertion of a fresh node.
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
							? i18n.baseText('desktopAssistant.composer.doing')
							: i18n.baseText('desktopAssistant.composer.thinking')
					}}</span>
				</div>

				<!-- Done card -->
				<div v-if="doneCard" ref="doneCardRef" tabindex="-1" :class="$style.doneCard">
					<div :class="$style.doneHeader">
						<span :class="$style.doneBadge">
							<N8nIcon icon="check" :size="13" aria-hidden="true" />
						</span>
						<span :class="$style.doneTitle">{{
							i18n.baseText('desktopAssistant.composer.done')
						}}</span>
						<span :class="$style.doneSubtitle">{{ doneSubtitle }}</span>
						<button
							type="button"
							:class="$style.doneDismiss"
							:aria-label="i18n.baseText('desktopAssistant.composer.dismiss')"
							@click="dismissDone"
						>
							<N8nIcon icon="x" :size="14" aria-hidden="true" />
						</button>
					</div>
					<div :class="$style.doneBody">
						<div :class="$style.donePrompt">
							{{ i18n.baseText('desktopAssistant.composer.keepPrompt') }}
						</div>
						<div :class="$style.doneActions">
							<button type="button" :class="[$style.btn, $style.btnSubtle]" @click="dismissDone">
								{{ i18n.baseText('desktopAssistant.composer.noThanks') }}
							</button>
							<button type="button" :class="[$style.btn, $style.btnSolid]" @click="saveAsReady">
								{{ i18n.baseText('desktopAssistant.composer.saveAsReady') }}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Input field -->
			<div :class="$style.field">
				<input
					ref="inputRef"
					v-model="text"
					:class="$style.input"
					:disabled="busy"
					:aria-label="i18n.baseText('desktopAssistant.composer.inputAriaLabel')"
					:placeholder="i18n.baseText('desktopAssistant.composer.placeholder')"
					@keydown.enter="submit()"
				/>
				<button
					type="button"
					:class="$style.send"
					:disabled="busy"
					:aria-label="i18n.baseText('desktopAssistant.composer.send')"
					@click="submit()"
				>
					<MiniSpinner v-if="busy" light :size="14" aria-hidden="true" />
					<N8nIcon v-else icon="arrow-up" :size="14" aria-hidden="true" />
				</button>
			</div>
		</div>

		<div :class="$style.pillRow">
			<ContextPill
				:context="activeContext"
				:options="ASSISTANT_CONTEXTS"
				@select="activeContextKey = $event"
			/>
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

.doneCard {
	position: absolute;
	right: 0;
	bottom: calc(100% + var(--spacing--2xs));
	left: 0;
	overflow: hidden;
	background: var(--da-surface-2);
	border: 1px solid rgba(63, 207, 142, 0.45);
	border-radius: var(--da-radius);
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.doneHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px var(--spacing--xs);
	background: rgba(63, 207, 142, 0.12);
	border-bottom: 1px solid rgba(63, 207, 142, 0.22);
}

.doneBadge {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	color: var(--da-green);
	background: rgba(63, 207, 142, 0.2);
	border-radius: 50%;
}

.doneTitle {
	font-size: 13px;
	font-weight: 600;
	color: var(--da-green);
}

.doneSubtitle {
	overflow: hidden;
	font-size: 12px;
	color: var(--da-subtler);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.doneDismiss {
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

.doneDismiss:hover {
	color: var(--da-text);
	background: var(--da-surface);
}

.doneDismiss:focus-visible {
	color: var(--da-text);
	background: var(--da-surface);
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

/* The card receives programmatic focus when it appears; suppress the ring there
   (it's an announcement target, not an interactive control). */
.doneCard:focus {
	outline: none;
}

.doneBody {
	padding: var(--spacing--xs);
}

.donePrompt {
	margin-bottom: var(--spacing--xs);
	font-size: 12px;
	color: var(--da-subtler);
}

.doneActions {
	display: flex;
	gap: var(--spacing--2xs);
	justify-content: space-between;
}

.field {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 9px 10px 9px var(--spacing--xs);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border-strong);
	border-radius: var(--da-radius);
	transition:
		border-color 0.12s,
		box-shadow 0.12s;
}

.field:focus-within {
	border-color: var(--da-accent);
	box-shadow: 0 0 0 3px rgba(255, 109, 90, 0.12);
}

.input {
	flex: 1;
	min-width: 0;
	font: inherit;
	font-size: 13px;
	color: var(--da-text);
	background: transparent;
	border: none;
	outline: none;
}

.input::placeholder {
	color: var(--da-subtlest);
}

.send {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	color: #fff;
	cursor: pointer;
	background: var(--da-accent);
	border: none;
	border-radius: 7px;
	transition:
		background 0.12s,
		transform 80ms;
}

.send:hover {
	background: var(--da-accent-press);
}

.send:active {
	transform: scale(0.94);
}

.send:focus-visible {
	outline: none;
	/* Box-shadow ring (white on the coral button) reads better than an outline. */
	box-shadow:
		0 0 0 2px var(--da-surface-2),
		0 0 0 4px #fff;
}

.send:disabled {
	cursor: default;
}

.pillRow {
	margin-top: 10px;
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

/* Done-card buttons reuse the reference button variants. */
.btn {
	padding: 9px 14px;
	font: inherit;
	font-size: 13px;
	font-weight: 600;
	white-space: nowrap;
	cursor: pointer;
	border-radius: var(--da-radius-sm);
}

.btn:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}

.btnSolid {
	color: #fff;
	background: var(--da-accent);
	border: none;
}

.btnSolid:hover {
	background: var(--da-accent-press);
}

.btnSolid:active {
	transform: scale(0.98);
}

.btnSubtle {
	color: var(--da-text);
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
}

.btnSubtle:hover {
	background: var(--da-surface);
	border-color: var(--da-border-strong);
}
</style>
