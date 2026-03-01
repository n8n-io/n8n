<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useMessage } from '@/app/composables/useMessage';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IUpdateInformation } from '@/Interface';
import type { SecretProviderTypeResponse } from '@n8n/api-types';
import type { IParameterLabel } from 'n8n-workflow';
import {
	SECRETS_PROVIDER_CONNECTION_MODAL_KEY,
	MODAL_CONFIRM,
	DELETE_SECRETS_PROVIDER_MODAL_KEY,
} from '@/app/constants';
import Modal from '@/app/components/Modal.vue';
import SaveButton from '@/app/components/SaveButton.vue';
import SecretsProviderImage from './SecretsProviderImage.ee.vue';
import ParameterInputExpanded from '@/features/ndv/parameters/components/ParameterInputExpanded.vue';
import { useConnectionModal } from '@/features/integrations/secretsProviders.ee/composables/useConnectionModal.ee';
import {
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nLoading,
	N8nMenuItem,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nInfoTip,
	N8nTooltip,
	type IMenuItem,
} from '@n8n/design-system';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import Banner from '@/app/components/Banner.vue';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

// Props
const props = withDefaults(
	defineProps<{
		modalName: string;
		data?: {
			activeTab?: string;
			providerKey?: string;
			providerTypes?: SecretProviderTypeResponse[];
			existingProviderNames?: string[];
			projectId?: string;
			onClose?: () => void;
		};
	}>(),
	{
		data: () => ({
			activeTab: 'connection',
		}),
	},
);

// Composables
const i18n = useI18n();
const { confirm } = useMessage();
const eventBus = createEventBus();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();

// Constants
const LABEL_SIZE: IParameterLabel = { size: 'medium' };
const internalActiveTab = ref(props.data?.activeTab ?? 'connection');

// Modal state
const providerTypes = computed(() => props.data.providerTypes ?? []);
const providerKey = computed(() => props.data.providerKey ?? '');
const existingProviderNames = computed(() => props.data.existingProviderNames ?? []);
const projectId = computed(() => props.data.projectId);

const modal = useConnectionModal({
	providerTypes,
	providerKey,
	existingProviderNames,
	projectId: projectId.value,
});

const tabNavigationEnabled =
	(settingsStore.moduleSettings['external-secrets']?.forProjects ?? false) &&
	modal.canShareGlobally.value;

const ACTIVE_TAB = computed({
	get: () => (tabNavigationEnabled ? internalActiveTab.value : 'connection'),
	set: (value) => {
		if (tabNavigationEnabled) {
			// Additional frontend validation to ensure that other
			// tabs than 'connection' are only accessible when project-scoped secrets
			// are enabled and the user has global update permission.
			internalActiveTab.value = value;
		}
	},
});

const sidebarItems = computed(() => {
	const menuItems: IMenuItem[] = [
		{
			id: 'connection',
			label: i18n.baseText('settings.secretsProviderConnections.modal.items.connection'),
			position: 'top',
		},
		{
			id: 'sharing',
			label: i18n.baseText('settings.secretsProviderConnections.modal.items.scope'),
			position: 'top',
		},
	];

	return menuItems;
});

const scopeOptions = computed<Array<{ value: string; label: string; icon: IconOrEmoji }>>(() => {
	const options: Array<{ value: string; label: string; icon: IconOrEmoji }> = [
		{
			value: '',
			label: i18n.baseText('settings.secretsProviderConnections.modal.scope.global'),
			icon: { type: 'icon', value: 'globe' },
		},
	];

	options.push(
		...projectsStore.teamProjects.map((project: ProjectSharingData) => {
			const icon = (project.icon ?? {
				type: 'icon' as const,
				value: 'layer-group',
			}) as IconOrEmoji;
			return {
				value: project.id,
				label: project.name ?? project.id,
				icon,
			};
		}),
	);

	return options;
});

const scopeSelectValue = computed(() =>
	modal.isSharedGlobally.value ? '' : (modal.projectIds.value[0] ?? ''),
);

