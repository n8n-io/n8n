<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import AppHeader from './components/AppHeader.vue';
import HomeView from './views/HomeView.vue';
import SettingsView from './views/SettingsView.vue';
import SignInView from './views/SignInView.vue';

import type { AuthStatus } from '../shared/types';

const auth = ref<AuthStatus>({
	state: 'signedOut',
	instanceUrl: null,
	lastInstanceUrl: null,
	error: null,
});

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

const showSettings = ref(false);

// Leaving the signed-in state (sign-out, token expiry) always lands on the sign-in
// view; reset so settings isn't unexpectedly open again after the next sign-in.
watch(
	() => auth.value.state,
	(state) => {
		if (state !== 'signedIn') showSettings.value = false;
	},
);
</script>

<template>
	<div :class="$style.app">
		<AppHeader :state="auth.state" @open-settings="showSettings = !showSettings" />
		<div :class="$style.content">
			<template v-if="auth.state === 'signedIn'">
				<SettingsView v-if="showSettings" :status="auth" @close="showSettings = false" />
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
