<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nNotice,
	N8nPagination,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useCatalogStore } from '@/features/catalog/catalog.store';
import type {
	CatalogEntry,
	CatalogSubscription,
	CatalogSubscriptionInput,
} from '@/features/catalog/catalog.types';
import CatalogRunDialog from '@/features/catalog/components/CatalogRunDialog.vue';
import CatalogScheduleDialog from '@/features/catalog/components/CatalogScheduleDialog.vue';
import type { OwnSchedule } from '@/features/catalog/catalog.utils';
import { summariseOwnSchedules } from '@/features/catalog/catalog.utils';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle();
const catalogStore = useCatalogStore();

const loading = ref(true);
/** The workflow whose input form is open. Null while nothing is being filled in. */
const running = ref<CatalogEntry | null>(null);
/** Which card is mid-run, so only that card's button spins. */
const runningId = ref<string | null>(null);
/** The workflow being scheduled, plus the existing schedule when one is being changed. */
const scheduling = ref<{ entry: CatalogEntry; subscription?: CatalogSubscription } | null>(null);
const savingSchedule = ref(false);

const subscriptions = computed(() => catalogStore.subscriptions);

const entriesById = computed(
	() => new Map(catalogStore.workflows.map((entry) => [entry.id, entry])),
);

/**
 * Paged in the browser rather than by the API: the listing is already capped
 * server-side (and says so when it truncates), so the whole set is in hand and
 * paging it is presentation, not fetching.
 */
const CATALOG_PAGE_SIZE = 12;

const page = ref(1);

const pagedWorkflows = computed(() =>
	catalogStore.workflows.slice(
		(page.value - 1) * CATALOG_PAGE_SIZE,
		page.value * CATALOG_PAGE_SIZE,
	),
);

// A refetch can shrink the list under the current page; land on the last real
// one rather than on an empty grid.
watch(
	() => catalogStore.workflows.length,
	(total) => {
		const lastPage = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
		if (page.value > lastPage) page.value = lastPage;
	},
);

onMounted(async () => {
	documentTitle.set(i18n.baseText('catalog.heading'));
	try {
		await Promise.all([catalogStore.fetchWorkflows(), catalogStore.fetchSubscriptions()]);
	} catch (error) {
		toast.showError(error, i18n.baseText('catalog.load.error'));
	} finally {
		loading.value = false;
	}
});

const triggerLabel = (entry: CatalogEntry) =>
	entry.trigger === 'manual-trigger'
		? i18n.baseText('catalog.trigger.manual')
		: i18n.baseText('catalog.trigger.declared');

const inputsLabel = (entry: CatalogEntry) =>
	entry.fields.length === 0
		? i18n.baseText('catalog.inputs.none')
		: i18n.baseText('catalog.inputs.count', {
				adjustToNumber: entry.fields.length,
				interpolate: { count: entry.fields.length },
			});

/** This person's own standing with a workflow — never anyone else's. */
const ownSchedule = (entry: CatalogEntry): OwnSchedule =>
	summariseOwnSchedules(catalogStore.subscriptionsByWorkflow[entry.id] ?? []);

const ownScheduleLabel = (entry: CatalogEntry) => {
	const own = ownSchedule(entry);
	if (own.state === 'none') return '';
	if (own.state === 'paused') return i18n.baseText('catalog.card.schedulePaused');

	const when = i18n.baseText('catalog.card.scheduleNext', {
		interpolate: { when: displayTime(own.nextRunAt) },
	});
	// Only when there is more than one, so the common case stays a plain sentence.
	return own.count > 1
		? `${when} ${i18n.baseText('catalog.card.scheduleMore', {
				adjustToNumber: own.count - 1,
				interpolate: { count: own.count - 1 },
			})}`
		: when;
};

/**
 * What the calendar button does, spelled out in its tooltip so it never changes
 * meaning silently. With one schedule it edits that one, which is the common
 * case and saves a trip to the list below.
 */
const scheduleAction = (entry: CatalogEntry) => {
	const held = catalogStore.subscriptionsByWorkflow[entry.id] ?? [];
	if (held.length === 1) {
		return { label: i18n.baseText('catalog.schedule.change'), subscription: held[0] };
	}
	return {
		label:
			held.length === 0
				? i18n.baseText('catalog.schedule.add')
				: i18n.baseText('catalog.schedule.addAnother'),
		subscription: undefined,
	};
};

const displayTime = (value: string | null) => {
	if (!value) return '';
	const { date, time } = convertToDisplayDate(value);
	return `${date} ${time}`;
};

