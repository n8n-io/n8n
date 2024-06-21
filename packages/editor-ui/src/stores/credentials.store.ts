import type {
	INodeUi,
	IUsedCredential,
	ICredentialMap,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	ICredentialsState,
	ICredentialTypeMap,
} from '@/Interface';
import * as credentialsApi from '@/api/credentials';
import * as credentialsEeApi from '@/api/credentials.ee';
import { makeRestApiRequest } from '@/utils/apiUtils';
import { getAppNameFromCredType } from '@/utils/nodeTypesUtils';
import { EnterpriseEditionFeature, STORES } from '@/constants';
import { i18n } from '@/plugins/i18n';
import type {
	ICredentialsDecrypted,
	ICredentialType,
	INodeCredentialTestResult,
	INodeTypeDescription,
} from 'n8n-workflow';
import { defineStore } from 'pinia';
import { useRootStore } from './root.store';
import { useNodeTypesStore } from './nodeTypes.store';
import { useSettingsStore } from './settings.store';
import { isEmpty } from '@/utils/typesUtils';
import type { ProjectSharingData } from '@/types/projects.types';
import { splitName } from '@/utils/projects.utils';
import { computed, ref } from 'vue';

const DEFAULT_CREDENTIAL_NAME = 'Unnamed credential';
const DEFAULT_CREDENTIAL_POSTFIX = 'account';
const TYPES_WITH_DEFAULT_NAME = ['httpBasicAuth', 'oAuth2Api', 'httpDigestAuth', 'oAuth1Api'];

export type CredentialsStore = ReturnType<typeof useCredentialsStore>;

