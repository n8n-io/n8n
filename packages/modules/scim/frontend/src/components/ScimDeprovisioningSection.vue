<script setup lang="ts">
import type { ScimConfigResponse, ScimDataAction, ScimOnDelete } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAvatar,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nSelect2,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { SelectItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed, ref } from 'vue';

import ScimDeleteUsersDialog from './ScimDeleteUsersDialog.vue';
import ScimTransferTargetDialog from './ScimTransferTargetDialog.vue';
import { useScimStore } from '../scim.store';
import type { ScimTransferPick } from '../scim.types';

/**
 * The Deprovisioning section. Each control saves on change. The controls show
 * the stored value, so a failed save leaves them where they were.
 */
const props = defineProps<{
	config: ScimConfigResponse;
}>();

const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const scimStore = useScimStore();

const saving = ref(false);
const deleteUsersDialogOpen = ref(false);
const transferDialogOpen = ref(false);
/** Where the transfer dialog opened from. Telemetry splits the change by it. */
const transferDialogSource = ref<'data_switch' | 'pencil'>('pencil');
let lastToast: { close: () => void } | null = null;

const onDeleteItems = computed<SelectItem[]>(() => [
	{
		value: 'disable',
		label: i18n.baseText('settings.scim.deprovisioning.onDelete.disable'),
		icon: 'user-lock',
	},
	{
		value: 'delete',
		label: i18n.baseText('settings.scim.deprovisioning.onDelete.delete'),
		icon: 'trash-2',
	},
]);

const dataActionItems = computed<SelectItem[]>(() => [
	{
		value: 'transfer',
		label: i18n.baseText('settings.scim.deprovisioning.dataAction.transfer'),
		icon: 'arrow-right-to-line',
	},
	{
		value: 'delete',
		label: i18n.baseText('settings.scim.deprovisioning.dataAction.delete'),
		icon: 'trash-2',
	},
]);

const showDataRows = computed(() => props.config.onDelete === 'delete');
const showTransferRow = computed(
	() => showDataRows.value && props.config.dataAction === 'transfer',
);
const target = computed(() => props.config.transferTarget);
const targetName = computed(
	() => target.value?.name ?? i18n.baseText('settings.scim.deprovisioning.transferTarget.owner'),
);
const [targetFirstName = '', ...targetRest] = (target.value?.name ?? '').split(' ');
const targetLastName = targetRest.join(' ');

const dataActionDescription = computed(() =>
	i18n.baseText(`settings.scim.deprovisioning.dataAction.description.${props.config.dataAction}`),
);

function showSavedToast() {
	lastToast?.close();
	lastToast = toast.showMessage({
		type: 'success',
		title: i18n.baseText('settings.scim.deprovisioning.saved'),
	});
}

async function save(
	patch: {
		onDelete?: ScimOnDelete;
		dataAction?: ScimDataAction;
		transferProjectId?: string | null;
	},
	targetType?: 'person' | 'project',
): Promise<boolean> {
	saving.value = true;
	try {
		const next = await scimStore.setDeprovisioning(patch);
		showSavedToast();
		telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_DEPROVISIONING_SETTING_CHANGED, {
			on_delete: next.onDelete,
			data_action: next.dataAction,
			transfer_target_type: targetType ?? next.transferTarget?.kind ?? undefined,
			result: 'success',
		});
		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.scim.deprovisioning.error'));
		telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_DEPROVISIONING_SETTING_CHANGED, {
			on_delete: patch.onDelete ?? props.config.onDelete,
			data_action: patch.dataAction ?? props.config.dataAction,
			transfer_target_type: targetType,
			result: 'error',
		});
		return false;
	} finally {
		saving.value = false;
	}
}

function onDeleteChange(value: unknown) {
	if (value === props.config.onDelete) return;
	if (value === 'disable') {
		void save({ onDelete: 'disable' });
		return;
	}
	if (value === 'delete') {
		// The admin decides what happens to the work before the first deletion.
		deleteUsersDialogOpen.value = true;
	}
}

async function onDeleteUsersSave(choice: {
	dataAction: ScimDataAction;
	pick: ScimTransferPick | null;
	searchUsed: boolean;
}) {
	const saved = await save(
		{
			onDelete: 'delete',
			dataAction: choice.dataAction,
			...(choice.pick ? { transferProjectId: choice.pick.projectId } : {}),
		},
		choice.pick?.type,
	);
	if (!saved) return;
	deleteUsersDialogOpen.value = false;
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_DELETE_USERS_DIALOG_CLOSED, {
		outcome: choice.dataAction,
		target_type: choice.pick?.type,
	});
	if (choice.pick) {
		telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_TRANSFER_TARGET_CHANGED, {
			source: 'delete_dialog',
			target_type: choice.pick.type,
			search_used: choice.searchUsed,
		});
	}
}