/**
 * The workflow's own execution list, which already answers "what happened" far
 * better than a flat history here could — it shows every run of that workflow
 * with its data, not just the fact that one occurred.
 */
const openExecutions = async (entry: CatalogEntry) => {
	await router.push({ name: VIEWS.WORKFLOW_EXECUTIONS, params: { workflowId: entry.id } });
};

const start = async (entry: CatalogEntry, values: Record<string, unknown>) => {
	runningId.value = entry.id;
	try {
		await catalogStore.run(entry.id, values);
		running.value = null;
		toast.showMessage({
			title: i18n.baseText('catalog.run.started'),
			message: i18n.baseText('catalog.run.started.message', { interpolate: { name: entry.name } }),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('catalog.run.error'));
	} finally {
		runningId.value = null;
	}
};

/**
 * A workflow that declares no fields has nothing to ask for, so the button runs
 * it outright rather than opening an empty form.
 */
const onRunClick = async (entry: CatalogEntry) => {
	if (entry.fields.length === 0) {
		await start(entry, {});
		return;
	}
	running.value = entry;
};

const saveSchedule = async (input: CatalogSubscriptionInput) => {
	const target = scheduling.value;
	if (!target) return;

	savingSchedule.value = true;
	try {
		if (target.subscription) {
			await catalogStore.updateSubscription(target.subscription.id, input);
		} else {
			await catalogStore.subscribe(target.entry.id, input);
		}
		scheduling.value = null;
		toast.showMessage({ title: i18n.baseText('catalog.schedule.saved'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('catalog.schedule.error'));
	} finally {
		savingSchedule.value = false;
	}
};

const editSchedule = (subscription: CatalogSubscription) => {
	const entry = entriesById.value.get(subscription.workflowId);
	// The workflow stopped being offerable, so there is no contract to render a
	// form from; removing the schedule is all that is left to do with it.
	if (!entry) {
		toast.showMessage({
			title: i18n.baseText('catalog.schedule.unavailable'),
			type: 'warning',
		});
		return;
	}
	scheduling.value = { entry, subscription };
};

const removeSchedule = async (subscription: CatalogSubscription) => {
	try {
		await catalogStore.unsubscribe(subscription.id);
		toast.showMessage({ title: i18n.baseText('catalog.schedule.removed'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('catalog.schedule.error'));
	}
};
</script>

<template>
	<div :class="$style.page" data-test-id="catalog-view">
		<header :class="$style.header">
			<N8nHeading tag="h1" size="xlarge" bold>{{ i18n.baseText('catalog.heading') }}</N8nHeading>
			<N8nText color="text-light">{{ i18n.baseText('catalog.subheading') }}</N8nText>
		</header>

		<N8nLoading v-if="loading" :rows="3" :class="$style.grid" />

		<template v-else>
			<N8nNotice v-if="catalogStore.truncated" theme="warning">
				{{ i18n.baseText('catalog.truncated') }}
			</N8nNotice>

			<N8nEmptyState
				v-if="catalogStore.isEmpty"
				data-test-id="catalog-empty"
				:icon="{ type: 'icon', value: 'play' }"
				:heading="i18n.baseText('catalog.empty')"
				:description="i18n.baseText('catalog.empty.description')"
			/>

			<div v-else :class="$style.grid">
				<N8nCard
					v-for="entry in pagedWorkflows"
					:key="entry.id"
					:class="$style.card"
					data-test-id="catalog-workflow"
				>
					<template #header>
						<N8nText bold :class="$style.name" :title="entry.name">{{ entry.name }}</N8nText>
					</template>

					<N8nText
						size="small"
						:color="entry.description ? 'text-base' : 'text-light'"
						:class="$style.description"
					>
						{{ entry.description || i18n.baseText('catalog.card.noDescription') }}
					</N8nText>

					<template #footer>
						<div :class="$style.meta">
							<N8nBadge theme="tertiary">
								<N8nIcon
									:icon="entry.trigger === 'manual-trigger' ? 'mouse-pointer' : 'workflow'"
									size="xsmall"
									:class="$style.badgeIcon"
								/>
								{{ triggerLabel(entry) }}
							</N8nBadge>
							<N8nBadge theme="default">{{ inputsLabel(entry) }}</N8nBadge>
							<N8nBadge
								v-if="ownSchedule(entry).state !== 'none'"
								:theme="ownSchedule(entry).state === 'scheduled' ? 'success' : 'warning'"
								data-test-id="catalog-own-schedule"
							>
								<N8nIcon icon="calendar" size="xsmall" :class="$style.badgeIcon" />
								{{ ownScheduleLabel(entry) }}
							</N8nBadge>
						</div>

						<div :class="$style.actions">
							<N8nTooltip :content="i18n.baseText('catalog.card.history')">
								<N8nIconButton
									icon="history"
									type="tertiary"
									size="small"
									:aria-label="i18n.baseText('catalog.card.history')"
									data-test-id="catalog-history-button"
									@click="openExecutions(entry)"
								/>
							</N8nTooltip>
							<N8nTooltip :content="scheduleAction(entry).label">
								<N8nIconButton
									icon="calendar"
									type="tertiary"
									size="small"
									:aria-label="scheduleAction(entry).label"
									data-test-id="catalog-schedule-button"
									@click="scheduling = { entry, subscription: scheduleAction(entry).subscription }"
								/>
							</N8nTooltip>
							<N8nButton
								size="small"
								icon="play"
								:label="i18n.baseText('catalog.run')"
								:loading="runningId === entry.id"
								:disabled="runningId !== null && runningId !== entry.id"
								data-test-id="catalog-run-button"
								@click="onRunClick(entry)"
							/>
						</div>
					</template>
				</N8nCard>
			</div>

			<N8nPagination
				v-if="!catalogStore.isEmpty && catalogStore.workflows.length > CATALOG_PAGE_SIZE"
				:class="$style.pagination"
				layout="prev, pager, next"
				:current-page="page"
				:page-size="CATALOG_PAGE_SIZE"
				:total="catalogStore.workflows.length"
				data-test-id="catalog-pagination"
				@update:current-page="page = $event"
			/>

			<section :class="$style.section">
				<N8nHeading tag="h2" size="medium" bold>
					{{ i18n.baseText('catalog.schedules.heading') }}
				</N8nHeading>

				<N8nText v-if="subscriptions.length === 0" color="text-light">
					{{ i18n.baseText('catalog.schedules.empty') }}
				</N8nText>

				<ul v-else :class="$style.rowList">
					<li
						v-for="item in subscriptions"
						:key="item.id"
						:class="$style.row"
						data-test-id="catalog-subscription"
					>
						<N8nText size="small" :class="$style.name">
							{{ item.workflowName ?? i18n.baseText('catalog.runs.unknownWorkflow') }}
						</N8nText>
						<N8nText size="small" color="text-light">
							{{
								item.enabled
									? i18n.baseText('catalog.schedules.nextRun', {
											interpolate: { when: displayTime(item.nextRunAt) },
										})
									: i18n.baseText('catalog.schedules.paused')
							}}
						</N8nText>
						<div :class="$style.actions">
							<N8nTooltip :content="i18n.baseText('catalog.schedules.edit')">
								<N8nIconButton
									icon="pen"
									type="tertiary"
									size="small"
									:aria-label="i18n.baseText('catalog.schedules.edit')"
									data-test-id="catalog-subscription-edit"
									@click="editSchedule(item)"
								/>
							</N8nTooltip>
							<N8nTooltip :content="i18n.baseText('catalog.schedules.remove')">
								<N8nIconButton
									icon="trash-2"
									type="tertiary"
									size="small"
									:aria-label="i18n.baseText('catalog.schedules.remove')"
									data-test-id="catalog-subscription-remove"
									@click="removeSchedule(item)"
								/>
							</N8nTooltip>
						</div>
					</li>
				</ul>
			</section>
		</template>

		<CatalogRunDialog
			v-if="running"
			:entry="running"
			:running="runningId !== null"
			@close="running = null"
			@submit="(values) => running && start(running, values)"
		/>

		<CatalogScheduleDialog
			v-if="scheduling"
			:entry="scheduling.entry"
			:subscription="scheduling.subscription"
			:saving="savingSchedule"
			@close="scheduling = null"
			@submit="saveSchedule"
		/>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--lg);
	max-width: 1200px;
	margin: 0 auto;
	width: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: var(--spacing--xs);
}

.card {
	--card--padding: var(--spacing--sm);

	align-items: stretch;
	gap: var(--spacing--2xs);
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	margin-bottom: var(--spacing--2xs);
}

.meta {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.badgeIcon {
	margin-right: var(--spacing--5xs);
}

.pagination {
	display: flex;
	justify-content: center;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.rowList {
	display: flex;
	flex-direction: column;
	list-style: none;
	padding: 0;
	margin: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.row {
	display: grid;
	grid-template-columns: 1fr auto auto;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background-color: var(--background--surface);

	& + & {
		border-top: var(--border);
	}
}
</style>
