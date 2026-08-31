<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useToast } from '@n8n/composables/useToast';
import {
	DELETE_SECRETS_PROVIDER_MODAL_KEY,
	SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
} from '@/app/constants/modals';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import type { SecretProviderConnection } from '@n8n/api-types';
import {
	N8nEmptyState,
	N8nButton,
	N8nIcon,
	N8nLoading,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import * as externalSecretsApi from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ElSwitch } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';

import SecretsProviderConnectionCard from '../components/SecretsProviderConnectionCard.ee.vue';
import SecretsProvidersEmptyState from '../components/SecretsProvidersEmptyState.ee.vue';
import { useSecretsProviderConnection } from '../composables/useSecretsProviderConnection.ee';
import { useSecretsProvidersList } from '../composables/useSecretsProvidersList.ee';

const i18n = useI18n();
const secretsProviders = useSecretsProvidersList();
const projectsStore = useProjectsStore();
const settingsStore = useSettingsStore();
const rootStore = useRootStore();
const toast = useToast();
const message = useMessage();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();
const uiStore = useUIStore();
const secretsProviderConnection = useSecretsProviderConnection(projectsStore.currentProjectId);
const hasActiveProviders = computed(() => secretsProviders.activeProviders.value.length > 0);

const externalSecretsModuleSettings = computed(
	() => settingsStore.moduleSettings['external-secrets'],
);
const isRoleBasedAccessEnabled = computed(
	() => externalSecretsModuleSettings.value?.roleBasedAccess ?? false,
);
const systemRolesEnabled = ref(false);
const systemRolesToggleLoading = ref(false);

