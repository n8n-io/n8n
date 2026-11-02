<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
	N8nDialog,
	N8nDialogBody,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIconButton,
	N8nSpinner,
	N8nSelect,
	N8nOption,
	N8nMenuItem,
	N8nText,
	N8nInlineTextEdit,
	N8nCallout,
	type IMenuItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { CREDENTIAL_RESOLVER_EDIT_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import SaveButton from '@/app/components/SaveButton.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { CredentialResolver } from '@n8n/api-types';
import {
	getCredentialResolver,
	createCredentialResolver,
	updateCredentialResolver,
} from '@n8n/rest-api-client';
import { useCredentialResolvers } from '@/features/resolvers/composables/useCredentialResolvers';
import type {
	INodeProperties,
	INodeParameters,
	ICredentialDataDecryptedObject,
	CredentialInformation,
} from 'n8n-workflow';
import { deepCopy, NodeHelpers } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import CredentialInputs from '@/features/credentials/components/CredentialEdit/CredentialInputs.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	modalName: string;
	data?: {
		resolverId?: string;
		onSave?: (resolverId: string) => void;
		onDelete?: (resolverId: string) => void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(
	() => uiStore.modalsById[CREDENTIAL_RESOLVER_EDIT_MODAL_KEY]?.open === true,
);
const toast = useToast();
const rootStore = useRootStore();

const activeTab = ref('configuration');
const isLoading = ref(false);
const isSaving = ref(false);
const resolverName = ref('');
const resolverType = ref('');
const resolverConfig = ref<Record<string, unknown>>({});
const clearCredentials = ref<boolean | null>(null);
const hasUnsavedChanges = ref(false);
const errorMessage = ref<string>('');
const mainContentRef = ref<HTMLElement>();

// Store original values to detect non-name changes
const originalResolverName = ref('');
const originalResolverType = ref('');
const originalResolverConfig = ref<Record<string, unknown>>({});
// Track if user has ever made a non-name change (stays true even if reverted)
const hasEverMadeNonNameChange = ref(false);

const {
	resolverTypes: availableTypes,
	fetchResolverTypes: loadResolverTypes,
	deleteResolver: deleteResolverFromComposable,
	isDeleting,
} = useCredentialResolvers();

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
		...option,
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

	// Transform resolver options to INodeProperties format and filter by displayOptions
	return selectedType.value.options.map(toNodeProperty).filter((property) => {
		if (property.type === 'hidden') return false;
		if (!property.displayOptions) return true;
		return NodeHelpers.displayParameterPath(
			resolverData.value as INodeParameters,
			property,
			'',
			null,
			null,
		);
	});
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

// Check if non-name fields have changed
const hasNonNameChanges = computed(() => {
	if (!isEditMode.value) return false;

	const typeChanged = originalResolverType.value !== resolverType.value;
	const configChanged =
		JSON.stringify(originalResolverConfig.value) !== JSON.stringify(resolverConfig.value);

	// Update the flag if there's a current change
	if (typeChanged || configChanged) {
		hasEverMadeNonNameChange.value = true;
	}

	// Show dropdown if user has ever made a non-name change
	return hasEverMadeNonNameChange.value;
});

const canSave = computed(() => {
	const baseCheck = resolverName.value.trim() !== '' && resolverType.value !== '';
	if (isEditMode.value && hasNonNameChanges.value) {
		return baseCheck && clearCredentials.value !== null;
	}
	return baseCheck;
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

const loadResolver = async () => {
	if (!props.data?.resolverId) return;

	try {
		const resolver = await getCredentialResolver(rootStore.restApiContext, props.data.resolverId);
		resolverName.value = resolver.name;
		resolverType.value = resolver.type;
		resolverConfig.value = resolver.decryptedConfig || {};

		// Store original values for change detection
		originalResolverName.value = resolver.name;
		originalResolverType.value = resolver.type;
		originalResolverConfig.value = deepCopy(resolver.decryptedConfig || {});

		// Reset the flag when loading a resolver
		hasEverMadeNonNameChange.value = false;
		clearCredentials.value = null;
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

function closeDialog() {
	if (beforeClose() === false) return;
	uiStore.closeModal(CREDENTIAL_RESOLVER_EDIT_MODAL_KEY);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) closeDialog();
}

const save = async () => {
	if (!canSave.value) return;

	isSaving.value = true;
	errorMessage.value = '';

	if (!requiredPropertiesFilled.value) {
		errorMessage.value = i18n.baseText('credentialResolverEdit.error.missingRequiredFields');
		isSaving.value = false;
		return;
	}

	if (isEditMode.value && hasNonNameChanges.value && clearCredentials.value === null) {
		errorMessage.value = i18n.baseText('credentialResolverEdit.clearCredentials.error.required');
		isSaving.value = false;
		return;
	}

	try {
		const payload: {
			name: string;
			type: string;
			config: Record<string, unknown>;
			clearCredentials?: boolean;
		} = {
			name: resolverName.value.trim(),
			type: resolverType.value,
			config: resolverConfig.value,
		};

		// Include clearCredentials if non-name fields changed, otherwise default to false
		if (isEditMode.value) {
			if (hasNonNameChanges.value && clearCredentials.value !== null) {
				payload.clearCredentials = clearCredentials.value;
			} else if (!hasNonNameChanges.value) {
				// Only name changed, default to false
				payload.clearCredentials = false;
			}
		}

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
		closeDialog();
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
	// Reset clearCredentials when config changes to force user to make a choice
	if (isEditMode.value) {
		clearCredentials.value = null;
	}
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

	// Create a resolver object for the composable
	const resolver: CredentialResolver = {
		id: props.data.resolverId,
		name: resolverName.value,
		type: resolverType.value,
		config: JSON.stringify(resolverConfig.value),
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const deleted = await deleteResolverFromComposable(resolver);

	if (deleted) {
		hasUnsavedChanges.value = false;
		if (props.data?.onDelete) {
			props.data.onDelete(props.data.resolverId);
		}
		closeDialog();
	}
};

onMounted(async () => {
	isLoading.value = true;

	await loadResolverTypes();
	if (isEditMode.value) {
		await loadResolver();
	} else {
		// Set default name for new resolvers
		resolverName.value = i18n.baseText('credentialResolverEdit.defaultName');
		clearCredentials.value = null;
	}
	isLoading.value = false;
});
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="full"
		:container-class="$style.resolverModal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody v-if="isLoading">
			<N8nSpinner />
		</N8nDialogBody>
		<template v-else>
			<N8nDialogHeader :class="$style.dialogHeader">
				<div :class="$style.resolverInfo">
					<div :class="$style.resolverIcon">
						<N8nIconButton
							variant="outline"
							icon="database"
							size="large"
							:disabled="true"
							:aria-label="i18n.baseText('credentialResolverEdit.icon')"
						/>
					</div>
					<div :class="$style.resolverName">
						<N8nDialogTitle v-if="resolverName" as-child>
							<N8nInlineTextEdit
								data-test-id="credential-resolver-name"
								:model-value="resolverName"
								@update:model-value="onNameEdit"
							/>
						</N8nDialogTitle>
						<N8nText
							v-if="selectedType"
							size="small"
							tag="p"
							color="text-light"
							:class="$style.typeName"
						>
							{{ selectedType.displayName }}
						</N8nText>
					</div>
				</div>
				<div :class="$style.resolverActions">
					<N8nIconButton
						variant="outline"
						v-if="isEditMode"
						:title="i18n.baseText('credentialResolverEdit.delete')"
						icon="trash-2"
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
			</N8nDialogHeader>
			<N8nDialogBody :class="$style.body">
				<div :class="$style.modalLayout" data-test-id="credential-resolver-edit-dialog">
					<nav :class="$style.sidebar">
						<N8nMenuItem
							v-for="item in sidebarItems"
							:key="item.id"
							:item="item"
							:active="activeTab === item.id"
							@click="() => onTabSelect(item.id)"
						/>
					</nav>
					<div :class="$style.contentArea">
						<div
							v-if="activeTab === 'configuration'"
							ref="mainContentRef"
							:class="$style.mainContent"
						>
							<N8nCallout
								v-if="errorMessage"
								theme="danger"
								:class="$style.errorAlert"
								data-test-id="credential-resolver-error-alert"
							>
								{{ errorMessage }}
							</N8nCallout>

							<div v-if="isEditMode && hasNonNameChanges" :class="$style.formGroup">
								<label :class="$style.label">
									{{ i18n.baseText('credentialResolverEdit.clearCredentials.label') }}
								</label>
								<N8nSelect
									v-model="clearCredentials"
									:placeholder="
										i18n.baseText('credentialResolverEdit.clearCredentials.placeholder')
									"
									data-test-id="credential-resolver-clear-credentials-select"
									@update:model-value="
										() => {
											hasUnsavedChanges = true;
											errorMessage = '';
										}
									"
								>
									<N8nOption
										:label="i18n.baseText('credentialResolverEdit.clearCredentials.yes')"
										:value="true"
									>
									</N8nOption>
									<N8nOption
										:label="i18n.baseText('credentialResolverEdit.clearCredentials.no')"
										:value="false"
									>
									</N8nOption>
								</N8nSelect>
							</div>

							<N8nCallout
								v-if="isEditMode && hasNonNameChanges"
								theme="warning"
								:class="$style.warningAlert"
								data-test-id="credential-resolver-clear-credentials-warning"
							>
								{{ i18n.baseText('credentialResolverEdit.clearCredentials.warning') }}
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
											clearCredentials = null;
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
				</div>
			</N8nDialogBody>
		</template>
	</N8nDialog>
</template>

<style module lang="scss">
.resolverModal.resolverModal {
	/* Previous dialog cap. No spacing token for 1200px or 750px. */
	width: min(1200px, 70vw);
	max-width: min(1200px, 70vw);
	height: 80%;
	max-height: 750px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	/* Room for the title and the type label, so the header does not grow. */
	--resolver-dialog-header--height: calc(
		var(--n8n-dialog-region--padding) * 2 + var(--n8n-dialog-title--line) + var(--spacing--4xs) +
			var(--font-size--2xs) * var(--line-height--lg)
	);
	/* Center the close button on the save button. */
	--n8n-dialog-close--inset-block-start: calc(
		(var(--resolver-dialog-header--height) - var(--n8n-dialog-close--size)) / 2
	);
}

.dialogHeader.dialogHeader {
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	min-height: var(--resolver-dialog-header--height);
	padding-block: var(--n8n-dialog-region--padding);
	row-gap: 0;
}

.body {
	&.body {
		--n8n-dialog-body--padding-block-start: 0;
		--n8n-dialog-body--padding-block-end: 0;
		--n8n-dialog-body--padding-inline: 0;
		flex: 1 1 auto;
		min-height: 0;
		overflow: hidden;
		border-block: var(--border);
	}
}

.modalLayout {
	display: flex;
	flex: 1 1 auto;
	flex-direction: row;
	align-items: stretch;
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

.sidebar {
	display: flex;
	flex: 0 0 calc(var(--spacing--4xl) + var(--spacing--3xl));
	flex-direction: column;
	min-height: 0;
	overflow: auto;
	padding: var(--spacing--xs);
	border-inline-end: var(--border);

	ul {
		padding: 0 !important;
	}
}

.contentArea {
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow: auto;
	padding: var(--n8n-dialog-region--padding, var(--spacing--md));
}

.mainContent {
	min-width: 0;
}

.resolverName {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.typeName {
	margin: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.resolverInfo {
	display: flex;
	align-items: center;
	flex: 1 1 auto;
	flex-direction: row;
	min-width: 0;
}

.resolverActions {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
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
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}

.configSection {
	margin-top: var(--spacing--lg);
}

.errorAlert {
	margin-bottom: var(--spacing--md);
}

.warningAlert {
	margin-bottom: var(--spacing--md);
}
</style>
