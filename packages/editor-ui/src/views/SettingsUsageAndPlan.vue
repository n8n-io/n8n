<script lang="ts" setup>
import { onMounted } from 'vue';
import { useUsageStore } from '@/stores/usage';

const usageStore = useUsageStore();

onMounted(() => {
	usageStore.getData();
});

</script>

<template>
	<div  v-if="!usageStore.isLoading">
		<n8n-heading size="2xlarge">{{ $locale.baseText('settings.usageAndPlan.title') }}</n8n-heading>
		<n8n-heading :class="$style.title" size="large">
			{{ $locale.baseText('settings.usageAndPlan.plan', { interpolate: {plan: usageStore.planName } } ) }}
		</n8n-heading>
		<div :class="$style.quota">
			<n8n-text size="medium" color="text-light">{{ $locale.baseText('settings.usageAndPlan.activeWorkflows') }}</n8n-text>
			<i18n :class="$style.count" path="settings.usageAndPlan.activeWorkflows.count">
				<template #count>{{ usageStore.executionCount }}</template>
				<template #limit>
					<span v-if="usageStore.executionLimit < 0">{{ $locale.baseText('_reusableBaseText.unlimited') }}</span>
					<span v-else>{{ usageStore.executionLimit }}</span>
				</template>
			</i18n>
		</div>
		<n8n-info-tip>
			{{ $locale.baseText('settings.usageAndPlan.activeWorkflows.hint') }}
		</n8n-info-tip>
		<div :class="$style.buttons">
			<n8n-button type="secondary" size="large">{{ $locale.baseText('settings.usageAndPlan.button.activation') }}</n8n-button>
			<n8n-button size="large">
				<a href="#">{{ $locale.baseText('settings.usageAndPlan.button.plans') }}</a>
			</n8n-button>
		</div>
	</div>
</template>

<style lang="scss" module>
.spacedFlex {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	display: block;
	padding: var(--spacing-2xl) 0 var(--spacing-m);
}

.quota {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 54px;
	padding: 0 var(--spacing-s);
	margin: 0 0 var(--spacing-xs);
	background: var(--color-background-xlight);
	border-radius: var(--border-radius-large);
	border: 1px solid var(--color-light-grey);

	.count {
		text-transform: lowercase;
		font-size: var(--font-size-s);
	}
}

.buttons {
	display: flex;
	justify-content: flex-end;
	padding: var(--spacing-xl) 0 0;

	button {
		margin-left: var(--spacing-xs);

		a {
			display: inline-block;
			color: inherit;
			text-decoration: none;
			padding: var(--spacing-xs) var(--spacing-m);
			margin: calc(var(--spacing-xs) * -1) calc(var(--spacing-m) * -1);
		}
	}
}

div[class*="info"] span {
	line-height: 1.4;
}
</style>
