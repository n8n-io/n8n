<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import AppHeader from './components/AppHeader.vue';
import ChatPanel from './components/ChatPanel.vue';
import ComplexTaskView from './views/ComplexTaskView.vue';
import HomeView from './views/HomeView.vue';
import SettingsView from './views/SettingsView.vue';
import SignInView from './views/SignInView.vue';
import TaskDetailView from './views/TaskDetailView.vue';
import TaskDraftView from './views/TaskDraftView.vue';
import TaskSetupView from './views/TaskSetupView.vue';

import { getAuthStatus, onAuthStatusChanged } from './assistant/tasks-api';
import { useAssistantScreen } from './assistant/use-assistant-screen';
import { chatOverlay, closeChat } from './chat/chat-overlay';

import type { AuthStatus } from '../shared/types';

const auth = ref<AuthStatus>({
	state: 'signedOut',
	instanceUrl: null,
	lastInstanceUrl: null,
	error: null,
});
const { screen, goHome } = useAssistantScreen();

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
	onAuthStatusChanged((status) => {
		receivedEvent = true;
		auth.value = status;
	});
	const initial = await getAuthStatus();
	if (!receivedEvent) auth.value = initial;
});

const showSettings = ref(false);

// Leaving the signed-in state (sign-out, token expiry) always lands on the sign-in
// view; reset settings and the assistant screen so neither reappears after the
// next sign-in (the screen is module-scope state and would otherwise survive).
watch(
	() => auth.value.state,
	(state) => {
		if (state !== 'signedIn') {
			showSettings.value = false;
			goHome();
			closeChat();
		}
	},
);
</script>

<template>
	<div :class="$style.app">
		<AppHeader
			v-if="showHeader"
			:state="auth.state"
			:chat-open="chatOverlay.isOpen"
			:chat-title="chatOverlay.title"
			@back="closeChat"
			@open-settings="showSettings = !showSettings"
		/>
		<div :class="$style.content">
			<template v-if="auth.state === 'signedIn'">
				<SettingsView v-if="showSettings" :status="auth" @close="showSettings = false" />
				<TaskDraftView v-else-if="screen.name === 'draft'" :plan="screen.plan" />
				<TaskSetupView
					v-else-if="screen.name === 'setup'"
					:title="screen.title"
					:icon="screen.icon"
					:required-connections="screen.requiredConnections"
				/>
				<ComplexTaskView v-else-if="screen.name === 'complex'" :plan="screen.plan" />
				<TaskDetailView
					v-else-if="screen.name === 'task-detail'"
					:key="screen.card.workflowId"
					:card="screen.card"
					:variant="screen.variant"
				/>
				<HomeView v-else />
			</template>
			<SignInView v-else :status="auth" />

			<!-- The chat slides up over whatever is beneath; the main view keeps its state. -->
			<Transition
				:enter-active-class="$style.chatSlideActive"
				:enter-from-class="$style.chatSlideFrom"
				:leave-active-class="$style.chatSlideActive"
				:leave-to-class="$style.chatSlideFrom"
			>
				<div v-if="auth.state === 'signedIn' && chatOverlay.isOpen" :class="$style.chatOverlay">
					<ChatPanel />
				</div>
			</Transition>
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
	/* Anchor for the chat overlay. */
	position: relative;
	display: flex;
	flex: 1;
	flex-direction: column;
	overflow: auto;
	background: var(--da-surface);
}

.chatOverlay {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
}

.chatSlideActive {
	transition:
		transform 0.25s ease,
		opacity 0.25s ease;
}

.chatSlideFrom {
	opacity: 0;
	transform: translateY(100%);
}
</style>
