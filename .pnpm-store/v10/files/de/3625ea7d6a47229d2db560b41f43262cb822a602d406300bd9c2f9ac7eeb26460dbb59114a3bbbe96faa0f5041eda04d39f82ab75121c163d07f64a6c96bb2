import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SESv2ServiceException as __BaseException } from "./SESv2ServiceException";
export declare const ContactLanguage: {
  readonly EN: "EN";
  readonly JA: "JA";
};
export type ContactLanguage =
  (typeof ContactLanguage)[keyof typeof ContactLanguage];
export declare const MailType: {
  readonly MARKETING: "MARKETING";
  readonly TRANSACTIONAL: "TRANSACTIONAL";
};
export type MailType = (typeof MailType)[keyof typeof MailType];
export declare const ReviewStatus: {
  readonly DENIED: "DENIED";
  readonly FAILED: "FAILED";
  readonly GRANTED: "GRANTED";
  readonly PENDING: "PENDING";
};
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
export interface ReviewDetails {
  Status?: ReviewStatus | undefined;
  CaseId?: string | undefined;
}
export interface AccountDetails {
  MailType?: MailType | undefined;
  WebsiteURL?: string | undefined;
  ContactLanguage?: ContactLanguage | undefined;
  UseCaseDescription?: string | undefined;
  AdditionalContactEmailAddresses?: string[] | undefined;
  ReviewDetails?: ReviewDetails | undefined;
}
export declare class AccountSuspendedException extends __BaseException {
  readonly name: "AccountSuspendedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<AccountSuspendedException, __BaseException>
  );
}
export declare class AlreadyExistsException extends __BaseException {
  readonly name: "AlreadyExistsException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<AlreadyExistsException, __BaseException>
  );
}
export interface ArchivingOptions {
  ArchiveArn?: string | undefined;
}
export declare const AttachmentContentDisposition: {
  readonly ATTACHMENT: "ATTACHMENT";
  readonly INLINE: "INLINE";
};
export type AttachmentContentDisposition =
  (typeof AttachmentContentDisposition)[keyof typeof AttachmentContentDisposition];
export declare const AttachmentContentTransferEncoding: {
  readonly BASE64: "BASE64";
  readonly QUOTED_PRINTABLE: "QUOTED_PRINTABLE";
  readonly SEVEN_BIT: "SEVEN_BIT";
};
export type AttachmentContentTransferEncoding =
  (typeof AttachmentContentTransferEncoding)[keyof typeof AttachmentContentTransferEncoding];
export interface Attachment {
  RawContent: Uint8Array | undefined;
  ContentDisposition?: AttachmentContentDisposition | undefined;
  FileName: string | undefined;
  ContentDescription?: string | undefined;
  ContentId?: string | undefined;
  ContentTransferEncoding?: AttachmentContentTransferEncoding | undefined;
  ContentType?: string | undefined;
}
export declare class BadRequestException extends __BaseException {
  readonly name: "BadRequestException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<BadRequestException, __BaseException>
  );
}
export declare const MetricDimensionName: {
  readonly CONFIGURATION_SET: "CONFIGURATION_SET";
  readonly EMAIL_IDENTITY: "EMAIL_IDENTITY";
  readonly ISP: "ISP";
};
export type MetricDimensionName =
  (typeof MetricDimensionName)[keyof typeof MetricDimensionName];
export declare const Metric: {
  readonly CLICK: "CLICK";
  readonly COMPLAINT: "COMPLAINT";
  readonly DELIVERY: "DELIVERY";
  readonly DELIVERY_CLICK: "DELIVERY_CLICK";
  readonly DELIVERY_COMPLAINT: "DELIVERY_COMPLAINT";
  readonly DELIVERY_OPEN: "DELIVERY_OPEN";
  readonly OPEN: "OPEN";
  readonly PERMANENT_BOUNCE: "PERMANENT_BOUNCE";
  readonly SEND: "SEND";
  readonly TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE";
};
export type Metric = (typeof Metric)[keyof typeof Metric];
export declare const MetricNamespace: {
  readonly VDM: "VDM";
};
export type MetricNamespace =
  (typeof MetricNamespace)[keyof typeof MetricNamespace];
export interface BatchGetMetricDataQuery {
  Id: string | undefined;
  Namespace: MetricNamespace | undefined;
  Metric: Metric | undefined;
  Dimensions?: Partial<Record<MetricDimensionName, string>> | undefined;
  StartDate: Date | undefined;
  EndDate: Date | undefined;
}
export interface BatchGetMetricDataRequest {
  Queries: BatchGetMetricDataQuery[] | undefined;
}
export declare const QueryErrorCode: {
  readonly ACCESS_DENIED: "ACCESS_DENIED";
  readonly INTERNAL_FAILURE: "INTERNAL_FAILURE";
};
export type QueryErrorCode =
  (typeof QueryErrorCode)[keyof typeof QueryErrorCode];
export interface MetricDataError {
  Id?: string | undefined;
  Code?: QueryErrorCode | undefined;
  Message?: string | undefined;
}
export interface MetricDataResult {
  Id?: string | undefined;
  Timestamps?: Date[] | undefined;
  Values?: number[] | undefined;
}
export interface BatchGetMetricDataResponse {
  Results?: MetricDataResult[] | undefined;
  Errors?: MetricDataError[] | undefined;
}
export declare class InternalServiceErrorException extends __BaseException {
  readonly name: "InternalServiceErrorException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<InternalServiceErrorException, __BaseException>
  );
}
export declare class NotFoundException extends __BaseException {
  readonly name: "NotFoundException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NotFoundException, __BaseException>);
}
export declare class TooManyRequestsException extends __BaseException {
  readonly name: "TooManyRequestsException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>
  );
}
export declare const BehaviorOnMxFailure: {
  readonly REJECT_MESSAGE: "REJECT_MESSAGE";
  readonly USE_DEFAULT_VALUE: "USE_DEFAULT_VALUE";
};
export type BehaviorOnMxFailure =
  (typeof BehaviorOnMxFailure)[keyof typeof BehaviorOnMxFailure];