export const useCredentialsStore = defineStore(STORES.CREDENTIALS, () => {
	const state = ref<ICredentialsState>({ credentialTypes: {}, credentials: {} });

	// ---------------------------------------------------------------------------
	// #region Computed
	// ---------------------------------------------------------------------------

	const credentialTypesById = computed(() => {
		return state.value.credentialTypes;
	});

	const allCredentialTypes = computed(() => {
		return Object.values(state.value.credentialTypes).sort((a, b) =>
			a.displayName.localeCompare(b.displayName),
		);
	});

	const allCredentials = computed(() => {
		return Object.values(state.value.credentials).sort((a, b) => a.name.localeCompare(b.name));
	});

	const allCredentialsByType = computed(() => {
		const credentials = allCredentials.value;
		const types = allCredentialTypes.value;
		return types.reduce(
			(accu: { [type: string]: ICredentialsResponse[] }, type: ICredentialType) => {
				accu[type.name] = credentials.filter(
					(cred: ICredentialsResponse) => cred.type === type.name,
				);
				return accu;
			},
			{},
		);
	});

	const allUsableCredentialsByType = computed(() => {
		const credentials = allCredentials.value;
		const types = allCredentialTypes.value;

		return types.reduce(
			(accu: { [type: string]: ICredentialsResponse[] }, type: ICredentialType) => {
				accu[type.name] = credentials.filter((cred: ICredentialsResponse) => {
					return cred.type === type.name;
				});

				return accu;
			},
			{},
		);
	});

	const allUsableCredentialsForNode = computed(() => {
		return (node: INodeUi): ICredentialsResponse[] => {
			let credentials: ICredentialsResponse[] = [];
			const nodeType = useNodeTypesStore().getNodeType(node.type, node.typeVersion);
			if (nodeType?.credentials) {
				nodeType.credentials.forEach((cred) => {
					credentials = credentials.concat(allUsableCredentialsByType.value[cred.name]);
				});
			}
			return credentials.sort((a, b) => {
				const aDate = new Date(a.updatedAt);
				const bDate = new Date(b.updatedAt);
				return aDate.getTime() - bDate.getTime();
			});
		};
	});

	const getCredentialTypeByName = computed(() => {
		return (type: string): ICredentialType | undefined => state.value.credentialTypes[type];
	});

	const getCredentialById = computed(() => {
		return (id: string): ICredentialsResponse => state.value.credentials[id];
	});

	const getCredentialByIdAndType = computed(() => {
		return (id: string, type: string): ICredentialsResponse | undefined => {
			const credential = state.value.credentials[id];
			return !credential || credential.type !== type ? undefined : credential;
		};
	});

	const getCredentialsByType = computed(() => {
		return (credentialType: string): ICredentialsResponse[] => {
			return allCredentialsByType.value[credentialType] || [];
		};
	});

	const getUsableCredentialByType = computed(() => {
		return (credentialType: string): ICredentialsResponse[] => {
			return allUsableCredentialsByType.value[credentialType] || [];
		};
	});

	const getNodesWithAccess = computed(() => {
		return (credentialTypeName: string) => {
			const nodeTypesStore = useNodeTypesStore();
			const allNodeTypes: INodeTypeDescription[] = nodeTypesStore.allNodeTypes;

			return allNodeTypes.filter((nodeType: INodeTypeDescription) => {
				if (!nodeType.credentials) {
					return false;
				}

				for (const credentialTypeDescription of nodeType.credentials) {
					if (credentialTypeDescription.name === credentialTypeName) {
						return true;
					}
				}

				return false;
			});
		};
	});

	const getScopesByCredentialType = computed(() => {
		return (credentialTypeName: string) => {
			const credentialType = getCredentialTypeByName.value(credentialTypeName);
			if (!credentialType) {
				return [];
			}

			const scopeProperty = credentialType.properties.find((p) => p.name === 'scope');

			if (
				!scopeProperty ||
				!scopeProperty.default ||
				typeof scopeProperty.default !== 'string' ||
				scopeProperty.default === ''
			) {
				return [];
			}

			let { default: scopeDefault } = scopeProperty;

			// disregard expressions for display
			scopeDefault = scopeDefault.replace(/^=/, '').replace(/\{\{.*\}\}/, '');

			if (/ /.test(scopeDefault)) return scopeDefault.split(' ');

			if (/,/.test(scopeDefault)) return scopeDefault.split(',');

			return [scopeDefault];
		};
	});

	const getCredentialOwnerName = computed(() => {
		return (credential: ICredentialsResponse | IUsedCredential | undefined): string => {
			const { firstName, lastName, email } = splitName(credential?.homeProject?.name ?? '');

			return credential?.homeProject?.name
				? `${firstName} ${lastName} (${email})`
				: i18n.baseText('credentialEdit.credentialSharing.info.sharee.fallback');
		};
	});

	const getCredentialOwnerNameById = computed(() => {
		return (credentialId: string): string => {
			const credential = getCredentialById.value(credentialId);

			return getCredentialOwnerName.value(credential);
		};
	});

	const httpOnlyCredentialTypes = computed(() => {
		return allCredentialTypes.value.filter((credentialType) => credentialType.httpRequestNode);
	});

	// #endregion

	// ---------------------------------------------------------------------------
	// #region Methods
	// ---------------------------------------------------------------------------

	const setCredentialTypes = (credentialTypes: ICredentialType[]) => {
		state.value.credentialTypes = credentialTypes.reduce(
			(accu: ICredentialTypeMap, cred: ICredentialType) => {
				accu[cred.name] = cred;

				return accu;
			},
			{},
		);
	};

	const addCredentials = (credentials: ICredentialsResponse[]) => {
		credentials.forEach((cred: ICredentialsResponse) => {
			if (cred.id) {
				state.value.credentials[cred.id] = { ...state.value.credentials[cred.id], ...cred };
			}
		});
	};

	const setCredentials = (credentials: ICredentialsResponse[]) => {
		state.value.credentials = credentials.reduce(
			(accu: ICredentialMap, cred: ICredentialsResponse) => {
				if (cred.id) {
					accu[cred.id] = cred;
				}
				return accu;
			},
			{},
		);
	};

	const upsertCredential = (credential: ICredentialsResponse) => {
		if (credential.id) {
			state.value.credentials = {
				...state.value.credentials,
				[credential.id]: {
					...state.value.credentials[credential.id],
					...credential,
				},
			};
		}
	};

	const fetchCredentialTypes = async (forceFetch: boolean) => {
		if (allCredentialTypes.value.length > 0 && !forceFetch) {
			return;
		}
		const rootStore = useRootStore();
		const credentialTypes = await credentialsApi.getCredentialTypes(rootStore.baseUrl);
		setCredentialTypes(credentialTypes);
	};

	const fetchAllCredentials = async (
		projectId?: string,
		includeScopes = true,
	): Promise<ICredentialsResponse[]> => {
		const rootStore = useRootStore();

		const filter = {
			projectId,
		};

		const credentials = await credentialsApi.getAllCredentials(
			rootStore.restApiContext,
			isEmpty(filter) ? undefined : filter,
			includeScopes,
		);
		setCredentials(credentials);
		return credentials;
	};

	const fetchAllCredentialsForWorkflow = async (
		options: { workflowId: string } | { projectId: string },
	): Promise<ICredentialsResponse[]> => {
		const rootStore = useRootStore();

		const credentials = await credentialsApi.getAllCredentialsForWorkflow(
			rootStore.restApiContext,
			options,
		);
		setCredentials(credentials);
		return credentials;
	};

	const getCredentialData = async ({
		id,
	}: {
		id: string;
	}): Promise<ICredentialsResponse | ICredentialsDecryptedResponse | undefined> => {
		const rootStore = useRootStore();
		return await credentialsApi.getCredentialData(rootStore.restApiContext, id);
	};

	const createNewCredential = async (
		data: ICredentialsDecrypted,
		projectId?: string,
	): Promise<ICredentialsResponse> => {
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const credential = await credentialsApi.createNewCredential(
			rootStore.restApiContext,
			data,
			projectId,
		);

		if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
			upsertCredential(credential);
			if (data.sharedWithProjects) {
				await setCredentialSharedWith({
					credentialId: credential.id,
					sharedWithProjects: data.sharedWithProjects,
				});
			}
		} else {
			upsertCredential(credential);
		}
		return credential;
	};

	const updateCredential = async (params: {
		data: ICredentialsDecrypted;
		id: string;
	}): Promise<ICredentialsResponse> => {
		const { id, data } = params;
		const rootStore = useRootStore();
		const credential = await credentialsApi.updateCredential(rootStore.restApiContext, id, data);

		upsertCredential(credential);

		return credential;
	};

	const deleteCredential = async ({ id }: { id: string }) => {
		const rootStore = useRootStore();
		const deleted = await credentialsApi.deleteCredential(rootStore.restApiContext, id);
		if (deleted) {
			const { [id]: deletedCredential, ...rest } = state.value.credentials;
			state.value.credentials = rest;
		}
	};

	const oAuth2Authorize = async (data: ICredentialsResponse): Promise<string> => {
		const rootStore = useRootStore();
		return await credentialsApi.oAuth2CredentialAuthorize(rootStore.restApiContext, data);
	};

	const oAuth1Authorize = async (data: ICredentialsResponse): Promise<string> => {
		const rootStore = useRootStore();
		return await credentialsApi.oAuth1CredentialAuthorize(rootStore.restApiContext, data);
	};

	const testCredential = async (
		data: ICredentialsDecrypted,
	): Promise<INodeCredentialTestResult> => {
		const rootStore = useRootStore();
		return await credentialsApi.testCredential(rootStore.restApiContext, { credentials: data });
	};

	const getNewCredentialName = async (params: { credentialTypeName: string }): Promise<string> => {
		try {
			const { credentialTypeName } = params;
			let newName = DEFAULT_CREDENTIAL_NAME;
			if (!TYPES_WITH_DEFAULT_NAME.includes(credentialTypeName)) {
				const cred = getCredentialTypeByName.value(credentialTypeName);
				newName = cred ? getAppNameFromCredType(cred.displayName) : '';
				newName =
					newName.length > 0 ? `${newName} ${DEFAULT_CREDENTIAL_POSTFIX}` : DEFAULT_CREDENTIAL_NAME;
			}
			const rootStore = useRootStore();
			const res = await credentialsApi.getCredentialsNewName(rootStore.restApiContext, newName);
			return res.name;
		} catch (e) {
			return DEFAULT_CREDENTIAL_NAME;
		}
	};

	const setCredentialSharedWith = async (payload: {
		sharedWithProjects: ProjectSharingData[];
		credentialId: string;
	}): Promise<ICredentialsResponse> => {
		if (useSettingsStore().isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
			await credentialsEeApi.setCredentialSharedWith(
				useRootStore().restApiContext,
				payload.credentialId,
				{
					shareWithIds: payload.sharedWithProjects.map((project) => project.id),
				},
			);

			state.value.credentials[payload.credentialId] = {
				...state.value.credentials[payload.credentialId],
				sharedWithProjects: payload.sharedWithProjects,
			};
		}
		return state.value.credentials[payload.credentialId];
	};

	const getCredentialTranslation = async (credentialType: string): Promise<object> => {
		const rootStore = useRootStore();
		return await makeRestApiRequest(rootStore.restApiContext, 'GET', '/credential-translation', {
			credentialType,
		});
	};

	// #endregion

	return {
		getCredentialOwnerName,
		getCredentialsByType,
		getCredentialById,
		getCredentialTypeByName,
		getCredentialByIdAndType,
		getNodesWithAccess,
		getUsableCredentialByType,
		credentialTypesById,
		httpOnlyCredentialTypes,
		getScopesByCredentialType,
		getCredentialOwnerNameById,
		allUsableCredentialsForNode,
		allCredentials,
		allCredentialTypes,
		allUsableCredentialsByType,
		setCredentialTypes,
		addCredentials,
		setCredentials,
		deleteCredential,
		upsertCredential,
		fetchCredentialTypes,
		fetchAllCredentials,
		fetchAllCredentialsForWorkflow,
		createNewCredential,
		updateCredential,
		getCredentialData,
		oAuth1Authorize,
		oAuth2Authorize,
		getNewCredentialName,
		testCredential,
		getCredentialTranslation,
		setCredentialSharedWith,
	};
});

/**
 * Helper function for listening to credential changes in the store
 */
export const listenForCredentialChanges = (opts: {
	store: CredentialsStore;
	onCredentialCreated?: (credential: ICredentialsResponse) => void;
	onCredentialUpdated?: (credential: ICredentialsResponse) => void;
	onCredentialDeleted?: (credentialId: string) => void;
}) => {
	const { store, onCredentialCreated, onCredentialDeleted, onCredentialUpdated } = opts;
	const listeningForActions = ['createNewCredential', 'updateCredential', 'deleteCredential'];

	return store.$onAction((result) => {
		const { name, after, args } = result;
		after(async (returnValue) => {
			if (!listeningForActions.includes(name)) {
				return;
			}

			switch (name) {
				case 'createNewCredential':
					const createdCredential = returnValue as unknown as ICredentialsResponse;
					onCredentialCreated?.(createdCredential);
					break;

				case 'updateCredential':
					const updatedCredential = returnValue as unknown as ICredentialsResponse;
					onCredentialUpdated?.(updatedCredential);
					break;

				case 'deleteCredential':
					const credentialId = args[0].id;
					onCredentialDeleted?.(credentialId);
					break;
			}
		});
	});
};
