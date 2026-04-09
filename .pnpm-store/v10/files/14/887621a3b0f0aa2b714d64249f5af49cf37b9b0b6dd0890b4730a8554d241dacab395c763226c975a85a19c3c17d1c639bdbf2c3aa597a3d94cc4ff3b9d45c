import { DocumentType as __DocumentType } from "@smithy/types";
import {
  AdditionalResultAttributeValueType,
  AlfrescoEntity,
  AttributeSuggestionsMode,
  ConditionOperator,
  ConfluenceAttachmentFieldName,
  ConfluenceAuthenticationType,
  ConfluenceBlogFieldName,
  ConfluencePageFieldName,
  ConfluenceSpaceFieldName,
  ConfluenceVersion,
  ContentType,
  DatabaseEngineType,
  DataSourceStatus,
  DataSourceSyncJobStatus,
  DataSourceType,
  DocumentAttributeValueType,
  DocumentStatus,
  EndpointType,
  EntityType,
  ErrorCode,
  ExperienceStatus,
  FaqFileFormat,
  FaqStatus,
  FeaturedResultsSetStatus,
  FsxFileSystemType,
  HighlightType,
  IndexEdition,
  IndexStatus,
  Interval,
  IssueSubEntity,
  KeyLocation,
  MetricType,
  MissingAttributeKeyStrategy,
  Mode,
  Order,
  Persona,
  PrincipalMappingStatus,
  PrincipalType,
  QueryIdentifiersEnclosingOption,
  QueryResultFormat,
  QueryResultType,
  QuerySuggestionsBlockListStatus,
  QuerySuggestionsStatus,
  ReadAccessType,
  RelevanceType,
  SalesforceChatterFeedIncludeFilterType,
  SalesforceKnowledgeArticleState,
  SalesforceStandardObjectName,
  ScoreConfidence,
  ServiceNowAuthenticationType,
  ServiceNowBuildVersionType,
  SharePointOnlineAuthenticationType,
  SharePointVersion,
  SlackEntity,
  SortOrder,
  SuggestionType,
  ThesaurusStatus,
  Type,
  UserContextPolicy,
  UserGroupResolutionMode,
  WarningCode,
  WebCrawlerMode,
} from "./enums";
export interface AccessControlConfigurationSummary {
  Id: string | undefined;
}
export interface AccessControlListConfiguration {
  KeyPath?: string | undefined;
}
export interface AclConfiguration {
  AllowedGroupsColumnName: string | undefined;
}
export interface Highlight {
  BeginOffset: number | undefined;
  EndOffset: number | undefined;
  TopAnswer?: boolean | undefined;
  Type?: HighlightType | undefined;
}
export interface TextWithHighlights {
  Text?: string | undefined;
  Highlights?: Highlight[] | undefined;
}
export interface AdditionalResultAttributeValue {
  TextWithHighlightsValue?: TextWithHighlights | undefined;
}
export interface AdditionalResultAttribute {
  Key: string | undefined;
  ValueType: AdditionalResultAttributeValueType | undefined;
  Value: AdditionalResultAttributeValue | undefined;
}
export interface DataSourceToIndexFieldMapping {
  DataSourceFieldName: string | undefined;
  DateFieldFormat?: string | undefined;
  IndexFieldName: string | undefined;
}
export interface S3Path {
  Bucket: string | undefined;
  Key: string | undefined;
}
export interface DataSourceVpcConfiguration {
  SubnetIds: string[] | undefined;
  SecurityGroupIds: string[] | undefined;
}
export interface AlfrescoConfiguration {
  SiteUrl: string | undefined;
  SiteId: string | undefined;
  SecretArn: string | undefined;
  SslCertificateS3Path: S3Path | undefined;
  CrawlSystemFolders?: boolean | undefined;
  CrawlComments?: boolean | undefined;
  EntityFilter?: AlfrescoEntity[] | undefined;
  DocumentLibraryFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  BlogFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  WikiFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
export interface EntityConfiguration {
  EntityId: string | undefined;
  EntityType: EntityType | undefined;
}
export interface AssociateEntitiesToExperienceRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  EntityList: EntityConfiguration[] | undefined;
}
export interface FailedEntity {
  EntityId?: string | undefined;
  ErrorMessage?: string | undefined;
}
export interface AssociateEntitiesToExperienceResponse {
  FailedEntityList?: FailedEntity[] | undefined;
}
export interface EntityPersonaConfiguration {
  EntityId: string | undefined;
  Persona: Persona | undefined;
}
export interface AssociatePersonasToEntitiesRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  Personas: EntityPersonaConfiguration[] | undefined;
}
export interface AssociatePersonasToEntitiesResponse {
  FailedEntityList?: FailedEntity[] | undefined;
}
export interface DocumentAttributeValue {
  StringValue?: string | undefined;
  StringListValue?: string[] | undefined;
  LongValue?: number | undefined;
  DateValue?: Date | undefined;
}
export interface DocumentAttribute {
  Key: string | undefined;
  Value: DocumentAttributeValue | undefined;
}
export interface SuggestableConfig {
  AttributeName?: string | undefined;
  Suggestable?: boolean | undefined;
}
export interface AttributeSuggestionsDescribeConfig {
  SuggestableConfigList?: SuggestableConfig[] | undefined;
  AttributeSuggestionsMode?: AttributeSuggestionsMode | undefined;
}
export interface DataSourceGroup {
  GroupId: string | undefined;
  DataSourceId: string | undefined;
}
export interface UserContext {
  Token?: string | undefined;
  UserId?: string | undefined;
  Groups?: string[] | undefined;
  DataSourceGroups?: DataSourceGroup[] | undefined;
}
export interface AttributeSuggestionsUpdateConfig {
  SuggestableConfigList?: SuggestableConfig[] | undefined;
  AttributeSuggestionsMode?: AttributeSuggestionsMode | undefined;
}
export interface BasicAuthenticationConfiguration {
  Host: string | undefined;
  Port: number | undefined;
  Credentials: string | undefined;
}
export interface AuthenticationConfiguration {
  BasicAuthentication?: BasicAuthenticationConfiguration[] | undefined;
}
export interface DataSourceSyncJobMetricTarget {
  DataSourceId: string | undefined;
  DataSourceSyncJobId?: string | undefined;
}
export interface BatchDeleteDocumentRequest {
  IndexId: string | undefined;
  DocumentIdList: string[] | undefined;
  DataSourceSyncJobMetricTarget?: DataSourceSyncJobMetricTarget | undefined;
}
export interface BatchDeleteDocumentResponseFailedDocument {
  Id?: string | undefined;
  DataSourceId?: string | undefined;
  ErrorCode?: ErrorCode | undefined;
  ErrorMessage?: string | undefined;
}
export interface BatchDeleteDocumentResponse {
  FailedDocuments?: BatchDeleteDocumentResponseFailedDocument[] | undefined;
}
export interface BatchDeleteFeaturedResultsSetRequest {
  IndexId: string | undefined;
  FeaturedResultsSetIds: string[] | undefined;
}
export interface BatchDeleteFeaturedResultsSetError {
  Id: string | undefined;
  ErrorCode: ErrorCode | undefined;
  ErrorMessage: string | undefined;
}
export interface BatchDeleteFeaturedResultsSetResponse {
  Errors: BatchDeleteFeaturedResultsSetError[] | undefined;
}
export interface DocumentInfo {
  DocumentId: string | undefined;
  Attributes?: DocumentAttribute[] | undefined;
}
export interface BatchGetDocumentStatusRequest {
  IndexId: string | undefined;
  DocumentInfoList: DocumentInfo[] | undefined;
}
export interface Status {
  DocumentId?: string | undefined;
  DocumentStatus?: DocumentStatus | undefined;
  FailureCode?: string | undefined;
  FailureReason?: string | undefined;
}
export interface BatchGetDocumentStatusResponseError {
  DocumentId?: string | undefined;
  DataSourceId?: string | undefined;
  ErrorCode?: ErrorCode | undefined;
  ErrorMessage?: string | undefined;
}
export interface BatchGetDocumentStatusResponse {
  Errors?: BatchGetDocumentStatusResponseError[] | undefined;
  DocumentStatusList?: Status[] | undefined;
}
export interface DocumentAttributeCondition {
  ConditionDocumentAttributeKey: string | undefined;
  Operator: ConditionOperator | undefined;
  ConditionOnValue?: DocumentAttributeValue | undefined;
}
export interface DocumentAttributeTarget {
  TargetDocumentAttributeKey?: string | undefined;
  TargetDocumentAttributeValueDeletion?: boolean | undefined;
  TargetDocumentAttributeValue?: DocumentAttributeValue | undefined;
}
export interface InlineCustomDocumentEnrichmentConfiguration {
  Condition?: DocumentAttributeCondition | undefined;
  Target?: DocumentAttributeTarget | undefined;
  DocumentContentDeletion?: boolean | undefined;
}
export interface HookConfiguration {
  InvocationCondition?: DocumentAttributeCondition | undefined;
  LambdaArn: string | undefined;
  S3Bucket: string | undefined;
}
export interface CustomDocumentEnrichmentConfiguration {
  InlineConfigurations?:
    | InlineCustomDocumentEnrichmentConfiguration[]
    | undefined;
  PreExtractionHookConfiguration?: HookConfiguration | undefined;
  PostExtractionHookConfiguration?: HookConfiguration | undefined;
  RoleArn?: string | undefined;
}
export interface Principal {
  Name: string | undefined;
  Type: PrincipalType | undefined;
  Access: ReadAccessType | undefined;
  DataSourceId?: string | undefined;
}
export interface HierarchicalPrincipal {
  PrincipalList: Principal[] | undefined;
}
export interface Document {
  Id: string | undefined;
  Title?: string | undefined;
  Blob?: Uint8Array | undefined;
  S3Path?: S3Path | undefined;
  Attributes?: DocumentAttribute[] | undefined;
  AccessControlList?: Principal[] | undefined;
  HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
  ContentType?: ContentType | undefined;
  AccessControlConfigurationId?: string | undefined;
}
export interface BatchPutDocumentRequest {
  IndexId: string | undefined;
  RoleArn?: string | undefined;
  Documents: Document[] | undefined;
  CustomDocumentEnrichmentConfiguration?:
    | CustomDocumentEnrichmentConfiguration
    | undefined;
}
export interface BatchPutDocumentResponseFailedDocument {
  Id?: string | undefined;
  DataSourceId?: string | undefined;
  ErrorCode?: ErrorCode | undefined;
  ErrorMessage?: string | undefined;
}
export interface BatchPutDocumentResponse {
  FailedDocuments?: BatchPutDocumentResponseFailedDocument[] | undefined;
}
export interface ClearQuerySuggestionsRequest {
  IndexId: string | undefined;
}
export interface CreateAccessControlConfigurationRequest {
  IndexId: string | undefined;
  Name: string | undefined;
  Description?: string | undefined;
  AccessControlList?: Principal[] | undefined;
  HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
  ClientToken?: string | undefined;
}
export interface CreateAccessControlConfigurationResponse {
  Id: string | undefined;
}
export interface BoxConfiguration {
  EnterpriseId: string | undefined;
  SecretArn: string | undefined;
  UseChangeLog?: boolean | undefined;
  CrawlComments?: boolean | undefined;
  CrawlTasks?: boolean | undefined;
  CrawlWebLinks?: boolean | undefined;
  FileFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  TaskFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  CommentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  WebLinkFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
export interface ConfluenceAttachmentToIndexFieldMapping {
  DataSourceFieldName?: ConfluenceAttachmentFieldName | undefined;
  DateFieldFormat?: string | undefined;
  IndexFieldName?: string | undefined;
}
export interface ConfluenceAttachmentConfiguration {
  CrawlAttachments?: boolean | undefined;
  AttachmentFieldMappings?:
    | ConfluenceAttachmentToIndexFieldMapping[]
    | undefined;
}
export interface ConfluenceBlogToIndexFieldMapping {
  DataSourceFieldName?: ConfluenceBlogFieldName | undefined;
  DateFieldFormat?: string | undefined;
  IndexFieldName?: string | undefined;
}
export interface ConfluenceBlogConfiguration {
  BlogFieldMappings?: ConfluenceBlogToIndexFieldMapping[] | undefined;
}
export interface ConfluencePageToIndexFieldMapping {
  DataSourceFieldName?: ConfluencePageFieldName | undefined;
  DateFieldFormat?: string | undefined;
  IndexFieldName?: string | undefined;
}
export interface ConfluencePageConfiguration {
  PageFieldMappings?: ConfluencePageToIndexFieldMapping[] | undefined;
}
export interface ProxyConfiguration {
  Host: string | undefined;
  Port: number | undefined;
  Credentials?: string | undefined;
}
export interface ConfluenceSpaceToIndexFieldMapping {
  DataSourceFieldName?: ConfluenceSpaceFieldName | undefined;
  DateFieldFormat?: string | undefined;
  IndexFieldName?: string | undefined;
}
export interface ConfluenceSpaceConfiguration {
  CrawlPersonalSpaces?: boolean | undefined;
  CrawlArchivedSpaces?: boolean | undefined;
  IncludeSpaces?: string[] | undefined;
  ExcludeSpaces?: string[] | undefined;
  SpaceFieldMappings?: ConfluenceSpaceToIndexFieldMapping[] | undefined;
}
export interface ConfluenceConfiguration {
  ServerUrl: string | undefined;
  SecretArn: string | undefined;
  Version: ConfluenceVersion | undefined;
  SpaceConfiguration?: ConfluenceSpaceConfiguration | undefined;
  PageConfiguration?: ConfluencePageConfiguration | undefined;
  BlogConfiguration?: ConfluenceBlogConfiguration | undefined;
  AttachmentConfiguration?: ConfluenceAttachmentConfiguration | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  ProxyConfiguration?: ProxyConfiguration | undefined;
  AuthenticationType?: ConfluenceAuthenticationType | undefined;
}
export interface ColumnConfiguration {
  DocumentIdColumnName: string | undefined;
  DocumentDataColumnName: string | undefined;
  DocumentTitleColumnName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  ChangeDetectingColumns: string[] | undefined;
}
export interface ConnectionConfiguration {
  DatabaseHost: string | undefined;
  DatabasePort: number | undefined;
  DatabaseName: string | undefined;
  TableName: string | undefined;
  SecretArn: string | undefined;
}
export interface SqlConfiguration {
  QueryIdentifiersEnclosingOption?: QueryIdentifiersEnclosingOption | undefined;
}
export interface DatabaseConfiguration {
  DatabaseEngineType: DatabaseEngineType | undefined;
  ConnectionConfiguration: ConnectionConfiguration | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  ColumnConfiguration: ColumnConfiguration | undefined;
  AclConfiguration?: AclConfiguration | undefined;
  SqlConfiguration?: SqlConfiguration | undefined;
}
export interface FsxConfiguration {
  FileSystemId: string | undefined;
  FileSystemType: FsxFileSystemType | undefined;
  VpcConfiguration: DataSourceVpcConfiguration | undefined;
  SecretArn?: string | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface GitHubDocumentCrawlProperties {
  CrawlRepositoryDocuments?: boolean | undefined;
  CrawlIssue?: boolean | undefined;
  CrawlIssueComment?: boolean | undefined;
  CrawlIssueCommentAttachment?: boolean | undefined;
  CrawlPullRequest?: boolean | undefined;
  CrawlPullRequestComment?: boolean | undefined;
  CrawlPullRequestCommentAttachment?: boolean | undefined;
}
export interface OnPremiseConfiguration {
  HostUrl: string | undefined;
  OrganizationName: string | undefined;
  SslCertificateS3Path: S3Path | undefined;
}
export interface SaaSConfiguration {
  OrganizationName: string | undefined;
  HostUrl: string | undefined;
}
export interface GitHubConfiguration {
  SaaSConfiguration?: SaaSConfiguration | undefined;
  OnPremiseConfiguration?: OnPremiseConfiguration | undefined;
  Type?: Type | undefined;
  SecretArn: string | undefined;
  UseChangeLog?: boolean | undefined;
  GitHubDocumentCrawlProperties?: GitHubDocumentCrawlProperties | undefined;
  RepositoryFilter?: string[] | undefined;
  InclusionFolderNamePatterns?: string[] | undefined;
  InclusionFileTypePatterns?: string[] | undefined;
  InclusionFileNamePatterns?: string[] | undefined;
  ExclusionFolderNamePatterns?: string[] | undefined;
  ExclusionFileTypePatterns?: string[] | undefined;
  ExclusionFileNamePatterns?: string[] | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  GitHubRepositoryConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubCommitConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubIssueDocumentConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubIssueCommentConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubIssueAttachmentConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubPullRequestCommentConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubPullRequestDocumentConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
  GitHubPullRequestDocumentAttachmentConfigurationFieldMappings?:
    | DataSourceToIndexFieldMapping[]
    | undefined;
}
export interface GoogleDriveConfiguration {
  SecretArn: string | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  ExcludeMimeTypes?: string[] | undefined;
  ExcludeUserAccounts?: string[] | undefined;
  ExcludeSharedDrives?: string[] | undefined;
}
export interface JiraConfiguration {
  JiraAccountUrl: string | undefined;
  SecretArn: string | undefined;
  UseChangeLog?: boolean | undefined;
  Project?: string[] | undefined;
  IssueType?: string[] | undefined;
  Status?: string[] | undefined;
  IssueSubEntityFilter?: IssueSubEntity[] | undefined;
  AttachmentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  CommentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  IssueFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  ProjectFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  WorkLogFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
export interface OneDriveUsers {
  OneDriveUserList?: string[] | undefined;
  OneDriveUserS3Path?: S3Path | undefined;
}
export interface OneDriveConfiguration {
  TenantDomain: string | undefined;
  SecretArn: string | undefined;
  OneDriveUsers: OneDriveUsers | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  DisableLocalGroups?: boolean | undefined;
}
export interface QuipConfiguration {
  Domain: string | undefined;
  SecretArn: string | undefined;
  CrawlFileComments?: boolean | undefined;
  CrawlChatRooms?: boolean | undefined;
  CrawlAttachments?: boolean | undefined;
  FolderIds?: string[] | undefined;
  ThreadFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  MessageFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  AttachmentFieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
}
export interface DocumentsMetadataConfiguration {
  S3Prefix?: string | undefined;
}
export interface S3DataSourceConfiguration {
  BucketName: string | undefined;
  InclusionPrefixes?: string[] | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  DocumentsMetadataConfiguration?: DocumentsMetadataConfiguration | undefined;
  AccessControlListConfiguration?: AccessControlListConfiguration | undefined;
}
export interface SalesforceChatterFeedConfiguration {
  DocumentDataFieldName: string | undefined;
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  IncludeFilterTypes?: SalesforceChatterFeedIncludeFilterType[] | undefined;
}
export interface SalesforceCustomKnowledgeArticleTypeConfiguration {
  Name: string | undefined;
  DocumentDataFieldName: string | undefined;
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface SalesforceStandardKnowledgeArticleTypeConfiguration {
  DocumentDataFieldName: string | undefined;
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface SalesforceKnowledgeArticleConfiguration {
  IncludedStates: SalesforceKnowledgeArticleState[] | undefined;
  StandardKnowledgeArticleTypeConfiguration?:
    | SalesforceStandardKnowledgeArticleTypeConfiguration
    | undefined;
  CustomKnowledgeArticleTypeConfigurations?:
    | SalesforceCustomKnowledgeArticleTypeConfiguration[]
    | undefined;
}
export interface SalesforceStandardObjectAttachmentConfiguration {
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface SalesforceStandardObjectConfiguration {
  Name: SalesforceStandardObjectName | undefined;
  DocumentDataFieldName: string | undefined;
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface SalesforceConfiguration {
  ServerUrl: string | undefined;
  SecretArn: string | undefined;
  StandardObjectConfigurations?:
    | SalesforceStandardObjectConfiguration[]
    | undefined;
  KnowledgeArticleConfiguration?:
    | SalesforceKnowledgeArticleConfiguration
    | undefined;
  ChatterFeedConfiguration?: SalesforceChatterFeedConfiguration | undefined;
  CrawlAttachments?: boolean | undefined;
  StandardObjectAttachmentConfiguration?:
    | SalesforceStandardObjectAttachmentConfiguration
    | undefined;
  IncludeAttachmentFilePatterns?: string[] | undefined;
  ExcludeAttachmentFilePatterns?: string[] | undefined;
}
export interface ServiceNowKnowledgeArticleConfiguration {
  CrawlAttachments?: boolean | undefined;
  IncludeAttachmentFilePatterns?: string[] | undefined;
  ExcludeAttachmentFilePatterns?: string[] | undefined;
  DocumentDataFieldName: string | undefined;
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  FilterQuery?: string | undefined;
}
export interface ServiceNowServiceCatalogConfiguration {
  CrawlAttachments?: boolean | undefined;
  IncludeAttachmentFilePatterns?: string[] | undefined;
  ExcludeAttachmentFilePatterns?: string[] | undefined;
  DocumentDataFieldName: string | undefined;
  DocumentTitleFieldName?: string | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface ServiceNowConfiguration {
  HostUrl: string | undefined;
  SecretArn: string | undefined;
  ServiceNowBuildVersion: ServiceNowBuildVersionType | undefined;
  KnowledgeArticleConfiguration?:
    | ServiceNowKnowledgeArticleConfiguration
    | undefined;
  ServiceCatalogConfiguration?:
    | ServiceNowServiceCatalogConfiguration
    | undefined;
  AuthenticationType?: ServiceNowAuthenticationType | undefined;
}
export interface SharePointConfiguration {
  SharePointVersion: SharePointVersion | undefined;
  Urls: string[] | undefined;
  SecretArn: string | undefined;
  CrawlAttachments?: boolean | undefined;
  UseChangeLog?: boolean | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
  DocumentTitleFieldName?: string | undefined;
  DisableLocalGroups?: boolean | undefined;
  SslCertificateS3Path?: S3Path | undefined;
  AuthenticationType?: SharePointOnlineAuthenticationType | undefined;
  ProxyConfiguration?: ProxyConfiguration | undefined;
}
export interface SlackConfiguration {
  TeamId: string | undefined;
  SecretArn: string | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  SlackEntityList: SlackEntity[] | undefined;
  UseChangeLog?: boolean | undefined;
  CrawlBotMessage?: boolean | undefined;
  ExcludeArchived?: boolean | undefined;
  SinceCrawlDate: string | undefined;
  LookBackPeriod?: number | undefined;
  PrivateChannelFilter?: string[] | undefined;
  PublicChannelFilter?: string[] | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface TemplateConfiguration {
  Template?: __DocumentType | undefined;
}
export interface SeedUrlConfiguration {
  SeedUrls: string[] | undefined;
  WebCrawlerMode?: WebCrawlerMode | undefined;
}
export interface SiteMapsConfiguration {
  SiteMaps: string[] | undefined;
}
export interface Urls {
  SeedUrlConfiguration?: SeedUrlConfiguration | undefined;
  SiteMapsConfiguration?: SiteMapsConfiguration | undefined;
}
export interface WebCrawlerConfiguration {
  Urls: Urls | undefined;
  CrawlDepth?: number | undefined;
  MaxLinksPerPage?: number | undefined;
  MaxContentSizePerPageInMegaBytes?: number | undefined;
  MaxUrlsPerMinuteCrawlRate?: number | undefined;
  UrlInclusionPatterns?: string[] | undefined;
  UrlExclusionPatterns?: string[] | undefined;
  ProxyConfiguration?: ProxyConfiguration | undefined;
  AuthenticationConfiguration?: AuthenticationConfiguration | undefined;
}
export interface WorkDocsConfiguration {
  OrganizationId: string | undefined;
  CrawlComments?: boolean | undefined;
  UseChangeLog?: boolean | undefined;
  InclusionPatterns?: string[] | undefined;
  ExclusionPatterns?: string[] | undefined;
  FieldMappings?: DataSourceToIndexFieldMapping[] | undefined;
}
export interface DataSourceConfiguration {
  S3Configuration?: S3DataSourceConfiguration | undefined;
  SharePointConfiguration?: SharePointConfiguration | undefined;
  DatabaseConfiguration?: DatabaseConfiguration | undefined;
  SalesforceConfiguration?: SalesforceConfiguration | undefined;
  OneDriveConfiguration?: OneDriveConfiguration | undefined;
  ServiceNowConfiguration?: ServiceNowConfiguration | undefined;
  ConfluenceConfiguration?: ConfluenceConfiguration | undefined;
  GoogleDriveConfiguration?: GoogleDriveConfiguration | undefined;
  WebCrawlerConfiguration?: WebCrawlerConfiguration | undefined;
  WorkDocsConfiguration?: WorkDocsConfiguration | undefined;
  FsxConfiguration?: FsxConfiguration | undefined;
  SlackConfiguration?: SlackConfiguration | undefined;
  BoxConfiguration?: BoxConfiguration | undefined;
  QuipConfiguration?: QuipConfiguration | undefined;
  JiraConfiguration?: JiraConfiguration | undefined;
  GitHubConfiguration?: GitHubConfiguration | undefined;
  AlfrescoConfiguration?: AlfrescoConfiguration | undefined;
  TemplateConfiguration?: TemplateConfiguration | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export interface CreateDataSourceRequest {
  Name: string | undefined;
  IndexId: string | undefined;
  Type: DataSourceType | undefined;
  Configuration?: DataSourceConfiguration | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  Description?: string | undefined;
  Schedule?: string | undefined;
  RoleArn?: string | undefined;
  Tags?: Tag[] | undefined;
  ClientToken?: string | undefined;
  LanguageCode?: string | undefined;
  CustomDocumentEnrichmentConfiguration?:
    | CustomDocumentEnrichmentConfiguration
    | undefined;
}
export interface CreateDataSourceResponse {
  Id: string | undefined;
}
export interface ContentSourceConfiguration {
  DataSourceIds?: string[] | undefined;
  FaqIds?: string[] | undefined;
  DirectPutContent?: boolean | undefined;
}
export interface UserIdentityConfiguration {
  IdentityAttributeName?: string | undefined;
}
export interface ExperienceConfiguration {
  ContentSourceConfiguration?: ContentSourceConfiguration | undefined;
  UserIdentityConfiguration?: UserIdentityConfiguration | undefined;
}
export interface CreateExperienceRequest {
  Name: string | undefined;
  IndexId: string | undefined;
  RoleArn?: string | undefined;
  Configuration?: ExperienceConfiguration | undefined;
  Description?: string | undefined;
  ClientToken?: string | undefined;
}
export interface CreateExperienceResponse {
  Id: string | undefined;
}
export interface CreateFaqRequest {
  IndexId: string | undefined;
  Name: string | undefined;
  Description?: string | undefined;
  S3Path: S3Path | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
  FileFormat?: FaqFileFormat | undefined;
  ClientToken?: string | undefined;
  LanguageCode?: string | undefined;
}
export interface CreateFaqResponse {
  Id?: string | undefined;
}
export interface FeaturedDocument {
  Id?: string | undefined;
}
export interface CreateFeaturedResultsSetRequest {
  IndexId: string | undefined;
  FeaturedResultsSetName: string | undefined;
  Description?: string | undefined;
  ClientToken?: string | undefined;
  Status?: FeaturedResultsSetStatus | undefined;
  QueryTexts?: string[] | undefined;
  FeaturedDocuments?: FeaturedDocument[] | undefined;
  Tags?: Tag[] | undefined;
}
export interface FeaturedResultsSet {
  FeaturedResultsSetId?: string | undefined;
  FeaturedResultsSetName?: string | undefined;
  Description?: string | undefined;
  Status?: FeaturedResultsSetStatus | undefined;
  QueryTexts?: string[] | undefined;
  FeaturedDocuments?: FeaturedDocument[] | undefined;
  LastUpdatedTimestamp?: number | undefined;
  CreationTimestamp?: number | undefined;
}
export interface CreateFeaturedResultsSetResponse {
  FeaturedResultsSet?: FeaturedResultsSet | undefined;
}
export interface ConflictingItem {
  QueryText?: string | undefined;
  SetName?: string | undefined;
  SetId?: string | undefined;
}
export interface ServerSideEncryptionConfiguration {
  KmsKeyId?: string | undefined;
}
export interface UserGroupResolutionConfiguration {
  UserGroupResolutionMode: UserGroupResolutionMode | undefined;
}
export interface JsonTokenTypeConfiguration {
  UserNameAttributeField: string | undefined;
  GroupAttributeField: string | undefined;
}
export interface JwtTokenTypeConfiguration {
  KeyLocation: KeyLocation | undefined;
  URL?: string | undefined;
  SecretManagerArn?: string | undefined;
  UserNameAttributeField?: string | undefined;
  GroupAttributeField?: string | undefined;
  Issuer?: string | undefined;
  ClaimRegex?: string | undefined;
}
export interface UserTokenConfiguration {
  JwtTokenTypeConfiguration?: JwtTokenTypeConfiguration | undefined;
  JsonTokenTypeConfiguration?: JsonTokenTypeConfiguration | undefined;
}
export interface CreateIndexRequest {
  Name: string | undefined;
  Edition?: IndexEdition | undefined;
  RoleArn: string | undefined;
  ServerSideEncryptionConfiguration?:
    | ServerSideEncryptionConfiguration
    | undefined;
  Description?: string | undefined;
  ClientToken?: string | undefined;
  Tags?: Tag[] | undefined;
  UserTokenConfigurations?: UserTokenConfiguration[] | undefined;
  UserContextPolicy?: UserContextPolicy | undefined;
  UserGroupResolutionConfiguration?:
    | UserGroupResolutionConfiguration
    | undefined;
}
export interface CreateIndexResponse {
  Id?: string | undefined;
}
export interface CreateQuerySuggestionsBlockListRequest {
  IndexId: string | undefined;
  Name: string | undefined;
  Description?: string | undefined;
  SourceS3Path: S3Path | undefined;
  ClientToken?: string | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateQuerySuggestionsBlockListResponse {
  Id?: string | undefined;
}
export interface CreateThesaurusRequest {
  IndexId: string | undefined;
  Name: string | undefined;
  Description?: string | undefined;
  RoleArn: string | undefined;
  Tags?: Tag[] | undefined;
  SourceS3Path: S3Path | undefined;
  ClientToken?: string | undefined;
}
export interface CreateThesaurusResponse {
  Id?: string | undefined;
}
export interface DeleteAccessControlConfigurationRequest {
  IndexId: string | undefined;
  Id: string | undefined;
}
export interface DeleteAccessControlConfigurationResponse {}
export interface DeleteDataSourceRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DeleteExperienceRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DeleteExperienceResponse {}
export interface DeleteFaqRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DeleteIndexRequest {
  Id: string | undefined;
}
export interface DeletePrincipalMappingRequest {
  IndexId: string | undefined;
  DataSourceId?: string | undefined;
  GroupId: string | undefined;
  OrderingId?: number | undefined;
}
export interface DeleteQuerySuggestionsBlockListRequest {
  IndexId: string | undefined;
  Id: string | undefined;
}
export interface DeleteThesaurusRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DescribeAccessControlConfigurationRequest {
  IndexId: string | undefined;
  Id: string | undefined;
}
export interface DescribeAccessControlConfigurationResponse {
  Name: string | undefined;
  Description?: string | undefined;
  ErrorMessage?: string | undefined;
  AccessControlList?: Principal[] | undefined;
  HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
}
export interface DescribeDataSourceRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DescribeDataSourceResponse {
  Id?: string | undefined;
  IndexId?: string | undefined;
  Name?: string | undefined;
  Type?: DataSourceType | undefined;
  Configuration?: DataSourceConfiguration | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  Description?: string | undefined;
  Status?: DataSourceStatus | undefined;
  Schedule?: string | undefined;
  RoleArn?: string | undefined;
  ErrorMessage?: string | undefined;
  LanguageCode?: string | undefined;
  CustomDocumentEnrichmentConfiguration?:
    | CustomDocumentEnrichmentConfiguration
    | undefined;
}
export interface DescribeExperienceRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface ExperienceEndpoint {
  EndpointType?: EndpointType | undefined;
  Endpoint?: string | undefined;
}
export interface DescribeExperienceResponse {
  Id?: string | undefined;
  IndexId?: string | undefined;
  Name?: string | undefined;
  Endpoints?: ExperienceEndpoint[] | undefined;
  Configuration?: ExperienceConfiguration | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  Description?: string | undefined;
  Status?: ExperienceStatus | undefined;
  RoleArn?: string | undefined;
  ErrorMessage?: string | undefined;
}
export interface DescribeFaqRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DescribeFaqResponse {
  Id?: string | undefined;
  IndexId?: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  S3Path?: S3Path | undefined;
  Status?: FaqStatus | undefined;
  RoleArn?: string | undefined;
  ErrorMessage?: string | undefined;
  FileFormat?: FaqFileFormat | undefined;
  LanguageCode?: string | undefined;
}
export interface DescribeFeaturedResultsSetRequest {
  IndexId: string | undefined;
  FeaturedResultsSetId: string | undefined;
}
export interface FeaturedDocumentMissing {
  Id?: string | undefined;
}
export interface FeaturedDocumentWithMetadata {
  Id?: string | undefined;
  Title?: string | undefined;
  URI?: string | undefined;
}
export interface DescribeFeaturedResultsSetResponse {
  FeaturedResultsSetId?: string | undefined;
  FeaturedResultsSetName?: string | undefined;
  Description?: string | undefined;
  Status?: FeaturedResultsSetStatus | undefined;
  QueryTexts?: string[] | undefined;
  FeaturedDocumentsWithMetadata?: FeaturedDocumentWithMetadata[] | undefined;
  FeaturedDocumentsMissing?: FeaturedDocumentMissing[] | undefined;
  LastUpdatedTimestamp?: number | undefined;
  CreationTimestamp?: number | undefined;
}
export interface DescribeIndexRequest {
  Id: string | undefined;
}
export interface CapacityUnitsConfiguration {
  StorageCapacityUnits: number | undefined;
  QueryCapacityUnits: number | undefined;
}
export interface Relevance {
  Freshness?: boolean | undefined;
  Importance?: number | undefined;
  Duration?: string | undefined;
  RankOrder?: Order | undefined;
  ValueImportanceMap?: Record<string, number> | undefined;
}
export interface Search {
  Facetable?: boolean | undefined;
  Searchable?: boolean | undefined;
  Displayable?: boolean | undefined;
  Sortable?: boolean | undefined;
}
export interface DocumentMetadataConfiguration {
  Name: string | undefined;
  Type: DocumentAttributeValueType | undefined;
  Relevance?: Relevance | undefined;
  Search?: Search | undefined;
}
export interface FaqStatistics {
  IndexedQuestionAnswersCount: number | undefined;
}
export interface TextDocumentStatistics {
  IndexedTextDocumentsCount: number | undefined;
  IndexedTextBytes: number | undefined;
}
export interface IndexStatistics {
  FaqStatistics: FaqStatistics | undefined;
  TextDocumentStatistics: TextDocumentStatistics | undefined;
}
export interface DescribeIndexResponse {
  Name?: string | undefined;
  Id?: string | undefined;
  Edition?: IndexEdition | undefined;
  RoleArn?: string | undefined;
  ServerSideEncryptionConfiguration?:
    | ServerSideEncryptionConfiguration
    | undefined;
  Status?: IndexStatus | undefined;
  Description?: string | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  DocumentMetadataConfigurations?: DocumentMetadataConfiguration[] | undefined;
  IndexStatistics?: IndexStatistics | undefined;
  ErrorMessage?: string | undefined;
  CapacityUnits?: CapacityUnitsConfiguration | undefined;
  UserTokenConfigurations?: UserTokenConfiguration[] | undefined;
  UserContextPolicy?: UserContextPolicy | undefined;
  UserGroupResolutionConfiguration?:
    | UserGroupResolutionConfiguration
    | undefined;
}
export interface DescribePrincipalMappingRequest {
  IndexId: string | undefined;
  DataSourceId?: string | undefined;
  GroupId: string | undefined;
}
export interface GroupOrderingIdSummary {
  Status?: PrincipalMappingStatus | undefined;
  LastUpdatedAt?: Date | undefined;
  ReceivedAt?: Date | undefined;
  OrderingId?: number | undefined;
  FailureReason?: string | undefined;
}
export interface DescribePrincipalMappingResponse {
  IndexId?: string | undefined;
  DataSourceId?: string | undefined;
  GroupId?: string | undefined;
  GroupOrderingIdSummaries?: GroupOrderingIdSummary[] | undefined;
}
export interface DescribeQuerySuggestionsBlockListRequest {
  IndexId: string | undefined;
  Id: string | undefined;
}
export interface DescribeQuerySuggestionsBlockListResponse {
  IndexId?: string | undefined;
  Id?: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  Status?: QuerySuggestionsBlockListStatus | undefined;
  ErrorMessage?: string | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  SourceS3Path?: S3Path | undefined;
  ItemCount?: number | undefined;
  FileSizeBytes?: number | undefined;
  RoleArn?: string | undefined;
}
export interface DescribeQuerySuggestionsConfigRequest {
  IndexId: string | undefined;
}
export interface DescribeQuerySuggestionsConfigResponse {
  Mode?: Mode | undefined;
  Status?: QuerySuggestionsStatus | undefined;
  QueryLogLookBackWindowInDays?: number | undefined;
  IncludeQueriesWithoutUserInformation?: boolean | undefined;
  MinimumNumberOfQueryingUsers?: number | undefined;
  MinimumQueryCount?: number | undefined;
  LastSuggestionsBuildTime?: Date | undefined;
  LastClearTime?: Date | undefined;
  TotalSuggestionsCount?: number | undefined;
  AttributeSuggestionsConfig?: AttributeSuggestionsDescribeConfig | undefined;
}
export interface DescribeThesaurusRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface DescribeThesaurusResponse {
  Id?: string | undefined;
  IndexId?: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  Status?: ThesaurusStatus | undefined;
  ErrorMessage?: string | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  RoleArn?: string | undefined;
  SourceS3Path?: S3Path | undefined;
  FileSizeBytes?: number | undefined;
  TermCount?: number | undefined;
  SynonymRuleCount?: number | undefined;
}
export interface DisassociateEntitiesFromExperienceRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  EntityList: EntityConfiguration[] | undefined;
}
export interface DisassociateEntitiesFromExperienceResponse {
  FailedEntityList?: FailedEntity[] | undefined;
}
export interface DisassociatePersonasFromEntitiesRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  EntityIds: string[] | undefined;
}
export interface DisassociatePersonasFromEntitiesResponse {
  FailedEntityList?: FailedEntity[] | undefined;
}
export interface SourceDocument {
  DocumentId?: string | undefined;
  SuggestionAttributes?: string[] | undefined;
  AdditionalAttributes?: DocumentAttribute[] | undefined;
}
export interface SuggestionHighlight {
  BeginOffset?: number | undefined;
  EndOffset?: number | undefined;
}
export interface SuggestionTextWithHighlights {
  Text?: string | undefined;
  Highlights?: SuggestionHighlight[] | undefined;
}
export interface SuggestionValue {
  Text?: SuggestionTextWithHighlights | undefined;
}
export interface Suggestion {
  Id?: string | undefined;
  Value?: SuggestionValue | undefined;
  SourceDocuments?: SourceDocument[] | undefined;
}
export interface GetQuerySuggestionsResponse {
  QuerySuggestionsId?: string | undefined;
  Suggestions?: Suggestion[] | undefined;
}
export interface GetSnapshotsRequest {
  IndexId: string | undefined;
  Interval: Interval | undefined;
  MetricType: MetricType | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface TimeRange {
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
}
export interface GetSnapshotsResponse {
  SnapShotTimeFilter?: TimeRange | undefined;
  SnapshotsDataHeader?: string[] | undefined;
  SnapshotsData?: string[][] | undefined;
  NextToken?: string | undefined;
}
export interface ListAccessControlConfigurationsRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ListAccessControlConfigurationsResponse {
  NextToken?: string | undefined;
  AccessControlConfigurations: AccessControlConfigurationSummary[] | undefined;
}
export interface ListDataSourcesRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface DataSourceSummary {
  Name?: string | undefined;
  Id?: string | undefined;
  Type?: DataSourceType | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  Status?: DataSourceStatus | undefined;
  LanguageCode?: string | undefined;
}
export interface ListDataSourcesResponse {
  SummaryItems?: DataSourceSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListDataSourceSyncJobsRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
  StartTimeFilter?: TimeRange | undefined;
  StatusFilter?: DataSourceSyncJobStatus | undefined;
}
export interface DataSourceSyncJobMetrics {
  DocumentsAdded?: string | undefined;
  DocumentsModified?: string | undefined;
  DocumentsDeleted?: string | undefined;
  DocumentsFailed?: string | undefined;
  DocumentsScanned?: string | undefined;
}
export interface DataSourceSyncJob {
  ExecutionId?: string | undefined;
  StartTime?: Date | undefined;
  EndTime?: Date | undefined;
  Status?: DataSourceSyncJobStatus | undefined;
  ErrorMessage?: string | undefined;
  ErrorCode?: ErrorCode | undefined;
  DataSourceErrorCode?: string | undefined;
  Metrics?: DataSourceSyncJobMetrics | undefined;
}
export interface ListDataSourceSyncJobsResponse {
  History?: DataSourceSyncJob[] | undefined;
  NextToken?: string | undefined;
}
export interface ListEntityPersonasRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface PersonasSummary {
  EntityId?: string | undefined;
  Persona?: Persona | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
}
export interface ListEntityPersonasResponse {
  SummaryItems?: PersonasSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListExperienceEntitiesRequest {
  Id: string | undefined;
  IndexId: string | undefined;
  NextToken?: string | undefined;
}
export interface EntityDisplayData {
  UserName?: string | undefined;
  GroupName?: string | undefined;
  IdentifiedUserName?: string | undefined;
  FirstName?: string | undefined;
  LastName?: string | undefined;
}
export interface ExperienceEntitiesSummary {
  EntityId?: string | undefined;
  EntityType?: EntityType | undefined;
  DisplayData?: EntityDisplayData | undefined;
}
export interface ListExperienceEntitiesResponse {
  SummaryItems?: ExperienceEntitiesSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListExperiencesRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ExperiencesSummary {
  Name?: string | undefined;
  Id?: string | undefined;
  CreatedAt?: Date | undefined;
  Status?: ExperienceStatus | undefined;
  Endpoints?: ExperienceEndpoint[] | undefined;
}
export interface ListExperiencesResponse {
  SummaryItems?: ExperiencesSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListFaqsRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface FaqSummary {
  Id?: string | undefined;
  Name?: string | undefined;
  Status?: FaqStatus | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  FileFormat?: FaqFileFormat | undefined;
  LanguageCode?: string | undefined;
}
export interface ListFaqsResponse {
  NextToken?: string | undefined;
  FaqSummaryItems?: FaqSummary[] | undefined;
}
export interface ListFeaturedResultsSetsRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface FeaturedResultsSetSummary {
  FeaturedResultsSetId?: string | undefined;
  FeaturedResultsSetName?: string | undefined;
  Status?: FeaturedResultsSetStatus | undefined;
  LastUpdatedTimestamp?: number | undefined;
  CreationTimestamp?: number | undefined;
}
export interface ListFeaturedResultsSetsResponse {
  FeaturedResultsSetSummaryItems?: FeaturedResultsSetSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListGroupsOlderThanOrderingIdRequest {
  IndexId: string | undefined;
  DataSourceId?: string | undefined;
  OrderingId: number | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface GroupSummary {
  GroupId?: string | undefined;
  OrderingId?: number | undefined;
}
export interface ListGroupsOlderThanOrderingIdResponse {
  GroupsSummaries?: GroupSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListIndicesRequest {
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface IndexConfigurationSummary {
  Name?: string | undefined;
  Id?: string | undefined;
  Edition?: IndexEdition | undefined;
  CreatedAt: Date | undefined;
  UpdatedAt: Date | undefined;
  Status: IndexStatus | undefined;
}
export interface ListIndicesResponse {
  IndexConfigurationSummaryItems?: IndexConfigurationSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListQuerySuggestionsBlockListsRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface QuerySuggestionsBlockListSummary {
  Id?: string | undefined;
  Name?: string | undefined;
  Status?: QuerySuggestionsBlockListStatus | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
  ItemCount?: number | undefined;
}
export interface ListQuerySuggestionsBlockListsResponse {
  BlockListSummaryItems?: QuerySuggestionsBlockListSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTagsForResourceRequest {
  ResourceARN: string | undefined;
}
export interface ListTagsForResourceResponse {
  Tags?: Tag[] | undefined;
}
export interface ListThesauriRequest {
  IndexId: string | undefined;
  NextToken?: string | undefined;
  MaxResults?: number | undefined;
}
export interface ThesaurusSummary {
  Id?: string | undefined;
  Name?: string | undefined;
  Status?: ThesaurusStatus | undefined;
  CreatedAt?: Date | undefined;
  UpdatedAt?: Date | undefined;
}
export interface ListThesauriResponse {
  NextToken?: string | undefined;
  ThesaurusSummaryItems?: ThesaurusSummary[] | undefined;
}
export interface MemberGroup {
  GroupId: string | undefined;
  DataSourceId?: string | undefined;
}
export interface MemberUser {
  UserId: string | undefined;
}
export interface GroupMembers {
  MemberGroups?: MemberGroup[] | undefined;
  MemberUsers?: MemberUser[] | undefined;
  S3PathforGroupMembers?: S3Path | undefined;
}
export interface PutPrincipalMappingRequest {
  IndexId: string | undefined;
  DataSourceId?: string | undefined;
  GroupId: string | undefined;
  GroupMembers: GroupMembers | undefined;
  OrderingId?: number | undefined;
  RoleArn?: string | undefined;
}
export interface ExpandConfiguration {
  MaxResultItemsToExpand?: number | undefined;
  MaxExpandedResultsPerItem?: number | undefined;
}
export interface SortingConfiguration {
  DocumentAttributeKey: string | undefined;
  SortOrder: SortOrder | undefined;
}
export interface CollapseConfiguration {
  DocumentAttributeKey: string | undefined;
  SortingConfigurations?: SortingConfiguration[] | undefined;
  MissingAttributeKeyStrategy?: MissingAttributeKeyStrategy | undefined;
  Expand?: boolean | undefined;
  ExpandConfiguration?: ExpandConfiguration | undefined;
}
export interface DocumentRelevanceConfiguration {
  Name: string | undefined;
  Relevance: Relevance | undefined;
}
export interface SpellCorrectionConfiguration {
  IncludeQuerySpellCheckSuggestions: boolean | undefined;
}
export interface FeaturedResultsItem {
  Id?: string | undefined;
  Type?: QueryResultType | undefined;
  AdditionalAttributes?: AdditionalResultAttribute[] | undefined;
  DocumentId?: string | undefined;
  DocumentTitle?: TextWithHighlights | undefined;
  DocumentExcerpt?: TextWithHighlights | undefined;
  DocumentURI?: string | undefined;
  DocumentAttributes?: DocumentAttribute[] | undefined;
  FeedbackToken?: string | undefined;
}
export interface ExpandedResultItem {
  Id?: string | undefined;
  DocumentId?: string | undefined;
  DocumentTitle?: TextWithHighlights | undefined;
  DocumentExcerpt?: TextWithHighlights | undefined;
  DocumentURI?: string | undefined;
  DocumentAttributes?: DocumentAttribute[] | undefined;
}
export interface CollapsedResultDetail {
  DocumentAttribute: DocumentAttribute | undefined;
  ExpandedResults?: ExpandedResultItem[] | undefined;
}
export interface ScoreAttributes {
  ScoreConfidence?: ScoreConfidence | undefined;
}
export interface TableCell {
  Value?: string | undefined;
  TopAnswer?: boolean | undefined;
  Highlighted?: boolean | undefined;
  Header?: boolean | undefined;
}
export interface TableRow {
  Cells?: TableCell[] | undefined;
}
export interface TableExcerpt {
  Rows?: TableRow[] | undefined;
  TotalNumberOfRows?: number | undefined;
}
export interface QueryResultItem {
  Id?: string | undefined;
  Type?: QueryResultType | undefined;
  Format?: QueryResultFormat | undefined;
  AdditionalAttributes?: AdditionalResultAttribute[] | undefined;
  DocumentId?: string | undefined;
  DocumentTitle?: TextWithHighlights | undefined;
  DocumentExcerpt?: TextWithHighlights | undefined;
  DocumentURI?: string | undefined;
  DocumentAttributes?: DocumentAttribute[] | undefined;
  ScoreAttributes?: ScoreAttributes | undefined;
  FeedbackToken?: string | undefined;
  TableExcerpt?: TableExcerpt | undefined;
  CollapsedResultDetail?: CollapsedResultDetail | undefined;
}
export interface Correction {
  BeginOffset?: number | undefined;
  EndOffset?: number | undefined;
  Term?: string | undefined;
  CorrectedTerm?: string | undefined;
}
export interface SpellCorrectedQuery {
  SuggestedQueryText?: string | undefined;
  Corrections?: Correction[] | undefined;
}
export interface Warning {
  Message?: string | undefined;
  Code?: WarningCode | undefined;
}
export interface RetrieveResultItem {
  Id?: string | undefined;
  DocumentId?: string | undefined;
  DocumentTitle?: string | undefined;
  Content?: string | undefined;
  DocumentURI?: string | undefined;
  DocumentAttributes?: DocumentAttribute[] | undefined;
  ScoreAttributes?: ScoreAttributes | undefined;
}
export interface RetrieveResult {
  QueryId?: string | undefined;
  ResultItems?: RetrieveResultItem[] | undefined;
}
export interface StartDataSourceSyncJobRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface StartDataSourceSyncJobResponse {
  ExecutionId?: string | undefined;
}
export interface StopDataSourceSyncJobRequest {
  Id: string | undefined;
  IndexId: string | undefined;
}
export interface ClickFeedback {
  ResultId: string | undefined;
  ClickTime: Date | undefined;
}
export interface RelevanceFeedback {
  ResultId: string | undefined;
  RelevanceValue: RelevanceType | undefined;
}
export interface SubmitFeedbackRequest {
  IndexId: string | undefined;
  QueryId: string | undefined;
  ClickFeedbackItems?: ClickFeedback[] | undefined;
  RelevanceFeedbackItems?: RelevanceFeedback[] | undefined;
}
export interface TagResourceRequest {
  ResourceARN: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagResourceResponse {}
export interface UntagResourceRequest {
  ResourceARN: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagResourceResponse {}
export interface UpdateAccessControlConfigurationRequest {
  IndexId: string | undefined;
  Id: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  AccessControlList?: Principal[] | undefined;
  HierarchicalAccessControlList?: HierarchicalPrincipal[] | undefined;
}
export interface UpdateAccessControlConfigurationResponse {}
export interface UpdateDataSourceRequest {
  Id: string | undefined;
  Name?: string | undefined;
  IndexId: string | undefined;
  Configuration?: DataSourceConfiguration | undefined;
  VpcConfiguration?: DataSourceVpcConfiguration | undefined;
  Description?: string | undefined;
  Schedule?: string | undefined;
  RoleArn?: string | undefined;
  LanguageCode?: string | undefined;
  CustomDocumentEnrichmentConfiguration?:
    | CustomDocumentEnrichmentConfiguration
    | undefined;
}
export interface UpdateExperienceRequest {
  Id: string | undefined;
  Name?: string | undefined;
  IndexId: string | undefined;
  RoleArn?: string | undefined;
  Configuration?: ExperienceConfiguration | undefined;
  Description?: string | undefined;
}
export interface UpdateFeaturedResultsSetRequest {
  IndexId: string | undefined;
  FeaturedResultsSetId: string | undefined;
  FeaturedResultsSetName?: string | undefined;
  Description?: string | undefined;
  Status?: FeaturedResultsSetStatus | undefined;
  QueryTexts?: string[] | undefined;
  FeaturedDocuments?: FeaturedDocument[] | undefined;
}
export interface UpdateFeaturedResultsSetResponse {
  FeaturedResultsSet?: FeaturedResultsSet | undefined;
}
export interface UpdateIndexRequest {
  Id: string | undefined;
  Name?: string | undefined;
  RoleArn?: string | undefined;
  Description?: string | undefined;
  DocumentMetadataConfigurationUpdates?:
    | DocumentMetadataConfiguration[]
    | undefined;
  CapacityUnits?: CapacityUnitsConfiguration | undefined;
  UserTokenConfigurations?: UserTokenConfiguration[] | undefined;
  UserContextPolicy?: UserContextPolicy | undefined;
  UserGroupResolutionConfiguration?:
    | UserGroupResolutionConfiguration
    | undefined;
}
export interface UpdateQuerySuggestionsBlockListRequest {
  IndexId: string | undefined;
  Id: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  SourceS3Path?: S3Path | undefined;
  RoleArn?: string | undefined;
}
export interface UpdateQuerySuggestionsConfigRequest {
  IndexId: string | undefined;
  Mode?: Mode | undefined;
  QueryLogLookBackWindowInDays?: number | undefined;
  IncludeQueriesWithoutUserInformation?: boolean | undefined;
  MinimumNumberOfQueryingUsers?: number | undefined;
  MinimumQueryCount?: number | undefined;
  AttributeSuggestionsConfig?: AttributeSuggestionsUpdateConfig | undefined;
}
export interface UpdateThesaurusRequest {
  Id: string | undefined;
  Name?: string | undefined;
  IndexId: string | undefined;
  Description?: string | undefined;
  RoleArn?: string | undefined;
  SourceS3Path?: S3Path | undefined;
}
export interface Facet {
  DocumentAttributeKey?: string | undefined;
  Facets?: Facet[] | undefined;
  MaxResults?: number | undefined;
}
export interface DocumentAttributeValueCountPair {
  DocumentAttributeValue?: DocumentAttributeValue | undefined;
  Count?: number | undefined;
  FacetResults?: FacetResult[] | undefined;
}
export interface FacetResult {
  DocumentAttributeKey?: string | undefined;
  DocumentAttributeValueType?: DocumentAttributeValueType | undefined;
  DocumentAttributeValueCountPairs?:
    | DocumentAttributeValueCountPair[]
    | undefined;
}
export interface AttributeFilter {
  AndAllFilters?: AttributeFilter[] | undefined;
  OrAllFilters?: AttributeFilter[] | undefined;
  NotFilter?: AttributeFilter | undefined;
  EqualsTo?: DocumentAttribute | undefined;
  ContainsAll?: DocumentAttribute | undefined;
  ContainsAny?: DocumentAttribute | undefined;
  GreaterThan?: DocumentAttribute | undefined;
  GreaterThanOrEquals?: DocumentAttribute | undefined;
  LessThan?: DocumentAttribute | undefined;
  LessThanOrEquals?: DocumentAttribute | undefined;
}
export interface QueryResult {
  QueryId?: string | undefined;
  ResultItems?: QueryResultItem[] | undefined;
  FacetResults?: FacetResult[] | undefined;
  TotalNumberOfResults?: number | undefined;
  Warnings?: Warning[] | undefined;
  SpellCorrectedQueries?: SpellCorrectedQuery[] | undefined;
  FeaturedResultsItems?: FeaturedResultsItem[] | undefined;
}
export interface AttributeSuggestionsGetConfig {
  SuggestionAttributes?: string[] | undefined;
  AdditionalResponseAttributes?: string[] | undefined;
  AttributeFilter?: AttributeFilter | undefined;
  UserContext?: UserContext | undefined;
}
export interface RetrieveRequest {
  IndexId: string | undefined;
  QueryText: string | undefined;
  AttributeFilter?: AttributeFilter | undefined;
  RequestedDocumentAttributes?: string[] | undefined;
  DocumentRelevanceOverrideConfigurations?:
    | DocumentRelevanceConfiguration[]
    | undefined;
  PageNumber?: number | undefined;
  PageSize?: number | undefined;
  UserContext?: UserContext | undefined;
}
export interface GetQuerySuggestionsRequest {
  IndexId: string | undefined;
  QueryText: string | undefined;
  MaxSuggestionsCount?: number | undefined;
  SuggestionTypes?: SuggestionType[] | undefined;
  AttributeSuggestionsConfig?: AttributeSuggestionsGetConfig | undefined;
}
export interface QueryRequest {
  IndexId: string | undefined;
  QueryText?: string | undefined;
  AttributeFilter?: AttributeFilter | undefined;
  Facets?: Facet[] | undefined;
  RequestedDocumentAttributes?: string[] | undefined;
  QueryResultTypeFilter?: QueryResultType | undefined;
  DocumentRelevanceOverrideConfigurations?:
    | DocumentRelevanceConfiguration[]
    | undefined;
  PageNumber?: number | undefined;
  PageSize?: number | undefined;
  SortingConfiguration?: SortingConfiguration | undefined;
  SortingConfigurations?: SortingConfiguration[] | undefined;
  UserContext?: UserContext | undefined;
  VisitorId?: string | undefined;
  SpellCorrectionConfiguration?: SpellCorrectionConfiguration | undefined;
  CollapseConfiguration?: CollapseConfiguration | undefined;
}
