<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nDialog,
	N8nDialogFooter,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLoading,
	N8nNotice,
	N8nText,
	type BadgeTheme,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ExecutionStatus } from 'n8n-workflow';
import { computed, onMounted, ref } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import { useCatalogStore } from '@/features/catalog/catalog.store';
import type { CatalogEntry, CatalogRun } from '@/features/catalog/catalog.types';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const catalogStore = useCatalogStore();

const loading = ref(true);
/** The workflow whose input form is open. Null while nothing is being filled in. */
const selected = ref<CatalogEntry | null>(null);
const inputs = ref<Record<string, string>>({});
/** Which card is mid-run, so only that card's button spins. */
const runningId = ref<string | null>(null);

const runs = computed(() => catalogStore.runs);

onMounted(async () => {
	documentTitle.set(i18n.baseText('catalog.heading'));
	try {
		await Promise.all([catalogStore.fetchWorkflows(), catalogStore.fetchRuns()]);
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

const RUN_STATUS_THEMES: Partial<Record<ExecutionStatus, BadgeTheme>> = {
	success: 'success',
	error: 'danger',
	crashed: 'danger',
	canceled: 'default',
	running: 'warning',
	waiting: 'warning',
	new: 'warning',
};

const runTheme = (status: ExecutionStatus): BadgeTheme => RUN_STATUS_THEMES[status] ?? 'default';

const runTime = (run: CatalogRun) => {
	if (!run.startedAt) return '';
	const { date, time } = convertToDisplayDate(run.startedAt);
	return `${date} ${time}`;
};

const start = async (entry: CatalogEntry, values: Record<string, unknown>) => {
	runningId.value = entry.id;
	try {
		await catalogStore.run(entry.id, values);
		selected.value = null;
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

	selected.value = entry;
	// Start each form clean rather than carrying the previous workflow's values.
	inputs.value = Object.fromEntries(entry.fields.map((field) => [field.name, '']));
};

const closeDialog = () => {
	if (runningId.value) return;
	selected.value = null;
};

const submit = async () => {
	if (!selected.value) return;
	await start(selected.value, { ...inputs.value });
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
					v-for="entry in catalogStore.workflows"
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
						</div>

						<N8nButton
							size="small"
							icon="play"
							:label="i18n.baseText('catalog.run')"
							:loading="runningId === entry.id"
							:disabled="runningId !== null && runningId !== entry.id"
							data-test-id="catalog-run-button"
							@click="onRunClick(entry)"
						/>
					</template>
				</N8nCard>
			</div>

			<section :class="$style.runs">
				<N8nHeading tag="h2" size="medium" bold>
					{{ i18n.baseText('catalog.runs.heading') }}
				</N8nHeading>

				<N8nText v-if="runs.length === 0" color="text-light">
					{{ i18n.baseText('catalog.runs.empty') }}
				</N8nText>

				<ul v-else :class="$style.runList">
					<li v-for="item in runs" :key="item.id" :class="$style.run" data-test-id="catalog-run">
						<N8nText size="small" :class="$style.name">
							{{ item.workflowName ?? i18n.baseText('catalog.runs.unknownWorkflow') }}
						</N8nText>
						<N8nText size="small" color="text-light">{{ runTime(item) }}</N8nText>
						<N8nBadge :theme="runTheme(item.status)">{{ item.status }}</N8nBadge>
					</li>
				</ul>
			</section>
		</template>

		<N8nDialog
			v-if="selected"
			:open="true"
			size="medium"
			:header="selected.name"
			:description="i18n.baseText('catalog.form.description')"
			@update:open="closeDialog"
		>
			<form :class="$style.form" data-test-id="catalog-runner" @submit.prevent="submit">
				<N8nInputLabel
					v-for="field in selected.fields"
					:key="field.name"
					:input-name="`catalog-input-${field.name}`"
					:label="field.name"
				>
					<N8nInput
						:id="`catalog-input-${field.name}`"
						v-model="inputs[field.name]"
						:name="field.name"
						:placeholder="field.type"
					/>
				</N8nInputLabel>

				<N8nDialogFooter>
					<N8nButton
						type="button"
						variant="outline"
						:disabled="runningId !== null"
						@click="closeDialog"
					>
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						type="submit"
						:loading="runningId !== null"
						data-test-id="catalog-submit-button"
					>
						{{ i18n.baseText('catalog.run') }}
					</N8nButton>
				</N8nDialogFooter>
			</form>
		</N8nDialog>
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

.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.runList {
	display: flex;
	flex-direction: column;
	list-style: none;
	padding: 0;
	margin: 0;
	border: var(--border);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.run {
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

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}
</style>
