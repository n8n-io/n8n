import { AnnotationTagMappingRepository } from './annotation-tag-mapping.repository.ee';
import { AnnotationTagRepository } from './annotation-tag.repository.ee';
import { ApiKeyRepository } from './api-key.repository';
import { AuthIdentityRepository } from './auth-identity.repository';
import { AuthProviderSyncHistoryRepository } from './auth-provider-sync-history.repository';
import { AuthUserRepository } from './auth-user.repository';
import { CredentialsRepository } from './credentials.repository';
import { EventDestinationsRepository } from './event-destinations.repository';
import { ExecutionAnnotationRepository } from './execution-annotation.repository';
import { ExecutionDataRepository } from './execution-data.repository';
import { ExecutionMetadataRepository } from './execution-metadata.repository';
import { ExecutionRepository } from './execution.repository';
import { FolderTagMappingRepository } from './folder-tag-mapping.repository';
import { FolderRepository } from './folder.repository';
import { InstalledNodesRepository } from './installed-nodes.repository';
import { InstalledPackagesRepository } from './installed-packages.repository';
import { InvalidAuthTokenRepository } from './invalid-auth-token.repository';
import { LicenseMetricsRepository } from './license-metrics.repository';
import { ProcessedDataRepository } from './processed-data.repository';
import { ProjectRelationRepository } from './project-relation.repository';
import { ProjectRepository } from './project.repository';
import { SettingsRepository } from './settings.repository';
import { SharedCredentialsRepository } from './shared-credentials.repository';
import { SharedWorkflowRepository } from './shared-workflow.repository';
import { TagRepository } from './tag.repository';
import { TestCaseExecutionRepository } from './test-case-execution.repository.ee';
import { TestDefinitionRepository } from './test-definition.repository.ee';
import { TestMetricRepository } from './test-metric.repository.ee';
import { TestRunRepository } from './test-run.repository.ee';
import { UserRepository } from './user.repository';
import { VariablesRepository } from './variables.repository';
import { WebhookRepository } from './webhook.repository';
import { WorkflowHistoryRepository } from './workflow-history.repository';
import { WorkflowStatisticsRepository } from './workflow-statistics.repository';
import { WorkflowTagMappingRepository } from './workflow-tag-mapping.repository';
import { WorkflowRepository } from './workflow.repository';

export {
	AnnotationTagMappingRepository,
	AnnotationTagRepository,
	ApiKeyRepository,
	AuthIdentityRepository,
	AuthProviderSyncHistoryRepository,
	AuthUserRepository,
	CredentialsRepository,
	ExecutionRepository,
	ExecutionAnnotationRepository,
	ExecutionDataRepository,
	ExecutionMetadataRepository,
	FolderRepository,
	FolderTagMappingRepository,
	InstalledNodesRepository,
	InstalledPackagesRepository,
	InvalidAuthTokenRepository,
	ProcessedDataRepository,
	ProjectRepository,
	ProjectRelationRepository,
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	TagRepository,
	TestCaseExecutionRepository,
	TestDefinitionRepository,
	TestMetricRepository,
	TestRunRepository,
	UserRepository,
	VariablesRepository,
	WorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowStatisticsRepository,
	WorkflowTagMappingRepository,
	EventDestinationsRepository,
	LicenseMetricsRepository,
	WebhookRepository,
};
