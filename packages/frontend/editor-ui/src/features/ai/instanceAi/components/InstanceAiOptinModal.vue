<script lang="ts" setup>
import { computed, ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import MacOsIcon from '../assets/os-icons/macos-icon.svg';
import WindowsIcon from '../assets/os-icons/windows-icon.svg';
import LinuxIcon from '../assets/os-icons/linux-icon.svg';

const props = defineProps<{ modalName: string }>();

const router = useRouter();
const i18n = useI18n();
const uiStore = useUIStore();
const pushConnectionStore = usePushConnectionStore();
const instanceAiSettingsStore = useInstanceAiSettingsStore();

const choice = ref<'enable' | 'disable' | null>(null);
const isEnabled = computed(() => choice.value === 'enable');
const hasChosen = computed(() => choice.value !== null);
const isSaving = ref(false);
const step = ref<'intro' | 'gateway'>('intro');
const selectedOs = ref<'mac' | 'windows' | 'linux'>('mac');

const featureItems = [
	{ key: 'instanceAi.welcomeModal.feature.build', icon: 'workflow' },
	{ key: 'instanceAi.welcomeModal.feature.debug', icon: 'flask-conical' },
	{ key: 'instanceAi.welcomeModal.feature.ask', icon: 'circle-help' },
];

const osTabs = [
	{ id: 'mac' as const, labelKey: 'instanceAi.welcomeModal.gateway.os.mac', icon: MacOsIcon },
	{
		id: 'windows' as const,
		labelKey: 'instanceAi.welcomeModal.gateway.os.windows',
		icon: WindowsIcon,
	},
	{
		id: 'linux' as const,
		labelKey: 'instanceAi.welcomeModal.gateway.os.linux',
		icon: LinuxIcon,
	},
];

const displayCommand = computed(() => instanceAiSettingsStore.setupCommand ?? 'npx @n8n/fs-proxy');
const copied = ref(false);

const terminalInstructionsKey = computed(() => {
	if (selectedOs.value === 'windows') return 'instanceAi.welcomeModal.gateway.instructions.windows';
	if (selectedOs.value === 'linux') return 'instanceAi.welcomeModal.gateway.instructions.linux';
	return 'instanceAi.welcomeModal.gateway.instructions.mac';
});

async function selectChoice(value: 'enable' | 'disable') {
	if (isSaving.value) return;
	choice.value = value;
	isSaving.value = true;
	try {
		await instanceAiSettingsStore.persistInstanceAiEnabled(value === 'enable');
	} finally {
		isSaving.value = false;
	}
}

function dismiss() {
	uiStore.closeModal(props.modalName);
}

function goToGatewayStep() {
	step.value = 'gateway';
	pushConnectionStore.pushConnect();
	void instanceAiSettingsStore.fetchSetupCommand();
	instanceAiSettingsStore.startGatewayPushListener();
}

function onGatewayStepCompleted() {
	dismiss();
	if (isEnabled.value) {
		void router.push('/instance-ai');
	}
}

function onStep1Confirm() {
	void instanceAiSettingsStore.persistOptinModalDismissed();
	if (isEnabled.value) {
		goToGatewayStep();
	} else {
		dismiss();
	}
}

async function copyCommand() {
	if (!instanceAiSettingsStore.setupCommand) return;
	try {
		await navigator.clipboard.writeText(instanceAiSettingsStore.setupCommand);
		copied.value = true;
		setTimeout(() => {
			copied.value = false;
		}, 2000);
	} catch {
		// Ignore clipboard errors
	}
}

onUnmounted(() => {
	instanceAiSettingsStore.stopGatewayPushListener();
	pushConnectionStore.pushDisconnect();
});
</script>

<template>
	<Modal
		:name="props.modalName"
		:show-close="step === 'gateway'"
		:close-on-click-modal="false"
		:close-on-press-escape="step === 'gateway'"
		custom-class="instance-ai-welcome-modal"
		width="540"
	>
		<template #content>
			<div v-if="step === 'intro'" :class="$style.body">
				<div :class="$style.heroIcon">
					<N8nIcon icon="sparkles" :size="34" />
				</div>

				<N8nHeading tag="h1" size="xlarge" :class="$style.title">
					{{ i18n.baseText('instanceAi.welcomeModal.title') }}
				</N8nHeading>

				<div :class="$style.badgeWrap">
					<span :class="$style.badge">{{ i18n.baseText('instanceAi.welcomeModal.badge') }}</span>
				</div>

				<N8nText
					:class="$style.description"
					v-html="i18n.baseText('instanceAi.welcomeModal.description')"
				/>

				<ul :class="$style.featureList">
					<li v-for="item in featureItems" :key="item.key" :class="$style.featureItem">
						<N8nIcon :icon="item.icon" :size="24" :class="$style.featureIcon" />
						<N8nText :class="$style.featureText">
							{{ i18n.baseText(item.key) }}
						</N8nText>
					</li>
				</ul>

				<div :class="$style.warningBox">
					<N8nIcon icon="exclamation-triangle" :size="16" :class="$style.warningIcon" />
					<N8nText
						:class="$style.warningText"
						size="small"
						v-html="i18n.baseText('instanceAi.welcomeModal.warning')"
					/>
				</div>

				<div :class="$style.toggleGroup">
					<div
						:class="[$style.toggleCard, choice === 'enable' && $style.toggleCardSelected]"
						role="button"
						tabindex="0"
						data-test-id="instance-ai-welcome-modal-toggle-enable"
						@click="selectChoice('enable')"
						@keydown.enter.prevent="selectChoice('enable')"
						@keydown.space.prevent="selectChoice('enable')"
					>
						<div :class="$style.toggleMain">
							<div :class="$style.radioIndicator">
								<div v-if="choice === 'enable'" :class="$style.radioIndicatorInner" />
							</div>
							<div :class="$style.toggleLabels">
								<N8nText bold size="medium">
									{{ i18n.baseText('instanceAi.welcomeModal.toggle.cardTitle') }}
								</N8nText>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('instanceAi.welcomeModal.toggle.enableCardDescription')
								}}</N8nText>
							</div>
						</div>
					</div>
					<div
						:class="[$style.toggleCard, choice === 'disable' && $style.toggleCardSelected]"
						role="button"
						tabindex="0"
						data-test-id="instance-ai-welcome-modal-toggle-disable"
						@click="selectChoice('disable')"
						@keydown.enter.prevent="selectChoice('disable')"
						@keydown.space.prevent="selectChoice('disable')"
					>
						<div :class="$style.toggleMain">
							<div :class="$style.radioIndicator">
								<div v-if="choice === 'disable'" :class="$style.radioIndicatorInner" />
							</div>
							<div :class="$style.toggleLabels">
								<N8nText bold size="medium">
									{{ i18n.baseText('instanceAi.welcomeModal.toggle.dontEnable') }}
								</N8nText>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('instanceAi.welcomeModal.toggle.disableCardDescription')
								}}</N8nText>
							</div>
						</div>
					</div>
				</div>

				<div :class="$style.footer">
					<N8nText size="small" color="text-light" :class="$style.disclaimer">
						{{ i18n.baseText('instanceAi.welcomeModal.disclaimer') }}
						<span :class="$style.readMore">{{
							i18n.baseText('instanceAi.welcomeModal.readMore')
						}}</span>
					</N8nText>
					<N8nButton
						variant="solid"
						size="large"
						:disabled="!hasChosen"
						:label="
							isEnabled
								? i18n.baseText('instanceAi.welcomeModal.enable')
								: i18n.baseText('instanceAi.welcomeModal.continue')
						"
						:class="$style.continueButton"
						data-test-id="instance-ai-welcome-modal-confirm"
						@click="onStep1Confirm()"
					/>
				</div>
			</div>

			<div v-else :class="$style.gatewayBody">
				<div :class="$style.gatewayHeader">
					<div :class="$style.gatewayHeaderLeft">
						<N8nHeading tag="h2" size="large" :class="$style.gatewayTitle">
							{{ i18n.baseText('instanceAi.welcomeModal.gateway.title') }}
						</N8nHeading>
					</div>
				</div>

				<div :class="$style.gatewayTextBlock">
					<N8nText color="text-light">
						{{ i18n.baseText('instanceAi.welcomeModal.gateway.description.1') }}
					</N8nText>
					<N8nText color="text-light">
						{{ i18n.baseText('instanceAi.welcomeModal.gateway.description.2') }}
					</N8nText>
				</div>

				<hr :class="$style.gatewayDivider" />

				<div :class="$style.osTabs">
					<button
						v-for="tab in osTabs"
						:key="tab.id"
						:class="[$style.osTab, { [$style.osTabActive]: selectedOs === tab.id }]"
						@click="selectedOs = tab.id"
					>
						<component :is="tab.icon" :class="$style.osTabIcon" />
						<span>{{ i18n.baseText(tab.labelKey) }}</span>
					</button>
				</div>

				<div :class="$style.commandCard">
					<div :class="$style.commandLabel">
						{{ i18n.baseText('instanceAi.welcomeModal.gateway.commandLabel') }}
					</div>
					<div :class="$style.commandRow">
						<code :class="$style.commandText">{{ displayCommand }}</code>
						<button :class="$style.copyButton" @click="copyCommand">
							<N8nIcon :icon="copied ? 'check' : 'copy'" :size="16" />
						</button>
					</div>
					<div v-if="instanceAiSettingsStore.isGatewayConnected" :class="$style.connectedRow">
						<N8nIcon icon="check" :size="14" />
						<span>{{ i18n.baseText('instanceAi.welcomeModal.gateway.connected') }}</span>
					</div>
					<div v-else :class="$style.waitingRow">
						<span :class="$style.spinner" />
						<span>{{ i18n.baseText('instanceAi.welcomeModal.gateway.waiting') }}</span>
					</div>
				</div>

				<N8nText color="text-light" :class="$style.gatewayInstructions">
					{{ i18n.baseText(terminalInstructionsKey) }}
				</N8nText>

				<hr :class="$style.gatewayDivider" />

				<div :class="$style.gatewayActions">
					<N8nButton
						:variant="instanceAiSettingsStore.isGatewayConnected ? 'solid' : 'outline'"
						size="large"
						:label="
							instanceAiSettingsStore.isGatewayConnected
								? i18n.baseText('instanceAi.welcomeModal.gateway.done')
								: i18n.baseText('instanceAi.welcomeModal.gateway.skip')
						"
						:class="[!instanceAiSettingsStore.isGatewayConnected && $style.skipButton]"
						@click="onGatewayStepCompleted()"
					/>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: var(--spacing--lg);
	gap: var(--spacing--sm);
}

