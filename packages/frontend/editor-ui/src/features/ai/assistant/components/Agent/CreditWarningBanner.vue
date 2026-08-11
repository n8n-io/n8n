<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { round2 } from './creditFormatting';

const props = defineProps<{
	creditsRemaining?: number;
	creditsQuota?: number;
	// 'attached' fuses onto the chat input below (used in the assistant sidebar);
	// 'standalone' is a self-contained card that sits above a detached input.
	variant?: 'attached' | 'standalone';
	amountsHidden?: boolean;
}>();

const emit = defineEmits<{
	'upgrade-click': [];
	dismiss: [];
}>();

const i18n = useI18n();
const cloudPlanStore = useCloudPlanStore();

const bannerText = computed(() => {
	if (props.amountsHidden) {
		return i18n.baseText('aiAssistant.builder.creditBanner.limitReachedText');
	}

	const key = cloudPlanStore.userIsTrialing
		? 'aiAssistant.builder.creditBanner.trialText'
		: 'aiAssistant.builder.creditBanner.text';
	return i18n.baseText(key, {
		interpolate: {
			remaining: String(round2(props.creditsRemaining ?? 0)),
			total: String(round2(props.creditsQuota ?? 0)),
		},
	});
});

const ctaLabel = computed(() =>
	i18n.baseText(
		props.amountsHidden
			? 'aiAssistant.builder.creditBanner.upgrade'
			: 'aiAssistant.builder.creditBanner.getMore',
	),
);

const getNextMonth = () => {
	const now = new Date();
	const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
	const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
	return nextMonth.toLocaleDateString('en-US', options);
};

const tooltipContent = computed(() => {
	const date = getNextMonth();
	return i18n.baseText('aiAssistant.builder.settings.creditsTooltip', {
		interpolate: { renewalDate: date, expiryDate: date },
	});
});
</script>

<template>
	<div
		:class="[$style.banner, { [$style.standalone]: props.variant === 'standalone' }]"
		data-test-id="credit-warning-banner"
	>
		<div :class="$style.content">
			<!-- The numeric variants are a meter reading, so clipping them costs nothing. This one is
			the only signal the capped cohort gets on landing, so it wraps rather than truncates. -->
			<span :class="[$style.text, { [$style.wrapping]: props.amountsHidden }]">{{
				bannerText
			}}</span>
			<N8nTooltip
				v-if="!props.amountsHidden"
				:content="tooltipContent"
				placement="top"
				:show-after="300"
			>
				<N8nIcon
					icon="info"
					size="small"
					:class="$style.infoIcon"
					data-test-id="credit-banner-renewal-info"
				/>
			</N8nTooltip>
		</div>
		<N8nButton
			variant="outline"
			size="xsmall"
			data-test-id="credit-banner-get-more"
			@click="emit('upgrade-click')"
		>
			{{ ctaLabel }}
		</N8nButton>
		<N8nIcon
			icon="x"
			size="small"
			:class="$style.closeIcon"
			data-test-id="credit-banner-dismiss"
			@click="emit('dismiss')"
		/>
	</div>
</template>

<style lang="scss" module>
.banner {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: light-dark(var(--color--neutral-125), var(--color--neutral-850));
	border: var(--border);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	border-bottom: none;
	margin: 0 var(--spacing--2xs);
	line-height: var(--line-height--xl);
}

.standalone {
	// Full card so it reads as its own element above a detached, rounded input.
	border-radius: var(--radius--lg);
	border-bottom: var(--border);
	margin: 0;
}

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.text {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.wrapping {
	white-space: normal;
	overflow: visible;
}

.infoIcon {
	color: var(--color--text--tint-1);
	cursor: pointer;
	flex-shrink: 0;
}

.closeIcon {
	color: var(--color--text--tint-1);
	cursor: pointer;
	flex-shrink: 0;

	&:hover {
		opacity: 0.7;
	}
}
</style>
