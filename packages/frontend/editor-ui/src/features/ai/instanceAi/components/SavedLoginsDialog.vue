<script lang="ts" setup>
/**
 * The logins the user saved in the cloud browser, one per site. The user can search, sort and
 * delete them. A deleted login asks the user to sign in again the next time the site needs it.
 */
import type { InstanceAiSavedLogin } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nDialog,
	N8nDialogBody,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSelect2,
	N8nText,
	type SelectOptionBase,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import dateformat from 'dateformat';
import { computed, ref, watch } from 'vue';

import { deleteSavedLogin, fetchSavedLogins } from '../instanceAi.api';

type SortBy = 'savedAt' | 'lastUsedAt' | 'domain';

const open = defineModel<boolean>('open', { required: true });

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const savedLogins = ref<InstanceAiSavedLogin[]>([]);
const isLoading = ref(false);
const search = ref('');
const sortBy = ref<SortBy>('lastUsedAt');
const loginToDelete = ref<InstanceAiSavedLogin>();
const isDeleting = ref(false);

const sortItems = computed(
	(): Array<SelectOptionBase<SortBy>> => [
		{
			value: 'lastUsedAt',
			label: i18n.baseText('instanceAi.cloudBrowser.savedLogins.sort.lastUsedAt'),
		},
		{ value: 'savedAt', label: i18n.baseText('instanceAi.cloudBrowser.savedLogins.sort.savedAt') },
		{ value: 'domain', label: i18n.baseText('instanceAi.cloudBrowser.savedLogins.sort.domain') },
	],
);

const shownLogins = computed(() => {
	const query = search.value.trim().toLowerCase();
	const matching = query
		? savedLogins.value.filter((login) => login.domain.toLowerCase().includes(query))
		: [...savedLogins.value];
	if (sortBy.value === 'domain') {
		return matching.sort((a, b) => a.domain.localeCompare(b.domain));
	}
	// ISO dates sort as strings. Newest first.
	const key = sortBy.value;
	return matching.sort((a, b) => b[key].localeCompare(a[key]));
});

let pendingSavedLoginsLoad: Promise<void> | undefined;

watch(
	open,
	(isOpen) => {
		if (isOpen) void loadSavedLogins();
	},
	{ immediate: true },
);

// Reuses a load that still runs, so an older response cannot replace a newer one.
async function loadSavedLogins() {
	pendingSavedLoginsLoad ??= fetchAndShowSavedLogins().finally(() => {
		pendingSavedLoginsLoad = undefined;
	});
	await pendingSavedLoginsLoad;
}

async function fetchAndShowSavedLogins() {
	isLoading.value = true;
	try {
		({ savedLogins: savedLogins.value } = await fetchSavedLogins(rootStore.restApiContext));
	} catch (error) {
		// The user closed the dialog meanwhile, so the error is no longer relevant.
		if (open.value) {
			toast.showError(error, i18n.baseText('instanceAi.cloudBrowser.savedLogins.loadFailed'));
		}
	} finally {
		isLoading.value = false;
	}
}

function onSortChange(value: unknown) {
	const item = sortItems.value.find((option) => option.value === value);
	if (item) sortBy.value = item.value;
}

async function confirmDelete() {
	const login = loginToDelete.value;
	if (!login || isDeleting.value) return;
	isDeleting.value = true;
	try {
		await deleteSavedLogin(rootStore.restApiContext, login.id);
		savedLogins.value = savedLogins.value.filter(({ id }) => id !== login.id);
		loginToDelete.value = undefined;
	} catch (error) {
		toast.showError(error, i18n.baseText('instanceAi.cloudBrowser.savedLogins.deleteFailed'));
	} finally {
		isDeleting.value = false;
	}
}

function onDeleteDialogOpenChange(isOpen: boolean) {
	if (!isOpen && !isDeleting.value) loginToDelete.value = undefined;
}

function formatDate(isoDate: string) {
	return dateformat(isoDate, 'd mmm yyyy, HH:MM');
}
</script>

