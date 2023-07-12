<script lang="ts" setup>
import Modal from './Modal.vue';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY, MODAL_CONFIRM } from '@/constants';
import { computed, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { useI18n, useLoadingService, useMessage, useToast } from '@/composables';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useUIStore } from '@/stores';
import { useRoute } from 'vue-router/composables';
import ParameterInputExpanded from '@/components/ParameterInputExpanded.vue';
import type { IUpdateInformation, ExternalSecretsProviderWithProperties } from '@/Interface';
import type { IParameterLabel } from 'n8n-workflow';
import ExternalSecretsProviderImage from '@/components/ExternalSecretsProviderImage.ee.vue';
import ExternalSecretsProviderConnectionSwitch from '@/components/ExternalSecretsProviderConnectionSwitch.ee.vue';
import { createEventBus } from 'n8n-design-system/utils';

const props = defineProps({
	data: {
		type: Object as PropType<{ eventBus: EventBus; name: string }>,
		default: () => ({}),
	},
});

const defaultProviderData = {
	infisical: {
		siteURL: 'https://app.infisical.com',
	},
};

const loadingService = useLoadingService();
const externalSecretsStore = useExternalSecretsStore();
const uiStore = useUIStore();
const toast = useToast();
const { i18n: locale } = useI18n();
const route = useRoute();
const { confirm } = useMessage();

const eventBus = createEventBus();

const labelSize: IParameterLabel = { size: 'medium' };

const provider = computed(() =>
	externalSecretsStore.providers.find((provider) => provider.name === props.data.name),
);

const connectionState = ref<ExternalSecretsProviderWithProperties['state']>();

const providerData = ref<Record<string, IUpdateInformation['value']>>({});

const normalizedProviderData = computed(() => {
	return Object.entries(providerData.value).reduce((acc, [key, value]) => {
		const property = provider.value.properties?.find((property) => property.name === key);
		if (shouldDisplay(property)) {
			acc[key] = value;
		}

		return acc;
	}, {} as Record<string, IUpdateInformation['value']>);
});

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
			?.filter((property) => property.required && shouldDisplay(property))
			.every((property) => {
				const value = providerData.value[property.name];
				return !!value;
			}) && providerDataUpdated.value,
);

onMounted(async () => {
	try {
		loadingService.startLoading();
		const provider = await externalSecretsStore.getProvider(props.data.name);
		providerData.value = {
			...(defaultProviderData[props.data.name] || {}),
			...provider.data,
		};
		connectionState.value = provider.state;

		if (!provider.connected && Object.keys(provider.data).length) {
			await testConnection();
		}
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
	}
});

function shouldDisplay(property: ExternalSecretsProviderWithProperties['properties'][0]): boolean {
	let visible = true;

	if (property.displayOptions?.show) {
		visible =
			visible &&
			Object.entries(property.displayOptions.show).every(([key, value]) => {
				return value.includes(providerData.value[key]);
			});
	}

	if (property.displayOptions?.hide) {
		visible =
			visible &&
			!Object.entries(property.displayOptions.hide).every(([key, value]) => {
				return value.includes(providerData.value[key]);
			});
	}

	return visible;
}

function close() {
	uiStore.closeModal(EXTERNAL_SECRETS_PROVIDER_MODAL_KEY);
}

function onValueChange(updateInformation: IUpdateInformation) {
	providerData.value = {
		...providerData.value,
		[updateInformation.name]: updateInformation.value,
	};
}

async function testConnection() {
	try {
		const { testState } = await externalSecretsStore.testProviderConnection(
			props.data.name,
			normalizedProviderData.value,
		);
		connectionState.value = testState;
	} catch (error) {
		connectionState.value = 'error';
	}
}

async function save() {
	try {
		loadingService.startLoading();
		await externalSecretsStore.updateProvider(provider.value.name, {
			data: normalizedProviderData.value,
		});

		toast.showMessage({
			title: locale.baseText('settings.externalSecrets.provider.save.success.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, 'Error');
	}

	const previousState = connectionState.value;
	await testConnection();
	if (previousState === 'initializing' && connectionState.value === 'tested') {
		eventBus.emit('connect', true);
	}

	loadingService.stopLoading();
}

async function onBeforeClose() {
	if (providerDataUpdated.value) {
		const confirmModal = await confirm(
			locale.baseText('settings.externalSecrets.provider.closeWithoutSaving.description', {
				interpolate: {
					provider: provider.value.displayName,
				},
			}),
			{
				title: locale.baseText('settings.externalSecrets.provider.closeWithoutSaving.title'),
				confirmButtonText: locale.baseText(
					'settings.externalSecrets.provider.closeWithoutSaving.confirm',
				),
				cancelButtonText: locale.baseText(
					'settings.externalSecrets.provider.closeWithoutSaving.cancel',
				),
			},
		);

		return confirmModal !== MODAL_CONFIRM;
	}

	return true;
}
</script>

<template>
	<Modal
		id="external-secrets-provider-modal"
		width="812px"
		:title="provider.displayName"
		:eventBus="data.eventBus"
		:name="EXTERNAL_SECRETS_PROVIDER_MODAL_KEY"
		:before-close="onBeforeClose"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.providerTitle">
					<ExternalSecretsProviderImage :provider="provider" class="mr-xs" />
					<span>{{ provider.displayName }}</span>
				</div>
				<div :class="$style.providerActions">
					<ExternalSecretsProviderConnectionSwitch
						v-if="connectionState !== 'initializing'"
						:provider="provider"
						class="mr-s"
						@change="testConnection"
					/>
					<n8n-button type="primary" :disabled="!canSave" @click="save">
						{{ locale.baseText('settings.externalSecrets.provider.buttons.save') }}
					</n8n-button>
				</div>
			</div>
		</template>

		<template #content>
			<div :class="$style.container">
				<hr class="mb-l" />
				<div class="mb-l" v-if="connectionState !== 'initializing'">
					<n8n-callout
						v-if="connectionState === 'connected' || connectionState === 'tested'"
						theme="success"
					>
						{{
							locale.baseText(
								`settings.externalSecrets.provider.testConnection.success${
									provider.connected ? '.connected' : ''
								}`,
								{
									interpolate: {
										count: `${externalSecretsStore.secrets[provider.name]?.length}`,
										provider: provider.displayName,
									},
								},
							)
						}}
						<span v-if="provider.connected">
							<br />
							<i18n path="settings.externalSecrets.provider.testConnection.success.connected.usage">
								<template #code>
									<code>{{ `\{\{ \$secrets\.${provider.name}\.secret_name \}\}` }}</code>
								</template>
							</i18n>
							<n8n-link :href="locale.baseText('settings.externalSecrets.docs')" size="small">
								{{
									locale.baseText(
										'settings.externalSecrets.provider.testConnection.success.connected.docs',
									)
								}}
							</n8n-link>
						</span>
					</n8n-callout>
					<n8n-callout v-else-if="connectionState === 'error'" theme="danger">
						{{
							locale.baseText(
								`settings.externalSecrets.provider.testConnection.error${
									provider.connected ? '.connected' : ''
								}`,
								{
									interpolate: { provider: provider.displayName },
								},
							)
						}}
					</n8n-callout>
				</div>

				<form
					v-for="property in provider.properties"
					v-show="shouldDisplay(property)"
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
	flex: 1;
}

.providerActions {
	flex: 0;
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
