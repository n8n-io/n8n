<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useExecutionQuotasStore } from '../executionQuotas.store';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { i18n as locale } from '@n8n/i18n';
import type {
	CreateExecutionQuotaPayload,
	ExecutionQuotaDashboardItem,
} from '@n8n/rest-api-client';

import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';

import QuotaFormModal from '../components/QuotaFormModal.vue';

const store = useExecutionQuotasStore();
const toast = useToast();
const documentTitle = useDocumentTitle();

const showCreateModal = ref(false);
const editingQuotaId = ref<number | null>(null);

onMounted(async () => {
	documentTitle.set(locale.baseText('settings.executionQuotas.title'));
	try {
		await Promise.all([store.fetchQuotas(), store.fetchDashboard()]);
	} catch {
		toast.showError(
			new Error(locale.baseText('settings.executionQuotas.loadError')),
			locale.baseText('settings.executionQuotas.title'),
		);
	}
});

const sortedDashboard = computed(() =>
	[...store.dashboard].sort((a, b) => b.percentage - a.percentage),
);

function getStatusClass(item: ExecutionQuotaDashboardItem): string {
	if (item.percentage >= 100) return 'danger';
	if (item.percentage >= 80) return 'warning';
	return 'success';
}

const periodLabels: Record<string, string> = {
	hourly: locale.baseText('settings.executionQuotas.period.hourly'),
	daily: locale.baseText('settings.executionQuotas.period.daily'),
	weekly: locale.baseText('settings.executionQuotas.period.weekly'),
	monthly: locale.baseText('settings.executionQuotas.period.monthly'),
};

const enforcementLabels: Record<string, string> = {
	block: locale.baseText('settings.executionQuotas.enforcement.block'),
	warn: locale.baseText('settings.executionQuotas.enforcement.warn'),
	workflow: locale.baseText('settings.executionQuotas.enforcement.workflow'),
};

function formatPeriod(period: string): string {
	return periodLabels[period] ?? period;
}

function formatEnforcement(mode: string): string {
	return enforcementLabels[mode] ?? mode;
}

async function handleCreate(payload: CreateExecutionQuotaPayload) {
	try {
		await store.addQuota(payload);
		await store.fetchDashboard();
		showCreateModal.value = false;
		toast.showMessage({
			title: locale.baseText('settings.executionQuotas.created'),
			type: 'success',
		});
	} catch {
		toast.showError(
			new Error(locale.baseText('settings.executionQuotas.createError')),
			locale.baseText('settings.executionQuotas.title'),
		);
	}
}

async function handleToggle(item: ExecutionQuotaDashboardItem) {
	try {
		await store.editQuota(item.id, { enabled: !item.enabled });
		await store.fetchDashboard();
	} catch {
		toast.showError(
			new Error(locale.baseText('settings.executionQuotas.updateError')),
			locale.baseText('settings.executionQuotas.title'),
		);
	}
}

