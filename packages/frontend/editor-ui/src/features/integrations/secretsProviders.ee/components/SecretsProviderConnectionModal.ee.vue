<script lang="ts" setup>
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/app/composables/useMessage';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IUpdateInformation } from '@/Interface';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import type { IParameterLabel } from 'n8n-workflow';
import { SECRETS_PROVIDER_CONNECTION_MODAL_KEY, MODAL_CONFIRM } from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import SaveButton from '@/app/components/SaveButton.vue';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';
import ParameterInputExpanded from '@/features/ndv/parameters/components/ParameterInputExpanded.vue';
import { useConnectionModal } from '@/features/integrations/secretsProviders.ee/composables/useConnectionModal.ee';
import {
	N8nCallout,
	N8nInput,
	N8nInputLabel,
	N8nLoading,
	N8nMenuItem,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
	type IMenuItem,
} from '@n8n/design-system';
import { useElementSize } from '@vueuse/core';

// Props
const props = defineProps<{
	modalName: string;
	data?: {
		connectionId?: string;
		providerTypes?: SecretProviderTypeResponse[];
		existingProviderNames?: string[];
		onClose?: () => void;
	};
}>();

// Composables
const i18n = useI18n();
const { confirm } = useMessage();
const eventBus = createEventBus();

// Constants
const LABEL_SIZE: IParameterLabel = { size: 'medium' };
const ACTIVE_TAB = ref('connection');

// TODO: Get actual secrets count from backend API after connection test
const SECRETS_COUNT = 0;

// Modal state
const providerTypes = computed(() => props.data?.providerTypes ?? []);
const existingProviderNames = computed(() => props.data?.existingProviderNames ?? []);

const modal = useConnectionModal({
	providerTypes,
	connectionId: props.data?.connectionId,
	existingProviderNames,
});

const sidebarItems = computed(() => {
	const items: IMenuItem[] = [
		{
			id: 'connection',
			label: i18n.baseText('settings.secretsProviderConnections.modal.items.connection'),
			position: 'top',
		},
	];

	return items;
});

// Handlers
function handleConnectionNameUpdate(value: string) {
	modal.connectionName.value = value;
	modal.connectionNameBlurred.value = false;
}

function handleConnectionNameBlur() {
	modal.connectionName.value = modal.hyphenateConnectionName(modal.connectionName.value);
	modal.connectionNameBlurred.value = true;
}

function handleProviderTypeChange(providerType: string) {
	modal.selectProviderType(providerType);
}

function handleSettingChange(update: IUpdateInformation) {
	modal.updateSettings(update.name, update.value);
}

async function handleSave() {
	console.log('handleSave', modal.canSave.value);
	await modal.saveConnection();
}

async function handleBeforeClose() {
	if (modal.hasUnsavedChanges.value) {
		const result = await confirm(
			i18n.baseText('settings.secretsProviderConnections.modal.unsavedChanges'),
			{
				title: i18n.baseText('settings.secretsProviderConnections.modal.unsavedChanges'),
				confirmButtonText: i18n.baseText('generic.keepEditing'),
				cancelButtonText: i18n.baseText('generic.close'),
			},
		);

		if (result === MODAL_CONFIRM) {
			return false;
		}
	}

	props.data?.onClose?.();
	return true;
}

// Lifecycle
onMounted(async () => {
	if (providerTypes.value.length === 0) return;

	if (modal.isEditMode.value) {
		await modal.loadConnection();
	}
});

const nameRef = useTemplateRef('nameRef');
const { width } = useElementSize(nameRef);
</script>

