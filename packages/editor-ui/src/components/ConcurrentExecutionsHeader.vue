<template>
	<div>
		<n8n-tooltip>
			<template #content>
				<div :class="$style.tooltip">
					{{ tooltipText }}
					<n8n-link bold size="small" :class="$style.upgrade" @click="goToUpgrade">
						{{ upgradeText }}
					</n8n-link>
				</div>
			</template>
			<font-awesome-icon icon="info-circle" class="mr-2xs" />
		</n8n-tooltip>
		<n8n-text>{{ headerText }}</n8n-text>
	</div>
</template>

<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';

defineProps<{
	tooltipText: string;
	headerText: string;
	upgradeText: string;
}>();

const goToUpgrade = () => {
	void useUIStore().goToUpgrade('concurrency', 'max-concurrency-limit');
};
</script>

<style module scoped>
.tooltip {
	display: flex;
	flex-direction: column;
}

.upgrade {
	margin-top: var(--spacing-xs);
}
</style>
