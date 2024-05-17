<script lang="ts" setup>
import Modal from './Modal.vue';
import { EXTERNAL_SECRETS_PROVIDER_MODAL_KEY, MODAL_CONFIRM } from '@/constants';
import { computed, onMounted, ref } from 'vue';
import type { PropType } from 'vue';
import type { EventBus } from 'n8n-design-system/utils';
import { useExternalSecretsProvider } from '@/composables/useExternalSecretsProvider';
import { useI18n } from '@/composables/useI18n';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useUIStore } from '@/stores/ui.store';
import ParameterInputExpanded from '@/components/ParameterInputExpanded.vue';
import type {
	IUpdateInformation,
	ExternalSecretsProviderData,
	ExternalSecretsProvider,
} from '@/Interface';
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

const defaultProviderData: Record<string, Partial<ExternalSecretsProviderData>> = {
	infisical: {
		siteURL: 'https://app.infisical.com',
	},
};

const externalSecretsStore = useExternalSecretsStore();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const { confirm } = useMessage();

const saving = ref(false);

const eventBus = createEventBus();

const labelSize: IParameterLabel = { size: 'medium' };

const provider = computed<ExternalSecretsProvider | undefined>(() =>
	externalSecretsStore.providers.find((p) => p.name === props.data.name),
);
const providerData = ref<ExternalSecretsProviderData>({});
const {
	connectionState,
	initialConnectionState,
	normalizedProviderData,
	shouldDisplayProperty,
	setConnectionState,
	testConnection,
} = useExternalSecretsProvider(provider, providerData);

const providerDataUpdated = computed(() => {
	return Object.keys(providerData.value).find((key) => {
		const value = providerData.value[key];
		const originalValue = provider.value?.data?.[key];

		return value !== originalValue;
	});
});

const canSave = computed(
	() =>
		provider.value?.properties
			?.filter((property) => property.required && shouldDisplayProperty(property))
			.every((property) => {
				const value = providerData.value[property.name];
				return !!value;
			}) && providerDataUpdated.value,
);

onMounted(async () => {
	try {
		const fetchedProvider = await externalSecretsStore.getProvider(props.data.name);

		providerData.value = {
			...(defaultProviderData[props.data.name] || {}),
			...fetchedProvider.data,
		};

		setConnectionState(fetchedProvider.state);

		if (fetchedProvider.connected) {
			initialConnectionState.value = fetchedProvider.state;
		} else if (Object.keys(fetchedProvider.data ?? {}).length) {
			await testConnection();
		}

		if (fetchedProvider.state === 'connected') {
			void externalSecretsStore.reloadProvider(props.data.name);
		}
	} catch (error) {
		toast.showError(error, 'Error');
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
	if (!provider.value) {
		return;
	}

	try {
		saving.value = true;
		await externalSecretsStore.updateProvider(provider.value.name, {
			data: normalizedProviderData.value,
		});

		setConnectionState(provider.value.state);
	} catch (error) {
		toast.showError(error, 'Error');
	}

	await testConnection();

	if (initialConnectionState.value === 'initializing' && connectionState.value === 'tested') {
		setTimeout(() => {
			eventBus.emit('connect', true);
		}, 100);
	}

	saving.value = false;
}

async function onBeforeClose() {
	if (providerDataUpdated.value) {
		const confirmModal = await confirm(
			i18n.baseText('settings.externalSecrets.provider.closeWithoutSaving.description', {
				interpolate: {
					provider: provider.value?.displayName ?? '',
				},
			}),
			{
				title: i18n.baseText('settings.externalSecrets.provider.closeWithoutSaving.title'),
				confirmButtonText: i18n.baseText(
					'settings.externalSecrets.provider.closeWithoutSaving.confirm',
				),
				cancelButtonText: i18n.baseText(
					'settings.externalSecrets.provider.closeWithoutSaving.cancel',
				),
			},
		);

		return confirmModal !== MODAL_CONFIRM;
	}

	return true;
}

async function onConnectionStateChange() {
	await testConnection();
}
</script>

<template>
	<Modal
		id="external-secrets-provider-modal"
		width="812px"
		:title="provider?.displayName"
		:event-bus="data.eventBus"
		:name="EXTERNAL_SECRETS_PROVIDER_MODAL_KEY"
		:before-close="onBeforeClose"
	>
		<template #header>
			<div v-if="provider" :class="$style.header">
				<div :class="$style.providerTitle">
					<ExternalSecretsProviderImage :provider="provider" class="mr-xs" />
					<span>{{ provider.displayName }}</span>
				</div>
				<div :class="$style.providerActions">
					<ExternalSecretsProviderConnectionSwitch
						class="mr-s"
						:disabled="
							(connectionState === 'initializing' || connectionState === 'error') &&
							!provider.connected
						"
						:event-bus="eventBus"
						:provider="provider"
						@change="onConnectionStateChange"
					/>
					<n8n-button
						type="primary"
						:loading="saving"
						:disabled="!canSave && !saving"
						@click="save"
					>
						{{
							i18n.baseText(
								`settings.externalSecrets.provider.buttons.${saving ? 'saving' : 'save'}`,
							)
						}}
					</n8n-button>
				</div>
			</div>
		</template>

		<template #content>
			<div v-if="provider" :class="$style.container">
				<hr class="mb-l" />
				<div v-if="connectionState !== 'initializing'" class="mb-l">
					<n8n-callout
						v-if="connectionState === 'connected' || connectionState === 'tested'"
						theme="success"
					>
						{{
							i18n.baseText(
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
							<i18n-t
								keypath="settings.externalSecrets.provider.testConnection.success.connected.usage"
							>
								<template #code>
									<code>{{ `\{\{ \$secrets\.${provider.name}\.secret_name \}\}` }}</code>
								</template>
							</i18n-t>
							<n8n-link :href="i18n.baseText('settings.externalSecrets.docs.use')" size="small">
								{{
									i18n.baseText(
										'settings.externalSecrets.provider.testConnection.success.connected.docs',
									)
								}}
							</n8n-link>
						</span>
					</n8n-callout>
					<n8n-callout v-else-if="connectionState === 'error'" theme="danger">
						{{
							i18n.baseText(
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
					v-show="shouldDisplayProperty(property)"
					:key="property.name"
					autocomplete="off"
					data-test-id="external-secrets-provider-properties-form"
					@submit.prevent
				>
					<n8n-notice v-if="property.type === 'notice'" :content="property.displayName" />
					<ParameterInputExpanded
						v-else
						class="mb-l"
						:parameter="property"
						:value="providerData[property.name]"
						:label="labelSize"
						event-source="external-secrets-provider"
						@update="onValueChange"
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
