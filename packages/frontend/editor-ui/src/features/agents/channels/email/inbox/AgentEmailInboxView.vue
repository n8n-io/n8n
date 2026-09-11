<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import {
	defaultAgentSessionFilters,
	getThreadDetail,
	listThreads,
	type ThreadDetail,
} from '@/features/agents/composables/useAgentThreadsApi';
import { AGENT_BUILDER_VIEW, AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { formatDuration } from '@/features/agents/session-timeline.utils';
import type { AgentResource } from '@/features/agents/types';
import {
	N8nBadge,
	N8nBreadcrumbs,
	N8nButton,
	N8nCard,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nPreviewTag,
	N8nTabs,
	N8nText,
	N8nTooltip,
	type BadgeTheme,
	type PathItem,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useCssVar } from '@vueuse/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { computed, ref, watch } from 'vue';
import { Bar } from 'vue-chartjs';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';

import {
	buildInboxAnalytics,
	conversationFromDetail,
	EMAIL_INBOX_PAGE_SIZE,
	filterInboxThreads,
	formatInboxTime,
	toInboxThread,
	type InboxFolder,
	type InboxThread,
} from './email-inbox';

type InboxTab = 'inbox' | 'analytics';

const STATUS_KEYS: Record<string, BaseTextKey> = {
	running: 'agentSessions.status.running',
	succeeded: 'agentSessions.status.succeeded',
	error: 'agentSessions.status.error',
	cancelled: 'agentSessions.status.cancelled',
	interrupted: 'agentSessions.status.interrupted',
};

const STATUS_THEMES: Record<string, BadgeTheme> = {
	succeeded: 'success',
	error: 'danger',
	interrupted: 'warning',
	cancelled: 'warning',
	running: 'primary',
};

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();

const projectId = computed(() => route.params.projectId as string);
const agentId = computed(() => route.params.agentId as string);

const untitled = i18n.baseText('agents.builder.chat.newChat.label');
const tab = ref<InboxTab>('inbox');
const folder = ref<InboxFolder>('inbox');
const query = ref('');
const loading = ref(false);
const truncated = ref(false);
const agent = ref<AgentResource | null>(null);
const threads = ref<InboxThread[]>([]);
const selectedId = ref<string | null>(null);
const detail = ref<ThreadDetail | null>(null);
const detailLoading = ref(false);

const tabOptions = computed(() => [
	{ label: i18n.baseText('agents.channels.email.inbox.tab.inbox'), value: 'inbox' as const },
	{
		label: i18n.baseText('agents.channels.email.inbox.tab.analytics'),
		value: 'analytics' as const,
	},
]);

const attentionCount = computed(() => threads.value.filter((row) => row.needsAttention).length);

const folderOptions = computed(() => [
	{
		label: `${i18n.baseText('agents.channels.email.inbox.folder.inbox')} (${threads.value.length})`,
		value: 'inbox' as const,
	},
	{
		label: `${i18n.baseText('agents.channels.email.inbox.folder.needsAttention')} (${attentionCount.value})`,
		value: 'needsAttention' as const,
	},
]);

const visibleThreads = computed(() => filterInboxThreads(threads.value, folder.value, query.value));
const selected = computed(() => visibleThreads.value.find((row) => row.id === selectedId.value));
const messages = computed(() => (detail.value ? conversationFromDetail(detail.value) : []));
const analytics = computed(() => buildInboxAnalytics(threads.value));
const emptyIcon = { type: 'icon' as const, value: 'mail' as const };

const projectName = computed<string | null>(() => {
	if (projectsStore.personalProject?.id === projectId.value) {
		return i18n.baseText('projects.menu.personal');
	}
	const current = projectsStore.currentProject;
	if (current && current.id === projectId.value) return current.name ?? null;
	return projectsStore.myProjects.find((p) => p.id === projectId.value)?.name ?? null;
});

const projectRoute = computed<RouteLocationRaw>(() => ({
	name: VIEWS.PROJECTS_WORKFLOWS,
	params: { projectId: projectId.value },
}));

const agentRoute = computed<RouteLocationRaw>(() => ({
	name: AGENT_BUILDER_VIEW,
	params: { projectId: projectId.value, agentId: agentId.value },
}));

const breadcrumbItems = computed<PathItem[]>(() => [
	{
		id: projectId.value,
		label: projectName.value ?? i18n.baseText('agents.builder.header.projectFallback'),
		href: router.resolve(projectRoute.value).href,
	},
	{
		id: agentId.value,
		label: agent.value?.name ?? '…',
		href: router.resolve(agentRoute.value).href,
	},
]);

const stats = computed(() => [
	{
		id: 'received',
		label: i18n.baseText('agents.channels.email.inbox.analytics.received'),
		value: String(analytics.value.received),
		hint: '',
	},
	{
		id: 'replies',
		label: i18n.baseText('agents.channels.email.inbox.analytics.replies'),
		value: String(analytics.value.replies),
		hint: i18n.baseText('agents.channels.email.inbox.analytics.replyRate', {
			interpolate: { rate: String(Math.round(analytics.value.replyRate * 100)) },
		}),
	},
	{
		id: 'responseTime',
		label: i18n.baseText('agents.channels.email.inbox.analytics.responseTime'),
		value: formatDuration(analytics.value.avgResponseMs) || '-',
		hint: '',
	},
	{
		id: 'errors',
		label: i18n.baseText('agents.channels.email.inbox.analytics.errors'),
		value: String(analytics.value.errors),
		hint: '',
	},
]);

const colorPrimary = useCssVar('--color--primary', document.body);
const colorSuccess = useCssVar('--color--success', document.body);
const colorTextLight = useCssVar('--color--text--tint-1', document.body);
const colorTextDark = useCssVar('--color--text--shade-1', document.body);
const colorForeground = useCssVar('--color--foreground', document.body);
const colorBackgroundLight = useCssVar('--color--background--light-3', document.body);

const chartData = computed<ChartData<'bar'>>(() => ({
	labels: analytics.value.byDay.map((day) => day.date.slice(5)),
	datasets: [
		{
			label: i18n.baseText('agents.channels.email.inbox.analytics.received'),
			data: analytics.value.byDay.map((day) => day.received),
			backgroundColor: colorPrimary.value,
		},
		{
			label: i18n.baseText('agents.channels.email.inbox.analytics.replies'),
			data: analytics.value.byDay.map((day) => day.replied),
			backgroundColor: colorSuccess.value,
		},
	],
}));

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false,
	plugins: {
		legend: {
			display: true,
			align: 'end',
			position: 'top',
			labels: {
				boxWidth: 8,
				boxHeight: 8,
				borderRadius: 2,
				useBorderRadius: true,
				color: colorTextLight.value,
			},
		},
		tooltip: {
			caretSize: 0,
			padding: 12,
			backgroundColor: colorBackgroundLight.value,
			titleColor: colorTextDark.value,
			bodyColor: colorTextDark.value,
			borderWidth: 1,
			borderColor: colorForeground.value,
		},
	},
	interaction: { mode: 'nearest', axis: 'x', intersect: false },
	datasets: { bar: { maxBarThickness: 24, borderRadius: 4 } },
	scales: {
		x: {
			grid: { display: false },
			border: { display: false },
			ticks: { color: colorTextLight.value },
		},
		y: {
			beginAtZero: true,
			grid: { color: colorForeground.value },
			border: { display: false },
			ticks: { maxTicksLimit: 4, precision: 0, color: colorTextLight.value },
		},
	},
}));

