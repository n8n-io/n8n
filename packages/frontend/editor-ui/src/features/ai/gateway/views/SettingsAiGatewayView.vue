<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { N8nHeading, N8nText, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const aiGatewayStore = useAiGatewayStore();
const uiStore = useUIStore();

const isLoading = ref(false);
const offset = ref(0);
const PAGE_SIZE = 50;

const creditsRemaining = computed(() => aiGatewayStore.creditsRemaining);
const entries = computed(() => aiGatewayStore.usageEntries);
const total = computed(() => aiGatewayStore.usageTotal);
const hasMore = computed(() => offset.value + PAGE_SIZE < total.value);

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

async function load(): Promise<void> {
	offset.value = 0;
	isLoading.value = true;
	try {
		await aiGatewayStore.fetchUsage(0, PAGE_SIZE);
	} finally {
		isLoading.value = false;
	}
}

async function refresh(): Promise<void> {
	await load();
}

async function loadMore(): Promise<void> {
	if (isLoading.value) return;
	offset.value += PAGE_SIZE;
	isLoading.value = true;
	try {
		await aiGatewayStore.fetchMoreUsage(offset.value, PAGE_SIZE);
	} finally {
		isLoading.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.n8nGateway.title'));
	await Promise.all([aiGatewayStore.fetchCredits(), load()]);
});
</script>

<template>
	<div :class="$style.container" data-test-id="settings-ai-gateway">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.n8nGateway.title') }}</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.n8nGateway.description') }}
			</N8nText>
		</div>

		<div :class="$style.creditsCard">
			<div :class="$style.creditsInfo">
				<span :class="$style.creditsLabel">
					{{ i18n.baseText('settings.n8nGateway.credits.title') }}:
				</span>
				<span v-if="creditsRemaining !== undefined" :class="$style.creditsNumber">
					{{ creditsRemaining }}
				</span>
			</div>
			<N8nButton
				:label="i18n.baseText('settings.n8nGateway.credits.topUp')"
				icon="hand-coins"
				variant="success"
				data-test-id="ai-gateway-topup-button"
				@click="uiStore.openModal(AI_GATEWAY_TOP_UP_MODAL_KEY)"
			/>
		</div>

		<div :class="$style.section">
			<div :class="$style.sectionHeader">
				<N8nHeading size="large">{{ i18n.baseText('settings.n8nGateway.usage.title') }}</N8nHeading>
				<N8nButton
					:label="i18n.baseText('settings.n8nGateway.usage.refresh')"
					icon="refresh-cw"
					variant="ghost"
					size="small"
					:loading="isLoading"
					@click="refresh"
				/>
			</div>

			<div :class="$style.tableWrapper">
				<table :class="$style.table">
					<thead>
						<tr>
							<th>{{ i18n.baseText('settings.n8nGateway.usage.col.date') }}</th>
							<th>{{ i18n.baseText('settings.n8nGateway.usage.col.provider') }}</th>
							<th>{{ i18n.baseText('settings.n8nGateway.usage.col.model') }}</th>
							<th>{{ i18n.baseText('settings.n8nGateway.usage.col.inputTokens') }}</th>
							<th>{{ i18n.baseText('settings.n8nGateway.usage.col.outputTokens') }}</th>
							<th>{{ i18n.baseText('settings.n8nGateway.usage.col.credits') }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="entries.length === 0 && !isLoading">
							<td colspan="6" :class="$style.empty">
								{{ i18n.baseText('settings.n8nGateway.usage.empty') }}
							</td>
						</tr>
						<tr v-for="(entry, idx) in entries" :key="idx">
							<td>{{ formatDate(entry.timestamp) }}</td>
							<td>
								<span :class="$style.badge">
									{{ entry.provider }}
								</span>
							</td>
							<td>{{ entry.model }}</td>
							<td>{{ formatTokens(entry.inputTokens) }}</td>
							<td>{{ formatTokens(entry.outputTokens) }}</td>
							<td>{{ entry.creditsDeducted }}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="hasMore" :class="$style.loadMore">
				<N8nButton
					:label="i18n.baseText('settings.n8nGateway.usage.loadMore')"
					type="secondary"
					:loading="isLoading"
					@click="loadMore"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.creditsCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md) var(--spacing--lg);
	background-color: var(--color--background);
}

.creditsInfo {
	flex: 1;
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
}

.creditsLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
}

.creditsNumber {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	line-height: 1;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.tableWrapper {
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);

	th {
		text-align: left;
		padding: var(--spacing--xs) var(--spacing--sm);
		color: var(--color--text--tint-1);
		font-weight: var(--font-weight--bold);
		border-bottom: var(--border);
		background-color: var(--color--background);
	}

	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		color: var(--color--text);
		border-bottom: var(--border);
		vertical-align: middle;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	.empty {
		text-align: center;
		color: var(--color--text--tint-2);
		padding: var(--spacing--xl);
	}
}

.badge {
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
	padding-top: var(--spacing--xs);
}
</style>