export interface BlacklistEntry {
  RblName?: string | undefined;
  ListingTime?: Date | undefined;
  Description?: string | undefined;
}
export interface Content {
  Data: string | undefined;
  Charset?: string | undefined;
}
export interface Body {
  Text?: Content | undefined;
  Html?: Content | undefined;
}
export declare const BounceType: {
  readonly PERMANENT: "PERMANENT";
  readonly TRANSIENT: "TRANSIENT";
  readonly UNDETERMINED: "UNDETERMINED";
};
export type BounceType = (typeof BounceType)[keyof typeof BounceType];
export interface Bounce {
  BounceType?: BounceType | undefined;
  BounceSubType?: string | undefined;
  DiagnosticCode?: string | undefined;
}
export interface MessageHeader {
  Name: string | undefined;
  Value: string | undefined;
}
export interface EmailTemplateContent {
  Subject?: string | undefined;
  Text?: string | undefined;
  Html?: string | undefined;
}
export interface Template {
  TemplateName?: string | undefined;
  TemplateArn?: string | undefined;
  TemplateContent?: EmailTemplateContent | undefined;
  TemplateData?: string | undefined;
  Headers?: MessageHeader[] | undefined;
  Attachments?: Attachment[] | undefined;
}
export interface BulkEmailContent {
  Template?: Template | undefined;
}
export interface Destination {
  ToAddresses?: string[] | undefined;
  CcAddresses?: string[] | undefined;
  BccAddresses?: string[] | undefined;
}
export interface ReplacementTemplate {
  ReplacementTemplateData?: string | undefined;
}
export interface ReplacementEmailContent {
  ReplacementTemplate?: ReplacementTemplate | undefined;
}
export interface MessageTag {
  Name: string | undefined;
  Value: string | undefined;
}
export interface BulkEmailEntry {
  Destination: Destination | undefined;
  ReplacementTags?: MessageTag[] | undefined;
  ReplacementEmailContent?: ReplacementEmailContent | undefined;
  ReplacementHeaders?: MessageHeader[] | undefined;
}
export declare const BulkEmailStatus: {
  readonly ACCOUNT_DAILY_QUOTA_EXCEEDED: "ACCOUNT_DAILY_QUOTA_EXCEEDED";
  readonly ACCOUNT_SENDING_PAUSED: "ACCOUNT_SENDING_PAUSED";
  readonly ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED";
  readonly ACCOUNT_THROTTLED: "ACCOUNT_THROTTLED";
  readonly CONFIGURATION_SET_NOT_FOUND: "CONFIGURATION_SET_NOT_FOUND";
  readonly CONFIGURATION_SET_SENDING_PAUSED: "CONFIGURATION_SET_SENDING_PAUSED";
  readonly FAILED: "FAILED";
  readonly INVALID_PARAMETER: "INVALID_PARAMETER";
  readonly INVALID_SENDING_POOL_NAME: "INVALID_SENDING_POOL_NAME";
  readonly MAIL_FROM_DOMAIN_NOT_VERIFIED: "MAIL_FROM_DOMAIN_NOT_VERIFIED";
  readonly MESSAGE_REJECTED: "MESSAGE_REJECTED";
  readonly SUCCESS: "SUCCESS";
  readonly TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND";
  readonly TRANSIENT_FAILURE: "TRANSIENT_FAILURE";
};
export type BulkEmailStatus =
  (typeof BulkEmailStatus)[keyof typeof BulkEmailStatus];
export interface BulkEmailEntryResult {
  Status?: BulkEmailStatus | undefined;
  Error?: string | undefined;
  MessageId?: string | undefined;
}
export interface CancelExportJobRequest {
  JobId: string | undefined;
}
export interface CancelExportJobResponse {}
export declare const DimensionValueSource: {
  readonly EMAIL_HEADER: "EMAIL_HEADER";
  readonly LINK_TAG: "LINK_TAG";
  readonly MESSAGE_TAG: "MESSAGE_TAG";
};
export type DimensionValueSource =
  (typeof DimensionValueSource)[keyof typeof DimensionValueSource];
