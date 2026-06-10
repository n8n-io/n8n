<script setup lang="ts">
import { N8nIconButton, N8nLogo, N8nText } from '@n8n/design-system';

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

const STATUS_CLASS: Record<AuthState, string> = {
	signedIn: 'connected',
	authorizing: 'connecting',
	signedOut: 'disconnected',
	error: 'error',
};
</script>

<template>
	<header :class="$style.header">
		<div :class="$style.brand">
			<N8nLogo size="small" :collapsed="true" />
			<N8nText bold>Assistant</N8nText>
		</div>

		<div :class="$style.actions">
			<span :class="$style.connection">
				<span :class="[$style.dot, $style[STATUS_CLASS[state]]]" />
				<N8nText size="small">{{ STATUS_LABEL[state] }}</N8nText>
			</span>
			<N8nIconButton
				v-if="state === 'signedIn'"
				icon="settings"
				variant="ghost"
				size="small"
				aria-label="Settings"
				data-testid="header-settings"
				@click="emit('openSettings')"
			/>
		</div>
	</header>
</template>

<style module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
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
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.connection {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 3px 10px;
	border-radius: 20px;
	background: var(--da-surface-2);
	border: 1px solid var(--da-border);
}

.dot {
	width: 0.5em;
	height: 0.5em;
	border-radius: var(--radius--full);
	background: var(--da-subtlest);
}

.connected {
	background: var(--da-green);
}

.connecting {
	background: var(--da-amber);
}
</style>
