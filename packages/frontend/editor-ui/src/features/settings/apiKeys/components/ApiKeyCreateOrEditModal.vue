<script lang="ts" setup>
import ApiKeyScopes from './ApiKeyScopes.vue';
import RevokeApiKeyConfirmModal from './RevokeApiKeyConfirmModal.vue';
import Modal from '@/app/components/Modal.vue';
import { API_KEY_CREATE_OR_EDIT_MODAL_KEY } from '../apiKeys.constants';
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useClipboard } from '@/app/composables/useClipboard';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useApiKeysStore } from '../apiKeys.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import type { BaseTextKey } from '@n8n/i18n';
import { DateTime } from 'luxon';
import type { ApiKey, ApiKeyWithRawValue, CreateApiKeyRequestDto } from '@n8n/api-types';
import type { ApiKeyScope } from '@n8n/permissions';

import { ElDatePicker } from 'element-plus';
import {
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
const EXPIRATION_OPTIONS = {
	'7_DAYS': 7,
	'30_DAYS': 30,
	'60_DAYS': 60,
	'90_DAYS': 90,
	CUSTOM: 1,
	NO_EXPIRATION: 0,
};

const i18n = useI18n();
const telemetry = useTelemetry();
const { showError, showMessage } = useToast();

const uiStore = useUIStore();
const rootStore = useRootStore();
const clipboard = useClipboard();
const apiKeysStore = useApiKeysStore();
const { createApiKey, updateApiKey, deleteApiKey, apiKeysById, availableScopes } = apiKeysStore;
const { currentUser } = storeToRefs(useUsersStore());
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

const showRevokeConfirm = ref(false);
const revoking = ref(false);

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
		/** When set, the modal opens straight into the created view to show a freshly rotated key. */
		rotatedApiKey?: ApiKeyWithRawValue | null;
	}>(),
	{
		mode: 'new',
		activeId: '',
		rotatedApiKey: null,
	},
);

const allFormFieldsAreSet = computed(() => {
	const isExpirationDateSet =
		expirationDaysFromNow.value === EXPIRATION_OPTIONS.NO_EXPIRATION ||
		(expirationDaysFromNow.value === EXPIRATION_OPTIONS.CUSTOM && customExpirationDate.value) ||
		expirationDate.value;

	return (
		label.value &&
		selectedScopes.value.length > 0 &&
		(props.mode === 'edit' ? true : isExpirationDateSet)
	);
});

const currentApiKey = computed<ApiKey | null>(() =>
	props.mode === 'edit' ? (apiKeysById[props.activeId] ?? null) : null,
);

const isReadOnly = computed(() => {
	const apiKey = currentApiKey.value;
	if (!apiKey?.owner || !currentUser.value) return false;
	return apiKey.owner.id !== currentUser.value.id;
});

