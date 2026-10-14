<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nEmptyState,
	N8nIcon,
	N8nLoading2,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { nextTick, onMounted, ref, useTemplateRef } from 'vue';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useLatestFetch } from '@/app/composables/useLatestFetch';
import PromoteApplyInstanceSection from '../components/PromoteApplyInstanceSection.vue';
import PromotionConnectionForm from '../components/PromotionConnectionForm.vue';
import PromotionProviderDialog from '../components/PromotionProviderDialog.vue';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import {
	fetchPromotionConnection,
	fetchPromotionConnections,
	fetchPromotionProviders,
	type PromotionConnection,
	type PromotionProviderSummary,
} from '../promotionsSettings.api';
import type { PromotionProviderChange } from '../promotionsSettings.utils';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const documentTitle = useDocumentTitle();
const { next: nextLoad } = useLatestFetch();

const providers = ref<PromotionProviderSummary[]>([]);
const connection = ref<PromotionConnection | null>(null);
const isInitialLoading = ref(true);
const loadError = ref(false);
const hasLoaded = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string | undefined>(undefined);
const providerToFocus = ref<string | undefined>(undefined);
const selectAfterCreate = ref(false);

const list = useTemplateRef<HTMLElement>('list');
const addRow = useTemplateRef<{ $el?: HTMLElement }>('addRow');
const page = useTemplateRef<{ $el?: HTMLElement }>('page');
const connectionForm =
	useTemplateRef<InstanceType<typeof PromotionConnectionForm>>('connectionForm');

let connectionRevision = 0;
let pendingLoad: Promise<void> = Promise.resolve();

async function load() {
	const isLatestLoad = nextLoad();
	const revision = connectionRevision;
	// Keep the list mounted during refresh so focus can return to a row.
	isInitialLoading.value = !hasLoaded.value;
	loadError.value = false;
	try {
		const [loadedProviders, connections] = await Promise.all([
			fetchPromotionProviders(rootStore.publicApiContext),
			fetchPromotionConnections(rootStore.publicApiContext, { scope: 'instance' }),
		]);
		if (!isLatestLoad()) return;
		const summary = connections[0];
		const loadedConnection = summary
			? await fetchPromotionConnection(rootStore.publicApiContext, summary.id)
			: null;
		if (!isLatestLoad()) return;
		providers.value = loadedProviders;
		// A save can finish while connection detail is loading.
		if (revision === connectionRevision) connection.value = loadedConnection;
		hasLoaded.value = true;
	} catch (error) {
		if (!isLatestLoad() || revision !== connectionRevision) return;
		loadError.value = true;
		if (
			error instanceof ResponseError &&
			(error.httpStatusCode === 401 || error.httpStatusCode === 403)
		) {
			hasLoaded.value = false;
			providers.value = [];
			connection.value = null;
		}
		toast.showError(error, i18n.baseText('settings.promotions.providers.error.title'));
	} finally {
		if (isLatestLoad()) isInitialLoading.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.promotions.title'));
	await load();
});

function authTypeLabel(provider: PromotionProviderSummary) {
	if (provider.type === 'gitlab') return i18n.baseText('settings.promotions.providers.type.gitlab');
	return i18n.baseText(
		provider.authType === 'ssh-key'
			? 'settings.promotions.providers.authType.sshKey'
			: 'settings.promotions.providers.authType.token',
	);
}

function openCreateDialog(fromConnectionForm = false) {
	editingId.value = undefined;
	providerToFocus.value = undefined;
	selectAfterCreate.value = fromConnectionForm;
	dialogOpen.value = true;
}

function openEditDialog(id: string) {
	editingId.value = id;
	providerToFocus.value = id;
	selectAfterCreate.value = false;
	dialogOpen.value = true;
}

function onProviderSaved(change: PromotionProviderChange) {
	const { id } = change;
	providerToFocus.value = id;
	connectionForm.value?.applyProviderChange(change);
	if (selectAfterCreate.value) {
		selectAfterCreate.value = false;
		pendingLoad = load().then(() => {
			if (providers.value.some((provider) => provider.id === id)) {
				connectionForm.value?.selectProvider(id);
			}
		});
		return;
	}
	pendingLoad = load();
}