function statusLabel(status: string | null): string {
	if (!status) return '';
	const key = STATUS_KEYS[status];
	return key ? i18n.baseText(key) : status;
}

function statusTheme(status: string | null): BadgeTheme {
	return (status && STATUS_THEMES[status]) || 'default';
}

function formatMetaDate(iso: string): string {
	const { date, time } = convertToDisplayDate(iso);
	return `${date} ${time}`;
}

async function loadInbox() {
	loading.value = true;
	try {
		const [page, agentRow] = await Promise.all([
			listThreads(rootStore.restApiContext, projectId.value, agentId.value, {
				limit: EMAIL_INBOX_PAGE_SIZE,
				filters: { ...defaultAgentSessionFilters(), origin: 'email' },
			}),
			getAgent(rootStore.restApiContext, projectId.value, agentId.value).catch(() => null),
		]);
		agent.value = agentRow;
		threads.value = page.threads.map((row) => toInboxThread(row, untitled));
		truncated.value = page.nextCursor != null;
		selectedId.value = threads.value[0]?.id ?? null;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.channels.email.inbox.loadError'));
	} finally {
		loading.value = false;
	}
}

function onBreadcrumbSelect(item: PathItem) {
	if (item.id === projectId.value) {
		void router.push(projectRoute.value);
	} else if (item.id === agentId.value) {
		void router.push(agentRoute.value);
	}
}

