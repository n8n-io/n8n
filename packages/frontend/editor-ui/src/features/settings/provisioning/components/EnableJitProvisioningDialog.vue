<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';

import { ElDialog } from 'element-plus';
import { N8nButton, N8nText } from '@n8n/design-system';
import { ref } from 'vue';

const visible = defineModel<boolean>();
const emit = defineEmits<{
	confirmProvisioning: [value?: string];
	cancel: [];
}>();

const locale = useI18n();
const hasDownloadedInstanceRoleCsv = ref(false);
const hasDownloadedProjectRoleCsv = ref(false);
// TODO: fetch instance role and project role data of all users of the instance
//const userData = ref<User[]>([]);

const onDownloadInstanceRolesCsv = () => {
	// TODO: use data from userData to generate csv and download it
	hasDownloadedInstanceRoleCsv.value = true;
};
const onDownloadProjectRolesCsv = () => {
	// TODO: use data from userData to generate csv and download it
	hasDownloadedProjectRoleCsv.value = true;
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
				locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription')
			}}</N8nText>
		</div>
		<div class="mb-s">
			<N8nText color="text-base">{{
				locale.baseText('settings.provisioningConfirmDialog.breakingChangeRequiredSteps')
			}}</N8nText>
		</div>
		<div class="mb-s">
			<N8nButton
				type="secondary"
				native-type="button"
				data-test-id="provisioning-download-instance-roles-csv-button"
				@click="onDownloadInstanceRolesCsv"
				>{{
					locale.baseText('settings.provisioningConfirmDialog.button.downloadInstanceRolesCsv')
				}}</N8nButton
			>
		</div>
		<div class="mb-s">
			<N8nButton
				type="secondary"
				native-type="button"
				data-test-id="provisioning-download-project-roles-csv-button"
				@click="onDownloadProjectRolesCsv"
				>{{
					locale.baseText('settings.provisioningConfirmDialog.button.downloadProjectRolesCsv')
				}}</N8nButton
			>
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
				:disabled="!hasDownloadedInstanceRoleCsv && !hasDownloadedProjectRoleCsv"
				data-test-id="provisioning-confirm-button"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.confirm') }}</N8nButton
			>
		</template>
	</ElDialog>
</template>
