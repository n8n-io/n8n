<script setup lang="ts">
import type { PolicyAction, TypeUsage } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nDataTableServer,
	N8nDropdownMenu,
	N8nEmptyState,
	N8nIcon,
	N8nInput,
	N8nNodeIcon,
	N8nPagination,
	N8nSelect2,
	N8nText,
	type DropdownMenuItemProps,
	type IconName,
	type TableHeader,
	type TableOptions,
	type TextColor,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import type { TypeIcon } from './instancePolicyTable.types';
import PolicySelectionBar from '../components/PolicySelectionBar.vue';
import type { InstanceTypeAccessRow } from './useInstanceTypeAccess';

export type InstancePolicyTableRow = InstanceTypeAccessRow & {
	displayName: string;
	icon: TypeIcon;
	/** Null when the counts are not known, so the usage cells show no value. */
	usage: TypeUsage | null;
};

type AccessFilter = 'all' | PolicyAction;

const props = defineProps<{
	rows: InstancePolicyTableRow[];
	loading: boolean;
	searchPlaceholder: string;
	noMatchText: string;
	/** A bulk change of the selection is in progress. */
	bulkBusy?: boolean;
}>();

const emit = defineEmits<{
	change: [name: string, access: PolicyAction, label: string];
	/** The admin gives the selected types the same access. */
	bulkChange: [types: Array<{ name: string; label: string }>, access: PolicyAction];
	open: [name: string];
}>();

/**
 * The names of the selected types. It is kept when the page, the search or the filter changes, so
 * the bar counts the selected rows that are hidden too.
 */
const selection = defineModel<string[]>('selection', { default: () => [] });

const i18n = useI18n();

const ACCESS_LABEL_KEY: Record<PolicyAction, BaseTextKey> = {
	allow: 'typeAvailabilityPolicies.instancePolicy.table.access.allow',
	deny: 'typeAvailabilityPolicies.instancePolicy.table.access.deny',
	delegate: 'typeAvailabilityPolicies.instancePolicy.table.access.delegate',
};

const ACCESS_ICON: Record<PolicyAction, { icon: IconName; color: TextColor }> = {
	allow: { icon: 'check', color: 'success' },
	deny: { icon: 'lock', color: 'danger' },
	delegate: { icon: 'lock-unlocked', color: 'secondary' },
};

const USAGE_COLUMNS: Array<{ key: keyof TypeUsage; title: BaseTextKey }> = [
	{ key: 'projects', title: 'typeAvailabilityPolicies.instancePolicy.table.projects' },
	{ key: 'uses', title: 'typeAvailabilityPolicies.instancePolicy.table.uses' },
	{ key: 'workflows', title: 'typeAvailabilityPolicies.instancePolicy.table.workflows' },
	{
		key: 'activeWorkflows',
		title: 'typeAvailabilityPolicies.instancePolicy.table.activeWorkflows',
	},
];

const ACCESS_ORDER: PolicyAction[] = ['allow', 'delegate', 'deny'];

const search = ref('');
const accessFilter = ref<AccessFilter>('all');
const sortBy = ref<TableOptions['sortBy']>([{ id: 'displayName', desc: false }]);
const page = ref(0);
const PAGE_SIZES = [10, 25, 50, 100];
const itemsPerPage = ref(25);

const headers = computed<Array<TableHeader<InstancePolicyTableRow>>>(() => [
	{
		// The table's own select column has no accessible names, and its header checkbox counts the
		// rows of every page, so this column renders the checkboxes.
		title: '',
		key: 'select',
		value: () => undefined,
		width: 40,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.name'),
		key: 'displayName',
		minWidth: 200,
	},
	{
		title: i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.access'),
		key: 'access',
		width: 136,
	},
	...USAGE_COLUMNS.map((column) => ({
		title: i18n.baseText(column.title),
		key: column.key,
		// A string value makes the first click sort low to high. With a number, the table starts high
		// to low, but only when the first visible row has a count.
		value: (row: InstancePolicyTableRow) =>
			row.usage?.[column.key].toString() ??
			i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.noValue'),
		width: 92,
	})),
]);

