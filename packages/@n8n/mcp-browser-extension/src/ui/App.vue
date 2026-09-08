<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nCheckbox, N8nIcon, N8nLogo } from '@n8n/design-system';
import { useConnection } from './composables/useConnection';
import { useRecording } from './composables/useRecording';
import InfoRow from './components/InfoRow.vue';
import RecordingReview from './components/RecordingReview.vue';
import RememberedHosts from './components/RememberedHosts.vue';
import TabList from './components/TabList.vue';

const {
	status,
	tabs,
	selectedTabIds,
	errorMessage,
	hasRelayUrl,
	isRelayAllowed,
	isAutoConnect,
	relayHostKey,
	rememberInstance,
	approvedHosts,
	controlledTabs,
	toggleTab,
	connect,
	decline,
	disconnect,
	forgetHost,
} = useConnection();

const {
	recording,
	errorMessage: recordingError,
	start: startRecording,
	stop: stopRecording,
	submit: submitRecording,
	discard: discardRecording,
	recordAgain,
	removeAction,
	maskAction,
} = useRecording();

const showTabSelection = ref(false);

const isConnected = computed(() => status.value === 'connected');
const showConnectPrompt = computed(() => hasRelayUrl.value && isRelayAllowed.value);
const recordingTitle = computed(() => {
	if (!recording.value) return '';
	if (recording.value.status === 'recording') {
		const actionCount = recording.value.actions.length;
		return `Recording · ${actionCount} ${actionCount === 1 ? 'action' : 'actions'}`;
	}
	if (recording.value.status === 'submitted') return 'Recording sent';
	if (recording.value.status === 'submitting') return 'Sending recording…';
	return 'Review recording';
});
</script>

<template>
	<div class="card">
		<div class="content">
			<N8nLogo class="logo" size="small" :collapsed="false" />

			<template v-if="isConnected">
				<h1 class="title">
					<span class="status-dot" />
					Connected to n8n
				</h1>
				<div class="panel">
					<InfoRow
						icon="shield"
						:title="
							relayHostKey ? `Connected to ${relayHostKey}` : 'Connected to your n8n instance'
						"
					/>
					<InfoRow
						icon="lock"
						title="Browser access"
						description="Tabs n8n opens will appear below"
					/>
					<template v-if="controlledTabs.length">
						<hr class="divider" />
						<TabList :tabs="controlledTabs" />
					</template>
				</div>
				<div v-if="recording" class="recording-panel">
					<h2 class="recording-title">{{ recordingTitle }}</h2>
					<p v-if="recording.status === 'recording'" class="subtitle">
						Use the browser as usual. Passwords and detected secrets are redacted.
					</p>
					<p v-else-if="recording.status === 'submitted'" class="subtitle">
						The AI Assistant is processing your recording in a new conversation.
					</p>
					<p v-else-if="recording.status === 'submitting'" class="subtitle">
						Keep this extension open while n8n starts the conversation.
					</p>
					<RecordingReview
						v-else-if="recording.status === 'review'"
						:actions="recording.actions"
						@remove="removeAction"
						@mask="maskAction"
					/>
				</div>
				<RememberedHosts :hosts="approvedHosts" @forget="forgetHost" />
			</template>

			<template v-else-if="showConnectPrompt">
				<h1 class="title">Allow n8n to access your browser</h1>
				<p v-if="isAutoConnect" class="subtitle">Auto-connecting (eval mode)…</p>
				<div class="panel">
					<InfoRow
						icon="shield"
						:title="`Connecting to ${relayHostKey}`"
						description="Only continue if you initiated this connection"
					>
						<N8nCheckbox
							v-if="!isAutoConnect"
							v-model="rememberInstance"
							class="remember"
							:label="`Always allow ${relayHostKey}`"
						/>
					</InfoRow>
					<InfoRow
						icon="lock"
						title="Browser access"
						description="n8n can access tabs it opens. Tabs you select below are shared for this connection only"
					>
						<button
							v-if="tabs.length"
							class="tabs-toggle"
							@click="showTabSelection = !showTabSelection"
						>
							Allow access to existing tabs{{
								selectedTabIds.size ? ` (${selectedTabIds.size})` : ''
							}}
							<N8nIcon :icon="showTabSelection ? 'chevron-up' : 'chevron-down'" size="medium" />
						</button>
					</InfoRow>
					<template v-if="showTabSelection && tabs.length">
						<hr class="divider" />
						<TabList
							:tabs="tabs"
							selectable
							:selected-tab-ids="selectedTabIds"
							@toggle-tab="toggleTab"
						/>
					</template>
				</div>
			</template>

			<template v-else-if="hasRelayUrl">
				<h1 class="title">Allow n8n to access your browser</h1>
				<p class="error">
					Can't connect to <strong>{{ relayHostKey || 'this address' }}</strong> — it isn't a valid
					n8n instance.
				</p>
			</template>

			<template v-else>
				<h1 class="title">n8n Browser Use extension</h1>
				<div class="panel">
					<InfoRow
						icon="eye-off"
						title="Disconnected"
						description="Initiate the connection from your n8n instance to get started"
					/>
				</div>
				<RememberedHosts :hosts="approvedHosts" @forget="forgetHost" />
			</template>

			<p v-if="errorMessage || recordingError" class="error">
				{{ errorMessage || recordingError }}
			</p>
		</div>

		<div v-if="isConnected" class="footer">
			<template v-if="recording?.status === 'recording'">
				<N8nButton variant="outline" size="large" @click="discardRecording">Cancel</N8nButton>
				<N8nButton size="large" @click="stopRecording">Stop recording</N8nButton>
			</template>
			<template v-else-if="recording?.status === 'review'">
				<N8nButton variant="outline" size="large" @click="recordAgain">Record again</N8nButton>
				<N8nButton size="large" :disabled="recording.actions.length === 0" @click="submitRecording">
					Send to n8n
				</N8nButton>
			</template>
			<template v-else-if="recording?.status === 'submitted'">
				<N8nButton variant="outline" size="large" @click="disconnect">Disconnect</N8nButton>
				<N8nButton size="large" @click="recordAgain">Record again</N8nButton>
			</template>
			<template v-else>
				<N8nButton variant="outline" size="large" @click="disconnect">Disconnect</N8nButton>
				<N8nButton v-if="!recording" size="large" @click="startRecording"
					>Start recording</N8nButton
				>
			</template>
		</div>
		<div v-else-if="showConnectPrompt" class="footer">
			<N8nButton variant="ghost" size="large" @click="decline">Decline</N8nButton>
			<N8nButton size="large" :disabled="status === 'connecting'" @click="connect"
				>Allow connection</N8nButton
			>
		</div>
	</div>
