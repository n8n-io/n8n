<template>
	<div>
		<n8n-heading size="2xlarge">{{ $locale.baseText('settings.usageAndPlan.title') }}</n8n-heading>
		<div :class="[$style.spacedFlex, $style.title]">
			<n8n-heading size="large">
				{{ $locale.baseText('settings.usageAndPlan.plan', { interpolate: { plan: usageAndPlanStore.planName } }) }}
			</n8n-heading>
			<n8n-button size="large" text>{{ $locale.baseText('settings.usageAndPlan.refresh') }}</n8n-button>
		</div>
		<div :class="[$style.spacedFlex, $style.quota]">
			<n8n-text size="medium" color="text-light">{{ $locale.baseText('settings.usageAndPlan.activeWorkflows') }}</n8n-text>
			<i18n :class="$style.count" path="settings.usageAndPlan.activeWorkflows.count">
				<template #count>{{ usageAndPlanStore.executionCount }}</template>
				<template #limit>
					<span v-if="usageAndPlanStore.executionLimit < 0">{{ $locale.baseText('_reusableBaseText.unlimited') }}</span>
					<span v-else>{{ usageAndPlanStore.executionLimit }}</span>
				</template>
			</i18n>
		</div>
		<n8n-alert :background="false">
			{{ $locale.baseText('settings.usageAndPlan.activeWorkflows.hint') }}
		</n8n-alert>
		<div :class="$style.buttons">
			<n8n-button type="secondary" size="large">{{ $locale.baseText('settings.usageAndPlan.button.activation') }}</n8n-button>
			<n8n-button size="large">{{ $locale.baseText('settings.usageAndPlan.button.plans') }}</n8n-button>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { useUsageAndPlanStore } from "@/stores/usageAndPlan";

const usageAndPlanStore = useUsageAndPlanStore();

</script>

<style lang="scss" module>
.spacedFlex {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	padding: var(--spacing-2xl) 0 var(--spacing-m);
	button {
		padding: 0;
	}
}

.quota {
	height: 54px;
	padding: 0 var(--spacing-s);
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	border: 1px solid var(--color-light-grey);

	.count {
		text-transform: lowercase;
		font-size: var(--font-size-s);
	}
}

[role="alert"] {
	padding-left: 0;
	padding-right: 0;
	line-height: 18px;
}

.buttons {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing-xl) 0 0;

	button {
		margin-left: var(--spacing-xs);
	}
}
</style>
