import { getCredentialTypes, getCredentialsNewName, getAllCredentials, deleteCredential } from '@/api/credentials';
import Vue from 'vue';
import { ActionContext, Module } from 'vuex';
import { ICredentialType, INodeTypeDescription } from '../../../workflow/dist/src';
import {
	ICredentialMap,
	ICredentialsResponse,
	ICredentialsState,
	ICredentialTypeMap,
	IRootState,
} from '../Interface';

const DEFAULT_CREDENTIAL_NAME = 'Unnamed credential';
const DEFAULT_CREDENTIAL_POSTFIX = 'account';
const TYPES_WITH_DEFAULT_NAME = ['httpBasicAuth', 'oAuth2Api', 'httpDigestAuth', 'oAuth1Api'];
const KEYWORDS_TO_FILTER = ['API', 'OAuth1', 'OAuth2'];

const module: Module<ICredentialsState, IRootState> = {
	namespaced: true,
	state: {
		credentialTypes: {},
		credentials: {},
	},
	mutations: {
		setCredentialTypes: (state: ICredentialsState, credentialTypes: ICredentialType[]) => {
			state.credentialTypes = credentialTypes.reduce((accu: ICredentialTypeMap, cred: ICredentialType) => {
				accu[cred.name] = cred;

				if (cred.documentationUrl !== undefined) {
					if (!cred.documentationUrl.startsWith('http')) {
						cred.documentationUrl = 'https://docs.n8n.io/credentials/' + cred.documentationUrl + '/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal';
					}
				}

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
		deleteCredential(state: ICredentialsState, id: string) {
			Vue.delete(state.credentials, id);
		},
	},
	getters: {
		allCredentialTypes(state: ICredentialsState): ICredentialType[] {
			return Object.values(state.credentialTypes)
				.sort((a, b) => a.displayName.localeCompare(b.displayName));
		},
		allCredentials(state: ICredentialsState): ICredentialsResponse[] {
			return Object.values(state.credentials)
				.sort((a, b) => a.name.localeCompare(b.name));
		},
		getCredentialTypeByName: (state: ICredentialsState) => {
			return (type: string) => state.credentialTypes[type];
		},
		getCredentialById: (state: ICredentialsState) => {
			return (id: string) => state.credentials[id];
		},
		getNodesWithAccess (state: ICredentialsState, getters: any, rootState: IRootState, rootGetters: any) { // tslint:disable-line:no-any
			return (credentialTypeName: string): INodeTypeDescription[] => {
				const nodeTypes: INodeTypeDescription[] = rootGetters.allNodeTypes;

				return nodeTypes.filter((nodeType: INodeTypeDescription) => {
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
	},
	actions: {
		fetchCredentialTypes: async (context: ActionContext<ICredentialsState, IRootState>) => {
			const credentialTypes = await getCredentialTypes(context.rootGetters.getRestApiContext);
			context.commit('setCredentialTypes', credentialTypes);
		},
		fetchAllCredentials: async (context: ActionContext<ICredentialsState, IRootState>) => {
			const credentials = await getAllCredentials(context.rootGetters.getRestApiContext);
			context.commit('setCredentials', credentials);
		},
		deleteCredential: async (context: ActionContext<ICredentialsState, IRootState>, params: {id: string}) => {
			const { id } = params;
			const deleted = await deleteCredential(context.rootGetters.getRestApiContext, id);
			if (deleted) {
				context.commit('deleteCredential', id);
			}
		},
		getNewCredentialName: async (context: ActionContext<ICredentialsState, IRootState>, params: { credentialTypeName: string }) => {
			const { credentialTypeName } = params;

			if (TYPES_WITH_DEFAULT_NAME.includes(credentialTypeName)) {
				return DEFAULT_CREDENTIAL_NAME;
			}

			const { displayName } = context.getters.getCredentialTypeByName(credentialTypeName);
			let newName = displayName.split(' ').filter((word: string) => !KEYWORDS_TO_FILTER.includes(word)).join(' ');
			newName = newName.length > 0 ? `${newName} ${DEFAULT_CREDENTIAL_POSTFIX}` : DEFAULT_CREDENTIAL_NAME;

			try {
				const res = await getCredentialsNewName(context.rootGetters.getRestApiContext, newName);
				newName = res.name;
			} catch (e) {
				newName = DEFAULT_CREDENTIAL_NAME;
			}

			return newName;
		},
	},
};

export default module;
