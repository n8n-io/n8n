import { AiBuilderTemporaryWorkflow } from './ai-builder-temporary-workflow';
import { AnnotationTagEntity } from './annotation-tag-entity.ee';
import { AnnotationTagMapping } from './annotation-tag-mapping.ee';
import { ApiKey } from './api-key';
import { AuthIdentity } from './auth-identity';
import { AuthProviderSyncHistory } from './auth-provider-sync-history';
import { BinaryDataFile, SourceTypeSchema, type SourceType } from './binary-data-file';
import {
	CredentialDependency,
	type CredentialDependencyType,
} from './credential-dependency-entity';
import { CredentialsEntity } from './credentials-entity';
import { DeploymentKey } from './deployment-key';
import { ExecutionAnnotation } from './execution-annotation.ee';
import { ExecutionData } from './execution-data';
import { ExecutionEntity } from './execution-entity';
import type { ExecutionDataStorageLocation } from './execution-entity';
import { ExecutionMetadata } from './execution-metadata';
import { Folder } from './folder';
import { FolderTagMapping } from './folder-tag-mapping';
import { InvalidAuthToken } from './invalid-auth-token';
import { NodeAccessRequest, type RequestStatus } from './node-access-request';
import { NodeCategory } from './node-category';
import { NodeCategoryAssignment } from './node-category-assignment';
import {
	NodeGovernancePolicy,
	type PolicyType,
	type PolicyScope,
	type TargetType,
} from './node-governance-policy';
import { PolicyProjectAssignment } from './policy-project-assignment';
import { ProcessedData } from './processed-data';
import { Project, type GovernanceDefaultBehavior } from './project';
import { ProjectRelation } from './project-relation';
import { ProjectSecretsProviderAccess } from './project-secrets-provider-access';
import type { SecretsProviderAccessRole } from './project-secrets-provider-access';
import { Role } from './role';
import { RoleMappingRule } from './role-mapping-rule';
import { Scope } from './scope';
import { SecretsProviderConnection } from './secrets-provider-connection';
import { Settings } from './settings';
import { SharedCredentials } from './shared-credentials';
import { SharedWorkflow } from './shared-workflow';
import { TagEntity } from './tag-entity';
import { TestCaseExecution } from './test-case-execution.ee';
import { TestRun } from './test-run.ee';
import { User } from './user';
import { Variables } from './variables';
import { WebhookEntity } from './webhook-entity';
import { WorkflowDependency } from './workflow-dependency-entity';
import { WorkflowEntity } from './workflow-entity';
import { WorkflowHistory } from './workflow-history';
import { WorkflowPublishHistory } from './workflow-publish-history';
import { WorkflowPublishedVersion } from './workflow-published-version';
import { WorkflowStatistics } from './workflow-statistics';
import { WorkflowTagMapping } from './workflow-tag-mapping';

export {
	InvalidAuthToken,
	AiBuilderTemporaryWorkflow,
	ProcessedData,
	Settings,
	Variables,
	ApiKey,
	BinaryDataFile,
	SourceTypeSchema,
	type SourceType,
	type ExecutionDataStorageLocation,
	WebhookEntity,
	AuthIdentity,
	CredentialsEntity,
	CredentialDependency,
	type CredentialDependencyType,
	DeploymentKey,
	Folder,
	Project,
	type GovernanceDefaultBehavior,
	ProjectRelation,
	RoleMappingRule,
	Role,
	Scope,
	SharedCredentials,
	SharedWorkflow,
	TagEntity,
	User,
	WorkflowDependency,
	WorkflowEntity,
	WorkflowStatistics,
	WorkflowTagMapping,
	FolderTagMapping,
	AuthProviderSyncHistory,
	WorkflowHistory,
	WorkflowPublishedVersion,
	WorkflowPublishHistory,
	ExecutionData,
	ExecutionMetadata,
	AnnotationTagEntity,
	ExecutionAnnotation,
	AnnotationTagMapping,
	TestRun,
	TestCaseExecution,
	ExecutionEntity,
	ProjectSecretsProviderAccess,
	type SecretsProviderAccessRole,
	SecretsProviderConnection,
	// Node Governance entities
	NodeGovernancePolicy,
	type PolicyType,
	type PolicyScope,
	type TargetType,
	PolicyProjectAssignment,
	NodeCategory,
	NodeCategoryAssignment,
	NodeAccessRequest,
	type RequestStatus,
};

export const entities = {
	InvalidAuthToken,
	AiBuilderTemporaryWorkflow,
	ProcessedData,
	Settings,
	Variables,
	ApiKey,
	BinaryDataFile,
	WebhookEntity,
	AuthIdentity,
	CredentialsEntity,
	CredentialDependency,
	DeploymentKey,
	Folder,
	Project,
	ProjectRelation,
	RoleMappingRule,
	Scope,
	SharedCredentials,
	SharedWorkflow,
	TagEntity,
	User,
	WorkflowDependency,
	WorkflowEntity,
	WorkflowStatistics,
	WorkflowTagMapping,
	FolderTagMapping,
	AuthProviderSyncHistory,
	WorkflowHistory,
	WorkflowPublishedVersion,
	WorkflowPublishHistory,
	ExecutionData,
	ExecutionMetadata,
	AnnotationTagEntity,
	ExecutionAnnotation,
	AnnotationTagMapping,
	TestRun,
	TestCaseExecution,
	ExecutionEntity,
	Role,
	ProjectSecretsProviderAccess,
	SecretsProviderConnection,
	// Node Governance entities
	NodeGovernancePolicy,
	PolicyProjectAssignment,
	NodeCategory,
	NodeCategoryAssignment,
	NodeAccessRequest,
};
