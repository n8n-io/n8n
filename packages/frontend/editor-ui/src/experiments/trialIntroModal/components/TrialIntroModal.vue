<script setup lang="ts">
import Modal from '@/app/components/Modal.vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import {
	TRIAL_INTRO_MODAL_KEY,
	TRIAL_INTRO_UPGRADE_SOURCE,
} from '@/experiments/trialIntroModal/constants';
import { useTrialIntroModalStore } from '@/experiments/trialIntroModal/stores/trialIntroModal.store';
import { useTrialCountdown } from '@/experiments/trialIntroModal/useTrialCountdown';
import { N8nBadge, N8nButton, N8nCallout, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { createEventBus } from '@n8n/utils/event-bus';
import { computed, onMounted, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';

const props = defineProps<{
	modalName?: string;
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const cloudPlanStore = useCloudPlanStore();
const trialIntroModalStore = useTrialIntroModalStore();
const { countdownText } = useTrialCountdown();
const modalBus = createEventBus();

const modalName = computed(() => props.modalName ?? TRIAL_INTRO_MODAL_KEY);

const step = ref<1 | 2>(1);
const period = ref<'annual' | 'monthly'>('annual');

watch(step, (value) => trialIntroModalStore.trackModalViewed(value));

onMounted(() => {
	trialIntroModalStore.trackModalViewed(1);
});

const aiCredits = computed(
	() => cloudPlanStore.currentPlanData?.licenseFeatures?.['quota:instanceAiCredits'],
);
const executionsLimit = computed(() => cloudPlanStore.currentPlanData?.monthlyExecutionsLimit);
const trialDays = computed(() => cloudPlanStore.currentPlanData?.metadata?.trial?.length);
const starterOffer = computed(() => trialIntroModalStore.starterOffer);
const starterPrices = computed(() => starterOffer.value?.prices);

const savingsLabel = computed(() =>
	starterPrices.value
		? i18n.baseText('experiments.trialIntroModal.step2.save', {
				interpolate: { pct: String(starterPrices.value.discountPct) },
			})
		: i18n.baseText('experiments.trialIntroModal.step2.saveFallback'),
);

function formatPrice(amount: number) {
	const currency = trialIntroModalStore.offerCurrency;
	if (!currency) {
		return String(amount);
	}
	return currency.position === 'suffix'
		? `${amount}${currency.symbol}`
		: `${currency.symbol}${amount}`;
}

function onStartBuilding() {
	uiStore.closeModal(modalName.value);
}

async function onUpgradeClick() {
	telemetry.track('User clicked upgrade CTA', {
		source: TRIAL_INTRO_UPGRADE_SOURCE,
		isTrial: cloudPlanStore.userIsTrialing,
		deploymentType: settingsStore.deploymentType,
		trialDaysLeft: cloudPlanStore.trialDaysLeft,
		executionsLeft: cloudPlanStore.usageLeft.executionsLeft,
		workflowsLeft: cloudPlanStore.usageLeft.workflowsLeft,
	});
	const link = await cloudPlanStore.generateCloudDashboardAutoLoginLink({
		redirectionPath: trialIntroModalStore.buildUpgradeReturnPath(period.value),
	});
	location.href = link;
}
</script>

<template>
	<Modal
		:name="modalName"
		width="560px"
		:center="false"
		:event-bus="modalBus"
		:close-on-click-modal="true"
		:close-on-press-escape="true"
	>
		<template #content>
			<div v-if="step === 1" :class="$style.content" data-test-id="trial-intro-step-1">
				<div v-if="countdownText" :class="$style.topRow">
					<span :class="$style.countdownPill" data-test-id="trial-intro-countdown-pill">
						<N8nIcon icon="clock" size="xsmall" :class="$style.pillIcon" />
						{{
							i18n.baseText('experiments.trialIntroModal.endsIn', {
								interpolate: { time: countdownText },
							})
						}}
					</span>
				</div>
				<N8nText tag="p" size="xsmall" :bold="true" color="text-light" :class="$style.eyebrow">
					{{ i18n.baseText('experiments.trialIntroModal.eyebrow') }}
				</N8nText>
				<N8nHeading tag="h1" size="2xlarge" :bold="true" :class="$style.title">
					<I18nT keypath="experiments.trialIntroModal.title" tag="span" scope="global">
						<template #highlight>
							<span :class="$style.titleHighlight">{{
								i18n.baseText('experiments.trialIntroModal.titleHighlight')
							}}</span>
						</template>
					</I18nT>
				</N8nHeading>
				<N8nText tag="p" size="small" color="text-base" :class="$style.subtitle">
					{{ i18n.baseText('experiments.trialIntroModal.subtitle') }}
				</N8nText>
				<div :class="$style.statCards">
					<div
						v-if="aiCredits !== undefined"
						:class="$style.statCard"
						data-test-id="trial-intro-stat-ai-credits"
					>
						<N8nIcon icon="sparkles" :size="22" :class="$style.statIcon" />
						<N8nHeading tag="div" size="large" :bold="true">{{
							aiCredits.toLocaleString()
						}}</N8nHeading>
						<N8nText tag="div" size="xsmall" color="text-base">
							{{ i18n.baseText('experiments.trialIntroModal.stats.aiCredits') }}
						</N8nText>
					</div>
					<div
						v-if="executionsLimit !== undefined"
						:class="$style.statCard"
						data-test-id="trial-intro-stat-executions"
					>
						<N8nIcon icon="refresh-cw" :size="22" :class="$style.statIcon" />
						<N8nHeading tag="div" size="large" :bold="true">{{
							executionsLimit.toLocaleString()
						}}</N8nHeading>
						<N8nText tag="div" size="xsmall" color="text-base">
							{{ i18n.baseText('experiments.trialIntroModal.stats.executions') }}
						</N8nText>
					</div>
					<div
						v-if="trialDays !== undefined"
						:class="$style.statCard"
						data-test-id="trial-intro-stat-days"
					>
						<N8nIcon icon="calendar" :size="22" :class="$style.statIcon" />
						<N8nHeading tag="div" size="large" :bold="true">{{
							trialDays.toLocaleString()
						}}</N8nHeading>
						<N8nText tag="div" size="xsmall" color="text-base">
							{{ i18n.baseText('experiments.trialIntroModal.stats.days') }}
						</N8nText>
					</div>
				</div>
				<N8nCallout theme="warning">
					<span :class="$style.calloutTitle">
						{{ i18n.baseText('experiments.trialIntroModal.callout.title') }}
					</span>
					<span :class="$style.calloutBody">
						{{ i18n.baseText('experiments.trialIntroModal.callout.body') }}
					</span>
				</N8nCallout>
			</div>
			<div v-else :class="$style.content" data-test-id="trial-intro-step-2">
				<button
					type="button"
					:class="$style.backButton"
					data-test-id="trial-intro-back-button"
					@click="step = 1"
				>
					<N8nIcon icon="chevron-left" size="small" />
					{{ i18n.baseText('experiments.trialIntroModal.step2.back') }}
				</button>
				<N8nHeading tag="h1" size="xlarge" :bold="true">
					{{ i18n.baseText('experiments.trialIntroModal.step2.title') }}
				</N8nHeading>
				<N8nText tag="p" size="small" color="text-base" :class="$style.subtitle">
					{{ i18n.baseText('experiments.trialIntroModal.step2.subtitle') }}
				</N8nText>
				<div v-if="starterOffer" :class="$style.comparisonRows">
					<div
						v-if="executionsLimit !== undefined"
						:class="$style.comparisonRow"
						data-test-id="trial-intro-row-executions"
					>
						<N8nIcon icon="refresh-cw" size="small" :class="$style.rowIcon" />
						<span :class="$style.rowLabel">
							{{ i18n.baseText('experiments.trialIntroModal.step2.executions') }}
						</span>
						<span :class="$style.rowOldValue">{{ executionsLimit.toLocaleString() }}</span>
						<N8nIcon icon="arrow-right" size="xsmall" :class="$style.rowArrow" />
						<span :class="$style.rowNewValue">
							{{ starterOffer.quotas.monthlyExecutionsLimit.toLocaleString() }}
							<span :class="$style.rowPerMonth">
								{{ i18n.baseText('experiments.trialIntroModal.step2.perMonth') }}
							</span>
						</span>
					</div>
					<div
						v-if="aiCredits !== undefined"
						:class="$style.comparisonRow"
						data-test-id="trial-intro-row-ai-credits"
					>
						<N8nIcon icon="sparkles" size="small" :class="$style.rowIcon" />
						<span :class="$style.rowLabel">
							{{ i18n.baseText('experiments.trialIntroModal.step2.aiCredits') }}
						</span>
						<span :class="$style.rowOldValue">{{ aiCredits.toLocaleString() }}</span>
						<N8nIcon icon="arrow-right" size="xsmall" :class="$style.rowArrow" />
						<span :class="$style.rowNewValue">
							{{ starterOffer.quotas.instanceAiCredits.toLocaleString() }}
							<span :class="$style.rowPerMonth">
								{{ i18n.baseText('experiments.trialIntroModal.step2.perMonth') }}
							</span>
						</span>
					</div>
				</div>
				<div :class="$style.periodCards" role="radiogroup">
					<div
						role="radio"
						tabindex="0"
						:aria-checked="period === 'annual'"
						:class="[$style.periodCard, period === 'annual' ? $style.periodCardSelected : '']"
						data-test-id="trial-intro-period-annual"
						@click="period = 'annual'"
						@keydown.enter="period = 'annual'"
						@keydown.space.prevent="period = 'annual'"
					>
						<span :class="$style.radioDot" />
						<N8nText size="medium" :bold="true">
							{{ i18n.baseText('experiments.trialIntroModal.step2.annual') }}
						</N8nText>
						<N8nBadge theme="success" data-test-id="trial-intro-save-badge">
							{{ savingsLabel }}
						</N8nBadge>
						<div
							v-if="starterPrices"
							:class="$style.priceBlock"
							data-test-id="trial-intro-price-annual"
						>
							<N8nText size="large" :bold="true">
								{{ formatPrice(starterPrices.yearlyPerMonth) }}
							</N8nText>
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText('experiments.trialIntroModal.step2.perMonth') }}
							</N8nText>
							<N8nText tag="div" size="xsmall" color="text-light">
								{{ i18n.baseText('experiments.trialIntroModal.step2.billedAnnually') }}
							</N8nText>
						</div>
					</div>
					<div
						role="radio"
						tabindex="0"
						:aria-checked="period === 'monthly'"
						:class="[$style.periodCard, period === 'monthly' ? $style.periodCardSelected : '']"
						data-test-id="trial-intro-period-monthly"
						@click="period = 'monthly'"
						@keydown.enter="period = 'monthly'"
						@keydown.space.prevent="period = 'monthly'"
					>
						<span :class="$style.radioDot" />
						<N8nText size="medium" :bold="true">
							{{ i18n.baseText('experiments.trialIntroModal.step2.monthly') }}
						</N8nText>
						<div
							v-if="starterPrices"
							:class="$style.priceBlock"
							data-test-id="trial-intro-price-monthly"
						>
							<N8nText size="large" :bold="true">{{ formatPrice(starterPrices.monthly) }}</N8nText>
							<N8nText size="xsmall" color="text-light">
								{{ i18n.baseText('experiments.trialIntroModal.step2.perMonth') }}
							</N8nText>
						</div>
					</div>
				</div>
			</div>
		</template>
		<template #footer>
			<div v-if="step === 1" :class="$style.footer">
				<N8nButton
					variant="subtle"
					data-test-id="trial-intro-start-building-button"
					@click="onStartBuilding"
				>
					{{ i18n.baseText('experiments.trialIntroModal.startBuilding') }}
				</N8nButton>
				<N8nButton data-test-id="trial-intro-upgrade-now-button" @click="step = 2">
					{{ i18n.baseText('experiments.trialIntroModal.upgradeNow') }}
				</N8nButton>
			</div>
			<N8nButton
				v-else
				:class="$style.ctaButton"
				data-test-id="trial-intro-upgrade-cta"
				@click="onUpgradeClick"
			>
				{{ i18n.baseText('experiments.trialIntroModal.step2.cta') }}
			</N8nButton>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
}

