import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { KendraServiceException as __BaseException } from "./KendraServiceException";
import {
  AdditionalResultAttribute,
  AttributeSuggestionsUpdateConfig,
  CapacityUnitsConfiguration,
  CollapseConfiguration,
  CollapsedResultDetail,
  CustomDocumentEnrichmentConfiguration,
  DataSourceConfiguration,
  DataSourceVpcConfiguration,
  DocumentAttribute,
  DocumentAttributeValue,
  DocumentAttributeValueType,
  DocumentMetadataConfiguration,
  DocumentRelevanceConfiguration,
  ExperienceConfiguration,
  FeaturedDocument,
  FeaturedResultsItem,
  FeaturedResultsSet,
  FeaturedResultsSetStatus,
  HierarchicalPrincipal,
  Mode,
  Principal,
  QueryResultFormat,
  QueryResultType,
  S3Path,
  SortingConfiguration,
  SpellCorrectionConfiguration,
  SuggestionType,
  Tag,
  TextWithHighlights,
  UserContext,
  UserContextPolicy,
  UserGroupResolutionConfiguration,
  UserTokenConfiguration,
} from "./models_0";
export declare const ScoreConfidence: {
  readonly HIGH: "HIGH";
  readonly LOW: "LOW";
  readonly MEDIUM: "MEDIUM";
  readonly NOT_AVAILABLE: "NOT_AVAILABLE";
  readonly VERY_HIGH: "VERY_HIGH";
};
export type ScoreConfidence =
  (typeof ScoreConfidence)[keyof typeof ScoreConfidence];
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
export declare const WarningCode: {
  readonly QUERY_LANGUAGE_INVALID_SYNTAX: "QUERY_LANGUAGE_INVALID_SYNTAX";
};
export type WarningCode = (typeof WarningCode)[keyof typeof WarningCode];
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
export declare class ResourceInUseException extends __BaseException {
  readonly name: "ResourceInUseException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceInUseException, __BaseException>
  );
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
export declare const RelevanceType: {
  readonly NOT_RELEVANT: "NOT_RELEVANT";
  readonly RELEVANT: "RELEVANT";
};
export type RelevanceType = (typeof RelevanceType)[keyof typeof RelevanceType];
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
