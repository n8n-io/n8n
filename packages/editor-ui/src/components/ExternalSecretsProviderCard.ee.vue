<script lang="ts" setup>
import type { PropType } from 'vue';
import type { ExternalSecretsProvider } from '@/Interface';
import ExternalSecretsProviderImage from '@/components/ExternalSecretsProviderImage.ee.vue';
import ExternalSecretsProviderConnectionSwitch from '@/components/ExternalSecretsProviderConnectionSwitch.ee.vue';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useUIStore } from '@/stores/ui.store';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useExternalSecretsProvider } from '@/composables/useExternalSecretsProvider';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY } from '@/constants';
import { DateTime } from 'luxon';
import { computed, nextTick, onMounted, toRef } from 'vue';
import { isDateObject } from '@/utils/typeGuards';

const props = defineProps({
	provider: {
		type: Object as PropType<ExternalSecretsProvider>,
		required: true,
	},
});

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
	<n8n-card :class="$style.card">
		<div :class="$style.cardBody">
			<ExternalSecretsProviderImage :class="$style.cardImage" :provider="provider" />
			<div :class="$style.cardContent">
				<n8n-text bold>{{ provider.displayName }}</n8n-text>
				<n8n-text v-if="provider.connected" color="text-light" size="small">
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
				</n8n-text>
			</div>
			<div v-if="canConnect" :class="$style.cardActions">
				<ExternalSecretsProviderConnectionSwitch
					:provider="provider"
					:before-update="onBeforeConnectionUpdate"
					:disabled="connectionState === 'error' && !provider.connected"
				/>
				<n8n-action-toggle
					class="ml-s"
					theme="dark"
					:actions="actionDropdownOptions"
					@action="onActionDropdownClick"
				/>
			</div>
			<n8n-button v-else type="tertiary" @click="openExternalSecretProvider()">
				{{ i18n.baseText('settings.externalSecrets.card.setUp') }}
			</n8n-button>
		</div>
	</n8n-card>
</template>

<style lang="scss" module>
.card {
	position: relative;
	margin-bottom: var(--spacing-2xs);
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
	margin-left: var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-left: var(--spacing-s);
}
</style>
