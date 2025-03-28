<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY, EnterpriseEditionFeature } from '@/constants';
import { computed, onMounted, ref } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@/composables/useI18n';
import { useRootStore } from '@/stores/root.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useApiKeysStore } from '@/stores/apiKeys.store';
import { useToast } from '@/composables/useToast';
import type { BaseTextKey } from '@/plugins/i18n';
import { N8nText } from '@n8n/design-system';
import { DateTime } from 'luxon';
import type { ApiKey, ApiKeyWithRawValue, CreateApiKeyRequestDto } from '@n8n/api-types';
import ApiKeyScopes from '@/components/ApiKeyScopes.vue';
import type { ApiKeyScope } from '@n8n/permissions';
import { useSettingsStore } from '@/stores/settings.store';

const EXPIRATION_OPTIONS = {
	'7_DAYS': 7,
	'30_DAYS': 30,
	'60_DAYS': 60,
	'90_DAYS': 90,
	CUSTOM: 1,
	NO_EXPIRATION: 0,
};

const i18n = useI18n();
const { showError, showMessage } = useToast();

const uiStore = useUIStore();
const rootStore = useRootStore();
const { createApiKey, updateApiKey, apiKeysById, availableScopes } = useApiKeysStore();
const documentTitle = useDocumentTitle();

const label = ref('');
const expirationDaysFromNow = ref(EXPIRATION_OPTIONS['30_DAYS']);
const modalBus = createEventBus();
const newApiKey = ref<ApiKeyWithRawValue | null>(null);
const loading = ref(false);
const rawApiKey = ref('');
const customExpirationDate = ref('');
const showExpirationDateSelector = ref(false);
const apiKeyCreationDate = ref('');
const selectedScopes = ref<ApiKeyScope[]>([]);

const settingsStore = useSettingsStore();
const apiKeyStore = useApiKeysStore();

const apiKeyScopesEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.ApiKeyScopes],
);

const calculateExpirationDate = (daysFromNow: number) => {
	const date = DateTime.now()
		.setZone(rootStore.timezone)
		.startOf('day')
		.plus({ days: daysFromNow });
	return date;
};

const getExpirationOptionLabel = (value: number) => {
	if (EXPIRATION_OPTIONS.CUSTOM === value) {
		return i18n.baseText('settings.api.view.modal.form.expiration.custom');
	}

	if (EXPIRATION_OPTIONS.NO_EXPIRATION === value) {
		return i18n.baseText('settings.api.view.modal.form.expiration.none');
	}

	return i18n.baseText('settings.api.view.modal.form.expiration.days', {
		interpolate: {
			numberOfDays: value,
		},
	});
};

const expirationDate = ref(
	calculateExpirationDate(expirationDaysFromNow.value).toFormat('ccc, MMM d yyyy'),
);

const inputRef = ref<HTMLTextAreaElement | null>(null);

const props = withDefaults(
	defineProps<{
		mode?: 'new' | 'edit';
		activeId?: string;
	}>(),
	{
		mode: 'new',
		activeId: '',
	},
);

const allFormFieldsAreSet = computed(() => {
	const isExpirationDateSet =
		expirationDaysFromNow.value === EXPIRATION_OPTIONS.NO_EXPIRATION ||
		(expirationDaysFromNow.value === EXPIRATION_OPTIONS.CUSTOM && customExpirationDate.value) ||
		expirationDate.value;

	return (
		label.value &&
		(!apiKeyScopesEnabled.value ? true : selectedScopes.value.length) &&
		(props.mode === 'edit' ? true : isExpirationDateSet)
	);
});

const isCustomDateInThePast = (date: Date) => Date.now() > date.getTime();

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.api'));

	setTimeout(() => {
		inputRef.value?.focus();
	});

	if (props.mode === 'edit') {
		const apiKey = apiKeysById[props.activeId];
		label.value = apiKey.label ?? '';
		apiKeyCreationDate.value = getApiKeyCreationTime(apiKey);
		selectedScopes.value = !apiKeyScopesEnabled.value ? apiKeyStore.availableScopes : apiKey.scopes;
	}

	if (props.mode === 'new' && !apiKeyScopesEnabled.value) {
		selectedScopes.value = availableScopes;
	}
});

function onInput(value: string): void {
	label.value = value;
}

function onScopeSelectionChanged(scopes: ApiKeyScope[]) {
	selectedScopes.value = scopes;
}

const getApiKeyCreationTime = (apiKey: ApiKey): string => {
	const time = DateTime.fromMillis(Date.parse(apiKey.createdAt)).toFormat('ccc, MMM d yyyy');
	return i18n.baseText('settings.api.creationTime', { interpolate: { time } });
};

