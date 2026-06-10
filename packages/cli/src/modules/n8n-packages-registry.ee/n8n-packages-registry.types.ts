import type {
	N8nPackagesRegistryConnectionConfig,
	N8nPackagesRegistryConnectionType,
	User,
} from '@n8n/db';
import type { SourceControlledFile } from '@n8n/api-types';

export const SOURCE_CONTROL_REGISTRY_ID = 'source-control';

export type BuiltInN8nPackagesRegistryConnectionType = 'source-control';

export type N8nPackagesRegistryProviderType =
	| BuiltInN8nPackagesRegistryConnectionType
	| N8nPackagesRegistryConnectionType;

export type N8nPackagesRegistryConnection = {
	id: string;
	type: N8nPackagesRegistryProviderType;
	name: string;
	enabled: boolean;
	readonly: boolean;
	projectId?: string;
	config: N8nPackagesRegistryConnectionConfig;
	credentialId: string | null;
};

export type N8nPackagesRegistryProjectGroup = {
	project: {
		id: string | null;
		name: string;
		type: 'team' | 'personal' | 'global';
	};
	changes: SourceControlledFile[];
};

export interface InitializedN8nPackagesRegistry {
	readonly connection: N8nPackagesRegistryConnection;
	listProjects(user: User): Promise<unknown[]>;
	getImportableChangesGroupedByProject(user: User): Promise<N8nPackagesRegistryProjectGroup[]>;
	importProjectChanges(user: User, projectId: string): Promise<SourceControlledFile[]>;
}

export interface N8nPackagesRegistryProvider {
	readonly type: N8nPackagesRegistryProviderType;
	init(connection: N8nPackagesRegistryConnection): Promise<InitializedN8nPackagesRegistry>;
}
