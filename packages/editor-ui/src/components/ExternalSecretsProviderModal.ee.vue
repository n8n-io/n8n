<script lang="ts" setup>
import Modal from './Modal.vue';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY } from '@/constants';
import { computed, onMounted } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { useI18n, useLoadingService, useToast } from '@/composables';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useUIStore } from '@/stores';
import { useRoute } from 'vue-router/composables';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus; id: string }>,
		default: () => ({}),
	},
});

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const { i18n } = useI18n();
const externalSecretsStore = useExternalSecretsStore();
const route = useRoute();

const provider = computed(() =>
	externalSecretsStore.providers.find((provider) => provider.id === props.data.id),
);

onMounted(async () => {
	try {
		loadingService.startLoading();
		await externalSecretsStore.getProvider(props.data.id);
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}
});

function close() {
	uiStore.closeModal(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY);
}
</script>

<template>
	<Modal
		center
		width="812px"
		:title="provider.name"
		:eventBus="data.eventBus"
		:name="EXTERNAL_SECRETS_PROVIDER_MODAL_KEY"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.providerTitle">
					<img :src="provider.image" :alt="provider.name" class="mr-xs" />
					<span>{{ provider.name }}</span>
				</div>
				<n8n-button type="primary">
					{{ i18n.baseText('settings.externalSecrets.provider.buttons.save') }}
				</n8n-button>
			</div>
		</template>

		<template #content>
			{{ provider }}
			<div :class="$style.container">
				<n8n-text>
					{{ i18n.baseText('settings.externalSecrets.provider.description') }}
				</n8n-text>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<n8n-button type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.externalSecrets.provider.buttons.cancel') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container > * {
	overflow-wrap: break-word;
}

.header {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}

.providerTitle {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
}
</style>
