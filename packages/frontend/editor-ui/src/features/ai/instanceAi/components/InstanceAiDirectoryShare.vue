<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { N8nIcon, N8nIconButton, N8nSwitch2, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';

const store = useInstanceAiStore();
const i18n = useI18n();

const copied = ref(false);
const displayCommand = computed(() => store.setupCommand ?? 'npx @n8n/fs-proxy');

async function copyCommand() {
	if (!store.setupCommand) return;
	await navigator.clipboard.writeText(store.setupCommand);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2000);
}

onMounted(async () => {
	await store.refreshModuleSettings();
	store.startDaemonProbing();
	store.startGatewayPushListener();
	store.pollGatewayStatus();
	if (!store.isGatewayConnected) {
		void store.fetchSetupCommand();
	}
});

onUnmounted(() => {
	store.stopDaemonProbing();
	store.stopGatewayPolling();
	store.stopGatewayPushListener();
});
</script>

<template>
	<!-- 1. Connected or disabled — show toggle switch -->
	<div
		v-if="store.isGatewayConnected || store.isLocalFilesystemEnabled || store.isFilesystemDisabled"
		:class="$style.container"
	>
		<div :class="$style.connected">
			<N8nIcon icon="folder-open" :class="$style.folderIcon" />
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('instanceAi.filesystem.label') }}
				<span
					v-if="store.activeDirectory && !store.isFilesystemDisabled"
					:class="$style.directoryPath"
				>
					({{ store.activeDirectory }})
				</span>
			</N8nText>
			<N8nSwitch2
				:default-value="!store.isFilesystemDisabled"
				size="small"
				data-test-id="instance-ai-toggle-filesystem"
				@update:model-value="store.toggleFilesystem()"
			/>
		</div>
	</div>

	<!-- 2. Auto-connecting (daemon found, connecting in progress) -->
	<div v-else-if="store.isDaemonConnecting" :class="$style.container">
		<div :class="$style.connecting">
			<span :class="$style.spinner" />
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('instanceAi.filesystem.connectWaiting') }}
			</N8nText>
		</div>
	</div>

	<!-- 3. Setup needed (no FS, no daemon) -->
	<div v-else :class="$style.container">
		<div :class="$style.panel">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('instanceAi.filesystem.setupCommand') }}
			</N8nText>
			<div :class="$style.commandBlock">
				<code :class="$style.commandText">{{ displayCommand }}</code>
				<N8nTooltip :content="copied ? i18n.baseText('instanceAi.filesystem.copied') : 'Copy'">
					<N8nIconButton
						:icon="copied ? 'check' : 'copy'"
						variant="ghost"
						size="mini"
						data-test-id="instance-ai-copy-command"
						@click="copyCommand"
					/>
				</N8nTooltip>
			</div>
			<div :class="$style.waitingIndicator">
				<span :class="$style.spinner" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.filesystem.connectWaiting') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
}

.connected {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.folderIcon {
	font-size: var(--font-size--2xs);
}

.directoryPath {
	opacity: 0.7;
}

.connecting {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.spinner {
	width: 14px;
	height: 14px;
	border: 2px solid var(--color--foreground);
	border-top-color: var(--color--primary);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
	min-width: 280px;
}

.commandBlock {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--color--background);
	border-radius: var(--radius);
	border: var(--border);
}

.commandText {
	flex: 1;
	font-size: var(--font-size--3xs);
	font-family: monospace;
	word-break: break-all;
	color: var(--color--text);
}

.waitingIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
