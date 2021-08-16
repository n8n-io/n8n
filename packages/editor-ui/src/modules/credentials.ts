import { getCredentials, getCredentialsNewName } from '@/api/credentials';
import { ActionContext, Module } from 'vuex';
import { ICredentialType, INodeTypeDescription } from '../../../workflow/dist/src';
import {
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
	},
	mutations: {
		setCredentialTypes: (state: ICredentialsState, credentials: ICredentialType[]) => {
			state.credentialTypes = credentials.reduce((accu: ICredentialTypeMap, cred: ICredentialType) => {
				accu[cred.name] = cred;

				if (cred.documentationUrl !== undefined) {
					if (!cred.documentationUrl.startsWith('http')) {
						cred.documentationUrl = 'https://docs.n8n.io/credentials/' + cred.documentationUrl + '/?utm_source=n8n_app&utm_medium=left_nav_menu&utm_campaign=create_new_credentials_modal';
					}
				}

				return accu;
			}, {});
		},
	},
	getters: {
		allCredentials(state: ICredentialsState): ICredentialType[] {
			return Object.values(state.credentialTypes)
				.sort((a, b) => a.displayName.localeCompare(b.displayName));
		},
		getCredentialTypeByName: (state: ICredentialsState) => {
			return (type: string) => state.credentialTypes[type];
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
			const credentialTypes = await getCredentials(context.rootGetters.getRestApiContext);
			context.commit('setCredentialTypes', credentialTypes);
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
