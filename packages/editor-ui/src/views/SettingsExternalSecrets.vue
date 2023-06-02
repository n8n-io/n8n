<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';
import { useI18n, useMessage, useToast } from '@/composables';
import { useExternalSecretsStore } from '@/stores';
import { onMounted } from 'vue';
import type { ExternalSecretsProvider } from '@/Interface';
import { DateTime } from 'luxon';

const { i18n } = useI18n();
const uiStore = useUIStore();
const externalSecretsStore = useExternalSecretsStore();
const message = useMessage();
const toast = useToast();

onMounted(() => {
	void externalSecretsStore.getProviders();
});

function goToUpgrade() {
	uiStore.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}

function formatDate(provider: ExternalSecretsProvider) {
	return DateTime.fromISO(provider.connectedAt!).toFormat('dd LLL yyyy');
}
</script>

<template>
	<div class="pb-3xl">
		<n8n-heading size="2xlarge">{{ i18n.baseText('settings.externalSecrets.title') }}</n8n-heading>

		<n8n-callout theme="secondary" class="mt-2xl mb-l">
			{{ i18n.baseText('settings.externalSecrets.info') }}
			<a href="https://docs.n8n.io/user-management/external-secrets/" target="_blank">
				{{ i18n.baseText('settings.externalSecrets.info.link') }}
			</a>
		</n8n-callout>
		<div
			v-if="externalSecretsStore.isEnterpriseExternalSecretsEnabled"
			data-test-id="sso-content-licensed"
		>
			<n8n-card
				v-for="provider in externalSecretsStore.providers"
				:key="provider.id"
				:class="$style.card"
			>
				<div :class="$style.cardBody">
					<img :class="$style.cardImage" :src="provider.image" :alt="provider.name" />
					<div :class="$style.cardContent">
						<n8n-text bold>{{ provider.name }}</n8n-text>
						<n8n-text color="text-light" size="small" v-if="provider.connected">
							<span>
								{{
									i18n.baseText('settings.externalSecrets.card.secretsCount', {
										interpolate: {
											count: provider.secrets.length,
										},
									})
								}}
							</span>
							|
							<span>
								{{
									i18n.baseText('settings.externalSecrets.card.connectedAt', {
										interpolate: {
											date: formatDate(provider),
										},
									})
								}}
							</span>
						</n8n-text>
					</div>
					<n8n-link :to="`/settings/external-secrets/${provider.id}`">
						<n8n-button type="tertiary">
							{{ i18n.baseText('settings.externalSecrets.card.setUp') }}
						</n8n-button>
					</n8n-link>
				</div>
			</n8n-card>
		</div>
		<n8n-action-box
			v-else
			data-test-id="external-secrets-content-unlicensed"
			:description="i18n.baseText('settings.externalSecrets.actionBox.description')"
			:buttonText="i18n.baseText('settings.externalSecrets.actionBox.buttonText')"
			@click="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.externalSecrets.actionBox.title') }}</span>
			</template>
		</n8n-action-box>
	</div>
</template>

<style lang="scss" module>
.card {
	position: relative;
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
</style>