export interface CloudWatchDimensionConfiguration {
  DimensionName: string | undefined;
  DimensionValueSource: DimensionValueSource | undefined;
  DefaultDimensionValue: string | undefined;
}
export interface CloudWatchDestination {
  DimensionConfigurations: CloudWatchDimensionConfiguration[] | undefined;
}
export interface Complaint {
  ComplaintSubType?: string | undefined;
  ComplaintFeedbackType?: string | undefined;
}
export declare class ConcurrentModificationException extends __BaseException {
  readonly name: "ConcurrentModificationException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<
      ConcurrentModificationException,
      __BaseException
    >
  );
}
export declare class ConflictException extends __BaseException {
  readonly name: "ConflictException";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
export declare const SubscriptionStatus: {
  readonly OPT_IN: "OPT_IN";
  readonly OPT_OUT: "OPT_OUT";
};
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export interface TopicPreference {
  TopicName: string | undefined;
  SubscriptionStatus: SubscriptionStatus | undefined;
}
export interface Contact {
  EmailAddress?: string | undefined;
  TopicPreferences?: TopicPreference[] | undefined;
  TopicDefaultPreferences?: TopicPreference[] | undefined;
  UnsubscribeAll?: boolean | undefined;
  LastUpdatedTimestamp?: Date | undefined;
}
export interface ContactList {
  ContactListName?: string | undefined;
  LastUpdatedTimestamp?: Date | undefined;
}
export declare const ContactListImportAction: {
  readonly DELETE: "DELETE";
  readonly PUT: "PUT";
};
export type ContactListImportAction =
  (typeof ContactListImportAction)[keyof typeof ContactListImportAction];
export interface ContactListDestination {
  ContactListName: string | undefined;
  ContactListImportAction: ContactListImportAction | undefined;
}
export declare const TlsPolicy: {
  readonly OPTIONAL: "OPTIONAL";
  readonly REQUIRE: "REQUIRE";
};
export type TlsPolicy = (typeof TlsPolicy)[keyof typeof TlsPolicy];
export interface DeliveryOptions {
  TlsPolicy?: TlsPolicy | undefined;
  SendingPoolName?: string | undefined;
  MaxDeliverySeconds?: number | undefined;
}
export interface ReputationOptions {
  ReputationMetricsEnabled?: boolean | undefined;
  LastFreshStart?: Date | undefined;
}
export interface SendingOptions {
  SendingEnabled?: boolean | undefined;
}
export declare const SuppressionListReason: {
  readonly BOUNCE: "BOUNCE";
  readonly COMPLAINT: "COMPLAINT";
};
export type SuppressionListReason =
  (typeof SuppressionListReason)[keyof typeof SuppressionListReason];
export interface SuppressionOptions {
  SuppressedReasons?: SuppressionListReason[] | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export declare const HttpsPolicy: {
  readonly OPTIONAL: "OPTIONAL";
  readonly REQUIRE: "REQUIRE";
  readonly REQUIRE_OPEN_ONLY: "REQUIRE_OPEN_ONLY";
};
export type HttpsPolicy = (typeof HttpsPolicy)[keyof typeof HttpsPolicy];
export interface TrackingOptions {
  CustomRedirectDomain: string | undefined;
  HttpsPolicy?: HttpsPolicy | undefined;
}
export declare const FeatureStatus: {
  readonly DISABLED: "DISABLED";
  readonly ENABLED: "ENABLED";
};
export type FeatureStatus = (typeof FeatureStatus)[keyof typeof FeatureStatus];
export interface DashboardOptions {
  EngagementMetrics?: FeatureStatus | undefined;
}
export interface GuardianOptions {
  OptimizedSharedDelivery?: FeatureStatus | undefined;
}
export interface VdmOptions {
  DashboardOptions?: DashboardOptions | undefined;
  GuardianOptions?: GuardianOptions | undefined;
}
export interface CreateConfigurationSetRequest {
  ConfigurationSetName: string | undefined;
  TrackingOptions?: TrackingOptions | undefined;
  DeliveryOptions?: DeliveryOptions | undefined;
  ReputationOptions?: ReputationOptions | undefined;
  SendingOptions?: SendingOptions | undefined;
  Tags?: Tag[] | undefined;
  SuppressionOptions?: SuppressionOptions | undefined;
  VdmOptions?: VdmOptions | undefined;
  ArchivingOptions?: ArchivingOptions | undefined;
}
export interface CreateConfigurationSetResponse {}
export declare class LimitExceededException extends __BaseException {
  readonly name: "LimitExceededException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<LimitExceededException, __BaseException>
  );
}
export interface EventBridgeDestination {
  EventBusArn: string | undefined;
}
export interface KinesisFirehoseDestination {
  IamRoleArn: string | undefined;
  DeliveryStreamArn: string | undefined;
}
export declare const EventType: {
  readonly BOUNCE: "BOUNCE";
  readonly CLICK: "CLICK";
  readonly COMPLAINT: "COMPLAINT";
  readonly DELIVERY: "DELIVERY";
  readonly DELIVERY_DELAY: "DELIVERY_DELAY";
  readonly OPEN: "OPEN";
  readonly REJECT: "REJECT";
  readonly RENDERING_FAILURE: "RENDERING_FAILURE";
  readonly SEND: "SEND";
  readonly SUBSCRIPTION: "SUBSCRIPTION";
};
export type EventType = (typeof EventType)[keyof typeof EventType];
export interface PinpointDestination {
  ApplicationArn?: string | undefined;
}
export interface SnsDestination {
  TopicArn: string | undefined;
}
export interface EventDestinationDefinition {
  Enabled?: boolean | undefined;
  MatchingEventTypes?: EventType[] | undefined;
  KinesisFirehoseDestination?: KinesisFirehoseDestination | undefined;
  CloudWatchDestination?: CloudWatchDestination | undefined;
  SnsDestination?: SnsDestination | undefined;
  EventBridgeDestination?: EventBridgeDestination | undefined;
  PinpointDestination?: PinpointDestination | undefined;
}
export interface CreateConfigurationSetEventDestinationRequest {
  ConfigurationSetName: string | undefined;
  EventDestinationName: string | undefined;
  EventDestination: EventDestinationDefinition | undefined;
}
export interface CreateConfigurationSetEventDestinationResponse {}
export interface CreateContactRequest {
  ContactListName: string | undefined;
  EmailAddress: string | undefined;
  TopicPreferences?: TopicPreference[] | undefined;
  UnsubscribeAll?: boolean | undefined;
  AttributesData?: string | undefined;
}
export interface CreateContactResponse {}
export interface Topic {
  TopicName: string | undefined;
  DisplayName: string | undefined;
  Description?: string | undefined;
  DefaultSubscriptionStatus: SubscriptionStatus | undefined;
}
export interface CreateContactListRequest {
  ContactListName: string | undefined;
  Topics?: Topic[] | undefined;
  Description?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface CreateContactListResponse {}
export interface CreateCustomVerificationEmailTemplateRequest {
  TemplateName: string | undefined;
  FromEmailAddress: string | undefined;
  TemplateSubject: string | undefined;
  TemplateContent: string | undefined;
  SuccessRedirectionURL: string | undefined;
  FailureRedirectionURL: string | undefined;
}
export interface CreateCustomVerificationEmailTemplateResponse {}
export declare const ScalingMode: {
  readonly MANAGED: "MANAGED";
  readonly STANDARD: "STANDARD";
};
export type ScalingMode = (typeof ScalingMode)[keyof typeof ScalingMode];
export interface CreateDedicatedIpPoolRequest {
  PoolName: string | undefined;
  Tags?: Tag[] | undefined;
  ScalingMode?: ScalingMode | undefined;
}
export interface CreateDedicatedIpPoolResponse {}
export interface RawMessage {
  Data: Uint8Array | undefined;
}
export interface Message {
  Subject: Content | undefined;
  Body: Body | undefined;
  Headers?: MessageHeader[] | undefined;
  Attachments?: Attachment[] | undefined;
}
export interface EmailContent {
  Simple?: Message | undefined;
  Raw?: RawMessage | undefined;
  Template?: Template | undefined;
}
export interface CreateDeliverabilityTestReportRequest {
  ReportName?: string | undefined;
  FromEmailAddress: string | undefined;
  Content: EmailContent | undefined;
  Tags?: Tag[] | undefined;
}
export declare const DeliverabilityTestStatus: {
  readonly COMPLETED: "COMPLETED";
  readonly IN_PROGRESS: "IN_PROGRESS";
};
export type DeliverabilityTestStatus =
  (typeof DeliverabilityTestStatus)[keyof typeof DeliverabilityTestStatus];
export interface CreateDeliverabilityTestReportResponse {
  ReportId: string | undefined;
  DeliverabilityTestStatus: DeliverabilityTestStatus | undefined;
}
export declare class MailFromDomainNotVerifiedException extends __BaseException {
  readonly name: "MailFromDomainNotVerifiedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      MailFromDomainNotVerifiedException,
      __BaseException
    >
  );
}
export declare class MessageRejected extends __BaseException {
  readonly name: "MessageRejected";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<MessageRejected, __BaseException>);
}
export declare class SendingPausedException extends __BaseException {
  readonly name: "SendingPausedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<SendingPausedException, __BaseException>
  );
}
export declare const DkimSigningAttributesOrigin: {
  readonly AWS_SES: "AWS_SES";
  readonly AWS_SES_AF_SOUTH_1: "AWS_SES_AF_SOUTH_1";
  readonly AWS_SES_AP_NORTHEAST_1: "AWS_SES_AP_NORTHEAST_1";
  readonly AWS_SES_AP_NORTHEAST_2: "AWS_SES_AP_NORTHEAST_2";
  readonly AWS_SES_AP_NORTHEAST_3: "AWS_SES_AP_NORTHEAST_3";
  readonly AWS_SES_AP_SOUTHEAST_1: "AWS_SES_AP_SOUTHEAST_1";
  readonly AWS_SES_AP_SOUTHEAST_2: "AWS_SES_AP_SOUTHEAST_2";
  readonly AWS_SES_AP_SOUTHEAST_3: "AWS_SES_AP_SOUTHEAST_3";
  readonly AWS_SES_AP_SOUTH_1: "AWS_SES_AP_SOUTH_1";
  readonly AWS_SES_AP_SOUTH_2: "AWS_SES_AP_SOUTH_2";
  readonly AWS_SES_CA_CENTRAL_1: "AWS_SES_CA_CENTRAL_1";
  readonly AWS_SES_EU_CENTRAL_1: "AWS_SES_EU_CENTRAL_1";
  readonly AWS_SES_EU_CENTRAL_2: "AWS_SES_EU_CENTRAL_2";
  readonly AWS_SES_EU_NORTH_1: "AWS_SES_EU_NORTH_1";
  readonly AWS_SES_EU_SOUTH_1: "AWS_SES_EU_SOUTH_1";
  readonly AWS_SES_EU_WEST_1: "AWS_SES_EU_WEST_1";
  readonly AWS_SES_EU_WEST_2: "AWS_SES_EU_WEST_2";
  readonly AWS_SES_EU_WEST_3: "AWS_SES_EU_WEST_3";
  readonly AWS_SES_IL_CENTRAL_1: "AWS_SES_IL_CENTRAL_1";
  readonly AWS_SES_ME_CENTRAL_1: "AWS_SES_ME_CENTRAL_1";
  readonly AWS_SES_ME_SOUTH_1: "AWS_SES_ME_SOUTH_1";
  readonly AWS_SES_SA_EAST_1: "AWS_SES_SA_EAST_1";
  readonly AWS_SES_US_EAST_1: "AWS_SES_US_EAST_1";
  readonly AWS_SES_US_EAST_2: "AWS_SES_US_EAST_2";
  readonly AWS_SES_US_WEST_1: "AWS_SES_US_WEST_1";
  readonly AWS_SES_US_WEST_2: "AWS_SES_US_WEST_2";
  readonly EXTERNAL: "EXTERNAL";
};
export type DkimSigningAttributesOrigin =
  (typeof DkimSigningAttributesOrigin)[keyof typeof DkimSigningAttributesOrigin];
