import { DocumentType as __DocumentType } from "@smithy/types";
import {
  AsyncInvokeStatus,
  AudioFormat,
  CachePointType,
  CacheTTL,
  ConversationRole,
  DocumentFormat,
  GuardrailAction,
  GuardrailAutomatedReasoningLogicWarningType,
  GuardrailContentFilterConfidence,
  GuardrailContentFilterStrength,
  GuardrailContentFilterType,
  GuardrailContentPolicyAction,
  GuardrailContentQualifier,
  GuardrailContentSource,
  GuardrailContextualGroundingFilterType,
  GuardrailContextualGroundingPolicyAction,
  GuardrailConverseContentQualifier,
  GuardrailConverseImageFormat,
  GuardrailImageFormat,
  GuardrailManagedWordType,
  GuardrailOrigin,
  GuardrailOutputScope,
  GuardrailOwnership,
  GuardrailPiiEntityType,
  GuardrailSensitiveInformationPolicyAction,
  GuardrailStreamProcessingMode,
  GuardrailTopicPolicyAction,
  GuardrailTopicType,
  GuardrailTrace,
  GuardrailWordPolicyAction,
  ImageFormat,
  OutputFormatType,
  PerformanceConfigLatency,
  ServiceTierType,
  SortAsyncInvocationBy,
  SortOrder,
  StopReason,
  ToolResultStatus,
  ToolUseType,
  Trace,
  VideoFormat,
} from "./enums";
import {
  InternalServerException,
  ModelStreamErrorException,
  ModelTimeoutException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
} from "./errors";
export interface GetAsyncInvokeRequest {
  invocationArn: string | undefined;
}
export interface AsyncInvokeS3OutputDataConfig {
  s3Uri: string | undefined;
  kmsKeyId?: string | undefined;
  bucketOwner?: string | undefined;
}
export type AsyncInvokeOutputDataConfig =
  | AsyncInvokeOutputDataConfig.S3OutputDataConfigMember
  | AsyncInvokeOutputDataConfig.$UnknownMember;
export declare namespace AsyncInvokeOutputDataConfig {
  interface S3OutputDataConfigMember {
    s3OutputDataConfig: AsyncInvokeS3OutputDataConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    s3OutputDataConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    s3OutputDataConfig: (value: AsyncInvokeS3OutputDataConfig) => T;
    _: (name: string, value: any) => T;
  }
}
export interface GetAsyncInvokeResponse {
  invocationArn: string | undefined;
  modelArn: string | undefined;
  clientRequestToken?: string | undefined;
  status: AsyncInvokeStatus | undefined;
  failureMessage?: string | undefined;
  submitTime: Date | undefined;
  lastModifiedTime?: Date | undefined;
  endTime?: Date | undefined;
  outputDataConfig: AsyncInvokeOutputDataConfig | undefined;
}
export interface ListAsyncInvokesRequest {
  submitTimeAfter?: Date | undefined;
  submitTimeBefore?: Date | undefined;
  statusEquals?: AsyncInvokeStatus | undefined;
  maxResults?: number | undefined;
  nextToken?: string | undefined;
  sortBy?: SortAsyncInvocationBy | undefined;
  sortOrder?: SortOrder | undefined;
}
export interface AsyncInvokeSummary {
  invocationArn: string | undefined;
  modelArn: string | undefined;
  clientRequestToken?: string | undefined;
  status?: AsyncInvokeStatus | undefined;
  failureMessage?: string | undefined;
  submitTime: Date | undefined;
  lastModifiedTime?: Date | undefined;
  endTime?: Date | undefined;
  outputDataConfig: AsyncInvokeOutputDataConfig | undefined;
}
export interface ListAsyncInvokesResponse {
  nextToken?: string | undefined;
  asyncInvokeSummaries?: AsyncInvokeSummary[] | undefined;
}
export interface Tag {
  key: string | undefined;
  value: string | undefined;
}
export interface StartAsyncInvokeRequest {
  clientRequestToken?: string | undefined;
  modelId: string | undefined;
  modelInput: __DocumentType | undefined;
  outputDataConfig: AsyncInvokeOutputDataConfig | undefined;
  tags?: Tag[] | undefined;
}
export interface StartAsyncInvokeResponse {
  invocationArn: string | undefined;
}
export type GuardrailImageSource =
  | GuardrailImageSource.BytesMember
  | GuardrailImageSource.$UnknownMember;
export declare namespace GuardrailImageSource {
  interface BytesMember {
    bytes: Uint8Array;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    _: (name: string, value: any) => T;
  }
}
export interface GuardrailImageBlock {
  format: GuardrailImageFormat | undefined;
  source: GuardrailImageSource | undefined;
}
export interface GuardrailTextBlock {
  text: string | undefined;
  qualifiers?: GuardrailContentQualifier[] | undefined;
}
export type GuardrailContentBlock =
  | GuardrailContentBlock.ImageMember
  | GuardrailContentBlock.TextMember
  | GuardrailContentBlock.$UnknownMember;