function isUsageKey(id: string | undefined): id is keyof TypeUsage {
	return USAGE_COLUMNS.some((column) => column.key === id);
}

type CompareRows = (a: InstancePolicyTableRow, b: InstancePolicyTableRow) => number;

const collator = new Intl.Collator();
const byName: CompareRows = (a, b) => collator.compare(a.displayName, b.displayName);

// The direction flips only the sorted column. Rows with the same value keep A to Z.
function compareRows(id: string | undefined, direction: number): CompareRows {
	if (id === 'access') {
		return (a, b) =>
			direction * (ACCESS_ORDER.indexOf(a.access) - ACCESS_ORDER.indexOf(b.access)) || byName(a, b);
	}
	if (isUsageKey(id)) {
		return (a, b) => {
			const aCount = a.usage?.[id];
			const bCount = b.usage?.[id];
			// Rows with no known usage stay last in both directions.
			return (
				Number(aCount === undefined) - Number(bCount === undefined) ||
				direction * ((aCount ?? 0) - (bCount ?? 0)) ||
				byName(a, b)
			);
		};
	}
	return (a, b) => direction * byName(a, b);
}

// Sorting first means a search or a filter only removes rows from a list that is already in order.
const sortedRows = computed(() => {
	const [sort] = sortBy.value;
	return [...props.rows].sort(compareRows(sort?.id, sort?.desc ? -1 : 1));
});

const searchedRows = computed(() => {
	const query = search.value.trim().toLowerCase();
	if (!query) return sortedRows.value;
	return sortedRows.value.filter(
		(row) =>
			row.displayName.toLowerCase().includes(query) || row.name.toLowerCase().includes(query),
	);
});

const filterOptions = computed(() => {
	const count = (access: PolicyAction) =>
		searchedRows.value.filter((row) => row.access === access).length;
	const options: Array<{ value: AccessFilter; label: string }> = [
		{
			value: 'all',
			label: i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.filter.all', {
				interpolate: { count: searchedRows.value.length },
			}),
		},
	];

	for (const access of ACCESS_ORDER) {
		const accessCount = count(access);
		// Open to project opt-in is rare, so it shows only when a row has it or it is the filter.
		if (access === 'delegate' && accessCount === 0 && accessFilter.value !== 'delegate') continue;
		options.push({
			value: access,
			label: i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.filter.option', {
				interpolate: { label: i18n.baseText(ACCESS_LABEL_KEY[access]), count: accessCount },
			}),
		});
	}

	return options;
});

function isAccessFilter(value: unknown): value is AccessFilter {
	return value === 'all' || ACCESS_ORDER.some((access) => access === value);
}

function onFilterChange(value: unknown) {
	if (isAccessFilter(value)) accessFilter.value = value;
}

const filteredRows = computed(() =>
	accessFilter.value === 'all'
		? searchedRows.value
		: searchedRows.value.filter((row) => row.access === accessFilter.value),
);

// With rows to show, an empty result means that the search or the filter removed all of them. The
// first load has no rows, so the message never replaces it.
const noMatch = computed(() => props.rows.length > 0 && filteredRows.value.length === 0);

const searchInput = useTemplateRef<InstanceType<typeof N8nInput>>('searchInput');

// The click removes the clear button, so the focus moves to the search box.
function clearSearchAndFilter() {
	search.value = '';
	accessFilter.value = 'all';
	searchInput.value?.focus();
}

const pageRows = computed(() =>
	filteredRows.value.slice(page.value * itemsPerPage.value, (page.value + 1) * itemsPerPage.value),
);

watch([search, accessFilter, sortBy, itemsPerPage], () => {
	page.value = 0;
});

// A change of access can move the last row of the last page out of the filter.
watch(
	() => filteredRows.value.length,
	(count) => {
		page.value = Math.min(page.value, Math.max(0, Math.ceil(count / itemsPerPage.value) - 1));
	},
);

const filter = useTemplateRef<{ focus: () => void }>('filter');
const root = useTemplateRef<HTMLElement>('root');

