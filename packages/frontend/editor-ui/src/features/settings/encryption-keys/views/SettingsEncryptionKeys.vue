<script lang="ts" setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { useI18n } from '@n8n/i18n';
import {
	N8nAlertDialog,
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nDateRangePicker,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nText,
	type DateRange,
	type DateValue,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import { useClipboard } from '@/app/composables/useClipboard';

import { useEncryptionKeysStore } from '../encryption-keys.store';
import type { EncryptionKey, EncryptionKeySortField } from '../encryption-keys.types';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { showMessage, showError } = useToast();
const clipboard = useClipboard();
const store = useEncryptionKeysStore();

const DOCS_URL = 'https://docs.n8n.io/hosting/configuration/encryption-keys/';

const SORT_FIELDS: readonly EncryptionKeySortField[] = ['createdAt', 'updatedAt', 'status'];

// Drives the date-input segment order in the picker (e.g. dd/mm/yyyy vs mm/dd/yyyy).
// Falls back to a sensible default if the browser does not expose a language.
const browserLocale =
	typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-GB';

const isConfirmRotateOpen = ref(false);

const sortOptions = computed<Array<{ value: EncryptionKeySortField; label: string }>>(() => [
	{ value: 'createdAt', label: i18n.baseText('settings.encryptionKeys.sortBy.activated') },
	{ value: 'updatedAt', label: i18n.baseText('settings.encryptionKeys.sortBy.archived') },
	{ value: 'status', label: i18n.baseText('settings.encryptionKeys.sortBy.type') },
]);

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

const formatDate = (value: string | null) => {
	if (!value) return '—';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '—';
	return dateFormatter.format(parsed);
};

const maskId = (id: string) => {
	if (id.length <= 8) return id;
	return `${id.slice(0, 4)}••••••••${id.slice(-4)}`;
};

const headers = computed<Array<TableHeader<EncryptionKey>>>(() => [
	{
		title: i18n.baseText('settings.encryptionKeys.column.key'),
		key: 'id',
		value: (row) => row.id,
		minWidth: 220,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.type'),
		key: 'status',
		value: (row) => row.status,
		minWidth: 120,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.activated'),
		key: 'createdAt',
		value: (row) => row.createdAt,
		minWidth: 140,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.archived'),
		key: 'updatedAt',
		value: (row) => (row.status === 'inactive' ? row.updatedAt : ''),
		minWidth: 140,
	},
]);

const archiveDate = (key: EncryptionKey): string | null =>
	key.status === 'inactive' ? key.updatedAt : null;

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: 25,
	sortBy: [{ id: 'createdAt', desc: true }],
});

const isSortField = (id: string): id is EncryptionKeySortField =>
	(SORT_FIELDS as readonly string[]).includes(id);

const sortByModel = computed<EncryptionKeySortField>({
	get: () => store.sort.field,
	set: (field: EncryptionKeySortField) => {
		store.setSort({ field, direction: store.sort.direction });
		tableOptions.value = {
			...tableOptions.value,
			page: 0,
			sortBy: [{ id: field, desc: store.sort.direction === 'desc' }],
		};
		void refetch();
	},
});

const isFilterOpen = ref(false);

const stringToDateValue = (value: string | null): DateValue | undefined => {
	if (!value) return undefined;
	try {
		// `value` is an ISO datetime in the store, but the picker reads only
		// the calendar-day component. Slice off the time portion before parsing.
		return parseDate(value.slice(0, 10));
	} catch {
		return undefined;
	}
};

const dateValueToString = (value: DateValue | undefined): string | null =>
	value ? value.toString() : null;

/**
 * Convert a local-calendar day (`YYYY-MM-DD`) into the start-of-day instant
 * in the user's local timezone, expressed as ISO. Without `Z`, `new Date(...)`
 * parses a local-time wall clock — which is what we want here.
 */
const localDayToIsoStart = (day: string) => new Date(`${day}T00:00:00`).toISOString();

/**
 * Convert a local-calendar day to the end-of-day instant (23:59:59.999) in the
 * user's local timezone, expressed as ISO. Used as the inclusive upper bound
 * so a single-day filter `from=to=2026-04-21` includes all keys created during
 * the user's local 2026-04-21.
 */
const localDayToIsoEnd = (day: string) => {
	const d = new Date(`${day}T00:00:00`);
	d.setDate(d.getDate() + 1);
	d.setMilliseconds(d.getMilliseconds() - 1);
	return d.toISOString();
};