export declare namespace GuardrailContentBlock {
  interface TextMember {
    text: GuardrailTextBlock;
    image?: never;
    $unknown?: never;
  }
  interface ImageMember {
    text?: never;
    image: GuardrailImageBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    image?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: GuardrailTextBlock) => T;
    image: (value: GuardrailImageBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ApplyGuardrailRequest {
  guardrailIdentifier: string | undefined;
  guardrailVersion: string | undefined;
  source: GuardrailContentSource | undefined;
  content: GuardrailContentBlock[] | undefined;
  outputScope?: GuardrailOutputScope | undefined;
}
export interface AppliedGuardrailDetails {
  guardrailId?: string | undefined;
  guardrailVersion?: string | undefined;
  guardrailArn?: string | undefined;
  guardrailOrigin?: GuardrailOrigin[] | undefined;
  guardrailOwnership?: GuardrailOwnership | undefined;
}
export interface GuardrailAutomatedReasoningRule {
  identifier?: string | undefined;
  policyVersionArn?: string | undefined;
}
export interface GuardrailAutomatedReasoningStatement {
  logic?: string | undefined;
  naturalLanguage?: string | undefined;
}
export interface GuardrailAutomatedReasoningLogicWarning {
  type?: GuardrailAutomatedReasoningLogicWarningType | undefined;
  premises?: GuardrailAutomatedReasoningStatement[] | undefined;
  claims?: GuardrailAutomatedReasoningStatement[] | undefined;
}
export interface GuardrailAutomatedReasoningInputTextReference {
  text?: string | undefined;
}
export interface GuardrailAutomatedReasoningTranslation {
  premises?: GuardrailAutomatedReasoningStatement[] | undefined;
  claims?: GuardrailAutomatedReasoningStatement[] | undefined;
  untranslatedPremises?:
    | GuardrailAutomatedReasoningInputTextReference[]
    | undefined;
  untranslatedClaims?:
    | GuardrailAutomatedReasoningInputTextReference[]
    | undefined;
  confidence?: number | undefined;
}
export interface GuardrailAutomatedReasoningImpossibleFinding {
  translation?: GuardrailAutomatedReasoningTranslation | undefined;
  contradictingRules?: GuardrailAutomatedReasoningRule[] | undefined;
  logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
export interface GuardrailAutomatedReasoningInvalidFinding {
  translation?: GuardrailAutomatedReasoningTranslation | undefined;
  contradictingRules?: GuardrailAutomatedReasoningRule[] | undefined;
  logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
export interface GuardrailAutomatedReasoningNoTranslationsFinding {}
export interface GuardrailAutomatedReasoningScenario {
  statements?: GuardrailAutomatedReasoningStatement[] | undefined;
}
export interface GuardrailAutomatedReasoningSatisfiableFinding {
  translation?: GuardrailAutomatedReasoningTranslation | undefined;
  claimsTrueScenario?: GuardrailAutomatedReasoningScenario | undefined;
  claimsFalseScenario?: GuardrailAutomatedReasoningScenario | undefined;
  logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
export interface GuardrailAutomatedReasoningTooComplexFinding {}
export interface GuardrailAutomatedReasoningTranslationOption {
  translations?: GuardrailAutomatedReasoningTranslation[] | undefined;
}
export interface GuardrailAutomatedReasoningTranslationAmbiguousFinding {
  options?: GuardrailAutomatedReasoningTranslationOption[] | undefined;
  differenceScenarios?: GuardrailAutomatedReasoningScenario[] | undefined;
}
export interface GuardrailAutomatedReasoningValidFinding {
  translation?: GuardrailAutomatedReasoningTranslation | undefined;
  claimsTrueScenario?: GuardrailAutomatedReasoningScenario | undefined;
  supportingRules?: GuardrailAutomatedReasoningRule[] | undefined;
  logicWarning?: GuardrailAutomatedReasoningLogicWarning | undefined;
}
export type GuardrailAutomatedReasoningFinding =
  | GuardrailAutomatedReasoningFinding.ImpossibleMember
  | GuardrailAutomatedReasoningFinding.InvalidMember
  | GuardrailAutomatedReasoningFinding.NoTranslationsMember
  | GuardrailAutomatedReasoningFinding.SatisfiableMember
  | GuardrailAutomatedReasoningFinding.TooComplexMember
  | GuardrailAutomatedReasoningFinding.TranslationAmbiguousMember
  | GuardrailAutomatedReasoningFinding.ValidMember
  | GuardrailAutomatedReasoningFinding.$UnknownMember;
export declare namespace GuardrailAutomatedReasoningFinding {
  interface ValidMember {
    valid: GuardrailAutomatedReasoningValidFinding;
    invalid?: never;
    satisfiable?: never;
    impossible?: never;
    translationAmbiguous?: never;
    tooComplex?: never;
    noTranslations?: never;
    $unknown?: never;
  }
  interface InvalidMember {
    valid?: never;
    invalid: GuardrailAutomatedReasoningInvalidFinding;
    satisfiable?: never;
    impossible?: never;
    translationAmbiguous?: never;
    tooComplex?: never;
    noTranslations?: never;
    $unknown?: never;
  }
  interface SatisfiableMember {
    valid?: never;
    invalid?: never;
    satisfiable: GuardrailAutomatedReasoningSatisfiableFinding;
    impossible?: never;
    translationAmbiguous?: never;
    tooComplex?: never;
    noTranslations?: never;
    $unknown?: never;
  }
  interface ImpossibleMember {
    valid?: never;
    invalid?: never;
    satisfiable?: never;
    impossible: GuardrailAutomatedReasoningImpossibleFinding;
    translationAmbiguous?: never;
    tooComplex?: never;
    noTranslations?: never;
    $unknown?: never;
  }
  interface TranslationAmbiguousMember {
    valid?: never;
    invalid?: never;
    satisfiable?: never;
    impossible?: never;
    translationAmbiguous: GuardrailAutomatedReasoningTranslationAmbiguousFinding;
    tooComplex?: never;
    noTranslations?: never;
    $unknown?: never;
  }
  interface TooComplexMember {
    valid?: never;
    invalid?: never;
    satisfiable?: never;
    impossible?: never;
    translationAmbiguous?: never;
    tooComplex: GuardrailAutomatedReasoningTooComplexFinding;
    noTranslations?: never;
    $unknown?: never;
  }
  interface NoTranslationsMember {
    valid?: never;
    invalid?: never;
    satisfiable?: never;
    impossible?: never;
    translationAmbiguous?: never;
    tooComplex?: never;
    noTranslations: GuardrailAutomatedReasoningNoTranslationsFinding;
    $unknown?: never;
  }
  interface $UnknownMember {
    valid?: never;
    invalid?: never;
    satisfiable?: never;
    impossible?: never;
    translationAmbiguous?: never;
    tooComplex?: never;
    noTranslations?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    valid: (value: GuardrailAutomatedReasoningValidFinding) => T;
    invalid: (value: GuardrailAutomatedReasoningInvalidFinding) => T;
    satisfiable: (value: GuardrailAutomatedReasoningSatisfiableFinding) => T;
    impossible: (value: GuardrailAutomatedReasoningImpossibleFinding) => T;
    translationAmbiguous: (
      value: GuardrailAutomatedReasoningTranslationAmbiguousFinding
    ) => T;
    tooComplex: (value: GuardrailAutomatedReasoningTooComplexFinding) => T;
    noTranslations: (
      value: GuardrailAutomatedReasoningNoTranslationsFinding
    ) => T;
    _: (name: string, value: any) => T;
  }
}
export interface GuardrailAutomatedReasoningPolicyAssessment {
  findings?: GuardrailAutomatedReasoningFinding[] | undefined;
}
export interface GuardrailContentFilter {
  type: GuardrailContentFilterType | undefined;
  confidence: GuardrailContentFilterConfidence | undefined;
  filterStrength?: GuardrailContentFilterStrength | undefined;
  action: GuardrailContentPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailContentPolicyAssessment {
  filters: GuardrailContentFilter[] | undefined;
}
export interface GuardrailContextualGroundingFilter {
  type: GuardrailContextualGroundingFilterType | undefined;
  threshold: number | undefined;
  score: number | undefined;
  action: GuardrailContextualGroundingPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailContextualGroundingPolicyAssessment {
  filters?: GuardrailContextualGroundingFilter[] | undefined;
}
export interface GuardrailImageCoverage {
  guarded?: number | undefined;
  total?: number | undefined;
}
export interface GuardrailTextCharactersCoverage {
  guarded?: number | undefined;
  total?: number | undefined;
}
export interface GuardrailCoverage {
  textCharacters?: GuardrailTextCharactersCoverage | undefined;
  images?: GuardrailImageCoverage | undefined;
}
export interface GuardrailUsage {
  topicPolicyUnits: number | undefined;
  contentPolicyUnits: number | undefined;
  wordPolicyUnits: number | undefined;
  sensitiveInformationPolicyUnits: number | undefined;
  sensitiveInformationPolicyFreeUnits: number | undefined;
  contextualGroundingPolicyUnits: number | undefined;
  contentPolicyImageUnits?: number | undefined;
  automatedReasoningPolicyUnits?: number | undefined;
  automatedReasoningPolicies?: number | undefined;
}
export interface GuardrailInvocationMetrics {
  guardrailProcessingLatency?: number | undefined;
  usage?: GuardrailUsage | undefined;
  guardrailCoverage?: GuardrailCoverage | undefined;
}
export interface GuardrailPiiEntityFilter {
  match: string | undefined;
  type: GuardrailPiiEntityType | undefined;
  action: GuardrailSensitiveInformationPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailRegexFilter {
  name?: string | undefined;
  match?: string | undefined;
  regex?: string | undefined;
  action: GuardrailSensitiveInformationPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailSensitiveInformationPolicyAssessment {
  piiEntities: GuardrailPiiEntityFilter[] | undefined;
  regexes: GuardrailRegexFilter[] | undefined;
}
export interface GuardrailTopic {
  name: string | undefined;
  type: GuardrailTopicType | undefined;
  action: GuardrailTopicPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailTopicPolicyAssessment {
  topics: GuardrailTopic[] | undefined;
}
export interface GuardrailCustomWord {
  match: string | undefined;
  action: GuardrailWordPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailManagedWord {
  match: string | undefined;
  type: GuardrailManagedWordType | undefined;
  action: GuardrailWordPolicyAction | undefined;
  detected?: boolean | undefined;
}
export interface GuardrailWordPolicyAssessment {
  customWords: GuardrailCustomWord[] | undefined;
  managedWordLists: GuardrailManagedWord[] | undefined;
}
export interface GuardrailAssessment {
  topicPolicy?: GuardrailTopicPolicyAssessment | undefined;
  contentPolicy?: GuardrailContentPolicyAssessment | undefined;
  wordPolicy?: GuardrailWordPolicyAssessment | undefined;
  sensitiveInformationPolicy?:
    | GuardrailSensitiveInformationPolicyAssessment
    | undefined;
  contextualGroundingPolicy?:
    | GuardrailContextualGroundingPolicyAssessment
    | undefined;
  automatedReasoningPolicy?:
    | GuardrailAutomatedReasoningPolicyAssessment
    | undefined;
  invocationMetrics?: GuardrailInvocationMetrics | undefined;
  appliedGuardrailDetails?: AppliedGuardrailDetails | undefined;
}
export interface GuardrailOutputContent {
  text?: string | undefined;
}
export interface ApplyGuardrailResponse {
  usage: GuardrailUsage | undefined;
  action: GuardrailAction | undefined;
  actionReason?: string | undefined;
  outputs: GuardrailOutputContent[] | undefined;
  assessments: GuardrailAssessment[] | undefined;
  guardrailCoverage?: GuardrailCoverage | undefined;
}
export interface GuardrailConfiguration {
  guardrailIdentifier?: string | undefined;
  guardrailVersion?: string | undefined;
  trace?: GuardrailTrace | undefined;
}
export interface InferenceConfiguration {
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  topP?: number | undefined;
  stopSequences?: string[] | undefined;
}
export interface ErrorBlock {
  message?: string | undefined;
}
export interface S3Location {
  uri: string | undefined;
  bucketOwner?: string | undefined;
}
export type AudioSource =
  | AudioSource.BytesMember
  | AudioSource.S3LocationMember
  | AudioSource.$UnknownMember;
export declare namespace AudioSource {
  interface BytesMember {
    bytes: Uint8Array;
    s3Location?: never;
    $unknown?: never;
  }
  interface S3LocationMember {
    bytes?: never;
    s3Location: S3Location;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    s3Location?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    s3Location: (value: S3Location) => T;
    _: (name: string, value: any) => T;
  }
}
export interface AudioBlock {
  format: AudioFormat | undefined;
  source: AudioSource | undefined;
  error?: ErrorBlock | undefined;
}
export interface CachePointBlock {
  type: CachePointType | undefined;
  ttl?: CacheTTL | undefined;
}
export interface DocumentCharLocation {
  documentIndex?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
}
export interface DocumentChunkLocation {
  documentIndex?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
}
export interface DocumentPageLocation {
  documentIndex?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
}
export interface SearchResultLocation {
  searchResultIndex?: number | undefined;
  start?: number | undefined;
  end?: number | undefined;
}
export interface WebLocation {
  url?: string | undefined;
  domain?: string | undefined;
}
export type CitationLocation =
  | CitationLocation.DocumentCharMember
  | CitationLocation.DocumentChunkMember
  | CitationLocation.DocumentPageMember
  | CitationLocation.SearchResultLocationMember
  | CitationLocation.WebMember
  | CitationLocation.$UnknownMember;
export declare namespace CitationLocation {
  interface WebMember {
    web: WebLocation;
    documentChar?: never;
    documentPage?: never;
    documentChunk?: never;
    searchResultLocation?: never;
    $unknown?: never;
  }
  interface DocumentCharMember {
    web?: never;
    documentChar: DocumentCharLocation;
    documentPage?: never;
    documentChunk?: never;
    searchResultLocation?: never;
    $unknown?: never;
  }
  interface DocumentPageMember {
    web?: never;
    documentChar?: never;
    documentPage: DocumentPageLocation;
    documentChunk?: never;
    searchResultLocation?: never;
    $unknown?: never;
  }
  interface DocumentChunkMember {
    web?: never;
    documentChar?: never;
    documentPage?: never;
    documentChunk: DocumentChunkLocation;
    searchResultLocation?: never;
    $unknown?: never;
  }
  interface SearchResultLocationMember {
    web?: never;
    documentChar?: never;
    documentPage?: never;
    documentChunk?: never;
    searchResultLocation: SearchResultLocation;
    $unknown?: never;
  }
  interface $UnknownMember {
    web?: never;
    documentChar?: never;
    documentPage?: never;
    documentChunk?: never;
    searchResultLocation?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    web: (value: WebLocation) => T;
    documentChar: (value: DocumentCharLocation) => T;
    documentPage: (value: DocumentPageLocation) => T;
    documentChunk: (value: DocumentChunkLocation) => T;
    searchResultLocation: (value: SearchResultLocation) => T;
    _: (name: string, value: any) => T;
  }
}
export type CitationSourceContent =
  | CitationSourceContent.TextMember
  | CitationSourceContent.$UnknownMember;
export declare namespace CitationSourceContent {
  interface TextMember {
    text: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface Citation {
  title?: string | undefined;
  source?: string | undefined;
  sourceContent?: CitationSourceContent[] | undefined;
  location?: CitationLocation | undefined;
}
export type CitationGeneratedContent =
  | CitationGeneratedContent.TextMember
  | CitationGeneratedContent.$UnknownMember;
export declare namespace CitationGeneratedContent {
  interface TextMember {
    text: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface CitationsContentBlock {
  content?: CitationGeneratedContent[] | undefined;
  citations?: Citation[] | undefined;
}
export interface CitationsConfig {
  enabled: boolean | undefined;
}
export type DocumentContentBlock =
  | DocumentContentBlock.TextMember
  | DocumentContentBlock.$UnknownMember;
export declare namespace DocumentContentBlock {
  interface TextMember {
    text: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export type DocumentSource =
  | DocumentSource.BytesMember
  | DocumentSource.ContentMember
  | DocumentSource.S3LocationMember
  | DocumentSource.TextMember
  | DocumentSource.$UnknownMember;
export declare namespace DocumentSource {
  interface BytesMember {
    bytes: Uint8Array;
    s3Location?: never;
    text?: never;
    content?: never;
    $unknown?: never;
  }
  interface S3LocationMember {
    bytes?: never;
    s3Location: S3Location;
    text?: never;
    content?: never;
    $unknown?: never;
  }
  interface TextMember {
    bytes?: never;
    s3Location?: never;
    text: string;
    content?: never;
    $unknown?: never;
  }
  interface ContentMember {
    bytes?: never;
    s3Location?: never;
    text?: never;
    content: DocumentContentBlock[];
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    s3Location?: never;
    text?: never;
    content?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    s3Location: (value: S3Location) => T;
    text: (value: string) => T;
    content: (value: DocumentContentBlock[]) => T;
    _: (name: string, value: any) => T;
  }
}
export interface DocumentBlock {
  format?: DocumentFormat | undefined;
  name: string | undefined;
  source: DocumentSource | undefined;
  context?: string | undefined;
  citations?: CitationsConfig | undefined;
}
export type GuardrailConverseImageSource =
  | GuardrailConverseImageSource.BytesMember
  | GuardrailConverseImageSource.$UnknownMember;
export declare namespace GuardrailConverseImageSource {
  interface BytesMember {
    bytes: Uint8Array;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    _: (name: string, value: any) => T;
  }
}
export interface GuardrailConverseImageBlock {
  format: GuardrailConverseImageFormat | undefined;
  source: GuardrailConverseImageSource | undefined;
}
export interface GuardrailConverseTextBlock {
  text: string | undefined;
  qualifiers?: GuardrailConverseContentQualifier[] | undefined;
}
export type GuardrailConverseContentBlock =
  | GuardrailConverseContentBlock.ImageMember
  | GuardrailConverseContentBlock.TextMember
  | GuardrailConverseContentBlock.$UnknownMember;
export declare namespace GuardrailConverseContentBlock {
  interface TextMember {
    text: GuardrailConverseTextBlock;
    image?: never;
    $unknown?: never;
  }
  interface ImageMember {
    text?: never;
    image: GuardrailConverseImageBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    image?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: GuardrailConverseTextBlock) => T;
    image: (value: GuardrailConverseImageBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export type ImageSource =
  | ImageSource.BytesMember
  | ImageSource.S3LocationMember
  | ImageSource.$UnknownMember;
export declare namespace ImageSource {
  interface BytesMember {
    bytes: Uint8Array;
    s3Location?: never;
    $unknown?: never;
  }
  interface S3LocationMember {
    bytes?: never;
    s3Location: S3Location;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    s3Location?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    s3Location: (value: S3Location) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ImageBlock {
  format: ImageFormat | undefined;
  source: ImageSource | undefined;
  error?: ErrorBlock | undefined;
}
export interface ReasoningTextBlock {
  text: string | undefined;
  signature?: string | undefined;
}
export type ReasoningContentBlock =
  | ReasoningContentBlock.ReasoningTextMember
  | ReasoningContentBlock.RedactedContentMember
  | ReasoningContentBlock.$UnknownMember;
export declare namespace ReasoningContentBlock {
  interface ReasoningTextMember {
    reasoningText: ReasoningTextBlock;
    redactedContent?: never;
    $unknown?: never;
  }
  interface RedactedContentMember {
    reasoningText?: never;
    redactedContent: Uint8Array;
    $unknown?: never;
  }
  interface $UnknownMember {
    reasoningText?: never;
    redactedContent?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    reasoningText: (value: ReasoningTextBlock) => T;
    redactedContent: (value: Uint8Array) => T;
    _: (name: string, value: any) => T;
  }
}
export interface SearchResultContentBlock {
  text: string | undefined;
}
export interface SearchResultBlock {
  source: string | undefined;
  title: string | undefined;
  content: SearchResultContentBlock[] | undefined;
  citations?: CitationsConfig | undefined;
}
export type VideoSource =
  | VideoSource.BytesMember
  | VideoSource.S3LocationMember
  | VideoSource.$UnknownMember;
export declare namespace VideoSource {
  interface BytesMember {
    bytes: Uint8Array;
    s3Location?: never;
    $unknown?: never;
  }
  interface S3LocationMember {
    bytes?: never;
    s3Location: S3Location;
    $unknown?: never;
  }
  interface $UnknownMember {
    bytes?: never;
    s3Location?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    bytes: (value: Uint8Array) => T;
    s3Location: (value: S3Location) => T;
    _: (name: string, value: any) => T;
  }
}
export interface VideoBlock {
  format: VideoFormat | undefined;
  source: VideoSource | undefined;
}
export type ToolResultContentBlock =
  | ToolResultContentBlock.DocumentMember
  | ToolResultContentBlock.ImageMember
  | ToolResultContentBlock.JsonMember
  | ToolResultContentBlock.SearchResultMember
  | ToolResultContentBlock.TextMember
  | ToolResultContentBlock.VideoMember
  | ToolResultContentBlock.$UnknownMember;
export declare namespace ToolResultContentBlock {
  interface JsonMember {
    json: __DocumentType;
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface TextMember {
    json?: never;
    text: string;
    image?: never;
    document?: never;
    video?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface ImageMember {
    json?: never;
    text?: never;
    image: ImageBlock;
    document?: never;
    video?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface DocumentMember {
    json?: never;
    text?: never;
    image?: never;
    document: DocumentBlock;
    video?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface VideoMember {
    json?: never;
    text?: never;
    image?: never;
    document?: never;
    video: VideoBlock;
    searchResult?: never;
    $unknown?: never;
  }
  interface SearchResultMember {
    json?: never;
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    searchResult: SearchResultBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    json?: never;
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    searchResult?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    json: (value: __DocumentType) => T;
    text: (value: string) => T;
    image: (value: ImageBlock) => T;
    document: (value: DocumentBlock) => T;
    video: (value: VideoBlock) => T;
    searchResult: (value: SearchResultBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ToolResultBlock {
  toolUseId: string | undefined;
  content: ToolResultContentBlock[] | undefined;
  status?: ToolResultStatus | undefined;
  type?: string | undefined;
}
export interface ToolUseBlock {
  toolUseId: string | undefined;
  name: string | undefined;
  input: __DocumentType | undefined;
  type?: ToolUseType | undefined;
}
export type ContentBlock =
  | ContentBlock.AudioMember
  | ContentBlock.CachePointMember
  | ContentBlock.CitationsContentMember
  | ContentBlock.DocumentMember
  | ContentBlock.GuardContentMember
  | ContentBlock.ImageMember
  | ContentBlock.ReasoningContentMember
  | ContentBlock.SearchResultMember
  | ContentBlock.TextMember
  | ContentBlock.ToolResultMember
  | ContentBlock.ToolUseMember
  | ContentBlock.VideoMember
  | ContentBlock.$UnknownMember;
export declare namespace ContentBlock {
  interface TextMember {
    text: string;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface ImageMember {
    text?: never;
    image: ImageBlock;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface DocumentMember {
    text?: never;
    image?: never;
    document: DocumentBlock;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface VideoMember {
    text?: never;
    image?: never;
    document?: never;
    video: VideoBlock;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface AudioMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio: AudioBlock;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface ToolUseMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse: ToolUseBlock;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface ToolResultMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult: ToolResultBlock;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface GuardContentMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent: GuardrailConverseContentBlock;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface CachePointMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint: CachePointBlock;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface ReasoningContentMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent: ReasoningContentBlock;
    citationsContent?: never;
    searchResult?: never;
    $unknown?: never;
  }
  interface CitationsContentMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent: CitationsContentBlock;
    searchResult?: never;
    $unknown?: never;
  }
  interface SearchResultMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult: SearchResultBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    image?: never;
    document?: never;
    video?: never;
    audio?: never;
    toolUse?: never;
    toolResult?: never;
    guardContent?: never;
    cachePoint?: never;
    reasoningContent?: never;
    citationsContent?: never;
    searchResult?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    image: (value: ImageBlock) => T;
    document: (value: DocumentBlock) => T;
    video: (value: VideoBlock) => T;
    audio: (value: AudioBlock) => T;
    toolUse: (value: ToolUseBlock) => T;
    toolResult: (value: ToolResultBlock) => T;
    guardContent: (value: GuardrailConverseContentBlock) => T;
    cachePoint: (value: CachePointBlock) => T;
    reasoningContent: (value: ReasoningContentBlock) => T;
    citationsContent: (value: CitationsContentBlock) => T;
    searchResult: (value: SearchResultBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export interface Message {
  role: ConversationRole | undefined;
  content: ContentBlock[] | undefined;
}
export interface JsonSchemaDefinition {
  schema: string | undefined;
  name?: string | undefined;
  description?: string | undefined;
}
export type OutputFormatStructure =
  | OutputFormatStructure.JsonSchemaMember
  | OutputFormatStructure.$UnknownMember;
export declare namespace OutputFormatStructure {
  interface JsonSchemaMember {
    jsonSchema: JsonSchemaDefinition;
    $unknown?: never;
  }
  interface $UnknownMember {
    jsonSchema?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    jsonSchema: (value: JsonSchemaDefinition) => T;
    _: (name: string, value: any) => T;
  }
}
export interface OutputFormat {
  type: OutputFormatType | undefined;
  structure: OutputFormatStructure | undefined;
}
export interface OutputConfig {
  textFormat?: OutputFormat | undefined;
}
export interface PerformanceConfiguration {
  latency?: PerformanceConfigLatency | undefined;
}
export type PromptVariableValues =
  | PromptVariableValues.TextMember
  | PromptVariableValues.$UnknownMember;
export declare namespace PromptVariableValues {
  interface TextMember {
    text: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ServiceTier {
  type: ServiceTierType | undefined;
}
export type SystemContentBlock =
  | SystemContentBlock.CachePointMember
  | SystemContentBlock.GuardContentMember
  | SystemContentBlock.TextMember
  | SystemContentBlock.$UnknownMember;
export declare namespace SystemContentBlock {
  interface TextMember {
    text: string;
    guardContent?: never;
    cachePoint?: never;
    $unknown?: never;
  }
  interface GuardContentMember {
    text?: never;
    guardContent: GuardrailConverseContentBlock;
    cachePoint?: never;
    $unknown?: never;
  }
  interface CachePointMember {
    text?: never;
    guardContent?: never;
    cachePoint: CachePointBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    guardContent?: never;
    cachePoint?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    guardContent: (value: GuardrailConverseContentBlock) => T;
    cachePoint: (value: CachePointBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export interface AnyToolChoice {}
export interface AutoToolChoice {}
export interface SpecificToolChoice {
  name: string | undefined;
}
export type ToolChoice =
  | ToolChoice.AnyMember
  | ToolChoice.AutoMember
  | ToolChoice.ToolMember
  | ToolChoice.$UnknownMember;
export declare namespace ToolChoice {
  interface AutoMember {
    auto: AutoToolChoice;
    any?: never;
    tool?: never;
    $unknown?: never;
  }
  interface AnyMember {
    auto?: never;
    any: AnyToolChoice;
    tool?: never;
    $unknown?: never;
  }
  interface ToolMember {
    auto?: never;
    any?: never;
    tool: SpecificToolChoice;
    $unknown?: never;
  }
  interface $UnknownMember {
    auto?: never;
    any?: never;
    tool?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    auto: (value: AutoToolChoice) => T;
    any: (value: AnyToolChoice) => T;
    tool: (value: SpecificToolChoice) => T;
    _: (name: string, value: any) => T;
  }
}
export interface SystemTool {
  name: string | undefined;
}
export type ToolInputSchema =
  | ToolInputSchema.JsonMember
  | ToolInputSchema.$UnknownMember;
export declare namespace ToolInputSchema {
  interface JsonMember {
    json: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    json?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    json: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ToolSpecification {
  name: string | undefined;
  description?: string | undefined;
  inputSchema: ToolInputSchema | undefined;
  strict?: boolean | undefined;
}
export type Tool =
  | Tool.CachePointMember
  | Tool.SystemToolMember
  | Tool.ToolSpecMember
  | Tool.$UnknownMember;
export declare namespace Tool {
  interface ToolSpecMember {
    toolSpec: ToolSpecification;
    systemTool?: never;
    cachePoint?: never;
    $unknown?: never;
  }
  interface SystemToolMember {
    toolSpec?: never;
    systemTool: SystemTool;
    cachePoint?: never;
    $unknown?: never;
  }
  interface CachePointMember {
    toolSpec?: never;
    systemTool?: never;
    cachePoint: CachePointBlock;
    $unknown?: never;
  }
  interface $UnknownMember {
    toolSpec?: never;
    systemTool?: never;
    cachePoint?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    toolSpec: (value: ToolSpecification) => T;
    systemTool: (value: SystemTool) => T;
    cachePoint: (value: CachePointBlock) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ToolConfiguration {
  tools: Tool[] | undefined;
  toolChoice?: ToolChoice | undefined;
}
export interface ConverseRequest {
  modelId: string | undefined;
  messages?: Message[] | undefined;
  system?: SystemContentBlock[] | undefined;
  inferenceConfig?: InferenceConfiguration | undefined;
  toolConfig?: ToolConfiguration | undefined;
  guardrailConfig?: GuardrailConfiguration | undefined;
  additionalModelRequestFields?: __DocumentType | undefined;
  promptVariables?: Record<string, PromptVariableValues> | undefined;
  additionalModelResponseFieldPaths?: string[] | undefined;
  requestMetadata?: Record<string, string> | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
  serviceTier?: ServiceTier | undefined;
  outputConfig?: OutputConfig | undefined;
}
export interface ConverseMetrics {
  latencyMs: number | undefined;
}
export type ConverseOutput =
  | ConverseOutput.MessageMember
  | ConverseOutput.$UnknownMember;
export declare namespace ConverseOutput {
  interface MessageMember {
    message: Message;
    $unknown?: never;
  }
  interface $UnknownMember {
    message?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    message: (value: Message) => T;
    _: (name: string, value: any) => T;
  }
}
export interface GuardrailTraceAssessment {
  modelOutput?: string[] | undefined;
  inputAssessment?: Record<string, GuardrailAssessment> | undefined;
  outputAssessments?: Record<string, GuardrailAssessment[]> | undefined;
  actionReason?: string | undefined;
}
export interface PromptRouterTrace {
  invokedModelId?: string | undefined;
}
export interface ConverseTrace {
  guardrail?: GuardrailTraceAssessment | undefined;
  promptRouter?: PromptRouterTrace | undefined;
}
export interface CacheDetail {
  ttl: CacheTTL | undefined;
  inputTokens: number | undefined;
}
export interface TokenUsage {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
  cacheReadInputTokens?: number | undefined;
  cacheWriteInputTokens?: number | undefined;
  cacheDetails?: CacheDetail[] | undefined;
}
export interface ConverseResponse {
  output: ConverseOutput | undefined;
  stopReason: StopReason | undefined;
  usage: TokenUsage | undefined;
  metrics: ConverseMetrics | undefined;
  additionalModelResponseFields?: __DocumentType | undefined;
  trace?: ConverseTrace | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
  serviceTier?: ServiceTier | undefined;
}
export interface GuardrailStreamConfiguration {
  guardrailIdentifier?: string | undefined;
  guardrailVersion?: string | undefined;
  trace?: GuardrailTrace | undefined;
  streamProcessingMode?: GuardrailStreamProcessingMode | undefined;
}
export interface ConverseStreamRequest {
  modelId: string | undefined;
  messages?: Message[] | undefined;
  system?: SystemContentBlock[] | undefined;
  inferenceConfig?: InferenceConfiguration | undefined;
  toolConfig?: ToolConfiguration | undefined;
  guardrailConfig?: GuardrailStreamConfiguration | undefined;
  additionalModelRequestFields?: __DocumentType | undefined;
  promptVariables?: Record<string, PromptVariableValues> | undefined;
  additionalModelResponseFieldPaths?: string[] | undefined;
  requestMetadata?: Record<string, string> | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
  serviceTier?: ServiceTier | undefined;
  outputConfig?: OutputConfig | undefined;
}
export interface CitationSourceContentDelta {
  text?: string | undefined;
}
export interface CitationsDelta {
  title?: string | undefined;
  source?: string | undefined;
  sourceContent?: CitationSourceContentDelta[] | undefined;
  location?: CitationLocation | undefined;
}
export interface ImageBlockDelta {
  source?: ImageSource | undefined;
  error?: ErrorBlock | undefined;
}
export type ReasoningContentBlockDelta =
  | ReasoningContentBlockDelta.RedactedContentMember
  | ReasoningContentBlockDelta.SignatureMember
  | ReasoningContentBlockDelta.TextMember
  | ReasoningContentBlockDelta.$UnknownMember;
export declare namespace ReasoningContentBlockDelta {
  interface TextMember {
    text: string;
    redactedContent?: never;
    signature?: never;
    $unknown?: never;
  }
  interface RedactedContentMember {
    text?: never;
    redactedContent: Uint8Array;
    signature?: never;
    $unknown?: never;
  }
  interface SignatureMember {
    text?: never;
    redactedContent?: never;
    signature: string;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    redactedContent?: never;
    signature?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    redactedContent: (value: Uint8Array) => T;
    signature: (value: string) => T;
    _: (name: string, value: any) => T;
  }
}
export type ToolResultBlockDelta =
  | ToolResultBlockDelta.JsonMember
  | ToolResultBlockDelta.TextMember
  | ToolResultBlockDelta.$UnknownMember;
export declare namespace ToolResultBlockDelta {
  interface TextMember {
    text: string;
    json?: never;
    $unknown?: never;
  }
  interface JsonMember {
    text?: never;
    json: __DocumentType;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    json?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    json: (value: __DocumentType) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ToolUseBlockDelta {
  input: string | undefined;
}
export type ContentBlockDelta =
  | ContentBlockDelta.CitationMember
  | ContentBlockDelta.ImageMember
  | ContentBlockDelta.ReasoningContentMember
  | ContentBlockDelta.TextMember
  | ContentBlockDelta.ToolResultMember
  | ContentBlockDelta.ToolUseMember
  | ContentBlockDelta.$UnknownMember;
export declare namespace ContentBlockDelta {
  interface TextMember {
    text: string;
    toolUse?: never;
    toolResult?: never;
    reasoningContent?: never;
    citation?: never;
    image?: never;
    $unknown?: never;
  }
  interface ToolUseMember {
    text?: never;
    toolUse: ToolUseBlockDelta;
    toolResult?: never;
    reasoningContent?: never;
    citation?: never;
    image?: never;
    $unknown?: never;
  }
  interface ToolResultMember {
    text?: never;
    toolUse?: never;
    toolResult: ToolResultBlockDelta[];
    reasoningContent?: never;
    citation?: never;
    image?: never;
    $unknown?: never;
  }
  interface ReasoningContentMember {
    text?: never;
    toolUse?: never;
    toolResult?: never;
    reasoningContent: ReasoningContentBlockDelta;
    citation?: never;
    image?: never;
    $unknown?: never;
  }
  interface CitationMember {
    text?: never;
    toolUse?: never;
    toolResult?: never;
    reasoningContent?: never;
    citation: CitationsDelta;
    image?: never;
    $unknown?: never;
  }
  interface ImageMember {
    text?: never;
    toolUse?: never;
    toolResult?: never;
    reasoningContent?: never;
    citation?: never;
    image: ImageBlockDelta;
    $unknown?: never;
  }
  interface $UnknownMember {
    text?: never;
    toolUse?: never;
    toolResult?: never;
    reasoningContent?: never;
    citation?: never;
    image?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    text: (value: string) => T;
    toolUse: (value: ToolUseBlockDelta) => T;
    toolResult: (value: ToolResultBlockDelta[]) => T;
    reasoningContent: (value: ReasoningContentBlockDelta) => T;
    citation: (value: CitationsDelta) => T;
    image: (value: ImageBlockDelta) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ContentBlockDeltaEvent {
  delta: ContentBlockDelta | undefined;
  contentBlockIndex: number | undefined;
}
export interface ImageBlockStart {
  format: ImageFormat | undefined;
}
export interface ToolResultBlockStart {
  toolUseId: string | undefined;
  type?: string | undefined;
  status?: ToolResultStatus | undefined;
}
export interface ToolUseBlockStart {
  toolUseId: string | undefined;
  name: string | undefined;
  type?: ToolUseType | undefined;
}
export type ContentBlockStart =
  | ContentBlockStart.ImageMember
  | ContentBlockStart.ToolResultMember
  | ContentBlockStart.ToolUseMember
  | ContentBlockStart.$UnknownMember;
export declare namespace ContentBlockStart {
  interface ToolUseMember {
    toolUse: ToolUseBlockStart;
    toolResult?: never;
    image?: never;
    $unknown?: never;
  }
  interface ToolResultMember {
    toolUse?: never;
    toolResult: ToolResultBlockStart;
    image?: never;
    $unknown?: never;
  }
  interface ImageMember {
    toolUse?: never;
    toolResult?: never;
    image: ImageBlockStart;
    $unknown?: never;
  }
  interface $UnknownMember {
    toolUse?: never;
    toolResult?: never;
    image?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    toolUse: (value: ToolUseBlockStart) => T;
    toolResult: (value: ToolResultBlockStart) => T;
    image: (value: ImageBlockStart) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ContentBlockStartEvent {
  start: ContentBlockStart | undefined;
  contentBlockIndex: number | undefined;
}
export interface ContentBlockStopEvent {
  contentBlockIndex: number | undefined;
}
export interface MessageStartEvent {
  role: ConversationRole | undefined;
}
export interface MessageStopEvent {
  stopReason: StopReason | undefined;
  additionalModelResponseFields?: __DocumentType | undefined;
}
export interface ConverseStreamMetrics {
  latencyMs: number | undefined;
}
export interface ConverseStreamTrace {
  guardrail?: GuardrailTraceAssessment | undefined;
  promptRouter?: PromptRouterTrace | undefined;
}
export interface ConverseStreamMetadataEvent {
  usage: TokenUsage | undefined;
  metrics: ConverseStreamMetrics | undefined;
  trace?: ConverseStreamTrace | undefined;
  performanceConfig?: PerformanceConfiguration | undefined;
  serviceTier?: ServiceTier | undefined;
}
export type ConverseStreamOutput =
  | ConverseStreamOutput.ContentBlockDeltaMember
  | ConverseStreamOutput.ContentBlockStartMember
  | ConverseStreamOutput.ContentBlockStopMember
  | ConverseStreamOutput.InternalServerExceptionMember
  | ConverseStreamOutput.MessageStartMember
  | ConverseStreamOutput.MessageStopMember
  | ConverseStreamOutput.MetadataMember
  | ConverseStreamOutput.ModelStreamErrorExceptionMember
  | ConverseStreamOutput.ServiceUnavailableExceptionMember
  | ConverseStreamOutput.ThrottlingExceptionMember
  | ConverseStreamOutput.ValidationExceptionMember
  | ConverseStreamOutput.$UnknownMember;
export declare namespace ConverseStreamOutput {
  interface MessageStartMember {
    messageStart: MessageStartEvent;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ContentBlockStartMember {
    messageStart?: never;
    contentBlockStart: ContentBlockStartEvent;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ContentBlockDeltaMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta: ContentBlockDeltaEvent;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ContentBlockStopMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop: ContentBlockStopEvent;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface MessageStopMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop: MessageStopEvent;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface MetadataMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata: ConverseStreamMetadataEvent;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException: InternalServerException;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ModelStreamErrorExceptionMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException: ModelStreamErrorException;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException: ValidationException;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException: ThrottlingException;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ServiceUnavailableExceptionMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException: ServiceUnavailableException;
    $unknown?: never;
  }
  interface $UnknownMember {
    messageStart?: never;
    contentBlockStart?: never;
    contentBlockDelta?: never;
    contentBlockStop?: never;
    messageStop?: never;
    metadata?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    serviceUnavailableException?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    messageStart: (value: MessageStartEvent) => T;
    contentBlockStart: (value: ContentBlockStartEvent) => T;
    contentBlockDelta: (value: ContentBlockDeltaEvent) => T;
    contentBlockStop: (value: ContentBlockStopEvent) => T;
    messageStop: (value: MessageStopEvent) => T;
    metadata: (value: ConverseStreamMetadataEvent) => T;
    internalServerException: (value: InternalServerException) => T;
    modelStreamErrorException: (value: ModelStreamErrorException) => T;
    validationException: (value: ValidationException) => T;
    throttlingException: (value: ThrottlingException) => T;
    serviceUnavailableException: (value: ServiceUnavailableException) => T;
    _: (name: string, value: any) => T;
  }
}
export interface ConverseStreamResponse {
  stream?: AsyncIterable<ConverseStreamOutput> | undefined;
}
export interface InvokeModelRequest {
  body?: Uint8Array | undefined;
  contentType?: string | undefined;
  accept?: string | undefined;
  modelId: string | undefined;
  trace?: Trace | undefined;
  guardrailIdentifier?: string | undefined;
  guardrailVersion?: string | undefined;
  performanceConfigLatency?: PerformanceConfigLatency | undefined;
  serviceTier?: ServiceTierType | undefined;
}
export interface InvokeModelResponse {
  body: Uint8Array | undefined;
  contentType: string | undefined;
  performanceConfigLatency?: PerformanceConfigLatency | undefined;
  serviceTier?: ServiceTierType | undefined;
}
export interface BidirectionalInputPayloadPart {
  bytes?: Uint8Array | undefined;
}
export type InvokeModelWithBidirectionalStreamInput =
  | InvokeModelWithBidirectionalStreamInput.ChunkMember
  | InvokeModelWithBidirectionalStreamInput.$UnknownMember;
export declare namespace InvokeModelWithBidirectionalStreamInput {
  interface ChunkMember {
    chunk: BidirectionalInputPayloadPart;
    $unknown?: never;
  }
  interface $UnknownMember {
    chunk?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    chunk: (value: BidirectionalInputPayloadPart) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvokeModelWithBidirectionalStreamRequest {
  modelId: string | undefined;
  body: AsyncIterable<InvokeModelWithBidirectionalStreamInput> | undefined;
}
export interface BidirectionalOutputPayloadPart {
  bytes?: Uint8Array | undefined;
}
export type InvokeModelWithBidirectionalStreamOutput =
  | InvokeModelWithBidirectionalStreamOutput.ChunkMember
  | InvokeModelWithBidirectionalStreamOutput.InternalServerExceptionMember
  | InvokeModelWithBidirectionalStreamOutput.ModelStreamErrorExceptionMember
  | InvokeModelWithBidirectionalStreamOutput.ModelTimeoutExceptionMember
  | InvokeModelWithBidirectionalStreamOutput.ServiceUnavailableExceptionMember
  | InvokeModelWithBidirectionalStreamOutput.ThrottlingExceptionMember
  | InvokeModelWithBidirectionalStreamOutput.ValidationExceptionMember
  | InvokeModelWithBidirectionalStreamOutput.$UnknownMember;
export declare namespace InvokeModelWithBidirectionalStreamOutput {
  interface ChunkMember {
    chunk: BidirectionalOutputPayloadPart;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    chunk?: never;
    internalServerException: InternalServerException;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ModelStreamErrorExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException: ModelStreamErrorException;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException: ValidationException;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException: ThrottlingException;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ModelTimeoutExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException: ModelTimeoutException;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ServiceUnavailableExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException: ServiceUnavailableException;
    $unknown?: never;
  }
  interface $UnknownMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    chunk: (value: BidirectionalOutputPayloadPart) => T;
    internalServerException: (value: InternalServerException) => T;
    modelStreamErrorException: (value: ModelStreamErrorException) => T;
    validationException: (value: ValidationException) => T;
    throttlingException: (value: ThrottlingException) => T;
    modelTimeoutException: (value: ModelTimeoutException) => T;
    serviceUnavailableException: (value: ServiceUnavailableException) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvokeModelWithBidirectionalStreamResponse {
  body: AsyncIterable<InvokeModelWithBidirectionalStreamOutput> | undefined;
}
export interface InvokeModelWithResponseStreamRequest {
  body?: Uint8Array | undefined;
  contentType?: string | undefined;
  accept?: string | undefined;
  modelId: string | undefined;
  trace?: Trace | undefined;
  guardrailIdentifier?: string | undefined;
  guardrailVersion?: string | undefined;
  performanceConfigLatency?: PerformanceConfigLatency | undefined;
  serviceTier?: ServiceTierType | undefined;
}
export interface PayloadPart {
  bytes?: Uint8Array | undefined;
}
export type ResponseStream =
  | ResponseStream.ChunkMember
  | ResponseStream.InternalServerExceptionMember
  | ResponseStream.ModelStreamErrorExceptionMember
  | ResponseStream.ModelTimeoutExceptionMember
  | ResponseStream.ServiceUnavailableExceptionMember
  | ResponseStream.ThrottlingExceptionMember
  | ResponseStream.ValidationExceptionMember
  | ResponseStream.$UnknownMember;
export declare namespace ResponseStream {
  interface ChunkMember {
    chunk: PayloadPart;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface InternalServerExceptionMember {
    chunk?: never;
    internalServerException: InternalServerException;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ModelStreamErrorExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException: ModelStreamErrorException;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ValidationExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException: ValidationException;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ThrottlingExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException: ThrottlingException;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ModelTimeoutExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException: ModelTimeoutException;
    serviceUnavailableException?: never;
    $unknown?: never;
  }
  interface ServiceUnavailableExceptionMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException: ServiceUnavailableException;
    $unknown?: never;
  }
  interface $UnknownMember {
    chunk?: never;
    internalServerException?: never;
    modelStreamErrorException?: never;
    validationException?: never;
    throttlingException?: never;
    modelTimeoutException?: never;
    serviceUnavailableException?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    chunk: (value: PayloadPart) => T;
    internalServerException: (value: InternalServerException) => T;
    modelStreamErrorException: (value: ModelStreamErrorException) => T;
    validationException: (value: ValidationException) => T;
    throttlingException: (value: ThrottlingException) => T;
    modelTimeoutException: (value: ModelTimeoutException) => T;
    serviceUnavailableException: (value: ServiceUnavailableException) => T;
    _: (name: string, value: any) => T;
  }
}
export interface InvokeModelWithResponseStreamResponse {
  body: AsyncIterable<ResponseStream> | undefined;
  contentType: string | undefined;
  performanceConfigLatency?: PerformanceConfigLatency | undefined;
  serviceTier?: ServiceTierType | undefined;
}
export interface ConverseTokensRequest {
  messages?: Message[] | undefined;
  system?: SystemContentBlock[] | undefined;
  toolConfig?: ToolConfiguration | undefined;
  additionalModelRequestFields?: __DocumentType | undefined;
}
export interface InvokeModelTokensRequest {
  body: Uint8Array | undefined;
}
export type CountTokensInput =
  | CountTokensInput.ConverseMember
  | CountTokensInput.InvokeModelMember
  | CountTokensInput.$UnknownMember;
export declare namespace CountTokensInput {
  interface InvokeModelMember {
    invokeModel: InvokeModelTokensRequest;
    converse?: never;
    $unknown?: never;
  }
  interface ConverseMember {
    invokeModel?: never;
    converse: ConverseTokensRequest;
    $unknown?: never;
  }
  interface $UnknownMember {
    invokeModel?: never;
    converse?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    invokeModel: (value: InvokeModelTokensRequest) => T;
    converse: (value: ConverseTokensRequest) => T;
    _: (name: string, value: any) => T;
  }
}
export interface CountTokensRequest {
  modelId: string | undefined;
  input: CountTokensInput | undefined;
}
export interface CountTokensResponse {
  inputTokens: number | undefined;
}