.description {
	text-align: center;
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
	margin-top: var(--spacing--sm);
}

.heroIcon {
	display: flex;
	justify-content: center;
	color: var(--color--text);
}

:global(body:not([data-theme='dark'])) .heroIcon {
	color: var(--color--black);
}

.badge {
	display: inline-block;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-radius: var(--radius--3xs);
	background: #e9dbf8;
	color: #6b35ad;
	font-size: var(--font-size--sm);
}

.warningBox {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	background: var(--color--orange-50);
	border: 1px solid var(--color--orange-200);
	border-radius: var(--radius--xs);
	color: var(--color--orange-700);
}

.warningIcon {
	flex-shrink: 0;
	color: var(--color--orange-700);
	margin-top: 2px;
}

.warningText {
	line-height: var(--line-height--xl);
	color: var(--color--orange-700);
}

.badgeWrap {
	display: flex;
	justify-content: center;
}

.title {
	font-size: var(--font-size--2xl);
	line-height: var(--line-height--sm);
	margin: 0;
	text-align: center;
}

.featureList {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.featureItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.featureIcon {
	color: var(--color--text);
	width: var(--spacing--sm);
}

.featureText {
	flex: 1;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.toggleGroup {
	display: flex;
	flex-direction: column;
	gap: 0;

	.toggleCard:first-child {
		border-bottom: 0;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}

	.toggleCard:last-child {
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}
}

.toggleCard {
	display: block;
	padding: var(--spacing--sm);
	border: 1px solid var(--border-color--strong);
	border-radius: var(--radius--xs);
	cursor: pointer;
	background: var(--color--foreground--tint-2);
}

:global(body[data-theme='dark']) .toggleCard {
	background: rgba(255, 255, 255, 0.03);
	border-color: rgba(255, 255, 255, 0.14);
}

.toggleMain {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.radioIndicator {
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: 50%;
	border: 2px solid var(--border-color--strong);
	display: flex;
	align-items: center;
	justify-content: center;
}

.toggleCardSelected .radioIndicator {
	border: 4px solid var(--color--orange-400);
}

.radioIndicatorInner {
	width: var(--spacing--sm);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background: transparent;
}

.toggleLabels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	text-align: left;
}

.footer {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--4xs);
}

.disclaimer {
	max-width: 340px;
	line-height: 1.4;
}

.readMore {
	text-decoration: underline;
}

.continueButton {
	min-width: 170px;
}

.gatewayBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.gatewayHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.gatewayHeaderLeft {
	display: flex;
	align-items: center;
	gap: 10px;
}

.gatewayTitle {
	margin: 0;
}

.optionalBadge {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--full);
	font-size: 11px;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--color--text--tint-1);
}

