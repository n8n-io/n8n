<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import CopyInput from '@/app/components/CopyInput.vue';
import {
	N8nButton,
	N8nCheckbox,
	N8nColorPicker,
	N8nFormInput,
	N8nNotice,
} from '@n8n/design-system';

import { useSourceControlConnectionsStore } from '../sourceControlConnections.store';
import type {
	SourceControlConnectionDto,
	SourceControlConnectionType,
} from '../sourceControlConnections.types';

const props = defineProps<{
	/** Existing connection to edit; omit to create a new one. */
	connection?: SourceControlConnectionDto;
}>();

const emit = defineEmits<{
	saved: [];
	cancel: [];
}>();

const locale = useI18n();
const toast = useToast();
const connectionsStore = useSourceControlConnectionsStore();

const isSaving = ref(false);
const connectionType = ref<SourceControlConnectionType>(props.connection?.connectionType ?? 'ssh');
const repositoryUrl = ref(props.connection?.repositoryUrl ?? '');
const branchName = ref(props.connection?.branchName ?? 'main');
const branchColor = ref(props.connection?.branchColor ?? '#5296D6');
const branchReadOnly = ref(props.connection?.branchReadOnly ?? false);
const httpsUsername = ref('');
const httpsPassword = ref('');
const branchOptions = ref<Array<{ value: string; label: string }>>([]);

const isEditing = computed(() => props.connection !== undefined);

const connectionTypeOptions = [
	{ value: 'ssh', label: 'SSH' },
	{ value: 'https', label: 'HTTPS' },
];

const loadBranches = async () => {
	if (!props.connection) return;
	try {
		const { branches } = await connectionsStore.getBranches(props.connection.id);
		branchOptions.value = branches.map((branch) => ({ value: branch, label: branch }));
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.refreshBranches.error'));
	}
};

const onRegenerateKey = async () => {
	if (!props.connection) return;
	try {
		await connectionsStore.generateKeyPair(props.connection.id);
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.refreshSshKey.successful.title'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.refreshSshKey.error.title'));
	}
};

const onSubmit = async () => {
	isSaving.value = true;
	try {
		if (props.connection) {
			await connectionsStore.update(props.connection.id, {
				branchName: branchName.value,
				branchColor: branchColor.value,
				branchReadOnly: branchReadOnly.value,
				...(httpsUsername.value ? { httpsUsername: httpsUsername.value } : {}),
				...(httpsPassword.value ? { httpsPassword: httpsPassword.value } : {}),
			});
		} else {
			await connectionsStore.create({
				repositoryUrl: repositoryUrl.value,
				connectionType: connectionType.value,
				branchName: branchName.value,
				branchColor: branchColor.value,
				branchReadOnly: branchReadOnly.value,
				...(connectionType.value === 'https'
					? { httpsUsername: httpsUsername.value, httpsPassword: httpsPassword.value }
					: {}),
			});
		}
		toast.showMessage({
			title: locale.baseText('settings.sourceControl.connections.toast.saved'),
			type: 'success',
		});
		emit('saved');
	} catch (error) {
		toast.showError(error, locale.baseText('settings.sourceControl.connections.toast.saveError'));
	}
	isSaving.value = false;
};
</script>

