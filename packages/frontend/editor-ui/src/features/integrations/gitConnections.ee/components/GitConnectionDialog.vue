<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCard,
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
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef } from 'vue';

import CopyInput from '@/app/components/CopyInput.vue';
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

const props = defineProps<{
	open: boolean;
	connectionId?: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	saved: [];
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

// Creating starts on the connector type list and advances into the git form in
// place, so the whole "add connector" flow stays in one dialog.
const step = ref<'type' | 'form'>(props.connectionId === undefined ? 'type' : 'form');
const current = ref<GitConnection | null>(null);
const isLoading = ref(false);
const isSubmitting = ref(false);
const newPublicKey = ref<string | null>(null);
const nameInput = useTemplateRef<InstanceType<typeof N8nInput>>('nameInput');
const typeCard = useTemplateRef<{ $el?: HTMLElement }>('typeCard');

const isEdit = computed(() => props.connectionId !== undefined);

const title = computed(() =>
	i18n.baseText(
		step.value === 'type'
			? 'settings.gitConnections.dialog.title.selectType'
			: isEdit.value
				? 'settings.gitConnections.dialog.title.edit'
				: 'settings.gitConnections.dialog.title.create',
	),
);

const ariaDescription = computed(() =>
	i18n.baseText(
		step.value === 'type'
			? 'settings.gitConnections.dialog.selectType.ariaDescription'
			: 'settings.gitConnections.dialog.ariaDescription',
	),
);

const credentialsRequired = computed(
	() => form.connectionType === 'https' && current.value?.connectionType !== 'https',
);

// Touching either half of the pair commits the user to both: the builder sends
// them together or not at all, so a password-only edit would be a silent no-op.
const areCredentialsIncomplete = computed(
	() =>
		form.connectionType === 'https' &&
		(credentialsRequired.value || !!form.username || !!form.password) &&
		!(form.username && form.password),
);

const isKeyTypeDisabled = computed(() => current.value?.connectionType === 'ssh');

const existingPublicKey = computed(() =>
	form.connectionType === 'ssh' && current.value?.connectionType === 'ssh'
		? current.value.publicKey
		: null,
);

const isSaveDisabled = computed(() => {
	if (isSubmitting.value || isLoading.value) return true;
	if (!form.name.trim() || !form.repositoryUrl.trim()) return true;
	if (areCredentialsIncomplete.value) return true;
	return false;
});

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
		else nameInput.value?.focus();
	});
}

function onOpenAutoFocus(event: Event) {
	event.preventDefault();
	focusStep();
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
		if (existing) {
			const payload = buildUpdatePayload(form, existing);
			if (Object.keys(payload).length === 0) {
				close();
				return;
			}
			const saved = await updateGitConnection(rootStore.publicApiContext, existing.id, payload);
			toast.showMessage({
				title: i18n.baseText('settings.gitConnections.toast.updated'),
				type: 'success',
			});
			emit('saved');
			// An ssh connection that stays ssh keeps its key, so the response echoing a
			// key does not mean there is a new one to deploy.
			if (saved.publicKey && saved.publicKey !== existing.publicKey) {
				newPublicKey.value = saved.publicKey;
			} else {
				close();
			}
		} else {
			const saved = await createGitConnection(rootStore.publicApiContext, buildCreatePayload(form));
			toast.showMessage({
				title: i18n.baseText('settings.gitConnections.toast.created'),
				type: 'success',
			});
			emit('saved');
			if (saved.publicKey) {
				newPublicKey.value = saved.publicKey;
			} else {
				close();
			}
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
		@update:open="onOpenChange"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>

		<div v-if="step === 'type'" :class="$style.form" data-test-id="git-connections-type-step">
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.gitConnections.dialog.selectType.description') }}
			</N8nText>
			<N8nCard
				ref="typeCard"
				hoverable
				role="button"
				tabindex="0"
				data-test-id="git-connections-type-git"
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
					data-test-id="git-connections-type-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
			</N8nDialogFooter>
		</div>

		<div v-else-if="newPublicKey" :class="$style.form" data-test-id="git-connection-key-step">
			<CopyInput
				:label="i18n.baseText('settings.gitConnections.form.publicKey.label')"
				:hint="i18n.baseText('settings.gitConnections.form.publicKey.hint')"
				:value="newPublicKey"
				:copy-button-text="i18n.baseText('generic.clickToCopy')"
			/>
			<N8nDialogFooter>
				<N8nButton data-test-id="git-connection-done-button" @click="close">
					{{ i18n.baseText('settings.gitConnections.form.publicKey.done') }}
				</N8nButton>
			</N8nDialogFooter>
		</div>

		<form v-else :class="$style.form" data-test-id="git-connection-dialog" @submit.prevent="submit">
			<N8nInputLabel
				input-name="git-connection-name"
				:label="i18n.baseText('settings.gitConnections.form.name')"
				required
			>
				<N8nInput
					id="git-connection-name"
					ref="nameInput"
					v-model="form.name"
					:readonly="isLoading"
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
				<N8nText v-if="isEdit" size="small" color="text-light">
					{{ i18n.baseText('settings.gitConnections.form.branchName.hint') }}
				</N8nText>
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
					<N8nOption
						value="ssh"
						:label="i18n.baseText('settings.gitConnections.connectionType.ssh')"
					/>
					<N8nOption
						value="https"
						:label="i18n.baseText('settings.gitConnections.connectionType.https')"
					/>
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
				<CopyInput
					v-if="existingPublicKey"
					:label="i18n.baseText('settings.gitConnections.form.publicKey.label')"
					:value="existingPublicKey"
					collapse
					:copy-button-text="i18n.baseText('generic.clickToCopy')"
				/>
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
						:placeholder="
							areCredentialsIncomplete
								? ''
								: i18n.baseText('settings.gitConnections.form.credentials.keepPlaceholder')
						"
						data-test-id="git-connection-password-input"
					/>
				</N8nInputLabel>
				<N8nText v-if="areCredentialsIncomplete" size="small" color="text-light">
					{{ i18n.baseText('settings.gitConnections.form.credentials.required') }}
				</N8nText>
			</template>

			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSubmitting"
					data-test-id="git-connection-cancel-button"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					type="submit"
					:loading="isSubmitting"
					:disabled="isSaveDisabled"
					data-test-id="git-connection-save-button"
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
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}
</style>