<template>
	<N8nDialog
		v-model:open="open"
		size="large"
		:header="i18n.baseText('instanceAi.cloudBrowser.savedLogins.title')"
		data-test-id="saved-logins-dialog"
	>
		<N8nDialogBody>
			<div :class="$style.controls">
				<N8nInput
					v-model="search"
					:class="$style.search"
					:placeholder="i18n.baseText('instanceAi.cloudBrowser.savedLogins.search')"
					:aria-label="i18n.baseText('instanceAi.cloudBrowser.savedLogins.search')"
					clearable
					data-test-id="saved-logins-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nSelect2
					:model-value="sortBy"
					:items="sortItems"
					size="medium"
					:aria-label="i18n.baseText('instanceAi.cloudBrowser.savedLogins.sort.label')"
					data-test-id="saved-logins-sort"
					@update:model-value="onSortChange"
				/>
			</div>

			<N8nText
				v-if="isLoading && savedLogins.length === 0"
				tag="p"
				color="text-light"
				:class="$style.message"
			>
				{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.loading') }}
			</N8nText>
			<N8nText
				v-else-if="savedLogins.length === 0"
				tag="p"
				color="text-light"
				:class="$style.message"
				data-test-id="saved-logins-empty"
			>
				{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.empty') }}
			</N8nText>
			<N8nText
				v-else-if="shownLogins.length === 0"
				tag="p"
				color="text-light"
				:class="$style.message"
				data-test-id="saved-logins-no-match"
			>
				{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.noMatch') }}
			</N8nText>
			<table v-else :class="$style.table" data-test-id="saved-logins-table">
				<thead>
					<tr>
						<th :class="$style.heading">
							<N8nText size="xsmall" color="text-light" bold>
								{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.column.site') }}
							</N8nText>
						</th>
						<th :class="$style.heading">
							<N8nText size="xsmall" color="text-light" bold>
								{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.column.lastUsedAt') }}
							</N8nText>
						</th>
						<th :class="$style.actionsHeading">
							<span :class="$style.visuallyHidden">
								{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.column.actions') }}
							</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="login in shownLogins"
						:key="login.id"
						:class="$style.row"
						data-test-id="saved-logins-row"
					>
						<td :class="$style.site">
							<N8nIcon icon="globe" :class="$style.siteIcon" />
							<N8nText bold>{{ login.domain }}</N8nText>
						</td>
						<td>
							<N8nText size="small" color="text-light">{{ formatDate(login.lastUsedAt) }}</N8nText>
						</td>
						<td :class="$style.actions">
							<N8nIconButton
								icon="trash-2"
								variant="ghost"
								size="small"
								:aria-label="
									i18n.baseText('instanceAi.cloudBrowser.savedLogins.delete', {
										interpolate: { site: login.domain },
									})
								"
								data-test-id="saved-logins-delete"
								@click="loginToDelete = login"
							/>
						</td>
					</tr>
				</tbody>
			</table>
			<N8nAlertDialog
				:open="!!loginToDelete"
				:title="
					i18n.baseText('instanceAi.cloudBrowser.savedLogins.deleteDialog.title', {
						interpolate: { site: loginToDelete?.domain ?? '' },
					})
				"
				:description="i18n.baseText('instanceAi.cloudBrowser.savedLogins.deleteDialog.description')"
				:action-label="i18n.baseText('instanceAi.cloudBrowser.savedLogins.deleteDialog.confirm')"
				action-variant="destructive"
				:cancel-label="i18n.baseText('generic.cancel')"
				:loading="isDeleting"
				size="small"
				data-test-id="saved-logins-delete-dialog"
				@update:open="onDeleteDialogOpenChange"
				@action="confirmDelete"
			/>
		</N8nDialogBody>
	</N8nDialog>
</template>

<style lang="scss" module>
.controls {
	display: flex;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
}

.search {
	flex: 1;
}

.message {
	padding: var(--spacing--lg) 0;
	text-align: center;
}

.table {
	width: 100%;
	border-collapse: collapse;
}

.heading,
.actionsHeading {
	padding: var(--spacing--2xs) 0;
	text-align: left;
	border-bottom: var(--border);
}

.row {
	border-bottom: var(--border);

	td {
		padding: var(--spacing--xs) 0;
	}
}

.site {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.siteIcon {
	color: var(--color--text--tint-1);
}

.actions {
	text-align: right;
}

.visuallyHidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
}
</style>
