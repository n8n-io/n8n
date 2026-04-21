<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { N8nButton, N8nHeading, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import { ElCheckbox } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { canManageInstanceAi } from '../instanceAiPermissions';
import { INSTANCE_AI_VIEW } from '../constants';

const props = defineProps<{ modalName: string }>();

const router = useRouter();
const i18n = useI18n();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const instanceAiSettingsStore = useInstanceAiSettingsStore();

const choice = ref<'enable' | 'disable' | null>(null);
const computerUseEnabled = ref(!(instanceAiSettingsStore.settings?.localGatewayDisabled ?? true));
const isEnabled = computed(() => choice.value === 'enable');
const hasChosen = computed(() => choice.value !== null);
const isSaving = ref(false);

function selectChoice(value: 'enable' | 'disable') {
	if (isSaving.value) return;
	choice.value = value;
}

function dismiss() {
	telemetry.track('AI Assistant opt-in modal dismissed', {
		choice: choice?.value,
	});
	uiStore.closeModal(props.modalName);
}

async function onConfirm() {
	if (isSaving.value) return;
	isSaving.value = true;
	try {
		instanceAiSettingsStore.setField('enabled', choice.value === 'enable');
		if (isEnabled.value) {
			instanceAiSettingsStore.setField('localGatewayDisabled', !computerUseEnabled.value);
		}
		await instanceAiSettingsStore.save();
		telemetry.track('AI Assistant opt-in modal choice confirmed', {
			choice: choice?.value,
			enabled: isEnabled?.value,
		});
		void instanceAiSettingsStore.persistOptinModalDismissed();
		dismiss();
		if (isEnabled.value) {
			void router.push({ name: INSTANCE_AI_VIEW });
		}
	} finally {
		isSaving.value = false;
	}
}

function handleComputerUseToggle() {
	computerUseEnabled.value = !computerUseEnabled.value;
}

watch(
	() => canManageInstanceAi(),
	(allowed) => {
		if (!allowed) {
			uiStore.closeModal(props.modalName);
		}
	},
);

onMounted(() => {
	if (!canManageInstanceAi()) {
		uiStore.closeModal(props.modalName);
		return;
	}
	telemetry.track('AI Assistant opt-in modal shown');
});
</script>

<template>
	<Modal
		:name="props.modalName"
		:close-on-click-modal="false"
		:close-on-press-escape="false"
		custom-class="instance-ai-welcome-modal"
		width="540"
	>
		<template #content>
			<div :class="$style.body">
				<div :class="$style.heroIcon">
					<N8nIcon icon="sparkles" :size="34" color="text-base" />
				</div>

				<N8nHeading tag="h1" size="xlarge" :class="$style.title">
					{{ i18n.baseText('instanceAi.welcomeModal.title') }}
				</N8nHeading>

				<div :class="$style.badgeWrap">
					<span :class="$style.badge">{{ i18n.baseText('instanceAi.welcomeModal.badge') }}</span>
				</div>

				<N8nText
					:class="$style.description"
					v-n8n-html="i18n.baseText('instanceAi.welcomeModal.description')"
				/>

				<div :class="$style.warningBox">
					<N8nIcon icon="triangle-alert" :size="16" :class="$style.warningIcon" />
					<N8nText
						:class="$style.warningText"
						size="small"
						v-n8n-html="i18n.baseText('instanceAi.welcomeModal.warning')"
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

				<div v-if="isEnabled" :class="$style.computerUseRow" @click="handleComputerUseToggle">
					<ElCheckbox
						:class="$style.computerUseCheckbox"
						:model-value="computerUseEnabled"
						data-test-id="instance-ai-welcome-modal-computer-use-toggle"
					/>
					<div :class="$style.computerUseLabels">
						<N8nText bold size="medium">
							{{ i18n.baseText('settings.n8nAgent.computerUse.label') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.n8nAgent.computerUse.description') }}
						</N8nText>
					</div>
				</div>

				<div :class="$style.footer">
					<N8nText size="small" color="text-light" :class="$style.disclaimer">
						{{ i18n.baseText('instanceAi.welcomeModal.disclaimer') }}
						<N8nLink
							href="https://n8n.io/legal/ai-terms/"
							target="_blank"
							theme="text"
							size="small"
							:underline="true"
							:class="$style.readMore"
							>{{ i18n.baseText('instanceAi.welcomeModal.readMore') }}</N8nLink
						>.
					</N8nText>
					<N8nButton
						variant="solid"
						size="large"
						:disabled="!hasChosen || isSaving"
						:loading="isSaving"
						:label="
							isEnabled
								? i18n.baseText('instanceAi.welcomeModal.enable')
								: i18n.baseText('instanceAi.welcomeModal.continue')
						"
						:class="$style.continueButton"
						data-test-id="instance-ai-welcome-modal-confirm"
						@click="onConfirm()"
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
	background: var(--color--orange-900);
	border: 1px solid var(--color--orange-800);
	border-radius: var(--radius--xs);
	color: var(--color--orange-250);
}

:global(body:not([data-theme='dark'])) .warningBox {
	background: var(--color--orange-50);
	border: 1px solid var(--color--orange-200);
	color: var(--color--orange-700);
}

.warningIcon {
	flex-shrink: 0;
	color: var(--color--orange-250);
	margin-top: 2px;
}

:global(body:not([data-theme='dark'])) .warningIcon {
	color: var(--color--orange-700);
}

.warningText {
	line-height: var(--line-height--xl);
	color: var(--color--orange-250);
}
:global(body:not([data-theme='dark'])) .warningText {
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

.computerUseRow {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	padding: var(--spacing--sm);
	border: 1px solid var(--border-color--strong);
	border-radius: var(--radius--xs);
	background: var(--color--foreground--tint-2);
	cursor: pointer;
	user-select: none;
}

:global(body[data-theme='dark']) .computerUseRow {
	background: rgba(255, 255, 255, 0.03);
	border-color: rgba(255, 255, 255, 0.14);
}

.computerUseCheckbox {
	flex-shrink: 0;
	margin-top: 2px;
	pointer-events: none;
}

.computerUseLabels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
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
	span {
		&:hover {
			color: var(--color--text);
		}
	}
}

.continueButton {
	min-width: 170px;
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
