<script setup lang="ts">
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useUIStore } from '@/app/stores/ui.store';
import { i18n as locale } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

const cloudPlanStore = useCloudPlanStore();
const pageRedirectionHelper = usePageRedirectionHelper();
const uiStore = useUIStore();

const isCollapsed = computed(() => uiStore.sidebarMenuCollapsed);

const isVisible = computed(() => {
	return cloudPlanStore.userIsTrialing && cloudPlanStore.isTrialUpgradeOnSidebar;
});

const trialDaysLeft = computed(() => -1 * cloudPlanStore.trialDaysLeft);

const trialMessage = computed(() => {
	return locale.baseText('generic.trial.message', {
		adjustToNumber: trialDaysLeft.value,
		interpolate: { count: String(trialDaysLeft.value) },
	});
});

const tooltipContent = computed(() => {
	return locale.baseText('generic.trial.tooltip', {
		adjustToNumber: trialDaysLeft.value,
		interpolate: { count: String(trialDaysLeft.value) },
	});
});

const onUpgradeClick = () => {
	void pageRedirectionHelper.goToUpgrade('main-sidebar', 'upgrade-main-sidebar', 'redirect');
};
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
				:label="isCollapsed ? '' : locale.baseText('generic.upgrade')"
				:square="isCollapsed"
				data-test-id="trial-upgrade-button"
				@click="onUpgradeClick"
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