const selectedScopeIcon = computed<IconOrEmoji>(() => {
	const selectedOption = scopeOptions.value.find(
		(option) => option.value === scopeSelectValue.value,
	);
	return selectedOption?.icon ?? { type: 'icon' as const, value: 'globe' };
});

function handleScopeSelect(value: string) {
	if (value === '') {
		modal.setScopeState([], true);
	} else {
		modal.setScopeState([value], false);
	}
}

// Handlers
function handleConnectionNameUpdate(value: string) {
	modal.connectionName.value = value;
	modal.connectionNameBlurred.value = false;
}

function handleConnectionNameBlur() {
	modal.connectionNameBlurred.value = true;
}

function handleProviderTypeChange(providerType: string) {
	modal.selectProviderType(providerType);
}

function handleSettingChange(update: IUpdateInformation) {
	modal.updateSettings(update.name, update.value);
}

async function handleSave() {
	await modal.saveConnection();
}

function handleDelete() {
	if (!modal.providerKey.value) return;

	const deleteProjectId =
		modal.connectionProjects.value.length > 0 ? modal.connectionProjects.value[0].id : undefined;

	uiStore.openModalWithData({
		name: DELETE_SECRETS_PROVIDER_MODAL_KEY,
		data: {
			providerKey: modal.providerKey.value,
			providerName: modal.connectionName.value,
			secretsCount: modal.providerSecretsCount.value ?? 0,
			projectId: deleteProjectId,
			onConfirm: () => {
				props.data.onClose?.();
				eventBus.emit('close');
			},
		},
	});
}

async function handleBeforeClose() {
	if (modal.hasUnsavedChanges.value) {
		const result = await confirm(
			i18n.baseText('settings.secretsProviderConnections.modal.unsavedChanges.text'),
			{
				title: i18n.baseText('settings.secretsProviderConnections.modal.unsavedChanges.title'),
				confirmButtonText: i18n.baseText('generic.keepEditing'),
				cancelButtonText: i18n.baseText('generic.close'),
			},
		);

		if (result === MODAL_CONFIRM) {
			return false;
		}
	}

	props.data.onClose?.();
	return true;
}

onMounted(async () => {
	if (providerTypes.value.length === 0) return;

	if (modal.isEditMode.value) {
		await Promise.all([modal.loadConnection()]);
	}
});
</script>

