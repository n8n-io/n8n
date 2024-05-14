import type {
	INodeUi,
	IUsedCredential,
	ICredentialMap,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	ICredentialsState,
	ICredentialTypeMap,
} from '@/Interface';
import {
	createNewCredential,
	deleteCredential,
	getAllCredentials,
	getCredentialData,
	getCredentialsNewName,
	getCredentialTypes,
	oAuth1CredentialAuthorize,
	oAuth2CredentialAuthorize,
	testCredential,
	updateCredential,
} from '@/api/credentials';
import { setCredentialSharedWith } from '@/api/credentials.ee';
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
import { useRootStore } from './n8nRoot.store';
import { useNodeTypesStore } from './nodeTypes.store';
import { useSettingsStore } from './settings.store';
import { isEmpty } from '@/utils/typesUtils';
import type { ProjectSharingData } from '@/features/projects/projects.types';
import { splitName } from '@/features/projects/projects.utils';

const DEFAULT_CREDENTIAL_NAME = 'Unnamed credential';
const DEFAULT_CREDENTIAL_POSTFIX = 'account';
const TYPES_WITH_DEFAULT_NAME = ['httpBasicAuth', 'oAuth2Api', 'httpDigestAuth', 'oAuth1Api'];

export type CredentialsStore = ReturnType<typeof useCredentialsStore>;

