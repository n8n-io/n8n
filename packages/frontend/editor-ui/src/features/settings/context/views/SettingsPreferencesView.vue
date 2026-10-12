<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	N8nButton,
	N8nHeading,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';

import PreferenceModal from '../components/PreferenceModal.vue';
import PreferencesTable from '../components/PreferencesTable.vue';
import { PREFERENCES_DEFAULT_PAGE_SIZE } from '../context.constants';
import { useContextStore } from '../context.store';
import type { AiPreferenceScope } from '@n8n/api-types';

import type { Preference } from '../context.types';
import { preferenceScope } from '../context.utils';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const message = useMessage();
const telemetry = useTelemetry();
const contextStore = useContextStore();
const { showError, showMessage } = useToast();

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: PREFERENCES_DEFAULT_PAGE_SIZE,
	sortBy: [],
});
const selection = ref<string[]>([]);
const loadFailed = ref(false);

const dialogTarget = ref<Preference | 'new' | null>(null);

// A failed load also reports zero rows, so the empty state must not stand in for it.
const showEmptyState = computed(
	() => !contextStore.loading && !loadFailed.value && contextStore.count === 0,
);
const selectedCount = computed(() => selection.value.length);

async function load() {
	const { page = 0, itemsPerPage = PREFERENCES_DEFAULT_PAGE_SIZE } = tableOptions.value;
	try {
		await contextStore.fetchPreferences({ skip: page * itemsPerPage, take: itemsPerPage });
		loadFailed.value = false;

		// Deleting the last rows of a page can leave the page past the end.
		const lastPage = Math.max(0, Math.ceil(contextStore.count / itemsPerPage) - 1);
		if (page > lastPage) {
			tableOptions.value = { ...tableOptions.value, page: lastPage };
			await contextStore.fetchPreferences({
				skip: lastPage * itemsPerPage,
				take: itemsPerPage,
			});
		}
	} catch (error) {
		loadFailed.value = true;
		showError(error, i18n.baseText('settings.context.preferences.error.load'));
	}
}

async function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = options;
	await load();
}

function openCreateModal() {
	dialogTarget.value = 'new';
}

function openEditModal(preference: Preference) {
	dialogTarget.value = preference;
}

async function onSaved() {
	dialogTarget.value = null;
	await load();
}

async function confirmDelete(count: number) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.context.preferences.delete.confirm.message', {
			interpolate: { count },
			adjustToNumber: count,
		}),
		i18n.baseText('settings.context.preferences.delete.confirm.title', {
			interpolate: { count },
			adjustToNumber: count,
		}),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('settings.context.preferences.delete.confirm.button'),
			cancelButtonText: i18n.baseText('settings.context.preferences.modal.cancel'),
		},
	);
	return confirmed === MODAL_CONFIRM;
}

function trackDelete(source: 'row' | 'bulk', scopeTypes: Array<AiPreferenceScope | undefined>) {
	const present = scopeTypes.filter((scope): scope is AiPreferenceScope => scope !== undefined);
	telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
		count: scopeTypes.length,
		source,
		scope_types: [...new Set(present)],
	});
}

async function onDelete(preference: Preference) {
	if (!(await confirmDelete(1))) return;

	try {
		await contextStore.deletePreference(preference.id);
		trackDelete('row', [preferenceScope(preference)]);
		selection.value = selection.value.filter((id) => id !== preference.id);
		await load();
		showMessage({
			title: i18n.baseText('settings.context.preferences.delete.success'),
			type: 'success',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.preferences.error.delete'));
	}
}

async function onDeleteSelected() {
	const ids = [...selection.value];
	if (ids.length === 0 || !(await confirmDelete(ids.length))) return;

	// Read the scopes before the reload removes the rows.
	const scopeById = new Map(
		contextStore.preferences.map((row) => [row.id, preferenceScope(row)] as const),
	);
	const { deleted, failed } = await contextStore.deletePreferences(ids);
	// Deleted rows leave the selection, or a retry would hit a 404.
	const gone = new Set(deleted);
	selection.value = selection.value.filter((id) => !gone.has(id));
	if (deleted.length > 0) await load();

	if (deleted.length > 0) {
		trackDelete(
			'bulk',
			deleted.map((id) => scopeById.get(id)),
		);
	}
	if (failed.length > 0) {
		showError(failed[0].error, i18n.baseText('settings.context.preferences.error.delete'));
		return;
	}
	showMessage({
		title: i18n.baseText('settings.context.preferences.delete.success'),
		type: 'success',
	});
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.preferences.title'));
	await load();
	// Once for the visit, not once for each page: paging is not a second visit. A failed load
	// reports nothing, so a zero here is an empty list and never a broken one.
	if (loadFailed.value) return;
	telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_PREFERENCES, {
		count: contextStore.count,
		scope_types: [...new Set(contextStore.preferences.map((row) => preferenceScope(row)))],
	});
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.context.preferences.back')"
		data-test-id="settings-preferences-view"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.context.preferences.title')"
			:description="i18n.baseText('settings.context.preferences.description')"
			:show-docs-link="false"
		/>

		<div :class="$style.toolbar">
			<N8nText v-if="selectedCount > 0" color="text-light" size="small">
				{{
					i18n.baseText('settings.context.preferences.selected', {
						interpolate: { count: selectedCount },
						adjustToNumber: selectedCount,
					})
				}}
			</N8nText>
			<N8nButton
				v-if="selectedCount > 0"
				variant="outline"
				:label="i18n.baseText('settings.context.preferences.actions.deleteSelected')"
				data-test-id="preferences-delete-selected-button"
				@click="onDeleteSelected"
			/>
			<N8nButton
				:label="i18n.baseText('settings.context.preferences.actions.create')"
				data-test-id="preferences-create-button"
				@click="openCreateModal"
			/>
		</div>

		<PreferencesTable
			v-model:table-options="tableOptions"
			v-model:selection="selection"
			:preferences="contextStore.preferences"
			:items-length="contextStore.count"
			:loading="contextStore.loading"
			:show-empty="showEmptyState"
			@edit="openEditModal"
			@delete="onDelete"
			@update:options="onOptionsUpdate"
		>
			<template #empty>
				<div :class="$style.empty" data-test-id="preferences-empty-state">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('settings.context.preferences.empty.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText('settings.context.preferences.empty.description') }}
					</N8nText>
					<N8nButton
						:label="i18n.baseText('settings.context.preferences.actions.create')"
						data-test-id="preferences-empty-create-button"
						@click="openCreateModal"
					/>
				</div>
			</template>
		</PreferencesTable>

		<PreferenceModal
			:open="dialogTarget !== null"
			:preference="dialogTarget === 'new' ? null : dialogTarget"
			@update:open="(open) => (dialogTarget = open ? dialogTarget : null)"
			@saved="onSaved"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The settings shell insets the page; the header is pulled to the table's left edge. */
.layout {
	padding: 0;

	header {
		margin-inline: 0 auto;
	}
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