async function close() {
	await router.push(agentRoute.value);
}

async function openSession() {
	if (!selectedId.value) return;
	await router.push({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: {
			projectId: projectId.value,
			agentId: agentId.value,
			threadId: selectedId.value,
		},
	});
}

watch(
	() => [projectId.value, agentId.value],
	() => {
		void loadInbox();
	},
	{ immediate: true },
);

watch(selectedId, async (threadId) => {
	detail.value = null;
	if (!threadId) return;
	detailLoading.value = true;
	try {
		detail.value = await getThreadDetail(
			rootStore.restApiContext,
			projectId.value,
			agentId.value,
			threadId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.channels.email.inbox.loadError'));
	} finally {
		detailLoading.value = false;
	}
});
</script>

<template>
	<div :class="$style.view" data-testid="agent-email-inbox">
		<div :class="$style.topBar">
			<div :class="$style.topBarLeft">
				<N8nBreadcrumbs :items="breadcrumbItems" theme="medium" @item-selected="onBreadcrumbSelect">
					<template #append>
						<span :class="$style.crumbSeparator" aria-hidden="true">/</span>
						<span :class="$style.crumbCurrent">
							<N8nIcon icon="mail" :size="14" />
							<span>{{ i18n.baseText('agents.channels.email.inbox.title') }}</span>
						</span>
						<N8nPreviewTag size="small" />
					</template>
				</N8nBreadcrumbs>
			</div>
			<div :class="$style.topBarRight">
				<N8nTabs v-model="tab" :options="tabOptions" variant="modern" size="small" />
				<N8nTooltip :content="i18n.baseText('generic.close')">
					<N8nButton
						variant="ghost"
						icon-only
						icon="x"
						size="medium"
						:aria-label="i18n.baseText('generic.close')"
						data-testid="agent-email-inbox-close"
						@click="close"
					/>
				</N8nTooltip>
			</div>
		</div>

		<section
			v-if="tab === 'analytics'"
			:class="$style.analytics"
			data-testid="agent-email-analytics"
		>
			<div :class="$style.stats">
				<N8nCard v-for="stat in stats" :key="stat.id" :class="$style.statCard">
					<N8nText size="small" color="text-light">{{ stat.label }}</N8nText>
					<N8nHeading tag="p" size="xlarge" bold>{{ stat.value }}</N8nHeading>
					<N8nText v-if="stat.hint" size="xsmall" color="text-light">{{ stat.hint }}</N8nText>
				</N8nCard>
			</div>

			<N8nCard :class="$style.panelCard">
				<template #header>
					<N8nText bold>{{
						i18n.baseText('agents.channels.email.inbox.analytics.chartTitle')
					}}</N8nText>
				</template>
				<div v-if="analytics.received === 0" :class="$style.chartEmpty">
					<N8nText color="text-light" size="small">
						{{ i18n.baseText('agents.channels.email.inbox.analytics.chartEmpty') }}
					</N8nText>
				</div>
				<div v-else :class="$style.chart" data-testid="agent-email-analytics-chart">
					<Bar :data="chartData" :options="chartOptions" />
				</div>
			</N8nCard>

			<N8nCard :class="$style.panelCard">
				<template #header>
					<N8nText bold>{{
						i18n.baseText('agents.channels.email.inbox.analytics.statusTitle')
					}}</N8nText>
				</template>
				<ul :class="$style.statusList">
					<li v-for="row in analytics.byStatus" :key="row.status">
						<N8nBadge :theme="statusTheme(row.status)">{{ statusLabel(row.status) }}</N8nBadge>
						<N8nText bold size="small">{{ row.count }}</N8nText>
					</li>
				</ul>
			</N8nCard>
		</section>

		<section v-else :class="$style.inbox">
			<aside :class="$style.sidebar">
				<div :class="$style.sidebarHeader">
					<N8nTabs v-model="folder" :options="folderOptions" variant="modern" size="small" />
					<N8nInput
						v-model="query"
						:placeholder="i18n.baseText('agents.channels.email.inbox.search')"
						size="small"
						clearable
						data-testid="agent-email-inbox-search"
					>
						<template #prefix>
							<N8nIcon icon="search" size="small" />
						</template>
					</N8nInput>
				</div>

				<div :class="$style.list" data-testid="agent-email-inbox-list">
					<N8nLoading v-if="loading" :loading="true" :rows="6" />
					<N8nEmptyState
						v-else-if="threads.length === 0"
						:icon="emptyIcon"
						:heading="i18n.baseText('agents.channels.email.inbox.empty.title')"
						:description="i18n.baseText('agents.channels.email.inbox.empty.description')"
					/>
					<N8nEmptyState
						v-else-if="visibleThreads.length === 0"
						:icon="emptyIcon"
						:heading="i18n.baseText('agents.channels.email.inbox.emptyFiltered.title')"
						:description="i18n.baseText('agents.channels.email.inbox.emptyFiltered.description')"
					/>
					<template v-else>
						<N8nCard
							v-for="row in visibleThreads"
							:key="row.id"
							:class="[$style.card, { [$style.cardSelected]: selectedId === row.id }]"
							role="option"
							tabindex="0"
							:aria-selected="selectedId === row.id"
							data-testid="agent-email-inbox-row"
							@click="selectedId = row.id"
							@keydown.enter.prevent="selectedId = row.id"
						>
							<div :class="$style.cardHeader">
								<N8nText bold size="small" :class="$style.cardTitle">{{ row.subject }}</N8nText>
								<N8nText size="xsmall" color="text-light" :class="$style.cardTime">
									{{ formatInboxTime(row.updatedAt) }}
								</N8nText>
							</div>
							<div :class="$style.cardMeta">
								<N8nText size="xsmall" color="text-light" :class="$style.cardPreview">
									{{ row.preview }}
								</N8nText>
								<N8nBadge
									v-if="row.needsAttention"
									:theme="statusTheme(row.status)"
									size="xsmall"
									:class="$style.cardBadge"
								>
									{{ statusLabel(row.status) }}
								</N8nBadge>
							</div>
						</N8nCard>
						<N8nText v-if="truncated" size="xsmall" color="text-light" :class="$style.truncated">
							{{
								i18n.baseText('agents.channels.email.inbox.truncated', {
									interpolate: { count: String(EMAIL_INBOX_PAGE_SIZE) },
								})
							}}
						</N8nText>
					</template>
				</div>
			</aside>

			<div :class="$style.detail">
				<N8nEmptyState
					v-if="!selected"
					:icon="emptyIcon"
					:heading="i18n.baseText('agents.channels.email.inbox.select.title')"
					:description="i18n.baseText('agents.channels.email.inbox.select.description')"
				/>
				<template v-else>
					<div :class="$style.detailHeader">
						<div :class="$style.detailTitle">
							<N8nHeading tag="h2" size="medium" bold>{{ selected.subject }}</N8nHeading>
							<N8nBadge :theme="statusTheme(selected.status)">
								{{ statusLabel(selected.status) }}
							</N8nBadge>
						</div>
						<div :class="$style.detailMeta">
							<span :class="$style.metricItem">
								<N8nIcon icon="calendar" :size="12" />
								<span>{{ formatMetaDate(selected.updatedAt) }}</span>
							</span>
							<span :class="$style.sep">·</span>
							<span :class="$style.metricItem">
								<N8nIcon icon="clock" :size="12" />
								<span>{{ formatDuration(selected.durationMs) || '-' }}</span>
							</span>
							<N8nButton
								size="small"
								variant="subtle"
								icon="external-link"
								:label="i18n.baseText('agents.channels.email.inbox.viewSession')"
								data-testid="agent-email-inbox-view-session"
								@click="openSession"
							/>
						</div>
					</div>

					<div :class="$style.messages">
						<N8nLoading v-if="detailLoading" :loading="true" :rows="4" />
						<N8nCard
							v-for="message in detailLoading ? [] : messages"
							:key="message.id"
							:class="[$style.message, { [$style.messageAgent]: message.role === 'agent' }]"
						>
							<template #prepend>
								<N8nIcon :icon="message.role === 'agent' ? 'bot' : 'mail'" size="medium" />
							</template>
							<template #header>
								<N8nText bold size="small">
									{{
										message.role === 'agent'
											? i18n.baseText('agents.channels.email.inbox.agent')
											: i18n.baseText('agents.channels.email.inbox.inbound')
									}}
								</N8nText>
								<N8nText size="xsmall" color="text-light">
									{{ formatInboxTime(new Date(message.timestamp).toISOString()) }}
								</N8nText>
							</template>
							<N8nText size="small" :class="$style.messageBody">{{ message.content }}</N8nText>
							<div v-if="message.attachments.length" :class="$style.attachments">
								<N8nBadge
									v-for="file in message.attachments"
									:key="file.id"
									theme="tertiary"
									:show-border="false"
								>
									<N8nIcon icon="paperclip" size="xsmall" />
									{{ file.fileName }}
								</N8nBadge>
							</div>
						</N8nCard>
					</div>
				</template>
			</div>
		</section>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.topBar {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.topBarLeft {
	display: flex;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.topBarLeft :global(.n8n-breadcrumbs) {
	min-width: 0;
}

.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-left: auto;
}

.crumbSeparator {
	color: var(--border-color);
	margin-inline: var(--spacing--4xs);
	user-select: none;
	font-size: var(--font-size--xl);
}

.crumbCurrent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-right: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--text-color);
}

