import {
  BehaviorOnMxFailure,
  BulkEmailContent,
  BulkEmailEntry,
  BulkEmailEntryResult,
  ContactLanguage,
  Destination,
  DkimSigningAttributes,
  DkimSigningAttributesOrigin,
  DkimStatus,
  DomainDeliverabilityTrackingOption,
  EmailContent,
  EmailTemplateContent,
  EventDestinationDefinition,
  HttpsPolicy,
  ListManagementOptions,
  MailType,
  MessageTag,
  ReputationEntityType,
  ScalingMode,
  SendingStatus,
  SuppressionListReason,
  Tag,
  TlsPolicy,
  Topic,
  TopicPreference,
  VdmAttributes,
  VdmOptions,
} from "./models_0";
export interface ListSuppressedDestinationsRequest {
  Reasons?: SuppressionListReason[] | undefined;
  StartDate?: Date | undefined;
  EndDate?: Date | undefined;
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface SuppressedDestinationSummary {
  EmailAddress: string | undefined;
  Reason: SuppressionListReason | undefined;
  LastUpdateTime: Date | undefined;
}
export interface ListSuppressedDestinationsResponse {
  SuppressedDestinationSummaries?: SuppressedDestinationSummary[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTagsForResourceRequest {
  ResourceArn: string | undefined;
}
export interface ListTagsForResourceResponse {
  Tags: Tag[] | undefined;
}
export declare const ListTenantResourcesFilterKey: {
  readonly RESOURCE_TYPE: "RESOURCE_TYPE";
};
export type ListTenantResourcesFilterKey =
  (typeof ListTenantResourcesFilterKey)[keyof typeof ListTenantResourcesFilterKey];
export interface ListTenantResourcesRequest {
  TenantName: string | undefined;
  Filter?: Partial<Record<ListTenantResourcesFilterKey, string>> | undefined;
  PageSize?: number | undefined;
  NextToken?: string | undefined;
}
export declare const ResourceType: {
  readonly CONFIGURATION_SET: "CONFIGURATION_SET";
  readonly EMAIL_IDENTITY: "EMAIL_IDENTITY";
  readonly EMAIL_TEMPLATE: "EMAIL_TEMPLATE";
};
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];
export interface TenantResource {
  ResourceType?: ResourceType | undefined;
  ResourceArn?: string | undefined;
}
export interface ListTenantResourcesResponse {
  TenantResources?: TenantResource[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTenantsRequest {
  NextToken?: string | undefined;
  PageSize?: number | undefined;
}
export interface TenantInfo {
  TenantName?: string | undefined;
  TenantId?: string | undefined;
  TenantArn?: string | undefined;
  CreatedTimestamp?: Date | undefined;
}
export interface ListTenantsResponse {
  Tenants?: TenantInfo[] | undefined;
  NextToken?: string | undefined;
}
export interface PutAccountDedicatedIpWarmupAttributesRequest {
  AutoWarmupEnabled?: boolean | undefined;
}
export interface PutAccountDedicatedIpWarmupAttributesResponse {}
export interface PutAccountDetailsRequest {
  MailType: MailType | undefined;
  WebsiteURL: string | undefined;
  ContactLanguage?: ContactLanguage | undefined;
  UseCaseDescription?: string | undefined;
  AdditionalContactEmailAddresses?: string[] | undefined;
  ProductionAccessEnabled?: boolean | undefined;
}
export interface PutAccountDetailsResponse {}
export interface PutAccountSendingAttributesRequest {
  SendingEnabled?: boolean | undefined;
}
export interface PutAccountSendingAttributesResponse {}
export interface PutAccountSuppressionAttributesRequest {
  SuppressedReasons?: SuppressionListReason[] | undefined;
}
export interface PutAccountSuppressionAttributesResponse {}
export interface PutAccountVdmAttributesRequest {
  VdmAttributes: VdmAttributes | undefined;
}
export interface PutAccountVdmAttributesResponse {}
export interface PutConfigurationSetArchivingOptionsRequest {
  ConfigurationSetName: string | undefined;
  ArchiveArn?: string | undefined;
}
export interface PutConfigurationSetArchivingOptionsResponse {}
export interface PutConfigurationSetDeliveryOptionsRequest {
  ConfigurationSetName: string | undefined;
  TlsPolicy?: TlsPolicy | undefined;
  SendingPoolName?: string | undefined;
  MaxDeliverySeconds?: number | undefined;
}
export interface PutConfigurationSetDeliveryOptionsResponse {}
export interface PutConfigurationSetReputationOptionsRequest {
  ConfigurationSetName: string | undefined;
  ReputationMetricsEnabled?: boolean | undefined;
}
export interface PutConfigurationSetReputationOptionsResponse {}
export interface PutConfigurationSetSendingOptionsRequest {
  ConfigurationSetName: string | undefined;
  SendingEnabled?: boolean | undefined;
}
export interface PutConfigurationSetSendingOptionsResponse {}
export interface PutConfigurationSetSuppressionOptionsRequest {
  ConfigurationSetName: string | undefined;
  SuppressedReasons?: SuppressionListReason[] | undefined;
}
export interface PutConfigurationSetSuppressionOptionsResponse {}
export interface PutConfigurationSetTrackingOptionsRequest {
  ConfigurationSetName: string | undefined;
  CustomRedirectDomain?: string | undefined;
  HttpsPolicy?: HttpsPolicy | undefined;
}
export interface PutConfigurationSetTrackingOptionsResponse {}
export interface PutConfigurationSetVdmOptionsRequest {
  ConfigurationSetName: string | undefined;
  VdmOptions?: VdmOptions | undefined;
}
export interface PutConfigurationSetVdmOptionsResponse {}
export interface PutDedicatedIpInPoolRequest {
  Ip: string | undefined;
  DestinationPoolName: string | undefined;
}
export interface PutDedicatedIpInPoolResponse {}
export interface PutDedicatedIpPoolScalingAttributesRequest {
  PoolName: string | undefined;
  ScalingMode: ScalingMode | undefined;
}
export interface PutDedicatedIpPoolScalingAttributesResponse {}
export interface PutDedicatedIpWarmupAttributesRequest {
  Ip: string | undefined;
  WarmupPercentage: number | undefined;
}
export interface PutDedicatedIpWarmupAttributesResponse {}
export interface PutDeliverabilityDashboardOptionRequest {
  DashboardEnabled: boolean | undefined;
  SubscribedDomains?: DomainDeliverabilityTrackingOption[] | undefined;
}
export interface PutDeliverabilityDashboardOptionResponse {}
export interface PutEmailIdentityConfigurationSetAttributesRequest {
  EmailIdentity: string | undefined;
  ConfigurationSetName?: string | undefined;
}
export interface PutEmailIdentityConfigurationSetAttributesResponse {}
export interface PutEmailIdentityDkimAttributesRequest {
  EmailIdentity: string | undefined;
  SigningEnabled?: boolean | undefined;
}
export interface PutEmailIdentityDkimAttributesResponse {}
export interface PutEmailIdentityDkimSigningAttributesRequest {
  EmailIdentity: string | undefined;
  SigningAttributesOrigin: DkimSigningAttributesOrigin | undefined;
  SigningAttributes?: DkimSigningAttributes | undefined;
}
export interface PutEmailIdentityDkimSigningAttributesResponse {
  DkimStatus?: DkimStatus | undefined;
  DkimTokens?: string[] | undefined;
}
export interface PutEmailIdentityFeedbackAttributesRequest {
  EmailIdentity: string | undefined;
  EmailForwardingEnabled?: boolean | undefined;
}
export interface PutEmailIdentityFeedbackAttributesResponse {}
export interface PutEmailIdentityMailFromAttributesRequest {
  EmailIdentity: string | undefined;
  MailFromDomain?: string | undefined;
  BehaviorOnMxFailure?: BehaviorOnMxFailure | undefined;
}
export interface PutEmailIdentityMailFromAttributesResponse {}
export interface PutSuppressedDestinationRequest {
  EmailAddress: string | undefined;
  Reason: SuppressionListReason | undefined;
}
export interface PutSuppressedDestinationResponse {}
export interface SendBulkEmailRequest {
  FromEmailAddress?: string | undefined;
  FromEmailAddressIdentityArn?: string | undefined;
  ReplyToAddresses?: string[] | undefined;
  FeedbackForwardingEmailAddress?: string | undefined;
  FeedbackForwardingEmailAddressIdentityArn?: string | undefined;
  DefaultEmailTags?: MessageTag[] | undefined;
  DefaultContent: BulkEmailContent | undefined;
  BulkEmailEntries: BulkEmailEntry[] | undefined;
  ConfigurationSetName?: string | undefined;
  EndpointId?: string | undefined;
  TenantName?: string | undefined;
}
export interface SendBulkEmailResponse {
  BulkEmailEntryResults: BulkEmailEntryResult[] | undefined;
}
export interface SendCustomVerificationEmailRequest {
  EmailAddress: string | undefined;
  TemplateName: string | undefined;
  ConfigurationSetName?: string | undefined;
}
export interface SendCustomVerificationEmailResponse {
  MessageId?: string | undefined;
}
export interface SendEmailRequest {
  FromEmailAddress?: string | undefined;
  FromEmailAddressIdentityArn?: string | undefined;
  Destination?: Destination | undefined;
  ReplyToAddresses?: string[] | undefined;
  FeedbackForwardingEmailAddress?: string | undefined;
  FeedbackForwardingEmailAddressIdentityArn?: string | undefined;
  Content: EmailContent | undefined;
  EmailTags?: MessageTag[] | undefined;
  ConfigurationSetName?: string | undefined;
  EndpointId?: string | undefined;
  TenantName?: string | undefined;
  ListManagementOptions?: ListManagementOptions | undefined;
}
export interface SendEmailResponse {
  MessageId?: string | undefined;
}
export interface TagResourceRequest {
  ResourceArn: string | undefined;
  Tags: Tag[] | undefined;
}
export interface TagResourceResponse {}
export interface TestRenderEmailTemplateRequest {
  TemplateName: string | undefined;
  TemplateData: string | undefined;
}
export interface TestRenderEmailTemplateResponse {
  RenderedTemplate: string | undefined;
}
export interface UntagResourceRequest {
  ResourceArn: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagResourceResponse {}
export interface UpdateConfigurationSetEventDestinationRequest {
  ConfigurationSetName: string | undefined;
  EventDestinationName: string | undefined;
  EventDestination: EventDestinationDefinition | undefined;
}
export interface UpdateConfigurationSetEventDestinationResponse {}
export interface UpdateContactRequest {
  ContactListName: string | undefined;
  EmailAddress: string | undefined;
  TopicPreferences?: TopicPreference[] | undefined;
  UnsubscribeAll?: boolean | undefined;
  AttributesData?: string | undefined;
}
export interface UpdateContactResponse {}
export interface UpdateContactListRequest {
  ContactListName: string | undefined;
  Topics?: Topic[] | undefined;
  Description?: string | undefined;
}
export interface UpdateContactListResponse {}
export interface UpdateCustomVerificationEmailTemplateRequest {
  TemplateName: string | undefined;
  FromEmailAddress: string | undefined;
  TemplateSubject: string | undefined;
  TemplateContent: string | undefined;
  SuccessRedirectionURL: string | undefined;
  FailureRedirectionURL: string | undefined;
}
export interface UpdateCustomVerificationEmailTemplateResponse {}
export interface UpdateEmailIdentityPolicyRequest {
  EmailIdentity: string | undefined;
  PolicyName: string | undefined;
  Policy: string | undefined;
}
export interface UpdateEmailIdentityPolicyResponse {}
export interface UpdateEmailTemplateRequest {
  TemplateName: string | undefined;
  TemplateContent: EmailTemplateContent | undefined;
}
export interface UpdateEmailTemplateResponse {}
export interface UpdateReputationEntityCustomerManagedStatusRequest {
  ReputationEntityType: ReputationEntityType | undefined;
  ReputationEntityReference: string | undefined;
  SendingStatus: SendingStatus | undefined;
}
export interface UpdateReputationEntityCustomerManagedStatusResponse {}
export interface UpdateReputationEntityPolicyRequest {
  ReputationEntityType: ReputationEntityType | undefined;
  ReputationEntityReference: string | undefined;
  ReputationEntityPolicy: string | undefined;
}
export interface UpdateReputationEntityPolicyResponse {}
export declare const PutAccountDetailsRequestFilterSensitiveLog: (
  obj: PutAccountDetailsRequest
) => any;
export declare const PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog: (
  obj: PutEmailIdentityDkimSigningAttributesRequest
) => any;
