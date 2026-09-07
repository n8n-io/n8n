<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCard,
	N8nCopyInput,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from 'vue';

import {
	createGitConnection,
	fetchGitConnection,
	updateGitConnection,
	type GitConnection,
} from '../gitConnections.api';
import {
	buildCreatePayload,
	buildUpdatePayload,
	type GitConnectionFormState,
} from '../gitConnections.utils';

const CREDENTIALS_HINT_ID = 'git-connection-credentials-hint';

const props = defineProps<{
	open: boolean;
	connectionId?: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	saved: [id: string];
	delete: [id: string];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const form = reactive<GitConnectionFormState>({
	name: '',
	repositoryUrl: '',
	branchName: '',
	connectionType: 'ssh',
	keyGeneratorType: 'ed25519',
	username: '',
	password: '',
});

const step = ref<'type' | 'form' | 'key'>(props.connectionId === undefined ? 'type' : 'form');
const current = ref<GitConnection | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const newPublicKey = ref<string | null>(null);
const nameInput = useTemplateRef<InstanceType<typeof N8nInput>>('nameInput');
const typeCard = useTemplateRef<{ $el?: HTMLElement }>('typeCard');
const doneButton = useTemplateRef<{ $el?: HTMLElement }>('doneButton');

const isEdit = computed(() => props.connectionId !== undefined);

const title = computed(() => {
	if (step.value === 'type')
		return i18n.baseText('settings.gitConnections.dialog.title.selectType');
	if (step.value === 'key') return i18n.baseText('settings.gitConnections.dialog.title.deployKey');
	return i18n.baseText(
		isEdit.value
			? 'settings.gitConnections.dialog.title.edit'
			: 'settings.gitConnections.dialog.title.create',
	);
});

const ariaDescription = computed(() => {
	if (step.value === 'type')
		return i18n.baseText('settings.gitConnections.dialog.selectType.ariaDescription');
	if (step.value === 'key')
		return i18n.baseText('settings.gitConnections.dialog.deployKey.ariaDescription');
	return i18n.baseText('settings.gitConnections.dialog.ariaDescription');
});

const credentialsRequired = computed(
	() => form.connectionType === 'https' && current.value?.connectionType !== 'https',
);

const hasUsername = computed(() => form.username.trim().length > 0);
const hasPassword = computed(() => form.password.trim().length > 0);

// `buildUpdatePayload` sends username and password together or not at all, so a
// password-only edit would silently do nothing.
const areCredentialsIncomplete = computed(
	() =>
		form.connectionType === 'https' &&
		(credentialsRequired.value || !!form.username || !!form.password) &&
		!(hasUsername.value && hasPassword.value),
);

const isKeyTypeDisabled = computed(() => current.value?.connectionType === 'ssh');

const existingPublicKey = computed(() =>
	form.connectionType === 'ssh' && current.value?.connectionType === 'ssh'
		? current.value.publicKey
		: null,
);

// The payload builder already decides what an edit would actually send, so an
// empty one means there is nothing to save.
const hasChanges = computed(
	() => !current.value || Object.keys(buildUpdatePayload(form, current.value)).length > 0,
);

// Setting credentials for the first time and rotating existing ones fail for
// different reasons, and the rotation rule is the one that is not obvious.
const credentialsMessage = computed(() =>
	i18n.baseText(
		credentialsRequired.value
			? 'settings.gitConnections.form.credentials.required'
			: 'settings.gitConnections.form.credentials.pairOnly',
	),
);

// A half-filled credential pair blocks the whole form, which is otherwise
// invisible when the user is editing an unrelated field.
const saveDisabledReason = computed(() => {
	if (!form.name.trim() || !form.repositoryUrl.trim())
		return i18n.baseText('settings.gitConnections.form.incomplete');
	if (areCredentialsIncomplete.value) return credentialsMessage.value;
	if (!hasChanges.value) return i18n.baseText('settings.gitConnections.form.noChanges');
	return undefined;
});

const isSaveDisabled = computed(
	() => isSubmitting.value || isLoading.value || saveDisabledReason.value !== undefined,
);

// The dialog is rendered under `v-if`, so it mounts already open: a watcher on
// `open` would never fire and the edit form would stay blank.
onMounted(async () => {
	if (props.connectionId === undefined) return;

	isLoading.value = true;
	try {
		const connection = await fetchGitConnection(rootStore.publicApiContext, props.connectionId);
		current.value = connection;
		form.name = connection.name;
		form.repositoryUrl = connection.repositoryUrl;
		form.branchName = connection.branchName ?? '';
		form.connectionType = connection.connectionType;
		form.keyGeneratorType = connection.keyGeneratorType ?? 'ed25519';
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.gitConnections.toast.error.load'));
		close();
	} finally {
		isLoading.value = false;
		focusStep();
	}
});

function close() {
	emit('update:open', false);
}

function onOpenChange(value: boolean) {
	if (value || isSubmitting.value) return;
	close();
}

function focusStep() {
	void nextTick(() => {
		if (step.value === 'type') typeCard.value?.$el?.focus();
		else if (step.value === 'key') doneButton.value?.$el?.focus();
		else nameInput.value?.focus();
	});
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	focusStep();
}

// The parent restores focus once the refreshed list has rendered; reka's own
// restore runs in a later macrotask and would overwrite it.
function onCloseAutoFocus(event: Event) {
	event.preventDefault();
}

function selectGit() {
	step.value = 'form';
	focusStep();
}

async function submit() {
	if (isSaveDisabled.value) return;

	const existing = current.value;
	isSubmitting.value = true;
	try {
		let saved: GitConnection;
		if (existing) {
			const payload = buildUpdatePayload(form, existing);
			saved = await updateGitConnection(rootStore.publicApiContext, existing.id, payload);
		} else {
			saved = await createGitConnection(rootStore.publicApiContext, buildCreatePayload(form));
		}

		toast.showMessage({
			title: i18n.baseText(
				existing
					? 'settings.gitConnections.toast.updated'
					: 'settings.gitConnections.toast.created',
			),
			type: 'success',
		});
		emit('saved', saved.id);

		if (saved.publicKey && saved.publicKey !== existing?.publicKey) {
			newPublicKey.value = saved.publicKey;
			step.value = 'key';
			focusStep();
		} else {
			close();
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.gitConnections.toast.error.save'));
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
		@open-auto-focus="onOpenAutoFocus"
		@close-auto-focus="onCloseAutoFocus"
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div v-if="step === 'type'" :class="$style.form" data-test-id="git-connection-type-step">
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.gitConnections.dialog.selectType.description') }}
			</N8nText>
			<N8nCard
				ref="typeCard"
				:class="$style.typeCard"
				role="button"
				tabindex="0"
				data-test-id="git-connection-type-git"
				@click="selectGit"
				@keydown.enter="selectGit"
				@keydown.space.prevent="selectGit"
			>
				<template #prepend>
					<N8nIcon icon="git-branch" color="text-dark" :size="20" />
				</template>
				<template #header>
					<N8nText bold>{{ i18n.baseText('settings.gitConnections.connectorType.git') }}</N8nText>
				</template>
				<N8nText color="text-light" size="small">
					{{ i18n.baseText('settings.gitConnections.connectorType.git.description') }}
				</N8nText>
				<template #append>
					<N8nIcon icon="chevron-right" color="text-light" />
				</template>
			</N8nCard>
			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					data-test-id="git-connection-type-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
			</N8nDialogFooter>
		</div>

		<div
			v-else-if="step === 'key' && newPublicKey"
			:class="$style.form"
			data-test-id="git-connection-key-step"
		>
			<N8nInputLabel :label="i18n.baseText('settings.gitConnections.publicKey.label')">
				<N8nCopyInput
					:value="newPublicKey"
					:copy-label="i18n.baseText('settings.gitConnections.publicKey.copy')"
					:copied-label="i18n.baseText('generic.copiedToClipboard')"
				/>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.gitConnections.publicKey.hint') }}
				</N8nText>
			</N8nInputLabel>
			<N8nDialogFooter>
				<N8nButton ref="doneButton" data-test-id="git-connection-done-button" @click="close">
					{{ i18n.baseText('settings.gitConnections.publicKey.done') }}
				</N8nButton>
			</N8nDialogFooter>
		</div>

		<form
			v-else
			:class="$style.form"
			data-test-id="git-connection-form-step"
			@submit.prevent="submit"
		>
			<N8nInputLabel
				input-name="git-connection-name"
				:label="i18n.baseText('settings.gitConnections.form.name')"
				required
			>
				<N8nInput
					id="git-connection-name"
					ref="nameInput"
					v-model="form.name"
					:disabled="isLoading"
					data-test-id="git-connection-name-input"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="git-connection-repository-url"
				:label="i18n.baseText('settings.gitConnections.form.repositoryUrl')"
				required
			>
				<N8nInput
					id="git-connection-repository-url"
					v-model="form.repositoryUrl"
					:disabled="isLoading"
					data-test-id="git-connection-repository-url-input"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="git-connection-branch"
				:label="i18n.baseText('settings.gitConnections.form.branchName')"
			>
				<N8nInput
					id="git-connection-branch"
					v-model="form.branchName"
					:disabled="isLoading"
					data-test-id="git-connection-branch-input"
				/>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="git-connection-type"
				:label="i18n.baseText('settings.gitConnections.form.connectionType')"
			>
				<N8nSelect
					id="git-connection-type"
					v-model="form.connectionType"
					:teleported="false"
					:disabled="isLoading"
					data-test-id="git-connection-type-select"
				>
					<N8nOption value="ssh" label="SSH" />
					<N8nOption value="https" label="HTTPS" />
				</N8nSelect>
			</N8nInputLabel>

			<template v-if="form.connectionType === 'ssh'">
				<N8nInputLabel
					input-name="git-connection-key-type"
					:label="i18n.baseText('settings.gitConnections.form.keyType')"
				>
					<N8nSelect
						id="git-connection-key-type"
						v-model="form.keyGeneratorType"
						:teleported="false"
						:disabled="isLoading || isKeyTypeDisabled"
						data-test-id="git-connection-key-type-select"
					>
						<N8nOption value="ed25519" label="ED25519" />
						<N8nOption value="rsa" label="RSA" />
					</N8nSelect>
				</N8nInputLabel>
				<N8nInputLabel
					v-if="existingPublicKey"
					:label="i18n.baseText('settings.gitConnections.publicKey.label')"
				>
					<N8nCopyInput
						:value="existingPublicKey"
						:copy-label="i18n.baseText('settings.gitConnections.publicKey.copy')"
						:copied-label="i18n.baseText('generic.copiedToClipboard')"
					/>
				</N8nInputLabel>
			</template>

			<template v-else>
				<N8nInputLabel
					input-name="git-connection-username"
					:label="i18n.baseText('settings.gitConnections.form.username')"
					:required="areCredentialsIncomplete"
				>
					<N8nInput
						id="git-connection-username"
						v-model="form.username"
						autocomplete="off"
						:disabled="isLoading"
						:aria-required="credentialsRequired"
						:aria-invalid="areCredentialsIncomplete"
						:aria-describedby="areCredentialsIncomplete ? CREDENTIALS_HINT_ID : undefined"
						:placeholder="
							areCredentialsIncomplete
								? ''
								: i18n.baseText('settings.gitConnections.form.credentials.keepPlaceholder')
						"
						data-test-id="git-connection-username-input"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					input-name="git-connection-password"
					:label="i18n.baseText('settings.gitConnections.form.password')"
					:required="areCredentialsIncomplete"
				>
					<N8nInput
						id="git-connection-password"
						v-model="form.password"
						type="password"
						autocomplete="new-password"
						:disabled="isLoading"
						:aria-required="credentialsRequired"
						:aria-invalid="areCredentialsIncomplete"
						:aria-describedby="areCredentialsIncomplete ? CREDENTIALS_HINT_ID : undefined"
						:placeholder="
							areCredentialsIncomplete
								? ''
								: i18n.baseText('settings.gitConnections.form.credentials.keepPlaceholder')
						"
						data-test-id="git-connection-password-input"
					/>
				</N8nInputLabel>
				<N8nText
					v-if="areCredentialsIncomplete"
					:id="CREDENTIALS_HINT_ID"
					size="small"
					color="danger"
				>
					{{ credentialsMessage }}
				</N8nText>
			</template>

			<N8nDialogFooter>
				<N8nButton
					v-if="connectionId"
					type="button"
					variant="destructive"
					:class="$style.deleteButton"
					:disabled="isSubmitting || isLoading"
					data-test-id="git-connection-delete-button"
					@click="emit('delete', connectionId)"
				>
					{{ i18n.baseText('generic.delete') }}
				</N8nButton>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="git-connection-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nTooltip :disabled="!saveDisabledReason" :content="saveDisabledReason">
					<N8nButton
						type="submit"
						:loading="isSubmitting"
						:disabled="isSaveDisabled"
						data-test-id="git-connection-save-button"
					>
						{{ i18n.baseText('generic.save') }}
					</N8nButton>
				</N8nTooltip>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
// Not `hoverable`: that turns the border primary-orange on hover and focus.
.typeCard {
	cursor: pointer;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus {
		outline: none;
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.deleteButton {
	margin-right: auto;
}
</style>
