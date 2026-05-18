<script setup lang="ts">
import { N8nBadge, N8nCheckbox, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { EvalVersionEntry } from '../../evalCollections.types';
import VersionAvatar from '../shared/VersionAvatar.vue';

const props = defineProps<{
	versions: EvalVersionEntry[];
	selectedVersionIds: Set<string>;
	datasetLabel: string;
}>();

const emit = defineEmits<{
	'toggle-version': [versionKey: string];
	'open-quick-view': [versionKey: string];
}>();

const i18n = useI18n();

// Canonical key for a version row. `workflowVersionId === null` represents
// the "Current draft" row — the server will snapshot it on submit, so we
// must still be able to select it. Stringifying makes the key safe to use
// in a Set without `null` collisions across rows.
const rowKey = (v: EvalVersionEntry) => v.workflowVersionId ?? '__draft__';

interface Row {
	key: string;
	index: number; // assigned only after sort, so avatar color follows display order
	version: EvalVersionEntry;
	checked: boolean;
}

const rows = computed<Row[]>(() =>
	props.versions.map((version, idx) => ({
		key: rowKey(version),
		index: idx,
		version,
		checked: props.selectedVersionIds.has(rowKey(version)),
	})),
);

const formatScore = (value: number | null) => {
	if (value === null) return '—';
	return `${Math.round(value * 100)}%`;
};

const formatRunAt = (iso: string | null) => {
	if (!iso) return i18n.baseText('evaluation.setup.versions.noRunYet');
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};
</script>

<template>
	<div :class="$style.wrap" data-test-id="versions-table">
		<div :class="$style.header">
			<div :class="$style.col_check" />
			<div :class="$style.col_version">
				<N8nText size="small" color="text-light" bold>
					{{ i18n.baseText('evaluation.setup.versions.col.version') }}
				</N8nText>
			</div>
			<div :class="$style.col_lastRun">
				<N8nText size="small" color="text-light" bold>
					{{
						i18n.baseText('evaluation.setup.versions.col.lastRun', {
							interpolate: { dataset: datasetLabel },
						})
					}}
				</N8nText>
			</div>
			<div :class="$style.col_score">
				<N8nText size="small" color="text-light" bold>
					{{ i18n.baseText('evaluation.setup.versions.col.avgScore') }}
				</N8nText>
			</div>
			<div :class="$style.col_action" />
		</div>

		<div v-if="rows.length === 0" :class="$style.empty">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('evaluation.setup.versions.empty') }}
			</N8nText>
		</div>

		<div
			v-for="row in rows"
			:key="row.key"
			:class="[$style.row, row.checked && $style.row_selected]"
			data-test-id="versions-table-row"
			@click="emit('toggle-version', row.key)"
		>
			<div :class="$style.col_check">
				<N8nCheckbox
					:model-value="row.checked"
					data-test-id="versions-table-row-checkbox"
					@click.stop
					@update:model-value="emit('toggle-version', row.key)"
				/>
			</div>
			<div :class="$style.col_version">
				<VersionAvatar :index="row.index" size="small" />
				<div :class="$style.versionMeta">
					<N8nText size="small" color="text-dark" bold>{{ row.version.label }}</N8nText>
					<N8nText size="xsmall" color="text-light">{{ row.version.sourceLabel }}</N8nText>
				</div>
			</div>
			<div :class="$style.col_lastRun">
				<N8nBadge v-if="!row.version.lastRun" theme="tertiary" size="small">
					{{ i18n.baseText('evaluation.setup.versions.noRunYet') }}
				</N8nBadge>
				<N8nText v-else size="small" color="text-base">
					{{ formatRunAt(row.version.lastRun.runAt) }}
				</N8nText>
			</div>
			<div :class="$style.col_score">
				<N8nText
					size="small"
					:color="row.version.lastRun?.isCritical ? 'danger' : 'text-dark'"
					bold
				>
					{{ formatScore(row.version.lastRun?.avgScore ?? null) }}
				</N8nText>
				<N8nBadge
					v-if="row.version.lastRun?.isBest"
					theme="success"
					size="small"
					data-test-id="versions-table-row-best"
				>
					<N8nIcon icon="star" size="xsmall" />
					{{ i18n.baseText('evaluation.setup.versions.bestPill') }}
				</N8nBadge>
				<N8nBadge
					v-else-if="row.version.lastRun?.isCritical"
					theme="danger"
					size="small"
					data-test-id="versions-table-row-low"
				>
					<N8nIcon icon="triangle-alert" size="xsmall" />
					{{ i18n.baseText('evaluation.setup.versions.lowPill') }}
				</N8nBadge>
			</div>
			<div :class="$style.col_action">
				<button
					type="button"
					:class="$style.viewLink"
					data-test-id="versions-table-row-view"
					@click.stop="emit('open-quick-view', row.key)"
				>
					<N8nIcon icon="arrow-up-right" size="xsmall" />
					{{ i18n.baseText('evaluation.setup.versions.viewAction') }}
				</button>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.wrap {
	border: 1px solid var(--border-color--base, var(--color--neutral-200));
	border-radius: var(--radius--md);
	background: var(--background--surface);
	overflow: hidden;
}

.header,
.row {
	display: grid;
	grid-template-columns: 36px 2.2fr 1.5fr 1.2fr 80px;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.header {
	background: var(--background--subtle);
	border-bottom: 1px solid var(--border-color--base, var(--color--neutral-200));
}

.row {
	border-bottom: 1px solid var(--border-color--subtle, var(--color--neutral-100));
	cursor: pointer;
	transition: background-color var(--transition-duration--fast) ease;
}

.row:last-child {
	border-bottom: none;
}

.row:hover {
	background: var(--background--hover);
}

.row_selected {
	background: var(--background--subtle);
}

.col_check {
	display: flex;
	justify-content: center;
}

.col_version {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.versionMeta {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.col_lastRun {
	min-width: 0;
}

.col_score {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.col_action {
	display: flex;
	justify-content: flex-end;
}

.viewLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	padding: 0;
	color: var(--color--brand, var(--color--orange-500));
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
}

.viewLink:hover {
	text-decoration: underline;
}

.empty {
	padding: var(--spacing--md);
	text-align: center;
}
</style>