<template>
	<div :class="$style.form" data-test-id="source-control-connection-form">
		<div v-if="!isEditing" :class="$style.group">
			<label for="connectionType">{{
				locale.baseText('settings.sourceControl.connectionType')
			}}</label>
			<N8nFormInput
				id="connectionType"
				v-model="connectionType"
				label=""
				type="select"
				name="connectionType"
				:options="connectionTypeOptions"
				data-test-id="source-control-connection-type-select"
			/>
		</div>

		<div :class="$style.group">
			<label for="repoUrl">
				{{
					connectionType === 'ssh'
						? locale.baseText('settings.sourceControl.sshRepoUrl')
						: locale.baseText('settings.sourceControl.httpsRepoUrl')
				}}
			</label>
			<N8nFormInput
				id="repoUrl"
				v-model="repositoryUrl"
				label=""
				name="repoUrl"
				:disabled="isEditing"
				:placeholder="
					connectionType === 'ssh'
						? locale.baseText('settings.sourceControl.sshRepoUrlPlaceholder')
						: locale.baseText('settings.sourceControl.httpsRepoUrlPlaceholder')
				"
			/>
		</div>

		<div v-if="connectionType === 'https'" :class="$style.group">
			<label for="httpsUsername">{{
				locale.baseText('settings.sourceControl.httpsUsername')
			}}</label>
			<N8nFormInput
				id="httpsUsername"
				v-model="httpsUsername"
				label=""
				name="httpsUsername"
				type="text"
				:placeholder="locale.baseText('settings.sourceControl.httpsUsernamePlaceholder')"
			/>
		</div>

		<div v-if="connectionType === 'https'" :class="$style.group">
			<label for="httpsPassword">{{
				locale.baseText('settings.sourceControl.httpsPersonalAccessToken')
			}}</label>
			<N8nFormInput
				id="httpsPassword"
				v-model="httpsPassword"
				label=""
				name="httpsPassword"
				type="password"
				:placeholder="locale.baseText('settings.sourceControl.httpsPersonalAccessTokenPlaceholder')"
			/>
		</div>

		<div v-if="isEditing && connection?.publicKey" :class="$style.group">
			<label>{{ locale.baseText('settings.sourceControl.sshKey') }}</label>
			<div :class="$style.sshInput">
				<CopyInput
					:class="$style.copyInput"
					collapse
					size="medium"
					:value="connection.publicKey"
					:copy-button-text="locale.baseText('generic.clickToCopy')"
				/>
				<N8nButton
					variant="subtle"
					size="large"
					icon="refresh-cw"
					data-test-id="source-control-refresh-ssh-key-button"
					@click="onRegenerateKey"
				>
					{{ locale.baseText('settings.sourceControl.refreshSshKey') }}
				</N8nButton>
			</div>
			<N8nNotice type="info" class="mt-s">
				{{ locale.baseText('settings.sourceControl.connections.sshKeyNotice') }}
			</N8nNotice>
		</div>

		<div :class="$style.group">
			<label for="branchName">{{ locale.baseText('settings.sourceControl.branches') }}</label>
			<div :class="$style.branchSelection">
				<N8nFormInput
					v-if="branchOptions.length > 0"
					id="branchName"
					v-model="branchName"
					label=""
					type="select"
					name="branchName"
					:options="branchOptions"
					data-test-id="source-control-branch-select"
				/>
				<N8nFormInput
					v-else
					id="branchName"
					v-model="branchName"
					label=""
					name="branchName"
					data-test-id="source-control-branch-select"
				/>
				<N8nButton
					v-if="isEditing && connection?.connected"
					variant="subtle"
					icon-only
					size="large"
					icon="refresh-cw"
					:aria-label="locale.baseText('generic.refresh')"
					data-test-id="source-control-refresh-branches-button"
					@click="loadBranches"
				/>
			</div>
		</div>

		<div :class="$style.group">
			<label>{{ locale.baseText('settings.sourceControl.color') }}</label>
			<div>
				<N8nColorPicker v-model="branchColor" size="small" />
			</div>
		</div>

		<div :class="$style.group">
			<N8nCheckbox v-model="branchReadOnly" data-test-id="source-control-read-only-checkbox">
				<template #label>
					<span>{{ locale.baseText('settings.sourceControl.connections.protected') }}</span>
				</template>
			</N8nCheckbox>
		</div>

		<div :class="$style.actions">
			<N8nButton variant="subtle" @click="emit('cancel')">
				{{ locale.baseText('settings.sourceControl.connections.button.cancel') }}
			</N8nButton>
			<N8nButton
				:disabled="isSaving || !repositoryUrl"
				data-test-id="source-control-save-settings-button"
				@click="onSubmit"
			>
				{{
					isEditing
						? locale.baseText('settings.sourceControl.button.save')
						: locale.baseText('settings.sourceControl.connections.button.create')
				}}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.form {
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	margin-bottom: var(--spacing--md);
}

.group {
	padding: 0 0 var(--spacing--sm);
	width: 100%;
	display: block;

	> label {
		display: inline-block;
		padding: 0 0 var(--spacing--2xs);
		font-size: var(--font-size--sm);
	}
}

.sshInput {
	width: 100%;
	display: flex;
	align-items: center;

	> div {
		flex: 1 1 auto;
	}

	.copyInput {
		margin-right: var(--spacing--2xs);
		overflow: auto;
	}
}

.branchSelection {
	display: flex;
	gap: var(--spacing--2xs);

	> div:first-child {
		flex: 1;
	}
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
