<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCheckbox,
	N8nCopyInput,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
	useMessage,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';
import {
	createPromotionProvider,
	deletePromotionProvider,
	fetchPromotionConnections,
	fetchPromotionProvider,
	updatePromotionProvider,
	type PromotionConnection,
	type PromotionProvider,
} from '../promotionsSettings.api';
import {
	buildProviderCreatePayload,
	buildProviderUpdatePayload,
	emptyProviderForm,
	providerFormFrom,
	type ProviderFormState,
} from '../promotionsSettings.utils';

const props = defineProps<{
	open: boolean;
	providerId?: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	saved: [id: string];
	deleted: [id: string];
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();

const form = reactive<ProviderFormState>(emptyProviderForm());

const step = ref<'form' | 'key'>('form');
const current = ref<PromotionProvider | null>(null);
const usedBy = ref<PromotionConnection[]>([]);
const generatedPublicKey = ref<string | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const nameInput = useTemplateRef<InstanceType<typeof N8nInput>>('nameInput');
const doneButton = useTemplateRef<{ $el?: HTMLElement }>('doneButton');

const isEdit = computed(() => props.providerId !== undefined);

const title = computed(() => {
	if (step.value === 'key') return i18n.baseText('settings.promotions.provider.dialog.title.key');
	return i18n.baseText(
		isEdit.value
			? 'settings.promotions.provider.dialog.title.edit'
			: 'settings.promotions.provider.dialog.title.add',
	);
});

const ariaDescription = computed(() =>
	i18n.baseText(
		step.value === 'key'
			? 'settings.promotions.provider.dialog.key.ariaDescription'
			: 'settings.promotions.provider.dialog.ariaDescription',
	),
);

// Provider lists omit the SSH public key.
const storedPublicKey = computed(() => {
	const config = current.value?.config;
	return config && 'publicKey' in config ? config.publicKey : null;
});

const isInUse = computed(() => usedBy.value.length > 0);
const usedByNames = computed(() => usedBy.value.map((connection) => connection.name).join(', '));

const hasUsername = computed(() => form.username.trim().length > 0);
const hasPassword = computed(() => form.password.length > 0);

// Token credentials change as a pair. Empty edit fields keep the stored credentials.
const areCredentialsIncomplete = computed(() => {
	if (form.authType !== 'token') return false;
	if (!isEdit.value) return !(hasUsername.value && hasPassword.value);
	if (!hasUsername.value && !hasPassword.value) return false;
	return !(hasUsername.value && hasPassword.value);
});

const hasChanges = computed(() => {
	if (!current.value) return true;
	return Object.keys(buildProviderUpdatePayload(form, current.value)).length > 0;
});

const saveDisabledReason = computed(() => {
	if (!form.name.trim()) return i18n.baseText('settings.promotions.provider.form.incomplete');
	if (areCredentialsIncomplete.value)
		return i18n.baseText('settings.promotions.provider.form.credentials.required');
	if (!hasChanges.value) return i18n.baseText('settings.promotions.provider.form.noChanges');
	return undefined;
});

const isSaveDisabled = computed(
	() => isSubmitting.value || isLoading.value || saveDisabledReason.value !== undefined,
);

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function focusStep() {
	void nextTick(() => {
		if (step.value === 'key') doneButton.value?.$el?.focus();
		else nameInput.value?.focus();
	});
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	focusStep();
}

// The page restores focus after it renders the provider list.
function onCloseAutoFocus(event: Event) {
	event.preventDefault();
}

// The component mounts after the dialog opens, so load it on mount.
onMounted(async () => {
	if (props.providerId === undefined) {
		focusStep();
		return;
	}

	isLoading.value = true;
	try {
		const [provider, connections] = await Promise.all([
			fetchPromotionProvider(rootStore.publicApiContext, props.providerId),
			fetchPromotionConnections(rootStore.publicApiContext, { providerId: props.providerId }),
		]);
		current.value = provider;
		usedBy.value = connections;
		Object.assign(form, providerFormFrom(provider));
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.load'));
		close();
	} finally {
		isLoading.value = false;
		focusStep();
	}
});

async function submit() {
	if (isSaveDisabled.value) return;

	const existing = current.value;
	isSubmitting.value = true;
	try {
		if (existing) {
			const updated = await updatePromotionProvider(
				rootStore.publicApiContext,
				existing.id,
				buildProviderUpdatePayload(form, existing),
			);
			const rotatedKey =
				'publicKey' in updated.config && updated.config.publicKey !== storedPublicKey.value
					? updated.config.publicKey
					: null;
			current.value = updated;
			toast.showMessage({
				title: i18n.baseText('settings.promotions.provider.toast.updated'),
				type: 'success',
			});
			emit('saved', updated.id);

			if (rotatedKey) {
				generatedPublicKey.value = rotatedKey;
				step.value = 'key';
				focusStep();
			} else {
				close();
			}
		} else {
			const created = await createPromotionProvider(
				rootStore.publicApiContext,
				buildProviderCreatePayload(form),
			);
			toast.showMessage({
				title: i18n.baseText('settings.promotions.provider.toast.created'),
				type: 'success',
			});
			emit('saved', created.provider.id);

			if (created.publicKey) {
				generatedPublicKey.value = created.publicKey;
				step.value = 'key';
				focusStep();
			} else {
				close();
			}
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.save'));
	} finally {
		isSubmitting.value = false;
	}
}

async function onDelete() {
	const existing = current.value;
	if (!existing) return;

	const confirmed = await message.confirm(
		i18n.baseText('settings.promotions.provider.delete.confirm.message'),
		i18n.baseText('settings.promotions.provider.delete.confirm.title'),
		{
			confirmButtonText: i18n.baseText('settings.promotions.provider.delete.confirm.button'),
			customClass: 'el-message-box--destructive',
			showClose: true,
		},
	);

	if (confirmed !== MODAL_CONFIRM) return;

	isSubmitting.value = true;
	try {
		await deletePromotionProvider(rootStore.publicApiContext, existing.id);
		toast.showMessage({
			title: i18n.baseText('settings.promotions.provider.toast.deleted'),
			type: 'success',
		});
		emit('deleted', existing.id);
		close();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.promotions.provider.toast.error.delete'));
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		:aria-description="ariaDescription"
		data-test-id="promotion-provider-dialog"
		@open-auto-focus="onOpenAutoFocus"
		@close-auto-focus="onCloseAutoFocus"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div
			v-if="step === 'key' && generatedPublicKey"
			:class="$style.form"
			data-test-id="promotion-provider-key-step"
		>
			<N8nInputLabel :label="i18n.baseText('settings.promotions.provider.publicKey.label')">
				<N8nCopyInput
					:value="generatedPublicKey"
					:copy-label="i18n.baseText('settings.promotions.provider.publicKey.copy')"
					:copied-label="i18n.baseText('generic.copiedToClipboard')"
					data-test-id="promotion-provider-public-key"
				/>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.promotions.provider.publicKey.hint') }}
				</N8nText>
			</N8nInputLabel>
			<N8nDialogFooter>
				<N8nButton ref="doneButton" data-test-id="promotion-provider-done-button" @click="close">
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
			</N8nDialogFooter>
		</div>

		<form
			v-else
			:class="$style.form"
			data-test-id="promotion-provider-form-step"
			@submit.prevent="submit"
		>
			<N8nNotice v-if="isEdit && isInUse" theme="warning" data-test-id="promotion-provider-in-use">
				{{ i18n.baseText('settings.promotions.provider.inUse.warning') }}
				{{
					i18n.baseText('settings.promotions.provider.inUse.connections', {
						interpolate: { names: usedByNames },
					})
				}}
			</N8nNotice>

			<N8nInputLabel
				input-name="promotion-provider-name"
				:label="i18n.baseText('settings.promotions.provider.form.name')"
				required
			>
				<N8nInput
					id="promotion-provider-name"
					ref="nameInput"
					v-model="form.name"
					:disabled="isLoading"
					data-test-id="promotion-provider-name-input"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="promotion-provider-auth-type"
				:label="i18n.baseText('settings.promotions.provider.form.authType')"
				:tooltip-text="
					isEdit ? i18n.baseText('settings.promotions.provider.form.authType.locked') : undefined
				"
			>
				<N8nSelect
					id="promotion-provider-auth-type"
					v-model="form.authType"
					:teleported="false"
					:disabled="isLoading || isEdit"
					data-test-id="promotion-provider-auth-type-select"
				>
					<N8nOption
						value="ssh-key"
						:label="i18n.baseText('settings.promotions.providers.authType.sshKey')"
					/>
					<N8nOption
						value="token"
						:label="i18n.baseText('settings.promotions.providers.authType.token')"
					/>
				</N8nSelect>
			</N8nInputLabel>

			<template v-if="form.authType === 'ssh-key'">
				<N8nInputLabel
					v-if="!isEdit"
					input-name="promotion-provider-key-type"
					:label="i18n.baseText('settings.promotions.provider.form.keyType')"
				>
					<N8nSelect
						id="promotion-provider-key-type"
						v-model="form.keyType"
						:teleported="false"
						:disabled="isLoading"
						data-test-id="promotion-provider-key-type-select"
					>
						<N8nOption value="ed25519" label="ED25519" />
						<N8nOption value="rsa" label="RSA" />
					</N8nSelect>
				</N8nInputLabel>

				<N8nInputLabel
					v-if="storedPublicKey"
					:label="i18n.baseText('settings.promotions.provider.publicKey.label')"
				>
					<N8nCopyInput
						:value="storedPublicKey"
						:copy-label="i18n.baseText('settings.promotions.provider.publicKey.copy')"
						:copied-label="i18n.baseText('generic.copiedToClipboard')"
						data-test-id="promotion-provider-public-key"
					/>
				</N8nInputLabel>

				<div v-if="isEdit">
					<N8nCheckbox
						v-model="form.regenerateKey"
						:label="i18n.baseText('settings.promotions.provider.regenerateKey')"
						:disabled="isLoading"
						data-test-id="promotion-provider-regenerate-key"
					/>
					<N8nText v-if="form.regenerateKey" size="small" color="text-light">
						{{ i18n.baseText('settings.promotions.provider.regenerateKey.hint') }}
					</N8nText>
				</div>
			</template>

			<template v-else>
				<N8nInputLabel
					input-name="promotion-provider-username"
					:label="i18n.baseText('settings.promotions.provider.form.username')"
					:required="!isEdit"
				>
					<N8nInput
						id="promotion-provider-username"
						v-model="form.username"
						:disabled="isLoading"
						data-test-id="promotion-provider-username-input"
					/>
				</N8nInputLabel>

				<N8nInputLabel
					input-name="promotion-provider-password"
					:label="i18n.baseText('settings.promotions.provider.form.password')"
					:required="!isEdit"
				>
					<N8nInput
						id="promotion-provider-password"
						v-model="form.password"
						type="password"
						autocomplete="new-password"
						:disabled="isLoading"
						data-test-id="promotion-provider-password-input"
					/>
				</N8nInputLabel>

				<N8nText v-if="hasUsername !== hasPassword" size="small" color="danger">
					{{ i18n.baseText('settings.promotions.provider.form.credentials.required') }}
				</N8nText>

				<N8nText v-if="isEdit" size="small" color="text-light">
					{{ i18n.baseText('settings.promotions.provider.form.credentials.keepHint') }}
				</N8nText>
			</template>

			<N8nDialogFooter>
				<N8nButton
					v-if="isEdit"
					:class="$style.deleteAction"
					type="button"
					variant="destructive"
					:disabled="isInUse || isSubmitting"
					data-test-id="promotion-provider-delete-button"
					@click="onDelete"
				>
					{{ i18n.baseText('generic.delete') }}
				</N8nButton>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="promotion-provider-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="submit"
					:disabled="isSaveDisabled"
					:loading="isSubmitting"
					data-test-id="promotion-provider-save-button"
				>
					{{ i18n.baseText('generic.save') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.deleteAction {
	margin-right: auto;
}
</style>
