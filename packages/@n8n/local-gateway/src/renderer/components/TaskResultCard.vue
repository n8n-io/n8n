<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onMounted, ref, watch } from 'vue';

import AssistantButton from './AssistantButton.vue';

import type { TaskResultCard } from '../assistant/task-result-store';

/**
 * One task result card (done / handoff / error), floated at App level next to
 * the permission prompt stack so it stays visible over any view, including the
 * chat overlay. Purely presentational — the host routes keep/dismiss.
 */
const props = defineProps<{ card: TaskResultCard }>();

const emit = defineEmits<{ keep: []; dismiss: [] }>();

const i18n = useI18n();

// The card appears far from whatever had focus; move focus to it so screen
// readers announce it (it carries tabindex="-1" as an announcement target).
const rootRef = ref<HTMLElement | null>(null);
onMounted(() => rootRef.value?.focus());
watch(
	() => props.card,
	() => rootRef.value?.focus(),
);
</script>

<template>
	<!-- Done card -->
	<div
		v-if="card.kind === 'done'"
		ref="rootRef"
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
			<span :class="$style.resultSubtitle">{{ card.label }}</span>
			<button
				type="button"
				:class="$style.resultDismiss"
				:aria-label="i18n.baseText('desktopAssistant.composer.dismiss')"
				@click="emit('dismiss')"
			>
				<N8nIcon icon="x" :size="14" aria-hidden="true" />
			</button>
		</div>
		<div :class="$style.resultBody">
			<div :class="$style.resultMessage">
				{{ i18n.baseText('desktopAssistant.composer.keepPrompt') }}
			</div>
			<div :class="$style.resultActions">
				<AssistantButton @click="emit('dismiss')">
					{{ i18n.baseText('desktopAssistant.composer.noThanks') }}
				</AssistantButton>
				<AssistantButton variant="solid" @click="emit('keep')">
					{{ i18n.baseText('desktopAssistant.composer.saveAsReady') }}
				</AssistantButton>
			</div>
		</div>
	</div>

	<!-- Handoff card -->
	<div
		v-else-if="card.kind === 'handoff'"
		ref="rootRef"
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
				@click="emit('dismiss')"
			>
				<N8nIcon icon="x" :size="14" aria-hidden="true" />
			</button>
		</div>
		<div :class="$style.resultBody">
			<div :class="$style.resultMessage">
				{{ card.message ?? i18n.baseText('desktopAssistant.composer.handoffMessage') }}
			</div>
		</div>
	</div>

	<!-- Error card -->
	<div
		v-else
		ref="rootRef"
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
				@click="emit('dismiss')"
			>
				<N8nIcon icon="x" :size="14" aria-hidden="true" />
			</button>
		</div>
		<div :class="$style.resultBody">
			<div :class="$style.resultMessage">{{ card.message }}</div>
		</div>
	</div>
</template>

<style module>
/* Shared result-card shell; the done/handoff/error variants only swap accents.
   Positioned by the host's floating area, not the card itself. */
.resultCard {
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

/* Done variant: green accents. */
.doneCard {
	border: 1px solid rgba(63, 207, 142, 0.45);
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
</style>
