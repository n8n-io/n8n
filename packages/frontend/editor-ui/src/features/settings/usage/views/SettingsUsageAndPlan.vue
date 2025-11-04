<script lang="ts" setup>
import { onMounted } from 'vue';
import { useUsageStore } from '../usage.store';
import { i18n as locale } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { I18nT } from 'vue-i18n';

import { N8nHeading, N8nInfoTip, N8nText } from '@n8n/design-system';

const usageStore = useUsageStore();
const documentTitle = useDocumentTitle();

onMounted(async () => {
	documentTitle.set(locale.baseText('settings.usageAndPlan.title'));
	// License system has been removed - using default values from store
	usageStore.setLoading(false);
});
</script>

<template>
	<div class="settings-usage-and-plan">
		<N8nHeading tag="h2" size="2xlarge">{{
			locale.baseText('settings.usageAndPlan.title')
		}}</N8nHeading>
		<div v-if="!usageStore.isLoading">
			<N8nText :class="$style.subtitle" size="medium" color="text-light">
				{{ locale.baseText('settings.usageAndPlan.subtitle') }}
			</N8nText>

			<div :class="$style.quota">
				<N8nText size="medium" color="text-light">
					{{ locale.baseText('settings.usageAndPlan.activeWorkflows') }}
				</N8nText>
				<div :class="$style.chart">
					<span v-if="usageStore.activeWorkflowTriggersLimit > 0" :class="$style.chartLine">
						<span
							:class="$style.chartBar"
							:style="{ width: `${usageStore.executionPercentage}%` }"
						></span>
					</span>
					<I18nT
						tag="span"
						:class="$style.count"
						keypath="settings.usageAndPlan.activeWorkflows.count"
						scope="global"
					>
						<template #count>{{ usageStore.activeWorkflowTriggersCount }}</template>
						<template #limit>
							<span v-if="usageStore.activeWorkflowTriggersLimit < 0">{{
								locale.baseText('settings.usageAndPlan.activeWorkflows.unlimited')
							}}</span>
							<span v-else>{{ usageStore.activeWorkflowTriggersLimit }}</span>
						</template>
					</I18nT>
				</div>
			</div>

			<N8nInfoTip>{{ locale.baseText('settings.usageAndPlan.activeWorkflows.hint') }}</N8nInfoTip>
		</div>
	</div>
</template>

<style lang="scss" module>
.title {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: var(--spacing--l) 0;
}

.subtitle {
	display: block;
	margin: var(--spacing--md) 0 var(--spacing--lg) 0;
}

.titleTooltip {
	display: inline-flex;
}

.quota {
	padding: var(--spacing--l) 0;

	& > * {
		margin-bottom: var(--spacing--s);
	}
}

.chart {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.chartLine {
	display: block;
	height: 10px;
	width: 100%;
	max-width: 260px;
	border-radius: var(--radius);
	background: var(--color--background--base);
}

.chartBar {
	float: left;
	height: 100%;
	border-radius: var(--radius);
	background: var(--color--primary);
}

.count {
	white-space: nowrap;
}
</style>
