<script lang="ts" setup>
import { useUIStore } from '@/stores/ui.store';
import { useI18n, useMessage, useToast } from '@/composables';
import { useExternalSecretsStore } from '@/stores';
import { onMounted } from 'vue';
import type { ExternalSecretsProvider } from '@/Interface';
import { DateTime } from 'luxon';
import { useRoute, useRouter } from 'vue-router/composables';
import { VIEWS } from '@/constants';

const { i18n } = useI18n();
const uiStore = useUIStore();
const externalSecretsStore = useExternalSecretsStore();
const message = useMessage();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const providerId = route.params.provider;

onMounted(() => {
	if (!externalSecretsStore.isEnterpriseExternalSecretsEnabled) {
		void router.replace({ name: VIEWS.EXTERNAL_SECRETS_SETTINGS });
	} else {
		void externalSecretsStore.getProvider(providerId);
	}
});

const provider = externalSecretsStore.providerById(providerId);

function goToUpgrade() {
	uiStore.goToUpgrade('external-secrets', 'upgrade-external-secrets');
}

function formatDate(provider: ExternalSecretsProvider) {
	return DateTime.fromISO(provider.connectedAt!).toFormat('dd LLL yyyy');
}
</script>

<template>
	<div class="pb-3xl" v-if="provider">
		<n8n-heading size="2xlarge">
			{{ provider.name }}
		</n8n-heading>

		<n8n-callout theme="secondary" class="mt-2xl mb-l">
			{{ i18n.baseText(`settings.externalSecrets.${provider.id}.info`) }}
			<a
				:href="`https://docs.n8n.io/user-management/external-secrets/${provider.id}`"
				target="_blank"
			>
				{{ i18n.baseText(`settings.externalSecrets.${provider.id}.info.link`) }}
			</a>
		</n8n-callout>

		<div data-test-id="sso-content-licensed">
			{{ provider }}
		</div>
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