.gatewayTextBlock {
	display: flex;
	flex-direction: column;
	gap: 10px;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
}

.gatewayDivider {
	border: none;
	border-top: 1px solid var(--color--foreground);
	margin: 0;
}

.osTabs {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	padding: var(--spacing--4xs);
	gap: var(--spacing--4xs);
	background: var(--border-color--subtle);
}

.osTab {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius--xs);
	padding: 10px var(--spacing--2xs);
	background: transparent;
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
	cursor: pointer;
	opacity: 0.7;
}

.osTabActive {
	background: var(--border-color--subtle);
	color: var(--color--text);
	opacity: 1;
}

.osTabIcon {
	width: var(--spacing--sm);
	height: var(--spacing--sm);
}

.commandCard {
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	overflow: hidden;
}

.commandLabel {
	padding: var(--spacing--xs) 14px;
	color: var(--color--text--tint-1);
	background: var(--color--neutral-950);
	font-size: var(--font-size--2xs);
	border-radius: var(--radius--xs) var(--radius--xs) 0 0;
}

:global(body:not([data-theme='dark'])) .commandLabel {
	background: var(--color--black-alpha-700);
	color: var(--color--text--tint-2);
}

.commandRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	padding: var(--spacing--xs) 14px;
	background: var(--color--neutral-950);
	border-top: 1px solid var(--border-color--subtle);
}

