import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { DocumentType as __DocumentType } from "@smithy/types";
import { KendraServiceException as __BaseException } from "./KendraServiceException";
export interface AccessControlConfigurationSummary {
  Id: string | undefined;
}
export interface AccessControlListConfiguration {
  KeyPath?: string | undefined;
}
export declare class AccessDeniedException extends __BaseException {
  readonly name: "AccessDeniedException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<AccessDeniedException, __BaseException>
  );
}
export interface AclConfiguration {
  AllowedGroupsColumnName: string | undefined;
}
export declare const HighlightType: {
  readonly STANDARD: "STANDARD";
  readonly THESAURUS_SYNONYM: "THESAURUS_SYNONYM";
};
export type HighlightType = (typeof HighlightType)[keyof typeof HighlightType];
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
export declare const AdditionalResultAttributeValueType: {
  readonly TEXT_WITH_HIGHLIGHTS_VALUE: "TEXT_WITH_HIGHLIGHTS_VALUE";
};
export type AdditionalResultAttributeValueType =
  (typeof AdditionalResultAttributeValueType)[keyof typeof AdditionalResultAttributeValueType];
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
export declare const AlfrescoEntity: {
  readonly blog: "blog";
  readonly documentLibrary: "documentLibrary";
  readonly wiki: "wiki";
};
export type AlfrescoEntity =
  (typeof AlfrescoEntity)[keyof typeof AlfrescoEntity];
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
export declare const EntityType: {
  readonly GROUP: "GROUP";
  readonly USER: "USER";
};
export type EntityType = (typeof EntityType)[keyof typeof EntityType];
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
export declare class InternalServerException extends __BaseException {
  readonly name: "InternalServerException";
  readonly $fault: "server";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InternalServerException, __BaseException>
  );
}
export declare class ResourceAlreadyExistException extends __BaseException {
  readonly name: "ResourceAlreadyExistException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceAlreadyExistException, __BaseException>
  );
}
export declare class ResourceNotFoundException extends __BaseException {
  readonly name: "ResourceNotFoundException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>
  );
}
export declare class ThrottlingException extends __BaseException {
  readonly name: "ThrottlingException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ThrottlingException, __BaseException>
  );
}
export declare class ValidationException extends __BaseException {
  readonly name: "ValidationException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ValidationException, __BaseException>
  );
}
export declare const Persona: {
  readonly OWNER: "OWNER";
  readonly VIEWER: "VIEWER";
};
export type Persona = (typeof Persona)[keyof typeof Persona];
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
export declare const AttributeSuggestionsMode: {
  readonly ACTIVE: "ACTIVE";
  readonly INACTIVE: "INACTIVE";
};
export type AttributeSuggestionsMode =
  (typeof AttributeSuggestionsMode)[keyof typeof AttributeSuggestionsMode];
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
export declare const ErrorCode: {
  readonly INTERNAL_ERROR: "InternalError";
  readonly INVALID_REQUEST: "InvalidRequest";
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
export interface BatchDeleteDocumentResponseFailedDocument {
  Id?: string | undefined;
  DataSourceId?: string | undefined;
  ErrorCode?: ErrorCode | undefined;
  ErrorMessage?: string | undefined;
}
export interface BatchDeleteDocumentResponse {
  FailedDocuments?: BatchDeleteDocumentResponseFailedDocument[] | undefined;
}
export declare class ConflictException extends __BaseException {
  readonly name: "ConflictException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
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
export declare const DocumentStatus: {
  readonly FAILED: "FAILED";
  readonly INDEXED: "INDEXED";
  readonly NOT_FOUND: "NOT_FOUND";
  readonly PROCESSING: "PROCESSING";
  readonly UPDATED: "UPDATED";
  readonly UPDATE_FAILED: "UPDATE_FAILED";
};
export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];
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
export declare const ConditionOperator: {
  readonly BeginsWith: "BeginsWith";
  readonly Contains: "Contains";
  readonly Equals: "Equals";
  readonly Exists: "Exists";
  readonly GreaterThan: "GreaterThan";
  readonly GreaterThanOrEquals: "GreaterThanOrEquals";
  readonly LessThan: "LessThan";
  readonly LessThanOrEquals: "LessThanOrEquals";
  readonly NotContains: "NotContains";
  readonly NotEquals: "NotEquals";
  readonly NotExists: "NotExists";
};
export type ConditionOperator =
  (typeof ConditionOperator)[keyof typeof ConditionOperator];
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
export declare const ReadAccessType: {
  readonly ALLOW: "ALLOW";
  readonly DENY: "DENY";
};
export type ReadAccessType =
  (typeof ReadAccessType)[keyof typeof ReadAccessType];
export declare const PrincipalType: {
  readonly GROUP: "GROUP";
  readonly USER: "USER";
};
export type PrincipalType = (typeof PrincipalType)[keyof typeof PrincipalType];
export interface Principal {
  Name: string | undefined;
  Type: PrincipalType | undefined;
  Access: ReadAccessType | undefined;
  DataSourceId?: string | undefined;
}
export declare const ContentType: {
  readonly CSV: "CSV";
  readonly HTML: "HTML";
  readonly JSON: "JSON";
  readonly MD: "MD";
  readonly MS_EXCEL: "MS_EXCEL";
  readonly MS_WORD: "MS_WORD";
  readonly PDF: "PDF";
  readonly PLAIN_TEXT: "PLAIN_TEXT";
  readonly PPT: "PPT";
  readonly RTF: "RTF";
  readonly XML: "XML";
  readonly XSLT: "XSLT";
};
export type ContentType = (typeof ContentType)[keyof typeof ContentType];
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
export declare class ServiceQuotaExceededException extends __BaseException {
  readonly name: "ServiceQuotaExceededException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ServiceQuotaExceededException, __BaseException>
  );
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
export declare const ConfluenceAttachmentFieldName: {
  readonly AUTHOR: "AUTHOR";
  readonly CONTENT_TYPE: "CONTENT_TYPE";
  readonly CREATED_DATE: "CREATED_DATE";
  readonly DISPLAY_URL: "DISPLAY_URL";
  readonly FILE_SIZE: "FILE_SIZE";
  readonly ITEM_TYPE: "ITEM_TYPE";
  readonly PARENT_ID: "PARENT_ID";
  readonly SPACE_KEY: "SPACE_KEY";
  readonly SPACE_NAME: "SPACE_NAME";
  readonly URL: "URL";
  readonly VERSION: "VERSION";
};
export type ConfluenceAttachmentFieldName =
  (typeof ConfluenceAttachmentFieldName)[keyof typeof ConfluenceAttachmentFieldName];
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
export declare const ConfluenceAuthenticationType: {
  readonly HTTP_BASIC: "HTTP_BASIC";
  readonly PAT: "PAT";
};
export type ConfluenceAuthenticationType =
  (typeof ConfluenceAuthenticationType)[keyof typeof ConfluenceAuthenticationType];
export declare const ConfluenceBlogFieldName: {
  readonly AUTHOR: "AUTHOR";
  readonly DISPLAY_URL: "DISPLAY_URL";
  readonly ITEM_TYPE: "ITEM_TYPE";
  readonly LABELS: "LABELS";
  readonly PUBLISH_DATE: "PUBLISH_DATE";
  readonly SPACE_KEY: "SPACE_KEY";
  readonly SPACE_NAME: "SPACE_NAME";
  readonly URL: "URL";
  readonly VERSION: "VERSION";
};
export type ConfluenceBlogFieldName =
  (typeof ConfluenceBlogFieldName)[keyof typeof ConfluenceBlogFieldName];
export interface ConfluenceBlogToIndexFieldMapping {
  DataSourceFieldName?: ConfluenceBlogFieldName | undefined;
  DateFieldFormat?: string | undefined;
  IndexFieldName?: string | undefined;
}
export interface ConfluenceBlogConfiguration {
  BlogFieldMappings?: ConfluenceBlogToIndexFieldMapping[] | undefined;
}
export declare const ConfluencePageFieldName: {
  readonly AUTHOR: "AUTHOR";
  readonly CONTENT_STATUS: "CONTENT_STATUS";
  readonly CREATED_DATE: "CREATED_DATE";
  readonly DISPLAY_URL: "DISPLAY_URL";
  readonly ITEM_TYPE: "ITEM_TYPE";
  readonly LABELS: "LABELS";
  readonly MODIFIED_DATE: "MODIFIED_DATE";
  readonly PARENT_ID: "PARENT_ID";
  readonly SPACE_KEY: "SPACE_KEY";
  readonly SPACE_NAME: "SPACE_NAME";
  readonly URL: "URL";
  readonly VERSION: "VERSION";
};
export type ConfluencePageFieldName =
  (typeof ConfluencePageFieldName)[keyof typeof ConfluencePageFieldName];
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
export declare const ConfluenceSpaceFieldName: {
  readonly DISPLAY_URL: "DISPLAY_URL";
  readonly ITEM_TYPE: "ITEM_TYPE";
  readonly SPACE_KEY: "SPACE_KEY";
  readonly URL: "URL";
};
export type ConfluenceSpaceFieldName =
  (typeof ConfluenceSpaceFieldName)[keyof typeof ConfluenceSpaceFieldName];
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
export declare const ConfluenceVersion: {
  readonly CLOUD: "CLOUD";
  readonly SERVER: "SERVER";
};
export type ConfluenceVersion =
  (typeof ConfluenceVersion)[keyof typeof ConfluenceVersion];
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
export declare const DatabaseEngineType: {
  readonly RDS_AURORA_MYSQL: "RDS_AURORA_MYSQL";
  readonly RDS_AURORA_POSTGRESQL: "RDS_AURORA_POSTGRESQL";
  readonly RDS_MYSQL: "RDS_MYSQL";
  readonly RDS_POSTGRESQL: "RDS_POSTGRESQL";
};
export type DatabaseEngineType =
  (typeof DatabaseEngineType)[keyof typeof DatabaseEngineType];
export declare const QueryIdentifiersEnclosingOption: {
  readonly DOUBLE_QUOTES: "DOUBLE_QUOTES";
  readonly NONE: "NONE";
};
export type QueryIdentifiersEnclosingOption =
  (typeof QueryIdentifiersEnclosingOption)[keyof typeof QueryIdentifiersEnclosingOption];
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
export declare const FsxFileSystemType: {
  readonly WINDOWS: "WINDOWS";
};
export type FsxFileSystemType =
  (typeof FsxFileSystemType)[keyof typeof FsxFileSystemType];
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
export declare const Type: {
  readonly ON_PREMISE: "ON_PREMISE";
  readonly SAAS: "SAAS";
};
export type Type = (typeof Type)[keyof typeof Type];
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
export declare const IssueSubEntity: {
  readonly ATTACHMENTS: "ATTACHMENTS";
  readonly COMMENTS: "COMMENTS";
  readonly WORKLOGS: "WORKLOGS";
};
export type IssueSubEntity =
  (typeof IssueSubEntity)[keyof typeof IssueSubEntity];
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
export declare const SalesforceChatterFeedIncludeFilterType: {
  readonly ACTIVE_USER: "ACTIVE_USER";
  readonly STANDARD_USER: "STANDARD_USER";
};
export type SalesforceChatterFeedIncludeFilterType =
  (typeof SalesforceChatterFeedIncludeFilterType)[keyof typeof SalesforceChatterFeedIncludeFilterType];
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
export declare const SalesforceKnowledgeArticleState: {
  readonly ARCHIVED: "ARCHIVED";
  readonly DRAFT: "DRAFT";
  readonly PUBLISHED: "PUBLISHED";
};
export type SalesforceKnowledgeArticleState =
  (typeof SalesforceKnowledgeArticleState)[keyof typeof SalesforceKnowledgeArticleState];
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
export declare const SalesforceStandardObjectName: {
  readonly ACCOUNT: "ACCOUNT";
  readonly CAMPAIGN: "CAMPAIGN";
  readonly CASE: "CASE";
  readonly CONTACT: "CONTACT";
  readonly CONTRACT: "CONTRACT";
  readonly DOCUMENT: "DOCUMENT";
  readonly GROUP: "GROUP";
  readonly IDEA: "IDEA";
  readonly LEAD: "LEAD";
  readonly OPPORTUNITY: "OPPORTUNITY";
  readonly PARTNER: "PARTNER";
  readonly PRICEBOOK: "PRICEBOOK";
  readonly PRODUCT: "PRODUCT";
  readonly PROFILE: "PROFILE";
  readonly SOLUTION: "SOLUTION";
  readonly TASK: "TASK";
  readonly USER: "USER";
};
export type SalesforceStandardObjectName =
  (typeof SalesforceStandardObjectName)[keyof typeof SalesforceStandardObjectName];
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
export declare const ServiceNowAuthenticationType: {
  readonly HTTP_BASIC: "HTTP_BASIC";
  readonly OAUTH2: "OAUTH2";
};
export type ServiceNowAuthenticationType =
  (typeof ServiceNowAuthenticationType)[keyof typeof ServiceNowAuthenticationType];
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
export declare const ServiceNowBuildVersionType: {
  readonly LONDON: "LONDON";
  readonly OTHERS: "OTHERS";
};
export type ServiceNowBuildVersionType =
  (typeof ServiceNowBuildVersionType)[keyof typeof ServiceNowBuildVersionType];
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
export declare const SharePointOnlineAuthenticationType: {
  readonly HTTP_BASIC: "HTTP_BASIC";
  readonly OAUTH2: "OAUTH2";
};
export type SharePointOnlineAuthenticationType =
  (typeof SharePointOnlineAuthenticationType)[keyof typeof SharePointOnlineAuthenticationType];
export declare const SharePointVersion: {
  readonly SHAREPOINT_2013: "SHAREPOINT_2013";
  readonly SHAREPOINT_2016: "SHAREPOINT_2016";
  readonly SHAREPOINT_2019: "SHAREPOINT_2019";
  readonly SHAREPOINT_ONLINE: "SHAREPOINT_ONLINE";
};
export type SharePointVersion =
  (typeof SharePointVersion)[keyof typeof SharePointVersion];
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
export declare const SlackEntity: {
  readonly DIRECT_MESSAGE: "DIRECT_MESSAGE";
  readonly GROUP_MESSAGE: "GROUP_MESSAGE";
  readonly PRIVATE_CHANNEL: "PRIVATE_CHANNEL";
  readonly PUBLIC_CHANNEL: "PUBLIC_CHANNEL";
};
export type SlackEntity = (typeof SlackEntity)[keyof typeof SlackEntity];
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
export declare const WebCrawlerMode: {
  readonly EVERYTHING: "EVERYTHING";
  readonly HOST_ONLY: "HOST_ONLY";
  readonly SUBDOMAINS: "SUBDOMAINS";
};
export type WebCrawlerMode =
  (typeof WebCrawlerMode)[keyof typeof WebCrawlerMode];
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
export declare const DataSourceType: {
  readonly ALFRESCO: "ALFRESCO";
  readonly BOX: "BOX";
  readonly CONFLUENCE: "CONFLUENCE";
  readonly CUSTOM: "CUSTOM";
  readonly DATABASE: "DATABASE";
  readonly FSX: "FSX";
  readonly GITHUB: "GITHUB";
  readonly GOOGLEDRIVE: "GOOGLEDRIVE";
  readonly JIRA: "JIRA";
  readonly ONEDRIVE: "ONEDRIVE";
  readonly QUIP: "QUIP";
  readonly S3: "S3";
  readonly SALESFORCE: "SALESFORCE";
  readonly SERVICENOW: "SERVICENOW";
  readonly SHAREPOINT: "SHAREPOINT";
  readonly SLACK: "SLACK";
  readonly TEMPLATE: "TEMPLATE";
  readonly WEBCRAWLER: "WEBCRAWLER";
  readonly WORKDOCS: "WORKDOCS";
};
export type DataSourceType =
  (typeof DataSourceType)[keyof typeof DataSourceType];
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
export declare const FaqFileFormat: {
  readonly CSV: "CSV";
  readonly CSV_WITH_HEADER: "CSV_WITH_HEADER";
  readonly JSON: "JSON";
};
export type FaqFileFormat = (typeof FaqFileFormat)[keyof typeof FaqFileFormat];
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
export declare const FeaturedResultsSetStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly INACTIVE: "INACTIVE";
};
export type FeaturedResultsSetStatus =
  (typeof FeaturedResultsSetStatus)[keyof typeof FeaturedResultsSetStatus];
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
export declare class FeaturedResultsConflictException extends __BaseException {
  readonly name: "FeaturedResultsConflictException";
  readonly $fault: "client";
  Message?: string | undefined;
  ConflictingItems?: ConflictingItem[] | undefined;
  constructor(
    opts: __ExceptionOptionType<
      FeaturedResultsConflictException,
      __BaseException
    >
  );
}
export declare const IndexEdition: {
  readonly DEVELOPER_EDITION: "DEVELOPER_EDITION";
  readonly ENTERPRISE_EDITION: "ENTERPRISE_EDITION";
  readonly GEN_AI_ENTERPRISE_EDITION: "GEN_AI_ENTERPRISE_EDITION";
};
export type IndexEdition = (typeof IndexEdition)[keyof typeof IndexEdition];
export interface ServerSideEncryptionConfiguration {
  KmsKeyId?: string | undefined;
}
export declare const UserContextPolicy: {
  readonly ATTRIBUTE_FILTER: "ATTRIBUTE_FILTER";
  readonly USER_TOKEN: "USER_TOKEN";
};
export type UserContextPolicy =
  (typeof UserContextPolicy)[keyof typeof UserContextPolicy];
