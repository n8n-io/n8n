<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import {
	AgentCodingConfigSchema,
	N8N_CODING_DEFAULTS,
	defaultCodingCheckTimeoutMinutes,
	type AgentCodingConfig,
	type AgentCodingStatus,
} from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';

import CredentialPicker from '@/features/credentials/components/CredentialPicker/CredentialPicker.vue';
import { TIME } from '@/app/constants/durations';
import { createAgentCodingApi } from '../agentCoding.api';
import AgentModal from './modals/AgentModal.vue';

const props = defineProps<{
	config?: AgentCodingConfig | null;
	projectId: string;
	agentId: string;
	disabled?: boolean;
	canExecute?: boolean;
	beforePrepare?: () => Promise<unknown>;
}>();
const emit = defineEmits<{
	'update:config': [config: AgentCodingConfig | null];
	open: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { showError } = useToast();
const api = computed(() =>
	createAgentCodingApi(rootStore.restApiContext, props.projectId, props.agentId),
);
const open = ref(false);
const busy = ref(false);
const error = ref('');
const status = ref<AgentCodingStatus>();
const repositoryUrl = ref('https://github.com/n8n-io/n8n.git');
const branch = ref('master');
const credentialId = ref('');
const setupCommand = ref(N8N_CODING_DEFAULTS.setupCommand);
const runCommand = ref(N8N_CODING_DEFAULTS.runCommand);
const checkCommand = ref(N8N_CODING_DEFAULTS.checkCommand);
const port = ref(String(N8N_CODING_DEFAULTS.port));
// Empty means the default limit of the repository, which the placeholder shows.
const checkTimeoutMinutes = ref(String(N8N_CODING_DEFAULTS.checkTimeoutMinutes));
const labels = computed(() => ({
	not_started: i18n.baseText('agents.coding.status.notStarted'),
	cloning: i18n.baseText('agents.coding.status.cloning'),
	installing: i18n.baseText('agents.coding.status.installing'),
	ready: i18n.baseText('agents.coding.status.ready'),
	error: i18n.baseText('agents.coding.status.error'),
	stopped: i18n.baseText('agents.coding.status.stopped'),
	restarted: i18n.baseText('agents.coding.status.restarted'),
}));
const repositoryName = computed(() =>
	props.config?.repositoryUrl
		.replace(/\.git$/, '')
		.split('/')
		.slice(-2)
		.join('/'),
);
const preparing = computed(
	() => status.value?.phase === 'cloning' || status.value?.phase === 'installing',
);

async function refresh() {
	if (!props.config || !props.agentId || props.agentId === 'new') return;
	try {
		status.value = await api.value.status();
		error.value = '';
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause);
	}
}

useIntervalFn(() => {
	if (preparing.value) void refresh();
}, 3 * TIME.SECOND);
watch(
	() => props.config,
	() => {
		void refresh();
	},
	{ immediate: true },
);

function configure() {
	const config = props.config;
	if (config) {
		repositoryUrl.value = config.repositoryUrl;
		branch.value = config.branch;
		credentialId.value = config.credentialId ?? '';
		setupCommand.value = config.setupCommand;
		runCommand.value = config.runCommand;
		checkCommand.value = config.checkCommand;
		port.value = String(config.port);
		checkTimeoutMinutes.value = config.checkTimeoutMinutes?.toString() ?? '';
	}
	error.value = '';
	open.value = true;
}

watch(
	repositoryUrl,
	(value) => {
		if (value.includes('github.com/n8n-io/n8n')) {
			setupCommand.value = N8N_CODING_DEFAULTS.setupCommand;
			runCommand.value = N8N_CODING_DEFAULTS.runCommand;
			checkCommand.value = N8N_CODING_DEFAULTS.checkCommand;
			port.value = String(N8N_CODING_DEFAULTS.port);
			checkTimeoutMinutes.value = String(N8N_CODING_DEFAULTS.checkTimeoutMinutes);
		} else {
			setupCommand.value = 'pnpm install';
			runCommand.value = 'pnpm dev --host 0.0.0.0';
			checkCommand.value = '';
			port.value = '3000';
			checkTimeoutMinutes.value = '';
			branch.value = '';
		}
	},
	{ flush: 'sync' },
);

