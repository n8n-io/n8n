<script lang="ts" setup>
import BaseBanner from './BaseBanner.vue';
import { i18n as locale } from '@n8n/i18n';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { CloudPlanAndUsageData } from '@/Interface';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { N8nButton, N8nText, type IconName, type ButtonVariant } from '@n8n/design-system';

const LEGACY_STYLE_TO_VARIANT: Record<string, ButtonVariant> = {
	success: 'solid',
	primary: 'solid',
	secondary: 'subtle',
	tertiary: 'ghost',
	danger: 'destructive',
};

// CSS variable overrides to replicate the legacy button type colors.
// These match the old V1 Button styles (success, warning, danger, primary)
// and can be removed once the backend migrates from style to variant.
const LEGACY_STYLE_TO_CSS_VARS: Record<string, Record<string, string>> = {
	success: {
		'--button--color--background': 'var(--color--success)',
		'--button--color--background-hover': 'var(--color--success--shade-1)',
		'--button--color--background-active': 'var(--color--success--shade-1)',
		'--button--color': 'var(--color--neutral-white)',
		'--button--shadow': '0 0 0 1px var(--color--success)',
		'--button--shadow--hover': '0 0 0 1px var(--color--success--shade-1)',
		'--button--shadow--active': '0 0 0 1px var(--color--success--shade-1)',
		'--button--border-color': 'var(--color--success)',
		'--button--border-color--hover': 'var(--color--success--shade-1)',
		'--button--border-color--active': 'var(--color--success--shade-1)',
	},
	warning: {
		'--button--color--background': 'var(--color--warning)',
		'--button--color--background-hover': 'var(--color--warning--shade-1)',
		'--button--color--background-active': 'var(--color--warning--shade-1)',
		'--button--color': 'var(--color--neutral-white)',
		'--button--shadow': '0 0 0 1px var(--color--warning)',
		'--button--shadow--hover': '0 0 0 1px var(--color--warning--shade-1)',
		'--button--shadow--active': '0 0 0 1px var(--color--warning--shade-1)',
		'--button--border-color': 'var(--color--warning)',
		'--button--border-color--hover': 'var(--color--warning--shade-1)',
		'--button--border-color--active': 'var(--color--warning--shade-1)',
	},
	danger: {
		'--button--color--background': 'var(--color--danger)',
		'--button--color--background-hover': 'var(--color--danger--shade-1)',
		'--button--color--background-active': 'var(--color--danger--shade-1)',
		'--button--color': 'var(--color--neutral-white)',
		'--button--shadow': '0 0 0 1px var(--color--danger)',
		'--button--shadow--hover': '0 0 0 1px var(--color--danger--shade-1)',
		'--button--shadow--active': '0 0 0 1px var(--color--danger--shade-1)',
		'--button--border-color': 'var(--color--danger)',
		'--button--border-color--hover': 'var(--color--danger--shade-1)',
		'--button--border-color--active': 'var(--color--danger--shade-1)',
	},
	primary: {
		'--button--color--background': 'var(--color--primary)',
		'--button--color--background-hover': 'var(--color--primary--shade-1)',
		'--button--color--background-active': 'var(--color--primary--shade-1)',
		'--button--color': 'var(--color--neutral-white)',
		'--button--shadow': '0 0 0 1px var(--color--primary)',
		'--button--shadow--hover': '0 0 0 1px var(--color--primary--shade-1)',
		'--button--shadow--active': '0 0 0 1px var(--color--primary--shade-1)',
		'--button--border-color': 'var(--color--primary)',
		'--button--border-color--hover': 'var(--color--primary--shade-1)',
		'--button--border-color--active': 'var(--color--primary--shade-1)',
	},
};

const PROGRESS_BAR_MINIMUM_THRESHOLD = 8;

const cloudPlanStore = useCloudPlanStore();
const pageRedirectionHelper = usePageRedirectionHelper();
const router = useRouter();

// Banner config from backend
const bannerTimeLeft = computed(() => cloudPlanStore.bannerTimeLeft);
const showExecutions = computed(() => cloudPlanStore.showExecutions);
const bannerCta = computed(() => ({
	text: cloudPlanStore.bannerCta.text,
	icon: cloudPlanStore.bannerCta.icon as IconName | undefined,
	size: cloudPlanStore.bannerCta.size as 'small' | 'medium',
	style: cloudPlanStore.bannerCta.style,
	variant: cloudPlanStore.bannerCta.variant as ButtonVariant | undefined,
	href: cloudPlanStore.bannerCta.href,
}));
const bannerIcon = computed(() => cloudPlanStore.bannerIcon as IconName | undefined);

// If backend sends variant, use it directly. Otherwise, map legacy style to variant.
const ctaVariant = computed((): ButtonVariant => {
	if (bannerCta.value.variant) return bannerCta.value.variant;
	return LEGACY_STYLE_TO_VARIANT[bannerCta.value.style] ?? 'solid';
});

// Only apply CSS variable overrides when using legacy style (no variant from backend)
const ctaStyleOverrides = computed((): Record<string, string> | undefined => {
	if (bannerCta.value.variant) return undefined;
	return LEGACY_STYLE_TO_CSS_VARS[bannerCta.value.style];
});