.topRow {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--sm);
}

.countdownPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	font-variant-numeric: tabular-nums;
}

.pillIcon {
	color: var(--icon-color);
}

.eyebrow {
	margin-bottom: var(--spacing--4xs);
}

.title {
	letter-spacing: var(--letter-spacing--tight);
}

.titleHighlight {
	color: var(--color--primary);
}

.subtitle {
	margin-top: var(--spacing--4xs);
	margin-bottom: var(--spacing--md);
}

.statCards {
	display: flex;
	margin-bottom: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.statCard {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--md) var(--spacing--xs);
	text-align: center;

	& + & {
		border-left: var(--border);
	}
}

.statIcon {
	color: var(--text-color--subtle);
}

.calloutTitle {
	display: block;
	font-weight: var(--font-weight--bold);
}

.calloutBody {
	display: block;
}

.backButton {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--sm);
	padding: 0;
	border: none;
	background: none;
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	cursor: pointer;

	&:hover {
		color: var(--text-color);
	}
}

.comparisonRows {
	margin-bottom: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.comparisonRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	font-size: var(--font-size--sm);
	color: var(--text-color);

	& + & {
		border-top: var(--border);
	}
}

.rowIcon {
	color: var(--icon-color);
}

.rowLabel {
	flex: 1;
}

.rowOldValue {
	color: var(--text-color--subtler);
	text-decoration: line-through;
	font-variant-numeric: tabular-nums;
}

.rowArrow {
	color: var(--icon-color--subtle);
}

.rowNewValue {
	color: var(--text-color--success);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
}

.rowPerMonth {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
}

.periodCards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.periodCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
	cursor: pointer;
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		border-color: var(--border-color--strong);
	}
}

.periodCardSelected {
	border-color: var(--color--primary);
	box-shadow: inset 0 0 0 var(--border-width, 1px) var(--color--primary);
	background: var(--color--orange-alpha-100);

	&:hover {
		border-color: var(--color--primary);
	}

	.radioDot {
		border-color: var(--color--primary);

		&::after {
			content: '';
			position: absolute;
			inset: var(--spacing--5xs);
			border-radius: var(--radius--full);
			background: var(--color--primary);
		}
	}
}

.radioDot {
	position: relative;
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--border-color--strong);
	border-radius: var(--radius--full);
}

.priceBlock {
	margin-left: auto;
	text-align: right;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.ctaButton {
	width: 100%;
}
</style>