/**
 * Puts the focus on the name button of a type. When its row is not on the page, the focus goes to the
 * access filter, which decides which rows the table shows.
 */
function returnFocus(name: string | undefined) {
	const buttons = root.value?.querySelectorAll<HTMLElement>('[data-type-name]') ?? [];
	const button = [...buttons].find((element) => element.dataset.typeName === name);
	if (button) button.focus();
	else focusFilter();
}

function focusFilter() {
	filter.value?.focus();
}

// A change of access can take the focused row out of the table, or move it when the table is sorted
// by access. Both lose the focus to the body. A restriction applies after its usage check, so the
// focus can be on the Access button of the row by then.
watch(
	pageRows,
	async () => {
		const focused = document.activeElement;
		const focusedRow =
			focused instanceof HTMLElement
				? (focused.dataset.typeName ?? focused.dataset.accessOf)
				: undefined;
		if (focusedRow === undefined) return;
		await nextTick();
		if (document.activeElement === document.body) returnFocus(focusedRow);
	},
	{ flush: 'pre' },
);

defineExpose({ returnFocus });

const rowsByName = computed(() => new Map(props.rows.map((row) => [row.name, row])));
const selectedRows = computed(() =>
	selection.value.flatMap((name) => rowsByName.value.get(name) ?? []),
);

// A reload can remove a type, or a rule can make it read-only, so the selection keeps only the
// rows that the admin can still change.
watch(rowsByName, (rows) => {
	if (rows.size === 0) return;
	const kept = selection.value.filter((name) => rows.get(name)?.editable === true);
	if (kept.length !== selection.value.length) selection.value = kept;
});

const selectedNames = computed(() => new Set(selection.value));

/** Adds the names to the selection, or takes them out. The other selected names stay. */
function setSelected(names: string[], selected: boolean) {
	if (selected) {
		selection.value = [...new Set([...selection.value, ...names])];
	} else {
		const removed = new Set(names);
		selection.value = selection.value.filter((name) => !removed.has(name));
	}
}

// The page checkbox shows the state of this page only, so rows selected on other pages do not
// make it look checked.
const pageSelectableNames = computed(() =>
	pageRows.value.filter((row) => row.editable).map((row) => row.name),
);
const pageSelectedCount = computed(
	() => pageSelectableNames.value.filter((name) => selectedNames.value.has(name)).length,
);
const pageAllSelected = computed(
	() =>
		pageSelectableNames.value.length > 0 &&
		pageSelectedCount.value === pageSelectableNames.value.length,
);
const pageSomeSelected = computed(() => pageSelectedCount.value > 0 && !pageAllSelected.value);

// This selects the rows of every page that the search and the filter show, so with neither it
// selects all the types.
const selectableRows = computed(() => filteredRows.value.filter((row) => row.editable));
const allSelected = computed(() =>
	selectableRows.value.every((row) => selectedNames.value.has(row.name)),
);

function selectAll() {
	setSelected(
		selectableRows.value.map((row) => row.name),
		true,
	);
}

const canRestrict = computed(() => selectedRows.value.some((row) => row.access !== 'deny'));
const canAllow = computed(() => selectedRows.value.some((row) => row.access !== 'allow'));

const selectRowLabel = (row: InstancePolicyTableRow) =>
	i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.selectRow', {
		interpolate: { name: row.displayName },
	});

function onBulkChange(access: PolicyAction) {
	emit(
		'bulkChange',
		selectedRows.value.map((row) => ({ name: row.name, label: row.displayName })),
		access,
	);
}

/**
 * The bar leaves the DOM with the selection, so the focus goes to the checkbox of the page. A
 * disabled checkbox cannot take the focus, so then it goes to the filter.
 */
function focusSelectAll() {
	const selectPage = root.value?.querySelector<HTMLButtonElement>(
		'[data-test-id="instance-policy-select-page"]',
	);
	if (selectPage && !selectPage.disabled) selectPage.focus();
	else focusFilter();
}