.commandText {
	color: var(--color--text--tint-1);
	white-space: nowrap;
	overflow: auto;
	&::-webkit-scrollbar {
		display: none;
	}
	-ms-overflow-style: none;
	scrollbar-width: none;
	font-size: var(--font-size--2xs);
}

.copyButton {
	border: 0;
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
	display: flex;
	align-items: center;
}

.connectedRow {
	display: flex;
	font-size: var(--font-size--2xs);
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px 14px;
	background: var(--color--green-950);
	color: var(--color--green-400);
	font-weight: var(--font-weight--bold);
}

:global(body:not([data-theme='dark'])) .connectedRow {
	background: var(--color--green-600);
	color: var(--color--green-50);
}

.waitingRow {
	display: flex;
	font-size: var(--font-size--2xs);
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px 14px;
	background: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
}

:global(body:not([data-theme='dark'])) .waitingRow {
	background: var(--color--black-alpha-700);
	color: var(--color--text--tint-2);
}

.spinner {
	width: 14px;
	height: 14px;
	border: 2px solid var(--color--background);
	border-top-color: var(--color--text--tint-1);
	border-radius: var(--radius--full);
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.gatewayInstructions {
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
}

.gatewayActions {
	display: flex;
	justify-content: flex-end;
}
</style>

<style lang="scss">
.instance-ai-welcome-modal {
	.el-dialog__header {
		display: none;
		padding: 0;
		margin: 0;
	}

	.el-dialog__body {
		padding: 0;
	}
}
</style>
