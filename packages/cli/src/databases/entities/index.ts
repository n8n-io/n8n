import { AnnotationTagEntity } from './annotation-tag-entity.ee';
import { AnnotationTagMapping } from './annotation-tag-mapping.ee';
import { ApiKey } from './api-key';
import { AuthIdentity } from './auth-identity';
import { AuthProviderSyncHistory } from './auth-provider-sync-history';
import { AuthUser } from './auth-user';
import { CredentialsEntity } from './credentials-entity';
import { EventDestinations } from './event-destinations';
import { ExecutionAnnotation } from './execution-annotation.ee';
import { ExecutionData } from './execution-data';
import { ExecutionEntity } from './execution-entity';
import { ExecutionMetadata } from './execution-metadata';
import { InstalledNodes } from './installed-nodes';
import { InstalledPackages } from './installed-packages';
import { InvalidAuthToken } from './invalid-auth-token';
import { Project } from './project';
import { ProjectRelation } from './project-relation';
import { Settings } from './settings';
import { SharedCredentials } from './shared-credentials';
import { SharedWorkflow } from './shared-workflow';
import { TagEntity } from './tag-entity';
import { User } from './user';
import { Variables } from './variables';
import { WebhookEntity } from './webhook-entity';
import { WorkflowEntity } from './workflow-entity';
import { WorkflowHistory } from './workflow-history';
import { WorkflowStatistics } from './workflow-statistics';
import { WorkflowTagMapping } from './workflow-tag-mapping';

export const entities = {
	AnnotationTagEntity,
	AnnotationTagMapping,
	AuthIdentity,
	AuthProviderSyncHistory,
	AuthUser,
	CredentialsEntity,
	EventDestinations,
	ExecutionAnnotation,
	ExecutionEntity,
	InstalledNodes,
	InstalledPackages,
	InvalidAuthToken,
	Settings,
	SharedCredentials,
	SharedWorkflow,
	TagEntity,
	User,
	Variables,
	WebhookEntity,
	WorkflowEntity,
	WorkflowTagMapping,
	WorkflowStatistics,
	ExecutionMetadata,
	ExecutionData,
	WorkflowHistory,
	Project,
	ProjectRelation,
	ApiKey,
};