async function onEdit() {
	try {
		loading.value = true;
		await updateApiKey(props.activeId, { label: label.value, scopes: selectedScopes.value });
		showMessage({
			type: 'success',
			title: i18n.baseText('settings.api.update.toast'),
		});
		closeModal();
	} catch (error) {
		showError(error, i18n.baseText('settings.api.edit.error'));
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(API_KEY_CREATE_OR_EDIT_MODAL_KEY);
}

const onSave = async () => {
	if (!label.value) {
		return;
	}

	let expirationUnixTimestamp = null;

	if (expirationDaysFromNow.value === EXPIRATION_OPTIONS.CUSTOM) {
		expirationUnixTimestamp = parseInt(customExpirationDate.value, 10);
	} else if (expirationDaysFromNow.value !== EXPIRATION_OPTIONS.NO_EXPIRATION) {
		expirationUnixTimestamp = calculateExpirationDate(expirationDaysFromNow.value).toUnixInteger();
	}

	const payload: CreateApiKeyRequestDto = {
		label: label.value,
		expiresAt: expirationUnixTimestamp,
		scopes: selectedScopes.value,
	};

	try {
		loading.value = true;
		newApiKey.value = await createApiKey(payload);
		rawApiKey.value = newApiKey.value.rawApiKey;

		showMessage({
			type: 'success',
			title: i18n.baseText('settings.api.create.toast'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.api.create.error'));
	} finally {
		loading.value = false;
	}
};

const modalTitle = computed(() => {
	let path = 'edit';
	if (props.mode === 'new') {
		if (newApiKey.value) {
			path = 'created';
		} else {
			path = 'create';
		}
	}
	return i18n.baseText(`settings.api.view.modal.title.${path}` as BaseTextKey);
});

const onSelect = (value: number) => {
	if (value === EXPIRATION_OPTIONS.CUSTOM) {
		showExpirationDateSelector.value = true;
		expirationDate.value = '';
		return;
	}

	if (value !== EXPIRATION_OPTIONS.NO_EXPIRATION) {
		expirationDate.value = calculateExpirationDate(value).toFormat('ccc, MMM d yyyy');
		showExpirationDateSelector.value = false;
		return;
	}

	expirationDate.value = '';
	showExpirationDateSelector.value = false;
};

async function handleEnterKey(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		if (props.mode === 'new') {
			await onSave();
		} else {
			await onEdit();
		}
	}
}
</script>

<template>
	<Modal
		:title="modalTitle"
		:event-bus="modalBus"
		:name="API_KEY_CREATE_OR_EDIT_MODAL_KEY"
		width="600px"
		:lock-scroll="false"
		:close-on-esc="true"
		:close-on-click-modal="false"
		:show-close="true"
	>
		<template #content>
			<div @keyup.enter="handleEnterKey">
				<n8n-card v-if="newApiKey" class="mb-4xs">
					<CopyInput
						:label="newApiKey.label"
						:value="newApiKey.rawApiKey"
						:redact-value="true"
						:copy-button-text="i18n.baseText('generic.clickToCopy')"
						:toast-title="i18n.baseText('settings.api.view.copy.toast')"
						:hint="i18n.baseText('settings.api.view.copy')"
					/>
				</n8n-card>

				<div v-else :class="$style.form">
					<N8nInputLabel
						:label="i18n.baseText('settings.api.view.modal.form.label')"
						color="text-dark"
					>
						<N8nInput
							ref="inputRef"
							required
							:model-value="label"
							size="large"
							type="text"
							:placeholder="i18n.baseText('settings.api.view.modal.form.label.placeholder')"
							:maxlength="50"
							data-test-id="api-key-label"
							@update:model-value="onInput"
						/>
					</N8nInputLabel>
					<div v-if="mode === 'new'" :class="$style.expirationSection">
						<N8nInputLabel
							:label="i18n.baseText('settings.api.view.modal.form.expiration')"
							color="text-dark"
						>
							<N8nSelect
								v-model="expirationDaysFromNow"
								size="large"
								filterable
								readonly
								data-test-id="expiration-select"
								@update:model-value="onSelect"
							>
								<N8nOption
									v-for="key in Object.keys(EXPIRATION_OPTIONS)"
									:key="key"
									:value="EXPIRATION_OPTIONS[key as keyof typeof EXPIRATION_OPTIONS]"
									:label="
										getExpirationOptionLabel(
											EXPIRATION_OPTIONS[key as keyof typeof EXPIRATION_OPTIONS],
										)
									"
								>
								</N8nOption>
							</N8nSelect>
						</N8nInputLabel>
						<N8nText v-if="expirationDate" class="mb-xs">{{
							i18n.baseText('settings.api.view.modal.form.expirationText', {
								interpolate: { expirationDate },
							})
						}}</N8nText>
						<el-date-picker
							v-if="showExpirationDateSelector"
							v-model="customExpirationDate"
							type="date"
							:teleported="false"
							placeholder="yyyy-mm-dd"
							value-format="X"
							:disabled-date="isCustomDateInThePast"
						/>
					</div>
					<ApiKeyScopes
						v-model="selectedScopes"
						:available-scopes="availableScopes"
						:enabled="apiKeyScopesEnabled"
						@update:model-value="onScopeSelectionChanged"
					/>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					v-if="mode === 'new' && !newApiKey"
					:loading="loading"
					:disabled="!allFormFieldsAreSet"
					:label="i18n.baseText('settings.api.view.modal.save.button')"
					@click="onSave"
				/>
				<N8nButton
					v-else-if="mode === 'new'"
					:label="i18n.baseText('settings.api.view.modal.done.button')"
					@click="closeModal"
				/>
				<N8nButton
					v-if="mode === 'edit'"
					:disabled="!allFormFieldsAreSet"
					:label="i18n.baseText('settings.api.view.modal.edit.button')"
					@click="onEdit"
				/>
				<N8nText v-if="mode === 'edit'" size="small" color="text-light">{{
					apiKeyCreationDate
				}}</N8nText>
			</div>
		</template>
	</Modal>
</template>
<style module lang="scss">
.notice {
	margin: 0;
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.expirationSection {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	gap: var(--spacing-xs);
}

.footer {
	display: flex;
	flex-direction: row-reverse;
	justify-content: space-between;
	align-items: center;
}
</style>