watch(
	() => selection.value.length,
	async (count) => {
		if (count > 0 || !root.value?.contains(document.activeElement)) return;
		const focused = document.activeElement;
		await nextTick();
		if (focused && !focused.isConnected) focusSelectAll();
	},
	{ flush: 'pre' },
);

// This page sets only Allowed and Restricted. A row that the default action leaves open to project
// opt-in can still move to either. One list for each current access keeps the menus' props stable.
function menuItems(current: PolicyAction): Array<DropdownMenuItemProps<PolicyAction>> {
	return (['allow', 'deny'] as const).map((access) => ({
		id: access,
		label: i18n.baseText(ACCESS_LABEL_KEY[access]),
		checked: access === current,
	}));
}

const accessMenuItems = computed<Record<PolicyAction, Array<DropdownMenuItemProps<PolicyAction>>>>(
	() => ({ allow: menuItems('allow'), deny: menuItems('deny'), delegate: menuItems('delegate') }),
);

function onRowClick(_event: MouseEvent, { item }: { item: InstancePolicyTableRow }) {
	emit('open', item.name);
}

async function onAccessChange(row: InstancePolicyTableRow, access: PolicyAction) {
	if (access === row.access) return;
	emit('change', row.name, access, row.displayName);
	await nextTick();
	// The menu returns the focus to its trigger, which a row that left the filter took with it.
	if (!pageRows.value.some(({ name }) => name === row.name)) focusFilter();
}
</script>

