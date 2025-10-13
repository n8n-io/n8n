import { computed, ref, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import debounce from 'lodash/debounce';
import type { ICredentialsResponse } from '@/Interface';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useUIStore } from '@/stores/ui.store';
import type { CommandGroup, CommandBarItem } from '../commandBar.types';

const ITEM_ID = {
	CREATE_CREDENTIAL: 'create-credential',
	OPEN_CREDENTIAL: 'open-credential',
};

export function useCredentialNavigationCommands(options: {
	lastQuery: Ref<string>;
	activeNodeId: Ref<string | null>;
	currentProjectName: Ref<string>;
}): CommandGroup {
	const i18n = useI18n();
	const { lastQuery, activeNodeId, currentProjectName } = options;
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const uiStore = useUIStore();

	const route = useRoute();
	const router = useRouter();

	const credentialResults = ref<ICredentialsResponse[]>([]);

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	function orderResultByCurrentProjectFirst<T extends ICredentialsResponse>(results: T[]) {
		const currentProjectId =
			typeof route.params.projectId === 'string' ? route.params.projectId : personalProjectId.value;
		return results.sort((a, b) => {
			if (a.homeProject?.id === currentProjectId) return -1;
			if (b.homeProject?.id === currentProjectId) return 1;
			return 0;
		});
	}

	const fetchCredentials = debounce(async (query: string) => {
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
		}
	}, 300);

	const getCredentialTitle = (
		credential: ICredentialsResponse,
		includeOpenCredentialPrefix: boolean,
	) => {
		let prefix = '';
		if (credential.homeProject && credential.homeProject.type === 'personal') {
			prefix = includeOpenCredentialPrefix
				? i18n.baseText('commandBar.credentials.openPrefixPersonal')
				: i18n.baseText('commandBar.credentials.prefixPersonal');
		} else {
			prefix = includeOpenCredentialPrefix
				? i18n.baseText('commandBar.credentials.openPrefixProject', {
						interpolate: { projectName: credential.homeProject?.name ?? '' },
					})
				: i18n.baseText('commandBar.credentials.prefixProject', {
						interpolate: { projectName: credential.homeProject?.name ?? '' },
					});
		}
		return prefix + (credential.name || i18n.baseText('commandBar.credentials.unnamed'));
	};

	const createCredentialCommand = (
		credential: ICredentialsResponse,
		includeOpenCredentialPrefix: boolean,
	): CommandBarItem => {
		return {
			id: credential.id,
			title: getCredentialTitle(credential, includeOpenCredentialPrefix),
			section: i18n.baseText('commandBar.sections.credentials'),
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
		return [
			{
				id: ITEM_ID.CREATE_CREDENTIAL,
				title: i18n.baseText('commandBar.credentials.create', {
					interpolate: { projectName: currentProjectName.value },
				}),
				section: i18n.baseText('commandBar.sections.credentials'),
				icon: {
					component: N8nIcon,
					props: {
						icon: 'plus',
					},
				},
				handler: () => {
					void router.push({
						params: { credentialId: 'create' },
					});
				},
			},
			{
				id: ITEM_ID.OPEN_CREDENTIAL,
				title: i18n.baseText('commandBar.credentials.open'),
				section: i18n.baseText('commandBar.sections.credentials'),
				placeholder: i18n.baseText('commandBar.credentials.searchPlaceholder'),
				children: openCredentialCommands.value,
				icon: {
					component: N8nIcon,
					props: {
						icon: 'arrow-right',
					},
				},
			},
			...rootCredentialItems.value,
		];
	});

	function onCommandBarChange(query: string) {
		lastQuery.value = query;

		const trimmed = query.trim();
		if (trimmed.length > 2 || activeNodeId.value === ITEM_ID.OPEN_CREDENTIAL) {
			void fetchCredentials(trimmed);
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		activeNodeId.value = to;

		if (to === ITEM_ID.OPEN_CREDENTIAL) {
			void fetchCredentials('');
		} else if (to === null) {
			credentialResults.value = [];
		}
	}

	return {
		commands: credentialNavigationCommands,
		handlers: {
			onCommandBarChange,
			onCommandBarNavigateTo,
		},
	};
}
