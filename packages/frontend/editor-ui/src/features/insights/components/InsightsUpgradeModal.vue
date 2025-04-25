<script setup lang="ts">
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { ElDialog } from 'element-plus';

const model = defineModel<boolean>();

function goToUpgrade() {
	model.value = false;
	void usePageRedirectionHelper().goToUpgrade('insights', 'upgrade-insights');
}
</script>

<template>
	<ElDialog v-model="model" title="Upgrade to Enterprise" width="500">
		<div>
			<p>
				Viewing this time period requires an enterprise plan. Upgrade to Enterprise to unlock
				advanced features.
			</p>
			<ul>
				<li>View up to one year of insights history</li>
				<li>Zoom into last 24 hours with hourly granularity</li>
				<li>Gain deeper visibility into workflow trends over time</li>
			</ul>
		</div>
		<template #footer>
			<div>
				<N8nButton type="secondary" @click="model = false">Dismiss</N8nButton>
				<N8nButton type="primary" @click="goToUpgrade"> Upgrade </N8nButton>
			</div>
		</template>
	</ElDialog>
</template>
