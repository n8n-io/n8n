<script setup lang="ts">
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
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, reactive, ref } from 'vue';

import { usePromotionConnectionSave } from '../composables/usePromotionConnectionSave';
import {
	createPromotionConnection,
	type PromotionConnection,
	type PromotionProviderSummary,
} from '../promotionsSettings.api';
import {
	buildConnectionCreatePayload,
	connectionFormFrom,
	emptyConnectionForm,
	planConnectionWrites,
	type ConnectionFormState,
	type ConnectionWrite,
} from '../promotionsSettings.utils';

const props = defineProps<{
	providers: PromotionProviderSummary[];
	connection: PromotionConnection | null;
}>();

const emit = defineEmits<{
	saved: [connection: PromotionConnection];
	'add-provider': [];
}>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const save = usePromotionConnectionSave();

const current = ref<PromotionConnection | null>(props.connection);
const form = reactive<ConnectionFormState>(
	props.connection ? connectionFormFrom(props.connection) : emptyConnectionForm(),
);
const baseline = ref(JSON.stringify(form));
const isCreating = ref(false);

const resetTo = (connection: PromotionConnection | null) => {
	current.value = connection;
	Object.assign(form, connection ? connectionFormFrom(connection) : emptyConnectionForm());
	baseline.value = JSON.stringify(form);
	save.reset();
};

const isSaving = computed(() => isCreating.value || save.isSaving.value);
const isDirty = computed(() => JSON.stringify(form) !== baseline.value);

// Let the API validate remote URLs so frontend rules cannot drift.
const saveDisabledReason = computed(() => {
	if (!form.providerId || !form.name.trim() || !form.remoteUrl.trim())
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

	if (!existing) {
		// Creation saves both directions in one request.
		isCreating.value = true;
		try {
			const created = await createPromotionConnection(
				rootStore.publicApiContext,
				buildConnectionCreatePayload(form),
			);
			resetTo(created);
			toast.showMessage({
				title: i18n.baseText('settings.promotions.connection.toast.created'),
				type: 'success',
			});
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
	current.value = result.connection;
	emit('saved', result.connection);

	if (result.failed.length > 0) {
		toast.showError(result.error, i18n.baseText('settings.promotions.connection.toast.error.save'));
		return;
	}

	baseline.value = JSON.stringify(form);
	toast.showMessage({
		title: i18n.baseText('settings.promotions.connection.toast.updated'),
		type: 'success',
	});
}

function discard() {
	resetTo(current.value);
}

function selectProvider(id: string) {
	form.providerId = id;
}

defineExpose({ selectProvider });
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
					v-model="form.providerId"
					:disabled="isSaving"
					:placeholder="i18n.baseText('settings.promotions.connection.form.provider.placeholder')"
					data-test-id="promotion-connection-provider-select"
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
								id="promotion-connection-apply-branch"
								v-model="form.apply.branchName"
								:disabled="isSaving"
								data-test-id="promotion-connection-apply-branch-input"
							/>
						</N8nInputLabel>
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
								id="promotion-connection-promote-branch"
								v-model="form.promote.baseBranchName"
								:disabled="isSaving"
								data-test-id="promotion-connection-promote-branch-input"
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
