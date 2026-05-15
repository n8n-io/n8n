<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nSwitch2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentComputerUseStatusResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { AgentJsonConfig } from '../types';
import { createComputerUsePairingLink, getComputerUseStatus } from '../composables/useAgentApi';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		projectId: string;
		agentId: string;
		disabled?: boolean;
	}>(),
	{
		disabled: false,
	},
);

const emit = defineEmits<{ 'update:config': [changes: Partial<AgentJsonConfig>] }>();

const i18n = useI18n();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();

const status = ref<AgentComputerUseStatusResponse | null>(null);
const pairingCommand = ref('');
const copied = ref(false);
const loading = ref(false);

const computerUse = computed(() => props.config?.computerUse);
const enabled = computed(() => computerUse.value?.enabled === true);
const moduleEnabled = computed(
	() => settingsStore.isAgentsComputerUseFeatureEnabled && status.value?.moduleEnabled !== false,
);
const connected = computed(() => status.value?.connected === true);
const filesystemAvailable = computed(() => status.value?.capabilities.filesystem.enabled === true);
const filesystemWriteAvailable = computed(
	() => status.value?.capabilities.filesystem.write === true,
);
const shellAvailable = computed(() => status.value?.capabilities.shell.enabled === true);
const browserAvailable = computed(() => status.value?.capabilities.browser?.enabled === true);
const browserReady = computed(() => status.value?.capabilities.browser?.ready === true);

const filesystemEnabled = computed(
	() => enabled.value && computerUse.value?.filesystem?.enabled !== false,
);
const fileWriteEnabled = computed(() => computerUse.value?.filesystem?.write === true);
const shellEnabled = computed(() => computerUse.value?.shell?.enabled === true);
const browserEnabled = computed(() => computerUse.value?.browser?.enabled === true);

const mainDisabledReason = computed(() => {
	if (moduleEnabled.value) return '';
	return i18n.baseText('agents.builder.computerUse.disabled.module');
});

function capabilityDisabledReason(available: boolean): string {
	if (!enabled.value) return i18n.baseText('agents.builder.computerUse.disabled.enableFirst');
	if (!connected.value) return i18n.baseText('agents.builder.computerUse.disabled.disconnected');
	if (!available) return i18n.baseText('agents.builder.computerUse.disabled.capability');
	return '';
}

function browserDisabledReason(): string {
	const baseReason = capabilityDisabledReason(browserAvailable.value);
	if (baseReason) return baseReason;
	if (!browserReady.value) {
		return i18n.baseText('agents.builder.computerUse.disabled.browserPermission');
	}
	return '';
}

function emitComputerUse(next: AgentJsonConfig['computerUse']) {
	emit('update:config', { computerUse: next });
}

function setEnabled(value: boolean) {
	emitComputerUse({
		enabled: value,
		filesystem: {
			enabled: computerUse.value?.filesystem?.enabled ?? true,
			write: computerUse.value?.filesystem?.write ?? false,
		},
		shell: {
			enabled: computerUse.value?.shell?.enabled ?? false,
		},
		browser: {
			enabled: computerUse.value?.browser?.enabled ?? false,
		},
	});
}

function setFilesystemEnabled(value: boolean) {
	emitComputerUse({
		enabled: enabled.value,
		filesystem: { ...computerUse.value?.filesystem, enabled: value },
		shell: computerUse.value?.shell,
		browser: computerUse.value?.browser,
	});
}

function setFileWriteEnabled(value: boolean) {
	emitComputerUse({
		enabled: enabled.value,
		filesystem: { ...computerUse.value?.filesystem, enabled: true, write: value },
		shell: computerUse.value?.shell,
		browser: computerUse.value?.browser,
	});
}

function setShellEnabled(value: boolean) {
	emitComputerUse({
		enabled: enabled.value,
		filesystem: computerUse.value?.filesystem,
		shell: { ...computerUse.value?.shell, enabled: value },
		browser: computerUse.value?.browser,
	});
}

function setBrowserEnabled(value: boolean) {
	emitComputerUse({
		enabled: enabled.value,
		filesystem: computerUse.value?.filesystem,
		shell: computerUse.value?.shell,
		browser: { ...computerUse.value?.browser, enabled: value },
	});
}

