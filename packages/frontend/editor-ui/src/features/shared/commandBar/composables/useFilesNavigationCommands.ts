import { computed, ref, type Ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import debounce from 'lodash/debounce';
import { useFilesStore } from '@/features/core/files/files.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { PROJECT_FILES, PROJECT_FILES_PREVIEW } from '@/features/core/files/constants';
import type { CommandBarItem } from '../types';
import type { ProjectFile } from '@/features/core/files/files.types';
import { N8nIcon } from '@n8n/design-system';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';
import { getResourcePermissions } from '@n8n/permissions';

const ITEM_ID = {
	OPEN_FILE: 'open-file',
	ADD_FILE: 'add-file',
};

export function useFilesNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}) {
	const i18n = useI18n();
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const filesStore = useFilesStore();
	const projectsStore = useProjectsStore();
	const settingsStore = useSettingsStore();
	const sourceControlStore = useSourceControlStore();

	const router = useRouter();
	const route = useRoute();

	const fileResults = ref<ProjectFile[]>([]);
	const isLoading = ref(false);
	const hasDataFetched = ref(false);

	const isModuleActive = computed(() => settingsStore.isModuleActive('file-storage'));

	const currentProjectId = computed(() => {
		return typeof route.params.projectId === 'string'
			? route.params.projectId
			: personalProjectId.value;
	});

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	function orderResultByCurrentProjectFirst<T extends ProjectFile>(results: T[]) {
		return results.sort((a, b) => {
			if (a.project?.id === currentProjectId.value) return -1;
			if (b.project?.id === currentProjectId.value) return 1;
			return 0;
		});
	}

	const fetchFilesImpl = async (query: string) => {
		try {
			const trimmed = (query || '').trim();

			// Only fetch data from API on the first call
			if (!hasDataFetched.value) {
				await filesStore.fetchFiles('', 1, 1000);
				hasDataFetched.value = true;
			}

			const trimmedLower = trimmed.toLowerCase();
			const filtered = filesStore.files.filter((file) =>
				file.name.toLowerCase().includes(trimmedLower),
			);

			fileResults.value = orderResultByCurrentProjectFirst(filtered);
		} catch {
			fileResults.value = [];
		} finally {
			isLoading.value = false;
		}
	};

	const fetchFilesDebounced = debounce(fetchFilesImpl, 300);

	const getFileProjectSuffix = (file: ProjectFile) => {
		if (file.project && file.project.type === 'personal') {
			return i18n.baseText('projects.menu.personal');
		}
		return file.project?.name ?? '';
	};

	const createFileCommand = (file: ProjectFile, isRoot: boolean): CommandBarItem => {
		// Add the file name to keywords since we're using a custom component for the title
		const keywords = [file.name];

		const title = isRoot
			? i18n.baseText('generic.openResource', { interpolate: { resource: file.name } })
			: file.name;
		const section = isRoot
			? i18n.baseText('commandBar.sections.files')
			: i18n.baseText('commandBar.files.open');

		return {
			id: file.id,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix: getFileProjectSuffix(file),
				},
			},
			section,
			keywords,
			handler: () => {
				void router.push({
					name: PROJECT_FILES_PREVIEW,
					params: {
						projectId: file.projectId,
						id: file.id,
					},
				});
			},
		};
	};

	const openFileCommands = computed<CommandBarItem[]>(() => {
		return fileResults.value.map((file) => createFileCommand(file, false));
	});

	const rootFileItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2 || !filesStore.canViewFiles) {
			return [];
		}
		return fileResults.value.map((file) => createFileCommand(file, true));
	});

	const filesNavigationCommands = computed<CommandBarItem[]>(() => {
		if (!isModuleActive.value) {
			return [];
		}

		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).file.create;

		const addFileCommand: CommandBarItem = {
			id: ITEM_ID.ADD_FILE,
			title: i18n.baseText('commandBar.files.add', {
				interpolate: { projectName: currentProjectName.value },
			}),
			section: i18n.baseText('commandBar.sections.files'),
			icon: {
				component: N8nIcon,
				props: {
					icon: 'file',
					color: 'text-light',
				},
			},
			handler: () => {
				if (!currentProjectId.value) return;
				void router.push({
					name: PROJECT_FILES,
					params: { projectId: currentProjectId.value, new: 'new' },
				});
			},
		};

		return [
			...(hasCreatePermission ? [addFileCommand] : []),
			...(filesStore.canViewFiles
				? [
						{
							id: ITEM_ID.OPEN_FILE,
							title: i18n.baseText('commandBar.files.open'),
							section: i18n.baseText('commandBar.sections.files'),
							placeholder: i18n.baseText('commandBar.files.searchPlaceholder'),
							icon: {
								component: N8nIcon,
								props: {
									icon: 'file',
									color: 'text-light',
								},
							},
							children: openFileCommands.value,
						},
					]
				: []),
			...rootFileItems.value,
		];
	});

	function onCommandBarChange(query: string) {
		if (!isModuleActive.value || !filesStore.canViewFiles) {
			return;
		}

		const trimmed = query.trim();
		const isInFilesParent = activeNodeId.value === ITEM_ID.OPEN_FILE;
		const isRootWithQuery = activeNodeId.value === null && trimmed.length > 2;

		if (isInFilesParent || isRootWithQuery) {
			isLoading.value = true;
			void fetchFilesDebounced(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_FILE) {
			isLoading.value = true;
			void fetchFilesImpl('');
		} else if (to === null) {
			isLoading.value = false;
			fileResults.value = [];
			hasDataFetched.value = false;
		}
	}

	return {
		commands: filesNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
		isLoading,
	};
}
