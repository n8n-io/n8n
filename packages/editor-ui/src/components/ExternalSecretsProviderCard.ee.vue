<script lang="ts" setup>
import type { PropType } from 'vue';
import type { ExternalSecretsProvider } from '@/Interface';
import ExternalSecretsProviderImage from '@/components/ExternalSecretsProviderImage.ee.vue';
import ExternalSecretsProviderConnectionSwitch from '@/components/ExternalSecretsProviderConnectionSwitch.ee.vue';
import { useExternalSecretsStore, useUIStore } from '@/stores';
import { useI18n, useLoadingService, useToast } from '@/composables';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY } from '@/constants';
import { DateTime } from 'luxon';
import { computed } from 'vue';

const props = defineProps({
	provider: {
		type: Object as PropType<ExternalSecretsProvider>,
		required: true,
	},
});

const loadingService = useLoadingService();
const externalSecretsStore = useExternalSecretsStore();
const { i18n } = useI18n();
const uiStore = useUIStore();
const toast = useToast();

const actionDropdownOptions = [
	{
		id: 'setup',
		label: i18n.baseText('settings.externalSecrets.card.actionDropdown.setup'),
	},
];

const canConnect = computed(() => {
	return props.provider.connected || Object.keys(props.provider.data).length > 0;
});

const formattedDate = computed((provider: ExternalSecretsProvider) => {
	return DateTime.fromISO(props.provider.connectedAt!).toFormat('dd LLL yyyy');
});

function openExternalSecretProvider() {
	uiStore.openModalWithData({
		name: EXTERNAL_SECRETS_PROVIDER_MODAL_KEY,
		data: { name: props.provider.name },
	});
}

function onActionDropdownClick(id: string) {
	switch (id) {
		case 'setup':
			openExternalSecretProvider();
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
				<n8n-text color="text-light" size="small" v-if="provider.connected">
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
			<div :class="$style.cardActions" v-if="canConnect">
				<ExternalSecretsProviderConnectionSwitch :provider="provider" />
				<n8n-action-dropdown
					class="ml-s"
					:items="actionDropdownOptions"
					@select="onActionDropdownClick"
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
