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
import { Folder } from './folder';
import { FolderTagMapping } from './folder-tag-mapping';
import { InstalledNodes } from './installed-nodes';
import { InstalledPackages } from './installed-packages';
import { InvalidAuthToken } from './invalid-auth-token';
import { ProcessedData } from './processed-data';
import { Project } from './project';
import { ProjectRelation } from './project-relation';
import { Settings } from './settings';
import { SharedCredentials } from './shared-credentials';
import { SharedWorkflow } from './shared-workflow';
import { TagEntity } from './tag-entity';
import { TestCaseExecution } from './test-case-execution.ee';
import { TestDefinition } from './test-definition.ee';
import { TestMetric } from './test-metric.ee';
import { TestRun } from './test-run.ee';
import { User } from './user';
import { Variables } from './variables';
import { WebhookEntity } from './webhook-entity';
import { WorkflowEntity } from './workflow-entity';
import { WorkflowHistory } from './workflow-history';
import { WorkflowStatistics } from './workflow-statistics';
import { WorkflowTagMapping } from './workflow-tag-mapping';
import { InsightsByPeriod } from '../../modules/insights/entities/insights-by-period';
import { InsightsMetadata } from '../../modules/insights/entities/insights-metadata';
import { InsightsRaw } from '../../modules/insights/entities/insights-raw';

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
	ProcessedData,
	TestDefinition,
	TestMetric,
	TestRun,
	TestCaseExecution,
	Folder,
	FolderTagMapping,
	InsightsRaw,
	InsightsMetadata,
	InsightsByPeriod,
};
