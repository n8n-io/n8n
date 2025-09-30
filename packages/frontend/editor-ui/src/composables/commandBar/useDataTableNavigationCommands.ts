import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import debounce from 'lodash/debounce';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useProjectsStore } from '@/stores/projects.store';
import { DATA_STORE_DETAILS, PROJECT_DATA_STORES } from '@/features/dataStore/constants';
import type { CommandGroup, CommandBarItem } from './types';
import type { DataStore } from '@/features/dataStore/datastore.types';
import { N8nIcon } from '@n8n/design-system';

const ITEM_ID = {
	OPEN_DATA_TABLE: 'open-data-table',
	CREATE_DATA_TABLE: 'create-data-table',
};

export function useDataTableNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const dataStoreStore = useDataStoreStore();
	const projectsStore = useProjectsStore();

	const router = useRouter();
	const route = useRoute();

	const dataTableResults = ref<DataStore[]>([]);

	const currentProjectId = computed(() => {
		return typeof route.params.projectId === 'string'
			? route.params.projectId
			: personalProjectId.value;
	});

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	function orderResultByCurrentProjectFirst<T extends DataStore>(results: T[]) {
		return results.sort((a, b) => {
			if (a.project?.id === currentProjectId.value) return -1;
			if (b.project?.id === currentProjectId.value) return 1;
			return 0;
		});
	}

	const fetchDataTables = debounce(async (query: string) => {
		try {
			const trimmed = (query || '').trim();

			if (!currentProjectId.value) {
				dataTableResults.value = [];
				return;
			}

			await dataStoreStore.fetchDataStores(
				currentProjectId.value,
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
			prefix = includeOpenDataTablePrefix
				? i18n.baseText('commandBar.dataTables.openPrefixPersonal')
				: i18n.baseText('commandBar.dataTables.prefixPersonal');
		} else {
			prefix = includeOpenDataTablePrefix
				? i18n.baseText('commandBar.dataTables.openPrefixProject', {
						interpolate: { projectName: dataTable.project?.name ?? '' },
					})
				: i18n.baseText('commandBar.dataTables.prefixProject', {
						interpolate: { projectName: dataTable.project?.name ?? '' },
					});
		}
		return prefix + (dataTable.name || i18n.baseText('commandBar.dataTables.unnamed'));
	};

	const createDataTableCommand = (
		dataTable: DataStore,
		includeOpenDataTablePrefix: boolean,
	): CommandBarItem => {
		return {
			id: dataTable.id,
			title: getDataTableTitle(dataTable, includeOpenDataTablePrefix),
			section: i18n.baseText('commandBar.sections.dataTables'),
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
						icon: 'plus',
					},
				},
				handler: () => {
					if (!currentProjectId.value) return;
					void router.push({
						name: PROJECT_DATA_STORES,
						params: { projectId: currentProjectId.value, new: 'new' },
					});
				},
			},
			{
				id: ITEM_ID.OPEN_DATA_TABLE,
				title: i18n.baseText('commandBar.dataTables.open'),
				section: i18n.baseText('commandBar.sections.dataTables'),
				placeholder: i18n.baseText('commandBar.dataTables.searchPlaceholder'),
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
