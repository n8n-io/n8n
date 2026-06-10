<script setup lang="ts">
import { N8nIcon, N8nLogo } from '@n8n/design-system';

import type { AuthState } from '../../shared/types';

// The indicator mirrors OAuth state for now; it will reflect the gateway
// connection once that is wired up.
defineProps<{ state: AuthState }>();

const emit = defineEmits<{ openSettings: [] }>();

const STATUS_LABEL: Record<AuthState, string> = {
	signedIn: 'Connected',
	authorizing: 'Connecting…',
	signedOut: 'Disconnected',
	error: 'Disconnected',
};

/** Dot color per state. signedIn = green; authorizing = amber; others = neutral subtlest. */
const DOT_CLASS: Record<AuthState, string> = {
	signedIn: 'dotConnected',
	authorizing: 'dotConnecting',
	signedOut: 'dotDisconnected',
	error: 'dotDisconnected',
};
</script>

<template>
	<header :class="$style.header">
		<div :class="$style.brand">
			<N8nLogo size="small" :collapsed="true" />
			<span :class="$style.brandLabel">Assistant</span>
		</div>

		<div :class="$style.actions">
			<!-- Status pill: flex container with dot + label, styled as a rounded pill -->
			<span :class="$style.statusPill">
				<span :class="[$style.dot, $style[DOT_CLASS[state]]]" />
				{{ STATUS_LABEL[state] }}
			</span>

			<!-- Settings icon button: 30×30, radius-7, matches prototype .iconbtn -->
			<button
				v-if="state === 'signedIn'"
				type="button"
				:class="$style.iconBtn"
				aria-label="Settings"
				data-testid="header-settings"
				@click="emit('openSettings')"
			>
				<N8nIcon icon="settings" :size="16" aria-hidden="true" />
			</button>
		</div>
	</header>
</template>

<style module>
.header {
	display: flex;
	align-items: center;
	gap: 9px;
	padding: 14px var(--spacing--sm);
	background: var(--da-bg);
	border-bottom: 1px solid var(--da-border);
}

.brand {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-weight: 600;
	font-size: 14px;
	color: var(--da-text);
}

.brandLabel {
	font-weight: 600;
	font-size: 14px;
	color: var(--da-text);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-left: auto;
}

/* Prototype pill: surface-2 bg, single-pixel border, 20px radius */
.statusPill {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: 12px;
	color: var(--da-subtler);
	background: var(--da-surface-2);
	padding: var(--spacing--4xs) 9px;
	border-radius: var(--radius--full);
	border: 1px solid var(--da-border);
}

.dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dotConnected {
	background: var(--da-green);
}

.dotConnecting {
	background: var(--da-amber);
}

.dotDisconnected {
	background: var(--da-subtlest);
}

/* Prototype .iconbtn: 30×30, radius-7, subtler color, hover = surface-2 + text color */
.iconBtn {
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	border-radius: 7px;
	color: var(--da-subtler);
	cursor: pointer;
	transition:
		background 0.12s,
		color 0.12s;
}

.iconBtn:hover {
	background: var(--da-surface-2);
	color: var(--da-text);
}

.iconBtn:focus-visible {
	outline: var(--da-focus-ring);
	outline-offset: var(--da-focus-ring-offset);
}
</style>
