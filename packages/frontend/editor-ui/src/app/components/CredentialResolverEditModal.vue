<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
	N8nIconButton,
	N8nSelect,
	N8nOption,
	N8nMenuItem,
	N8nText,
	N8nInlineTextEdit,
	N8nCallout,
	type IMenuItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { CREDENTIAL_RESOLVER_EDIT_MODAL_KEY, MODAL_CONFIRM } from '../constants';
import { createEventBus } from '@n8n/utils/event-bus';
import Modal from './Modal.vue';
import SaveButton from './SaveButton.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { CredentialResolverType, CredentialResolver } from '@n8n/api-types';
import {
	getCredentialResolverTypes,
	getCredentialResolver,
	createCredentialResolver,
	updateCredentialResolver,
	deleteCredentialResolver,
} from '@n8n/rest-api-client';
import type {
	INodeProperties,
	ICredentialDataDecryptedObject,
	CredentialInformation,
} from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';

const props = defineProps<{
	modalName: string;
	data?: {
		resolverId?: string;
		onSave?: (resolverId: string) => void;
		onDelete?: (resolverId: string) => void;
	};
}>();

const modalBus = createEventBus();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();

const activeTab = ref('configuration');
const isLoading = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const resolverName = ref('');
const resolverType = ref('');
const resolverConfig = ref<Record<string, unknown>>({});
const availableTypes = ref<CredentialResolverType[]>([]);
const hasUnsavedChanges = ref(false);
const errorMessage = ref<string>('');
const mainContentRef = ref<HTMLElement>();

const isEditMode = computed(() => !!props.data?.resolverId);

// Type guard to validate and convert resolver config to credential data
const isCredentialInformation = (value: unknown): value is CredentialInformation => {
	// Check for primitive types (string, number, boolean)
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return true;
	}

	// Check for arrays (can be string[] or IDataObject[])
	if (Array.isArray(value)) {
		// Accept arrays where all elements are either strings or objects
		return value.every(
			(v) => typeof v === 'string' || (typeof v === 'object' && v !== null && !Array.isArray(v)),
		);
	}

	// Check for IDataObject (plain object, not null or array)
	if (typeof value === 'object' && value !== null) {
		return true;
	}

	return false;
};

const toCredentialData = (config: Record<string, unknown>): ICredentialDataDecryptedObject => {
	const result: ICredentialDataDecryptedObject = {};
	for (const [key, value] of Object.entries(config)) {
		if (isCredentialInformation(value)) {
			result[key] = value;
		} else if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			// Convert primitive values to string for compatibility
			result[key] = String(value);
		}
	}
	return result;
};

const selectedType = computed(() => {
	return availableTypes.value.find((t) => t.name === resolverType.value);
});

// Helper function to convert resolver option to INodeProperties
// The explicit return type provides type narrowing from unknown to INodeProperties
const toNodeProperty = (option: Record<string, unknown>): INodeProperties => {
	return {
		name: typeof option.name === 'string' ? option.name : '',
		type: (typeof option.type === 'string' ? option.type : 'string') as INodeProperties['type'],
		displayName: typeof option.displayName === 'string' ? option.displayName : '',
		default: (option.default ?? '') as INodeProperties['default'],
		...(typeof option.required === 'boolean' && { required: option.required }),
		...(typeof option.description === 'string' && { description: option.description }),
		...(typeof option.placeholder === 'string' && { placeholder: option.placeholder }),
	};
};

const resolverProperties = computed<INodeProperties[]>(() => {
	if (!selectedType.value?.options) return [];

	// Transform resolver options to INodeProperties format
	return selectedType.value.options.map(toNodeProperty);
});

const resolverData = computed<ICredentialDataDecryptedObject>(() => {
	return toCredentialData(resolverConfig.value);
});

const requiredPropertiesFilled = computed(() => {
	for (const property of resolverProperties.value) {
		if (property.required !== true) {
			continue;
		}

		const resolverProperty = resolverData.value[property.name];

		if (property.type === 'string' && !resolverProperty) {
			return false;
		}

		if (property.type === 'number') {
			const containsExpression =
				typeof resolverProperty === 'string' && resolverProperty.startsWith('=');

			if (typeof resolverProperty !== 'number' && !containsExpression) {
				return false;
			}
		}
	}
	return true;
});

const canSave = computed(() => {
	return resolverName.value.trim() !== '' && resolverType.value !== '';
});

