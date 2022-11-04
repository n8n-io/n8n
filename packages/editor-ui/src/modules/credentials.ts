import {
	getCredentialTypes,
	getCredentialsNewName,
	getAllCredentials,
	deleteCredential,
	getCredentialData,
	createNewCredential,
	updateCredential,
	oAuth2CredentialAuthorize,
	oAuth1CredentialAuthorize,
	testCredential,
	getForeignCredentials,
} from '@/api/credentials';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import {
	ICredentialMap,
	ICredentialsResponse,
	ICredentialsState,
	ICredentialTypeMap,
	IRootState,
} from '@/Interface';
import {
	ICredentialType,
	ICredentialsDecrypted,
	INodeCredentialTestResult,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { getAppNameFromCredType } from '@/components/helpers';
import {i18n} from "@/plugins/i18n";
import {credentialsEEModule} from "@/modules/credentials.ee";
import {EnterpriseEditionFeature} from "@/constants";
import { useUsersStore } from '@/stores/users';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';

const DEFAULT_CREDENTIAL_NAME = 'Unnamed credential';
const DEFAULT_CREDENTIAL_POSTFIX = 'account';
const TYPES_WITH_DEFAULT_NAME = ['httpBasicAuth', 'oAuth2Api', 'httpDigestAuth', 'oAuth1Api'];

const module: Module<ICredentialsState, IRootState> = {
	namespaced: true,
	state: {
		credentialTypes: {},
		credentials: {},
		...credentialsEEModule.state,
	},
	mutations: {
		setCredentialTypes: (state: ICredentialsState, credentialTypes: ICredentialType[]) => {
			state.credentialTypes = credentialTypes.reduce((accu: ICredentialTypeMap, cred: ICredentialType) => {
				accu[cred.name] = cred;

				return accu;
			}, {});
		},
		setCredentials: (state: ICredentialsState, credentials: ICredentialsResponse[]) => {
			state.credentials = credentials.reduce((accu: ICredentialMap, cred: ICredentialsResponse) => {
				if (cred.id) {
					accu[cred.id] = cred;
				}

				return accu;
			}, {});
		},
		setForeignCredentials: (state: ICredentialsState, credentials: ICredentialsResponse[]) => {
			state.foreignCredentials = credentials.reduce((accu: ICredentialMap, cred: ICredentialsResponse) => {
				if (cred.id) {
					accu[cred.id] = cred;
				}

				return accu;
			}, {});
		},
		upsertCredential(state: ICredentialsState, credential: ICredentialsResponse) {
			if (credential.id) {
				Vue.set(state.credentials, credential.id, { ...state.credentials[credential.id], ...credential });
			}
		},
		deleteCredential(state: ICredentialsState, id: string) {
			Vue.delete(state.credentials, id);
		},
		enableOAuthCredential(state: ICredentialsState, credential: ICredentialsResponse) {
			// enable oauth event to track change between modals
		},
		...credentialsEEModule.mutations,
	},
	getters: {
		credentialTypesById(state: ICredentialsState): Record<ICredentialType['name'], ICredentialType> {
			return state.credentialTypes;
		},
		allCredentialTypes(state: ICredentialsState): ICredentialType[] {
			return Object.values(state.credentialTypes)
				.sort((a, b) => a.displayName.localeCompare(b.displayName));
		},
		allCredentials(state: ICredentialsState): ICredentialsResponse[] {
			return Object.values(state.credentials)
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		allForeignCredentials(state: ICredentialsState): ICredentialsResponse[] {
			return Object.values(state.foreignCredentials || {})
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		allCredentialsByType(state: ICredentialsState, getters: any): {[type: string]: ICredentialsResponse[]} { // tslint:disable-line:no-any
			const credentials = getters.allCredentials as ICredentialsResponse[];
			const types = getters.allCredentialTypes as ICredentialType[];

			return types.reduce((accu: {[type: string]: ICredentialsResponse[]}, type: ICredentialType) => {
				accu[type.name] = credentials.filter((cred: ICredentialsResponse) => cred.type === type.name);

				return accu;
			}, {});
		},
		getCredentialTypeByName: (state: ICredentialsState) => {
			return (type: string) => state.credentialTypes[type];
		},
		getCredentialById: (state: ICredentialsState) => {
			return (id: string) => state.credentials[id];
		},
		getCredentialByIdAndType: (state: ICredentialsState) => {
			return (id: string, type: string) => {
				const credential = state.credentials[id];
				return !credential || credential.type !== type ? undefined : credential;
			};
		},
		getCredentialsByType: (state: ICredentialsState, getters: any) => { // tslint:disable-line:no-any
			return (credentialType: string): ICredentialsResponse[] => {
				return (getters.allCredentialsByType[credentialType] || []);
			};
		},
		getNodesWithAccess (state: ICredentialsState, getters: any, rootState: IRootState, rootGetters: any) { // tslint:disable-line:no-any
			return (credentialTypeName: string) => {
				const nodeTypesStore = useNodeTypesStore();
				const allLatestNodeTypes: INodeTypeDescription[] = nodeTypesStore.allLatestNodeTypes;

				return allLatestNodeTypes.filter((nodeType: INodeTypeDescription) => {
					if (!nodeType.credentials) {
						return false;
					}

					for (const credentialTypeDescription of nodeType.credentials) {
						if (credentialTypeDescription.name === credentialTypeName ) {
							return true;
						}
					}

					return false;
				});
			};
		},
		getScopesByCredentialType (_: ICredentialsState, getters: any) { // tslint:disable-line:no-any
			return (credentialTypeName: string) => {
				const credentialType = getters.getCredentialTypeByName(credentialTypeName) as {
					properties: INodeProperties[];
				};

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
		},
		getCredentialOwnerName: (state: ICredentialsState, getters: any) =>  // tslint:disable-line:no-any
			(credentialId: string): string => {
				const credential = getters.getCredentialById(credentialId);
				return credential && credential.ownedBy && credential.ownedBy.firstName
					? `${credential.ownedBy.firstName} ${credential.ownedBy.lastName} (${credential.ownedBy.email})`
					: i18n.baseText('credentialEdit.credentialSharing.info.sharee.fallback');
			},
		...credentialsEEModule.getters,
	},
	actions: {
		fetchCredentialTypes: async (context: ActionContext<ICredentialsState, IRootState>, forceFetch: boolean) => {
			if (context.getters.allCredentialTypes.length > 0 && forceFetch !== true) {
				return;
			}
			const rootStore = useRootStore();
			const credentialTypes = await getCredentialTypes(rootStore.getRestApiContext);
			context.commit('setCredentialTypes', credentialTypes);
		},
		fetchAllCredentials: async (context: ActionContext<ICredentialsState, IRootState>): Promise<ICredentialsResponse[]> => {
			const rootStore = useRootStore();
			const credentials = await getAllCredentials(rootStore.getRestApiContext);
			context.commit('setCredentials', credentials);

			return credentials;
		},
		fetchForeignCredentials: async (context: ActionContext<ICredentialsState, IRootState>): Promise<ICredentialsResponse[]> => {
			const rootStore = useRootStore();
			const credentials = await getForeignCredentials(rootStore.getRestApiContext);
			context.commit('setForeignCredentials', credentials);

			return credentials;
		},
		getCredentialData: async (context: ActionContext<ICredentialsState, IRootState>, { id }: {id: string}) => {
			const rootStore = useRootStore();
			return await getCredentialData(rootStore.getRestApiContext, id);
		},
		createNewCredential: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsDecrypted) => {
			const rootStore = useRootStore();
			const settingsStore = useSettingsStore();
			const credential = await createNewCredential(rootStore.getRestApiContext, data);

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				context.commit('upsertCredential', credential);

				if (data.ownedBy) {
					context.commit('setCredentialOwnedBy', {
						credentialId: credential.id,
						ownedBy: data.ownedBy,
					});

					const usersStore = useUsersStore();
					if (data.sharedWith && data.ownedBy.id === usersStore.currentUserId) {
						await context.dispatch('setCredentialSharedWith', {
							credentialId: credential.id,
							sharedWith: data.sharedWith,
						});
					}
				}
			} else {
				context.commit('upsertCredential', credential);
			}

			return credential;
		},
		updateCredential: async (context: ActionContext<ICredentialsState, IRootState>, params: {data: ICredentialsDecrypted, id: string}) => {
			const { id, data } = params;
			const rootStore = useRootStore();
			const settingsStore = useSettingsStore();
			const credential = await updateCredential(rootStore.getRestApiContext, id, data);

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				context.commit('upsertCredential', credential);

				if (data.ownedBy) {
					context.commit('setCredentialOwnedBy', {
						credentialId: credential.id,
						ownedBy: data.ownedBy,
					});

					const usersStore = useUsersStore();
					if (data.sharedWith && data.ownedBy.id === usersStore.currentUserId) {
						await context.dispatch('setCredentialSharedWith', {
							credentialId: credential.id,
							sharedWith: data.sharedWith,
						});
					}
				}
			} else {
				context.commit('upsertCredential', credential);
			}

			return credential;
		},
		deleteCredential: async (context: ActionContext<ICredentialsState, IRootState>, { id }: {id: string}) => {
			const rootStore = useRootStore();
			const deleted = await deleteCredential(rootStore.getRestApiContext, id);
			if (deleted) {
				context.commit('deleteCredential', id);
			}
		},
		oAuth2Authorize: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsResponse) => {
			const rootStore = useRootStore();
			return oAuth2CredentialAuthorize(rootStore.getRestApiContext, data);
		},
		oAuth1Authorize: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsResponse) => {
			const rootStore = useRootStore();
			return oAuth1CredentialAuthorize(rootStore.getRestApiContext, data);
		},
		testCredential: async (context: ActionContext<ICredentialsState, IRootState>, data: ICredentialsDecrypted): Promise<INodeCredentialTestResult> => {
			const rootStore = useRootStore();
			return testCredential(rootStore.getRestApiContext, { credentials: data });
		},
		getNewCredentialName: async (context: ActionContext<ICredentialsState, IRootState>, params: { credentialTypeName: string }) => {
			try {
				const { credentialTypeName } = params;
				let newName = DEFAULT_CREDENTIAL_NAME;
				if (!TYPES_WITH_DEFAULT_NAME.includes(credentialTypeName)) {
					const { displayName } = context.getters.getCredentialTypeByName(credentialTypeName);
					newName = getAppNameFromCredType(displayName);
					newName = newName.length > 0 ? `${newName} ${DEFAULT_CREDENTIAL_POSTFIX}` : DEFAULT_CREDENTIAL_NAME;
				}
				const rootStore = useRootStore();
				const res = await getCredentialsNewName(rootStore.getRestApiContext, newName);
				return res.name;
			} catch (e) {
				return DEFAULT_CREDENTIAL_NAME;
			}
		},
		...credentialsEEModule.actions,
	},
};

export default module;