export declare const UserGroupResolutionMode: {
  readonly AWS_SSO: "AWS_SSO";
  readonly NONE: "NONE";
};
export type UserGroupResolutionMode =
  (typeof UserGroupResolutionMode)[keyof typeof UserGroupResolutionMode];
export interface UserGroupResolutionConfiguration {
  UserGroupResolutionMode: UserGroupResolutionMode | undefined;
}
export interface JsonTokenTypeConfiguration {
  UserNameAttributeField: string | undefined;
  GroupAttributeField: string | undefined;
}
export declare const KeyLocation: {
  readonly SECRET_MANAGER: "SECRET_MANAGER";
  readonly URL: "URL";
};
export type KeyLocation = (typeof KeyLocation)[keyof typeof KeyLocation];
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
export declare const DataSourceStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly UPDATING: "UPDATING";
};
export type DataSourceStatus =
  (typeof DataSourceStatus)[keyof typeof DataSourceStatus];
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
export declare const EndpointType: {
  readonly HOME: "HOME";
};
export type EndpointType = (typeof EndpointType)[keyof typeof EndpointType];
export interface ExperienceEndpoint {
  EndpointType?: EndpointType | undefined;
  Endpoint?: string | undefined;
}
export declare const ExperienceStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
};
export type ExperienceStatus =
  (typeof ExperienceStatus)[keyof typeof ExperienceStatus];
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
export declare const FaqStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly UPDATING: "UPDATING";
};
export type FaqStatus = (typeof FaqStatus)[keyof typeof FaqStatus];
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
export declare const Order: {
  readonly ASCENDING: "ASCENDING";
  readonly DESCENDING: "DESCENDING";
};
export type Order = (typeof Order)[keyof typeof Order];
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
export declare const DocumentAttributeValueType: {
  readonly DATE_VALUE: "DATE_VALUE";
  readonly LONG_VALUE: "LONG_VALUE";
  readonly STRING_LIST_VALUE: "STRING_LIST_VALUE";
  readonly STRING_VALUE: "STRING_VALUE";
};
export type DocumentAttributeValueType =
  (typeof DocumentAttributeValueType)[keyof typeof DocumentAttributeValueType];
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
export declare const IndexStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly SYSTEM_UPDATING: "SYSTEM_UPDATING";
  readonly UPDATING: "UPDATING";
};
export type IndexStatus = (typeof IndexStatus)[keyof typeof IndexStatus];
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
export declare const PrincipalMappingStatus: {
  readonly DELETED: "DELETED";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly PROCESSING: "PROCESSING";
  readonly SUCCEEDED: "SUCCEEDED";
};
export type PrincipalMappingStatus =
  (typeof PrincipalMappingStatus)[keyof typeof PrincipalMappingStatus];
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
export declare const QuerySuggestionsBlockListStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly ACTIVE_BUT_UPDATE_FAILED: "ACTIVE_BUT_UPDATE_FAILED";
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly UPDATING: "UPDATING";
};
export type QuerySuggestionsBlockListStatus =
  (typeof QuerySuggestionsBlockListStatus)[keyof typeof QuerySuggestionsBlockListStatus];
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
export declare const Mode: {
  readonly ENABLED: "ENABLED";
  readonly LEARN_ONLY: "LEARN_ONLY";
};
export type Mode = (typeof Mode)[keyof typeof Mode];
export declare const QuerySuggestionsStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly UPDATING: "UPDATING";
};
export type QuerySuggestionsStatus =
  (typeof QuerySuggestionsStatus)[keyof typeof QuerySuggestionsStatus];
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
export declare const ThesaurusStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly ACTIVE_BUT_UPDATE_FAILED: "ACTIVE_BUT_UPDATE_FAILED";
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly UPDATING: "UPDATING";
};
export type ThesaurusStatus =
  (typeof ThesaurusStatus)[keyof typeof ThesaurusStatus];
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
export declare const SuggestionType: {
  readonly DOCUMENT_ATTRIBUTES: "DOCUMENT_ATTRIBUTES";
  readonly QUERY: "QUERY";
};
export type SuggestionType =
  (typeof SuggestionType)[keyof typeof SuggestionType];
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
export declare const Interval: {
  readonly ONE_MONTH_AGO: "ONE_MONTH_AGO";
  readonly ONE_WEEK_AGO: "ONE_WEEK_AGO";
  readonly THIS_MONTH: "THIS_MONTH";
  readonly THIS_WEEK: "THIS_WEEK";
  readonly TWO_MONTHS_AGO: "TWO_MONTHS_AGO";
  readonly TWO_WEEKS_AGO: "TWO_WEEKS_AGO";
};
export type Interval = (typeof Interval)[keyof typeof Interval];
export declare const MetricType: {
  readonly AGG_QUERY_DOC_METRICS: "AGG_QUERY_DOC_METRICS";
  readonly DOCS_BY_CLICK_COUNT: "DOCS_BY_CLICK_COUNT";
  readonly QUERIES_BY_COUNT: "QUERIES_BY_COUNT";
  readonly QUERIES_BY_ZERO_CLICK_RATE: "QUERIES_BY_ZERO_CLICK_RATE";
  readonly QUERIES_BY_ZERO_RESULT_RATE: "QUERIES_BY_ZERO_RESULT_RATE";
  readonly TREND_QUERY_DOC_METRICS: "TREND_QUERY_DOC_METRICS";
};
export type MetricType = (typeof MetricType)[keyof typeof MetricType];
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
export declare class InvalidRequestException extends __BaseException {
  readonly name: "InvalidRequestException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidRequestException, __BaseException>
  );
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
export declare const DataSourceSyncJobStatus: {
  readonly ABORTED: "ABORTED";
  readonly FAILED: "FAILED";
  readonly INCOMPLETE: "INCOMPLETE";
  readonly STOPPING: "STOPPING";
  readonly SUCCEEDED: "SUCCEEDED";
  readonly SYNCING: "SYNCING";
  readonly SYNCING_INDEXING: "SYNCING_INDEXING";
};
export type DataSourceSyncJobStatus =
  (typeof DataSourceSyncJobStatus)[keyof typeof DataSourceSyncJobStatus];
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
export declare class ResourceUnavailableException extends __BaseException {
  readonly name: "ResourceUnavailableException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceUnavailableException, __BaseException>
  );
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
export declare const MissingAttributeKeyStrategy: {
  readonly COLLAPSE: "COLLAPSE";
  readonly EXPAND: "EXPAND";
  readonly IGNORE: "IGNORE";
};
export type MissingAttributeKeyStrategy =
  (typeof MissingAttributeKeyStrategy)[keyof typeof MissingAttributeKeyStrategy];
