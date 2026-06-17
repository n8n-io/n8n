import { type UsersListFilterDto, type User } from '@n8n/api-types';
import { ref } from 'vue';
import * as usersApi from '@n8n/rest-api-client/api/users';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

/**
 * Special type since we use the "select" and "expand" filter
 * properties to change what is fetched in the users query.
 */
type AccessSettingsUser = Pick<User, 'id' | 'email' | 'role' | 'projectRelations'>;

type AccessSettingsUserData = {
	count: number;
	items: AccessSettingsUser[];
};

async function fetchUsers(context: IRestApiContext): Promise<AccessSettingsUserData> {
	const allUsers: AccessSettingsUserData['items'] = [];
	const fieldsNeededForAccessSettingExport: Partial<UsersListFilterDto> = {
		select: ['email', 'role'],
		expand: ['projectRelations'],
	};

	const PAGE_SIZE = 50;
	let currentPage = 0;
	let totalCount = 0;
	let hasMorePages = true;

	while (hasMorePages) {
		const filter: UsersListFilterDto = {
			...fieldsNeededForAccessSettingExport,
			sortBy: ['email:desc'],
			take: PAGE_SIZE,
			skip: currentPage * PAGE_SIZE,
		};

		const response = await usersApi.getUsers(context, filter);

		if (currentPage === 0) {
			totalCount = response.count;
		}

		allUsers.push(...response.items);

		hasMorePages = response.items.length === PAGE_SIZE && allUsers.length < totalCount;
		currentPage++;
	}

	return {
		count: totalCount,
		items: allUsers,
	};
}

export function useAccessSettingsCsvExport() {
	const cachedUserData = ref<AccessSettingsUserData | undefined>();
	/**
	 * Since users can click the "download project roles" and "download instance roles"
	 * buttons right after one another, we're tracking the active request here
	 * to not have to fetch the users list twice.
	 */
	const pendingUserDataRequest = ref<Promise<AccessSettingsUserData> | undefined>();
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

		// Return existing pending promise if one is in flight
		if (pendingUserDataRequest.value) {
			return await pendingUserDataRequest.value;
		}

		const userDataRequest = fetchUsers(rootStore.restApiContext)
			.then((userData) => {
				cachedUserData.value = userData;
				pendingUserDataRequest.value = undefined; // reset pendingUserDataRequest
				return userData;
			})
			.catch((error) => {
				pendingUserDataRequest.value = undefined; // reset pendingUserDataRequest
				throw error;
			});

		pendingUserDataRequest.value = userDataRequest;
		return await userDataRequest;
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
					// In our backend, project roles are stored like this: project:viewer
					// But to make the configuration of project role provisioning easier,
					// we omit this part of the role value in the SSO config.
					const roleValueForProvisioning = project.role.split(':')[1] ?? project.role;
					const projectRole = escapeCsvValue(roleValueForProvisioning);
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
		pendingUserDataRequest.value = undefined;
	};

	return {
		downloadProjectRolesCsv,
		downloadInstanceRolesCsv,
		hasDownloadedInstanceRoleCsv,
		hasDownloadedProjectRoleCsv,
		accessSettingsCsvExportOnModalClose,
	};
}
