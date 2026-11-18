<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nStatusDot,
	N8nText,
} from '@n8n/design-system';
import type { SegmentOption, StatusDotVariant } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import SourceBadge from '@/features/projectSettingsPrototype/components/SourceBadge.vue';
import { CREDENTIAL_TYPES, NODE_TYPES } from '@/features/projectSettingsPrototype/data/catalog';
import {
	credentialUsageFor,
	nodeUsageFor,
} from '@/features/projectSettingsPrototype/data/resources';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type { CatalogIcon } from '@/features/projectSettingsPrototype/data/types';
import {
	resolveAccess,
	type AccessAction,
	type AccessState,
	type ResolvedAccess,
} from '@/features/projectSettingsPrototype/state/resolve';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	applyAccessAction,
	instanceRule,
	projectAccessFlags,
	seedKey,
	store,
	type AccessKind,
} from '@/features/projectSettingsPrototype/state/store';

const props = defineProps<{ projectId: string }>();

type Filter = 'all' | 'changed' | 'restricted' | 'not-enabled';

interface AccessRow {
	id: string;
	name: string;
	/** Only node types have one. */
	category: string | undefined;
	iconUrl: string | undefined;
	glyph: string;
	/** Workflows that use the node type, or credentials of the credential type. */
	usage: number;
	usageNote: string | undefined;
	/** In use, though the project's workflows can't use it. */
	usageBlocked: boolean;
	resolved: ResolvedAccess;
}

const FILTERS: Array<{ value: Filter; label: string }> = [
	{ value: 'all', label: 'All' },
	{ value: 'changed', label: 'Changed in this project' },
	{ value: 'restricted', label: 'Restricted' },
	{ value: 'not-enabled', label: 'Not enabled' },
];

const STATE_LABELS: Record<AccessState, string> = {
	allowed: 'Allowed',
	restricted: 'Restricted',
	'not-enabled': 'Not enabled',
};

const STATE_DOTS: Record<AccessState, StatusDotVariant> = {
	allowed: 'success',
	restricted: 'danger',
	'not-enabled': 'neutral',
};

const ACTION_LABELS: Record<AccessAction, string> = {
	restrict: 'Restrict',
	'allow-again': 'Allow again',
	enable: 'Enable',
	disable: 'Disable',
};

const ACTION_TOASTS: Record<AccessAction, (name: string) => string> = {
	restrict: (name) => `${name} restricted`,
	'allow-again': (name) => `${name} allowed again`,
	enable: (name) => `${name} enabled`,
	disable: (name) => `${name} disabled`,
};

/** How the copy names one type, and several, of each kind. */
const KIND_NOUNS: Record<AccessKind, { one: string; many: string }> = {
	node: { one: 'node', many: 'nodes' },
	credential: { one: 'credential type', many: 'credential types' },
};

const FALLBACK_GLYPHS: Record<AccessKind, string> = {
	node: 'box',
	credential: 'key-round',
};

const can = useCan();
const toast = useToast();
const uiStore = useUIStore();

const kind = ref<AccessKind>('node');
const search = ref('');
const filter = ref<Filter>('all');

const canEdit = computed(() => can('project:settings:edit'));
/** When the instance doesn't let projects decide, every row is locked. */
const projectsDecide = computed(() => store.instance.allowProjects.access);
const isDark = computed(() => uiStore.appliedTheme === 'dark');

const fixtureKey = computed(() => seedKey(props.projectId));
const nodeUsage = computed(() => nodeUsageFor(fixtureKey.value));
const credentialUsage = computed(() => credentialUsageFor(fixtureKey.value));

const plural = (count: number, one: string, many: string) =>
	`${formatNumber(count)} ${count === 1 ? one : many}`;

function usageNoteFor(rowKind: AccessKind, count: number): string | undefined {
	if (count === 0) return undefined;
	return rowKind === 'node'
		? `Used in ${plural(count, 'workflow', 'workflows')}`
		: `${plural(count, 'credential', 'credentials')} in this project`;
}

/** The file for the theme on show. A missing file falls back to the glyph. */
function iconUrlFor(icon: CatalogIcon): string | undefined {
	if (isDark.value && icon.darkFile) return icon.darkFile;
	return icon.file ? icon.file : undefined;
}

function buildRow(
	rowKind: AccessKind,
	type: { id: string; name: string; icon: CatalogIcon },
	category: string | undefined,
	usage: number,
): AccessRow {
	const resolved = resolveAccess(
		instanceRule(rowKind, type.id),
		projectAccessFlags(props.projectId, rowKind, type.id),
		projectsDecide.value,
	);
	return {
		id: type.id,
		name: type.name,
		category,
		iconUrl: iconUrlFor(type.icon),
		glyph: type.icon.glyph ?? FALLBACK_GLYPHS[rowKind],
		usage,
		usageNote: usageNoteFor(rowKind, usage),
		usageBlocked: usage > 0 && resolved.state !== 'allowed',
		resolved,
	};
}

