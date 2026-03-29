<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const props = withDefaults(
	defineProps<{
		/** Typography and copy tuned for the discover onboarding modal only. */
		variant?: 'default' | 'onboarding';
	}>(),
	{ variant: 'default' },
);

const i18n = useI18n();
const { store } = useSettingsField();

const isOnboarding = computed(() => props.variant === 'onboarding');

const waitingLabel = computed(() =>
	isOnboarding.value
		? i18n.baseText('instanceAi.discover.localGateway.waiting')
		: i18n.baseText('instanceAi.filesystem.connectWaiting'),
);

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
	<div :class="$style.panel">
		<!-- Gateway connected (onboarding: success banner; settings: path row) -->
		<div v-if="store.isGatewayConnected && isOnboarding" :class="$style.onboardingConnectedRow">
			<span :class="$style.onboardingConnectedIconWrap" aria-hidden="true">
				<N8nIcon icon="check" :size="18" :stroke-width="4" />
			</span>
			<span :class="$style.onboardingConnectedText">
				{{ i18n.baseText('instanceAi.discover.localGateway.enabled') }}
			</span>
		</div>
		<div v-else-if="store.isGatewayConnected" :class="$style.statusRow">
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
				<N8nText :size="isOnboarding ? 'large' : 'small'" color="text-light">
					{{ waitingLabel }}
				</N8nText>
			</div>

			<!-- Setup command -->
			<div v-else :class="[$style.setupBlock, isOnboarding && $style.setupBlockOnboarding]">
				<N8nText
					:size="isOnboarding ? 'large' : 'small'"
					color="text-light"
					:class="isOnboarding ? $style.onboardingSetupIntro : undefined"
				>
					{{ i18n.baseText('instanceAi.filesystem.setupCommand') }}
				</N8nText>
				<div :class="$style.commandBlock">
					<code :class="[$style.commandText, isOnboarding && $style.commandTextOnboarding]">
						{{ displayCommand }}
					</code>
					<N8nTooltip
						:content="
							copied ? i18n.baseText('instanceAi.filesystem.copied') : i18n.baseText('generic.copy')
						"
					>
						<N8nIconButton
							:icon="copied ? 'check' : 'copy'"
							variant="ghost"
							size="mini"
							@click="copyCommand"
						/>
					</N8nTooltip>
				</div>
				<div :class="[$style.connectingRow, isOnboarding && $style.onboardingWaitingRow]">
					<span :class="$style.spinner" />
					<N8nText :size="isOnboarding ? 'large' : 'small'" color="text-light">
						{{ waitingLabel }}
					</N8nText>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.onboardingConnectedRow {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--2xs);
	background: var(--color--success);
	border-radius: var(--radius);
}

.onboardingConnectedIconWrap {
	display: inline-flex;
	flex-shrink: 0;
	opacity: 0.85;

	:deep(.n8n-icon) {
		color: #fff;
	}
}

.onboardingConnectedText {
	opacity: 0.85;
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--md);
	color: #fff;
	line-height: var(--line-height--lg);
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

.setupBlockOnboarding {
	gap: 0;
}

.onboardingSetupIntro {
	margin-bottom: 9px;
}

.onboardingWaitingRow {
	margin-top: 9px;
}

.commandTextOnboarding {
	font-size: var(--font-size--xs);
	line-height: 150%;
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
