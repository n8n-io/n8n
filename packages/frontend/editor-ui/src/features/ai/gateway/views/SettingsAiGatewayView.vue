<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	N8nActionBox,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nLoading,
	N8nText,
	N8nTooltip,
	N8nActionPill,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import type { AiGatewayUsageEntry } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, VIEWS } from '@/app/constants';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const telemetry = useTelemetry();
const aiGatewayStore = useAiGatewayStore();
const uiStore = useUIStore();

const isLoading = ref(false);
const isAppending = ref(false);
const offset = ref(0);
const PAGE_SIZE = 50;

const walletBalance = computed(() => aiGatewayStore.balance);
const walletBadgeText = computed(() =>
	walletBalance.value !== undefined
		? i18n.baseText('aiGateway.wallet.balanceRemaining', {
				interpolate: { balance: `$${Number(walletBalance.value).toFixed(2)}` },
			})
		: undefined,
);
const entries = computed(() => aiGatewayStore.usageEntries);
const total = computed(() => aiGatewayStore.usageTotal);
const hasMore = computed(() => offset.value + PAGE_SIZE < total.value);

const showUsageSectionSkeleton = computed(() => isLoading.value && !isAppending.value);

const tableHeaders = ref<Array<TableHeader<AiGatewayUsageEntry>>>([
	{
		title: i18n.baseText('settings.n8nConnect.usage.col.date'),
		key: 'timestamp',
		width: 200,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nConnect.usage.col.provider'),
		key: 'provider',
		width: 120,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nConnect.usage.col.model'),
		key: 'model',
		width: 220,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nConnect.usage.col.inputTokens'),
		key: 'inputTokens',
		width: 120,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nConnect.usage.col.outputTokens'),
		key: 'outputTokens',
		width: 120,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.n8nConnect.usage.col.cost'),
		key: 'cost',
		width: 100,
		disableSort: true,
		resize: false,
	},
]);

function formatDate(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(timestamp));
}

function formatTokens(value?: number): string {
	return value !== undefined ? String(value) : '—';
}

function rowId(row: AiGatewayUsageEntry, index: number): string {
	return `${row.timestamp}-${row.model}-${row.provider}-${index}`;
}

function rowExecutionId(row: AiGatewayUsageEntry): string | undefined {
	return row.metadata?.executionId;
}

function rowWorkflowId(row: AiGatewayUsageEntry): string | undefined {
	return row.metadata?.workflowId;
}

function isRowClickable(row: AiGatewayUsageEntry): boolean {
	return Boolean(rowExecutionId(row) && rowWorkflowId(row));
}

function onRowClick(row: AiGatewayUsageEntry): void {
	const executionId = rowExecutionId(row);
	const workflowId = rowWorkflowId(row);
	if (executionId && workflowId) {
		void router.push({
			name: VIEWS.EXECUTION_PREVIEW,
			params: { workflowId, executionId },
		});
	}
}

async function load(): Promise<void> {
	isAppending.value = false;
	offset.value = 0;
	isLoading.value = true;
	try {
		await aiGatewayStore.fetchUsage(0, PAGE_SIZE);
	} finally {
		isLoading.value = false;
	}
}

async function refresh(): Promise<void> {
	await Promise.all([aiGatewayStore.fetchWallet(), load()]);
}

async function loadMore(): Promise<void> {
	if (isLoading.value) return;
	isAppending.value = true;
	offset.value += PAGE_SIZE;
	isLoading.value = true;
	try {
		await aiGatewayStore.fetchMoreUsage(offset.value, PAGE_SIZE);
	} finally {
		isLoading.value = false;
		isAppending.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.n8nConnect.title'));
	await refresh();
});
</script>