async function onSystemRolesToggle(value: string | number | boolean) {
	const enabled = Boolean(value);
	if (!enabled) {
		const result = await message.confirm(
			i18n.baseText('settings.externalSecrets.systemRoles.confirm.message'),
			i18n.baseText('settings.externalSecrets.systemRoles.confirm.headline'),
			{
				confirmButtonText: i18n.baseText(
					'settings.externalSecrets.systemRoles.confirm.confirmButtonText',
				),
				cancelButtonText: i18n.baseText(
					'settings.externalSecrets.systemRoles.confirm.cancelButtonText',
				),
			},
		);
		if (result !== 'confirm') return;
	}

	systemRolesToggleLoading.value = true;
	try {
		const response = await externalSecretsApi.updateExternalSecretsSettings(
			rootStore.restApiContext,
			{ systemRolesEnabled: enabled },
		);
		systemRolesEnabled.value = response.systemRolesEnabled;
		await settingsStore.getModuleSettings();
		toast.showMessage({
			title: enabled
				? i18n.baseText('settings.externalSecrets.systemRoles.enabled.toast')
				: i18n.baseText('settings.externalSecrets.systemRoles.disabled.toast'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.externalSecrets.systemRoles.error'));
	} finally {
		systemRolesToggleLoading.value = false;
	}
}

const sortedProviders = computed(() => {
	return [...secretsProviders.activeProviders.value].sort((a, b) => a.name.localeCompare(b.name));
});

function getProjectForProvider(provider: SecretProviderConnection): ProjectListItem | null {
	if (!provider || provider.projects.length === 0) return null;

	return (
		projectsStore.projects.find((p: ProjectListItem) => p.id === provider.projects[0].id) ?? null
	);
}

async function handleActivate(providerKey: string) {
	try {
		await secretsProviderConnection.activateConnection(providerKey);
		await secretsProviders.fetchConnection(providerKey);
		toast.showMessage({
			title: i18n.baseText('settings.secretsProviderConnections.actions.activate.success.title'),
			message: i18n.baseText(
				'settings.secretsProviderConnections.actions.activate.success.description',
				{
					interpolate: { provider: providerKey },
				},
			),
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.secretsProviderConnections.actions.activate.error.title'),
			{
				message: i18n.baseText(
					'settings.secretsProviderConnections.actions.activate.error.description',
					{ interpolate: { provider: providerKey } },
				),
			},
		);
	}
}

function getProviderTypeInfo(providerType: string) {
	return secretsProviders.providerTypes.value.find((type) => type.type === providerType);
}

function openConnectionModal(
	providerKey?: string,
	activeTab: 'connection' | 'sharing' = 'connection',
) {
	const existingNames = secretsProviders.activeProviders.value.map((provider) => provider.name);

	uiStore.openModalWithData({
		name: SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
		data: {
			activeTab,
			providerKey,
			providerTypes: secretsProviders.providerTypes.value,
			existingProviderNames: existingNames,
			onClose: async () => {
				await secretsProviders.fetchActiveConnections();
			},
		},
	});
}

function handleCardClick(providerKey: string) {
	openConnectionModal(providerKey, 'connection');
}

function handleEdit(providerKey: string) {
	openConnectionModal(providerKey, 'connection');
}

function handleShare(providerKey: string) {
	openConnectionModal(providerKey, 'sharing');
}

async function handleReload(providerKey: string) {
	try {
		const result = await secretsProviderConnection.reloadConnection(providerKey);
		if (!result.success) {
			toast.showError(new Error('Reload failed'), i18n.baseText('error'));
			return;
		}
		toast.showMessage({
			title: i18n.baseText('settings.externalSecrets.card.reload.success.title'),
			message: i18n.baseText('settings.externalSecrets.card.reload.success.description', {
				interpolate: { provider: providerKey },
			}),
			type: 'success',
		});
		await secretsProviders.fetchConnection(providerKey);
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	}
}

function handleDelete(providerKey: string) {
	const provider = secretsProviders.activeProviders.value.find((p) => p.name === providerKey);

	if (!provider) return;

	uiStore.openModalWithData({
		name: DELETE_SECRETS_PROVIDER_MODAL_KEY,
		data: {
			providerKey: provider.name,
			providerName: provider.name,
			secretsCount: provider.secretsCount ?? 0,
			projectId: provider.projects.length > 0 ? provider.projects[0].id : undefined,
			onConfirm: async () => {
				await secretsProviders.fetchActiveConnections();
			},
		},
	});
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.secretsProviderConnections.title'));
	if (!secretsProviders.isEnterpriseExternalSecretsEnabled.value) return;
	try {
		await Promise.all([
			secretsProviders.fetchProviderTypes(),
			secretsProviders.fetchActiveConnections(),
			projectsStore.getAllProjects(),
		]);
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	}
	systemRolesEnabled.value = externalSecretsModuleSettings.value?.systemRolesEnabled ?? false;
});

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.secretsProviderConnections.title')"
			:description="
				secretsProviders.isEnterpriseExternalSecretsEnabled.value && hasActiveProviders
					? i18n.baseText('settings.secretsProviderConnections.description')
					: undefined
			"
			:docs-url="i18n.baseText('settings.externalSecrets.docs')"
			:show-docs-link="
				secretsProviders.isEnterpriseExternalSecretsEnabled.value && hasActiveProviders
			"
		>
			<template v-if="hasActiveProviders && secretsProviders.canCreate.value" #actions>
				<N8nButton variant="solid" size="small" @click="openConnectionModal()">
					<N8nIcon icon="plus" />
					{{ i18n.baseText('settings.secretsProviderConnections.buttons.addSecretsStore') }}
				</N8nButton>
			</template>
		</N8nSettingsPageHeader>

		<N8nSettingsSection v-if="isRoleBasedAccessEnabled">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.externalSecrets.systemRoles.title')"
					:description="i18n.baseText('settings.externalSecrets.systemRoles.description')"
					data-test-id="external-secrets-system-roles-toggle"
				>
					<template #action>
						<ElSwitch
							:model-value="systemRolesEnabled"
							:loading="systemRolesToggleLoading"
							data-test-id="external-secrets-system-roles-switch"
							@update:model-value="onSystemRolesToggle"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
		<div
			v-if="secretsProviders.isEnterpriseExternalSecretsEnabled.value"
			data-test-id="secrets-provider-connections-content-licensed"
		>
			<div
				v-if="secretsProviders.isLoading.value && !hasActiveProviders"
				data-test-id="secrets-providers-loading"
			>
				<div v-for="i in 3" :key="i" class="mb-2xs">
					<N8nLoading variant="p" :rows="1" />
				</div>
			</div>
			<SecretsProvidersEmptyState
				v-else-if="!hasActiveProviders"
				:provider-types="secretsProviders.providerTypes.value"
				:can-create="secretsProviders.canCreate.value"
				@add-secrets-store="openConnectionModal()"
			/>
			<div v-else>
				<SecretsProviderConnectionCard
					v-for="provider in sortedProviders"
					:key="provider.name"
					class="mb-2xs"
					:provider="provider"
					:provider-type-info="getProviderTypeInfo(provider.type)"
					:project="getProjectForProvider(provider)"
					:can-update="secretsProviders.canUpdate.value"
					@click="handleCardClick(provider.name)"
					@edit="handleEdit"
					@share="handleShare"
					@reload="handleReload"
					@activate="handleActivate"
					@delete="handleDelete"
				/>
			</div>
		</div>
		<N8nEmptyState
			v-else
			class="mt-2xl mb-l"
			data-test-id="secrets-provider-connections-content-unlicensed"
			:button-text="i18n.baseText('settings.externalSecrets.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.externalSecrets.actionBox.title') }}</span>
			</template>
			<template #description>
				<I18nT keypath="settings.externalSecrets.actionBox.description" scope="global">
					<template #link>
						<a :href="i18n.baseText('settings.externalSecrets.docs')" target="_blank">
							{{ i18n.baseText('settings.externalSecrets.actionBox.description.link') }}
						</a>
					</template>
				</I18nT>
			</template>
		</N8nEmptyState>
	</N8nSettingsLayout>
</template>
