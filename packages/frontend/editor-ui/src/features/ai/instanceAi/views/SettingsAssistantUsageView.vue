<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { AssistantUsageResponse, AssistantUsageSummary } from '@n8n/api-types';
import {
	N8nEmptyState,
	N8nHeading,
	N8nLoading,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import type { SlotProjectSelection } from '@n8n/frontend-module-sdk';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import ProjectFilter from '@/features/collaboration/projects/components/ProjectFilter.vue';
import {
	fetchAssistantUsage,
	type AssistantUsageFilter,
} from '@/features/ai/instanceAi/assistantUsage.api';
import { INSTANCE_AI_SETTINGS_VIEW } from '@/features/ai/instanceAi/constants';
import AssistantUsageCharts from '@/features/ai/instanceAi/components/usage/AssistantUsageCharts.vue';
import AssistantUsageUsersTable from '@/features/ai/instanceAi/components/usage/AssistantUsageUsersTable.vue';
import { formatNumber, totalTokens } from '@/features/ai/instanceAi/components/usage/usageFormat';

const KPIS: Array<{ key: keyof AssistantUsageSummary; labelKey: BaseTextKey }> = [
	{ key: 'conversations', labelKey: 'settings.n8nAgent.usage.kpi.conversations' },
	{ key: 'messages', labelKey: 'settings.n8nAgent.usage.kpi.messages' },
	{ key: 'activeUsers', labelKey: 'settings.n8nAgent.usage.kpi.activeUsers' },
	{ key: 'workflowsCreated', labelKey: 'settings.n8nAgent.usage.kpi.workflowsCreated' },
	{ key: 'agentsCreated', labelKey: 'settings.n8nAgent.usage.kpi.agentsCreated' },
	{ key: 'dataTablesCreated', labelKey: 'settings.n8nAgent.usage.kpi.dataTablesCreated' },
];

/** The periods to choose from. Each one ends now and starts at midnight, so today counts as a day. */
const PERIODS: Array<{ days: number; labelKey: BaseTextKey }> = [
	{ days: 7, labelKey: 'settings.n8nAgent.usage.period.last7Days' },
	{ days: 30, labelKey: 'settings.n8nAgent.usage.period.last30Days' },
	{ days: 90, labelKey: 'settings.n8nAgent.usage.period.last90Days' },
	{ days: 365, labelKey: 'settings.n8nAgent.usage.period.last12Months' },
];

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();

const periodDays = ref(30);
const selectedProject = ref<SlotProjectSelection>(null);

function currentFilter(): AssistantUsageFilter {
	const startDate = new Date();
	startDate.setHours(0, 0, 0, 0);
	startDate.setDate(startDate.getDate() - (periodDays.value - 1));
	return { startDate, endDate: new Date(), projectId: selectedProject.value?.id };
}

const filter = shallowRef<AssistantUsageFilter>(currentFilter());
watch([periodDays, selectedProject], () => {
	filter.value = currentFilter();
});

const usage = ref<AssistantUsageResponse | null>(null);
const isLoading = ref(false);

// A newer request replaces an older one, so a slow response never overwrites newer data.
let latestRequest = 0;

async function loadUsage(): Promise<void> {
	const request = ++latestRequest;
	isLoading.value = true;
	try {
		const result = await fetchAssistantUsage(rootStore.restApiContext, filter.value);
		if (request === latestRequest) usage.value = result;
	} catch (error) {
		if (request === latestRequest) {
			toast.showError(error, i18n.baseText('settings.n8nAgent.usage.loadError'));
		}
	} finally {
		if (request === latestRequest) isLoading.value = false;
	}
}

// A period can have tokens without messages, for example when a turn resumes after an approval.
const hasUsage = computed(() => {
	if (!usage.value) return false;
	const { summary, byDay } = usage.value;
	return (
		summary.messages > 0 ||
		summary.workflowsCreated > 0 ||
		summary.agentsCreated > 0 ||
		summary.dataTablesCreated > 0 ||
		byDay.some((day) => totalTokens(day) > 0)
	);
});

async function goBack(): Promise<void> {
	await router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
}

watch(filter, loadUsage);

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.n8nAgent.usage.title'));
	await loadUsage();
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.n8nAgent')"
		data-test-id="assistant-usage"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.n8nAgent.usage.title')"
			:description="i18n.baseText('settings.n8nAgent.usage.description')"
			:show-docs-link="false"
		/>

		<div :class="$style.filters">
			<ProjectFilter
				v-model="selectedProject"
				:placeholder="i18n.baseText('settings.n8nAgent.usage.allProjects')"
				size="small"
				:class="$style.projectFilter"
			/>
			<N8nSelect
				v-model="periodDays"
				size="small"
				:class="$style.period"
				data-test-id="assistant-usage-period"
			>
				<N8nOption
					v-for="period in PERIODS"
					:key="period.days"
					:value="period.days"
					:label="i18n.baseText(period.labelKey)"
				/>
			</N8nSelect>
		</div>

		<div v-if="isLoading && !usage">
			<N8nLoading :loading="true" variant="h1" />
			<N8nLoading :loading="true" variant="p" :rows="6" :shrink-last="false" />
		</div>

		<template v-else-if="usage">
			<section
				:class="[$style.kpis, { [$style.refreshing]: isLoading }]"
				data-test-id="assistant-usage-kpis"
			>
				<div v-for="kpi in KPIS" :key="kpi.key" :class="$style.kpi">
					<N8nText size="small" color="text-light">{{ i18n.baseText(kpi.labelKey) }}</N8nText>
					<span :class="$style.kpiValue" :data-test-id="`assistant-usage-kpi-${kpi.key}`">
						{{ formatNumber(usage.summary[kpi.key]) }}
					</span>
				</div>
			</section>

			<N8nEmptyState
				v-if="!hasUsage"
				:heading="i18n.baseText('settings.n8nAgent.usage.empty.heading')"
				:description="i18n.baseText('settings.n8nAgent.usage.empty.description')"
				data-test-id="assistant-usage-empty"
			/>

			<template v-else>
				<AssistantUsageCharts :days="usage.byDay" :refreshing="isLoading" />

				<section :class="$style.users">
					<N8nHeading size="medium" :bold="true">
						{{ i18n.baseText('settings.n8nAgent.usage.users.title') }}
					</N8nHeading>
					<AssistantUsageUsersTable :filter="filter" />
				</section>
			</template>
		</template>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The same frame as the other full-width settings pages: the settings shell insets the page,
   and the header is pulled to the left edge of the content. */
.layout {
	padding: 0;

	header {
		margin-inline: 0 auto;
	}
}

.filters {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.projectFilter {
	min-width: 200px;
}

.period {
	width: 160px;
}

.kpis {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: var(--spacing--sm);
}

.kpi {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
}

.kpiValue {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--text-color);
	line-height: var(--line-height--sm);
}

.users {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

/* Keeps the old numbers readable while new ones load. */
.refreshing {
	opacity: 0.6;
}
</style>
