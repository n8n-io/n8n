<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useUIStore } from '@/app/stores/ui.store';

const cloudPlanStore = useCloudPlanStore();
const uiStore = useUIStore();

const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed);

const isVisible = computed(() => {
	return true;
	// return cloudPlanStore.userIsTrialing; // ! TODO TO uncomment
});

const daysLeft = computed(() => 14);

const trialMessage = computed(() => {
	return `${daysLeft.value} days left`;
});

const tooltipContent = computed(() => {
	return `${daysLeft.value} days left in your trial. Upgrade to keep using n8n.`;
});
</script>

<template>
	<div
		v-if="isVisible"
		:class="[$style.mainSidebarTrialUpgrade, { [$style.collapsed]: isCollapsed }]"
		data-test-id="main-sidebar-trial-upgrade"
	>
		<N8nTooltip :placement="isCollapsed ? 'right' : 'top'">
			<template #content>
				{{ tooltipContent }}
			</template>
			<N8nButton
				type="success"
				size="mini"
				icon="zap"
				:label="isCollapsed ? '' : 'Upgrade'"
				:square="isCollapsed"
				data-test-id="trial-upgrade-button"
			/>
		</N8nTooltip>

		<div v-if="!isCollapsed" :class="$style.mainSidebarTrialMessage">
			{{ trialMessage }}
		</div>
	</div>
</template>

<style lang="scss" module>
.mainSidebarTrialUpgrade {
	display: flex;
	align-items: center;
	padding: var(--spacing--sm) var(--spacing--xs);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	gap: var(--spacing--2xs);

	&.collapsed {
		justify-content: center;
	}
}

.mainSidebarTrialMessage {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	line-height: var(--line-height--sm);
}
</style>