const isCustomDateInThePast = (date: Date) => Date.now() > date.getTime();

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.api'));

	if (props.rotatedApiKey) {
		newApiKey.value = props.rotatedApiKey;
		rawApiKey.value = props.rotatedApiKey.rawApiKey;
		return;
	}

	setTimeout(() => {
		inputRef.value?.focus();
	});

	if (props.mode === 'edit') {
		const apiKey = apiKeysById[props.activeId];
		label.value = apiKey.label ?? '';
		apiKeyCreationDate.value = getApiKeyCreationTime(apiKey);
		selectedScopes.value = apiKey.scopes.filter((scope) => availableScopes.includes(scope));
	} else {
		selectedScopes.value = [...availableScopes];
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

const API_KEY_VISIBLE_CHARS_PER_SIDE = 30;

const isApiKeyTruncated = computed(
	() => rawApiKey.value.length > API_KEY_VISIBLE_CHARS_PER_SIDE * 2,
);
const apiKeyStart = computed(() =>
	isApiKeyTruncated.value
		? rawApiKey.value.slice(0, API_KEY_VISIBLE_CHARS_PER_SIDE)
		: rawApiKey.value,
);
const apiKeyEnd = computed(() =>
	isApiKeyTruncated.value ? rawApiKey.value.slice(-API_KEY_VISIBLE_CHARS_PER_SIDE) : '',
);

async function copyApiKey() {
	if (!rawApiKey.value) return;
	await clipboard.copy(rawApiKey.value);
	showMessage({
		title: i18n.baseText('settings.api.view.copy.toast'),
		type: 'success',
	});
}

const modalTitle = computed(() => {
	if (props.rotatedApiKey) {
		return i18n.baseText('settings.api.rotate.success.title');
	}
	if (isReadOnly.value && currentApiKey.value?.owner) {
		return i18n.baseText('settings.api.view.modal.title.readonly', {
			interpolate: { email: currentApiKey.value.owner.email },
		});
	}
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

async function onRevokeConfirm() {
	if (!currentApiKey.value) return;
	revoking.value = true;
	try {
		await deleteApiKey(props.activeId);
		showMessage({ type: 'success', title: i18n.baseText('settings.api.revoke.toast') });
		showRevokeConfirm.value = false;
		closeModal();
	} catch (error) {
		showError(error, i18n.baseText('settings.api.delete.error'));
	} finally {
		revoking.value = false;
		telemetry.track('User clicked delete API key button', { is_own: false });
	}
}

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
		if (isReadOnly.value) return;
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
				<div v-if="newApiKey" :class="$style.createdView">
					<N8nText size="small">{{ i18n.baseText('settings.api.view.copy') }}</N8nText>
					<div :class="$style.apiKeyField" data-test-id="copy-input">
						<div :class="[$style.apiKeyValue, 'ph-no-capture']">
							<span>{{ apiKeyStart }}</span>
							<template v-if="isApiKeyTruncated">
								<span>...</span>
								<span>{{ apiKeyEnd }}</span>
							</template>
						</div>
						<N8nIconButton
							icon="copy"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('generic.copy')"
							@click="copyApiKey"
						/>
					</div>
				</div>

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
							:disabled="isReadOnly"
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
						<ElDatePicker
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
						:disabled="isReadOnly"
						@update:model-value="onScopeSelectionChanged"
					/>
				</div>
				<RevokeApiKeyConfirmModal
					:api-key="currentApiKey"
					:open="showRevokeConfirm"
					:loading="revoking"
					:revoking-for-other="isReadOnly"
					@confirm="onRevokeConfirm"
					@cancel="showRevokeConfirm = false"
					@update:open="showRevokeConfirm = $event"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<template v-if="isReadOnly">
					<div :class="$style.readonlyActions">
						<N8nButton
							variant="destructive"
							:label="i18n.baseText('settings.api.revoke.button')"
							data-test-id="api-key-readonly-revoke"
							@click="showRevokeConfirm = true"
						/>
						<N8nButton
							variant="outline"
							:label="i18n.baseText('settings.api.view.modal.close.button')"
							data-test-id="api-key-readonly-close"
							@click="closeModal"
						/>
					</div>
					<N8nText size="small" color="text-light">{{ apiKeyCreationDate }}</N8nText>
				</template>
				<template v-else>
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
						:label="i18n.baseText('settings.api.view.modal.save.button')"
						@click="onEdit"
					/>
					<N8nText v-if="mode === 'edit'" size="small" color="text-light">{{
						apiKeyCreationDate
					}}</N8nText>
				</template>
			</div>
		</template>
	</Modal>
</template>
<style module lang="scss">
.notice {
	margin: 0;
}

.createdView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.apiKeyField {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--3xs) var(--spacing--3xs) var(--spacing--xs);
	background-color: var(--color--background--xlight);
	border: var(--border);
	border-radius: var(--radius);
}

.apiKeyValue {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-align: center;
	font-family: Monaco, Consolas, monospace;
	font-size: var(--font-size--xs);
	color: var(--color--text);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.expirationSection {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	gap: var(--spacing--xs);
}

.footer {
	display: flex;
	flex-direction: row-reverse;
	justify-content: space-between;
	align-items: center;
}

.readonlyActions {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}
</style>
