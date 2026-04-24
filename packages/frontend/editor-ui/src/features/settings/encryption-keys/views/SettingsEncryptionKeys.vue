<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nAlertDialog,
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nLink,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';

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

const isConfirmRotateOpen = ref(false);

const sortOptions = computed<Array<{ value: EncryptionKeySortField; label: string }>>(() => [
	{ value: 'activatedAt', label: i18n.baseText('settings.encryptionKeys.sortBy.activated') },
	{ value: 'archivedAt', label: i18n.baseText('settings.encryptionKeys.sortBy.archived') },
	{ value: 'type', label: i18n.baseText('settings.encryptionKeys.sortBy.type') },
	{ value: 'createdBy', label: i18n.baseText('settings.encryptionKeys.sortBy.createdBy') },
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

const fullName = (user: EncryptionKey['createdBy']) => `${user.firstName} ${user.lastName}`.trim();

const headers = computed<Array<TableHeader<EncryptionKey>>>(() => [
	{
		title: i18n.baseText('settings.encryptionKeys.column.key'),
		key: 'id',
		value: (row) => row.id,
		minWidth: 220,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.type'),
		key: 'type',
		value: (row) => row.status,
		minWidth: 120,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.activated'),
		key: 'activatedAt',
		value: (row) => row.activatedAt,
		minWidth: 140,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.archived'),
		key: 'archivedAt',
		value: (row) => row.archivedAt ?? '',
		minWidth: 140,
	},
	{
		title: i18n.baseText('settings.encryptionKeys.column.createdBy'),
		key: 'createdBy',
		value: (row) => fullName(row.createdBy),
		minWidth: 220,
		disableSort: true,
	},
]);

const visibleKeys = computed(() => store.visibleKeys);

const pageState = ref({ page: 1, itemsPerPage: 25 });

const sortByModel = computed<EncryptionKeySortField>({
	get: () => store.sort.field,
	set: (field: EncryptionKeySortField) => {
		store.setSort({ field, direction: store.sort.direction });
	},
});

const isFilterOpen = ref(false);

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

const onCreatedByToggle = (userId: string, event: Event) => {
	const checked = (event.target as HTMLInputElement).checked;
	const next = new Set(store.filters.createdByIds);
	if (checked) next.add(userId);
	else next.delete(userId);
	store.setFilters({ createdByIds: Array.from(next) });
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.encryptionKeys.title'));
	try {
		await store.fetchKeys();
	} catch (error) {
		showError(error, i18n.baseText('settings.encryptionKeys.loadError'));
	}
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

			<N8nPopover v-model:open="isFilterOpen" side="bottom" align="end">
				<template #trigger>
					<N8nIconButton
						icon="funnel"
						type="tertiary"
						size="medium"
						data-testid="encryption-keys-filter-button"
						:title="i18n.baseText('settings.encryptionKeys.filter.title')"
					/>
				</template>
				<template #content>
					<div :class="$style.filterPanel">
						<N8nText bold>
							{{ i18n.baseText('settings.encryptionKeys.filter.dateRange') }}
						</N8nText>
						<div :class="$style.filterDateRange">
							<input
								type="date"
								:value="store.filters.activatedFrom ?? ''"
								:class="$style.dateInput"
								@change="
									store.setFilters({
										activatedFrom: ($event.target as HTMLInputElement).value || null,
									})
								"
							/>
							<input
								type="date"
								:value="store.filters.activatedTo ?? ''"
								:class="$style.dateInput"
								@change="
									store.setFilters({
										activatedTo: ($event.target as HTMLInputElement).value || null,
									})
								"
							/>
						</div>
						<N8nText bold>
							{{ i18n.baseText('settings.encryptionKeys.filter.createdBy') }}
						</N8nText>
						<ul :class="$style.filterUserList">
							<li v-for="user in store.createdByOptions" :key="user.id">
								<label :class="$style.filterUserRow">
									<input
										type="checkbox"
										:checked="store.filters.createdByIds.includes(user.id)"
										@change="onCreatedByToggle(user.id, $event)"
									/>
									<N8nAvatar :first-name="user.firstName" :last-name="user.lastName" size="small" />
									<span>{{ fullName(user) }}</span>
								</label>
							</li>
						</ul>
						<div :class="$style.filterActions">
							<N8nButton
								type="tertiary"
								size="small"
								:label="i18n.baseText('settings.encryptionKeys.filter.clear')"
								@click="store.resetFilters()"
							/>
						</div>
					</div>
				</template>
			</N8nPopover>

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
				v-model:page="pageState.page"
				v-model:items-per-page="pageState.itemsPerPage"
				:headers="headers"
				:items="visibleKeys"
				:items-length="visibleKeys.length"
				:loading="store.isLoading"
				:page-sizes="[10, 25, 50]"
				data-testid="encryption-keys-table"
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

				<template #[`item.type`]="{ item }">
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

				<template #[`item.activatedAt`]="{ item }">
					{{ formatDate(item.activatedAt) }}
				</template>

				<template #[`item.archivedAt`]="{ item }">
					{{ formatDate(item.archivedAt) }}
				</template>

				<template #[`item.createdBy`]="{ item }">
					<div :class="$style.userCell">
						<N8nAvatar
							:first-name="item.createdBy.firstName"
							:last-name="item.createdBy.lastName"
							size="small"
						/>
						<div :class="$style.userMeta">
							<span :class="$style.userName">{{ fullName(item.createdBy) }}</span>
							<N8nText size="small" color="text-light">{{ item.createdBy.email }}</N8nText>
						</div>
					</div>
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

.userCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.userMeta {
	display: flex;
	flex-direction: column;
	line-height: var(--line-height--sm);
}

.userName {
	font-size: var(--font-size--sm);
	color: var(--color--text);
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

.filterPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 260px;
}

.filterDateRange {
	display: flex;
	gap: var(--spacing--2xs);
}

.dateInput {
	flex: 1;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.filterUserList {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-height: 200px;
	overflow-y: auto;
}

.filterUserRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.filterActions {
	display: flex;
	justify-content: flex-end;
	border-top: var(--border);
	padding-top: var(--spacing--2xs);
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
