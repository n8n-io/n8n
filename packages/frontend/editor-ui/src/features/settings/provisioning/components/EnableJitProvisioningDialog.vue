<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useRootStore } from '@n8n/stores/useRootStore';
import { type UsersList, type UsersListFilterDto } from '@n8n/api-types';
import { ElDialog } from 'element-plus';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { ref, watch } from 'vue';

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
 * Actual return type (due to select filter):
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

// Reset download flags when dialog is closed
watch(visible, () => {
	hasDownloadedInstanceRoleCsv.value = false;
	hasDownloadedProjectRoleCsv.value = false;
});

const formatDateForFilename = (): string => {
	const now = new Date();
	return `${now.getDate()}_${now.getMonth() + 1}_${now.getFullYear()}_${now.getHours()}_${now.getMinutes()}`;
};

const escapeCsvValue = (value: string): string => {
	// If value contains comma, quote, or newline, wrap in quotes and escape quotes
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
};

const downloadCsv = (csvContent: string, filename: string): void => {
	const tempElement = document.createElement('a');
	tempElement.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
	tempElement.setAttribute('download', filename);
	tempElement.style.display = 'none';
	document.body.appendChild(tempElement);
	tempElement.click();
	document.body.removeChild(tempElement);
};

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
	await new Promise((resolve) => setTimeout(resolve, 3000));
	userData.value = await usersApi.getUsers(rootStore.restApiContext, filter);
	csvFilesAreReady.value = true;
	loading.value = false;
};

const onDownloadInstanceRolesCsv = () => {
	if (!userData.value) return;

	loading.value = true;

	const csvRows = ['email,instance_role'];

	for (const user of userData.value.items) {
		const email = escapeCsvValue(user.email ?? '');
		const instanceRole = escapeCsvValue(user.role ?? '');
		csvRows.push(`${email},${instanceRole}`);
	}

	const csvContent = csvRows.join('\n');
	const filename = `n8n_instance_role_export_${formatDateForFilename()}.csv`;

	downloadCsv(csvContent, filename);
	hasDownloadedInstanceRoleCsv.value = true;
	loading.value = false;
};

const onDownloadProjectRolesCsv = () => {
	if (!userData.value) return;

	loading.value = true;

	const csvRows = ['email,project_displayname,project_id,project_role'];

	for (const user of userData.value.items) {
		const email = escapeCsvValue(user.email ?? '');

		if (user.projectRelations && user.projectRelations.length > 0) {
			for (const project of user.projectRelations) {
				const projectName = escapeCsvValue(project.name ?? '');
				const projectId = escapeCsvValue(project.id ?? '');
				const projectRole = escapeCsvValue(project.role ?? '');
				csvRows.push(`${email},${projectName},${projectId},${projectRole}`);
			}
		}
	}

	const csvContent = csvRows.join('\n');
	const filename = `n8n_project_role_export_${formatDateForFilename()}.csv`;

	downloadCsv(csvContent, filename);
	hasDownloadedProjectRoleCsv.value = true;
	loading.value = false;
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
				locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.first')
			}}</N8nText>
		</div>
		<div class="mb-s">
			<N8nText color="text-base">{{
				locale.baseText('settings.provisioningConfirmDialog.breakingChangeDescription.second')
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
				:loading="loading"
				@click="onGenerateCsvExport"
				>{{
					locale.baseText('settings.provisioningConfirmDialog.button.generateCsvExport')
				}}</N8nButton
			>
		</div>
		<template v-else>
			<div class="mb-s" :class="$style.buttonRow">
				<N8nButton
					type="secondary"
					native-type="button"
					data-test-id="provisioning-download-instance-roles-csv-button"
					:disabled="loading"
					:loading="loading"
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
					:disabled="loading"
					:loading="loading"
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
				:disabled="loading || !(hasDownloadedInstanceRoleCsv && hasDownloadedProjectRoleCsv)"
				data-test-id="provisioning-confirm-button"
				@click="loading = true && emit('confirmProvisioning')"
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
</style>
