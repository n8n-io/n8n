<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { ref, watch } from 'vue';
import { useAccessSettingsCsvExport } from '@/features/settings/provisioning/composables/useAccessSettingsCsvExport';

const visible = defineModel<boolean>();
const emit = defineEmits<{
	confirmProvisioning: [value?: string];
	cancel: [];
}>();

const locale = useI18n();
const downloadingInstanceRolesCsv = ref(false);
const downloadingProjectRolesCsv = ref(false);
const loadingActivatingJit = ref(false);
const {
	hasDownloadedInstanceRoleCsv,
	hasDownloadedProjectRoleCsv,
	downloadProjectRolesCsv,
	downloadInstanceRolesCsv,
	accessSettingsCsvExportOnModalClose,
} = useAccessSettingsCsvExport();

watch(visible, () => {
	loadingActivatingJit.value = false;
	accessSettingsCsvExportOnModalClose();
});

const onDownloadInstanceRolesCsv = async () => {
	downloadingInstanceRolesCsv.value = true;
	try {
		await downloadInstanceRolesCsv();
	} finally {
		downloadingInstanceRolesCsv.value = false;
	}
};

const onDownloadProjectRolesCsv = async () => {
	downloadingProjectRolesCsv.value = true;
	try {
		await downloadProjectRolesCsv();
	} finally {
		downloadingProjectRolesCsv.value = false;
	}
};

const onConfirmActivatingProvisioning = () => {
	loadingActivatingJit.value = true;
	emit('confirmProvisioning');
};
</script>
<template>
	<ElDialog
		v-model="visible"
		:title="locale.baseText('settings.provisioningConfirmDialog.title')"
		width="650"
	>
		<div class="mb-s">
			<N8nText color="text-base">{{
				locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.firstLine')
			}}</N8nText>
		</div>
		<ul :class="$style.list" class="mb-s">
			<li>
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.list.one')
				}}</N8nText>
			</li>
			<li>
				<N8nText color="text-base">{{
					locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.list.two')
				}}</N8nText>
			</li>
		</ul>
		<div class="mb-s">
			<N8nText color="text-base">{{
				locale.baseText('settings.provisioningConfirmDialog.breakingChangeRequiredSteps')
			}}</N8nText>
		</div>
		<div class="mb-s" :class="$style.buttonRow">
			<N8nButton
				type="secondary"
				native-type="button"
				data-test-id="provisioning-download-instance-roles-csv-button"
				:disabled="downloadingInstanceRolesCsv"
				:loading="downloadingInstanceRolesCsv"
				:class="$style.button"
				@click="onDownloadInstanceRolesCsv"
				>{{
					locale.baseText('settings.provisioningConfirmDialog.button.downloadInstanceRolesCsv')
				}}</N8nButton
			>
			<N8nIcon
				v-if="hasDownloadedInstanceRoleCsv"
				icon="check"
				color="success"
				:class="$style.icon"
			/>
		</div>
		<div class="mb-s" :class="$style.buttonRow">
			<N8nButton
				type="secondary"
				native-type="button"
				data-test-id="provisioning-download-project-roles-csv-button"
				:disabled="downloadingProjectRolesCsv"
				:loading="downloadingProjectRolesCsv"
				:class="$style.button"
				@click="onDownloadProjectRolesCsv"
				>{{
					locale.baseText('settings.provisioningConfirmDialog.button.downloadProjectRolesCsv')
				}}</N8nButton
			>
			<N8nIcon
				v-if="hasDownloadedProjectRoleCsv"
				icon="check"
				color="success"
				:class="$style.icon"
			/>
		</div>
		<template #footer>
			<N8nButton
				type="tertiary"
				native-type="button"
				data-test-id="provisioning-cancel-button"
				@click="emit('cancel')"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.cancel') }}</N8nButton
			>
			<N8nButton
				type="primary"
				native-type="button"
				:disabled="
					loadingActivatingJit || !(hasDownloadedInstanceRoleCsv && hasDownloadedProjectRoleCsv)
				"
				data-test-id="provisioning-confirm-button"
				@click="onConfirmActivatingProvisioning"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.confirm') }}</N8nButton
			>
		</template>
	</ElDialog>
</template>

<style lang="scss" module>
.buttonRow {
	display: flex;
	align-items: center;
}

.button {
	min-width: 340px;
}

.icon {
	margin-left: var(--spacing--xs);
}

.list {
	padding: 0 var(--spacing--sm);

	li {
		list-style: disc outside;
	}
}
</style>
