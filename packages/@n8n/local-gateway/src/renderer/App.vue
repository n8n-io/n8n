<script setup lang="ts">
import { onMounted, ref } from 'vue';

import AppHeader from './components/AppHeader.vue';
import HomeView from './views/HomeView.vue';
import SettingsView from './views/SettingsView.vue';
import SignInView from './views/SignInView.vue';

import type { AuthStatus } from '../shared/types';

const auth = ref<AuthStatus>({ state: 'signedOut', instanceUrl: null, error: null });
const view = ref<'home' | 'settings'>('home');

// Settings only makes sense while signed in; drop back to home whenever we leave that state
// (e.g. after logging out from Settings) so a fresh sign-in doesn't land back in Settings.
function applyAuth(status: AuthStatus) {
	auth.value = status;
	if (status.state !== 'signedIn') view.value = 'home';
}

onMounted(async () => {
	// Subscribe before fetching the initial status so a transition emitted while we await can't slip
	// through the gap, and don't let the awaited initial value clobber an event that already arrived.
	let receivedEvent = false;
	window.electronAPI.onAuthStatusChanged((status) => {
		receivedEvent = true;
		applyAuth(status);
	});
	const initial = await window.electronAPI.getAuthStatus();
	if (!receivedEvent) applyAuth(initial);
});
</script>

<template>
	<div :class="$style.app">
		<AppHeader :state="auth.state" @open-settings="view = 'settings'" />
		<div :class="$style.content">
			<template v-if="auth.state === 'signedIn'">
				<SettingsView v-if="view === 'settings'" @back="view = 'home'" />
				<HomeView v-else />
			</template>
			<SignInView v-else :status="auth" />
		</div>
	</div>
</template>

<style module>
.app {
	display: flex;
	flex-direction: column;
	height: 100vh;
	/* Header/window sit on the darker base; the content body is a touch lighter. */
	background: var(--da-bg);
}

.content {
	display: flex;
	flex: 1;
	flex-direction: column;
	overflow: auto;
	background: var(--da-surface);
}
</style>
