<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nTooltip } from '@n8n/design-system';

const props = defineProps<{
	creditsRemaining?: number;
	creditsQuota?: number;
}>();

const emit = defineEmits<{
	'upgrade-click': [];
	dismiss: [];
}>();

const i18n = useI18n();

const bannerText = computed(() => {
	return i18n.baseText('aiAssistant.builder.creditBanner.text', {
		interpolate: {
			remaining: String(props.creditsRemaining ?? 0),
			total: String(props.creditsQuota ?? 0),
		},
	});
});

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
	<div :class="$style.banner" data-test-id="credit-warning-banner">
		<div :class="$style.content">
			<span :class="$style.text">{{ bannerText }}</span>
			<N8nTooltip :content="tooltipContent" placement="top" :show-after="300">
				<N8nIcon icon="info" size="small" :class="$style.infoIcon" />
			</N8nTooltip>
		</div>
		<N8nButton
			variant="outline"
			size="xsmall"
			data-test-id="credit-banner-get-more"
			@click="emit('upgrade-click')"
		>
			{{ i18n.baseText('aiAssistant.builder.creditBanner.getMore') }}
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
