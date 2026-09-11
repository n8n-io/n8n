<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nLogo,
} from '@n8n/design-system';
import { useConnection } from './composables/useConnection';
import { useRecommendations } from './composables/useRecommendations';
import { useRecording } from './composables/useRecording';
import AutomationIdeas from './components/AutomationIdeas.vue';
import InfoRow from './components/InfoRow.vue';
import RecordingCaptureSettings from './components/RecordingCaptureSettings.vue';
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
	recordingSettings,
	controlledTabs,
	toggleTab,
	connect,
	decline,
	disconnect,
	forgetHost,
	updateRecordingSetting,
} = useConnection();

const {
	recording,
	destinations,
	errorMessage: recordingError,
	start: startRecording,
	stop: stopRecording,
	submit: submitRecording,
	loadDestinations,
	discard: discardRecording,
	recordAgain,
	removeAction,
	maskAction,
	removeScreenshot,
	removeNetworkRequest,
} = useRecording();

const {
	status: recommendationsStatus,
	ideas: recommendationIdeas,
	isSending: isSendingRecommendation,
	send: sendRecommendation,
	refresh: refreshRecommendations,
} = useRecommendations();

const showTabSelection = ref(false);
const showRecordingSettings = ref(false);
const showSettings = ref(false);
const showDestinations = ref(false);
const instanceUrl = ref('');

const ideaPitchCopy = computed(() => {
	if (recommendationsStatus.value === 'ready' || recommendationsStatus.value === 'loading') {
		return {
			title: 'Automation ideas for this page',
			subtitle: 'Pick one to have AI Assistant build it, or record the task yourself.',
		};
	}
	return {
		title: 'Record a browser task',
		subtitle:
			'Show AI Assistant how you complete a task. The extension records your clicks, typing, ' +
			'and navigation so AI Assistant can build a workflow.',
	};
});

const isConnected = computed(() => status.value === 'connected');
const showConnectPrompt = computed(() => hasRelayUrl.value && isRelayAllowed.value);
const recordingDataSelection = computed(() => {
	const enabled = [
		recordingSettings.networkRequests ? 'Network requests' : '',
		recordingSettings.screenshots ? 'Screenshots' : '',
	].filter(Boolean);
	return enabled.length > 0 ? enabled.join(', ') : 'None selected';
});
const recordingTitle = computed(() => {
	if (!recording.value) return '';
	if (recording.value.status === 'recording') {
		const actionCount = recording.value.actions.length;
		return `Recording task · ${actionCount} ${actionCount === 1 ? 'action' : 'actions'}`;
	}
	if (recording.value.status === 'submitted') return 'Recording sent';
	if (recording.value.status === 'submitting') return 'Sending recording…';
	return 'Review recording';
});

watch(
	() => recording.value?.status,
	(status, previousStatus) => {
		if (status === 'submitted' && previousStatus === 'submitting') {
			void refreshRecommendations();
		}
	},
);

async function disconnectFromInstance() {
	await disconnect();
	showSettings.value = false;
}

async function prepareSubmission() {
	if (isConnected.value) {
		await submitRecording();
		return;
	}
	await loadDestinations();
	if (destinations.value.length === 1) {
		const destination = destinations.value[0];
		await submitRecording(destination.origin, destination.tabId);
	} else {
		showDestinations.value = true;
	}
}

async function submitTo(origin: string, tabId?: number) {
	showDestinations.value = false;
	await submitRecording(origin, tabId);
}

async function submitToInstanceUrl() {
	const origin = instanceUrl.value.trim();
	if (!origin) return;
	await submitTo(origin);
}
</script>