async function refreshStatus() {
	loading.value = true;
	try {
		status.value = await getComputerUseStatus(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} finally {
		loading.value = false;
	}
}

async function createLink() {
	const link = await createComputerUsePairingLink(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
	);
	pairingCommand.value = link.command;
	copied.value = false;
	await refreshStatus();
}

async function copyCommand() {
	if (!pairingCommand.value) return;
	await navigator.clipboard.writeText(pairingCommand.value);
	copied.value = true;
	window.setTimeout(() => {
		copied.value = false;
	}, 1500);
}

onMounted(() => {
	void refreshStatus();
});
</script>

<template>
	<div :class="$style.container" data-testid="agent-computer-use-panel">
		<div :class="$style.header">
			<div :class="$style.titleGroup">
				<N8nText tag="h3" :bold="true">
					{{ i18n.baseText('agents.builder.computerUse.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.computerUse.description') }}
				</N8nText>
			</div>
			<N8nTooltip :content="mainDisabledReason" :disabled="!mainDisabledReason">
				<N8nSwitch2
					:model-value="enabled"
					:disabled="props.disabled || !moduleEnabled"
					data-testid="agent-computer-use-toggle"
					@update:model-value="(value) => setEnabled(Boolean(value))"
				/>
			</N8nTooltip>
		</div>

		<div :class="$style.statusRow">
			<N8nIcon :icon="connected ? 'plug' : 'plug-zap'" :size="14" />
			<div :class="$style.statusText">
				<N8nText size="small" :bold="true">
					{{
						connected
							? i18n.baseText('agents.builder.computerUse.status.connected')
							: i18n.baseText('agents.builder.computerUse.status.disconnected')
					}}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{
						status?.directory
							? status.directory
							: i18n.baseText('agents.builder.computerUse.status.noRoot')
					}}
				</N8nText>
			</div>
			<N8nTooltip :content="i18n.baseText('agents.builder.computerUse.refresh')">
				<N8nIconButton
					icon="refresh-cw"
					variant="ghost"
					text
					size="small"
					:disabled="loading"
					:aria-label="i18n.baseText('agents.builder.computerUse.refresh')"
					data-testid="agent-computer-use-refresh"
					@click="refreshStatus"
				/>
			</N8nTooltip>
		</div>

		<div v-if="!connected" :class="$style.pairing">
			<N8nButton
				size="small"
				:disabled="props.disabled || !moduleEnabled"
				data-testid="agent-computer-use-create-link"
				@click="createLink"
			>
				<template #prefix><N8nIcon icon="terminal" :size="14" /></template>
				{{ i18n.baseText('agents.builder.computerUse.pairing.create') }}
			</N8nButton>
			<div v-if="pairingCommand" :class="$style.commandRow">
				<code :class="$style.command">{{ pairingCommand }}</code>
				<N8nTooltip
					:content="
						copied
							? i18n.baseText('agents.builder.computerUse.pairing.copied')
							: i18n.baseText('agents.builder.computerUse.pairing.copy')
					"
				>
					<N8nIconButton
						:icon="copied ? 'check' : 'copy'"
						variant="ghost"
						text
						:aria-label="i18n.baseText('agents.builder.computerUse.pairing.copy')"
						data-testid="agent-computer-use-copy-command"
						@click="copyCommand"
					/>
				</N8nTooltip>
			</div>
		</div>

		<div :class="$style.rows">
			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.computerUse.filesystem.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{
							capabilityDisabledReason(filesystemAvailable) ||
							i18n.baseText('agents.builder.computerUse.filesystem.hint')
						}}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="filesystemEnabled"
					:disabled="props.disabled || !enabled || !connected || !filesystemAvailable"
					data-testid="agent-computer-use-filesystem-toggle"
					@update:model-value="(value) => setFilesystemEnabled(Boolean(value))"
				/>
			</div>

			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.computerUse.fileWrite.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{
							capabilityDisabledReason(filesystemWriteAvailable) ||
							i18n.baseText('agents.builder.computerUse.fileWrite.hint')
						}}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="fileWriteEnabled"
					:disabled="
						props.disabled ||
						!enabled ||
						!connected ||
						!filesystemEnabled ||
						!filesystemWriteAvailable
					"
					data-testid="agent-computer-use-file-write-toggle"
					@update:model-value="(value) => setFileWriteEnabled(Boolean(value))"
				/>
			</div>

			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.computerUse.shell.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{
							capabilityDisabledReason(shellAvailable) ||
							i18n.baseText('agents.builder.computerUse.shell.hint')
						}}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="shellEnabled"
					:disabled="props.disabled || !enabled || !connected || !shellAvailable"
					data-testid="agent-computer-use-shell-toggle"
					@update:model-value="(value) => setShellEnabled(Boolean(value))"
				/>
			</div>

			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="small" :bold="true">{{
						i18n.baseText('agents.builder.computerUse.browser.label')
					}}</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{
							browserDisabledReason() || i18n.baseText('agents.builder.computerUse.browser.hint')
						}}
					</N8nText>
				</div>
				<N8nSwitch2
					:model-value="browserEnabled"
					:disabled="props.disabled || !enabled || !connected || !browserReady"
					data-testid="agent-computer-use-browser-toggle"
					@update:model-value="(value) => setBrowserEnabled(Boolean(value))"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.titleGroup,
.statusText,
.rowLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) 0;
	border-top: var(--border);
	border-bottom: var(--border);
}

.statusText {
	flex: 1;
}

.pairing {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.commandRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);
	background-color: var(--color--foreground--xlight);
}

.command {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--xs);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}
</style>
