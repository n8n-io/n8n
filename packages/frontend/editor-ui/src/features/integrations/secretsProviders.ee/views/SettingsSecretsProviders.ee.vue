<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useSecretsProvidersList } from '../composables/useSecretsProvidersList.ee';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { computed, onMounted } from 'vue';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import {
	N8nActionBox,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import SecretsProviderConnectionCard from '../components/SecretsProviderConnectionCard.ee.vue';
import SecretsProvidersEmptyState from '../components/SecretsProvidersEmptyState.ee.vue';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import {
	SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
	DELETE_SECRETS_PROVIDER_MODAL_KEY,
} from '@/app/constants/modals';
import { I18nT } from 'vue-i18n';
import type { SecretProviderConnection } from '@n8n/api-types';
import { reloadSecretProviderConnection } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

const i18n = useI18n();
const secretsProviders = useSecretsProvidersList();
const projectsStore = useProjectsStore();
const rootStore = useRootStore();
const toast = useToast();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();
const uiStore = useUIStore();

const hasActiveProviders = computed(() => secretsProviders.activeProviders.value.length > 0);

function getProjectForProvider(provider: SecretProviderConnection): ProjectListItem | null {
	if (!provider || provider.projects.length === 0) return null;

	return (
		projectsStore.projects.find((p: ProjectListItem) => p.id === provider.projects[0].id) ?? null
	);
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
		const result = await reloadSecretProviderConnection(rootStore.restApiContext, providerKey);
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
});

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}
</script>

<template>
	<div :class="$style.container">
		<div class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.secretsProviderConnections.title') }}
				</N8nHeading>
				<N8nText
					v-if="secretsProviders.isEnterpriseExternalSecretsEnabled.value && hasActiveProviders"
					color="text-base"
					size="medium"
				>
					{{ i18n.baseText('settings.secretsProviderConnections.description') }}
					{{ i18n.baseText('credentialResolver.view.learnMore') }}
					<N8nLink
						theme="text"
						:href="i18n.baseText('settings.externalSecrets.docs')"
						size="medium"
						new-window
					>
						<span :class="$style.link">
							{{ i18n.baseText('generic.documentation') }}
							<N8nIcon icon="arrow-up-right" />
						</span>
					</N8nLink>
				</N8nText>
				<N8nButton
					v-if="hasActiveProviders && secretsProviders.canCreate.value"
					:class="$style.addButton"
					type="primary"
					@click="openConnectionModal()"
					><N8nIcon icon="plus" />
					{{ i18n.baseText('settings.secretsProviderConnections.buttons.addSecretsStore') }}
				</N8nButton>
			</div>
		</div>
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
					v-for="provider in secretsProviders.activeProviders.value"
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
					@delete="handleDelete"
				/>
			</div>
		</div>
		<N8nActionBox
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
		</N8nActionBox>
	</div>
</template>

<style lang="css" module>
.container {
	padding-bottom: var(--spacing--xl);
	max-width: 702px;
	margin: 0 auto;
}

.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.addButton {
	align-self: flex-end;
	margin-top: var(--spacing--lg);
}

.link {
	text-transform: lowercase;
	display: inline-flex;
	align-items: center;
}
</style>