const byName = (a: AccessRow, b: AccessRow) => a.name.localeCompare(b.name);

const nodeRows = computed(() =>
	NODE_TYPES.map((type) =>
		buildRow('node', type, type.category, nodeUsage.value.get(type.id) ?? 0),
	).sort(byName),
);

const credentialRows = computed(() =>
	CREDENTIAL_TYPES.map((type) =>
		buildRow('credential', type, undefined, credentialUsage.value.get(type.id) ?? 0),
	).sort(byName),
);

const rows = computed(() => (kind.value === 'node' ? nodeRows.value : credentialRows.value));

const kindOptions = computed<Array<SegmentOption<AccessKind>>>(() => [
	{ value: 'node', label: 'Nodes', data: { count: nodeRows.value.length } },
	{ value: 'credential', label: 'Credentials', data: { count: credentialRows.value.length } },
]);

/* ── Search and filter ────────────────────────────────────────────────── */

const query = computed(() => search.value.trim().toLowerCase());

function matchesFilter(row: AccessRow): boolean {
	switch (filter.value) {
		case 'changed':
			return row.resolved.source === 'project';
		case 'restricted':
			return row.resolved.state === 'restricted';
		case 'not-enabled':
			return row.resolved.state === 'not-enabled';
		default:
			return true;
	}
}

const visibleRows = computed(() =>
	rows.value.filter(
		(row) =>
			matchesFilter(row) &&
			(!query.value ||
				row.name.toLowerCase().includes(query.value) ||
				(row.category?.toLowerCase().includes(query.value) ?? false)),
	),
);

function onFilterChange(value: unknown) {
	filter.value = FILTERS.find((entry) => entry.value === value)?.value ?? 'all';
}

/** What this project changed for the kind on show: "2 restricted in this project, 2 enabled in this project". */
const summary = computed(() => {
	const changed = rows.value.filter((row) => row.resolved.source === 'project');
	const restricted = changed.filter((row) => row.resolved.state === 'restricted').length;
	const enabled = changed.length - restricted;

	const parts: string[] = [];
	if (restricted > 0) parts.push(`${formatNumber(restricted)} restricted in this project`);
	if (enabled > 0) parts.push(`${formatNumber(enabled)} enabled in this project`);
	return parts.length > 0
		? parts.join(', ')
		: `Every ${KIND_NOUNS[kind.value].one} follows the instance`;
});

const shownLabel = computed(() =>
	visibleRows.value.length === rows.value.length
		? undefined
		: `${formatNumber(visibleRows.value.length)} of ${formatNumber(rows.value.length)} shown`,
);

/* ── Actions ──────────────────────────────────────────────────────────── */

function inUseMessage(rowKind: AccessKind, count: number): string {
	if (rowKind === 'node') {
		return count === 1
			? '1 workflow in this project uses this node.'
			: `${formatNumber(count)} workflows in this project use this node.`;
	}
	return count === 1
		? '1 credential in this project is of this type.'
		: `${formatNumber(count)} credentials in this project are of this type.`;
}

function onAction(row: AccessRow) {
	const { action } = row.resolved;
	if (!action) return;

	applyAccessAction(props.projectId, kind.value, row.id, action);
	toast.showMessage({
		title: ACTION_TOASTS[action](row.name),
		...(action === 'restrict' && row.usage > 0
			? { message: inUseMessage(kind.value, row.usage) }
			: {}),
		type: 'success',
	});
}
</script>

