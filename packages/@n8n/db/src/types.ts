import type { ITagBase, IExecutionBase } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import type { QueryRunner, ObjectLiteral } from '@n8n/typeorm';
import type { Logger } from 'n8n-core';
import type {
	DeduplicationItemTypes,
	DeduplicationMode,
	IRunExecutionData,
	IUser,
	IWorkflowBase,
} from 'n8n-workflow';

import type { createSchemaBuilder } from './dsl';
import type { CredentialsEntity } from './entities/credentials-entity';
import type { Folder } from './entities/folder';
import type { Project } from './entities/project';
import type { SharedCredentials } from './entities/shared-credentials';
import type { SharedWorkflow } from './entities/shared-workflow';
import type { TagEntity } from './entities/tag-entity';
import type { User } from './entities/user';
import type { WorkflowEntity } from './entities/workflow-entity';

export type DatabaseType = 'mariadb' | 'postgresdb' | 'mysqldb' | 'sqlite';

export interface MigrationContext {
	logger: Logger;
	queryRunner: QueryRunner;
	tablePrefix: string;
	dbType: DatabaseType;
	isMysql: boolean;
	isSqlite: boolean;
	isPostgres: boolean;
	dbName: string;
	migrationName: string;
	// nodeTypes: INodeTypes; // @TODO: Restore
	schemaBuilder: ReturnType<typeof createSchemaBuilder>;
	loadSurveyFromDisk(): string | null;
	parseJson<T>(data: string | T): T;
	escape: {
		columnName(name: string): string;
		tableName(name: string): string;
		indexName(name: string): string;
	};
	runQuery<T>(sql: string, namedParameters?: ObjectLiteral): Promise<T>;
	runInBatches<T>(
		query: string,
		operation: (results: T[]) => Promise<void>,
		limit?: number,
	): Promise<void>;
	copyTable(fromTable: string, toTable: string): Promise<void>;
	copyTable(
		fromTable: string,
		toTable: string,
		fromFields?: string[],
		toFields?: string[],
		batchSize?: number,
	): Promise<void>;
}

export type MigrationFn = (ctx: MigrationContext) => Promise<void>;

export interface BaseMigration {
	up: MigrationFn;
	down?: MigrationFn;
	transaction?: false;
}

export interface ReversibleMigration extends BaseMigration {
	down: MigrationFn;
}

export interface IrreversibleMigration extends BaseMigration {
	down?: never;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface Migration extends Function {
	prototype: ReversibleMigration | IrreversibleMigration;
}

export type InsertResult = Array<{ insertId: number }>;

export { QueryFailedError } from '@n8n/typeorm/error/QueryFailedError';

/**
 * Below were moved here from `cli`
 */

export type WorkflowSharingRole = 'workflow:owner' | 'workflow:editor';

export type CredentialSharingRole = 'credential:owner' | 'credential:user';

export interface ICredentialsEncrypted {
	id?: string;
	name: string;
	type: string;
	data?: string;
}

export interface ICredentialsBase {
	createdAt: Date;
	updatedAt: Date;
}

export interface ICredentialsDb extends ICredentialsBase, ICredentialsEncrypted {
	id: string;
	name: string;
	shared?: SharedCredentials[];
}

export interface IProcessedDataLatest {
	mode: DeduplicationMode;
	data: DeduplicationItemTypes;
}

export interface IProcessedDataEntries {
	mode: DeduplicationMode;
	data: DeduplicationItemTypes[];
}

export interface IPersonalizationSurveyAnswers {
	email: string | null;
	codingSkill: string | null;
	companyIndustry: string[];
	companySize: string | null;
	otherCompanyIndustry: string | null;
	otherWorkArea: string | null;
	workArea: string[] | string | null;
}

// Almost identical to editor-ui.Interfaces.ts
export interface IWorkflowDb extends IWorkflowBase {
	triggerCount: number;
	tags?: TagEntity[];
	parentFolder?: Folder | null;
}

export interface IExecutionResponse extends IExecutionBase {
	id: string;
	data: IRunExecutionData;
	retryOf?: string;
	retrySuccessId?: string;
	workflowData: IWorkflowBase | WorkflowWithSharingsAndCredentials;
	customData: Record<string, string>;
	annotation: {
		tags: ITagBase[];
	};
}

export interface WorkflowWithSharingsAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	homeProject?: SlimProject;
	sharedWithProjects?: SlimProject[];
	usedCredentials?: CredentialUsedByWorkflow[];
	shared?: SharedWorkflow[];
}

