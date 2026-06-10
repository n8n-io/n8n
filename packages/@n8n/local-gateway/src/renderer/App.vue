<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import AppHeader from './components/AppHeader.vue';
import ComplexTaskView from './views/ComplexTaskView.vue';
import HomeView from './views/HomeView.vue';
import SignInView from './views/SignInView.vue';
import TaskDraftView from './views/TaskDraftView.vue';
import TaskSetupView from './views/TaskSetupView.vue';

import { useAssistantScreen } from './assistant/use-assistant-screen';

import type { AuthStatus } from '../shared/types';

const auth = ref<AuthStatus>({ state: 'signedOut', instanceUrl: null, error: null });
const { screen } = useAssistantScreen();

// The setup and complex screens carry their own back-header, so the main
// AppHeader is suppressed for them; home and draft keep it.
const showHeader = computed(
	() =>
		auth.value.state !== 'signedIn' ||
		screen.value.name === 'home' ||
		screen.value.name === 'draft',
);

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
		<AppHeader v-if="showHeader" :state="auth.state" />
		<div :class="$style.content">
			<template v-if="auth.state === 'signedIn'">
				<TaskDraftView v-if="screen.name === 'draft'" :plan="screen.plan" />
				<TaskSetupView
					v-else-if="screen.name === 'setup'"
					:task-id="screen.taskId"
					:title="screen.title"
					:icon="screen.icon"
					:required-connections="screen.requiredConnections"
				/>
				<ComplexTaskView v-else-if="screen.name === 'complex'" :plan="screen.plan" />
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
