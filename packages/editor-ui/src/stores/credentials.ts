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
import { getAppNameFromCredType } from '@/utils';
import { EnterpriseEditionFeature, STORES } from '@/constants';
import {
	ICredentialMap,
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	ICredentialsState,
	ICredentialTypeMap,
} from '@/Interface';
import { i18n } from '@/plugins/i18n';
import {
	ICredentialsDecrypted,
	ICredentialType,
	INodeCredentialTestResult,
	INodeProperties,
	INodeTypeDescription,
	IUser,
} from 'n8n-workflow';
import { defineStore } from 'pinia';
import Vue from 'vue';
import { useRootStore } from './n8nRootStore';
import { useNodeTypesStore } from './nodeTypes';
import { useSettingsStore } from './settings';
import { useUsersStore } from './users';

const DEFAULT_CREDENTIAL_NAME = 'Unnamed credential';
const DEFAULT_CREDENTIAL_POSTFIX = 'account';
const TYPES_WITH_DEFAULT_NAME = ['httpBasicAuth', 'oAuth2Api', 'httpDigestAuth', 'oAuth1Api'];

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
		getCredentialTypeByName() {
			return (type: string): ICredentialType => this.credentialTypes[type];
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
		getNodesWithAccess() {
			return (credentialTypeName: string) => {
				const nodeTypesStore = useNodeTypesStore();
				const allLatestNodeTypes: INodeTypeDescription[] = nodeTypesStore.allLatestNodeTypes;

				return allLatestNodeTypes.filter((nodeType: INodeTypeDescription) => {
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
				const credentialType = this.getCredentialTypeByName(credentialTypeName) as {
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
		getCredentialOwnerName() {
			return (credentialId: string): string => {
				const credential = this.getCredentialById(credentialId);
				return credential && credential.ownedBy && credential.ownedBy.firstName
					? `${credential.ownedBy.firstName} ${credential.ownedBy.lastName} (${credential.ownedBy.email})`
					: i18n.baseText('credentialEdit.credentialSharing.info.sharee.fallback');
			};
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
				Vue.set(this.credentials, credential.id, {
					...this.credentials[credential.id],
					...credential,
				});
			}
		},
		enableOAuthCredential(credential: ICredentialsResponse): void {
			// enable oauth event to track change between modals
		},
		async fetchCredentialTypes(forceFetch: boolean): Promise<void> {
			if (this.allCredentialTypes.length > 0 && forceFetch !== true) {
				return;
			}
			const rootStore = useRootStore();
			const credentialTypes = await getCredentialTypes(rootStore.getBaseUrl);
			this.setCredentialTypes(credentialTypes);
		},
		async fetchAllCredentials(): Promise<ICredentialsResponse[]> {
			const rootStore = useRootStore();
			const credentials = await getAllCredentials(rootStore.getRestApiContext);
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
		async createNewCredential(data: ICredentialsDecrypted): Promise<ICredentialsResponse> {
			const rootStore = useRootStore();
			const settingsStore = useSettingsStore();
			const credential = await createNewCredential(rootStore.getRestApiContext, data);

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				this.upsertCredential(credential);

				if (data.ownedBy) {
					this.setCredentialOwnedBy({
						credentialId: credential.id,
						ownedBy: data.ownedBy,
					});

					const usersStore = useUsersStore();
					if (data.sharedWith && data.ownedBy.id === usersStore.currentUserId) {
						this.setCredentialSharedWith({
							credentialId: credential.id,
							sharedWith: data.sharedWith,
						});
					}
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
			const settingsStore = useSettingsStore();
			const credential = await updateCredential(rootStore.getRestApiContext, id, data);

			if (settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				this.upsertCredential(credential);

				if (data.ownedBy) {
					this.setCredentialOwnedBy({
						credentialId: credential.id,
						ownedBy: data.ownedBy,
					});

					const usersStore = useUsersStore();
					if (data.sharedWith && data.ownedBy.id === usersStore.currentUserId) {
						this.setCredentialSharedWith({
							credentialId: credential.id,
							sharedWith: data.sharedWith,
						});
					}
				}
			} else {
				this.upsertCredential(credential);
			}

			return credential;
		},
		async deleteCredential({ id }: { id: string }) {
			const rootStore = useRootStore();
			const deleted = await deleteCredential(rootStore.getRestApiContext, id);
			if (deleted) {
				Vue.delete(this.credentials, id);
			}
		},
		async oAuth2Authorize(data: ICredentialsResponse): Promise<string> {
			const rootStore = useRootStore();
			return oAuth2CredentialAuthorize(rootStore.getRestApiContext, data);
		},
		async oAuth1Authorize(data: ICredentialsResponse): Promise<string> {
			const rootStore = useRootStore();
			return oAuth1CredentialAuthorize(rootStore.getRestApiContext, data);
		},
		async testCredential(data: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
			const rootStore = useRootStore();
			return testCredential(rootStore.getRestApiContext, { credentials: data });
		},
		async getNewCredentialName(params: { credentialTypeName: string }): Promise<string> {
			try {
				const { credentialTypeName } = params;
				let newName = DEFAULT_CREDENTIAL_NAME;
				if (!TYPES_WITH_DEFAULT_NAME.includes(credentialTypeName)) {
					const { displayName } = this.getCredentialTypeByName(credentialTypeName);
					newName = getAppNameFromCredType(displayName);
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

		// Enterprise edition actions
		setCredentialOwnedBy(payload: { credentialId: string; ownedBy: Partial<IUser> }) {
			Vue.set(this.credentials[payload.credentialId], 'ownedBy', payload.ownedBy);
		},
		async setCredentialSharedWith(payload: { sharedWith: IUser[]; credentialId: string }) {
			if (useSettingsStore().isEnterpriseFeatureEnabled(EnterpriseEditionFeature.Sharing)) {
				await setCredentialSharedWith(useRootStore().getRestApiContext, payload.credentialId, {
					shareWithIds: payload.sharedWith.map((sharee) => sharee.id),
				});
				Vue.set(this.credentials[payload.credentialId], 'sharedWith', payload.sharedWith);
			}
		},
		addCredentialSharee(payload: { credentialId: string; sharee: Partial<IUser> }): void {
			Vue.set(
				this.credentials[payload.credentialId],
				'sharedWith',
				(this.credentials[payload.credentialId].sharedWith || []).concat([payload.sharee]),
			);
		},
		removeCredentialSharee(payload: { credentialId: string; sharee: Partial<IUser> }): void {
			Vue.set(
				this.credentials[payload.credentialId],
				'sharedWith',
				(this.credentials[payload.credentialId].sharedWith || []).filter(
					(sharee) => sharee.id !== payload.sharee.id,
				),
			);
		},
	},
});