const draftRange = shallowRef<DateRange>({
	start: stringToDateValue(store.filters.activatedFrom),
	end: stringToDateValue(store.filters.activatedTo),
});

const seedDraftFromStore = () => {
	draftRange.value = {
		start: stringToDateValue(store.filters.activatedFrom),
		end: stringToDateValue(store.filters.activatedTo),
	};
};

watch(isFilterOpen, (open) => {
	if (open) seedDraftFromStore();
});

const hasActiveFilter = computed(
	() => store.filters.activatedFrom !== null || store.filters.activatedTo !== null,
);

const refetch = async () => {
	try {
		await store.fetchKeys();
	} catch (error) {
		showError(error, i18n.baseText('settings.encryptionKeys.loadError'));
	}
};

const onUpdateOptions = async (next: TableOptions) => {
	tableOptions.value = next;
	// Only forward sort/page-size changes when they actually changed, otherwise
	// the store's reset-to-page-0 side effects would silently override an
	// in-flight page change.
	if (store.itemsPerPage !== next.itemsPerPage) {
		store.setItemsPerPage(next.itemsPerPage);
	}
	if (next.sortBy.length > 0) {
		const first = next.sortBy[0];
		const field = isSortField(first.id) ? first.id : 'createdAt';
		const direction = first.desc ? 'desc' : 'asc';
		if (store.sort.field !== field || store.sort.direction !== direction) {
			store.setSort({ field, direction });
		}
	}
	// Apply page last so the user's selected page wins over any reset side effect.
	store.setPage(next.page);
	await refetch();
};

const onApplyFilter = async () => {
	const startDay = dateValueToString(draftRange.value.start as CalendarDate | undefined);
	const endDay = dateValueToString(draftRange.value.end as CalendarDate | undefined);

	store.setFilters({
		activatedFrom: startDay ? localDayToIsoStart(startDay) : null,
		activatedTo: endDay ? localDayToIsoEnd(endDay) : null,
	});
	tableOptions.value = { ...tableOptions.value, page: 0 };
	isFilterOpen.value = false;
	await refetch();
};

const onClearFilter = async () => {
	store.resetFilters();
	tableOptions.value = { ...tableOptions.value, page: 0 };
	seedDraftFromStore();
	isFilterOpen.value = false;
	await refetch();
};

const openRotateConfirm = () => {
	isConfirmRotateOpen.value = true;
};

const closeRotateConfirm = () => {
	if (!store.isRotating) {
		isConfirmRotateOpen.value = false;
	}
};

const onConfirmRotate = async () => {
	try {
		await store.rotateKey();
		// Sync table chrome with the store's reset to page 0 / createdAt:desc.
		tableOptions.value = {
			...tableOptions.value,
			page: 0,
			sortBy: [{ id: 'createdAt', desc: true }],
		};
		isConfirmRotateOpen.value = false;
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.encryptionKeys.rotate.success'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.encryptionKeys.rotate.error'));
	}
};

const copyKeyId = async (id: string) => {
	await clipboard.copy(id);
	showMessage({
		type: 'success',
		title: i18n.baseText('settings.encryptionKeys.copyId.success'),
	});
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.encryptionKeys.title'));
	await refetch();
});
</script>

