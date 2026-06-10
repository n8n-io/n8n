<script setup lang="ts">
import { onMounted, ref } from 'vue';

import AppHeader from './components/AppHeader.vue';
import HomeView from './views/HomeView.vue';
import SignInView from './views/SignInView.vue';

import type { AuthStatus } from '../shared/types';

const auth = ref<AuthStatus>({ state: 'signedOut', instanceUrl: null, error: null });

onMounted(async () => {
	// Subscribe before fetching the initial status so a transition emitted while we await can't slip
	// through the gap, and don't let the awaited initial value clobber an event that already arrived.
	let receivedEvent = false;
	window.electronAPI.onAuthStatusChanged((status) => {
		receivedEvent = true;
		auth.value = status;
	});
	const initial = await window.electronAPI.getAuthStatus();
	if (!receivedEvent) auth.value = initial;
});
</script>

<template>
	<div :class="$style.app">
		<AppHeader :state="auth.state" />
		<div :class="$style.content">
			<HomeView v-if="auth.state === 'signedIn'" />
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
