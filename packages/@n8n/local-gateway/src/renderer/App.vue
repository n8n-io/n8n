<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import AppHeader from './components/AppHeader.vue';
import ChatPanel from './components/ChatPanel.vue';
import PermissionPromptStack from './components/PermissionPromptStack.vue';
import TaskResultCard from './components/TaskResultCard.vue';
import HomeView from './views/HomeView.vue';
import SettingsView from './views/SettingsView.vue';
import SignInView from './views/SignInView.vue';
import TaskDetailView from './views/TaskDetailView.vue';
import TaskDraftView from './views/TaskDraftView.vue';
import TaskSetupView from './views/TaskSetupView.vue';

import { dismissTaskResult, taskResultState } from './assistant/task-result-store';
import { useAssistantScreen } from './assistant/use-assistant-screen';
import { usePendingTasks } from './assistant/use-pending-tasks';
import { chatOverlay, closeChat } from './chat/chat-overlay';
import { clearAllPrompts } from './permissions/permission-prompt-store';
import { getThreadPromptWatcher } from './permissions/thread-prompt-watcher';
import { usePermissionPrompts } from './permissions/use-permission-prompts';

import type { AuthStatus } from '../shared/types';

const auth = ref<AuthStatus>({
	state: 'signedOut',
	instanceUrl: null,
	lastInstanceUrl: null,
	error: null,
});
const { screen, goHome } = useAssistantScreen();
const { prompts, respondingIds, failedIds, respondToPrompt } = usePermissionPrompts();
const pendingTasks = usePendingTasks();

/** Keep the one-off: promote its thread into a saved task; home shows the pending entry. */
function keepTaskResult() {
	const card = taskResultState.card;
	if (card?.kind !== 'done') return;
	// The icon (from the agent's outcome report) lands on the workflow's meta, not in its name.
	pendingTasks.promote(card.threadId, card.label, card.icon);
	dismissTaskResult();
	closeChat();
}

// The setup screen carries its own back-header, so the main AppHeader is
// suppressed for it; home and draft keep it.
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
			dismissTaskResult();
			// Another user must never see this user's pending prompts.
			getThreadPromptWatcher().stopAllWatches();
			clearAllPrompts();
		}
	},
);
</script>

<template>
	<div :class="$style.app">
		<AppHeader
			v-if="showHeader"
			:state="auth.state"
			@open-settings="showSettings = !showSettings"
		/>
		<div :class="$style.content">
			<template v-if="auth.state === 'signedIn'">
				<SettingsView v-if="showSettings" :status="auth" @close="showSettings = false" />
				<TaskDraftView
					v-else-if="screen.name === 'draft'"
					:thread-id="screen.threadId"
					:plan="screen.plan"
				/>
				<TaskSetupView
					v-else-if="screen.name === 'setup'"
					:title="screen.title"
					:icon="screen.icon"
					:required-connections="screen.requiredConnections"
				/>
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

			<!-- Permission prompts and the task result card float above the active
			     composer, on any view — including over the chat overlay. -->
			<div
				v-if="auth.state === 'signedIn' && (prompts.length > 0 || taskResultState.card)"
				:class="[$style.promptArea, chatOverlay.isOpen ? $style.aboveChat : $style.aboveHome]"
			>
				<PermissionPromptStack
					v-if="prompts.length > 0"
					:prompts="prompts"
					:responding-ids="respondingIds"
					:failed-ids="failedIds"
					@respond="respondToPrompt"
				/>
				<TaskResultCard
					v-if="taskResultState.card"
					:card="taskResultState.card"
					@keep="keepTaskResult"
					@dismiss="dismissTaskResult"
				/>
			</div>
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

/* Floats above whichever composer is active; z-above the chat overlay. */
.promptArea {
	position: absolute;
	right: var(--spacing--xs);
	left: var(--spacing--xs);
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

/* Clears the chat panel's single-row composer. */
.aboveChat {
	bottom: 68px;
}

/* Clears the home composer (input + context pills + suggestion chips). */
.aboveHome {
	bottom: 148px;
}
</style>
