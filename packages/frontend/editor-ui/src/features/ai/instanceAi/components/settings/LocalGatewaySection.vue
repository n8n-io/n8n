<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getBool } = useSettingsField();

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

onMounted(() => {
	if (!store.isGatewayConnected) {
		void store.fetchSetupCommand();
	}
});
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="plug" size="small" />
			{{ i18n.baseText('instanceAi.filesystem.label') }}
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{ i18n.baseText('instanceAi.filesystem.label') }}</span>
			<ElSwitch
				:model-value="!getBool('localGatewayDisabled')"
				@update:model-value="store.setField('localGatewayDisabled', !$event)"
			/>
		</div>

		<template v-if="!getBool('localGatewayDisabled')">
			<!-- Gateway connected -->
			<div v-if="store.isGatewayConnected" :class="$style.statusRow">
				<span :class="[$style.dot, $style.dotConnected]" />
				<N8nText size="small" color="text-light">
					{{ store.gatewayDirectory }}
				</N8nText>
			</div>

			<!-- Local filesystem (no gateway) -->
			<template v-else>
				<div v-if="store.isLocalGatewayEnabled" :class="$style.statusRow">
					<span :class="[$style.dot, $style.dotLocal]" />
					<N8nText size="small" color="text-light">
						{{ store.localGatewayFallbackDirectory }}
					</N8nText>
				</div>

				<!-- Daemon connecting -->
				<div v-if="store.isDaemonConnecting" :class="$style.connectingRow">
					<span :class="$style.spinner" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.filesystem.connectWaiting') }}
					</N8nText>
				</div>

				<!-- Setup command -->
				<div v-else :class="$style.setupBlock">
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
								@click="copyCommand"
							/>
						</N8nTooltip>
					</div>
					<div :class="$style.connectingRow">
						<span :class="$style.spinner" />
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('instanceAi.filesystem.connectWaiting') }}
						</N8nText>
					</div>
				</div>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dotConnected {
	background: var(--color--success);
}

.dotLocal {
	background: var(--color--warning);
}

.connectingRow {
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

.setupBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
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
</style>
