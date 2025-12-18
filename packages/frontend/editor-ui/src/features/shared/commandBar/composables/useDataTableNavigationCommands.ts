import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import debounce from 'lodash/debounce';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { DATA_TABLE_DETAILS, PROJECT_DATA_TABLES } from '@/features/core/dataTable/constants';
import type { CommandBarItem } from '../types';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';
import { N8nIcon } from '@n8n/design-system';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';
import { getResourcePermissions } from '@n8n/permissions';

const ITEM_ID = {
	OPEN_DATA_TABLE: 'open-data-table',
	CREATE_DATA_TABLE: 'create-data-table',
};

export function useDataTableNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}) {
	const i18n = useI18n();
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const dataTableStore = useDataTableStore();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();

	const router = useRouter();
	const route = useRoute();

	const dataTableResults = ref<DataTable[]>([]);
	const isLoading = ref(false);
	const hasDataFetched = ref(false);

	const currentProjectId = computed(() => {
		return typeof route.params.projectId === 'string'
			? route.params.projectId
			: personalProjectId.value;
	});

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	function orderResultByCurrentProjectFirst<T extends DataTable>(results: T[]) {
		return results.sort((a, b) => {
			if (a.project?.id === currentProjectId.value) return -1;
			if (b.project?.id === currentProjectId.value) return 1;
			return 0;
		});
	}

	const fetchDataTablesImpl = async (query: string) => {
		try {
			const trimmed = (query || '').trim();

			// Only fetch data from API on the first call
			if (!hasDataFetched.value) {
				await dataTableStore.fetchDataTables('', 1, 1000);
				hasDataFetched.value = true;
			}

			const trimmedLower = trimmed.toLowerCase();
			const filtered = dataTableStore.dataTables.filter((dataTable) =>
				dataTable.name.toLowerCase().includes(trimmedLower),
			);

			dataTableResults.value = orderResultByCurrentProjectFirst(filtered);
		} catch {
			dataTableResults.value = [];
		} finally {
			isLoading.value = false;
		}
	};

	const fetchDataTablesDebounced = debounce(fetchDataTablesImpl, 300);

	const getDataTableProjectSuffix = (dataTable: DataTable) => {
		if (dataTable.project && dataTable.project.type === 'personal') {
			return i18n.baseText('projects.menu.personal');
		}
		return dataTable.project?.name ?? '';
	};

	const createDataTableCommand = (dataTable: DataTable, isRoot: boolean): CommandBarItem => {
		// Add data table name to keywords since we're using a custom component for the title
		const keywords = [dataTable.name];

		const title = isRoot
			? i18n.baseText('generic.openResource', { interpolate: { resource: dataTable.name } })
			: dataTable.name;
		const section = isRoot
			? i18n.baseText('commandBar.sections.dataTables')
			: i18n.baseText('commandBar.dataTables.open');

		return {
			id: dataTable.id,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix: getDataTableProjectSuffix(dataTable),
				},
			},
			section,
			keywords,
			handler: () => {
				void router.push({
					name: DATA_TABLE_DETAILS,
					params: {
						projectId: dataTable.projectId,
						id: dataTable.id,
					},
				});
			},
		};
	};

	const openDataTableCommands = computed<CommandBarItem[]>(() => {
		return dataTableResults.value.map((dataTable) => createDataTableCommand(dataTable, false));
	});

	const rootDataTableItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2 || !dataTableStore.canViewDataTables) {
			return [];
		}
		return dataTableResults.value.map((dataTable) => createDataTableCommand(dataTable, true));
	});

	const dataTableNavigationCommands = computed<CommandBarItem[]>(() => {
		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).dataTable.create;

		const newDataTableCommand: CommandBarItem = {
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
		};

		return [
			...(hasCreatePermission ? [newDataTableCommand] : []),
			...(dataTableStore.canViewDataTables
				? [
						{
							id: ITEM_ID.OPEN_DATA_TABLE,
							title: i18n.baseText('commandBar.dataTables.open'),
							section: i18n.baseText('commandBar.sections.dataTables'),
							placeholder: i18n.baseText('commandBar.dataTables.searchPlaceholder'),
							icon: {
								component: N8nIcon,
								props: {
									icon: 'table',
									color: 'text-light',
								},
							},
							children: openDataTableCommands.value,
						},
					]
				: []),
			...rootDataTableItems.value,
		];
	});

	function onCommandBarChange(query: string) {
		if (!dataTableStore.canViewDataTables) {
			return;
		}

		const trimmed = query.trim();
		const isInDataTableParent = activeNodeId.value === ITEM_ID.OPEN_DATA_TABLE;
		const isRootWithQuery = activeNodeId.value === null && trimmed.length > 2;

		if (isInDataTableParent || isRootWithQuery) {
			isLoading.value = isInDataTableParent;
			void fetchDataTablesDebounced(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_DATA_TABLE) {
			isLoading.value = true;
			void fetchDataTablesImpl('');
		} else if (to === null) {
			dataTableResults.value = [];
			hasDataFetched.value = false;
		}
	}

	return {
		commands: dataTableNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
		isLoading,
	};
}