export declare const DkimSigningKeyLength: {
  readonly RSA_1024_BIT: "RSA_1024_BIT";
  readonly RSA_2048_BIT: "RSA_2048_BIT";
};
export type DkimSigningKeyLength =
  (typeof DkimSigningKeyLength)[keyof typeof DkimSigningKeyLength];
export interface DkimSigningAttributes {
  DomainSigningSelector?: string | undefined;
  DomainSigningPrivateKey?: string | undefined;
  NextSigningKeyLength?: DkimSigningKeyLength | undefined;
  DomainSigningAttributesOrigin?: DkimSigningAttributesOrigin | undefined;
}
export interface CreateEmailIdentityRequest {
  EmailIdentity: string | undefined;
  Tags?: Tag[] | undefined;
  DkimSigningAttributes?: DkimSigningAttributes | undefined;
  ConfigurationSetName?: string | undefined;
}
export declare const DkimStatus: {
  readonly FAILED: "FAILED";
  readonly NOT_STARTED: "NOT_STARTED";
  readonly PENDING: "PENDING";
  readonly SUCCESS: "SUCCESS";
  readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
export type DkimStatus = (typeof DkimStatus)[keyof typeof DkimStatus];
export interface DkimAttributes {
  SigningEnabled?: boolean | undefined;
  Status?: DkimStatus | undefined;
  Tokens?: string[] | undefined;
  SigningAttributesOrigin?: DkimSigningAttributesOrigin | undefined;
  NextSigningKeyLength?: DkimSigningKeyLength | undefined;
  CurrentSigningKeyLength?: DkimSigningKeyLength | undefined;
  LastKeyGenerationTimestamp?: Date | undefined;
}
export declare const IdentityType: {
  readonly DOMAIN: "DOMAIN";
  readonly EMAIL_ADDRESS: "EMAIL_ADDRESS";
  readonly MANAGED_DOMAIN: "MANAGED_DOMAIN";
};
export type IdentityType = (typeof IdentityType)[keyof typeof IdentityType];
export interface CreateEmailIdentityResponse {
  IdentityType?: IdentityType | undefined;
  VerifiedForSendingStatus?: boolean | undefined;
  DkimAttributes?: DkimAttributes | undefined;
}
export interface CreateEmailIdentityPolicyRequest {
  EmailIdentity: string | undefined;
  PolicyName: string | undefined;
  Policy: string | undefined;
}
export interface CreateEmailIdentityPolicyResponse {}
export interface CreateEmailTemplateRequest {
  TemplateName: string | undefined;
  TemplateContent: EmailTemplateContent | undefined;
}
export interface CreateEmailTemplateResponse {}
export declare const DeliveryEventType: {
  readonly COMPLAINT: "COMPLAINT";
  readonly DELIVERY: "DELIVERY";
  readonly PERMANENT_BOUNCE: "PERMANENT_BOUNCE";
  readonly SEND: "SEND";
  readonly TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE";
  readonly UNDETERMINED_BOUNCE: "UNDETERMINED_BOUNCE";
};
export type DeliveryEventType =
  (typeof DeliveryEventType)[keyof typeof DeliveryEventType];
export declare const EngagementEventType: {
  readonly CLICK: "CLICK";
  readonly OPEN: "OPEN";
};
export type EngagementEventType =
  (typeof EngagementEventType)[keyof typeof EngagementEventType];
export interface MessageInsightsFilters {
  FromEmailAddress?: string[] | undefined;
  Destination?: string[] | undefined;
  Subject?: string[] | undefined;
  Isp?: string[] | undefined;
  LastDeliveryEvent?: DeliveryEventType[] | undefined;
  LastEngagementEvent?: EngagementEventType[] | undefined;
}
export interface MessageInsightsDataSource {
  StartDate: Date | undefined;
  EndDate: Date | undefined;
  Include?: MessageInsightsFilters | undefined;
  Exclude?: MessageInsightsFilters | undefined;
  MaxResults?: number | undefined;
}
export declare const MetricAggregation: {
  readonly RATE: "RATE";
  readonly VOLUME: "VOLUME";
};
export type MetricAggregation =
  (typeof MetricAggregation)[keyof typeof MetricAggregation];
export interface ExportMetric {
  Name?: Metric | undefined;
  Aggregation?: MetricAggregation | undefined;
}
export interface MetricsDataSource {
  Dimensions: Partial<Record<MetricDimensionName, string[]>> | undefined;
  Namespace: MetricNamespace | undefined;
  Metrics: ExportMetric[] | undefined;
  StartDate: Date | undefined;
  EndDate: Date | undefined;
}
export interface ExportDataSource {
  MetricsDataSource?: MetricsDataSource | undefined;
  MessageInsightsDataSource?: MessageInsightsDataSource | undefined;
}
export declare const DataFormat: {
  readonly CSV: "CSV";
  readonly JSON: "JSON";
};
export type DataFormat = (typeof DataFormat)[keyof typeof DataFormat];
export interface ExportDestination {
  DataFormat: DataFormat | undefined;
  S3Url?: string | undefined;
}
export interface CreateExportJobRequest {
  ExportDataSource: ExportDataSource | undefined;
  ExportDestination: ExportDestination | undefined;
}
export interface CreateExportJobResponse {
  JobId?: string | undefined;
}
export interface ImportDataSource {
  S3Url: string | undefined;
  DataFormat: DataFormat | undefined;
}
export declare const SuppressionListImportAction: {
  readonly DELETE: "DELETE";
  readonly PUT: "PUT";
};
export type SuppressionListImportAction =
  (typeof SuppressionListImportAction)[keyof typeof SuppressionListImportAction];
export interface SuppressionListDestination {
  SuppressionListImportAction: SuppressionListImportAction | undefined;
}
export interface ImportDestination {
  SuppressionListDestination?: SuppressionListDestination | undefined;
  ContactListDestination?: ContactListDestination | undefined;
}
export interface CreateImportJobRequest {
  ImportDestination: ImportDestination | undefined;
  ImportDataSource: ImportDataSource | undefined;
}
export interface CreateImportJobResponse {
  JobId?: string | undefined;
}
export interface RouteDetails {
  Region: string | undefined;
}
export interface Details {
  RoutesDetails: RouteDetails[] | undefined;
}
export interface CreateMultiRegionEndpointRequest {
  EndpointName: string | undefined;
  Details: Details | undefined;
  Tags?: Tag[] | undefined;
}
export declare const Status: {
  readonly CREATING: "CREATING";
  readonly DELETING: "DELETING";
  readonly FAILED: "FAILED";
  readonly READY: "READY";
};
export type Status = (typeof Status)[keyof typeof Status];
export interface CreateMultiRegionEndpointResponse {
  Status?: Status | undefined;
  EndpointId?: string | undefined;
}
export interface CreateTenantRequest {
  TenantName: string | undefined;
  Tags?: Tag[] | undefined;
}
export declare const SendingStatus: {
  readonly DISABLED: "DISABLED";
  readonly ENABLED: "ENABLED";
  readonly REINSTATED: "REINSTATED";
};
export type SendingStatus = (typeof SendingStatus)[keyof typeof SendingStatus];
export interface CreateTenantResponse {
  TenantName?: string | undefined;
  TenantId?: string | undefined;
  TenantArn?: string | undefined;
  CreatedTimestamp?: Date | undefined;
  Tags?: Tag[] | undefined;
  SendingStatus?: SendingStatus | undefined;
}
export interface CreateTenantResourceAssociationRequest {
  TenantName: string | undefined;
  ResourceArn: string | undefined;
}
export interface CreateTenantResourceAssociationResponse {}
export interface CustomVerificationEmailTemplateMetadata {
  TemplateName?: string | undefined;
  FromEmailAddress?: string | undefined;
  TemplateSubject?: string | undefined;
  SuccessRedirectionURL?: string | undefined;
  FailureRedirectionURL?: string | undefined;
}
export interface DomainIspPlacement {
  IspName?: string | undefined;
  InboxRawCount?: number | undefined;
  SpamRawCount?: number | undefined;
  InboxPercentage?: number | undefined;
  SpamPercentage?: number | undefined;
}
export interface VolumeStatistics {
  InboxRawCount?: number | undefined;
  SpamRawCount?: number | undefined;
  ProjectedInbox?: number | undefined;
  ProjectedSpam?: number | undefined;
}
export interface DailyVolume {
  StartDate?: Date | undefined;
  VolumeStatistics?: VolumeStatistics | undefined;
  DomainIspPlacements?: DomainIspPlacement[] | undefined;
}
export interface DashboardAttributes {
  EngagementMetrics?: FeatureStatus | undefined;
}
export declare const WarmupStatus: {
  readonly DONE: "DONE";
  readonly IN_PROGRESS: "IN_PROGRESS";
  readonly NOT_APPLICABLE: "NOT_APPLICABLE";
};
export type WarmupStatus = (typeof WarmupStatus)[keyof typeof WarmupStatus];
export interface DedicatedIp {
  Ip: string | undefined;
  WarmupStatus: WarmupStatus | undefined;
  WarmupPercentage: number | undefined;
  PoolName?: string | undefined;
}
export interface DedicatedIpPool {
  PoolName: string | undefined;
  ScalingMode: ScalingMode | undefined;
}
export interface DeleteConfigurationSetRequest {
  ConfigurationSetName: string | undefined;
}
export interface DeleteConfigurationSetResponse {}
export interface DeleteConfigurationSetEventDestinationRequest {
  ConfigurationSetName: string | undefined;
  EventDestinationName: string | undefined;
}
export interface DeleteConfigurationSetEventDestinationResponse {}
export interface DeleteContactRequest {
  ContactListName: string | undefined;
  EmailAddress: string | undefined;
}
export interface DeleteContactResponse {}
export interface DeleteContactListRequest {
  ContactListName: string | undefined;
}
export interface DeleteContactListResponse {}
export interface DeleteCustomVerificationEmailTemplateRequest {
  TemplateName: string | undefined;
}
export interface DeleteCustomVerificationEmailTemplateResponse {}
export interface DeleteDedicatedIpPoolRequest {
  PoolName: string | undefined;
}
export interface DeleteDedicatedIpPoolResponse {}
export interface DeleteEmailIdentityRequest {
  EmailIdentity: string | undefined;
}
export interface DeleteEmailIdentityResponse {}
export interface DeleteEmailIdentityPolicyRequest {
  EmailIdentity: string | undefined;
  PolicyName: string | undefined;
}
export interface DeleteEmailIdentityPolicyResponse {}
export interface DeleteEmailTemplateRequest {
  TemplateName: string | undefined;
}
export interface DeleteEmailTemplateResponse {}
export interface DeleteMultiRegionEndpointRequest {
  EndpointName: string | undefined;
}
export interface DeleteMultiRegionEndpointResponse {
  Status?: Status | undefined;
}
export interface DeleteSuppressedDestinationRequest {
  EmailAddress: string | undefined;
}
export interface DeleteSuppressedDestinationResponse {}
export interface DeleteTenantRequest {
  TenantName: string | undefined;
}
export interface DeleteTenantResponse {}
export interface DeleteTenantResourceAssociationRequest {
  TenantName: string | undefined;
  ResourceArn: string | undefined;
}
export interface DeleteTenantResourceAssociationResponse {}
export declare const DeliverabilityDashboardAccountStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly DISABLED: "DISABLED";
  readonly PENDING_EXPIRATION: "PENDING_EXPIRATION";
};
export type DeliverabilityDashboardAccountStatus =
  (typeof DeliverabilityDashboardAccountStatus)[keyof typeof DeliverabilityDashboardAccountStatus];
