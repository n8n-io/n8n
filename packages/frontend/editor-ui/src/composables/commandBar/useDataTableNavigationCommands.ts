import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import debounce from 'lodash/debounce';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useProjectsStore } from '@/stores/projects.store';
import { DATA_STORE_DETAILS, PROJECT_DATA_STORES } from '@/features/dataStore/constants';
import type { CommandGroup, CommandBarItem } from './types';
import type { DataStore } from '@/features/dataStore/datastore.types';
import { N8nIcon } from '@n8n/design-system';

const Section = {
	DATA_TABLES: 'Data Tables',
} as const;

const ITEM_ID = {
	OPEN_DATA_TABLE: 'open-data-table',
	CREATE_DATA_TABLE: 'create-data-table',
};

export function useDataTableNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}): CommandGroup {
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const dataStoreStore = useDataStoreStore();
	const projectsStore = useProjectsStore();

	const router = useRouter();
	const route = useRoute();

	const dataTableResults = ref<DataStore[]>([]);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	function orderResultByCurrentProjectFirst<T extends DataStore>(results: T[]) {
		const currentProjectId = (route.params.projectId as string) || personalProjectId.value;
		return results.sort((a, b) => {
			if (a.project?.id === currentProjectId) return -1;
			if (b.project?.id === currentProjectId) return 1;
			return 0;
		});
	}

	const fetchDataTables = debounce(async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			const currentProjectId = (route.params.projectId as string) || personalProjectId.value;

			if (!currentProjectId) {
				dataTableResults.value = [];
				return;
			}

			await dataStoreStore.fetchDataStores(
				currentProjectId,
				1,
				100, // TODO: pagination/lazy loading
			);

			const trimmedLower = trimmed.toLowerCase();
			const filtered = dataStoreStore.dataStores.filter((dataTable) =>
				dataTable.name.toLowerCase().includes(trimmedLower),
			);

			dataTableResults.value = orderResultByCurrentProjectFirst(filtered);
		} catch {
			dataTableResults.value = [];
		}
	}, 300);

	const getDataTableTitle = (dataTable: DataStore, includeOpenDataTablePrefix: boolean) => {
		let prefix = '';
		if (dataTable.project && dataTable.project.type === 'personal') {
			prefix = includeOpenDataTablePrefix ? 'Open data table > [Personal] > ' : '[Personal] > ';
		} else {
			prefix = includeOpenDataTablePrefix
				? `Open data table > [${dataTable.project?.name}] > `
				: `[${dataTable.project?.name}] > `;
		}
		return prefix + dataTable.name || '(unnamed data table)';
	};

	const createDataTableCommand = (
		dataTable: DataStore,
		includeOpenDataTablePrefix: boolean,
	): CommandBarItem => {
		return {
			id: dataTable.id,
			title: getDataTableTitle(dataTable, includeOpenDataTablePrefix),
			section: Section.DATA_TABLES,
			handler: () => {
				const targetRoute = router.resolve({
					name: DATA_STORE_DETAILS,
					params: {
						projectId: dataTable.projectId,
						id: dataTable.id,
					},
				});
				window.location.href = targetRoute.fullPath;
			},
		};
	};

	const openDataTableCommands = computed<CommandBarItem[]>(() => {
		return dataTableResults.value.map((dataTable) => createDataTableCommand(dataTable, false));
	});

	const rootDataTableItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2) {
			return [];
		}
		return dataTableResults.value.map((dataTable) => createDataTableCommand(dataTable, true));
	});

	const dataTableNavigationCommands = computed<CommandBarItem[]>(() => {
		const currentProjectId = (route.params.projectId as string) || personalProjectId.value;

		return [
			{
				id: ITEM_ID.CREATE_DATA_TABLE,
				title: `Create data table in ${currentProjectName.value}`,
				section: Section.DATA_TABLES,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'plus',
					},
				},
				handler: () => {
					if (!currentProjectId) return;
					void router.push({
						name: PROJECT_DATA_STORES,
						params: { projectId: currentProjectId, new: 'new' },
					});
				},
			},
			{
				id: ITEM_ID.OPEN_DATA_TABLE,
				title: 'Open data table',
				section: Section.DATA_TABLES,
				placeholder: 'Search by data table name...',
				icon: {
					component: N8nIcon,
					props: {
						icon: 'arrow-right',
					},
				},
				children: openDataTableCommands.value,
			},
			...rootDataTableItems.value,
		];
	});

	function onCommandBarChange(query: string) {
		lastQuery.value = query;

		const trimmed = query.trim();
		if (trimmed.length > 2 || activeNodeId.value === ITEM_ID.OPEN_DATA_TABLE) {
			void fetchDataTables(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_DATA_TABLE) {
			void fetchDataTables('');
		} else if (to === null) {
			dataTableResults.value = [];
		}
	}

	return {
		commands: dataTableNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
	};
}
