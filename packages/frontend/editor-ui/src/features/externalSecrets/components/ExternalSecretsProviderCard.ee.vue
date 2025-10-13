<script lang="ts" setup>
import type { ExternalSecretsProvider } from '../externalSecrets.types';
import ExternalSecretsProviderImage from './ExternalSecretsProviderImage.ee.vue';
import ExternalSecretsProviderConnectionSwitch from './ExternalSecretsProviderConnectionSwitch.ee.vue';
import { useExternalSecretsStore } from '../externalSecrets.ee.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useExternalSecretsProvider } from '@/features/externalSecrets/composables/useExternalSecretsProvider';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY } from '@/constants';
import { DateTime } from 'luxon';
import { computed, nextTick, onMounted, toRef } from 'vue';
import { isDateObject } from '@/utils/typeGuards';

import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
const props = defineProps<{
	provider: ExternalSecretsProvider;
}>();

const externalSecretsStore = useExternalSecretsStore();
const i18n = useI18n();
const uiStore = useUIStore();
const toast = useToast();

const provider = toRef(props, 'provider');
const providerData = computed(() => provider.value.data ?? {});
const { connectionState, testConnection, setConnectionState } = useExternalSecretsProvider(
	provider,
	providerData,
);

const actionDropdownOptions = computed(() => [
	{
		value: 'setup',
		label: i18n.baseText('settings.externalSecrets.card.actionDropdown.setup'),
	},
	...(props.provider.connected
		? [
				{
					value: 'reload',
					label: i18n.baseText('settings.externalSecrets.card.actionDropdown.reload'),
				},
			]
		: []),
]);

const canConnect = computed(() => {
	return props.provider.connected || Object.keys(providerData.value).length > 0;
});

const formattedDate = computed(() => {
	return DateTime.fromISO(
		isDateObject(provider.value.connectedAt)
			? provider.value.connectedAt.toISOString()
			: provider.value.connectedAt || new Date().toISOString(),
	).toFormat('dd LLL yyyy');
});

onMounted(() => {
	setConnectionState(props.provider.state);
});

async function onBeforeConnectionUpdate() {
	if (props.provider.connected) {
		return true;
	}

	await externalSecretsStore.getProvider(props.provider.name);
	await nextTick();
	const status = await testConnection();

	return status !== 'error';
}

function openExternalSecretProvider() {
	uiStore.openModalWithData({
		name: EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
		data: { name: props.provider.name },
	});
}

async function reloadProvider() {
	try {
		await externalSecretsStore.reloadProvider(props.provider.name);
		toast.showMessage({
			title: i18n.baseText('settings.externalSecrets.card.reload.success.title'),
			message: i18n.baseText('settings.externalSecrets.card.reload.success.description', {
				interpolate: { provider: props.provider.displayName },
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	}
}

async function onActionDropdownClick(id: string) {
	switch (id) {
		case 'setup':
			openExternalSecretProvider();
			break;
		case 'reload':
			await reloadProvider();
			break;
	}
}
</script>

<template>
	<N8nCard :class="$style.card">
		<div :class="$style.cardBody">
			<ExternalSecretsProviderImage :class="$style.cardImage" :provider="provider" />
			<div :class="$style.cardContent">
				<N8nText bold>{{ provider.displayName }}</N8nText>
				<N8nText v-if="provider.connected" color="text-light" size="small">
					<span>
						{{
							i18n.baseText('settings.externalSecrets.card.secretsCount', {
								interpolate: {
									count: `${externalSecretsStore.secrets[provider.name]?.length}`,
								},
							})
						}}
					</span>
					|
					<span>
						{{
							i18n.baseText('settings.externalSecrets.card.connectedAt', {
								interpolate: {
									date: formattedDate,
								},
							})
						}}
					</span>
				</N8nText>
			</div>
			<div v-if="provider.name === 'infisical'" :class="$style.deprecationWarning">
				<N8nIcon :class="$style['warningTriangle']" icon="triangle-alert" />
				<N8nBadge class="mr-xs" theme="tertiary" bold data-test-id="card-badge">
					{{ i18n.baseText('settings.externalSecrets.card.deprecated') }}
				</N8nBadge>
			</div>
			<div v-if="canConnect" :class="$style.cardActions">
				<ExternalSecretsProviderConnectionSwitch
					:provider="provider"
					:before-update="onBeforeConnectionUpdate"
					:disabled="connectionState === 'error' && !provider.connected"
				/>
				<N8nActionToggle
					class="ml-s"
					theme="dark"
					:actions="actionDropdownOptions"
					@action="onActionDropdownClick"
				/>
			</div>
			<N8nButton v-else type="tertiary" @click="openExternalSecretProvider()">
				{{ i18n.baseText('settings.externalSecrets.card.setUp') }}
			</N8nButton>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	position: relative;
	margin-bottom: var(--spacing--2xs);
}

.cardImage {
	width: 28px;
	height: 28px;
}

.cardBody {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.cardContent {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	margin-left: var(--spacing--sm);
}

.cardActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-left: var(--spacing--sm);
}

.deprecationWarning {
	display: flex;
}

.warningTriangle {
	color: var(--color--warning);
	margin-right: var(--spacing--2xs);
}
</style>