export interface WorkflowWithSharingsMetaDataAndCredentials extends Omit<WorkflowEntity, 'shared'> {
	homeProject?: SlimProject | null;
	sharedWithProjects: SlimProject[];
	usedCredentials?: CredentialUsedByWorkflow[];
}

export interface CredentialUsedByWorkflow {
	id: string;
	name: string;
	type?: string;
	currentUserHasAccess: boolean;
	homeProject: SlimProject | null;
	sharedWithProjects: SlimProject[];
}

export type SlimProject = Pick<Project, 'id' | 'type' | 'name' | 'icon'>;

export type UserSettings = Pick<User, 'id' | 'settings'>;

/**
 * Slim workflow returned from a list query operation.
 */
export namespace ListQueryWorkflow {
	type OptionalBaseFields = 'name' | 'active' | 'versionId' | 'createdAt' | 'updatedAt' | 'tags';

	type BaseFields = Pick<WorkflowEntity, 'id'> & Partial<Pick<WorkflowEntity, OptionalBaseFields>>;

	type SharedField = Partial<Pick<WorkflowEntity, 'shared'>>;

	type SortingField = 'createdAt' | 'updatedAt' | 'name';

	export type SortOrder = `${SortingField}:asc` | `${SortingField}:desc`;

	type OwnedByField = { ownedBy: SlimUser | null; homeProject: SlimProject | null };

	export type Plain = BaseFields;

	export type WithSharing = BaseFields & SharedField;

	export type WithOwnership = BaseFields & OwnedByField;

	type SharedWithField = { sharedWith: SlimUser[]; sharedWithProjects: SlimProject[] };

	export type WithOwnedByAndSharedWith = BaseFields & OwnedByField & SharedWithField & SharedField;

	export type WithScopes = BaseFields & ScopesField & SharedField;
}

export namespace ListQueryCredentials {
	type OwnedByField = { homeProject: SlimProject | null };

	type SharedField = Partial<Pick<CredentialsEntity, 'shared'>>;

	type SharedWithField = { sharedWithProjects: SlimProject[] };

	export type WithSharing = CredentialsEntity & SharedField;

	export type WithOwnedByAndSharedWith = CredentialsEntity &
		OwnedByField &
		SharedWithField &
		SharedField;

	export type WithScopes = CredentialsEntity & ScopesField & SharedField;
}

export type ScopesField = { scopes: Scope[] };

type SlimUser = Pick<IUser, 'id' | 'email' | 'firstName' | 'lastName'>;

export type RunningMode = 'dry' | 'live';
export type SyncStatus = 'success' | 'error';

export type AuthProviderType = 'ldap' | 'email' | 'saml'; // | 'google';

export type WorkflowFolderUnionFull = (
	| ListQueryWorkflow.Plain
	| ListQueryWorkflow.WithSharing
	| FolderWithWorkflowAndSubFolderCount
) & {
	resource: ResourceType;
};

export type ResourceType = 'folder' | 'workflow';

export type FolderWithWorkflowAndSubFolderCount = Folder & {
	workflowCount: boolean;
	subFolderCount: number;
};

export const enum StatisticsNames {
	productionSuccess = 'production_success',
	productionError = 'production_error',
	manualSuccess = 'manual_success',
	manualError = 'manual_error',
	dataLoaded = 'data_loaded',
}