const sidebarItems = computed<IMenuItem[]>(() => [
	{
		id: 'configuration',
		label: i18n.baseText('credentialResolverEdit.sidebar.configuration'),
		position: 'top',
	},
	{
		id: 'details',
		label: i18n.baseText('credentialResolverEdit.sidebar.details'),
		position: 'top',
	},
]);

const loadResolverTypes = async () => {
	try {
		availableTypes.value = await getCredentialResolverTypes(rootStore.restApiContext);
	} catch (error) {
		toast.showError(error, i18n.baseText('credentialResolverEdit.error.loadTypes'));
	}
};

const loadResolver = async () => {
	if (!props.data?.resolverId) return;

	try {
		const resolver = await getCredentialResolver(rootStore.restApiContext, props.data.resolverId);
		resolverName.value = resolver.name;
		resolverType.value = resolver.type;
		resolverConfig.value = resolver.decryptedConfig || {};
	} catch (error) {
		toast.showError(error, i18n.baseText('credentialResolverEdit.error.save'));
	}
};

const beforeClose = () => {
	if (hasUnsavedChanges.value) {
		// Could add confirmation dialog here
	}
	return true;
};

const save = async () => {
	if (!canSave.value) return;

	isSaving.value = true;
	errorMessage.value = '';

	if (!requiredPropertiesFilled.value) {
		errorMessage.value = i18n.baseText('credentialResolverEdit.error.missingRequiredFields');
		isSaving.value = false;
		return;
	}

	try {
		const payload = {
			name: resolverName.value.trim(),
			type: resolverType.value,
			config: resolverConfig.value,
		};

		let savedResolver: CredentialResolver;
		if (isEditMode.value && props.data?.resolverId) {
			savedResolver = await updateCredentialResolver(
				rootStore.restApiContext,
				props.data.resolverId,
				payload,
			);
		} else {
			savedResolver = await createCredentialResolver(rootStore.restApiContext, payload);
		}

		if (props.data?.onSave) {
			props.data.onSave(savedResolver.id);
		}

		toast.showMessage({
			title: i18n.baseText('credentialResolverEdit.saveSuccess.title'),
			type: 'success',
		});

		hasUnsavedChanges.value = false;
		modalBus.emit('close');
	} catch (error) {
		errorMessage.value =
			error instanceof Error ? error.message : i18n.baseText('credentialResolverEdit.error.save');

		// Scroll to top to show error message
		mainContentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
	} finally {
		isSaving.value = false;
	}
};

const onConfigUpdate = (updateData: IUpdateInformation) => {
	resolverConfig.value = {
		...resolverConfig.value,
		[updateData.name]: updateData.value,
	};
	hasUnsavedChanges.value = true;
	errorMessage.value = '';
};

const onNameEdit = (newName: string) => {
	resolverName.value = newName;
	hasUnsavedChanges.value = true;
};

const onTabSelect = (tabId: string) => {
	activeTab.value = tabId;
};

const deleteResolver = async () => {
	if (!props.data?.resolverId) return;

	const savedResolverName = resolverName.value;

	const deleteConfirmed = await message.confirm(
		i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.message', {
			interpolate: { savedResolverName },
		}),
		i18n.baseText('credentialResolverEdit.confirmMessage.deleteResolver.headline'),
		{
			confirmButtonText: i18n.baseText(
				'credentialResolverEdit.confirmMessage.deleteResolver.confirmButtonText',
			),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		isDeleting.value = true;
		await deleteCredentialResolver(rootStore.restApiContext, props.data.resolverId);
		hasUnsavedChanges.value = false;

		if (props.data?.onDelete) {
			props.data.onDelete(props.data.resolverId);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('credentialResolverEdit.error.delete'));
		isDeleting.value = false;
		return;
	}

	isDeleting.value = false;
	modalBus.emit('close');

	toast.showMessage({
		title: i18n.baseText('credentialResolverEdit.deleteSuccess.title'),
		type: 'success',
	});
};

onMounted(async () => {
	isLoading.value = true;

	await loadResolverTypes();
	if (isEditMode.value) {
		await loadResolver();
	} else {
		// Set default name for new resolvers
		resolverName.value = i18n.baseText('credentialResolverEdit.defaultName');
	}
	isLoading.value = false;
});
</script>

