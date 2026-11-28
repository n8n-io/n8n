<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type {
	AssistantUsageUser,
	AssistantUsageUsersResponse,
	AssistantUsageUsersSortBy,
} from '@n8n/api-types';
import {
	N8nDataTableServer,
	N8nText,
	N8nTooltip,
	N8nUserInfo,
	type TableHeader,
	type TableOptions,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	fetchAssistantUsageUsers,
	type AssistantUsageFilter,
} from '@/features/ai/instanceAi/assistantUsage.api';
import { formatCompactNumber, formatNumber, tokenBreakdown, totalTokens } from './usageFormat';

const props = defineProps<{
	/** The range and the project. A new filter loads the first page again. */
	filter: AssistantUsageFilter;
}>();

const SORTABLE_COLUMNS = new Set<string>([
	'conversations',
	'messages',
	'workflowsCreated',
	'agentsCreated',
	'dataTablesCreated',
	'tokens',
	'lastUsedAt',
]);

function isSortOption(value: string): value is AssistantUsageUsersSortBy {
	const [column, direction] = value.split(':');
	return SORTABLE_COLUMNS.has(column) && (direction === 'asc' || direction === 'desc');
}

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const users = ref<AssistantUsageUsersResponse>({ count: 0, data: [] });
const isLoading = ref(false);
const sortBy = ref<TableOptions['sortBy']>([{ id: 'messages', desc: true }]);
const page = ref(0);
const pageSize = ref(10);

// A newer request replaces an older one, so a slow response never overwrites newer data.
let latestRequest = 0;

const timeOfDay: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
const thisYearFormat = new Intl.DateTimeFormat(undefined, {
	day: 'numeric',
	month: 'short',
	...timeOfDay,
});
const otherYearFormat = new Intl.DateTimeFormat(undefined, {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	...timeOfDay,
});

/** Shows the year only when it is not the current year, so the date fits its column. */
function formatDateTime(iso: string | null): string {
	if (!iso) return '—';
	const date = new Date(iso);
	const format = date.getFullYear() === new Date().getFullYear() ? thisYearFormat : otherYearFormat;
	return format.format(date);
}

function userLabel(user: AssistantUsageUser): string {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return name || user.email || i18n.baseText('settings.n8nAgent.usage.users.deletedUser');
}

// Widths that fit the headers, so all columns fit a common laptop screen without scrolling.
const headers: Array<TableHeader<AssistantUsageUser>> = [
	{
		title: i18n.baseText('settings.n8nAgent.usage.users.user'),
		key: 'name',
		value: (user) => userLabel(user),
		minWidth: 220,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.n8nAgent.usage.users.conversations'),
		key: 'conversations',
		width: 120,
	},
	{ title: i18n.baseText('settings.n8nAgent.usage.users.messages'), key: 'messages', width: 100 },
	{
		title: i18n.baseText('settings.n8nAgent.usage.users.workflows'),
		key: 'workflowsCreated',
		width: 140,
	},
	{
		title: i18n.baseText('settings.n8nAgent.usage.users.agents'),
		key: 'agentsCreated',
		width: 120,
	},
	{
		title: i18n.baseText('settings.n8nAgent.usage.users.dataTables'),
		key: 'dataTablesCreated',
		width: 150,
	},
	{
		title: i18n.baseText('settings.n8nAgent.usage.users.tokens'),
		key: 'tokens',
		value: totalTokens,
		width: 100,
	},
	{ title: i18n.baseText('settings.n8nAgent.usage.users.lastUsed'), key: 'lastUsedAt', width: 170 },
];

async function load(): Promise<void> {
	const request = ++latestRequest;
	const [sort] = sortBy.value;
	const sortOption = sort ? `${sort.id}:${sort.desc ? 'desc' : 'asc'}` : undefined;
	isLoading.value = true;
	try {
		const result = await fetchAssistantUsageUsers(rootStore.restApiContext, {
			...props.filter,
			skip: page.value * pageSize.value,
			take: pageSize.value,
			...(sortOption && isSortOption(sortOption) ? { sortBy: sortOption } : {}),
		});
		if (request === latestRequest) users.value = result;
	} catch (error) {
		if (request === latestRequest) {
			toast.showError(error, i18n.baseText('settings.n8nAgent.usage.loadError'));
		}
	} finally {
		if (request === latestRequest) isLoading.value = false;
	}
}

/** Shows the first page. The page watcher loads it when the page changes. */
async function loadFirstPage(): Promise<void> {
	if (page.value !== 0) {
		page.value = 0;
		return;
	}
	await load();
}

watch(() => props.filter, loadFirstPage);
watch(sortBy, loadFirstPage);
watch([page, pageSize], load);

onMounted(load);
</script>

<template>
	<N8nDataTableServer
		v-model:sort-by="sortBy"
		v-model:page="page"
		v-model:items-per-page="pageSize"
		:headers="headers"
		:items="users.data"
		:items-length="users.count"
		:item-value="(row) => row.userId ?? 'deleted'"
		:loading="isLoading"
		data-test-id="assistant-usage-users"
	>
		<template #[`item.name`]="{ item }">
			<N8nUserInfo
				v-if="item.email"
				:first-name="item.firstName"
				:last-name="item.lastName"
				:email="item.email"
			/>
			<N8nText v-else color="text-light">{{ userLabel(item) }}</N8nText>
		</template>
		<template #[`item.conversations`]="{ item }">{{ formatNumber(item.conversations) }}</template>
		<template #[`item.messages`]="{ item }">{{ formatNumber(item.messages) }}</template>
		<template #[`item.workflowsCreated`]="{ item }">
			{{ formatNumber(item.workflowsCreated) }}
		</template>
		<template #[`item.agentsCreated`]="{ item }">{{ formatNumber(item.agentsCreated) }}</template>
		<template #[`item.dataTablesCreated`]="{ item }">
			{{ formatNumber(item.dataTablesCreated) }}
		</template>
		<template #[`item.tokens`]="{ item }">
			<N8nTooltip placement="top">
				<template #content>
					<div v-for="line in tokenBreakdown(item)" :key="line">{{ line }}</div>
				</template>
				<span :data-test-id="`assistant-usage-tokens-${item.userId ?? 'deleted'}`">
					{{ formatCompactNumber(totalTokens(item)) }}
				</span>
			</N8nTooltip>
		</template>
		<template #[`item.lastUsedAt`]="{ item }">{{ formatDateTime(item.lastUsedAt) }}</template>
	</N8nDataTableServer>
</template>
