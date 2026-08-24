<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import {
	N8nDataTableServer,
	N8nHeading,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { IconOrEmoji, TableHeader } from '@n8n/design-system';
import { getInstanceWebhooks, type InstanceWebhook } from '@n8n/rest-api-client/api/webhooks';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import NodeIcon from '@/app/components/NodeIcon.vue';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { VIEWS } from '@/app/constants';

type WebhookRow = InstanceWebhook & { url: string; projectName: string; callCount: number };

const i18n = useI18n();
const rootStore = useRootStore();
const nodeTypesStore = useNodeTypesStore();
const pushStore = usePushConnectionStore();
const clipboard = useClipboard();
const { showMessage, showError } = useToast();
const documentTitle = useDocumentTitle();

const webhooks = ref<WebhookRow[]>([]);
const isLoading = ref(true);
const search = ref('');
const sortBy = ref<Array<{ id: string; desc: boolean }>>([{ id: 'workflowName', desc: false }]);

const headers = computed<Array<TableHeader<WebhookRow>>>(() => [
	{
		title: i18n.baseText('settings.webhooks.column.node'),
		key: 'node',
		width: 200,
	},
	{
		title: i18n.baseText('settings.webhooks.column.workflow'),
		key: 'workflowName',
		width: 220,
	},
	{
		title: i18n.baseText('settings.webhooks.column.project'),
		key: 'projectName',
		width: 170,
	},
	{
		title: i18n.baseText('settings.webhooks.column.path'),
		key: 'path',
	},
	{
		title: i18n.baseText('settings.webhooks.column.method'),
		key: 'method',
		width: 90,
	},
	{
		title: i18n.baseText('settings.webhooks.column.calls'),
		key: 'callCount',
		width: 90,
		align: 'end',
	},
]);

const nodeTypeFilter = ref<string[]>([]);

const nodeTypeOptions = computed(() => {
	const labels = new Map<string, string>();
	for (const row of webhooks.value) {
		if (row.nodeType && !labels.has(row.nodeType)) {
			labels.set(
				row.nodeType,
				nodeTypesStore.getNodeType(row.nodeType)?.displayName ?? row.nodeType,
			);
		}
	}
	return [...labels.entries()]
		.map(([value, label]) => ({ value, label }))
		.sort((a, b) => a.label.localeCompare(b.label));
});

const filteredItems = computed(() => {
	const term = search.value.trim().toLowerCase();
	let items = webhooks.value;
	if (nodeTypeFilter.value.length > 0) {
		items = items.filter((row) => nodeTypeFilter.value.includes(row.nodeType ?? ''));
	}
	if (term) {
		items = items.filter((row) =>
			[row.path ?? '', row.workflowName ?? '', row.node, row.method ?? '', row.projectName].some(
				(value) => value.toLowerCase().includes(term),
			),
		);
	}

	if (!sortBy.value.length) return items;

	const [{ id, desc }] = sortBy.value;
	const key = id as keyof WebhookRow;
	return [...items].sort((a, b) => {
		const left = a[key];
		const right = b[key];
		if (typeof left === 'number' && typeof right === 'number') {
			return desc ? right - left : left - right;
		}
		const leftText = String(left ?? '');
		const rightText = String(right ?? '');
		return desc ? rightText.localeCompare(leftText) : leftText.localeCompare(rightText);
	});
});

const sections = computed(() =>
	[
		{
			id: 'active',
			title: i18n.baseText('settings.webhooks.section.active'),
			items: filteredItems.value.filter((row) => row.isActive),
		},
		{
			id: 'inactive',
			title: i18n.baseText('settings.webhooks.section.inactive'),
			items: filteredItems.value.filter((row) => !row.isActive),
		},
	].filter((section) => section.items.length > 0),
);

const getWorkflowLink = (workflowId: string): RouteLocationRaw => ({
	name: VIEWS.WORKFLOW,
	params: { workflowId },
});

const getProjectIcon = (row: WebhookRow): IconOrEmoji =>
	row.project?.icon ?? {
		type: 'icon',
		value: row.project?.type === 'personal' ? 'user' : 'layers',
	};

const getProjectAbbreviation = (name: string) =>
	name.length > 16 ? `${name.slice(0, 16)}…` : name;

const getPathAbbreviation = (path: string) => {
	const [firstSegment] = path.split('/');
	const shortened = firstSegment.length > 8 ? firstSegment.slice(0, 8) : firstSegment;
	return shortened === path ? path : `${shortened}…`;
};

const FLASH_DURATION_MS = 2000;
const flashedKeys = ref(new Set<string>());
const rowKey = (row: { workflowId: string; node: string; method?: string; path?: string }) =>
	`${row.workflowId}|${row.node}|${row.method ?? ''}|${row.path ?? ''}`;

const flashRow = (key: string) => {
	// Replace the Set so the change is reactive
	flashedKeys.value = new Set(flashedKeys.value).add(key);
	setTimeout(() => {
		const next = new Set(flashedKeys.value);
		next.delete(key);
		flashedKeys.value = next;
	}, FLASH_DURATION_MS);
};

const pingRow = (row: WebhookRow) => {
	row.callCount += 1;
	flashRow(rowKey(row));
};

const removePushListener = pushStore.addEventListener((message) => {
	if (message.type === 'webhookReceived') {
		const key = rowKey(message.data);
		const row = webhooks.value.find((candidate) => rowKey(candidate) === key);
		if (row) pingRow(row);
	} else if (message.type === 'triggerFired') {
		// These events carry no node info, so ping the workflow's matching trigger rows:
		// sub-workflow triggers for `integrated` runs, schedules/pollers otherwise
		const isSubWorkflowRun = message.data.mode === 'integrated';
		for (const row of webhooks.value) {
			if (row.kind !== 'trigger' || row.workflowId !== message.data.workflowId) continue;
			const isSubWorkflowTrigger = row.nodeType === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE;
			if (isSubWorkflowTrigger === isSubWorkflowRun) pingRow(row);
		}
	}
});

onBeforeUnmount(() => {
	removePushListener();
	pushStore.pushDisconnect();
});

const onCopyUrl = async (url: string) => {
	await clipboard.copy(url);
	showMessage({
		type: 'success',
		title: i18n.baseText('settings.webhooks.copy.success'),
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.webhooks.title'));
	pushStore.pushConnect();
	try {
		const [items] = await Promise.all([
			getInstanceWebhooks(rootStore.restApiContext),
			nodeTypesStore.loadNodeTypesIfNotLoaded(),
		]);
		webhooks.value = items.map((item) => ({
			...item,
			url: item.path ? `${rootStore.webhookUrl}/${item.path}` : '',
			projectName: item.project?.name ?? '',
			callCount: 0,
		}));
	} catch (error) {
		showError(error, i18n.baseText('settings.webhooks.loadError'));
	} finally {
		isLoading.value = false;
	}
});
</script>

<template>
	<div :class="$style.page" data-testid="settings-webhooks">
		<header :class="$style.header">
			<N8nHeading tag="h1" size="2xlarge" bold>
				{{ i18n.baseText('settings.webhooks.title') }}
			</N8nHeading>
			<N8nText color="text-base">
				{{ i18n.baseText('settings.webhooks.description') }}
			</N8nText>
		</header>

		<div v-if="webhooks.length > 0" :class="$style.controls">
			<N8nSelect
				v-model="nodeTypeFilter"
				multiple
				collapse-tags
				clearable
				size="medium"
				:placeholder="i18n.baseText('settings.webhooks.filter.nodeType')"
				data-testid="webhooks-node-type-filter"
				:class="$style.nodeTypeFilter"
			>
				<N8nOption
					v-for="option in nodeTypeOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				/>
			</N8nSelect>
			<N8nInput
				v-model="search"
				size="medium"
				:placeholder="i18n.baseText('settings.webhooks.search.placeholder')"
				clearable
				data-testid="webhooks-search"
				:class="$style.search"
			/>
		</div>

		<template v-if="sections.length > 0">
			<section v-for="section in sections" :key="section.id" :class="$style.section">
				<N8nHeading tag="h2" size="large">
					{{ section.title }} ({{ section.items.length }})
				</N8nHeading>
				<N8nDataTableServer
					v-model:sort-by="sortBy"
					:headers="headers"
					:items="section.items"
					:items-length="section.items.length"
					:page-sizes="[section.items.length + 1]"
					:data-testid="`webhooks-table-${section.id}`"
				>
					<template #[`item.method`]="{ item }">
						<N8nText bold size="small">{{ item.method ?? '—' }}</N8nText>
					</template>

					<template #[`item.path`]="{ item }">
						<div v-if="item.path" :class="$style.urlCell">
							<code :class="$style.url" :title="item.url">{{
								getPathAbbreviation(item.path)
							}}</code>
							<N8nIconButton
								icon="copy"
								variant="ghost"
								size="small"
								:title="i18n.baseText('settings.webhooks.copy.tooltip')"
								data-testid="webhook-copy-url"
								@click="onCopyUrl(item.url)"
							/>
						</div>
						<N8nText v-else color="text-light">—</N8nText>
					</template>

					<template #[`item.workflowName`]="{ item }">
						<RouterLink :to="getWorkflowLink(item.workflowId)" target="_blank">
							<N8nText :class="$style.ellipsis" style="color: var(--color--text)">
								{{ item.workflowName ?? item.workflowId }}
							</N8nText>
						</RouterLink>
					</template>

					<template #[`item.projectName`]="{ item }">
						<div v-if="item.project" :class="$style.projectCell" :title="item.projectName">
							<ProjectIcon :icon="getProjectIcon(item)" size="mini" border-less />
							<N8nText size="small">{{ getProjectAbbreviation(item.projectName) }}</N8nText>
						</div>
					</template>

					<template #[`item.node`]="{ item }">
						<div :class="[$style.nodeCell, { [$style.flash]: flashedKeys.has(rowKey(item)) }]">
							<NodeIcon
								v-if="item.nodeType"
								:node-type="nodeTypesStore.getNodeType(item.nodeType)"
								:size="18"
							/>
							<N8nText :class="$style.ellipsis">{{ item.node }}</N8nText>
						</div>
					</template>
				</N8nDataTableServer>
			</section>
		</template>

		<div v-else-if="!isLoading" :class="$style.emptyState" data-testid="webhooks-empty">
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText('settings.webhooks.empty.title') }}
			</N8nHeading>
			<N8nText color="text-base">
				{{ i18n.baseText('settings.webhooks.empty.description') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-bottom: var(--spacing--2xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.controls {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
}

.search {
	max-width: 300px;
}

.nodeTypeFilter {
	max-width: 260px;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.urlCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.url {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: var(--font-size--sm);
	word-break: break-all;
}

.projectCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.ellipsis {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	display: inline-block;
	max-width: 100%;
}

.nodeCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-left: calc(-1 * var(--spacing--3xs));
	border-radius: var(--radius);
}

.flash {
	animation: webhook-flash 2s ease-out;
}

@keyframes webhook-flash {
	from {
		background-color: var(--color--success--tint-4);
	}
	to {
		background-color: transparent;
	}
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}
</style>