<template>
	<div ref="root" :class="$style.table">
		<div :class="$style.controls">
			<slot name="toolbar-start" />
			<N8nInput
				ref="searchInput"
				v-model="search"
				:placeholder="searchPlaceholder"
				:class="$style.search"
				size="large"
				clearable
				data-test-id="instance-policy-search"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nSelect2
				ref="filter"
				:model-value="accessFilter"
				:items="filterOptions"
				size="large"
				icon="funnel"
				align="end"
				:class="$style.filter"
				:aria-label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.filter.label')"
				data-test-id="instance-policy-access-filter"
				@update:model-value="onFilterChange"
			/>
		</div>
		<!-- Focusable when disabled: a click that selects everything must not lose the focus. -->
		<N8nButton
			v-if="selectableRows.length > 0"
			:class="$style.selectAllButton"
			variant="ghost"
			size="small"
			:disabled="allSelected"
			focusable-when-disabled
			data-test-id="instance-policy-select-all"
			data-attr="instance-policy-select-all"
			:label="
				i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.selectAllPages', {
					adjustToNumber: selectableRows.length,
					interpolate: { count: String(selectableRows.length) },
				})
			"
			@click="selectAll"
		/>
		<!-- The reload after a save must not swap the message, and its clear button, for skeleton rows. -->
		<N8nDataTableServer
			v-model:sort-by="sortBy"
			:headers="headers"
			:items="pageRows"
			:items-length="filteredRows.length"
			:loading="loading && !noMatch"
			item-value="name"
			:pin-columns="2"
			:pagination="false"
			data-test-id="instance-policy-table"
			:row-props="{ class: $style.row }"
			@click:row="onRowClick"
		>
			<template v-if="noMatch" #cover>
				<N8nEmptyState
					size="small"
					:description="noMatchText"
					:button-text="
						i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.noMatch.clear')
					"
					data-test-id="instance-policy-no-match"
					@click:button="clearSearchAndFilter"
				/>
			</template>
			<template #[`header.select`]>
				<N8nCheckbox
					:model-value="pageAllSelected"
					:indeterminate="pageSomeSelected"
					:disabled="pageSelectableNames.length === 0"
					:aria-label="i18n.baseText('typeAvailabilityPolicies.instancePolicy.bulk.selectPage')"
					data-test-id="instance-policy-select-page"
					@update:model-value="(value: boolean) => setSelected(pageSelectableNames, value)"
				/>
			</template>
			<template #[`item.select`]="{ item }">
				<!-- A click on the checkbox selects the row and does not also open it. -->
				<div :class="$style.select" @click.stop>
					<N8nCheckbox
						:model-value="selectedNames.has(item.name)"
						:disabled="!item.editable"
						:aria-label="selectRowLabel(item)"
						@update:model-value="(value: boolean) => setSelected([item.name], value)"
					/>
				</div>
			</template>
			<template #[`item.displayName`]="{ item }">
				<!-- A row is not focusable, so the name is the button that keyboard users reach. -->
				<button
					type="button"
					:class="$style.name"
					:data-test-id="`instance-policy-open-${item.name}`"
					:data-type-name="item.name"
					@click.stop="emit('open', item.name)"
				>
					<N8nNodeIcon v-bind="item.icon" :size="20" :class="$style.nameIcon" />
					<N8nText color="text-dark" bold :class="$style.nameText">{{ item.displayName }}</N8nText>
				</button>
			</template>
			<template #[`item.access`]="{ item }">
				<N8nDropdownMenu
					v-if="item.editable"
					:items="accessMenuItems[item.access]"
					placement="bottom-start"
					:data-test-id="`instance-policy-access-${item.name}`"
					@select="(access: PolicyAction) => onAccessChange(item, access)"
				>
					<template #trigger>
						<!-- The menu opens on its own, so the click must not also open the row. -->
						<N8nButton
							variant="ghost"
							size="small"
							:data-access-of="item.name"
							:aria-label="
								i18n.baseText('typeAvailabilityPolicies.instancePolicy.table.access.ariaLabel', {
									interpolate: { name: item.displayName },
								})
							"
							@click.stop
						>
							<!-- A spinner and not a disabled button: a disabled button loses the focus. -->
							<N8nIcon
								v-if="item.checking"
								icon="loader-circle"
								size="small"
								spin
								:data-test-id="`instance-policy-access-checking-${item.name}`"
							/>
							<N8nIcon v-else v-bind="ACCESS_ICON[item.access]" size="small" />
							{{ i18n.baseText(ACCESS_LABEL_KEY[item.access]) }}
							<N8nIcon icon="chevron-down" size="small" />
						</N8nButton>
					</template>
					<template #item-leading="{ item: menuItem, ui }">
						<N8nIcon v-bind="ACCESS_ICON[menuItem.id]" :class="ui.class" />
					</template>
				</N8nDropdownMenu>
				<div v-else :class="$style.readOnly" :data-test-id="`instance-policy-access-${item.name}`">
					<N8nIcon v-bind="ACCESS_ICON[item.access]" size="small" />
					<N8nText>{{ i18n.baseText(ACCESS_LABEL_KEY[item.access]) }}</N8nText>
				</div>
			</template>
		</N8nDataTableServer>
		<div v-if="filteredRows.length > PAGE_SIZES[0]" :class="$style.footer">
			<N8nPagination
				v-model:items-per-page="itemsPerPage"
				:page="page + 1"
				:page-sizes="PAGE_SIZES"
				:total="filteredRows.length"
				:show-total="false"
				@update:page="(value: number) => (page = value - 1)"
			/>
		</div>
		<PolicySelectionBar
			:count="selectedRows.length"
			:can-restrict="canRestrict"
			:can-allow="canAllow"
			:busy="bulkBusy"
			@restrict="onBulkChange('deny')"
			@allow="onBulkChange('allow')"
			@clear="selection = []"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.table {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.search {
	/* No width token fits; this matches the search box of the design. */
	width: 292px;
	flex-shrink: 0;
}

.filter {
	/* No width token fits; this matches the filter of the design. */
	width: 232px;
	margin-inline-start: auto;
}

.selectAllButton {
	align-self: flex-start;
}

.row {
	cursor: pointer;
}

.select {
	display: flex;
	align-items: center;
	cursor: default;
}

.name,
.readOnly {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.name {
	/* The cell clips a wider button, and the focus ring with it, so a long name truncates instead. */
	max-width: 100%;
	padding: var(--spacing--5xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	font: inherit;
	text-align: start;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
		/* The table cell clips what lies outside the button, so the ring sits inside the padding. */
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.nameIcon {
	flex-shrink: 0;
}

.nameText {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
