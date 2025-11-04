<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type UsersList, type UsersListFilterDto } from '@n8n/api-types';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nText } from '@n8n/design-system';
import { ref } from 'vue';

const visible = defineModel<boolean>();
const emit = defineEmits<{
	confirmProvisioning: [value?: string];
	cancel: [];
}>();

const locale = useI18n();
const loading = ref(false);

const rootStore = useRootStore();
const csvFilesAreReady = ref(false);
const hasDownloadedInstanceRoleCsv = ref(false);
const hasDownloadedProjectRoleCsv = ref(false);
/**
 * Actual type:
 * {
 *   count: number
 *   items: {
 * 		email: string
 * 		id: string
 * 		projectRelations: {
 * 			id: string
 * 			role: string
 * 			name: string (project displayname)
 * 		}[]
 * 	 }[]
 * }
 */
const userData = ref<UsersList>();

const onGenerateCsvExport = async () => {
	loading.value = true;
	// TODO: extract dedicated composable to manage fetching user data
	const filter: UsersListFilterDto = {
		take: -1, // TODO: add pagination
		select: ['email', 'role'],
		sortBy: ['email:desc'],
		expand: ['projectRelations'],
		skip: 0,
	};
	userData.value = await usersApi.getUsers(rootStore.restApiContext, filter);
	csvFilesAreReady.value = true;
	loading.value = false;
};

const onDownloadInstanceRolesCsv = () => {
	// TODO: use data from userData to generate csv and download it
	// Should contain only two columns: email, instance_role
	hasDownloadedInstanceRoleCsv.value = true;
};
const onDownloadProjectRolesCsv = () => {
	// TODO: use data from userData to generate csv and download it
	// Should contain only three columns: email, project_displayname, project_id, project_role
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
		<div v-if="!csvFilesAreReady" class="mb-s">
			<N8nButton
				type="primary"
				native-type="button"
				data-test-id="provisioning-download-instance-roles-csv-button"
				:disabled="loading"
				@click="onGenerateCsvExport"
				>{{
					locale.baseText('settings.provisioningConfirmDialog.button.generateCsvExport')
				}}</N8nButton
			>
		</div>
		<template v-else>
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
		</template>
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
				:disabled="loading || (!hasDownloadedInstanceRoleCsv && !hasDownloadedProjectRoleCsv)"
				data-test-id="provisioning-confirm-button"
				>{{ locale.baseText('settings.provisioningConfirmDialog.button.confirm') }}</N8nButton
			>
		</template>
	</ElDialog>
</template>