<template>
	<Modal
		:name="CREDENTIAL_RESOLVER_EDIT_MODAL_KEY"
		:custom-class="$style.resolverModal"
		:event-bus="modalBus"
		:loading="isLoading"
		:before-close="beforeClose"
		width="70%"
		height="80%"
	>
		<template #header>
			<div :class="$style.header">
				<div :class="$style.resolverInfo">
					<div :class="$style.resolverIcon">
						<N8nIconButton icon="database" type="tertiary" size="large" :disabled="true" />
					</div>
					<div :class="$style.resolverName">
						<N8nInlineTextEdit
							v-if="resolverName"
							data-test-id="credential-resolver-name"
							:model-value="resolverName"
							@update:model-value="onNameEdit"
						/>
						<N8nText v-if="selectedType" size="small" tag="p" color="text-light">
							{{ selectedType.displayName }}
						</N8nText>
					</div>
				</div>
				<div :class="$style.resolverActions">
					<N8nIconButton
						v-if="isEditMode"
						:title="i18n.baseText('credentialResolverEdit.delete')"
						icon="trash-2"
						type="tertiary"
						:disabled="isSaving"
						:loading="isDeleting"
						data-test-id="credential-resolver-delete-button"
						@click="deleteResolver"
					/>
					<SaveButton
						:saved="false"
						:is-saving="isSaving"
						:disabled="!canSave"
						data-test-id="credential-resolver-save-button"
						@click="save"
					/>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="$style.container" data-test-id="credential-resolver-edit-dialog">
				<div :class="$style.sidebar">
					<N8nMenuItem
						v-for="item in sidebarItems"
						:key="item.id"
						:item="item"
						:active="activeTab === item.id"
						@click="() => onTabSelect(item.id)"
					/>
				</div>
				<div v-if="activeTab === 'configuration'" ref="mainContentRef" :class="$style.mainContent">
					<N8nCallout
						v-if="errorMessage"
						theme="danger"
						:class="$style.errorAlert"
						data-test-id="credential-resolver-error-alert"
					>
						{{ errorMessage }}
					</N8nCallout>

					<div :class="$style.formGroup">
						<label :class="$style.label">
							{{ i18n.baseText('credentialResolverEdit.type.label') }}
						</label>
						<N8nSelect
							v-model="resolverType"
							:placeholder="i18n.baseText('credentialResolverEdit.type.placeholder')"
							data-test-id="credential-resolver-type-select"
							@update:model-value="
								() => {
									hasUnsavedChanges = true;
									errorMessage = '';
								}
							"
						>
							<N8nOption
								v-for="type in availableTypes"
								:key="type.name"
								:label="type.displayName"
								:value="type.name"
							>
							</N8nOption>
						</N8nSelect>
					</div>

					<div v-if="resolverProperties.length > 0" :class="$style.configSection">
						<CredentialInputs
							:credential-properties="resolverProperties"
							:credential-data="resolverData"
							documentation-url=""
							:show-validation-warnings="!!errorMessage"
							@update="onConfigUpdate"
						/>
					</div>
				</div>
				<div v-if="activeTab === 'details'" :class="$style.mainContent">
					<div :class="$style.formGroup">
						<label :class="$style.label">
							{{ i18n.baseText('credentialResolverEdit.details.id') }}
						</label>
						<N8nText v-if="props.data?.resolverId" color="text-base">
							{{ props.data.resolverId }}
						</N8nText>
						<N8nText v-else color="text-light">
							{{ i18n.baseText('credentialResolverEdit.details.notSaved') }}
						</N8nText>
					</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.resolverModal {
	--dialog--max-width: 1200px;
	--dialog--close--spacing--top: 31px;
	--dialog--max-height: 750px;

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
	padding-bottom: 100px;
}

.resolverName {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing--4xs);
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

.resolverInfo {
	display: flex;
	align-items: center;
	flex-direction: row;
	flex-grow: 1;
	margin-bottom: var(--spacing--lg);
}

.resolverActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-right: var(--spacing--xl);
	margin-bottom: var(--spacing--lg);

	> * {
		margin-left: var(--spacing--2xs);
	}
}

.resolverIcon {
	display: flex;
	align-items: center;
	margin-right: var(--spacing--xs);
}

.formGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--md);
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.configSection {
	margin-top: var(--spacing--lg);
}

.errorAlert {
	margin-bottom: var(--spacing--md);
}
</style>