<template>
	<Modal
		v-if="providerTypes.length"
		:id="`${SECRETS_PROVIDER_CONNECTION_MODAL_KEY}-modal`"
		:custom-class="$style.secretsProviderConnectionModal"
		width="812px"
		:event-bus="eventBus"
		:name="SECRETS_PROVIDER_CONNECTION_MODAL_KEY"
		:before-close="handleBeforeClose"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.info">
					<div :class="$style.icon">
						<SecretsProviderImage
							v-if="modal.selectedProviderType.value"
							:provider="modal.selectedProviderType.value"
							:class="$style.headerIcon"
						/>
					</div>
					<div ref="nameRef" :class="$style.name">
						<div :class="$style.nameRow">
							<N8nText size="large">
								{{ modal.selectedProviderType.value?.displayName }}
							</N8nText>
						</div>
					</div>
				</div>
				<div :class="$style.actions">
					<SaveButton
						:saved="!modal.hasUnsavedChanges.value && modal.isEditMode.value"
						:is-saving="modal.isSaving.value"
						:disabled="!modal.canSave.value"
						:saving-label="i18n.baseText('settings.secretsProviderConnections.modal.saving')"
						data-test-id="secrets-provider-connection-save-button"
						@click="handleSave"
					/>
				</div>
			</div>
		</template>

		<template #content>
			<div :class="$style.container">
				<!-- Left sidebar menu -->
				<nav :class="$style.sidebar">
					<N8nMenuItem
						v-for="item in sidebarItems"
						:key="item.id"
						:item="item"
						:active="ACTIVE_TAB === item.id"
						:data-test-id="`sidebar-item-${item.id}`"
						@click="ACTIVE_TAB = item.id"
					/>
				</nav>

				<div :class="$style.contentArea">
					<div v-if="modal.connection.isLoading.value">
						<N8nLoading variant="p" :rows="4" />
					</div>
					<div v-else>
						<!-- Connection Tab Content -->
						<div v-if="ACTIVE_TAB === 'connection'" :class="$style.mainContent">
							<div>
								<!-- Connection State Callouts -->
								<N8nCallout
									v-if="modal.connection.connectionState.value === 'connected'"
									theme="success"
									class="mb-l"
									data-test-id="connection-success-callout"
								>
									<div>
										<p>
											{{
												i18n.baseText(
													'settings.secretsProviderConnections.modal.testConnection.success.serviceEnabled',
													{
														interpolate: {
															count: SECRETS_COUNT,
															providerName: modal.connectionName.value,
														},
													},
												)
											}}
										</p>
										<p>
											{{
												i18n.baseText(
													'settings.secretsProviderConnections.modal.testConnection.success.reference',
												)
											}}
										</p>
										<code :class="$style.expressionExample">{{
											modal.expressionExample.value
										}}</code>
									</div>
								</N8nCallout>

								<N8nCallout
									v-else-if="modal.connection.connectionState.value === 'error'"
									theme="danger"
									class="mb-l"
									data-test-id="connection-error-callout"
								>
									{{
										i18n.baseText(
											'settings.secretsProviderConnections.modal.testConnection.error',
											{
												interpolate: {
													providerName: modal.connectionName.value,
												},
											},
										)
									}}
								</N8nCallout>

								<!-- Provider Type Selector -->
								<div class="mb-l">
									<N8nInputLabel
										:label="i18n.baseText('settings.secretsProviderConnections.modal.providerType')"
									/>
									<N8nSelect
										data-test-id="provider-type-select"
										:model-value="modal.selectedProviderType.value?.type"
										:disabled="modal.isEditMode.value"
										@update:model-value="handleProviderTypeChange"
									>
										<N8nOption
											v-for="option in modal.providerTypeOptions.value"
											:key="option.value"
											:label="option.label"
											:value="option.value"
										/>
									</N8nSelect>
								</div>

								<!-- Provider Name Input -->
								<div class="mb-l">
									<N8nInputLabel
										:label="i18n.baseText('settings.secretsProviderConnections.modal.providerKey')"
									/>
									<N8nInput
										data-test-id="provider-name"
										:model-value="modal.connectionName.value"
										:max-width="width - 10"
										:readonly="modal.isEditMode.value"
										:disabled="modal.isEditMode.value"
										aria-required="true"
										@update:model-value="handleConnectionNameUpdate"
										@blur="handleConnectionNameBlur"
									/>
									<N8nText
										v-if="
											modal.connectionNameError.value &&
											modal.connectionNameBlurred.value &&
											!modal.isEditMode.value
										"
										size="small"
										color="danger"
										:class="$style.headerHint"
									>
										{{ modal.connectionNameError.value }}
									</N8nText>
									<N8nText
										v-else-if="!modal.isEditMode.value"
										size="small"
										color="text-light"
										:class="$style.headerHint"
									>
										{{
											i18n.baseText('settings.secretsProviderConnections.modal.connectionName.hint')
										}}
									</N8nText>
								</div>

								<!-- Dynamic Fields -->
								<form
									v-for="property in modal.selectedProviderType.value?.properties"
									v-show="modal.shouldDisplayProperty(property)"
									:key="property.name"
									autocomplete="off"
									@submit.prevent
								>
									<N8nNotice v-if="property.type === 'notice'" :content="property.displayName" />
									<ParameterInputExpanded
										v-else
										class="mb-l"
										:parameter="property"
										:value="modal.connectionSettings.value[property.name]"
										:label="LABEL_SIZE"
										event-source="secrets-provider-connection"
										@update="handleSettingChange"
									/>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.secretsProviderConnectionModal {
	--dialog--max-width: 1200px;
	--dialog--close--spacing--top: 31px;
	--dialog--max-height: 600px;

	:global(.el-dialog__header) {
		padding-bottom: 0;
		border-bottom: var(--border);
	}

	:global(.el-dialog__body) {
		padding-top: var(--spacing--lg);
		position: relative;
	}
}

.mainContent {
	flex: 1;
	overflow: auto;
}

.icon {
	width: 1.5rem;
	height: 1.5rem;
	display: flex;
	align-items: center;
	margin-right: var(--spacing--xs);
}

.name {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--md);
}

.headerHint {
	margin-top: var(--spacing--4xs);
	display: block;
}

.modalLayout {
	display: flex;
	gap: var(--spacing--lg);
	min-height: 400px;
}

.sidebar {
	max-width: 170px;
	min-width: 170px;
	margin-right: var(--spacing--lg);
	flex-grow: 1;

	ul {
		padding: 0 !important;
	}
}

.header {
	display: flex;
}

.container {
	display: flex;
	height: 100%;
}

.info {
	display: flex;
	align-items: center;
	flex-direction: row;
	flex-grow: 1;
	margin-bottom: var(--spacing--lg);
}

.actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-right: var(--spacing--xl);
	margin-bottom: var(--spacing--lg);

	> * {
		margin-left: var(--spacing--2xs);
	}
}

.contentArea {
	flex: 1;
	overflow-y: auto;
	padding-top: var(--spacing--2xs);
}

.expressionExample {
	display: block;
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	margin-top: var(--spacing--xs);
}
</style>