async function save() {
	if (props.disabled) return;
	const parsed = AgentCodingConfigSchema.safeParse({
		repositoryUrl: repositoryUrl.value.trim(),
		branch: branch.value.trim(),
		credentialId: credentialId.value || undefined,
		setupCommand: setupCommand.value,
		runCommand: runCommand.value,
		checkCommand: checkCommand.value,
		port: Number(port.value),
		checkTimeoutMinutes: String(checkTimeoutMinutes.value).trim()
			? Number(checkTimeoutMinutes.value)
			: undefined,
	});
	if (!parsed.success) {
		error.value = parsed.error.issues.map((issue) => issue.message).join('. ');
		return;
	}
	busy.value = true;
	error.value = '';
	try {
		emit('update:config', parsed.data);
		await nextTick();
		await props.beforePrepare?.();
		open.value = false;
		await api.value.action({ action: 'prepare' });
		await refresh();
	} catch (cause) {
		error.value = cause instanceof Error ? cause.message : String(cause);
		showError(cause, i18n.baseText('agents.coding.prepareFailed'));
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<div>
		<div :class="$style.row" data-testid="agent-coding-capability">
			<div :class="$style.identity">
				<N8nIcon icon="code" size="large" />
				<div>
					<N8nText bold>{{ i18n.baseText('agents.coding.title') }}</N8nText>
					<div v-if="config" :class="$style.detail">
						<N8nText size="small">{{ repositoryName }}</N8nText>
						<N8nText size="small" color="text-light">{{
							labels[status?.phase ?? 'not_started']
						}}</N8nText>
					</div>
					<N8nText v-else tag="div" size="small" color="text-light">{{
						i18n.baseText('agents.coding.description')
					}}</N8nText>
				</div>
			</div>
			<div :class="$style.actions">
				<N8nButton
					v-if="config"
					variant="ghost"
					size="small"
					:disabled="disabled"
					@click="configure"
					>{{ i18n.baseText('agents.coding.settings') }}</N8nButton
				>
				<N8nButton
					v-if="config"
					variant="outline"
					size="small"
					:disabled="canExecute === false || busy"
					@click="emit('open')"
					>{{ i18n.baseText('agents.coding.open') }}</N8nButton
				>
				<N8nButton v-else variant="outline" size="small" :disabled="disabled" @click="configure">{{
					i18n.baseText('agents.coding.setup')
				}}</N8nButton>
			</div>
		</div>
		<N8nText v-if="error && !open" tag="div" size="small" color="danger">{{ error }}</N8nText>
		<AgentModal v-model:open="open" :title="i18n.baseText('agents.coding.setup')" :busy="busy">
			<div :class="$style.form">
				<N8nInputLabel :label="i18n.baseText('agents.coding.repositoryUrl')" required>
					<N8nInput
						v-model="repositoryUrl"
						placeholder="https://github.com/n8n-io/n8n.git"
						data-testid="agent-coding-repository-url"
					/>
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('agents.coding.branch')">
					<N8nInput v-model="branch" :placeholder="i18n.baseText('agents.coding.defaultBranch')" />
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('agents.coding.gitCredential')">
					<CredentialPicker
						app-name="GitHub"
						credential-type="githubApi"
						:selected-credential-id="credentialId || null"
						:project-id="projectId"
						:show-delete="false"
						:teleported="false"
						credential-modal-append-to-body
						@credential-selected="credentialId = $event"
						@credential-deselected="credentialId = ''"
					/>
				</N8nInputLabel>
				<details open>
					<summary>{{ i18n.baseText('agents.coding.commands') }}</summary>
					<div :class="$style.form">
						<N8nInputLabel :label="i18n.baseText('agents.coding.setupCommand')"
							><N8nInput v-model="setupCommand" type="textarea" :rows="2"
						/></N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('agents.coding.runCommand')"
							><N8nInput v-model="runCommand" type="textarea" :rows="2"
						/></N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('agents.coding.checkCommand')"
							><N8nInput v-model="checkCommand"
						/></N8nInputLabel>
						<N8nInputLabel
							:label="i18n.baseText('agents.coding.checkTimeout')"
							input-name="agent-coding-check-timeout"
							><N8nInput
								id="agent-coding-check-timeout"
								v-model="checkTimeoutMinutes"
								type="number"
								:placeholder="String(defaultCodingCheckTimeoutMinutes(repositoryUrl))"
								data-testid="agent-coding-check-timeout"
						/></N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('agents.coding.previewPort')"
							><N8nInput v-model="port" type="number"
						/></N8nInputLabel>
					</div>
				</details>
				<N8nText v-if="error" color="danger" size="small">{{ error }}</N8nText>
			</div>
			<template #footerLeft>
				<N8nButton
					v-if="config"
					variant="ghost"
					:disabled="busy"
					@click="
						emit('update:config', null);
						open = false;
					"
					>{{ i18n.baseText('agents.coding.remove') }}</N8nButton
				>
			</template>
			<template #footerActions>
				<N8nButton
					:loading="busy"
					:disabled="disabled"
					data-testid="agent-coding-connect"
					@click="save"
					>{{ i18n.baseText('agents.coding.connect') }}</N8nButton
				>
			</template>
		</AgentModal>
	</div>
</template>

<style lang="scss" module>
.row,
.identity,
.actions,
.detail {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
.row {
	justify-content: space-between;
	flex-wrap: wrap;
	padding-block: var(--spacing--sm);
}
.identity {
	min-width: 0;
}
.detail {
	flex-wrap: wrap;
	margin-top: var(--spacing--4xs);
}
.actions {
	margin-left: auto;
}
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.form summary {
	cursor: pointer;
	color: var(--text-color);
	margin-block: var(--spacing--sm);
	font-size: var(--font-size--sm);
}
</style>