<template>
	<div :class="$style.container" data-test-id="settings-ai-gateway">
		<header :class="$style.mainHeader" data-test-id="ai-gateway-settings-header">
			<div :class="$style.headings">
				<div :class="$style.headingRow">
					<N8nHeading size="2xlarge">{{ i18n.baseText('settings.n8nConnect.title') }}</N8nHeading>
					<N8nActionPill
						v-if="walletBadgeText"
						size="medium"
						:text="walletBadgeText"
						data-test-id="ai-gateway-header-credits-badge"
					/>
				</div>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.n8nConnect.description') }}
				</N8nText>
			</div>
			<N8nButton
				:label="i18n.baseText('settings.n8nConnect.wallet.topUp')"
				icon="hand-coins"
				variant="solid"
				data-test-id="ai-gateway-topup-button"
				@click="
					telemetry.track('User clicked ai gateway top up', { source: 'settings_page' });
					uiStore.openModalWithData({ name: AI_GATEWAY_TOP_UP_MODAL_KEY, data: {} });
				"
			/>
		</header>

		<div :class="$style.usageTableContainer">
			<div v-if="showUsageSectionSkeleton">
				<N8nLoading :loading="true" variant="h1" :class="$style.usageTableHeader" />
				<N8nLoading :loading="true" variant="p" :rows="5" :shrink-last="false" />
			</div>
			<div v-else>
				<div :class="$style.usageTableHeader">
					<N8nHeading size="medium" :bold="true">
						{{ i18n.baseText('settings.n8nConnect.usage.title') }}
					</N8nHeading>
					<div :class="$style.usageTableActions">
						<N8nTooltip :content="i18n.baseText('settings.n8nConnect.usage.refresh.tooltip')">
							<N8nButton
								variant="subtle"
								icon-only
								size="small"
								icon="refresh-cw"
								:aria-label="i18n.baseText('generic.refresh')"
								:loading="isLoading && !isAppending"
								@click="refresh"
							/>
						</N8nTooltip>
					</div>
				</div>
				<N8nActionBox
					v-if="entries.length === 0"
					:heading="i18n.baseText('settings.n8nConnect.usage.empty')"
				/>
				<N8nDataTableServer
					v-else
					:class="$style.gatewayUsageTable"
					:headers="tableHeaders"
					:items="entries"
					:items-length="entries.length"
					:loading="isLoading && isAppending"
					:item-value="rowId"
					:row-props="(row) => (isRowClickable(row) ? { class: $style.clickableRow } : {})"
					@click:row="(_, { item }) => onRowClick(item)"
				>
					<template #[`item.timestamp`]="{ item }">
						<N8nTooltip
							v-if="isRowClickable(item)"
							:content="i18n.baseText('settings.n8nConnect.usage.openExecution')"
						>
							<span>{{ formatDate(item.timestamp) }}</span>
						</N8nTooltip>
						<span v-else>{{ formatDate(item.timestamp) }}</span>
					</template>
					<template #[`item.provider`]="{ item }">
						<span :class="$style.providerBadge">
							{{ item.provider }}
						</span>
					</template>
					<template #[`item.model`]="{ item }">
						{{ item.model }}
					</template>
					<template #[`item.inputTokens`]="{ item }">
						{{ formatTokens(item.inputTokens) }}
					</template>
					<template #[`item.outputTokens`]="{ item }">
						{{ formatTokens(item.outputTokens) }}
					</template>
					<template #[`item.cost`]="{ item }">
						{{ `$${Number(item.cost).toFixed(4)}` }}
					</template>
				</N8nDataTableServer>

				<div v-if="hasMore && entries.length > 0" :class="$style.loadMore">
					<N8nButton
						:label="i18n.baseText('settings.n8nConnect.usage.loadMore')"
						type="secondary"
						:loading="isLoading && isAppending"
						@click="loadMore"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding-bottom: var(--spacing--2xl);
}

.mainHeader {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--md);

	@media (max-width: 820px) {
		flex-direction: column;
		align-items: flex-start;
	}
}

.headings {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.headingRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--5xs);
}

.usageTableContainer {
	:global(.table-pagination) {
		display: none;
	}
}

.usageTableHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--sm);
}

.usageTableActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.gatewayUsageTable {
	tr:last-child {
		border-bottom: none !important;
	}
}

.clickableRow {
	cursor: pointer;

	&:hover td {
		background-color: var(--color--background--light-2);
	}
}

.providerBadge {
	display: inline-block;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--foreground);
	color: var(--color--text);
}

.loadMore {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--md);
}
</style>