<template>
	<div :class="$style.page" data-testid="settings-encryption-keys">
		<header :class="$style.header">
			<N8nHeading tag="h1" size="2xlarge" bold>
				{{ i18n.baseText('settings.encryptionKeys.title') }}
			</N8nHeading>
			<N8nText color="text-base">
				{{ i18n.baseText('settings.encryptionKeys.description') }}
				<N8nLink :href="DOCS_URL" new-window>
					{{ i18n.baseText('settings.encryptionKeys.description.docsLink') }}
				</N8nLink>
			</N8nText>
		</header>

		<div :class="$style.controls">
			<div :class="$style.sortControl">
				<N8nText tag="label" color="text-light" size="small" :class="$style.sortLabel">
					{{ i18n.baseText('settings.encryptionKeys.sortBy.label') }}
				</N8nText>
				<N8nSelect
					v-model="sortByModel"
					data-testid="encryption-keys-sort-select"
					size="medium"
					:class="$style.sortSelect"
				>
					<N8nOption
						v-for="option in sortOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</div>

			<N8nDateRangePicker v-model="draftRange" v-model:open="isFilterOpen" :locale="browserLocale">
				<template #trigger>
					<N8nIconButton
						icon="funnel"
						type="tertiary"
						size="medium"
						data-testid="encryption-keys-filter-button"
						:title="i18n.baseText('settings.encryptionKeys.filter.title')"
					/>
				</template>
				<template #footer>
					<div :class="$style.filterFooter">
						<N8nButton
							v-if="hasActiveFilter"
							variant="ghost"
							size="small"
							:label="i18n.baseText('settings.encryptionKeys.filter.clear')"
							data-testid="encryption-keys-filter-clear"
							@click="onClearFilter"
						/>
						<N8nButton
							variant="solid"
							size="small"
							:label="i18n.baseText('settings.encryptionKeys.filter.apply')"
							data-testid="encryption-keys-filter-apply"
							@click="onApplyFilter"
						/>
					</div>
				</template>
			</N8nDateRangePicker>

			<N8nButton
				type="primary"
				size="medium"
				:loading="store.isRotating"
				data-testid="encryption-keys-rotate-button"
				@click="openRotateConfirm"
			>
				<N8nIcon
					icon="refresh-cw"
					:class="[$style.rotateIcon, { [$style.isRotating]: store.isRotating }]"
				/>
				{{ i18n.baseText('settings.encryptionKeys.rotate.button') }}
			</N8nButton>
		</div>

		<div :class="$style.tableWrapper">
			<N8nDataTableServer
				v-model:sort-by="tableOptions.sortBy"
				v-model:page="tableOptions.page"
				v-model:items-per-page="tableOptions.itemsPerPage"
				:headers="headers"
				:items="store.items"
				:items-length="store.totalCount"
				:loading="store.isLoading"
				:page-sizes="[10, 25, 50]"
				data-testid="encryption-keys-table"
				@update:options="onUpdateOptions"
			>
				<template #[`item.id`]="{ item }">
					<div :class="$style.keyCell">
						<code :class="$style.keyValue">{{ maskId(item.id) }}</code>
						<N8nIconButton
							icon="copy"
							type="tertiary"
							size="mini"
							data-testid="encryption-keys-copy-id-button"
							:title="i18n.baseText('settings.encryptionKeys.copyId.success')"
							@click="copyKeyId(item.id)"
						/>
					</div>
				</template>

				<template #[`item.status`]="{ item }">
					<N8nBadge :theme="item.status === 'active' ? 'success' : 'default'" size="small">
						<N8nIcon :icon="item.status === 'active' ? 'circle-check' : 'circle'" size="xsmall" />
						{{
							i18n.baseText(
								item.status === 'active'
									? 'settings.encryptionKeys.status.active'
									: 'settings.encryptionKeys.status.inactive',
							)
						}}
					</N8nBadge>
				</template>

				<template #[`item.createdAt`]="{ item }">
					{{ formatDate(item.createdAt) }}
				</template>

				<template #[`item.updatedAt`]="{ item }">
					{{ formatDate(archiveDate(item)) }}
				</template>
			</N8nDataTableServer>

			<div v-if="store.isEmpty" :class="$style.emptyState" data-testid="encryption-keys-empty">
				<N8nHeading tag="h2" size="large">
					{{ i18n.baseText('settings.encryptionKeys.empty.title') }}
				</N8nHeading>
				<N8nText color="text-base">
					{{ i18n.baseText('settings.encryptionKeys.empty.description') }}
				</N8nText>
			</div>
		</div>

		<N8nAlertDialog
			:open="isConfirmRotateOpen"
			:title="i18n.baseText('settings.encryptionKeys.rotate.confirm.title')"
			:description="i18n.baseText('settings.encryptionKeys.rotate.confirm.body')"
			:action-label="i18n.baseText('settings.encryptionKeys.rotate.confirm.action')"
			:cancel-label="i18n.baseText('settings.encryptionKeys.rotate.confirm.cancel')"
			action-variant="destructive"
			:loading="store.isRotating"
			data-testid="encryption-keys-rotate-confirm"
			@action="onConfirmRotate"
			@cancel="closeRotateConfirm"
			@update:open="isConfirmRotateOpen = $event"
		/>
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
	flex-wrap: wrap;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
}

.sortControl {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.sortLabel {
	white-space: nowrap;
}

.sortSelect {
	width: 180px;
}

.tableWrapper {
	position: relative;
}

.keyCell {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.keyValue {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: var(--font-size--sm);
	letter-spacing: 0.02em;
}

.rotateIcon {
	margin-right: var(--spacing--3xs);
	transition: transform 0.2s ease;
}

.isRotating {
	animation: settings-encryption-keys-spin 0.8s linear infinite;
}

@keyframes settings-encryption-keys-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.filterFooter {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
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