export interface DeliverabilityTestReport {
  ReportId?: string | undefined;
  ReportName?: string | undefined;
  Subject?: string | undefined;
  FromEmailAddress?: string | undefined;
  CreateDate?: Date | undefined;
  DeliverabilityTestStatus?: DeliverabilityTestStatus | undefined;
}
export interface DomainDeliverabilityCampaign {
  CampaignId?: string | undefined;
  ImageUrl?: string | undefined;
  Subject?: string | undefined;
  FromAddress?: string | undefined;
  SendingIps?: string[] | undefined;
  FirstSeenDateTime?: Date | undefined;
  LastSeenDateTime?: Date | undefined;
  InboxCount?: number | undefined;
  SpamCount?: number | undefined;
  ReadRate?: number | undefined;
  DeleteRate?: number | undefined;
  ReadDeleteRate?: number | undefined;
  ProjectedVolume?: number | undefined;
  Esps?: string[] | undefined;
}
export interface InboxPlacementTrackingOption {
  Global?: boolean | undefined;
  TrackedIsps?: string[] | undefined;
}
export interface DomainDeliverabilityTrackingOption {
  Domain?: string | undefined;
  SubscriptionStartDate?: Date | undefined;
  InboxPlacementTrackingOption?: InboxPlacementTrackingOption | undefined;
}
export interface EventDetails {
  Bounce?: Bounce | undefined;
  Complaint?: Complaint | undefined;
}
export interface InsightsEvent {
  Timestamp?: Date | undefined;
  Type?: EventType | undefined;
  Details?: EventDetails | undefined;
}
export interface EmailInsights {
  Destination?: string | undefined;
  Isp?: string | undefined;
  Events?: InsightsEvent[] | undefined;
}
export interface EmailTemplateMetadata {
  TemplateName?: string | undefined;
  CreatedTimestamp?: Date | undefined;
}
export interface EventDestination {
  Name: string | undefined;
  Enabled?: boolean | undefined;
  MatchingEventTypes: EventType[] | undefined;
  KinesisFirehoseDestination?: KinesisFirehoseDestination | undefined;
  CloudWatchDestination?: CloudWatchDestination | undefined;
  SnsDestination?: SnsDestination | undefined;
  EventBridgeDestination?: EventBridgeDestination | undefined;
  PinpointDestination?: PinpointDestination | undefined;
}
export declare const ExportSourceType: {
  readonly MESSAGE_INSIGHTS: "MESSAGE_INSIGHTS";
  readonly METRICS_DATA: "METRICS_DATA";
};
export type ExportSourceType =
  (typeof ExportSourceType)[keyof typeof ExportSourceType];
