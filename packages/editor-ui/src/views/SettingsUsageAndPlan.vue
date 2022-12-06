<template>
	<div :class="$style.container">
		<n8n-heading size="2xlarge">{{ $locale.baseText('settings.usageAndPlan.title') }}</n8n-heading>
		<div>
			<n8n-heading size="large" :bold="true">{{ $locale.baseText('settings.usageAndPlan.actual', { interpolate: { plan: usageAndPlanStore.planName } }) }}</n8n-heading>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { useUsageAndPlanStore } from "@/stores/usageAndPlan";

const usageAndPlanStore = useUsageAndPlanStore();

</script>

<style lang="scss" module>
	.container {
  }
</style>