export const useCredentialsStore = defineStore(STORES.CREDENTIALS, {
	state: (): ICredentialsState => ({
		credentialTypes: {},
		credentials: {},
	}),
	getters: {
		credentialTypesById(): Record<ICredentialType['name'], ICredentialType> {
			return this.credentialTypes;
		},
		allCredentialTypes(): ICredentialType[] {
			return Object.values(this.credentialTypes).sort((a, b) =>
				a.displayName.localeCompare(b.displayName),
			);
		},
		allCredentials(): ICredentialsResponse[] {
			return Object.values(this.credentials).sort((a, b) => a.name.localeCompare(b.name));
		},
		allCredentialsByType(): { [type: string]: ICredentialsResponse[] } {
			const credentials = this.allCredentials;
			const types = this.allCredentialTypes;

			return types.reduce(
				(accu: { [type: string]: ICredentialsResponse[] }, type: ICredentialType) => {
					accu[type.name] = credentials.filter(
						(cred: ICredentialsResponse) => cred.type === type.name,
					);

					return accu;
				},
				{},
			);
		},
		allUsableCredentialsForNode() {
			return (node: INodeUi): ICredentialsResponse[] => {
				let credentials: ICredentialsResponse[] = [];
				const nodeType = useNodeTypesStore().getNodeType(node.type, node.typeVersion);
				if (nodeType?.credentials) {
					nodeType.credentials.forEach((cred) => {
						credentials = credentials.concat(this.allUsableCredentialsByType[cred.name]);
					});
				}
				return credentials.sort((a, b) => {
					const aDate = new Date(a.updatedAt);
					const bDate = new Date(b.updatedAt);
					return aDate.getTime() - bDate.getTime();
				});
			};
		},
		allUsableCredentialsByType(): { [type: string]: ICredentialsResponse[] } {
			const credentials = this.allCredentials;
			const types = this.allCredentialTypes;

			return types.reduce(
				(accu: { [type: string]: ICredentialsResponse[] }, type: ICredentialType) => {
					accu[type.name] = credentials.filter((cred: ICredentialsResponse) => {
						return cred.type === type.name;
					});

					return accu;
				},
				{},
			);
		},
		getCredentialTypeByName() {
			return (type: string): ICredentialType | undefined => this.credentialTypes[type];
		},
		getCredentialById() {
			return (id: string): ICredentialsResponse => this.credentials[id];
		},
		getCredentialByIdAndType() {
			return (id: string, type: string): ICredentialsResponse | undefined => {
				const credential = this.credentials[id];
				return !credential || credential.type !== type ? undefined : credential;
			};
		},
		getCredentialsByType() {
			return (credentialType: string): ICredentialsResponse[] => {
				return this.allCredentialsByType[credentialType] || [];
			};
		},
		getUsableCredentialByType() {
			return (credentialType: string): ICredentialsResponse[] => {
				return this.allUsableCredentialsByType[credentialType] || [];
			};
		},
		getNodesWithAccess() {
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
		},
		getScopesByCredentialType() {
			return (credentialTypeName: string) => {
				const credentialType = this.getCredentialTypeByName(credentialTypeName);
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
		},
		getCredentialOwnerName() {
			return (credential: ICredentialsResponse | IUsedCredential | undefined): string => {
				const { firstName, lastName, email } = splitName(credential?.homeProject?.name ?? '');

				return credential?.homeProject?.name
					? `${firstName} ${lastName} (${email})`
					: i18n.baseText('credentialEdit.credentialSharing.info.sharee.fallback');
			};
		},
		getCredentialOwnerNameById() {
			return (credentialId: string): string => {
				const credential = this.getCredentialById(credentialId);

				return this.getCredentialOwnerName(credential);
			};
		},
		httpOnlyCredentialTypes(): ICredentialType[] {
			return this.allCredentialTypes.filter((credentialType) => credentialType.httpRequestNode);
		},
	},
	actions: {
		setCredentialTypes(credentialTypes: ICredentialType[]): void {
			this.credentialTypes = credentialTypes.reduce(
				(accu: ICredentialTypeMap, cred: ICredentialType) => {
					accu[cred.name] = cred;

					return accu;
				},
				{},
			);
		},
		setCredentials(credentials: ICredentialsResponse[]): void {
			this.credentials = credentials.reduce((accu: ICredentialMap, cred: ICredentialsResponse) => {
				if (cred.id) {
					accu[cred.id] = cred;
				}
				return accu;
			}, {});
		},
		addCredentials(credentials: ICredentialsResponse[]): void {
			credentials.forEach((cred: ICredentialsResponse) => {
				if (cred.id) {
					this.credentials[cred.id] = { ...this.credentials[cred.id], ...cred };
				}
			});
		},
		upsertCredential(credential: ICredentialsResponse): void {
			if (credential.id) {
				this.credentials = {
					...this.credentials,
					[credential.id]: {
						...this.credentials[credential.id],
						...credential,
					},
				};
			}
		},
		enableOAuthCredential(credential: ICredentialsResponse): void {
			// enable oauth event to track change between modals
		},
		async fetchCredentialTypes(forceFetch: boolean): Promise<void> {
			if (this.allCredentialTypes.length > 0 && !forceFetch) {
				return;
			}
			const rootStore = useRootStore();
			const credentialTypes = await getCredentialTypes(rootStore.getBaseUrl);
			this.setCredentialTypes(credentialTypes);
		},
		async fetchAllCredentials(projectId?: string): Promise<ICredentialsResponse[]> {
			const rootStore = useRootStore();

			const filter = {
				projectId,
			};

			const credentials = await getAllCredentials(
				rootStore.getRestApiContext,
				isEmpty(filter) ? undefined : filter,
			);
			this.setCredentials(credentials);
			return credentials;
		},
		async getCredentialData({
			id,
		}: {
			id: string;
		}): Promise<ICredentialsResponse | ICredentialsDecryptedResponse | undefined> {
			const rootStore = useRootStore();
			return await getCredentialData(rootStore.getRestApiContext, id);
		},
		async createNewCredential(
			data: ICredentialsDecrypted,
			projectId?: string,
		): Promise<ICredentialsResponse> {
			const rootStore = useRootStore();
			const settingsStore = useSettingsStore();
			const credential = await createNewCredential(rootStore.getRestApiContext, data, projectId);

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				this.upsertCredential(credential);
				if (data.sharedWithProjects) {
					await this.setCredentialSharedWith({
						credentialId: credential.id,
						sharedWithProjects: data.sharedWithProjects,
					});
				}
			} else {
				this.upsertCredential(credential);
			}
			return credential;
		},
		async updateCredential(params: {
			data: ICredentialsDecrypted;
			id: string;
		}): Promise<ICredentialsResponse> {
			const { id, data } = params;
			const rootStore = useRootStore();
			const credential = await updateCredential(rootStore.getRestApiContext, id, data);

			this.upsertCredential(credential);

			return credential;
		},
		async deleteCredential({ id }: { id: string }) {
			const rootStore = useRootStore();
			const deleted = await deleteCredential(rootStore.getRestApiContext, id);
			if (deleted) {
				const { [id]: deletedCredential, ...rest } = this.credentials;
				this.credentials = rest;
			}
		},
		async oAuth2Authorize(data: ICredentialsResponse): Promise<string> {
			const rootStore = useRootStore();
			return await oAuth2CredentialAuthorize(rootStore.getRestApiContext, data);
		},
		async oAuth1Authorize(data: ICredentialsResponse): Promise<string> {
			const rootStore = useRootStore();
			return await oAuth1CredentialAuthorize(rootStore.getRestApiContext, data);
		},
		async testCredential(data: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
			const rootStore = useRootStore();
			return await testCredential(rootStore.getRestApiContext, { credentials: data });
		},
		async getNewCredentialName(params: { credentialTypeName: string }): Promise<string> {
			try {
				const { credentialTypeName } = params;
				let newName = DEFAULT_CREDENTIAL_NAME;
				if (!TYPES_WITH_DEFAULT_NAME.includes(credentialTypeName)) {
					const cred = this.getCredentialTypeByName(credentialTypeName);
					newName = cred ? getAppNameFromCredType(cred.displayName) : '';
					newName =
						newName.length > 0
							? `${newName} ${DEFAULT_CREDENTIAL_POSTFIX}`
							: DEFAULT_CREDENTIAL_NAME;
				}
				const rootStore = useRootStore();
				const res = await getCredentialsNewName(rootStore.getRestApiContext, newName);
				return res.name;
			} catch (e) {
				return DEFAULT_CREDENTIAL_NAME;
			}
		},
		async setCredentialSharedWith(payload: {
			sharedWithProjects: ProjectSharingData[];
			credentialId: string;
		}): Promise<ICredentialsResponse> {
			if (useSettingsStore().isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				await setCredentialSharedWith(useRootStore().getRestApiContext, payload.credentialId, {
					shareWithIds: payload.sharedWithProjects.map((project) => project.id),
				});

				this.credentials[payload.credentialId] = {
					...this.credentials[payload.credentialId],
					sharedWithProjects: payload.sharedWithProjects,
				};
			}
			return this.credentials[payload.credentialId];
		},

		async getCredentialTranslation(credentialType: string): Promise<object> {
			const rootStore = useRootStore();
			return await makeRestApiRequest(
				rootStore.getRestApiContext,
				'GET',
				'/credential-translation',
				{
					credentialType,
				},
			);
		},
	},
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
					const createdCredential = returnValue as ICredentialsResponse;
					onCredentialCreated?.(createdCredential);
					break;

				case 'updateCredential':
					const updatedCredential = returnValue as ICredentialsResponse;
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
