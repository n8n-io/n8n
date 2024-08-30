import { AuthIdentity } from './auth-identity';
import { AuthProviderSyncHistory } from './auth-provider-sync-history';
import { AuthUser } from './auth-user';
import { CredentialsEntity } from './credentials-entity';
import { EventDestinations } from './event-destinations';
import { ExecutionEntity } from './execution-entity';
import { InstalledNodes } from './installed-nodes';
import { InstalledPackages } from './installed-packages';
import { Settings } from './settings';
import { SharedCredentials } from './shared-credentials';
import { SharedWorkflow } from './shared-workflow';
import { TagEntity } from './tag-entity';
import { User } from './user';
import { Variables } from './variables';
import { WebhookEntity } from './webhook-entity';
import { WorkflowEntity } from './workflow-entity';
import { WorkflowTagMapping } from './workflow-tag-mapping';
import { WorkflowStatistics } from './workflow-statistics';
import { ExecutionMetadata } from './execution-metadata';
import { ExecutionData } from './execution-data';
import { WorkflowHistory } from './workflow-history';
import { Project } from './project';
import { ProjectRelation } from './project-relation';
import { InvalidAuthToken } from './invalid-auth-token';
import { AnnotationTagEntity } from './annotation-tag-entity';
import { AnnotationTagMapping } from './annotation-tag-mapping';
import { ExecutionAnnotation } from './execution-annotation';

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
};
