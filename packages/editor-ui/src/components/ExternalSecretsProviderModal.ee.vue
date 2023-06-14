<script lang="ts" setup>
import Modal from './Modal.vue';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY } from '@/constants';
import { computed, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { useI18n, useLoadingService, useToast } from '@/composables';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useUIStore } from '@/stores';
import { useRoute } from 'vue-router/composables';
import ParameterInputExpanded from '@/components/ParameterInputExpanded.vue';
import type { ExternalSecretsProvider, IUpdateInformation } from '@/Interface';
import type { IParameterLabel } from 'n8n-workflow';
import ExternalSecretsProviderImage from '@/components/ExternalSecretsProviderImage.ee.vue';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus; name: string }>,
		default: () => ({}),
	},
});

const loadingService = useLoadingService();
const externalSecretsStore = useExternalSecretsStore();
const uiStore = useUIStore();
const toast = useToast();
const { i18n } = useI18n();
const route = useRoute();

const labelSize: IParameterLabel = { size: 'medium' };

const provider = computed(() =>
	externalSecretsStore.providers.find((provider) => provider.name === props.data.name),
);

const providerData = ref<Record<string, IUpdateInformation['value']>>({});

const connectionState = ref<ExternalSecretsProvider['state']>();

const providerDataUpdated = computed(() => {
	return Object.keys(providerData.value).find((key) => {
		const value = providerData.value[key];
		const originalValue = provider.value.data[key];

		return value !== originalValue;
	});
});

const canSave = computed(
	() =>
		provider.value.properties
			?.filter((property) => property.required)
			.every((property) => {
				const value = providerData.value[property.name];
				return !!value;
			}) && providerDataUpdated.value,
);

onMounted(async () => {
	try {
		loadingService.startLoading();
		const provider = await externalSecretsStore.getProvider(props.data.name);
		providerData.value = { ...provider.data };
		connectionState.value = provider.state;
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}
});

function close() {
	uiStore.closeModal(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY);
}

function onValueChange(updateInformation: IUpdateInformation) {
	providerData.value = {
		...providerData.value,
		[updateInformation.name]: updateInformation.value,
	};
}

async function save() {
	try {
		loadingService.startLoading();
		await externalSecretsStore.updateProvider(provider.value.name, {
			data: providerData.value,
		});

		toast.showMessage({
			title: i18n.baseText('settings.externalSecrets.provider.save.success.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}

	try {
		const { success } = await externalSecretsStore.testProviderConnection(props.data.name, {
			data: providerData.value,
		});
		connectionState.value = success ? 'connected' : 'error';
	} catch (error) {
		connectionState.value = 'error';
	}
}
</script>

<template>
	<Modal
		id="external-secrets-provider-modal"
		width="812px"
		:title="provider.displayName"
		:eventBus="data.eventBus"
		:name="EXTERNAL_SECRETS_PROVIDER_MODAL_KEY"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.providerTitle">
					<ExternalSecretsProviderImage :provider="provider" class="mr-xs" />
					<span>{{ provider.displayName }}</span>
				</div>
				<n8n-button type="primary" :disabled="!canSave" @click="save">
					{{ i18n.baseText('settings.externalSecrets.provider.buttons.save') }}
				</n8n-button>
			</div>
		</template>

		<template #content>
			<div :class="$style.container">
				<hr class="mb-l" />

				<div class="mb-l" v-if="connectionState !== 'initializing'">
					<n8n-callout v-if="connectionState === 'connected'" theme="success">
						{{
							i18n.baseText('settings.externalSecrets.provider.testConnection.success', {
								interpolate: {
									count: `${externalSecretsStore.secrets[provider.name]?.length}`,
									provider: provider.displayName,
								},
							})
						}}
					</n8n-callout>
					<n8n-callout v-else theme="danger">
						{{
							i18n.baseText('settings.externalSecrets.provider.testConnection.error', {
								interpolate: { provider: provider.displayName },
							})
						}}
					</n8n-callout>
				</div>

				<form
					v-for="property in provider.properties"
					:key="property.name"
					autocomplete="off"
					data-test-id="external-secrets-provider-properties-form"
					@submit.prevent
				>
					<n8n-notice v-if="property.type === 'notice'" :content="property.displayName" />
					<parameter-input-expanded
						v-else
						class="mb-l"
						:parameter="property"
						:value="providerData[property.name]"
						:label="labelSize"
						eventSource="external-secrets-provider"
						@change="onValueChange"
					/>
				</form>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.container {
	> * {
		overflow-wrap: break-word;
	}
}

.header {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	flex-grow: 1;
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

<style lang="scss">
#external-secrets-provider-modal {
	.el-dialog__header {
		display: flex;
		align-items: center;
		flex-direction: row;
	}

	.el-dialog__headerbtn {
		position: relative;
		top: unset;
		right: unset;
		margin-left: var(--spacing-xs);
	}
}
</style>