<template>
	<div class="card">
		<div class="content">
			<div class="header">
				<N8nButton
					v-if="showSettings && (isConnected || !hasRelayUrl)"
					class="settings-back"
					variant="ghost"
					size="small"
					icon="arrow-left"
					@click="showSettings = false"
				>
					Back
				</N8nButton>
				<template v-else>
					<N8nLogo class="logo" size="small" :collapsed="false" />
					<N8nIconButton
						v-if="(isConnected && (!recording || recording.status === 'submitted')) || !hasRelayUrl"
						icon="settings"
						variant="ghost"
						size="small"
						title="Settings"
						aria-label="Settings"
						@click="showSettings = true"
					/>
				</template>
			</div>

			<template v-if="isConnected && showSettings">
				<h1 class="title">Settings</h1>
				<div class="panel">
					<InfoRow
						icon="shield"
						:title="
							relayHostKey ? `Connected to ${relayHostKey}` : 'Connected to your n8n instance'
						"
						description="AI Assistant can use the browser tabs shown below"
					/>
					<template v-if="controlledTabs.length">
						<hr class="divider" />
						<TabList :tabs="controlledTabs" />
					</template>
				</div>
				<div class="panel">
					<InfoRow
						icon="eye"
						title="Recording data"
						description="These settings apply when the next recording starts"
					/>
					<RecordingCaptureSettings
						:settings="recordingSettings"
						@update="updateRecordingSetting"
					/>
				</div>
				<RememberedHosts show-empty :hosts="approvedHosts" @forget="forgetHost" />
			</template>

			<template v-else-if="recording?.status === 'review'">
				<h1 class="title">{{ showDestinations ? 'Send to AI Assistant' : 'Review recording' }}</h1>
				<div v-if="showDestinations && destinations.length" class="panel">
					<InfoRow
						v-for="destination in destinations"
						:key="destination.origin"
						icon="sparkles"
						:title="destination.origin"
					>
						<div class="destination-action">
							<N8nButton size="small" @click="submitTo(destination.origin, destination.tabId)">
								Send here
							</N8nButton>
						</div>
					</InfoRow>
				</div>
				<div v-else-if="showDestinations" class="panel">
					<InfoRow
						icon="link"
						title="Enter your n8n instance URL"
						description="Open AI Assistant at this address"
					/>
					<N8nInput v-model="instanceUrl" placeholder="https://example.app.n8n.cloud" />
				</div>
				<RecordingReview
					v-else
					:actions="recording.actions"
					:screenshots="recording.screenshots ?? []"
					:network-requests="recording.networkRequests ?? []"
					@remove="removeAction"
					@mask="maskAction"
					@remove-screenshot="removeScreenshot"
					@remove-network-request="removeNetworkRequest"
				/>
			</template>

			<template v-else-if="(isConnected || !hasRelayUrl) && !showSettings">
				<h1 v-if="recording" class="title">
					<span class="status-dot" />
					{{ recordingTitle }}
				</h1>
				<template v-if="!recording">
					<template v-if="recommendationsStatus !== 'sent'">
						<h1 class="title">{{ ideaPitchCopy.title }}</h1>
						<p class="subtitle">{{ ideaPitchCopy.subtitle }}</p>
					</template>
					<AutomationIdeas
						:status="recommendationsStatus"
						:ideas="recommendationIdeas"
						:is-sending="isSendingRecommendation"
						@pick="sendRecommendation"
					/>
					<div v-if="recommendationsStatus === 'unavailable'" class="panel">
						<InfoRow
							icon="mouse-pointer"
							title="Demonstrate the task"
							description="Complete the task in your browser as you usually do"
						/>
						<InfoRow
							icon="shield"
							title="Review before sharing"
							description="Passwords and detected secrets are redacted. You can remove or mask other details before you send the recording."
						/>
					</div>
				</template>
				<p v-else-if="recording.status === 'recording'" class="subtitle">
					Complete the task in your browser. Return here when you're ready to review the recorded
					actions.
				</p>
				<template v-else-if="recording.status === 'submitted'">
					<p class="subtitle">AI Assistant is building this in a new conversation.</p>
					<template v-if="recommendationsStatus === 'loading' || recommendationsStatus === 'ready'">
						<h2 class="ideas-title">Automation ideas for this page</h2>
						<AutomationIdeas
							:status="recommendationsStatus"
							:ideas="recommendationIdeas"
							:is-sending="isSendingRecommendation"
							@pick="sendRecommendation"
						/>
					</template>
				</template>
				<p v-else-if="recording.status === 'submitting'" class="subtitle">
					n8n is starting a new conversation from your recording.
				</p>
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
					<hr class="divider" />
					<InfoRow
						icon="eye"
						title="Recording data"
						description="Choose the additional data that recordings can include"
					>
						<button
							class="tabs-toggle"
							:aria-expanded="showRecordingSettings"
							@click="showRecordingSettings = !showRecordingSettings"
						>
							{{ recordingDataSelection }}
							<N8nIcon
								:icon="showRecordingSettings ? 'chevron-up' : 'chevron-down'"
								size="medium"
							/>
						</button>
					</InfoRow>
					<RecordingCaptureSettings
						v-if="showRecordingSettings"
						:settings="recordingSettings"
						@update="updateRecordingSetting"
					/>
				</div>
			</template>

			<template v-else-if="hasRelayUrl">
				<h1 class="title">Allow n8n to access your browser</h1>
				<p class="error">
					Can't connect to <strong>{{ relayHostKey || 'this address' }}</strong> — it isn't a valid
					n8n instance.
				</p>
			</template>

			<template v-else-if="showSettings">
				<h1 class="title">Settings</h1>
				<div class="panel">
					<InfoRow
						icon="eye-off"
						title="Disconnected"
						description="Connect Browser Use from AI Assistant to share browser access"
					/>
				</div>
				<div class="panel">
					<InfoRow
						icon="eye"
						title="Recording data"
						description="These settings apply when the next recording starts"
					/>
					<RecordingCaptureSettings
						:settings="recordingSettings"
						@update="updateRecordingSetting"
					/>
				</div>
				<RememberedHosts show-empty :hosts="approvedHosts" @forget="forgetHost" />
			</template>

			<template v-else>
				<h1 class="title">Turn browser actions into a workflow</h1>
				<p class="subtitle">
					Connect Browser Use to AI Assistant. Then record a task and send it to n8n to build a
					workflow.
				</p>
				<div class="panel">
					<InfoRow
						icon="plug"
						title="Connect from AI Assistant"
						description="Open AI Assistant in n8n and select Connect browser from the input menu"
					/>
					<InfoRow
						icon="mouse-pointer"
						title="Record the task"
						description="Return here and select Start recording"
					/>
					<InfoRow
						icon="sparkles"
						title="Build the workflow"
						description="Review the recorded actions, then send them to AI Assistant"
					/>
				</div>
			</template>

			<p v-if="errorMessage || recordingError" class="error">
				{{ errorMessage || recordingError }}
			</p>
		</div>

		<div v-if="isConnected && showSettings" class="footer">
			<N8nButton variant="outline" size="large" @click="disconnectFromInstance">
				Disconnect
			</N8nButton>
		</div>
		<div v-else-if="(isConnected || !hasRelayUrl) && !showSettings" class="footer">
			<template v-if="recording?.status === 'recording'">
				<N8nButton variant="outline" size="large" @click="discardRecording">Cancel</N8nButton>
				<N8nButton size="large" @click="stopRecording">Stop recording</N8nButton>
			</template>
			<template v-else-if="recording?.status === 'review'">
				<N8nButton
					variant="outline"
					size="large"
					@click="showDestinations ? (showDestinations = false) : recordAgain()"
				>
					{{ showDestinations ? 'Back' : 'Record again' }}
				</N8nButton>
				<N8nButton
					v-if="!showDestinations"
					size="large"
					:disabled="recording.actions.length === 0"
					@click="prepareSubmission"
				>
					Send to AI Assistant
				</N8nButton>
				<N8nButton
					v-else-if="destinations.length === 0"
					size="large"
					:disabled="instanceUrl.trim().length === 0"
					@click="submitToInstanceUrl"
				>
					Continue
				</N8nButton>
			</template>
			<template v-else-if="recording?.status === 'submitted'">
				<N8nButton size="large" @click="recordAgain">Record again</N8nButton>
			</template>
			<template v-else>
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

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: var(--spacing--xl);
	margin-bottom: var(--spacing--lg);
}

.logo {
	display: block;

	:deep(svg) {
		margin-left: 0;
		width: auto;
		height: 24px;
	}
}

.settings-back {
	margin-left: calc(-1 * var(--spacing--xs));
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

.ideas-title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
	margin: var(--spacing--lg) 0 var(--spacing--sm);
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

.destination-action {
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
