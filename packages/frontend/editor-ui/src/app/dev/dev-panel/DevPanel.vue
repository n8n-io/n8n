<script setup lang="ts">
import { computed, ref } from 'vue';

import PromptPopover from './PromptPopover.vue';
import { sendPrompt } from './channelClient';
import { collectElementContext } from './collectElementContext';
import { formatPromptForClipboard } from './formatPrompt';
import { DEV_PANEL_ROOT_ATTR, useElementPicker } from './useElementPicker';
import { useChannelHealth } from './useChannelHealth';

const { status } = useChannelHealth();
const { isPicking, hoveredElement, selectedElement, start, clearSelection } = useElementPicker();
const sending = ref(false);
const toast = ref<{ kind: 'info' | 'error'; message: string } | null>(null);

const channelAvailable = computed(() => status.value === 'connected');

const statusLabel = computed(() => {
	if (status.value === 'connected') return 'Connected';
	if (status.value === 'checking') return 'Checking…';
	return 'Not running';
});

const statusTooltip = computed(() => {
	if (status.value === 'connected') return 'Channel reachable on 127.0.0.1:8788.';
	if (status.value === 'checking') return 'Pinging the channel server.';
	return 'Run `pnpm dev:claude-panel` at the repo root to start Claude with the dev channel.';
});

const hoverOverlayStyle = computed(() => {
	const el = hoveredElement.value;
	if (!el) return { display: 'none' };
	const rect = el.getBoundingClientRect();
	return {
		top: `${rect.top}px`,
		left: `${rect.left}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
	};
});

function handlePick() {
	toast.value = null;
	clearSelection();
	start();
}

async function handleSend(prompt: string) {
	const anchor = selectedElement.value;
	if (!anchor) return;

	sending.value = true;
	try {
		await sendPrompt({ prompt, ...collectElementContext(anchor) });
		toast.value = { kind: 'info', message: 'Sent to Claude' };
		clearSelection();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to send';
		toast.value = { kind: 'error', message };
	} finally {
		sending.value = false;
		setTimeout(() => {
			toast.value = null;
		}, 3000);
	}
}

async function handleCopy(prompt: string) {
	const anchor = selectedElement.value;
	if (!anchor) return;

	const text = formatPromptForClipboard({ prompt, ...collectElementContext(anchor) });
	try {
		await navigator.clipboard.writeText(text);
		toast.value = { kind: 'info', message: 'Copied to clipboard' };
		clearSelection();
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Copy failed';
		toast.value = { kind: 'error', message };
	} finally {
		setTimeout(() => {
			toast.value = null;
		}, 3000);
	}
}

function handleCancel() {
	clearSelection();
}
</script>

<template>
	<div :[DEV_PANEL_ROOT_ATTR]="true" class="dev-panel-root">
		<div v-if="isPicking" class="dev-panel-hover-overlay" :style="hoverOverlayStyle" />

		<PromptPopover
			v-if="selectedElement"
			:anchor="selectedElement"
			:sending="sending"
			:channel-available="channelAvailable"
			@send="handleSend"
			@copy="handleCopy"
			@cancel="handleCancel"
		/>

		<div v-if="toast" class="dev-panel-toast" :class="`dev-panel-toast--${toast.kind}`">
			{{ toast.message }}
		</div>

		<div class="dev-panel-fab-wrap">
			<span class="dev-panel-status" :class="`dev-panel-status--${status}`" :title="statusTooltip">
				<span class="dev-panel-status-dot" />
				{{ statusLabel }}
			</span>
			<button
				type="button"
				class="dev-panel-fab"
				:class="{ 'dev-panel-fab--picking': isPicking }"
				:title="
					channelAvailable
						? 'Pick an element to prompt Claude'
						: `${statusTooltip} You can still copy prompts to the clipboard.`
				"
				@click="handlePick"
			>
				{{ isPicking ? 'Picking… (Esc to cancel)' : 'Ask Claude about an element' }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.dev-panel-root {
	position: fixed;
	z-index: 2147483645;
	inset: 0;
	pointer-events: none;
	font-family: var(--font-family);
}

.dev-panel-root > * {
	pointer-events: auto;
}

.dev-panel-hover-overlay {
	position: fixed;
	pointer-events: none;
	background: rgb(80 130 255 / 15%);
	border: 2px solid var(--color--primary);
	border-radius: var(--radius--sm);
	transition: all 40ms linear;
}

.dev-panel-toast {
	position: fixed;
	right: var(--spacing--sm);
	bottom: 64px;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	font-size: var(--font-size--xs);
	box-shadow: 0 4px 16px rgb(0 0 0 / 20%);
}

.dev-panel-toast--info {
	background: var(--color--success--tint-2);
	color: var(--color--success--shade-1);
	border: var(--border-width) var(--border-style) var(--color--success);
}

.dev-panel-toast--error {
	background: var(--color--danger--tint-4);
	color: var(--color--danger--shade-1);
	border: var(--border-width) var(--border-style) var(--color--danger);
}

.dev-panel-fab-wrap {
	position: fixed;
	right: var(--spacing--sm);
	bottom: var(--spacing--sm);
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.dev-panel-status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.dev-panel-status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--color--text--tint-3);
}

.dev-panel-status--connected .dev-panel-status-dot {
	background: var(--color--success);
}

.dev-panel-status--disconnected .dev-panel-status-dot {
	background: var(--color--danger);
}

.dev-panel-status--checking .dev-panel-status-dot {
	background: var(--color--warning);
}

.dev-panel-fab {
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: var(--color--primary);
	color: var(--color--background);
	border: none;
	border-radius: var(--radius--lg);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	box-shadow: 0 4px 12px rgb(0 0 0 / 20%);
}

.dev-panel-fab:hover:not(:disabled) {
	background: var(--color--primary--shade-1);
}

.dev-panel-fab:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.dev-panel-fab--picking {
	background: var(--color--warning);
}
</style>
