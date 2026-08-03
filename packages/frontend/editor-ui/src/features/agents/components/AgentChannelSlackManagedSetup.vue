<script setup lang="ts">
import type { SlackManagedSetupState } from '@n8n/api-types';
import { N8nButton, N8nOption, N8nSelect, N8nStepper, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { computed, ref, watch } from 'vue';

import CredentialsDropdown, {
	type CredentialOption,
} from '@/features/credentials/components/CredentialPicker/CredentialsDropdown.vue';

const props = defineProps<{
	setup: SlackManagedSetupState;
	loading: boolean;
	credentialPermissions: PermissionsRecord['credential'];
	connectManager: (credentialId?: string) => Promise<boolean>;
	installApp: (managerCredentialId: string, workspaceId: string) => Promise<boolean>;
}>();

const i18n = useI18n();
const selectedCredentialId = ref('');
const selectedWorkspaceId = ref('');
const connecting = ref(false);
const installing = ref(false);
const error = ref<'connect' | 'install' | null>(null);

const steps = computed(() => [
	{
		id: 'connect',
		title: i18n.baseText('agents.channels.slack.managed.connect.title'),
		description: i18n.baseText('agents.channels.slack.managed.connect.description'),
	},
	{
		id: 'install',
		title: i18n.baseText('agents.channels.slack.managed.install.title'),
		description: i18n.baseText('agents.channels.slack.managed.install.description'),
	},
]);

const selectedCredential = computed(() =>
	props.setup.managerCredentials.find((credential) => credential.id === selectedCredentialId.value),
);
const credentialOptions = computed<CredentialOption[]>(() =>
	props.setup.managerCredentials.map((credential) => ({
		id: credential.id,
		name: credential.name,
		typeDisplayName: undefined,
	})),
);
const managerConnected = computed(
	() => selectedCredential.value?.connected === true && !selectedCredential.value.reconnectRequired,
);
const workspaces = computed(() => selectedCredential.value?.workspaces ?? []);

watch(
	() => props.setup.managerCredentials,
	(credentials) => {
		if (!credentials.some(({ id }) => id === selectedCredentialId.value)) {
			selectedCredentialId.value = credentials.find(({ connected }) => connected)?.id ?? '';
		}
	},
	{ immediate: true },
);

watch(
	workspaces,
	(availableWorkspaces) => {
		if (!availableWorkspaces.some(({ id }) => id === selectedWorkspaceId.value)) {
			selectedWorkspaceId.value = availableWorkspaces.length === 1 ? availableWorkspaces[0].id : '';
		}
	},
	{ immediate: true },
);

async function connect() {
	connecting.value = true;
	error.value = null;
	try {
		// TODO: Check scopes for selected credential
		const connected = await props.connectManager(selectedCredentialId.value || undefined);
		if (!connected) error.value = 'connect';
	} catch {
		error.value = 'connect';
	} finally {
		connecting.value = false;
	}
}

async function createCredential() {
	connecting.value = true;
	error.value = null;
	try {
		const connected = await props.connectManager();
		if (!connected) error.value = 'connect';
	} catch {
		error.value = 'connect';
	} finally {
		connecting.value = false;
	}
}

async function install() {
	if (!selectedCredentialId.value || !selectedWorkspaceId.value) return;
	installing.value = true;
	error.value = null;
	try {
		const installed = await props.installApp(selectedCredentialId.value, selectedWorkspaceId.value);
		if (!installed) error.value = 'install';
	} catch {
		error.value = 'install';
	} finally {
		installing.value = false;
	}
}
</script>

<template>
	<div :class="$style.setup" data-testid="slack-managed-setup">
		<N8nStepper :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<template v-if="step.id === 'connect'">
						<div :class="$style.actionRow">
							<CredentialsDropdown
								:credential-options="credentialOptions"
								:selected-credential-id="selectedCredentialId || null"
								:permissions="credentialPermissions"
								:disabled="loading || connecting"
								:loading="loading"
								size="medium"
								:placeholder="i18n.baseText('agents.channels.slack.managed.credential.placeholder')"
								data-test-id="slack-manager-credential-select"
								@credential-selected="selectedCredentialId = $event"
								@new-credential="createCredential"
							/>
							<N8nButton
								variant="subtle"
								:loading="connecting"
								:disabled="loading || managerConnected || !selectedCredentialId"
								data-testid="slack-manager-connect"
								@click="connect"
							>
								{{
									i18n.baseText(
										selectedCredential?.reconnectRequired
											? 'agents.channels.slack.managed.reconnect'
											: managerConnected
												? 'agents.channels.slack.managed.connected'
												: 'generic.connect',
									)
								}}
							</N8nButton>
						</div>
						<N8nText v-if="error === 'connect'" size="small" :class="$style.error">
							{{ i18n.baseText('agents.channels.slack.managed.connect.error') }}
						</N8nText>
					</template>

					<template v-else-if="step.id === 'install'">
						<div v-if="managerConnected" :class="$style.actionRow">
							<N8nSelect
								v-model="selectedWorkspaceId"
								:disabled="installing"
								:placeholder="i18n.baseText('agents.channels.slack.managed.workspace.placeholder')"
								data-testid="slack-managed-workspace-select"
							>
								<N8nOption
									v-for="workspace in workspaces"
									:key="workspace.id"
									:value="workspace.id"
									:label="workspace.name"
								/>
							</N8nSelect>
							<N8nButton
								variant="subtle"
								:loading="installing"
								:disabled="!selectedWorkspaceId"
								data-testid="slack-managed-install"
								@click="install"
							>
								{{ i18n.baseText('agents.channels.slack.managed.install.button') }}
							</N8nButton>
						</div>
						<N8nText v-else size="small" color="text-light">
							{{ i18n.baseText('agents.channels.slack.managed.install.connectFirst') }}
						</N8nText>
						<N8nText v-if="error === 'install'" size="small" :class="$style.error">
							{{ i18n.baseText('agents.channels.slack.managed.install.error') }}
						</N8nText>
					</template>
				</div>
			</template>
		</N8nStepper>
	</div>
</template>

<style module lang="scss">
.setup {
	display: flex;
	flex-direction: column;
}

.stepContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--xs);
	min-width: 0;
}

.actionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;

	> :first-child {
		flex: 1;
	}
}

.error {
	color: var(--text-color--danger);
}
</style>
