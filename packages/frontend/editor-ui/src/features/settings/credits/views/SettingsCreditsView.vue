<script setup lang="ts">
import { computed, onMounted, ref, useCssModule } from 'vue';
import { ElSwitch } from 'element-plus';
import { N8nButton, N8nHeading, N8nIcon, N8nInputNumber, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useCreditsStore } from '../credits.store';
import CreditTopUpModal from '../components/CreditTopUpModal.vue';

const $style = useCssModule();
const i18n = useI18n();
const creditsStore = useCreditsStore();

const showTopUpModal = ref(false);
const isSaving = ref(false);

interface SettingsSnapshot {
	autoRechargeEnabled: boolean;
	autoRechargeThreshold: number;
	autoRechargeTopUpTo: number;
	limitsEnabled: boolean;
	instanceLimit: number;
	perUserLimit: number;
}

const savedState = ref<SettingsSnapshot>({
	autoRechargeEnabled: false,
	autoRechargeThreshold: 0,
	autoRechargeTopUpTo: 0,
	limitsEnabled: false,
	instanceLimit: 0,
	perUserLimit: 0,
});

function takeSnapshot(): SettingsSnapshot {
	return {
		autoRechargeEnabled: creditsStore.autoRechargeEnabled,
		autoRechargeThreshold: creditsStore.autoRechargeThreshold,
		autoRechargeTopUpTo: creditsStore.autoRechargeTopUpTo,
		limitsEnabled: creditsStore.limitsEnabled,
		instanceLimit: creditsStore.instanceLimit,
		perUserLimit: creditsStore.perUserLimit,
	};
}

onMounted(() => {
	savedState.value = takeSnapshot();
});

const isDirty = computed(() => {
	const current = takeSnapshot();
	return (
		current.autoRechargeEnabled !== savedState.value.autoRechargeEnabled ||
		current.autoRechargeThreshold !== savedState.value.autoRechargeThreshold ||
		current.autoRechargeTopUpTo !== savedState.value.autoRechargeTopUpTo ||
		current.limitsEnabled !== savedState.value.limitsEnabled ||
		current.instanceLimit !== savedState.value.instanceLimit ||
		current.perUserLimit !== savedState.value.perUserLimit
	);
});

function onAutoRechargeToggle(value: string | number | boolean) {
	creditsStore.setAutoRecharge(typeof value === 'boolean' ? value : Boolean(value));
}

function onLimitsToggle(value: string | number | boolean) {
	creditsStore.setLimitsEnabled(typeof value === 'boolean' ? value : Boolean(value));
}

async function handleSave() {
	isSaving.value = true;
	// Stubbed — would persist to backend here
	await new Promise((resolve) => setTimeout(resolve, 400));
	savedState.value = takeSnapshot();
	isSaving.value = false;
}
</script>