export declare const SortOrder: {
  readonly ASC: "ASC";
  readonly DESC: "DESC";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
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
export declare const QueryResultType: {
  readonly ANSWER: "ANSWER";
  readonly DOCUMENT: "DOCUMENT";
  readonly QUESTION_ANSWER: "QUESTION_ANSWER";
};
export type QueryResultType =
  (typeof QueryResultType)[keyof typeof QueryResultType];
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
export declare const QueryResultFormat: {
  readonly TABLE: "TABLE";
  readonly TEXT: "TEXT";
};
export type QueryResultFormat =
  (typeof QueryResultFormat)[keyof typeof QueryResultFormat];
export declare const ServerSideEncryptionConfigurationFilterSensitiveLog: (
  obj: ServerSideEncryptionConfiguration
) => any;
export declare const CreateIndexRequestFilterSensitiveLog: (
  obj: CreateIndexRequest
) => any;
export declare const DescribeIndexResponseFilterSensitiveLog: (
  obj: DescribeIndexResponse
) => any;
export declare const EntityDisplayDataFilterSensitiveLog: (
  obj: EntityDisplayData
) => any;
export declare const ExperienceEntitiesSummaryFilterSensitiveLog: (
  obj: ExperienceEntitiesSummary
) => any;
export declare const ListExperienceEntitiesResponseFilterSensitiveLog: (
  obj: ListExperienceEntitiesResponse
) => any;
