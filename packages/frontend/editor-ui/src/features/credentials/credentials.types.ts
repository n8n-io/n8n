import type { Iso8601DateTimeString } from '@n8n/api-types';
import type { ICredentialsDecrypted, ICredentialsEncrypted, ICredentialType } from 'n8n-workflow';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import type { Scope } from '@n8n/permissions';
import type { IUserResponse } from '@n8n/rest-api-client/api/users';

export interface ICredentialsResponse extends ICredentialsEncrypted {
	id: string;
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
	sharedWithProjects?: ProjectSharingData[];
	homeProject?: ProjectSharingData;
	currentUserHasAccess?: boolean;
	scopes?: Scope[];
	ownedBy?: Pick<IUserResponse, 'id' | 'firstName' | 'lastName' | 'email'>;
	isManaged: boolean;
}

export interface IUsedCredential {
	id: string;
	name: string;
	credentialType: string;
	currentUserHasAccess: boolean;
	homeProject?: ProjectSharingData;
	sharedWithProjects?: ProjectSharingData[];
}

export interface ICredentialsBase {
	createdAt: Iso8601DateTimeString;
	updatedAt: Iso8601DateTimeString;
}

export interface ICredentialsDecryptedResponse extends ICredentialsBase, ICredentialsDecrypted {
	id: string;
}

export interface ICredentialTypeMap {
	[name: string]: ICredentialType;
}

export interface ICredentialMap {
	[name: string]: ICredentialsResponse;
}

export interface ICredentialsState {
	credentialTypes: ICredentialTypeMap;
	credentials: ICredentialMap;
}

export interface IShareCredentialsPayload {
	shareWithIds: string[];
}