async function handleDelete(id: number) {
	try {
		await store.removeQuota(id);
		await store.fetchDashboard();
		toast.showMessage({
			title: locale.baseText('settings.executionQuotas.deleted'),
			type: 'success',
		});
	} catch {
		toast.showError(
			new Error(locale.baseText('settings.executionQuotas.deleteError')),
			locale.baseText('settings.executionQuotas.title'),
		);
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<div>
				<N8nHeading tag="h2" size="2xlarge">
					{{ locale.baseText('settings.executionQuotas.title') }}
				</N8nHeading>
				<N8nText :class="$style.description">
					{{ locale.baseText('settings.executionQuotas.description') }}
				</N8nText>
			</div>
			<N8nButton
				:label="locale.baseText('settings.executionQuotas.addQuota')"
				size="large"
				@click="showCreateModal = true"
			/>
		</div>

		<div v-if="store.isLoading" :class="$style.loading">
			<N8nText>{{ locale.baseText('settings.executionQuotas.loading') }}</N8nText>
		</div>

		<div v-else-if="sortedDashboard.length === 0" :class="$style.empty">
			<N8nText>{{ locale.baseText('settings.executionQuotas.empty') }}</N8nText>
		</div>

		<div v-else :class="$style.grid">
			<div
				v-for="item in sortedDashboard"
				:key="item.id"
				:class="[$style.card, $style[getStatusClass(item)]]"
			>
				<div :class="$style.cardHeader">
					<N8nText :bold="true" size="medium">
						{{
							item.workflowId
								? locale.baseText('settings.executionQuotas.scope.workflow')
								: locale.baseText('settings.executionQuotas.scope.project')
						}}
					</N8nText>
					<div :class="$style.cardActions">
						<N8nButton
							:label="
								item.enabled
									? locale.baseText('settings.executionQuotas.disable')
									: locale.baseText('settings.executionQuotas.enable')
							"
							type="tertiary"
							size="mini"
							@click="handleToggle(item)"
						/>
						<N8nButton
							:label="locale.baseText('settings.executionQuotas.delete')"
							type="tertiary"
							size="mini"
							@click="handleDelete(item.id)"
						/>
					</div>
				</div>

				<div :class="$style.cardBody">
					<div :class="$style.cardDetail">
						<N8nText size="small" color="text-light">
							{{ locale.baseText('settings.executionQuotas.label.id') }}
						</N8nText>
						<N8nText size="small">
							{{ item.workflowId ?? item.projectId ?? '-' }}
						</N8nText>
					</div>
					<div :class="$style.cardDetail">
						<N8nText size="small" color="text-light">
							{{ locale.baseText('settings.executionQuotas.label.period') }}
						</N8nText>
						<N8nText size="small">{{ formatPeriod(item.period) }}</N8nText>
					</div>
					<div :class="$style.cardDetail">
						<N8nText size="small" color="text-light">
							{{ locale.baseText('settings.executionQuotas.label.enforcement') }}
						</N8nText>
						<N8nText size="small">{{ formatEnforcement(item.enforcementMode) }}</N8nText>
					</div>
				</div>

				<div :class="$style.progressSection">
					<div :class="$style.progressHeader">
						<N8nText size="small"> {{ item.currentCount }} / {{ item.limit }} </N8nText>
						<N8nText size="small" :bold="true"> {{ Math.round(item.percentage) }}% </N8nText>
					</div>
					<div :class="$style.progressBar">
						<div
							:class="[$style.progressFill, $style[`fill-${getStatusClass(item)}`]]"
							:style="{ width: `${Math.min(item.percentage, 100)}%` }"
						/>
					</div>
				</div>

				<div v-if="!item.enabled" :class="$style.disabledBadge">
					<N8nText size="small" color="text-light">
						{{ locale.baseText('settings.executionQuotas.disabled') }}
					</N8nText>
				</div>
			</div>
		</div>

		<QuotaFormModal
			v-if="showCreateModal"
			:editing-quota-id="editingQuotaId"
			@submit="handleCreate"
			@close="
				showCreateModal = false;
				editingQuotaId = null;
			"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	padding: var(--spacing--lg);
	max-width: 1200px;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: var(--spacing--xl);
}

.description {
	margin-top: var(--spacing--2xs);
	color: var(--color--text--tint-1);
}

.loading,
.empty {
	text-align: center;
	padding: var(--spacing--3xl) 0;
	color: var(--color--text--tint-2);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
	gap: var(--spacing--md);
}

.card {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md);
	background: var(--color--background);
	position: relative;
}

.card.danger {
	border-color: var(--color--danger--tint-3);
}

.card.warning {
	border-color: var(--color--warning--tint-1);
}

.card.success {
	border-color: var(--color--success--tint-2);
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing--xs);
}

.cardActions {
	display: flex;
	gap: var(--spacing--4xs);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--sm);
}

.cardDetail {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.progressSection {
	margin-top: var(--spacing--xs);
}

.progressHeader {
	display: flex;
	justify-content: space-between;
	margin-bottom: var(--spacing--4xs);
}

.progressBar {
	height: 6px;
	background: var(--color--foreground--tint-2);
	border-radius: 3px;
	overflow: hidden;
}

.progressFill {
	height: 100%;
	border-radius: 3px;
	transition: width 0.3s ease;
}

.fill-success {
	background: var(--color--success);
}

.fill-warning {
	background: var(--color--warning);
}

.fill-danger {
	background: var(--color--danger);
}

.disabledBadge {
	position: absolute;
	top: var(--spacing--xs);
	right: var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}
</style>