<template>
	<div :class="$style.page" data-test-id="proto-access-page">
		<N8nCallout
			v-if="!projectsDecide"
			theme="secondary"
			icon="lock"
			data-test-id="proto-access-locked-callout"
		>
			Instance admins decide this for every project.
			<RouterLink to="/settings/policies" data-test-id="proto-access-policies-link">
				View instance policies
			</RouterLink>
		</N8nCallout>

		<section :class="$style.section">
			<div :class="$style.toolbar">
				<N8nSegmentControl
					v-model="kind"
					:options="kindOptions"
					aria-label="Type"
					data-test-id="proto-access-kind"
				>
					<template #option="option">
						<span :class="$style.kindOption">
							{{ option.label }}
							<span :class="$style.kindCount">{{ option.data?.count }}</span>
						</span>
					</template>
				</N8nSegmentControl>
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="medium"
					:placeholder="kind === 'node' ? 'Search nodes' : 'Search credential types'"
					:aria-label="kind === 'node' ? 'Search nodes' : 'Search credential types'"
					clearable
					data-test-id="proto-access-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nSelect
					:model-value="filter"
					:class="$style.filter"
					size="medium"
					aria-label="Filter by state"
					data-test-id="proto-access-filter"
					@update:model-value="onFilterChange"
				>
					<N8nOption
						v-for="option in FILTERS"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</div>

			<div :class="$style.summary">
				<N8nText size="small" color="text-base" data-test-id="proto-access-summary">
					{{ projectsDecide ? summary : 'Every project follows the instance' }}
				</N8nText>
				<N8nText v-if="shownLabel" size="small" color="text-light">{{ shownLabel }}</N8nText>
			</div>

			<ul
				v-if="visibleRows.length > 0"
				:class="[$style.list, { [$style.withActions]: canEdit }]"
				data-test-id="proto-access-list"
			>
				<li
					v-for="row in visibleRows"
					:key="`${kind}:${row.id}`"
					:class="$style.row"
					:data-test-id="`proto-access-row-${row.id}`"
					:data-state="row.resolved.state"
					:data-source="row.resolved.source"
				>
					<span :class="$style.icon" aria-hidden="true">
						<img v-if="row.iconUrl" :class="$style.iconImage" :src="row.iconUrl" alt="" />
						<N8nIcon v-else :icon="row.glyph" size="large" />
					</span>

					<div :class="$style.main">
						<N8nText :class="$style.name" bold color="text-dark">{{ row.name }}</N8nText>
						<div v-if="row.category || row.usageNote" :class="$style.meta">
							<N8nText v-if="row.category" size="small" color="text-light">
								{{ row.category }}
							</N8nText>
							<N8nText
								v-if="row.usageNote"
								:class="{ [$style.usageBlocked]: row.usageBlocked }"
								size="small"
								color="text-light"
								data-test-id="proto-access-usage"
							>
								{{ row.usageNote }}
							</N8nText>
						</div>
					</div>

					<span :class="$style.state" data-test-id="proto-access-state">
						<N8nStatusDot
							:variant="STATE_DOTS[row.resolved.state]"
							:appearance="row.resolved.state === 'not-enabled' ? 'outline' : 'fill'"
						/>
						<N8nText size="small" color="text-dark">{{ STATE_LABELS[row.resolved.state] }}</N8nText>
					</span>

					<span :class="$style.source">
						<SourceBadge :source="row.resolved.source" />
					</span>

					<span v-if="canEdit" :class="$style.action">
						<N8nButton
							v-if="row.resolved.action"
							variant="outline"
							size="small"
							:aria-label="`${ACTION_LABELS[row.resolved.action]} ${row.name}`"
							:data-test-id="`proto-access-action-${row.resolved.action}`"
							@click="onAction(row)"
						>
							{{ ACTION_LABELS[row.resolved.action] }}
						</N8nButton>
					</span>
				</li>
			</ul>
			<div v-else :class="$style.empty" data-test-id="proto-access-empty">
				<N8nText size="small" color="text-light">
					No {{ KIND_NOUNS[kind].many }} match. Try a different search or filter.
				</N8nText>
			</div>
		</section>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.kindOption {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}

.kindCount {
	color: var(--text-color--subtler);
	font-variant-numeric: tabular-nums;
}

.search {
	flex: 1 1 var(--spacing--5xl);
	min-width: 0;
	margin-inline-start: auto;
	max-width: calc(var(--spacing--5xl) * 1.25);
}

.filter {
	flex: 0 0 auto;
	width: calc(var(--spacing--4xl) * 1.75);
}

.summary {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

/* One grid for the whole list, so the state, source, and action line up in every row. */
.list {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto auto;
	margin: 0;
	padding: 0;
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	list-style: none;
	overflow: clip;
}

.withActions {
	grid-template-columns: auto minmax(0, 1fr) auto auto auto;
}

.row {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
	align-items: center;
	column-gap: var(--spacing--sm);
	min-height: var(--height--3xl);
	padding: var(--spacing--2xs) var(--spacing--sm);

	& + & {
		border-block-start: var(--border);
		border-block-start-color: var(--border-color--subtle);
	}
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	color: var(--text-color--subtle);
}

.iconImage {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	column-gap: var(--spacing--2xs);

	> * + * {
		padding-inline-start: var(--spacing--2xs);
		border-inline-start: var(--border);
	}
}

.meta .usageBlocked {
	color: var(--text-color--warning);
}

.state {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
}

.source {
	display: inline-flex;
	align-items: center;
}

.action {
	display: flex;
	justify-content: flex-end;
}

.empty {
	padding: var(--spacing--lg) var(--spacing--sm);
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	text-align: center;
}
</style>