const storeTrialTimeLeft = computed(() => cloudPlanStore.trialTimeLeft);

const messageText = computed(() => {
	// Use backend text if provided, otherwise compute from expirationDate
	if (bannerTimeLeft.value.text) {
		return bannerTimeLeft.value.text;
	}

	const { count, unit } = storeTrialTimeLeft.value;

	return locale.baseText(`banners.trial.message.${unit}`, {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
});

const cloudPlanData = computed<CloudPlanAndUsageData | null>(() => {
	const planData = cloudPlanStore.currentPlanData;
	const usage = cloudPlanStore.currentUsageData;
	if (!planData || !usage) return null;
	return {
		...planData,
		usage,
	};
});

const trialHasExecutionsLeft = computed(() => {
	if (!cloudPlanData.value?.usage) return 0;
	return cloudPlanData.value.usage.executions < cloudPlanData.value.monthlyExecutionsLimit;
});

const currentExecutionsWithThreshold = computed(() => {
	if (!cloudPlanData.value?.usage) return 0;
	const usedExecutions = cloudPlanData.value.usage.executions;
	const executionsQuota = cloudPlanData.value.monthlyExecutionsLimit;
	const threshold = (PROGRESS_BAR_MINIMUM_THRESHOLD * executionsQuota) / 100;
	return usedExecutions < threshold ? threshold : usedExecutions;
});

const maxExecutions = computed(() => {
	if (!cloudPlanData.value?.monthlyExecutionsLimit) return 0;
	return cloudPlanData.value.monthlyExecutionsLimit;
});

const currentExecutions = computed(() => {
	if (!cloudPlanData.value?.usage) return 0;
	const usedExecutions = cloudPlanData.value.usage.executions;
	const executionsQuota = cloudPlanData.value.monthlyExecutionsLimit;
	return usedExecutions > executionsQuota ? executionsQuota : usedExecutions;
});

function onCtaClick() {
	if (bannerCta.value.href) {
		// Use provided href - external URLs open in new tab, internal routes use router
		if (bannerCta.value.href.startsWith('http')) {
			window.open(bannerCta.value.href, '_blank');
		} else {
			void router.push(bannerCta.value.href);
		}
	} else {
		// No href provided - use upgrade flow
		void pageRedirectionHelper.goToUpgrade('canvas-nav', 'upgrade-canvas-nav', 'redirect');
	}
}
</script>

<template>
	<BaseBanner
		name="TRIAL"
		theme="custom"
		:dismissible="cloudPlanStore.bannerDismissible"
		dismiss-permanently
		:custom-icon="bannerIcon"
	>
		<template #mainContent>
			<div :class="$style.content">
				<span v-if="bannerTimeLeft.show">{{ messageText }}</span>
				<div v-if="showExecutions" :class="$style.usageCounter">
					<div :class="$style.progressBarDiv">
						<progress
							:class="[
								trialHasExecutionsLeft ? $style.progressBarSuccess : $style.progressBarDanger,
								$style.progressBar,
							]"
							:value="currentExecutionsWithThreshold"
							:max="maxExecutions"
						></progress>
					</div>
					<div :class="$style.executionsCountSection">
						<N8nText size="xsmall" :color="trialHasExecutionsLeft ? 'text-dark' : 'danger'">
							{{ currentExecutions }}/{{ maxExecutions }} </N8nText
						>&nbsp;<N8nText
							size="xsmall"
							:color="trialHasExecutionsLeft ? 'text-dark' : 'danger'"
							>{{ locale.baseText('executionUsage.label.executions') }}</N8nText
						>
					</div>
				</div>
			</div>
		</template>
		<template #trailingContent>
			<div :class="$style.trailingContentWrapper">
				<N8nButton
					:variant="ctaVariant"
					:style="ctaStyleOverrides"
					:icon="bannerCta.icon"
					:size="bannerCta.size"
					@click="onCtaClick"
				>
					{{ bannerCta.text }}
				</N8nButton>
			</div>
		</template>
	</BaseBanner>
</template>

<style module lang="scss">
.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.progressBarDiv {
	display: flex;
	align-items: center;
}

.progressBar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color--foreground);
}
.progressBar::-webkit-progress-bar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color--foreground);
}
.progressBar::-moz-progress-bar {
	width: 62.4px;
	border: 0;
	height: 5px;
	border-radius: 20px;
	background-color: var(--color--foreground);
}

.progressBarSuccess::-moz-progress-bar {
	background: var(--color--foreground--shade-2);
	border-radius: 20px;
}

.progressBarSuccess::-webkit-progress-value {
	background: var(--color--foreground--shade-2);
	border-radius: 20px;
}

.progressBarDanger::-webkit-progress-value {
	background: var(--color--danger);
	border-radius: 20px;
}

.progressBarDanger::-moz-progress-bar {
	background: var(--color--danger);
}

.usageText {
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--sm);
	margin-top: var(--spacing--xs);
	line-height: var(--spacing--xs);
}

.usageCounter {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	font-size: var(--font-size--3xs);
}

.danger {
	color: var(--color--danger);
}

.executionsCountSection {
	margin-left: var(--spacing--xs);
}

.trailingContentWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