function onDeleteUsersCancel() {
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_DELETE_USERS_DIALOG_CLOSED, { outcome: 'cancel' });
}

function onDataActionChange(value: unknown) {
	if (value === props.config.dataAction) return;
	if (value === 'delete') {
		void save({ dataAction: 'delete' });
		return;
	}
	if (value === 'transfer') {
		transferDialogSource.value = 'data_switch';
		transferDialogOpen.value = true;
	}
}

function openTransferDialog() {
	transferDialogSource.value = 'pencil';
	transferDialogOpen.value = true;
}

async function onTransferSave(pick: ScimTransferPick, searchUsed: boolean) {
	const saved = await save(
		{ dataAction: 'transfer', transferProjectId: pick.projectId },
		pick.type,
	);
	if (!saved) return;
	transferDialogOpen.value = false;
	telemetry.track(TELEMETRY_EVENT.SCIM.SCIM_TRANSFER_TARGET_CHANGED, {
		source: transferDialogSource.value,
		target_type: pick.type,
		search_used: searchUsed,
	});
}
</script>

<template>
	<N8nSettingsSection
		:title="i18n.baseText('settings.scim.deprovisioning.title')"
		:description="i18n.baseText('settings.scim.deprovisioning.description')"
		data-test-id="scim-deprovisioning-section"
	>
		<N8nSettingsRowGroup>
			<N8nSettingsRow
				:title="i18n.baseText('settings.scim.deprovisioning.onDelete.title')"
				:description="i18n.baseText('settings.scim.deprovisioning.onDelete.description')"
			>
				<template #action>
					<N8nSelect2
						:model-value="props.config.onDelete"
						:items="onDeleteItems"
						size="medium"
						:disabled="saving"
						:aria-label="i18n.baseText('settings.scim.deprovisioning.onDelete.title')"
						data-test-id="scim-on-delete-select"
						@update:model-value="onDeleteChange"
					/>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				v-if="showDataRows"
				:title="i18n.baseText('settings.scim.deprovisioning.dataAction.title')"
				:description="dataActionDescription"
			>
				<template #action>
					<N8nSelect2
						:model-value="props.config.dataAction"
						:items="dataActionItems"
						size="medium"
						:disabled="saving"
						:aria-label="i18n.baseText('settings.scim.deprovisioning.dataAction.title')"
						data-test-id="scim-data-action-select"
						@update:model-value="onDataActionChange"
					/>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				v-if="showTransferRow"
				:title="i18n.baseText('settings.scim.deprovisioning.transferTarget.title')"
				:description="i18n.baseText('settings.scim.deprovisioning.transferTarget.description')"
				data-test-id="scim-transfer-target-row"
			>
				<template #action>
					<div :class="$style.target">
						<N8nAvatar
							v-if="target?.kind === 'person'"
							:first-name="targetFirstName"
							:last-name="targetLastName"
							size="small"
						/>
						<span
							v-else-if="target?.kind === 'project'"
							:class="$style.projectIcon"
							aria-hidden="true"
						>
							<template v-if="target.icon?.type === 'emoji'">{{ target.icon.value }}</template>
							<N8nIcon v-else :icon="target.icon?.value ?? 'layers'" size="small" />
						</span>
						<N8nText size="small" data-test-id="scim-transfer-target-name">{{
							targetName
						}}</N8nText>
						<N8nTooltip
							:content="i18n.baseText('settings.scim.deprovisioning.transferTarget.change')"
						>
							<N8nButton
								variant="ghost"
								size="small"
								icon-only
								:disabled="saving"
								:aria-label="i18n.baseText('settings.scim.deprovisioning.transferTarget.change')"
								data-test-id="scim-transfer-target-change"
								@click="openTransferDialog"
							>
								<template #icon><N8nIcon icon="pencil" /></template>
							</N8nButton>
						</N8nTooltip>
					</div>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
		<N8nCallout
			v-if="showTransferRow && target && !target.valid"
			theme="warning"
			slim
			data-test-id="scim-transfer-target-invalid"
		>
			{{ i18n.baseText('settings.scim.deprovisioning.transferTarget.invalid') }}
		</N8nCallout>

		<ScimDeleteUsersDialog
			v-model:open="deleteUsersDialogOpen"
			:saving="saving"
			@save="onDeleteUsersSave"
			@cancel="onDeleteUsersCancel"
		/>
		<ScimTransferTargetDialog
			v-model:open="transferDialogOpen"
			:current="transferDialogSource === 'pencil' ? target : null"
			:saving="saving"
			@save="onTransferSave"
		/>
	</N8nSettingsSection>
</template>

<style lang="scss" module>
.target {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.projectIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	font-size: var(--font-size--sm);
}
</style>
