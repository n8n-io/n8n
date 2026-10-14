<script setup lang="ts">
import {
	isPromotionGitHostType,
	type PromotionConfigCheckout,
	type PromotionDirection,
	type PromotionRepository,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
	N8nSwitch,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, reactive, ref, watch } from 'vue';

import { usePromotionConnectionSave } from '../composables/usePromotionConnectionSave';
import {
	clonePromotionCheckout,
	createPromotionConnection,
	disconnectPromotionCheckout,
	type PromotionConnection,
	type PromotionProviderSummary,
} from '../promotionsSettings.api';
import PromotionCheckoutStatus from './PromotionCheckoutStatus.vue';
import PromotionGitHostSelect from './PromotionGitHostSelect.vue';
import {
	buildConnectionCreatePayload,
	connectionFormFrom,
	emptyConnectionForm,
	planConnectionWrites,
	type ConnectionFormState,
	type ConnectionWrite,
	type PromotionProviderChange,
} from '../promotionsSettings.utils';

const props = defineProps<{
	providers: PromotionProviderSummary[];
	connection: PromotionConnection | null;
}>();

const emit = defineEmits<{
	saved: [connection: PromotionConnection];
	refresh: [];
	'add-provider': [];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const save = usePromotionConnectionSave();

// Connect and Disconnect both call the clone endpoint, which the backend gates on
// this scope. Without it, keep both actions disabled instead of failing on click.
const canClone = computed(
	() => !!getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection.clone,
);

const current = ref<PromotionConnection | null>(props.connection);
const form = reactive<ConnectionFormState>(
	props.connection ? connectionFormFrom(props.connection) : emptyConnectionForm(),
);
const baseline = ref(JSON.stringify(form));
const isCreating = ref(false);
const discoveryRevision = ref(0);
let savedStateRevision = 0;
const selectedProvider = computed(
	() =>
		props.providers.find(({ id }) => id === form.providerId) ??
		(current.value?.provider.id === form.providerId ? current.value.provider : undefined),
);
const hasHostApi = computed(
	() => selectedProvider.value && isPromotionGitHostType(selectedProvider.value.type),
);

watch(
	() => props.connection,
	(connection) => {
		savedStateRevision++;
		// Refresh saved state without replacing the draft.
		current.value = connection;
		// A provider host change keeps the path but changes the derived URL.
		if (
			form.repositoryPath &&
			form.providerId === connection?.provider.id &&
			form.repositoryPath === connection?.target.repositoryPath
		) {
			form.remoteUrl = connection.target.remoteUrl;
		}
		form.apply.name = connection?.configs.apply?.name;
		form.promote.name = connection?.configs.promote?.name;
		baseline.value = JSON.stringify(
			connection ? connectionFormFrom(connection) : emptyConnectionForm(),
		);
	},
);

function applyProviderChange(change: PromotionProviderChange) {
	if (
		(change.hostChanged || change.credentialsChanged) &&
		(change.id === form.providerId || change.id === current.value?.provider.id)
	) {
		// Pending writes can refer to either provider during reassignment.
		savedStateRevision++;
	}
	if (change.id !== form.providerId) return;
	// The new host rejects a URL picked from the old host, unless it is the saved repository.
	if (
		change.hostChanged &&
		(form.providerId !== current.value?.provider.id ||
			form.repositoryPath !== current.value?.target.repositoryPath)
	) {
		form.remoteUrl = '';
		form.repositoryPath = undefined;
	}
	if (change.hostChanged || change.credentialsChanged) discoveryRevision.value++;
}

function selectRepository(selected: PromotionRepository) {
	if (
		form.remoteUrl !== selected.remoteUrl ||
		(form.repositoryPath !== undefined && form.repositoryPath !== selected.fullPath)
	) {
		form.apply.branchName = '';
		form.promote.baseBranchName = '';
	}
	form.remoteUrl = selected.remoteUrl;
	form.repositoryPath = selected.fullPath;
}

const resetTo = (connection: PromotionConnection | null) => {
	current.value = connection;
	Object.assign(form, connection ? connectionFormFrom(connection) : emptyConnectionForm());
	baseline.value = JSON.stringify(form);
	save.reset();
};

const isSaving = computed(() => isCreating.value || save.isSaving.value);
const isDirty = computed(() => JSON.stringify(form) !== baseline.value);
const needsRepositorySelection = computed(
	() => hasHostApi.value && !!form.remoteUrl && !form.repositoryPath,
);

// Let the API validate remote URLs so frontend rules cannot drift.
const saveDisabledReason = computed(() => {
	if (
		!form.providerId ||
		!form.name.trim() ||
		!form.remoteUrl.trim() ||
		(hasHostApi.value && !form.repositoryPath)
	)
		return i18n.baseText('settings.promotions.connection.form.incomplete');
	if (
		(form.apply.enabled && !form.apply.branchName.trim()) ||
		(form.promote.enabled && !form.promote.baseBranchName.trim())
	)
		return i18n.baseText('settings.promotions.connection.form.branchRequired');
	return undefined;
});

const failedParts = computed(() =>
	save.failedWrites.value.map((write: ConnectionWrite) =>
		i18n.baseText(
			write.kind === 'connection'
				? 'settings.promotions.connection.partialSave.part.connection'
				: write.direction === 'apply'
					? 'settings.promotions.connection.partialSave.part.apply'
					: 'settings.promotions.connection.partialSave.part.promote',
		),
	),
);

const hasPartialFailure = computed(() => failedParts.value.length > 0);

async function submit() {
	if (saveDisabledReason.value !== undefined || isSaving.value) return;

	const existing = current.value;
	const revision = discoveryRevision.value;
	const savedRevision = savedStateRevision;

	if (!existing) {
		// Creation saves both directions in one request.
		isCreating.value = true;
		try {
			const created = await createPromotionConnection(
				rootStore.publicApiContext,
				buildConnectionCreatePayload(form),
			);
			toast.showMessage({
				title: i18n.baseText('settings.promotions.connection.toast.created'),
				type: 'success',
			});
			if (revision !== discoveryRevision.value || savedRevision !== savedStateRevision) {
				emit('refresh');
				return;
			}
			resetTo(created);
			emit('saved', created);
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.promotions.connection.toast.error.save'));
		} finally {
			isCreating.value = false;
		}
		return;
	}

	// Build a new plan so retries include only unsaved changes.
	const result = await save.run(existing, planConnectionWrites(form, existing));
	if (result.failed.length > 0) {
		toast.showError(result.error, i18n.baseText('settings.promotions.connection.toast.error.save'));
	} else {
		toast.showMessage({
			title: i18n.baseText('settings.promotions.connection.toast.updated'),
			type: 'success',
		});
	}
	if (revision !== discoveryRevision.value || savedRevision !== savedStateRevision) {
		// Read saved state again after a provider edit or a concurrent refresh.
		save.reset();
		emit('refresh');
		return;
	}
	current.value = result.connection;
	form.apply.name = result.connection.configs.apply?.name;
	form.promote.name = result.connection.configs.promote?.name;
	emit('saved', result.connection);

	if (result.failed.length === 0) resetTo(result.connection);
}

function discard() {
	resetTo(current.value);
	discoveryRevision.value++;
}

// A clone reads the saved config, so Connect stays blocked until the direction is
// saved and the form has no unsaved edits.
const connecting = reactive<Record<PromotionDirection, 'connect' | 'disconnect' | false>>({
	apply: false,
	promote: false,
});

const savedCheckout = (direction: PromotionDirection): PromotionConfigCheckout | undefined =>
	current.value?.configs[direction]?.checkout;

// The saved branch is the one the checkout was cloned from, so the status text
// stays accurate while the form holds unsaved edits.
const branchNameFor = (direction: PromotionDirection): string => {
	const configs = current.value?.configs;
	if (direction === 'apply') return configs?.apply?.settings.branchName ?? form.apply.branchName;
	return configs?.promote?.settings.baseBranchName ?? form.promote.baseBranchName;
};

const connectDisabledReason = (direction: PromotionDirection): string | undefined => {
	if (!canClone.value) return i18n.baseText('settings.promotions.connection.checkout.noPermission');
	if (!current.value?.configs[direction])
		return i18n.baseText('settings.promotions.connection.checkout.saveFirst');
	if (needsRepositorySelection.value)
		return i18n.baseText('settings.promotions.discovery.repository.selectAgain');
	if (isDirty.value)
		return i18n.baseText('settings.promotions.connection.checkout.saveChangesFirst');
	return undefined;
};

// Update the saved connection in place so the status and the Promote button react
// without a full reload. A fresh clone matches the config it was cloned from.
function applyCheckout(direction: PromotionDirection, checkout: PromotionConfigCheckout) {
	const connection = current.value;
	const config = connection?.configs[direction];
	if (!connection || !config) return;
	const updated: PromotionConnection = {
		...connection,
		configs: { ...connection.configs, [direction]: { ...config, checkout } },
	};
	current.value = updated;
	emit('saved', updated);
}

async function connect(direction: PromotionDirection) {
	if (!current.value || connectDisabledReason(direction) !== undefined) return;
	const revision = savedStateRevision;
	connecting[direction] = 'connect';
	try {
		const result = await clonePromotionCheckout(
			rootStore.publicApiContext,
			current.value.id,
			direction,
		);
		if (revision !== savedStateRevision) {
			emit('refresh');
			return;
		}
		applyCheckout(direction, {
			hasCheckout: result.hasCheckout,
			matchesConfig: result.hasCheckout,
		});
		toast.showMessage({
			title: i18n.baseText('settings.promotions.connection.checkout.toast.connected'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.promotions.connection.checkout.toast.connectError'),
		);
	} finally {
		connecting[direction] = false;
	}
}

async function disconnect(direction: PromotionDirection) {
	if (!current.value) return;
	const revision = savedStateRevision;
	connecting[direction] = 'disconnect';
	try {
		await disconnectPromotionCheckout(rootStore.publicApiContext, current.value.id, direction);
		if (revision !== savedStateRevision) {
			emit('refresh');
			return;
		}
		applyCheckout(direction, { hasCheckout: false, matchesConfig: false });
		toast.showMessage({
			title: i18n.baseText('settings.promotions.connection.checkout.toast.disconnected'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.promotions.connection.checkout.toast.disconnectError'),
		);
	} finally {
		connecting[direction] = false;
	}
}

function selectProvider(id: string) {
	if (id === form.providerId) return;
	const previous = selectedProvider.value;
	const next = props.providers.find((provider) => provider.id === id);
	if (
		(previous && isPromotionGitHostType(previous.type)) ||
		(next && isPromotionGitHostType(next.type))
	) {
		form.remoteUrl = '';
		form.apply.branchName = '';
		form.promote.baseBranchName = '';
	}
	form.repositoryPath = undefined;
	form.providerId = id;
}

defineExpose({ selectProvider, applyProviderChange });
</script>

<template>
	<form :class="$style.form" data-test-id="promotion-connection-form" @submit.prevent="submit">
		<N8nInputLabel
			input-name="promotion-connection-provider"
			:label="i18n.baseText('settings.promotions.connection.form.provider')"
			required
		>
			<div :class="$style.providerRow">
				<N8nSelect
					id="promotion-connection-provider"
					:model-value="form.providerId"
					:disabled="isSaving"
					:placeholder="i18n.baseText('settings.promotions.connection.form.provider.placeholder')"
					data-test-id="promotion-connection-provider-select"
					@update:model-value="selectProvider"
				>
					<N8nOption
						v-for="provider in providers"
						:key="provider.id"
						:value="provider.id"
						:label="provider.name"
					/>
				</N8nSelect>
				<N8nButton
					type="button"
					variant="outline"
					:disabled="isSaving"
					data-test-id="promotion-connection-add-provider"
					@click="emit('add-provider')"
				>
					{{ i18n.baseText('settings.promotions.connection.form.provider.add') }}
				</N8nButton>
			</div>
		</N8nInputLabel>

		<N8nInputLabel
			input-name="promotion-connection-name"
			:label="i18n.baseText('settings.promotions.connection.form.name')"
			required
		>
			<N8nInput
				id="promotion-connection-name"
				v-model="form.name"
				:disabled="isSaving"
				data-test-id="promotion-connection-name-input"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			v-if="hasHostApi"
			input-name="promotion-connection-repository"
			:label="i18n.baseText('settings.promotions.discovery.repository.label')"
			required
		>
			<PromotionGitHostSelect
				:model-value="form.remoteUrl"
				kind="repository"
				input-id="promotion-connection-repository"
				:provider-id="form.providerId"
				:revision="discoveryRevision"
				:description-id="
					needsRepositorySelection ? 'promotion-repository-selection-hint' : undefined
				"
				:disabled="isSaving"
				data-test-id="promotion-connection-repository-select"
				@selected="selectRepository"
			/>
			<N8nText
				v-if="needsRepositorySelection"
				id="promotion-repository-selection-hint"
				size="small"
				color="text-light"
				role="status"
			>
				{{ i18n.baseText('settings.promotions.discovery.repository.selectAgain') }}
			</N8nText>
		</N8nInputLabel>
		<N8nInputLabel
			v-else
			input-name="promotion-connection-remote-url"
			:label="i18n.baseText('settings.promotions.connection.form.remoteUrl')"
			required
		>
			<N8nInput
				id="promotion-connection-remote-url"
				v-model="form.remoteUrl"
				:disabled="isSaving"
				data-test-id="promotion-connection-remote-url-input"
			/>
			<N8nText size="small" color="text-light" data-test-id="promotion-connection-remote-url-hint">
				{{ i18n.baseText('settings.promotions.connection.form.remoteUrl.hint') }}
			</N8nText>
		</N8nInputLabel>

		<N8nSettingsRowGroup>
			<N8nSettingsRow
				v-model="form.apply.enabled"
				expandable
				:disclosure="false"
				:title="i18n.baseText('settings.promotions.connection.apply.title')"
				:description="i18n.baseText('settings.promotions.connection.apply.description')"
			>
				<template #action>
					<N8nSwitch
						v-model="form.apply.enabled"
						:disabled="isSaving"
						data-test-id="promotion-connection-apply-toggle"
					/>
				</template>
				<template #expanded>
					<div :class="$style.directionFields">
						<N8nInputLabel
							input-name="promotion-connection-apply-branch"
							:label="i18n.baseText('settings.promotions.connection.apply.branchName')"
							required
						>
							<N8nInput
								v-if="!hasHostApi"
								id="promotion-connection-apply-branch"
								v-model="form.apply.branchName"
								:disabled="isSaving"
								data-test-id="promotion-connection-apply-branch-input"
							/>
							<PromotionGitHostSelect
								v-else
								v-model="form.apply.branchName"
								kind="branch"
								input-id="promotion-connection-apply-branch"
								:provider-id="form.providerId"
								:repository-id="form.repositoryPath"
								:revision="discoveryRevision"
								:disabled="isSaving"
								data-test-id="promotion-connection-apply-branch-select"
							/>
						</N8nInputLabel>
						<PromotionCheckoutStatus
							:checkout="savedCheckout('apply')"
							:branch-name="branchNameFor('apply')"
							:busy="connecting.apply"
							:disabled-reason="connectDisabledReason('apply')"
							:disabled="!canClone"
							@connect="connect('apply')"
							@disconnect="disconnect('apply')"
						/>
					</div>
				</template>
			</N8nSettingsRow>

			<N8nSettingsRow
				v-model="form.promote.enabled"
				expandable
				:disclosure="false"
				:title="i18n.baseText('settings.promotions.connection.promote.title')"
				:description="i18n.baseText('settings.promotions.connection.promote.description')"
			>
				<template #action>
					<N8nSwitch
						v-model="form.promote.enabled"
						:disabled="isSaving"
						data-test-id="promotion-connection-promote-toggle"
					/>
				</template>
				<template #expanded>
					<div :class="$style.directionFields">
						<N8nInputLabel
							input-name="promotion-connection-promote-branch"
							:label="i18n.baseText('settings.promotions.connection.promote.baseBranchName')"
							required
						>
							<N8nInput
								v-if="!hasHostApi"
								id="promotion-connection-promote-branch"
								v-model="form.promote.baseBranchName"
								:disabled="isSaving"
								data-test-id="promotion-connection-promote-branch-input"
							/>
							<PromotionGitHostSelect
								v-else
								v-model="form.promote.baseBranchName"
								kind="branch"
								input-id="promotion-connection-promote-branch"
								:provider-id="form.providerId"
								:repository-id="form.repositoryPath"
								:revision="discoveryRevision"
								:disabled="isSaving"
								data-test-id="promotion-connection-promote-branch-select"
							/>
						</N8nInputLabel>
						<N8nSwitch
							v-model="form.promote.createBranchOnPromotion"
							:disabled="isSaving"
							:label="i18n.baseText('settings.promotions.connection.promote.createBranch')"
							data-test-id="promotion-connection-create-branch-toggle"
						/>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.promotions.connection.promote.createBranch.description') }}
						</N8nText>
						<PromotionCheckoutStatus
							:checkout="savedCheckout('promote')"
							:branch-name="branchNameFor('promote')"
							:busy="connecting.promote"
							:disabled-reason="connectDisabledReason('promote')"
							:disabled="!canClone"
							@connect="connect('promote')"
							@disconnect="disconnect('promote')"
						/>
					</div>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>

		<N8nNotice
			v-if="hasPartialFailure"
			theme="warning"
			data-test-id="promotion-connection-partial-save"
		>
			{{ i18n.baseText('settings.promotions.connection.partialSave.title') }}
			{{
				i18n.baseText('settings.promotions.connection.partialSave.description', {
					interpolate: { parts: failedParts.join(', ') },
				})
			}}
		</N8nNotice>

		<N8nSettingsSaveBar
			:visible="isDirty || hasPartialFailure"
			:saving="isSaving"
			:save-disabled="saveDisabledReason !== undefined"
			:message="
				hasPartialFailure
					? i18n.baseText('settings.promotions.connection.partialSave.title')
					: i18n.baseText('settings.promotions.saveBar.message')
			"
			:save-label="
				hasPartialFailure
					? i18n.baseText('generic.retry')
					: i18n.baseText('settings.promotions.saveBar.save')
			"
			:discard-label="i18n.baseText('settings.promotions.saveBar.discard')"
			data-test-id="promotion-connection-save-bar"
			@save="submit"
			@discard="discard"
		/>
	</form>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.providerRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);

	> :first-child {
		flex: 1;
	}
}

.directionFields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
}
</style>
