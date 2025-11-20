import { type UsersListFilterDto } from '@n8n/api-types';
import { ref } from 'vue';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { useRootStore } from '@n8n/stores/useRootStore';

interface AccessSettingsUserData {
	count: number;
	items: Array<{
		id: string;
		email: string;
		role: string;
		projectRelations: Array<{
			id: string;
			role: string;
			name: string;
		}>;
	}>;
}

function isAccessSettingsUserData(response: unknown): response is AccessSettingsUserData {
	const topLevelsPropertiesMatch =
		typeof response === 'object' && response !== null && 'count' in response && 'items' in response;
	if (!topLevelsPropertiesMatch) {
		return false;
	}
	if (!Array.isArray(response.items)) {
		return false;
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const item: object = response.items.length ? response.items[0] : null;
	if (!item) {
		return true;
	}
	const isValidItem =
		Object.hasOwn(item, 'id') &&
		Object.hasOwn(item, 'email') &&
		Object.hasOwn(item, 'role') &&
		Object.hasOwn(item, 'projectRelations');
	return isValidItem;
}

export function useAccessSettingsCsvExport() {
	const cachedUserData = ref<AccessSettingsUserData | undefined>();
	const rootStore = useRootStore();

	const formatDateForFilename = (): string => {
		const now = new Date();
		return `${now.getDate()}_${now.getMonth() + 1}_${now.getFullYear()}_${now.getHours()}_${now.getMinutes()}`;
	};

	const escapeCsvValue = (value: string): string => {
		// If value contains comma, quote, or newline, wrap in quotes and escape quotes
		if (value.includes(',') || value.includes('"')) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	};

	const downloadCsv = (csvContent: string, filename: string): void => {
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const tempElement = document.createElement('a');
		tempElement.setAttribute('href', url);
		tempElement.setAttribute('download', filename);
		tempElement.style.display = 'none';
		document.body.appendChild(tempElement);
		tempElement.click();
		document.body.removeChild(tempElement);
		URL.revokeObjectURL(url); // remove blob from browser memory
	};

	const getUserData = async (): Promise<AccessSettingsUserData> => {
		if (cachedUserData.value) {
			return cachedUserData.value;
		}
		// TODO: add pagination
		const filter: UsersListFilterDto = {
			take: -1,
			select: ['email', 'role'],
			sortBy: ['email:desc'],
			expand: ['projectRelations'],
			skip: 0,
		};
		const getUsersResponse = await usersApi.getUsers(rootStore.restApiContext, filter);
		if (isAccessSettingsUserData(getUsersResponse)) {
			cachedUserData.value = getUsersResponse;
			return cachedUserData.value;
		}
		// This case should never happen (as that would mean a breaking backend change)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
		return getUsersResponse as any;
	};

	const hasDownloadedProjectRoleCsv = ref(false);

	const downloadProjectRolesCsv = async () => {
		const userData = await getUserData();
		const csvRows = ['email,project_displayname,project_id,project_role'];

		for (const user of userData.items) {
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
	};

	const hasDownloadedInstanceRoleCsv = ref(false);

	const downloadInstanceRolesCsv = async () => {
		const userData = await getUserData();
		const csvRows = ['email,instance_role'];

		for (const user of userData.items) {
			const email = escapeCsvValue(user.email ?? '');
			const instanceRole = escapeCsvValue(user.role ?? '');
			csvRows.push(`${email},${instanceRole}`);
		}

		const csvContent = csvRows.join('\n');
		const filename = `n8n_instance_role_export_${formatDateForFilename()}.csv`;

		downloadCsv(csvContent, filename);
		hasDownloadedInstanceRoleCsv.value = true;
	};

	const accessSettingsCsvExportOnModalClose = () => {
		hasDownloadedInstanceRoleCsv.value = false;
		hasDownloadedProjectRoleCsv.value = false;
		// ensure user data is loaded freshly whenever dialog is opened the next time
		cachedUserData.value = undefined;
	};

	return {
		downloadProjectRolesCsv,
		downloadInstanceRolesCsv,
		hasDownloadedInstanceRoleCsv,
		hasDownloadedProjectRoleCsv,
		accessSettingsCsvExportOnModalClose,
	};
}
