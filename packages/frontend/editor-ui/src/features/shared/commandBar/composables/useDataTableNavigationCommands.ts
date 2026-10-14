import { computed, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { fetchDataTablesApi } from '@/features/core/dataTable/dataTable.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import type {
	CommandBarItem,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '../types';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { N8nIcon } from '@n8n/design-system';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';

const ITEM_ID = {
	CREATE_DATA_TABLE: 'create-data-table',
};

export function useDataTableNavigationCommands(options: {
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { currentProjectName } = options;
	const rootStore = useRootStore();
	const dataTableStore = useDataTableStore();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();

	const router = useRouter();
	const route = useRoute();

	const currentProjectId = computed(() => {
		return typeof route.params.projectId === 'string'
			? route.params.projectId
			: personalProjectId.value;
	});

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const getProjectName = (dataTable: DataTable) => {
		if (dataTable.project?.type === 'personal') {
			return i18n.baseText('projects.menu.personal');
		}
		return dataTable.project?.name ?? '';
	};

	const toCommandBarItem = (dataTable: DataTable): CommandBarItem => {
		const location = {
			name: DATA_TABLE_DETAILS,
			params: {
				projectId: dataTable.projectId,
				id: dataTable.id,
			},
		};

		return {
			id: dataTable.id,
			title: dataTable.name,
			description: getProjectName(dataTable),
			icon: { type: 'icon', value: 'table' },
			timestamp: dataTable.updatedAt,
			href: router.resolve(location).href,
			handler: () => {
				void router.push(location);
			},
		};
	};

	async function search({
		query,
		offset,
		limit,
	}: CommandBarSearchRequest): Promise<CommandBarSearchResult> {
		const name = query.trim();
		const { count, data } = await fetchDataTablesApi(
			rootStore.restApiContext,
			'',
			{ skip: offset, take: limit },
			name ? { name } : undefined,
			'updatedAt:desc',
		);

		return {
			items: data.map(toCommandBarItem),
			hasMore: offset + data.length < count,
		};
	}

	const dataTableNavigationCommands = computed<CommandBarItem[]>(() => {
		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).dataTable.create;

		if (!hasCreatePermission) return [];

		return [
			{
				id: ITEM_ID.CREATE_DATA_TABLE,
				title: i18n.baseText('commandBar.dataTables.create', {
					interpolate: { projectName: currentProjectName.value },
				}),
				section: i18n.baseText('commandBar.sections.dataTables'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'table',
						color: 'text-light',
					},
				},
				handler: () => {
					if (!currentProjectId.value) return;
					void router.push({
						name: PROJECT_DATA_TABLES,
						params: { projectId: currentProjectId.value, new: 'new' },
					});
				},
			},
		];
	});

	return {
		commands: dataTableNavigationCommands,
		source: {
			id: 'dataTables',
			title: i18n.baseText('commandBar.sections.dataTables'),
			isRemote: true,
			isAvailable: () => dataTableStore.canViewDataTables,
			search,
		},
	};
}
