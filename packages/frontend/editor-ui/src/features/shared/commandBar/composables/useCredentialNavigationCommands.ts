import { computed, ref, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import debounce from 'lodash/debounce';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { CommandBarItem } from '../types';
import { VIEWS } from '@/app/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';
import { getResourcePermissions } from '@n8n/permissions';

const ITEM_ID = {
	CREATE_CREDENTIAL: 'create-credential',
	OPEN_CREDENTIAL: 'open-credential',
} as const;

export function useCredentialNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}) {
	const i18n = useI18n();
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const uiStore = useUIStore();
	const sourceControlStore = useSourceControlStore();

	const route = useRoute();
	const router = useRouter();

	const credentialResults = ref<ICredentialsResponse[]>([]);
	const isLoading = ref(false);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	function orderResultByCurrentProjectFirst<T extends ICredentialsResponse>(results: T[]) {
		const currentProjectId =
			typeof route.params.projectId === 'string' ? route.params.projectId : personalProjectId.value;
		return results.sort((a, b) => {
			if (a.homeProject?.id === currentProjectId) return -1;
			if (b.homeProject?.id === currentProjectId) return 1;
			return 0;
		});
	}

	const fetchCredentialsImpl = async (query: string) => {
		try {
			const trimmed = (query || '').trim();
			await credentialsStore.fetchAllCredentials();

			const trimmedLower = trimmed.toLowerCase();
			const filtered = credentialsStore.allCredentials.filter((credential) =>
				credential.name.toLowerCase().includes(trimmedLower),
			);

			credentialResults.value = orderResultByCurrentProjectFirst(filtered);
		} catch {
			credentialResults.value = [];
		} finally {
			isLoading.value = false;
		}
	};
	const fetchCredentialsDebounced = debounce(fetchCredentialsImpl, 300);

	const getCredentialProjectSuffix = (credential: ICredentialsResponse) => {
		if (credential.homeProject && credential.homeProject.type === 'personal') {
			return i18n.baseText('projects.menu.personal');
		}
		return credential.homeProject?.name ?? '';
	};

	const createCredentialCommand = (
		credential: ICredentialsResponse,
		isRoot: boolean,
	): CommandBarItem => {
		// Add credential name to keywords since we're using a custom component for the title
		const keywords = [credential.name];

		const title = isRoot
			? i18n.baseText('generic.openResource', { interpolate: { resource: credential.name } })
			: credential.name;
		const section = isRoot
			? i18n.baseText('commandBar.sections.credentials')
			: i18n.baseText('commandBar.credentials.open');

		return {
			id: credential.id,
			title: {
				component: CommandBarItemTitle,
				props: {
					title,
					suffix: getCredentialProjectSuffix(credential),
				},
			},
			section,
			keywords,
			icon: {
				component: CredentialIcon,
				props: {
					credentialTypeName: credential.type,
				},
			},
			handler: () => {
				uiStore.openExistingCredential(credential.id);
			},
		};
	};

	const openCredentialCommands = computed<CommandBarItem[]>(() => {
		return credentialResults.value.map((credential) => createCredentialCommand(credential, false));
	});

	const rootCredentialItems = computed<CommandBarItem[]>(() => {
		if (lastQuery.value.length <= 2) {
			return [];
		}
		return credentialResults.value.map((credential) => createCredentialCommand(credential, true));
	});

	const credentialNavigationCommands = computed<CommandBarItem[]>(() => {
		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).credential.create;

		const newCredentialCommand: CommandBarItem = {
			id: ITEM_ID.CREATE_CREDENTIAL,
			title: i18n.baseText('commandBar.credentials.create', {
				interpolate: { projectName: currentProjectName.value },
			}),
			section: i18n.baseText('commandBar.sections.credentials'),
			keywords: [i18n.baseText('credentials.add')],
			icon: {
				component: N8nIcon,
				props: {
					icon: 'lock',
					color: 'text-light',
				},
			},
			handler: () => {
				const currentProjectId =
					typeof route.params.projectId === 'string'
						? route.params.projectId
						: personalProjectId.value;

				const routeName =
					route.name === VIEWS.SHARED_CREDENTIALS
						? VIEWS.SHARED_CREDENTIALS
						: route.name === VIEWS.CREDENTIALS
							? VIEWS.CREDENTIALS
							: VIEWS.PROJECTS_CREDENTIALS;

				void router.push({
					name: routeName,
					params: {
						projectId: currentProjectId,
						credentialId: 'create',
					},
				});
			},
		};

		return [
			...(hasCreatePermission ? [newCredentialCommand] : []),
			{
				id: ITEM_ID.OPEN_CREDENTIAL,
				title: i18n.baseText('commandBar.credentials.open'),
				section: i18n.baseText('commandBar.sections.credentials'),
				placeholder: i18n.baseText('commandBar.credentials.searchPlaceholder'),
				children: openCredentialCommands.value,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'lock',
						color: 'text-light',
					},
				},
			},
			...rootCredentialItems.value,
		];
	});

	function onCommandBarChange(query: string) {
		const trimmed = query.trim();
		const isInCredentialParent = activeNodeId.value === ITEM_ID.OPEN_CREDENTIAL;
		const isRootWithQuery = activeNodeId.value === null && trimmed.length > 2;

		if (isInCredentialParent || isRootWithQuery) {
			isLoading.value = isInCredentialParent;
			void fetchCredentialsDebounced(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_CREDENTIAL) {
			isLoading.value = true;
			void fetchCredentialsImpl('');
		} else if (to === null) {
			credentialResults.value = [];
		}
	}

	async function initialize() {
		await credentialsStore.fetchCredentialTypes(false);
	}

	return {
		commands: credentialNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
		isLoading,
		initialize,
	};
}