.inbox {
	display: grid;
	grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
	flex: 1 1 auto;
	min-height: 0;
}

.sidebar {
	display: flex;
	flex-direction: column;
	min-height: 0;
	border-right: var(--border);
}

.sidebarHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--xs);
}

.list {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--xs) var(--spacing--md) var(--spacing--md);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.card {
	cursor: pointer;
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--border-color);
	transition: background-color 0.3s ease;

	&:hover:not(.cardSelected) {
		background-color: var(--background--active);
		border-color: transparent;
	}

	&:focus-visible {
		border-color: var(--focus--border-color);
	}
}

.cardSelected {
	background-color: var(--background--active);
	border-color: transparent;
}

.cardHeader,
.cardMeta {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
}

.cardMeta {
	margin-top: var(--spacing--4xs);
}

.cardTitle,
.cardPreview {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.cardTime,
.cardBadge {
	flex-shrink: 0;
	white-space: nowrap;
}

.truncated {
	padding-top: var(--spacing--2xs);
	text-align: center;
}

.detail {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.detailHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--border);
	background-color: var(--background--surface);
}

.detailTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;

	h2 {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.detailMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtler);

	button {
		margin-left: auto;
	}
}

.metricItem {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.sep {
	color: var(--text-color--subtler);
}

.messages {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	overflow-y: auto;
	padding: var(--spacing--lg);
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.message {
	align-items: flex-start;
	max-width: 48rem;
	--n8n--card-body--gap: var(--spacing--2xs);
}

.messageAgent {
	align-self: flex-end;
	border-color: var(--color--primary--tint-2, var(--border-color));
}

.messageBody {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.attachments {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.analytics {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	overflow-y: auto;
	padding: var(--spacing--lg);
}

.stats {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.statCard {
	--n8n--card-body--gap: var(--spacing--4xs);
}

.panelCard {
	--n8n--card-body--gap: var(--spacing--sm);
	--card--padding: var(--spacing--sm) var(--spacing--md);
}

.chart {
	position: relative;
	height: 14rem;
	width: 100%;
}

.chartEmpty {
	display: flex;
	align-items: center;
	min-height: 6rem;
}

.statusList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
}

@media (max-width: 900px) {
	.stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
</style>
