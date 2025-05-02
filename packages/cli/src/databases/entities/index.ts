import {
	EventDestinations,
	InstalledNodes,
	InstalledPackages,
	InvalidAuthToken,
	ProcessedData,
	Settings,
	Variables,
	WebhookEntity,
	AuthIdentity,
	User,
	WorkflowEntity,
	CredentialsEntity,
	ApiKey,
	Folder,
	FolderTagMapping,
	Project,
	ProjectRelation,
	SharedCredentials,
	SharedWorkflow,
	TagEntity,
	WorkflowStatistics,
	WorkflowTagMapping,
} from '@n8n/db';

import { AnnotationTagEntity } from './annotation-tag-entity.ee';
import { AnnotationTagMapping } from './annotation-tag-mapping.ee';
import { AuthProviderSyncHistory } from './auth-provider-sync-history';
import { AuthUser } from './auth-user';
import { ExecutionAnnotation } from './execution-annotation.ee';
import { ExecutionData } from './execution-data';
import { ExecutionEntity } from './execution-entity';
import { ExecutionMetadata } from './execution-metadata';
import { TestCaseExecution } from './test-case-execution.ee';
import { TestDefinition } from './test-definition.ee';
import { TestMetric } from './test-metric.ee';
import { TestRun } from './test-run.ee';
import { WorkflowHistory } from './workflow-history';
import { InsightsByPeriod } from '../../modules/insights/database/entities/insights-by-period';
import { InsightsMetadata } from '../../modules/insights/database/entities/insights-metadata';
import { InsightsRaw } from '../../modules/insights/database/entities/insights-raw';

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