function onProviderDeleted() {
	providerToFocus.value = undefined;
	pendingLoad = load();
}

function onConnectionSaved(saved: PromotionConnection) {
	connectionRevision++;
	connection.value = saved;
	// The project header caches the instance connection per page load.
	invalidateInstancePromotionConnection();
}

function onConnectionRefresh() {
	invalidateInstancePromotionConnection();
	void load();
}

async function focusProvider(id: string | undefined) {
	await nextTick();
	const row = id ? list.value?.querySelector<HTMLElement>(`[data-provider-id="${id}"]`) : undefined;
	// Fall back to the page when the provider row is unavailable.
	(row ?? addRow.value?.$el ?? page.value?.$el)?.focus();
}

async function onDialogOpenChange(open: boolean) {
	dialogOpen.value = open;
	if (open) return;
	// Wait for the provider row before restoring focus.
	await pendingLoad;
	await focusProvider(providerToFocus.value);
}
</script>

<template>
	<N8nSettingsLayout ref="page" :class="$style.layout" tabindex="-1">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.promotions.title')"
			:description="i18n.baseText('settings.promotions.description')"
			:show-docs-link="false"
		/>

		<PromoteApplyInstanceSection :connection="connection" />

		<N8nSettingsSection
			:title="i18n.baseText('settings.promotions.providers.title')"
			:description="i18n.baseText('settings.promotions.providers.description')"
		>
			<N8nLoading2 v-if="isInitialLoading" :rows="2" :shrink-last="false" />
			<N8nEmptyState
				v-else-if="loadError"
				:heading="i18n.baseText('settings.promotions.providers.error.title')"
				:description="i18n.baseText('settings.promotions.providers.error.description')"
				:button-text="i18n.baseText('generic.retry')"
				data-test-id="promotion-providers-load-error"
				@click:button="load"
			/>
			<template v-if="!isInitialLoading && hasLoaded">
				<div ref="list" :class="$style.list">
					<N8nSettingsRowGroup v-for="provider in providers" :key="provider.id">
						<N8nSettingsRow
							clickable
							:title="provider.name"
							:description="authTypeLabel(provider)"
							:data-provider-id="provider.id"
							data-test-id="promotion-provider-row"
							@click="openEditDialog(provider.id)"
						>
							<template #visual>
								<N8nIcon icon="git-branch" color="text-dark" :size="20" />
							</template>
							<template #action>
								<N8nSettingsRowConfigure />
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</div>

				<N8nSettingsRowGroup>
					<N8nSettingsRow
						ref="addRow"
						clickable
						:title="i18n.baseText('settings.promotions.providers.add')"
						:description="i18n.baseText('settings.promotions.providers.add.description')"
						data-test-id="promotion-providers-add"
						@click="openCreateDialog()"
					>
						<template #visual>
							<N8nIcon icon="plus" color="text-dark" :size="20" />
						</template>
						<template #action>
							<N8nIcon icon="chevron-right" color="text-light" size="small" />
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</template>
		</N8nSettingsSection>

		<N8nSettingsSection
			:title="i18n.baseText('settings.promotions.connection.title')"
			:description="i18n.baseText('settings.promotions.connection.description')"
		>
			<N8nLoading2 v-if="isInitialLoading" :rows="3" :shrink-last="false" />
			<PromotionConnectionForm
				v-else-if="hasLoaded"
				ref="connectionForm"
				:providers="providers"
				:connection="connection"
				@saved="onConnectionSaved"
				@refresh="onConnectionRefresh"
				@add-provider="openCreateDialog(true)"
			/>
		</N8nSettingsSection>

		<PromotionProviderDialog
			v-if="dialogOpen"
			:key="editingId ?? 'new'"
			:open="dialogOpen"
			:provider-id="editingId"
			@update:open="onDialogOpenChange"
			@saved="onProviderSaved"
			@deleted="onProviderDeleted"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
// The settings layout supplies the top spacing.
.layout {
	padding-top: 0;

	&:focus {
		outline: none;
	}
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