<template>
	<div class="pb-3xl" :class="$style.page">
		<div class="mb-xl" :class="$style.headerRow">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.credits.title') }}
				</N8nHeading>
				<N8nText color="text-base" size="medium">
					{{ i18n.baseText('settings.credits.description') }}
				</N8nText>
			</div>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.credits.save')"
				:disabled="!isDirty"
				:loading="isSaving"
				data-test-id="credits-save-button"
				@click="handleSave"
			/>
		</div>

		<!-- Balance Section -->
		<div :class="$style.balanceCard">
			<div :class="$style.balanceContent">
				<div :class="$style.balanceAmount">
					<N8nIcon icon="hand-coins" :size="24" />
					<N8nHeading tag="h2" size="2xlarge">{{ creditsStore.formattedBalance }}</N8nHeading>
				</div>
				<N8nText color="text-light" size="small">
					{{
						i18n.baseText('settings.credits.balance.nextTopUp', {
							interpolate: {
								date: creditsStore.nextTopUpDate,
								plan: creditsStore.planName,
								amount: `$${creditsStore.planAmount}`,
							},
						})
					}}
				</N8nText>
			</div>
			<N8nButton
				variant="solid"
				:label="i18n.baseText('settings.credits.balance.topUp')"
				@click="showTopUpModal = true"
			/>
		</div>

		<!-- Auto Recharge Section -->
		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nHeading tag="h3" size="medium">{{
						i18n.baseText('settings.credits.autoRecharge')
					}}</N8nHeading>
					<N8nText size="small" color="text-light"
						>Automatically top up your credits when balance is low.</N8nText
					>
				</div>
				<div :class="$style.settingsContainerAction">
					<ElSwitch
						:model-value="creditsStore.autoRechargeEnabled"
						size="large"
						data-test-id="credits-auto-recharge-toggle"
						@update:model-value="onAutoRechargeToggle"
					/>
				</div>
			</div>

			<div v-if="creditsStore.autoRechargeEnabled" :class="$style.settingsExpandedRow">
				<div :class="$style.fieldRow">
					<N8nText size="small">{{
						i18n.baseText('settings.credits.autoRecharge.threshold')
					}}</N8nText>
					<div :class="$style.inputWithPrefix">
						<span :class="$style.inputPrefix">$</span>
						<N8nInputNumber
							:model-value="creditsStore.autoRechargeThreshold"
							:min="0"
							:step="1"
							:controls="false"
							size="small"
							data-test-id="credits-auto-recharge-threshold"
							@update:model-value="
								creditsStore.updateAutoRechargeSettings({ threshold: $event ?? 0 })
							"
						/>
					</div>
				</div>
				<div :class="$style.fieldRow">
					<N8nText size="small">{{
						i18n.baseText('settings.credits.autoRecharge.topUpTo')
					}}</N8nText>
					<div :class="$style.inputWithPrefix">
						<span :class="$style.inputPrefix">$</span>
						<N8nInputNumber
							:model-value="creditsStore.autoRechargeTopUpTo"
							:min="0"
							:step="10"
							:controls="false"
							size="small"
							data-test-id="credits-auto-recharge-topup"
							@update:model-value="
								creditsStore.updateAutoRechargeSettings({ topUpTo: $event ?? 0 })
							"
						/>
					</div>
				</div>
				<div :class="$style.fieldRow">
					<N8nText size="small">{{
						i18n.baseText('settings.credits.autoRecharge.paymentMethod')
					}}</N8nText>
					<N8nButton
						variant="subtle"
						size="small"
						:label="i18n.baseText('settings.credits.autoRecharge.paymentMethod.add')"
					/>
				</div>
			</div>
		</div>

		<!-- Limits Section -->
		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nHeading tag="h3" size="medium">{{
						i18n.baseText('settings.credits.limits')
					}}</N8nHeading>
					<N8nText size="small" color="text-light"
						>Set spending limits per month for the entire instance and per user.</N8nText
					>
				</div>
				<div :class="$style.settingsContainerAction">
					<ElSwitch
						:model-value="creditsStore.limitsEnabled"
						size="large"
						data-test-id="credits-limits-toggle"
						@update:model-value="onLimitsToggle"
					/>
				</div>
			</div>

			<div v-if="creditsStore.limitsEnabled" :class="$style.settingsExpandedRow">
				<div :class="$style.fieldRow">
					<N8nText size="small">{{ i18n.baseText('settings.credits.limits.instance') }}</N8nText>
					<div :class="$style.inputWithSuffix">
						<div :class="$style.inputWithPrefix">
							<span :class="$style.inputPrefix">$</span>
							<N8nInputNumber
								:model-value="creditsStore.instanceLimit"
								:min="0"
								:step="10"
								:controls="false"
								size="small"
								data-test-id="credits-instance-limit"
								@update:model-value="creditsStore.updateLimits({ instanceLimit: $event ?? 0 })"
							/>
						</div>
						<N8nText size="small" color="text-light">{{
							i18n.baseText('settings.credits.limits.perMonth')
						}}</N8nText>
					</div>
				</div>
				<div :class="$style.fieldRow">
					<N8nText size="small">{{ i18n.baseText('settings.credits.limits.perUser') }}</N8nText>
					<div :class="$style.inputWithSuffix">
						<div :class="$style.inputWithPrefix">
							<span :class="$style.inputPrefix">$</span>
							<N8nInputNumber
								:model-value="creditsStore.perUserLimit"
								:min="0"
								:step="5"
								:controls="false"
								size="small"
								data-test-id="credits-per-user-limit"
								@update:model-value="creditsStore.updateLimits({ perUserLimit: $event ?? 0 })"
							/>
						</div>
						<N8nText size="small" color="text-light">{{
							i18n.baseText('settings.credits.limits.perMonth')
						}}</N8nText>
					</div>
				</div>
			</div>
		</div>

		<CreditTopUpModal v-model:open="showTopUpModal" />
	</div>
</template>

<style lang="scss" module>
.page {
	max-width: 640px;
}

.headerRow {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.balanceCard {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--md) var(--spacing--lg);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--lg);
}

.balanceContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.balanceAmount {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--lg);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--2xs) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--md) var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.settingsExpandedRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}

.fieldRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.inputWithPrefix {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.inputPrefix {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.inputWithSuffix {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
