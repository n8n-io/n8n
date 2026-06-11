<script setup lang="ts">
import { N8nIcon, N8nLogo } from '@n8n/design-system';

import { activeViewTitle } from '../app/view-title';
import { openChat } from '../chat/chat-overlay';

import type { AuthState } from '../../shared/types';

// The indicator mirrors OAuth state for now; it will reflect the gateway
// connection once that is wired up.
defineProps<{
	state: AuthState;
}>();

const emit = defineEmits<{ openSettings: [] }>();

// TEMPORARY: invisible button next to the brand opens the chat overlay for manual
// testing until the composer flow calls openChat. Remove together with the button.
const DEV_CHAT_THREAD_ID = '4d49ba31-32c9-4ccb-8606-626e9087b417';

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
		<!-- A titled view is open — the brand becomes a back button + the view's title. -->
		<div v-if="activeViewTitle" :class="$style.brand">
			<button
				type="button"
				:class="$style.iconBtn"
				aria-label="Back"
				data-testid="header-back"
				@click="activeViewTitle.onBack?.()"
			>
				<N8nIcon icon="arrow-left" :size="16" aria-hidden="true" />
			</button>
			<span :class="[$style.brandLabel, $style.viewTitle]">{{ activeViewTitle.title }}</span>
		</div>
		<div v-else :class="$style.brand">
			<N8nLogo size="small" :collapsed="true" />
			<span :class="$style.brandLabel">Assistant</span>
			<!-- TEMPORARY chat-overlay test trigger: button-sized, but no icon or border. -->
			<button
				type="button"
				:class="$style.iconBtn"
				aria-label="Open chat (dev)"
				data-testid="header-dev-chat"
				@click="openChat(DEV_CHAT_THREAD_ID)"
			/>
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
	/* Design-system components resolve their color from --text-color, which defaults to the
	   light theme's dark text; pin it to the assistant palette so the header reads white. */
	--text-color: var(--da-text);
	color: var(--da-text);
}

.brand {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	/* Lets a long chat title shrink/ellipsize instead of pushing the status pill out. */
	min-width: 0;
	font-weight: 600;
	font-size: 14px;
	color: var(--da-text);
}

.brandLabel {
	font-weight: 600;
	font-size: 14px;
	color: var(--da-text);
}

.viewTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