</template>

<style scoped lang="scss">
.card {
	display: flex;
	flex-direction: column;
	width: min(500px, 100%);
	margin: 0 auto;
	height: min(700px, calc(100dvh - 2 * var(--spacing--md)));
	min-height: 420px;
	background: var(--background--subtle);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius--xl);
	box-shadow: var(--shadow--light);
	overflow: hidden;

	// In a popup window the window itself is the card — no chrome, fill the viewport
	@media (max-width: 550px) {
		width: 100%;
		max-width: 100vw;
		height: 100dvh;
		min-height: 0;
		border: none;
		border-radius: 0;
		box-shadow: none;
	}
}

.content {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--xl);
	padding-bottom: var(--spacing--xs);
}

.logo {
	display: block;
	margin-bottom: var(--spacing--lg);

	:deep(svg) {
		margin-left: 0;
		width: auto;
		height: 24px;
	}
}

.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
	margin: 0 0 var(--spacing--lg);
}

.status-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--color--success);
	flex-shrink: 0;
}

.subtitle {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
	margin: 0 0 var(--spacing--sm);
}

.recording-panel {
	display: flex;
	flex-shrink: 0;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--md);
	padding: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
	background: var(--background--base);
}

.recording-title {
	margin: 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.divider {
	border: none;
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	margin: 0;
}

.tabs-toggle {
	appearance: none;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: transparent;
	border: none;
	border-radius: var(--radius);
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);

	&:hover {
		background: var(--color--background);
	}
}

.remember {
	--checkbox--label--font-size: var(--font-size--xs);
	margin-top: var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--md) var(--spacing--xl) var(--spacing--xl);
}

.error {
	color: var(--text-color--danger);
	font-size: var(--font-size--xs);
	margin-top: var(--spacing--2xs);
}
</style>

<style>
html {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 100vh;
	padding: var(--spacing--md);
}

/* body is a flex item of html — without min-width: 0, nowrap tab URLs
   propagate their intrinsic width and stretch the page beyond the viewport */
body {
	min-width: 0;
	width: 100%;
}

@media (max-width: 550px) {
	html {
		padding: 0;
	}
}
</style>