<template>
	<Modal
		v-if="providerTypes.length"
		:id="`${SECRETS_PROVIDER_CONNECTION_MODAL_KEY}-modal`"
		:custom-class="$style.secretsProviderConnectionModal"
		:event-bus="eventBus"
		:name="SECRETS_PROVIDER_CONNECTION_MODAL_KEY"
		:before-close="handleBeforeClose"
		width="70%"
		height="80%"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.info">
					<div :class="$style.icon">
						<SecretsProviderImage
							v-if="modal.selectedProviderType.value"
							:provider="modal.selectedProviderType.value"
							:class="$style.headerIcon"
						/><N8nIcon v-else icon="vault" width="24" height="24" />
					</div>
					<div :class="$style.name">
						<N8nText
							v-if="modal.providerKey.value"
							size="large"
							:class="$style.providerName"
							:title="modal.providerKey.value"
						>
							{{ modal.providerKey.value }}
						</N8nText>
						<N8nText
							:size="modal.providerKey.value ? 'small' : 'large'"
							:color="modal.providerKey.value ? 'text-light' : 'text-base'"
						>
							{{
								modal.selectedProviderType.value?.displayName ??
								i18n.baseText('settings.secretsProviderConnections.modal.providerType.placeholder')
							}}
						</N8nText>
					</div>
				</div>
				<div :class="$style.actions">
					<N8nTooltip placement="left">
						<N8nIconButton
							v-if="modal.isEditMode.value && modal.canDelete.value"
							:title="i18n.baseText('generic.delete')"
							icon="trash-2"
							variant="ghost"
							:disabled="modal.isSaving.value"
							data-test-id="secrets-provider-delete-button"
							@click="handleDelete"
						/>
						<template #content>{{ i18n.baseText('generic.delete') }}</template>
					</N8nTooltip>
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
				<nav v-if="tabNavigationEnabled" :class="$style.sidebar">
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
															count: modal.providerSecretsCount.value,
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

								<Banner
									v-else-if="modal.connection.connectionState.value === 'error'"
									class="mb-l"
									data-test-id="connection-error-banner"
									theme="danger"
									:message="
										i18n.baseText('settings.secretsProviderConnections.modal.testConnection.error')
									"
									:details="modal.connection.connectionError.value"
								/>

								<!-- Provider Name Input -->
								<div class="mb-l">
									<N8nInputLabel
										:label="
											i18n.baseText('settings.secretsProviderConnections.modal.connectionName')
										"
									/>
									<N8nInput
										data-test-id="provider-name"
										:model-value="modal.connectionName.value"
										:readonly="modal.isEditMode.value"
										:disabled="modal.isEditMode.value"
										aria-required="true"
										placeholder="vault-project-x-y-z"
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
										:ref="(el) => modal.setParameterValidationState(property.name, el)"
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

						<!-- Scope Tab Content (edit mode only) -->
						<div v-if="ACTIVE_TAB === 'sharing' && modal.isEditMode" :class="$style.mainContent">
							<div>
								<N8nInfoTip :bold="false" class="mb-s">
									{{ i18n.baseText('settings.secretsProviderConnections.modal.scope.info') }}
								</N8nInfoTip>
								<N8nInputLabel
									:label="i18n.baseText('settings.secretsProviderConnections.modal.scope.label')"
								>
									<N8nSelect
										:model-value="scopeSelectValue"
										size="large"
										filterable
										:disabled="!modal.canUpdate.value"
										data-test-id="secrets-provider-scope-select"
										@update:model-value="handleScopeSelect"
									>
										<template #prefix>
											<N8nText
												v-if="selectedScopeIcon?.type === 'emoji'"
												color="text-light"
												:class="$style.menuItemEmoji"
											>
												{{ selectedScopeIcon.value }}
											</N8nText>
											<N8nIcon
												v-else-if="selectedScopeIcon?.value"
												color="text-light"
												:icon="selectedScopeIcon.value"
											/>
										</template>
										<N8nOption
											v-for="option in scopeOptions"
											:key="option.value || 'global'"
											:value="option.value"
											:label="option.label"
											:class="{ [$style.globalOption]: option.value === '' }"
										>
											<div :class="$style.optionContent">
												<N8nText v-if="option.icon?.type === 'emoji'" :class="$style.menuItemEmoji">
													{{ option.icon.value }}
												</N8nText>
												<N8nIcon v-else-if="option.icon?.value" :icon="option.icon.value" />
												<span>{{ option.label }}</span>
											</div>
										</N8nOption>
									</N8nSelect>
								</N8nInputLabel>
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
	min-height: var(--dialog--min-height);
	max-height: var(--dialog--max-height);

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
	padding-bottom: 60px;
}

.icon {
	width: 1.5rem;
	height: 1.5rem;
	min-width: 1.5rem;
	display: flex;
	align-items: center;
	margin-right: var(--spacing--xs);
}

.name {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.providerName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
	min-width: 0;
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
	margin-top: var(--spacing--4xs);
}

.optionContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.menuItemEmoji {
	font-size: var(--font-size--sm);
	line-height: 1;
}

.globalOption {
	position: relative;
	margin-bottom: var(--spacing--sm);
	overflow: visible;

	&::after {
		content: '';
		position: absolute;
		bottom: calc(var(--spacing--2xs) * -1);
		left: var(--spacing--xs);
		right: var(--spacing--xs);
		height: 1px;
		background-color: var(--color--foreground);
	}
}
</style>
