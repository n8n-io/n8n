import { computed, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { getResourcePermissions } from '@n8n/permissions';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { searchCredentials } from '@/features/credentials/credentials.api';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import type {
	CommandBarItem,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '../types';
import { VIEWS } from '@/app/constants';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';

const ITEM_ID = {
	CREATE_CREDENTIAL: 'create-credential',
} as const;

export function useCredentialNavigationCommands(options: {
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { currentProjectName } = options;
	const rootStore = useRootStore();
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const uiStore = useUIStore();
	const sourceControlStore = useSourceControlStore();

	const route = useRoute();
	const router = useRouter();

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

	const getProjectName = (credential: ICredentialsResponse) => {
		if (credential.homeProject?.type === 'personal') {
			return i18n.baseText('projects.menu.personal');
		}
		return credential.homeProject?.name ?? '';
	};

	const toCommandBarItem = (credential: ICredentialsResponse): CommandBarItem => {
		const location = credential.homeProject
			? {
					name: VIEWS.PROJECTS_CREDENTIALS,
					params: { projectId: credential.homeProject.id, credentialId: credential.id },
				}
			: { name: VIEWS.CREDENTIALS, params: { credentialId: credential.id } };

		return {
			id: credential.id,
			title: credential.name,
			description: getProjectName(credential),
			icon: {
				component: CredentialIcon,
				props: {
					credentialTypeName: credential.type,
				},
			},
			timestamp: credential.updatedAt,
			href: router.resolve(location).href,
			handler: () => {
				uiStore.openExistingCredential(credential.id);
			},
		};
	};

	async function search({
		query,
		offset,
		limit,
	}: CommandBarSearchRequest): Promise<CommandBarSearchResult> {
		const credentials = await searchCredentials(rootStore.restApiContext, {
			name: query.trim(),
			skip: offset,
			take: limit + 1,
		});

		return {
			items: credentials.slice(0, limit).map(toCommandBarItem),
			hasMore: credentials.length > limit,
		};
	}

	const credentialNavigationCommands = computed<CommandBarItem[]>(() => {
		const hasCreatePermission =
			!sourceControlStore.preferences.branchReadOnly &&
			getResourcePermissions(homeProject.value?.scopes).credential.create;

		if (!hasCreatePermission) return [];

		return [
			{
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
			},
		];
	});

	return {
		commands: credentialNavigationCommands,
		source: {
			id: 'credentials',
			title: i18n.baseText('commandBar.sections.credentials'),
			isRemote: true,
			isAvailable: () => true,
			search,
		},
		async initialize() {
			await credentialsStore.fetchCredentialTypes(false);
		},
	};
}
