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
import { useUIStore } from '@/app/stores/ui.store';

import PreferencesTable from '../components/PreferencesTable.vue';
import { PREFERENCES_DEFAULT_PAGE_SIZE, PREFERENCE_MODAL_KEY } from '../context.constants';
import { useContextStore } from '../context.store';
import type { Preference, PreferenceScopeType } from '../context.types';
import { preferenceScope } from '../context.utils';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const message = useMessage();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const contextStore = useContextStore();
const { showError, showMessage } = useToast();

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: PREFERENCES_DEFAULT_PAGE_SIZE,
	sortBy: [],
});
const selection = ref<string[]>([]);

const showEmptyState = computed(() => !contextStore.loading && contextStore.count === 0);
const selectedCount = computed(() => selection.value.length);

async function load() {
	const { page = 0, itemsPerPage = PREFERENCES_DEFAULT_PAGE_SIZE } = tableOptions.value;
	try {
		await contextStore.fetchPreferences({ skip: page * itemsPerPage, take: itemsPerPage });
	} catch (error) {
		showError(error, i18n.baseText('settings.context.preferences.error.load'));
	}
}

async function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = options;
	await load();
}

function openCreateModal() {
	uiStore.openModalWithData({ name: PREFERENCE_MODAL_KEY, data: { mode: 'new' } });
}

function openEditModal(preference: Preference) {
	uiStore.openModalWithData({ name: PREFERENCE_MODAL_KEY, data: { mode: 'edit', preference } });
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

/** One event per delete operation; `count` covers a bulk run. */
function trackDelete(source: 'row' | 'bulk', scopeTypes: Array<PreferenceScopeType | undefined>) {
	const present = scopeTypes.filter((scope): scope is PreferenceScopeType => scope !== undefined);
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

	try {
		await contextStore.deletePreferences(ids);
		trackDelete(
			'bulk',
			ids.map((id) => {
				const row = contextStore.preferences.find((candidate) => candidate.id === id);
				return row ? preferenceScope(row) : undefined;
			}),
		);
		selection.value = [];
		await load();
		showMessage({
			title: i18n.baseText('settings.context.preferences.delete.success'),
			type: 'success',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.preferences.error.delete'));
	}
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.preferences.title'));
	await load();
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
			@edit="openEditModal"
			@delete="onDelete"
			@update:options="onOptionsUpdate"
		>
			<template #empty>
				<div v-if="showEmptyState" :class="$style.empty" data-test-id="preferences-empty-state">
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
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/*
 * The settings shell already insets the page, so the layout's own padding is dropped
 * and `full-width` lets the table span the shell's container. The page header caps its
 * own width and the layout centres every child, so it is pulled back to the table's
 * left edge.
 */
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