export declare const JobStatus: {
  readonly CANCELLED: "CANCELLED";
  readonly COMPLETED: "COMPLETED";
  readonly CREATED: "CREATED";
  readonly FAILED: "FAILED";
  readonly PROCESSING: "PROCESSING";
};
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
export interface ExportJobSummary {
  JobId?: string | undefined;
  ExportSourceType?: ExportSourceType | undefined;
  JobStatus?: JobStatus | undefined;
  CreatedTimestamp?: Date | undefined;
  CompletedTimestamp?: Date | undefined;
}
export interface ExportStatistics {
  ProcessedRecordsCount?: number | undefined;
  ExportedRecordsCount?: number | undefined;
}
export interface FailureInfo {
  FailedRecordsS3Url?: string | undefined;
  ErrorMessage?: string | undefined;
}
export interface GetAccountRequest {}
export interface SendQuota {
  Max24HourSend?: number | undefined;
  MaxSendRate?: number | undefined;
  SentLast24Hours?: number | undefined;
}
export interface SuppressionAttributes {
  SuppressedReasons?: SuppressionListReason[] | undefined;
}
export interface GuardianAttributes {
  OptimizedSharedDelivery?: FeatureStatus | undefined;
}
export interface VdmAttributes {
  VdmEnabled: FeatureStatus | undefined;
  DashboardAttributes?: DashboardAttributes | undefined;
  GuardianAttributes?: GuardianAttributes | undefined;
}
export interface GetAccountResponse {
  DedicatedIpAutoWarmupEnabled?: boolean | undefined;
  EnforcementStatus?: string | undefined;
  ProductionAccessEnabled?: boolean | undefined;
  SendQuota?: SendQuota | undefined;
  SendingEnabled?: boolean | undefined;
  SuppressionAttributes?: SuppressionAttributes | undefined;
  Details?: AccountDetails | undefined;
  VdmAttributes?: VdmAttributes | undefined;
}
export interface GetBlacklistReportsRequest {
  BlacklistItemNames: string[] | undefined;
}
export interface GetBlacklistReportsResponse {
  BlacklistReport: Record<string, BlacklistEntry[]> | undefined;
}
export interface GetConfigurationSetRequest {
  ConfigurationSetName: string | undefined;
}
export interface GetConfigurationSetResponse {
  ConfigurationSetName?: string | undefined;
  TrackingOptions?: TrackingOptions | undefined;
  DeliveryOptions?: DeliveryOptions | undefined;
  ReputationOptions?: ReputationOptions | undefined;
  SendingOptions?: SendingOptions | undefined;
  Tags?: Tag[] | undefined;
  SuppressionOptions?: SuppressionOptions | undefined;
  VdmOptions?: VdmOptions | undefined;
  ArchivingOptions?: ArchivingOptions | undefined;
}
export interface GetConfigurationSetEventDestinationsRequest {
  ConfigurationSetName: string | undefined;
}
export interface GetConfigurationSetEventDestinationsResponse {
  EventDestinations?: EventDestination[] | undefined;
}
export interface GetContactRequest {
  ContactListName: string | undefined;
  EmailAddress: string | undefined;
}
export interface GetContactResponse {
  ContactListName?: string | undefined;
  EmailAddress?: string | undefined;
  TopicPreferences?: TopicPreference[] | undefined;
  TopicDefaultPreferences?: TopicPreference[] | undefined;
  UnsubscribeAll?: boolean | undefined;
  AttributesData?: string | undefined;
  CreatedTimestamp?: Date | undefined;
  LastUpdatedTimestamp?: Date | undefined;
}
export interface GetContactListRequest {
  ContactListName: string | undefined;
}
export interface GetContactListResponse {
  ContactListName?: string | undefined;
  Topics?: Topic[] | undefined;
  Description?: string | undefined;
  CreatedTimestamp?: Date | undefined;
  LastUpdatedTimestamp?: Date | undefined;
  Tags?: Tag[] | undefined;
}
export interface GetCustomVerificationEmailTemplateRequest {
  TemplateName: string | undefined;
}
export interface GetCustomVerificationEmailTemplateResponse {
  TemplateName?: string | undefined;
  FromEmailAddress?: string | undefined;
  TemplateSubject?: string | undefined;
  TemplateContent?: string | undefined;
  SuccessRedirectionURL?: string | undefined;
  FailureRedirectionURL?: string | undefined;
}
export interface GetDedicatedIpRequest {
  Ip: string | undefined;
}
export interface GetDedicatedIpResponse {
  DedicatedIp?: DedicatedIp | undefined;
}
export interface GetDedicatedIpPoolRequest {
  PoolName: string | undefined;
}
export interface GetDedicatedIpPoolResponse {
  DedicatedIpPool?: DedicatedIpPool | undefined;
}
export interface GetDedicatedIpsRequest {
  PoolName?: string | undefined;
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface GetDedicatedIpsResponse {
  DedicatedIps?: DedicatedIp[] | undefined;
  NextToken?: string | undefined;
}
export interface GetDeliverabilityDashboardOptionsRequest {}
export interface GetDeliverabilityDashboardOptionsResponse {
  DashboardEnabled: boolean | undefined;
  SubscriptionExpiryDate?: Date | undefined;
  AccountStatus?: DeliverabilityDashboardAccountStatus | undefined;
  ActiveSubscribedDomains?: DomainDeliverabilityTrackingOption[] | undefined;
  PendingExpirationSubscribedDomains?:
    | DomainDeliverabilityTrackingOption[]
    | undefined;
}
export interface GetDeliverabilityTestReportRequest {
  ReportId: string | undefined;
}
export interface PlacementStatistics {
  InboxPercentage?: number | undefined;
  SpamPercentage?: number | undefined;
  MissingPercentage?: number | undefined;
  SpfPercentage?: number | undefined;
  DkimPercentage?: number | undefined;
}
export interface IspPlacement {
  IspName?: string | undefined;
  PlacementStatistics?: PlacementStatistics | undefined;
}
export interface GetDeliverabilityTestReportResponse {
  DeliverabilityTestReport: DeliverabilityTestReport | undefined;
  OverallPlacement: PlacementStatistics | undefined;
  IspPlacements: IspPlacement[] | undefined;
  Message?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface GetDomainDeliverabilityCampaignRequest {
  CampaignId: string | undefined;
}
export interface GetDomainDeliverabilityCampaignResponse {
  DomainDeliverabilityCampaign: DomainDeliverabilityCampaign | undefined;
}
export interface GetDomainStatisticsReportRequest {
  Domain: string | undefined;
  StartDate: Date | undefined;
  EndDate: Date | undefined;
}
export interface OverallVolume {
  VolumeStatistics?: VolumeStatistics | undefined;
  ReadRatePercent?: number | undefined;
  DomainIspPlacements?: DomainIspPlacement[] | undefined;
}
export interface GetDomainStatisticsReportResponse {
  OverallVolume: OverallVolume | undefined;
  DailyVolumes: DailyVolume[] | undefined;
}
export interface GetEmailIdentityRequest {
  EmailIdentity: string | undefined;
}
export declare const MailFromDomainStatus: {
  readonly FAILED: "FAILED";
  readonly PENDING: "PENDING";
  readonly SUCCESS: "SUCCESS";
  readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
export type MailFromDomainStatus =
  (typeof MailFromDomainStatus)[keyof typeof MailFromDomainStatus];
export interface MailFromAttributes {
  MailFromDomain: string | undefined;
  MailFromDomainStatus: MailFromDomainStatus | undefined;
  BehaviorOnMxFailure: BehaviorOnMxFailure | undefined;
}
export declare const VerificationError: {
  readonly DNS_SERVER_ERROR: "DNS_SERVER_ERROR";
  readonly HOST_NOT_FOUND: "HOST_NOT_FOUND";
  readonly INVALID_VALUE: "INVALID_VALUE";
  readonly REPLICATION_ACCESS_DENIED: "REPLICATION_ACCESS_DENIED";
  readonly REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED: "REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED";
  readonly REPLICATION_PRIMARY_INVALID_REGION: "REPLICATION_PRIMARY_INVALID_REGION";
  readonly REPLICATION_PRIMARY_NOT_FOUND: "REPLICATION_PRIMARY_NOT_FOUND";
  readonly REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED: "REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED";
  readonly SERVICE_ERROR: "SERVICE_ERROR";
  readonly TYPE_NOT_FOUND: "TYPE_NOT_FOUND";
};
export type VerificationError =
  (typeof VerificationError)[keyof typeof VerificationError];
export interface SOARecord {
  PrimaryNameServer?: string | undefined;
  AdminEmail?: string | undefined;
  SerialNumber?: number | undefined;
}
export interface VerificationInfo {
  LastCheckedTimestamp?: Date | undefined;
  LastSuccessTimestamp?: Date | undefined;
  ErrorType?: VerificationError | undefined;
  SOARecord?: SOARecord | undefined;
}
export declare const VerificationStatus: {
  readonly FAILED: "FAILED";
  readonly NOT_STARTED: "NOT_STARTED";
  readonly PENDING: "PENDING";
  readonly SUCCESS: "SUCCESS";
  readonly TEMPORARY_FAILURE: "TEMPORARY_FAILURE";
};
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];
export interface GetEmailIdentityResponse {
  IdentityType?: IdentityType | undefined;
  FeedbackForwardingStatus?: boolean | undefined;
  VerifiedForSendingStatus?: boolean | undefined;
  DkimAttributes?: DkimAttributes | undefined;
  MailFromAttributes?: MailFromAttributes | undefined;
  Policies?: Record<string, string> | undefined;
  Tags?: Tag[] | undefined;
  ConfigurationSetName?: string | undefined;
  VerificationStatus?: VerificationStatus | undefined;
  VerificationInfo?: VerificationInfo | undefined;
}
export interface GetEmailIdentityPoliciesRequest {
  EmailIdentity: string | undefined;
}
export interface GetEmailIdentityPoliciesResponse {
  Policies?: Record<string, string> | undefined;
}
export interface GetEmailTemplateRequest {
  TemplateName: string | undefined;
}
export interface GetEmailTemplateResponse {
  TemplateName: string | undefined;
  TemplateContent: EmailTemplateContent | undefined;
}
export interface GetExportJobRequest {
  JobId: string | undefined;
}
export interface GetExportJobResponse {
  JobId?: string | undefined;
  ExportSourceType?: ExportSourceType | undefined;
  JobStatus?: JobStatus | undefined;
  ExportDestination?: ExportDestination | undefined;
  ExportDataSource?: ExportDataSource | undefined;
  CreatedTimestamp?: Date | undefined;
  CompletedTimestamp?: Date | undefined;
  FailureInfo?: FailureInfo | undefined;
  Statistics?: ExportStatistics | undefined;
}
export interface GetImportJobRequest {
  JobId: string | undefined;
}
export interface GetImportJobResponse {
  JobId?: string | undefined;
  ImportDestination?: ImportDestination | undefined;
  ImportDataSource?: ImportDataSource | undefined;
  FailureInfo?: FailureInfo | undefined;
  JobStatus?: JobStatus | undefined;
  CreatedTimestamp?: Date | undefined;
  CompletedTimestamp?: Date | undefined;
  ProcessedRecordsCount?: number | undefined;
  FailedRecordsCount?: number | undefined;
}
export interface GetMessageInsightsRequest {
  MessageId: string | undefined;
}
export interface GetMessageInsightsResponse {
  MessageId?: string | undefined;
  FromEmailAddress?: string | undefined;
  Subject?: string | undefined;
  EmailTags?: MessageTag[] | undefined;
  Insights?: EmailInsights[] | undefined;
}
export interface GetMultiRegionEndpointRequest {
  EndpointName: string | undefined;
}
export interface Route {
  Region: string | undefined;
}
export interface GetMultiRegionEndpointResponse {
  EndpointName?: string | undefined;
  EndpointId?: string | undefined;
  Routes?: Route[] | undefined;
  Status?: Status | undefined;
  CreatedTimestamp?: Date | undefined;
  LastUpdatedTimestamp?: Date | undefined;
}
export declare const ReputationEntityType: {
  readonly RESOURCE: "RESOURCE";
};
export type ReputationEntityType =
  (typeof ReputationEntityType)[keyof typeof ReputationEntityType];
export interface GetReputationEntityRequest {
  ReputationEntityReference: string | undefined;
  ReputationEntityType: ReputationEntityType | undefined;
}
export interface StatusRecord {
  Status?: SendingStatus | undefined;
  Cause?: string | undefined;
  LastUpdatedTimestamp?: Date | undefined;
}
export declare const RecommendationImpact: {
  readonly HIGH: "HIGH";
  readonly LOW: "LOW";
};
export type RecommendationImpact =
  (typeof RecommendationImpact)[keyof typeof RecommendationImpact];
export interface ReputationEntity {
  ReputationEntityReference?: string | undefined;
  ReputationEntityType?: ReputationEntityType | undefined;
  ReputationManagementPolicy?: string | undefined;
  CustomerManagedStatus?: StatusRecord | undefined;
  AwsSesManagedStatus?: StatusRecord | undefined;
  SendingStatusAggregate?: SendingStatus | undefined;
  ReputationImpact?: RecommendationImpact | undefined;
}
export interface GetReputationEntityResponse {
  ReputationEntity?: ReputationEntity | undefined;
}
export interface GetSuppressedDestinationRequest {
  EmailAddress: string | undefined;
}
export interface SuppressedDestinationAttributes {
  MessageId?: string | undefined;
  FeedbackId?: string | undefined;
}
export interface SuppressedDestination {
  EmailAddress: string | undefined;
  Reason: SuppressionListReason | undefined;
  LastUpdateTime: Date | undefined;
  Attributes?: SuppressedDestinationAttributes | undefined;
}
export interface GetSuppressedDestinationResponse {
  SuppressedDestination: SuppressedDestination | undefined;
}
export interface GetTenantRequest {
  TenantName: string | undefined;
}
export interface Tenant {
  TenantName?: string | undefined;
  TenantId?: string | undefined;
  TenantArn?: string | undefined;
  CreatedTimestamp?: Date | undefined;
  Tags?: Tag[] | undefined;
  SendingStatus?: SendingStatus | undefined;
}
export interface GetTenantResponse {
  Tenant?: Tenant | undefined;
}
export interface IdentityInfo {
  IdentityType?: IdentityType | undefined;
  IdentityName?: string | undefined;
  SendingEnabled?: boolean | undefined;
  VerificationStatus?: VerificationStatus | undefined;
}
export declare const ImportDestinationType: {
  readonly CONTACT_LIST: "CONTACT_LIST";
  readonly SUPPRESSION_LIST: "SUPPRESSION_LIST";
};
export type ImportDestinationType =
  (typeof ImportDestinationType)[keyof typeof ImportDestinationType];
export interface ImportJobSummary {
  JobId?: string | undefined;
  ImportDestination?: ImportDestination | undefined;
  JobStatus?: JobStatus | undefined;
  CreatedTimestamp?: Date | undefined;
  ProcessedRecordsCount?: number | undefined;
  FailedRecordsCount?: number | undefined;
}
export declare class InvalidNextTokenException extends __BaseException {
  readonly name: "InvalidNextTokenException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidNextTokenException, __BaseException>
  );
}
export interface ListConfigurationSetsRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListConfigurationSetsResponse {
  ConfigurationSets?: string[] | undefined;
  NextToken?: string | undefined;
}
export interface ListContactListsRequest {
  PageSize?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListContactListsResponse {
  ContactLists?: ContactList[] | undefined;
  NextToken?: string | undefined;
}
export interface TopicFilter {
  TopicName?: string | undefined;
  UseDefaultIfPreferenceUnavailable?: boolean | undefined;
}
export interface ListContactsFilter {
  FilteredStatus?: SubscriptionStatus | undefined;
  TopicFilter?: TopicFilter | undefined;
}
export interface ListContactsRequest {
  ContactListName: string | undefined;
  Filter?: ListContactsFilter | undefined;
  PageSize?: number | undefined;
  NextToken?: string | undefined;
}
export interface ListContactsResponse {
  Contacts?: Contact[] | undefined;
  NextToken?: string | undefined;
}
export interface ListCustomVerificationEmailTemplatesRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListCustomVerificationEmailTemplatesResponse {
  CustomVerificationEmailTemplates?:
    | CustomVerificationEmailTemplateMetadata[]
    | undefined;
  NextToken?: string | undefined;
}
export interface ListDedicatedIpPoolsRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListDedicatedIpPoolsResponse {
  DedicatedIpPools?: string[] | undefined;
  NextToken?: string | undefined;
}
export interface ListDeliverabilityTestReportsRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListDeliverabilityTestReportsResponse {
  DeliverabilityTestReports: DeliverabilityTestReport[] | undefined;
  NextToken?: string | undefined;
}
export interface ListDomainDeliverabilityCampaignsRequest {
  StartDate: Date | undefined;
  EndDate: Date | undefined;
  SubscribedDomain: string | undefined;
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListDomainDeliverabilityCampaignsResponse {
  DomainDeliverabilityCampaigns: DomainDeliverabilityCampaign[] | undefined;
  NextToken?: string | undefined;
}
export interface ListEmailIdentitiesRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListEmailIdentitiesResponse {
  EmailIdentities?: IdentityInfo[] | undefined;
  NextToken?: string | undefined;
}
export interface ListEmailTemplatesRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListEmailTemplatesResponse {
  TemplatesMetadata?: EmailTemplateMetadata[] | undefined;
  NextToken?: string | undefined;
}
export interface ListExportJobsRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
  ExportSourceType?: ExportSourceType | undefined;
  JobStatus?: JobStatus | undefined;
}
export interface ListExportJobsResponse {
  ExportJobs?: ExportJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListImportJobsRequest {
  ImportDestinationType?: ImportDestinationType | undefined;
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListImportJobsResponse {
  ImportJobs?: ImportJobSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListManagementOptions {
  ContactListName: string | undefined;
  TopicName?: string | undefined;
}
export interface ListMultiRegionEndpointsRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface MultiRegionEndpoint {
  EndpointName?: string | undefined;
  Status?: Status | undefined;
  EndpointId?: string | undefined;
  Regions?: string[] | undefined;
  CreatedTimestamp?: Date | undefined;
  LastUpdatedTimestamp?: Date | undefined;
}
export interface ListMultiRegionEndpointsResponse {
  MultiRegionEndpoints?: MultiRegionEndpoint[] | undefined;
  NextToken?: string | undefined;
}
export declare const ListRecommendationsFilterKey: {
  readonly IMPACT: "IMPACT";
  readonly RESOURCE_ARN: "RESOURCE_ARN";
  readonly STATUS: "STATUS";
  readonly TYPE: "TYPE";
};
export type ListRecommendationsFilterKey =
  (typeof ListRecommendationsFilterKey)[keyof typeof ListRecommendationsFilterKey];
export interface ListRecommendationsRequest {
  Filter?: Partial<Record<ListRecommendationsFilterKey, string>> | undefined;
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export declare const RecommendationStatus: {
  readonly FIXED: "FIXED";
  readonly OPEN: "OPEN";
};
export type RecommendationStatus =
  (typeof RecommendationStatus)[keyof typeof RecommendationStatus];
export declare const RecommendationType: {
  readonly BIMI: "BIMI";
  readonly BOUNCE: "BOUNCE";
  readonly COMPLAINT: "COMPLAINT";
  readonly DKIM: "DKIM";
  readonly DMARC: "DMARC";
  readonly FEEDBACK_3P: "FEEDBACK_3P";
  readonly IP_LISTING: "IP_LISTING";
  readonly SPF: "SPF";
};
export type RecommendationType =
  (typeof RecommendationType)[keyof typeof RecommendationType];
export interface Recommendation {
  ResourceArn?: string | undefined;
  Type?: RecommendationType | undefined;
  Description?: string | undefined;
  Status?: RecommendationStatus | undefined;
  CreatedTimestamp?: Date | undefined;
  LastUpdatedTimestamp?: Date | undefined;
  Impact?: RecommendationImpact | undefined;
}
export interface ListRecommendationsResponse {
  Recommendations?: Recommendation[] | undefined;
  NextToken?: string | undefined;
}
export declare const ReputationEntityFilterKey: {
  readonly ENTITY_REFERENCE_PREFIX: "ENTITY_REFERENCE_PREFIX";
  readonly ENTITY_TYPE: "ENTITY_TYPE";
  readonly REPUTATION_IMPACT: "REPUTATION_IMPACT";
  readonly STATUS: "SENDING_STATUS";
};
export type ReputationEntityFilterKey =
  (typeof ReputationEntityFilterKey)[keyof typeof ReputationEntityFilterKey];
export interface ListReputationEntitiesRequest {
  Filter?: Partial<Record<ReputationEntityFilterKey, string>> | undefined;
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface ListReputationEntitiesResponse {
  ReputationEntities?: ReputationEntity[] | undefined;
  NextToken?: string | undefined;
}
export interface ListResourceTenantsRequest {
  ResourceArn: string | undefined;
  PageSize?: number | undefined;
  NextToken?: string | undefined;
}
export interface ResourceTenantMetadata {
  TenantName?: string | undefined;
  TenantId?: string | undefined;
  ResourceArn?: string | undefined;
  AssociatedTimestamp?: Date | undefined;
}
export interface ListResourceTenantsResponse {
  ResourceTenants?: ResourceTenantMetadata[] | undefined;
  NextToken?: string | undefined;
}
export declare const AccountDetailsFilterSensitiveLog: (
  obj: AccountDetails
) => any;
export declare const DkimSigningAttributesFilterSensitiveLog: (
  obj: DkimSigningAttributes
) => any;
export declare const CreateEmailIdentityRequestFilterSensitiveLog: (
  obj: CreateEmailIdentityRequest
) => any;
export declare const MessageInsightsFiltersFilterSensitiveLog: (
  obj: MessageInsightsFilters
) => any;
export declare const MessageInsightsDataSourceFilterSensitiveLog: (
  obj: MessageInsightsDataSource
) => any;
export declare const ExportDataSourceFilterSensitiveLog: (
  obj: ExportDataSource
) => any;
export declare const CreateExportJobRequestFilterSensitiveLog: (
  obj: CreateExportJobRequest
) => any;
export declare const EmailInsightsFilterSensitiveLog: (
  obj: EmailInsights
) => any;
export declare const GetAccountResponseFilterSensitiveLog: (
  obj: GetAccountResponse
) => any;
export declare const GetExportJobResponseFilterSensitiveLog: (
  obj: GetExportJobResponse
) => any;
export declare const GetMessageInsightsResponseFilterSensitiveLog: (
  obj: GetMessageInsightsResponse
) => any;
