<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import N8nSelect from '@n8n/design-system/components/N8nSelect';
import N8nOption from '@n8n/design-system/components/N8nOption';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { connectSlack, disconnectSlack, getSlackStatus } from '../composables/useAgentApi';

const props = defineProps<{
	projectId: string;
	agentId: string;
}>();

const rootStore = useRootStore();

interface CredentialOption {
	id: string;
	name: string;
}

const slackStatus = ref('disconnected');
const connectedCredentialId = ref('');
const selectedCredentialId = ref('');
const loading = ref(false);
const credentials = ref<CredentialOption[]>([]);
const credentialsLoading = ref(false);

async function fetchSlackStatus() {
	try {
		const result = await getSlackStatus(rootStore.restApiContext, props.projectId, props.agentId);
		slackStatus.value = result.status;
		// Track which credential is connected so disconnect can use it
		const slackIntegration = (result.integrations ?? []).find(
			(i: { type: string }) => i.type === 'slack',
		);
		if (slackIntegration) {
			connectedCredentialId.value = slackIntegration.credentialId;
		} else {
			connectedCredentialId.value = '';
		}
	} catch {
		slackStatus.value = 'disconnected';
		connectedCredentialId.value = '';
	}
}

async function fetchCredentials() {
	credentialsLoading.value = true;
	try {
		const allCredentials = await makeRestApiRequest<
			Array<{ id: string; name: string; type: string }>
		>(rootStore.restApiContext, 'GET', '/credentials');
		credentials.value = allCredentials
			.filter((c) => c.type === 'slackApi' || c.type === 'slackOAuth2Api')
			.map((c) => ({ id: c.id, name: c.name }));
	} catch {
		credentials.value = [];
	} finally {
		credentialsLoading.value = false;
	}
}

async function onConnect() {
	if (!selectedCredentialId.value) return;
	loading.value = true;
	try {
		await connectSlack(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			selectedCredentialId.value,
		);
		await fetchSlackStatus();
	} finally {
		loading.value = false;
	}
}

async function onDisconnect() {
	const credId = connectedCredentialId.value || selectedCredentialId.value;
	if (!credId) return;
	loading.value = true;
	try {
		await disconnectSlack(rootStore.restApiContext, props.projectId, props.agentId, credId);
		await fetchSlackStatus();
		selectedCredentialId.value = '';
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	await Promise.all([fetchSlackStatus(), fetchCredentials()]);
});
</script>

<template>
	<div :class="$style.panel">
		<N8nText :class="$style.heading" tag="h3" bold>Integrations</N8nText>

		<N8nCard :class="$style.card">
			<template #header>
				<div :class="$style.cardHeader">
					<div :class="$style.statusRow">
						<span
							:class="[
								$style.statusDot,
								slackStatus === 'connected' ? $style.statusConnected : $style.statusDisconnected,
							]"
						/>
						<N8nText bold>Slack</N8nText>
						<N8nText :class="$style.statusLabel" size="small">
							{{ slackStatus === 'connected' ? 'Connected' : 'Disconnected' }}
						</N8nText>
					</div>
				</div>
			</template>

			<div :class="$style.cardBody">
				<N8nText :class="$style.description" size="small">
					Connect a Slack bot credential to allow this agent to receive and respond to Slack
					messages.
				</N8nText>

				<div v-if="slackStatus !== 'connected'" :class="$style.connectForm">
					<label :class="$style.label">
						<N8nText size="small" bold>Slack Credential</N8nText>
					</label>
					<N8nSelect
						v-model="selectedCredentialId"
						:class="$style.select"
						placeholder="Select a credential..."
						:loading="credentialsLoading"
						:disabled="loading"
						size="medium"
						data-testid="slack-credential-select"
					>
						<N8nOption
							v-for="cred in credentials"
							:key="cred.id"
							:value="cred.id"
							:label="cred.name"
						/>
					</N8nSelect>
					<N8nText v-if="credentials.length === 0 && !credentialsLoading" size="small">
						No Slack API credentials found. Create a Slack API or Slack OAuth2 API credential in the
						Credentials page.
					</N8nText>
					<N8nButton
						:class="$style.actionButton"
						:disabled="!selectedCredentialId || loading"
						:loading="loading"
						size="small"
						data-testid="slack-connect-button"
						@click="onConnect"
					>
						<N8nIcon icon="plug" :size="14" />
						Connect
					</N8nButton>
				</div>

				<div v-else :class="$style.disconnectSection">
					<N8nText size="small">
						Your agent is connected to Slack and can receive messages.
					</N8nText>
					<N8nButton
						:class="$style.actionButton"
						type="tertiary"
						:loading="loading"
						size="small"
						data-testid="slack-disconnect-button"
						@click="onDisconnect"
					>
						<N8nIcon icon="unlink" :size="14" />
						Disconnect
					</N8nButton>
				</div>
			</div>
		</N8nCard>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	height: 100%;
}

.heading {
	margin-bottom: var(--spacing--sm);
}

.card {
	max-width: 480px;
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.statusConnected {
	background-color: var(--color--success);
}

.statusDisconnected {
	background-color: var(--color--foreground--shade-1);
}

.statusLabel {
	color: var(--color--text--tint-2);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.description {
	color: var(--color--text--tint-1);
}

.connectForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.label {
	display: block;
}

.select {
	width: 100%;
}

.disconnectSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.actionButton {
	align-self: flex-start;
}
</style>
