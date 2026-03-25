import { BehaviorOnMxFailure, BulkEmailContent, BulkEmailEntry, BulkEmailEntryResult, ContactLanguage, Destination, DkimSigningAttributes, DkimSigningAttributesOrigin, DkimStatus, DomainDeliverabilityTrackingOption, EmailContent, EmailTemplateContent, EventDestinationDefinition, HttpsPolicy, ListManagementOptions, MailType, MessageTag, ReputationEntityType, ScalingMode, SendingStatus, SuppressionListReason, Tag, TlsPolicy, Topic, TopicPreference, VdmAttributes, VdmOptions } from "./models_0";
/**
 * <p>A request to obtain a list of email destinations that are on the suppression list for
 *             your account.</p>
 * @public
 */
export interface ListSuppressedDestinationsRequest {
    /**
     * <p>The factors that caused the email address to be added to .</p>
     * @public
     */
    Reasons?: SuppressionListReason[] | undefined;
    /**
     * <p>Used to filter the list of suppressed email destinations so that it only includes
     *             addresses that were added to the list after a specific date.</p>
     * @public
     */
    StartDate?: Date | undefined;
    /**
     * <p>Used to filter the list of suppressed email destinations so that it only includes
     *             addresses that were added to the list before a specific date.</p>
     * @public
     */
    EndDate?: Date | undefined;
    /**
     * <p>A token returned from a previous call to <code>ListSuppressedDestinations</code> to
     *             indicate the position in the list of suppressed email addresses.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to
     *                 <code>ListSuppressedDestinations</code>. If the number of results is larger than the
     *             number you specified in this parameter, then the response includes a
     *                 <code>NextToken</code> element, which you can use to obtain additional
     *             results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A summary that describes the suppressed email address.</p>
 * @public
 */
export interface SuppressedDestinationSummary {
    /**
     * <p>The email address that's on the suppression list for your account.</p>
     * @public
     */
    EmailAddress: string | undefined;
    /**
     * <p>The reason that the address was added to the suppression list for your account.</p>
     * @public
     */
    Reason: SuppressionListReason | undefined;
    /**
     * <p>The date and time when the suppressed destination was last updated, shown in Unix time
     *             format.</p>
     * @public
     */
    LastUpdateTime: Date | undefined;
}
/**
 * <p>A list of suppressed email addresses.</p>
 * @public
 */
export interface ListSuppressedDestinationsResponse {
    /**
     * <p>A list of summaries, each containing a summary for a suppressed email
     *             destination.</p>
     * @public
     */
    SuppressedDestinationSummaries?: SuppressedDestinationSummary[] | undefined;
    /**
     * <p>A token that indicates that there are additional email addresses on the suppression
     *             list for your account. To view additional suppressed addresses, issue another request to
     *                 <code>ListSuppressedDestinations</code>, and pass this token in the
     *                 <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 */
export interface ListTagsForResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource that you want to retrieve tag
     *             information for.</p>
     * @public
     */
    ResourceArn: string | undefined;
}
/**
 * @public
 */
export interface ListTagsForResourceResponse {
    /**
     * <p>An array that lists all the tags that are associated with the resource. Each tag
     *             consists of a required tag key (<code>Key</code>) and an associated tag value
     *                 (<code>Value</code>)</p>
     * @public
     */
    Tags: Tag[] | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ListTenantResourcesFilterKey: {
    readonly RESOURCE_TYPE: "RESOURCE_TYPE";
};
/**
 * @public
 */
export type ListTenantResourcesFilterKey = (typeof ListTenantResourcesFilterKey)[keyof typeof ListTenantResourcesFilterKey];
/**
 * <p>Represents a request to list resources associated with a specific tenant.</p>
 * @public
 */
export interface ListTenantResourcesRequest {
    /**
     * <p>The name of the tenant to list resources for.</p>
     * @public
     */
    TenantName: string | undefined;
    /**
     * <p>A map of filter keys and values for filtering the list of tenant resources. Currently,
     *             the only supported filter key is <code>RESOURCE_TYPE</code>.</p>
     * @public
     */
    Filter?: Partial<Record<ListTenantResourcesFilterKey, string>> | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListTenantResources</code>.
     *             If the number of results is larger than the number you specified in this parameter,
     *             then the response includes a <code>NextToken</code> element, which you can use to obtain additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
    /**
     * <p>A token returned from a previous call to <code>ListTenantResources</code> to indicate the position in the list of tenant resources.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ResourceType: {
    readonly CONFIGURATION_SET: "CONFIGURATION_SET";
    readonly EMAIL_IDENTITY: "EMAIL_IDENTITY";
    readonly EMAIL_TEMPLATE: "EMAIL_TEMPLATE";
};
/**
 * @public
 */
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];
/**
 * <p>A structure that contains information about a resource associated with a tenant.</p>
 * @public
 */
export interface TenantResource {
    /**
     * <p>The type of resource associated with the tenant. Valid values are <code>EMAIL_IDENTITY</code>,
     *             <code>CONFIGURATION_SET</code>, or <code>EMAIL_TEMPLATE</code>.</p>
     * @public
     */
    ResourceType?: ResourceType | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the resource associated with the tenant.</p>
     * @public
     */
    ResourceArn?: string | undefined;
}
/**
 * <p>Information about resources associated with a specific tenant.</p>
 * @public
 */
export interface ListTenantResourcesResponse {
    /**
     * <p>An array that contains information about each resource associated with the tenant.</p>
     * @public
     */
    TenantResources?: TenantResource[] | undefined;
    /**
     * <p>A token that indicates that there are additional resources to list. To view additional resources,
     *             issue another request to <code>ListTenantResources</code>, and pass this token in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>Represents a request to list all tenants associated with your account in the current Amazon Web Services Region.</p>
 * @public
 */
export interface ListTenantsRequest {
    /**
     * <p>A token returned from a previous call to <code>ListTenants</code> to indicate the position in the list of tenants.</p>
     * @public
     */
    NextToken?: string | undefined;
    /**
     * <p>The number of results to show in a single call to <code>ListTenants</code>.
     *             If the number of results is larger than the number you specified in this parameter,
     *             then the response includes a <code>NextToken</code> element, which you can use to obtain additional results.</p>
     * @public
     */
    PageSize?: number | undefined;
}
/**
 * <p>A structure that contains basic information about a tenant.</p>
 * @public
 */
export interface TenantInfo {
    /**
     * <p>The name of the tenant.</p>
     * @public
     */
    TenantName?: string | undefined;
    /**
     * <p>A unique identifier for the tenant.</p>
     * @public
     */
    TenantId?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the tenant.</p>
     * @public
     */
    TenantArn?: string | undefined;
    /**
     * <p>The date and time when the tenant was created.</p>
     * @public
     */
    CreatedTimestamp?: Date | undefined;
}
/**
 * <p>Information about tenants associated with your account.</p>
 * @public
 */
export interface ListTenantsResponse {
    /**
     * <p>An array that contains basic information about each tenant.</p>
     * @public
     */
    Tenants?: TenantInfo[] | undefined;
    /**
     * <p>A token that indicates that there are additional tenants to list. To view additional tenants,
     *             issue another request to <code>ListTenants</code>, and pass this token in the <code>NextToken</code> parameter.</p>
     * @public
     */
    NextToken?: string | undefined;
}
/**
 * <p>A request to enable or disable the automatic IP address warm-up feature.</p>
 * @public
 */
export interface PutAccountDedicatedIpWarmupAttributesRequest {
    /**
     * <p>Enables or disables the automatic warm-up feature for dedicated IP addresses that are
     *             associated with your Amazon SES account in the current Amazon Web Services Region. Set to <code>true</code>
     *             to enable the automatic warm-up feature, or set to <code>false</code> to disable
     *             it.</p>
     * @public
     */
    AutoWarmupEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutAccountDedicatedIpWarmupAttributesResponse {
}
/**
 * <p>A request to submit new account details.</p>
 * @public
 */
export interface PutAccountDetailsRequest {
    /**
     * <p>The type of email your account will send.</p>
     * @public
     */
    MailType: MailType | undefined;
    /**
     * <p>The URL of your website. This information helps us better understand the type of
     *             content that you plan to send.</p>
     * @public
     */
    WebsiteURL: string | undefined;
    /**
     * <p>The language you would prefer to be contacted with.</p>
     * @public
     */
    ContactLanguage?: ContactLanguage | undefined;
    /**
     * <p>A description of the types of email that you plan to send.</p>
     *
     * @deprecated Use case description is optional and deprecated
     * @public
     */
    UseCaseDescription?: string | undefined;
    /**
     * <p>Additional email addresses that you would like to be notified regarding Amazon SES
     *             matters.</p>
     * @public
     */
    AdditionalContactEmailAddresses?: string[] | undefined;
    /**
     * <p>Indicates whether or not your account should have production access in the current
     *             Amazon Web Services Region.</p>
     *          <p>If the value is <code>false</code>, then your account is in the
     *                 <i>sandbox</i>. When your account is in the sandbox, you can only send
     *             email to verified identities.
     *             </p>
     *          <p>If the value is <code>true</code>, then your account has production access. When your
     *             account has production access, you can send email to any address. The sending quota and
     *             maximum sending rate for your account vary based on your specific use case.</p>
     * @public
     */
    ProductionAccessEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutAccountDetailsResponse {
}
/**
 * <p>A request to change the ability of your account to send email.</p>
 * @public
 */
export interface PutAccountSendingAttributesRequest {
    /**
     * <p>Enables or disables your account's ability to send email. Set to <code>true</code> to
     *             enable email sending, or set to <code>false</code> to disable email sending.</p>
     *          <note>
     *             <p>If Amazon Web Services paused your account's ability to send email, you can't use this operation
     *                 to resume your account's ability to send email.</p>
     *          </note>
     * @public
     */
    SendingEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutAccountSendingAttributesResponse {
}
/**
 * <p>A request to change your account's suppression preferences.</p>
 * @public
 */
export interface PutAccountSuppressionAttributesRequest {
    /**
     * <p>A list that contains the reasons that email addresses will be automatically added to
     *             the suppression list for your account. This list can contain any or all of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a
     *                     complaint.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>BOUNCE</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a hard
     *                     bounce.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SuppressedReasons?: SuppressionListReason[] | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutAccountSuppressionAttributesResponse {
}
/**
 * <p>A request to submit new account VDM attributes.</p>
 * @public
 */
export interface PutAccountVdmAttributesRequest {
    /**
     * <p>The VDM attributes that you wish to apply to your Amazon SES account.</p>
     * @public
     */
    VdmAttributes: VdmAttributes | undefined;
}
/**
 * @public
 */
export interface PutAccountVdmAttributesResponse {
}
/**
 * <p>A request to associate a configuration set with a MailManager archive.</p>
 * @public
 */
export interface PutConfigurationSetArchivingOptionsRequest {
    /**
     * <p>The name of the configuration set to associate with a MailManager archive.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the MailManager archive that the Amazon SES API v2 sends email
     *             to.</p>
     * @public
     */
    ArchiveArn?: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetArchivingOptionsResponse {
}
/**
 * <p>A request to associate a configuration set with a dedicated IP pool.</p>
 * @public
 */
export interface PutConfigurationSetDeliveryOptionsRequest {
    /**
     * <p>The name of the configuration set to associate with a dedicated IP pool.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>Specifies whether messages that use the configuration set are required to use
     *             Transport Layer Security (TLS). If the value is <code>Require</code>, messages are only
     *             delivered if a TLS connection can be established. If the value is <code>Optional</code>,
     *             messages can be delivered in plain text if a TLS connection can't be established.</p>
     * @public
     */
    TlsPolicy?: TlsPolicy | undefined;
    /**
     * <p>The name of the dedicated IP pool to associate with the configuration set.</p>
     * @public
     */
    SendingPoolName?: string | undefined;
    /**
     * <p>The maximum amount of time, in seconds, that Amazon SES API v2 will attempt delivery of email.
     *             If specified, the value must greater than or equal to 300 seconds (5 minutes)
     *             and less than or equal to 50400 seconds (840 minutes).
     *         </p>
     * @public
     */
    MaxDeliverySeconds?: number | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetDeliveryOptionsResponse {
}
/**
 * <p>A request to enable or disable tracking of reputation metrics for a configuration
 *             set.</p>
 * @public
 */
export interface PutConfigurationSetReputationOptionsRequest {
    /**
     * <p>The name of the configuration set.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>If <code>true</code>, tracking of reputation metrics is enabled for the configuration
     *             set. If <code>false</code>, tracking of reputation metrics is disabled for the
     *             configuration set.</p>
     * @public
     */
    ReputationMetricsEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetReputationOptionsResponse {
}
/**
 * <p>A request to enable or disable the ability of Amazon SES to send emails that use a specific
 *             configuration set.</p>
 * @public
 */
export interface PutConfigurationSetSendingOptionsRequest {
    /**
     * <p>The name of the configuration set to enable or disable email sending for.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>If <code>true</code>, email sending is enabled for the configuration set. If
     *                 <code>false</code>, email sending is disabled for the configuration set.</p>
     * @public
     */
    SendingEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetSendingOptionsResponse {
}
/**
 * <p>A request to change the account suppression list preferences for a specific
 *             configuration set.</p>
 * @public
 */
export interface PutConfigurationSetSuppressionOptionsRequest {
    /**
     * <p>The name of the configuration set to change the suppression list preferences
     *             for.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>A list that contains the reasons that email addresses are automatically added to the
     *             suppression list for your account. This list can contain any or all of the
     *             following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>COMPLAINT</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a
     *                     complaint.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>BOUNCE</code> – Amazon SES adds an email address to the suppression
     *                     list for your account when a message sent to that address results in a hard
     *                     bounce.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SuppressedReasons?: SuppressionListReason[] | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetSuppressionOptionsResponse {
}
/**
 * <p>A request to add a custom domain for tracking open and click events to a configuration
 *             set.</p>
 * @public
 */
export interface PutConfigurationSetTrackingOptionsRequest {
    /**
     * <p>The name of the configuration set.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>The domain to use to track open and click events.</p>
     * @public
     */
    CustomRedirectDomain?: string | undefined;
    /**
     * <p>The https policy to use for tracking open and click events. If the value is OPTIONAL or HttpsPolicy is not
     *         specified, the open trackers use HTTP and click tracker use the original protocol of the link.
     *         If the value is REQUIRE, both open and click tracker uses HTTPS and if the value is REQUIRE_OPEN_ONLY
     *             open tracker uses HTTPS and link tracker is same as original protocol of the link.
     *         </p>
     * @public
     */
    HttpsPolicy?: HttpsPolicy | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetTrackingOptionsResponse {
}
/**
 * <p>A request to add specific VDM settings to a configuration set.</p>
 * @public
 */
export interface PutConfigurationSetVdmOptionsRequest {
    /**
     * <p>The name of the configuration set.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>The VDM options to apply to the configuration set.</p>
     * @public
     */
    VdmOptions?: VdmOptions | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutConfigurationSetVdmOptionsResponse {
}
/**
 * <p>A request to move a dedicated IP address to a dedicated IP pool.</p>
 * @public
 */
export interface PutDedicatedIpInPoolRequest {
    /**
     * <p>The IP address that you want to move to the dedicated IP pool. The value you specify
     *             has to be a dedicated IP address that's associated with your Amazon Web Services account.</p>
     * @public
     */
    Ip: string | undefined;
    /**
     * <p>The name of the IP pool that you want to add the dedicated IP address to. You have to
     *             specify an IP pool that already exists.</p>
     * @public
     */
    DestinationPoolName: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutDedicatedIpInPoolResponse {
}
/**
 * <p>A request to convert a dedicated IP pool to a different scaling mode.</p>
 * @public
 */
export interface PutDedicatedIpPoolScalingAttributesRequest {
    /**
     * <p>The name of the dedicated IP pool.</p>
     * @public
     */
    PoolName: string | undefined;
    /**
     * <p>The scaling mode to apply to the dedicated IP pool.</p>
     *          <note>
     *             <p>Changing the scaling mode from <code>MANAGED</code> to <code>STANDARD</code> is not supported.</p>
     *          </note>
     * @public
     */
    ScalingMode: ScalingMode | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutDedicatedIpPoolScalingAttributesResponse {
}
/**
 * <p>A request to change the warm-up attributes for a dedicated IP address. This operation
 *             is useful when you want to resume the warm-up process for an existing IP address.</p>
 * @public
 */
export interface PutDedicatedIpWarmupAttributesRequest {
    /**
     * <p>The dedicated IP address that you want to update the warm-up attributes for.</p>
     * @public
     */
    Ip: string | undefined;
    /**
     * <p>The warm-up percentage that you want to associate with the dedicated IP
     *             address.</p>
     * @public
     */
    WarmupPercentage: number | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutDedicatedIpWarmupAttributesResponse {
}
/**
 * <p>Enable or disable the Deliverability dashboard. When you enable the Deliverability dashboard, you gain
 *             access to reputation, deliverability, and other metrics for the domains that you use to
 *             send email using Amazon SES API v2. You also gain the ability to perform predictive inbox placement tests.</p>
 *          <p>When you use the Deliverability dashboard, you pay a monthly subscription charge, in addition
 *             to any other fees that you accrue by using Amazon SES and other Amazon Web Services services. For more
 *             information about the features and cost of a Deliverability dashboard subscription, see <a href="http://aws.amazon.com/pinpoint/pricing/">Amazon Pinpoint Pricing</a>.</p>
 * @public
 */
export interface PutDeliverabilityDashboardOptionRequest {
    /**
     * <p>Specifies whether to enable the Deliverability dashboard. To enable the dashboard, set this
     *             value to <code>true</code>.</p>
     * @public
     */
    DashboardEnabled: boolean | undefined;
    /**
     * <p>An array of objects, one for each verified domain that you use to send email and
     *             enabled the Deliverability dashboard for.</p>
     * @public
     */
    SubscribedDomains?: DomainDeliverabilityTrackingOption[] | undefined;
}
/**
 * <p>A response that indicates whether the Deliverability dashboard is enabled.</p>
 * @public
 */
export interface PutDeliverabilityDashboardOptionResponse {
}
/**
 * <p>A request to associate a configuration set with an email identity.</p>
 * @public
 */
export interface PutEmailIdentityConfigurationSetAttributesRequest {
    /**
     * <p>The email address or domain to associate with a configuration set.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>The configuration set to associate with an email identity.</p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface PutEmailIdentityConfigurationSetAttributesResponse {
}
/**
 * <p>A request to enable or disable DKIM signing of email that you send from an email
 *             identity.</p>
 * @public
 */
export interface PutEmailIdentityDkimAttributesRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>Sets the DKIM signing configuration for the identity.</p>
     *          <p>When you set this value <code>true</code>, then the messages that are sent from the
     *             identity are signed using DKIM. If you set this value to <code>false</code>, your
     *             messages are sent without DKIM signing.</p>
     * @public
     */
    SigningEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutEmailIdentityDkimAttributesResponse {
}
/**
 * <p>A request to change the DKIM attributes for an email identity.</p>
 * @public
 */
export interface PutEmailIdentityDkimSigningAttributesRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>The method to use to configure DKIM for the identity. There are the following possible
     *             values:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>AWS_SES</code> – Configure DKIM for the identity by using <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy
     *                         DKIM</a>.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>EXTERNAL</code> – Configure DKIM for the identity by using Bring
     *                     Your Own DKIM (BYODKIM).</p>
     *             </li>
     *          </ul>
     * @public
     */
    SigningAttributesOrigin: DkimSigningAttributesOrigin | undefined;
    /**
     * <p>An object that contains information about the private key and selector that you want
     *             to use to configure DKIM for the identity for Bring Your Own DKIM (BYODKIM) for the
     *             identity, or, configures the key length to be used for <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy DKIM</a>.</p>
     * @public
     */
    SigningAttributes?: DkimSigningAttributes | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response.</p>
 *          <p>The following data is returned in JSON format by the service.</p>
 * @public
 */
export interface PutEmailIdentityDkimSigningAttributesResponse {
    /**
     * <p>The DKIM authentication status of the identity. Amazon SES determines the authentication
     *             status by searching for specific records in the DNS configuration for your domain. If
     *             you used <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy
     *                 DKIM</a> to set up DKIM authentication, Amazon SES tries to find three unique CNAME
     *             records in the DNS configuration for your domain.</p>
     *          <p>If you provided a public key to perform DKIM authentication, Amazon SES tries to find a TXT
     *             record that uses the selector that you specified. The value of the TXT record must be a
     *             public key that's paired with the private key that you specified in the process of
     *             creating the identity.</p>
     *          <p>The status can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>PENDING</code> – The verification process was initiated, but Amazon SES
     *                     hasn't yet detected the DKIM records in the DNS configuration for the
     *                     domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SUCCESS</code> – The verification process completed
     *                     successfully.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> – The verification process failed. This typically
     *                     occurs when Amazon SES fails to find the DKIM records in the DNS configuration of the
     *                     domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TEMPORARY_FAILURE</code> – A temporary issue is preventing Amazon SES
     *                     from determining the DKIM authentication status of the domain.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>NOT_STARTED</code> – The DKIM verification process hasn't been
     *                     initiated for the domain.</p>
     *             </li>
     *          </ul>
     * @public
     */
    DkimStatus?: DkimStatus | undefined;
    /**
     * <p>If you used <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html">Easy DKIM</a> to configure DKIM authentication for the domain, then this object
     *             contains a set of unique strings that you use to create a set of CNAME records that you
     *             add to the DNS configuration for your domain. When Amazon SES detects these records in the
     *             DNS configuration for your domain, the DKIM authentication process is complete.</p>
     *          <p>If you configured DKIM authentication for the domain by providing your own
     *             public-private key pair, then this object contains the selector that's associated with
     *             your public key.</p>
     *          <p>Regardless of the DKIM authentication method you use, Amazon SES searches for the
     *             appropriate records in the DNS configuration of the domain for up to 72 hours.</p>
     * @public
     */
    DkimTokens?: string[] | undefined;
}
/**
 * <p>A request to set the attributes that control how bounce and complaint events are
 *             processed.</p>
 * @public
 */
export interface PutEmailIdentityFeedbackAttributesRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>Sets the feedback forwarding configuration for the identity.</p>
     *          <p>If the value is <code>true</code>, you receive email notifications when bounce or
     *             complaint events occur. These notifications are sent to the address that you specified
     *             in the <code>Return-Path</code> header of the original email.</p>
     *          <p>You're required to have a method of tracking bounces and complaints. If you haven't
     *             set up another mechanism for receiving bounce or complaint notifications (for example,
     *             by setting up an event destination), you receive an email notification when these events
     *             occur (even if this setting is disabled).</p>
     * @public
     */
    EmailForwardingEnabled?: boolean | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutEmailIdentityFeedbackAttributesResponse {
}
/**
 * <p>A request to configure the custom MAIL FROM domain for a verified identity.</p>
 * @public
 */
export interface PutEmailIdentityMailFromAttributesRequest {
    /**
     * <p>The verified email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p> The custom MAIL FROM domain that you want the verified identity to use. The MAIL FROM
     *             domain must meet the following criteria:</p>
     *          <ul>
     *             <li>
     *                <p>It has to be a subdomain of the verified identity.</p>
     *             </li>
     *             <li>
     *                <p>It can't be used to receive email.</p>
     *             </li>
     *             <li>
     *                <p>It can't be used in a "From" address if the MAIL FROM domain is a destination
     *                     for feedback forwarding emails.</p>
     *             </li>
     *          </ul>
     * @public
     */
    MailFromDomain?: string | undefined;
    /**
     * <p>The action to take if the required MX record isn't found when you send an email. When
     *             you set this value to <code>UseDefaultValue</code>, the mail is sent using
     *                 <i>amazonses.com</i> as the MAIL FROM domain. When you set this value
     *             to <code>RejectMessage</code>, the Amazon SES API v2 returns a
     *                 <code>MailFromDomainNotVerified</code> error, and doesn't attempt to deliver the
     *             email.</p>
     *          <p>These behaviors are taken when the custom MAIL FROM domain configuration is in the
     *                 <code>Pending</code>, <code>Failed</code>, and <code>TemporaryFailure</code>
     *             states.</p>
     * @public
     */
    BehaviorOnMxFailure?: BehaviorOnMxFailure | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutEmailIdentityMailFromAttributesResponse {
}
/**
 * <p>A request to add an email destination to the suppression list for your account.</p>
 * @public
 */
export interface PutSuppressedDestinationRequest {
    /**
     * <p>The email address that should be added to the suppression list for your
     *             account.</p>
     * @public
     */
    EmailAddress: string | undefined;
    /**
     * <p>The factors that should cause the email address to be added to the suppression list
     *             for your account.</p>
     * @public
     */
    Reason: SuppressionListReason | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface PutSuppressedDestinationResponse {
}
/**
 * <p>Represents a request to send email messages to multiple destinations using Amazon SES. For
 *             more information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html">Amazon SES Developer
 *                 Guide</a>.</p>
 * @public
 */
export interface SendBulkEmailRequest {
    /**
     * <p>The email address to use as the "From" address for the email. The address that you
     *             specify has to be verified.</p>
     * @public
     */
    FromEmailAddress?: string | undefined;
    /**
     * <p>This parameter is used only for sending authorization. It is the ARN of the identity
     *             that is associated with the sending authorization policy that permits you to use the
     *             email address specified in the <code>FromEmailAddress</code> parameter.</p>
     *          <p>For example, if the owner of example.com (which has ARN
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com) attaches a policy to it that
     *             authorizes you to use sender@example.com, then you would specify the
     *                 <code>FromEmailAddressIdentityArn</code> to be
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com, and the
     *                 <code>FromEmailAddress</code> to be sender@example.com.</p>
     *          <p>For more information about sending authorization, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization.html">Amazon SES Developer
     *                 Guide</a>.</p>
     * @public
     */
    FromEmailAddressIdentityArn?: string | undefined;
    /**
     * <p>The "Reply-to" email addresses for the message. When the recipient replies to the
     *             message, each Reply-to address receives the reply.</p>
     * @public
     */
    ReplyToAddresses?: string[] | undefined;
    /**
     * <p>The address that you want bounce and complaint notifications to be sent to.</p>
     * @public
     */
    FeedbackForwardingEmailAddress?: string | undefined;
    /**
     * <p>This parameter is used only for sending authorization. It is the ARN of the identity
     *             that is associated with the sending authorization policy that permits you to use the
     *             email address specified in the <code>FeedbackForwardingEmailAddress</code>
     *             parameter.</p>
     *          <p>For example, if the owner of example.com (which has ARN
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com) attaches a policy to it that
     *             authorizes you to use feedback@example.com, then you would specify the
     *                 <code>FeedbackForwardingEmailAddressIdentityArn</code> to be
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com, and the
     *                 <code>FeedbackForwardingEmailAddress</code> to be feedback@example.com.</p>
     *          <p>For more information about sending authorization, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization.html">Amazon SES Developer
     *                 Guide</a>.</p>
     * @public
     */
    FeedbackForwardingEmailAddressIdentityArn?: string | undefined;
    /**
     * <p>A list of tags, in the form of name/value pairs, to apply to an email that you send
     *             using the <code>SendEmail</code> operation. Tags correspond to characteristics of the
     *             email that you define, so that you can publish email sending events.</p>
     * @public
     */
    DefaultEmailTags?: MessageTag[] | undefined;
    /**
     * <p>An object that contains the body of the message. You can specify a template
     *             message.</p>
     * @public
     */
    DefaultContent: BulkEmailContent | undefined;
    /**
     * <p>The list of bulk email entry objects.</p>
     * @public
     */
    BulkEmailEntries: BulkEmailEntry[] | undefined;
    /**
     * <p>The name of the configuration set to use when sending the email.</p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
    /**
     * <p>The ID of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointId?: string | undefined;
    /**
     * <p>The name of the tenant through which this bulk email will be sent.</p>
     *          <note>
     *             <p>
     *                 The email sending operation will only succeed if all referenced resources
     *                 (identities, configuration sets, and templates) are associated with this tenant.
     *             </p>
     *          </note>
     * @public
     */
    TenantName?: string | undefined;
}
/**
 * <p>The following data is returned in JSON format by the service.</p>
 * @public
 */
export interface SendBulkEmailResponse {
    /**
     * <p>One object per intended recipient. Check each response object and retry any messages
     *             with a failure status.</p>
     * @public
     */
    BulkEmailEntryResults: BulkEmailEntryResult[] | undefined;
}
/**
 * <p>Represents a request to send a custom verification email to a specified
 *             recipient.</p>
 * @public
 */
export interface SendCustomVerificationEmailRequest {
    /**
     * <p>The email address to verify.</p>
     * @public
     */
    EmailAddress: string | undefined;
    /**
     * <p>The name of the custom verification email template to use when sending the
     *             verification email.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>Name of a configuration set to use when sending the verification email.</p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
}
/**
 * <p>The following element is returned by the service.</p>
 * @public
 */
export interface SendCustomVerificationEmailResponse {
    /**
     * <p>The unique message identifier returned from the
     *                 <code>SendCustomVerificationEmail</code> operation.</p>
     * @public
     */
    MessageId?: string | undefined;
}
/**
 * <p>Represents a request to send a single formatted email using Amazon SES. For more
 *             information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-email-formatted.html">Amazon SES Developer
 *                 Guide</a>.</p>
 * @public
 */
export interface SendEmailRequest {
    /**
     * <p>The email address to use as the "From" address for the email. The address that you
     *             specify has to be verified.
     *             </p>
     * @public
     */
    FromEmailAddress?: string | undefined;
    /**
     * <p>This parameter is used only for sending authorization. It is the ARN of the identity
     *             that is associated with the sending authorization policy that permits you to use the
     *             email address specified in the <code>FromEmailAddress</code> parameter.</p>
     *          <p>For example, if the owner of example.com (which has ARN
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com) attaches a policy to it that
     *             authorizes you to use sender@example.com, then you would specify the
     *                 <code>FromEmailAddressIdentityArn</code> to be
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com, and the
     *                 <code>FromEmailAddress</code> to be sender@example.com.</p>
     *          <p>For more information about sending authorization, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization.html">Amazon SES Developer
     *                 Guide</a>.</p>
     *          <p>For Raw emails, the <code>FromEmailAddressIdentityArn</code> value overrides the
     *             X-SES-SOURCE-ARN and X-SES-FROM-ARN headers specified in raw email message
     *             content.</p>
     * @public
     */
    FromEmailAddressIdentityArn?: string | undefined;
    /**
     * <p>An object that contains the recipients of the email message.</p>
     * @public
     */
    Destination?: Destination | undefined;
    /**
     * <p>The "Reply-to" email addresses for the message. When the recipient replies to the
     *             message, each Reply-to address receives the reply.</p>
     * @public
     */
    ReplyToAddresses?: string[] | undefined;
    /**
     * <p>The address that you want bounce and complaint notifications to be sent to.</p>
     * @public
     */
    FeedbackForwardingEmailAddress?: string | undefined;
    /**
     * <p>This parameter is used only for sending authorization. It is the ARN of the identity
     *             that is associated with the sending authorization policy that permits you to use the
     *             email address specified in the <code>FeedbackForwardingEmailAddress</code>
     *             parameter.</p>
     *          <p>For example, if the owner of example.com (which has ARN
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com) attaches a policy to it that
     *             authorizes you to use feedback@example.com, then you would specify the
     *                 <code>FeedbackForwardingEmailAddressIdentityArn</code> to be
     *             arn:aws:ses:us-east-1:123456789012:identity/example.com, and the
     *                 <code>FeedbackForwardingEmailAddress</code> to be feedback@example.com.</p>
     *          <p>For more information about sending authorization, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization.html">Amazon SES Developer
     *                 Guide</a>.</p>
     * @public
     */
    FeedbackForwardingEmailAddressIdentityArn?: string | undefined;
    /**
     * <p>An object that contains the body of the message. You can send either a Simple message,
     *             Raw message, or a Templated message.</p>
     * @public
     */
    Content: EmailContent | undefined;
    /**
     * <p>A list of tags, in the form of name/value pairs, to apply to an email that you send
     *             using the <code>SendEmail</code> operation. Tags correspond to characteristics of the
     *             email that you define, so that you can publish email sending events. </p>
     * @public
     */
    EmailTags?: MessageTag[] | undefined;
    /**
     * <p>The name of the configuration set to use when sending the email.</p>
     * @public
     */
    ConfigurationSetName?: string | undefined;
    /**
     * <p>The ID of the multi-region endpoint (global-endpoint).</p>
     * @public
     */
    EndpointId?: string | undefined;
    /**
     * <p>The name of the tenant through which this email will be sent.</p>
     *          <note>
     *             <p>The email sending operation will only succeed if all referenced resources
     *                 (identities, configuration sets, and templates) are associated with this tenant.
     *             </p>
     *          </note>
     * @public
     */
    TenantName?: string | undefined;
    /**
     * <p>An object used to specify a list or topic to which an email belongs, which will be
     *             used when a contact chooses to unsubscribe.</p>
     * @public
     */
    ListManagementOptions?: ListManagementOptions | undefined;
}
/**
 * <p>A unique message ID that you receive when an email is accepted for sending.</p>
 * @public
 */
export interface SendEmailResponse {
    /**
     * <p>A unique identifier for the message that is generated when the message is
     *             accepted.</p>
     *          <note>
     *             <p>It's possible for Amazon SES to accept a message without sending it. For example, this
     *                 can happen when the message that you're trying to send has an attachment that
     *                 contains a virus, or when you send a templated email that contains invalid
     *                 personalization content.</p>
     *          </note>
     * @public
     */
    MessageId?: string | undefined;
}
/**
 * @public
 */
export interface TagResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource that you want to add one or more tags
     *             to.</p>
     * @public
     */
    ResourceArn: string | undefined;
    /**
     * <p>A list of the tags that you want to add to the resource. A tag consists of a required
     *             tag key (<code>Key</code>) and an associated tag value (<code>Value</code>). The maximum
     *             length of a tag key is 128 characters. The maximum length of a tag value is 256
     *             characters.</p>
     * @public
     */
    Tags: Tag[] | undefined;
}
/**
 * @public
 */
export interface TagResourceResponse {
}
/**
 * <p>>Represents a request to create a preview of the MIME content of an email when
 *             provided with a template and a set of replacement data.</p>
 * @public
 */
export interface TestRenderEmailTemplateRequest {
    /**
     * <p>The name of the template.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>A list of replacement values to apply to the template. This parameter is a JSON
     *             object, typically consisting of key-value pairs in which the keys correspond to
     *             replacement tags in the email template.</p>
     * @public
     */
    TemplateData: string | undefined;
}
/**
 * <p>The following element is returned by the service.</p>
 * @public
 */
export interface TestRenderEmailTemplateResponse {
    /**
     * <p>The complete MIME message rendered by applying the data in the
     *                 <code>TemplateData</code> parameter to the template specified in the TemplateName
     *             parameter.</p>
     * @public
     */
    RenderedTemplate: string | undefined;
}
/**
 * @public
 */
export interface UntagResourceRequest {
    /**
     * <p>The Amazon Resource Name (ARN) of the resource that you want to remove one or more
     *             tags from.</p>
     * @public
     */
    ResourceArn: string | undefined;
    /**
     * <p>The tags (tag keys) that you want to remove from the resource. When you specify a tag
     *             key, the action removes both that key and its associated tag value.</p>
     *          <p>To remove more than one tag from the resource, append the <code>TagKeys</code>
     *             parameter and argument for each additional tag to remove, separated by an ampersand. For
     *             example:
     *                 <code>/v2/email/tags?ResourceArn=ResourceArn&TagKeys=Key1&TagKeys=Key2</code>
     *          </p>
     * @public
     */
    TagKeys: string[] | undefined;
}
/**
 * @public
 */
export interface UntagResourceResponse {
}
/**
 * <p>A request to change the settings for an event destination for a configuration
 *             set.</p>
 * @public
 */
export interface UpdateConfigurationSetEventDestinationRequest {
    /**
     * <p>The name of the configuration set that contains the event destination to
     *             modify.</p>
     * @public
     */
    ConfigurationSetName: string | undefined;
    /**
     * <p>The name of the event destination.</p>
     * @public
     */
    EventDestinationName: string | undefined;
    /**
     * <p>An object that defines the event destination.</p>
     * @public
     */
    EventDestination: EventDestinationDefinition | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface UpdateConfigurationSetEventDestinationResponse {
}
/**
 * @public
 */
export interface UpdateContactRequest {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>The contact's email address.</p>
     * @public
     */
    EmailAddress: string | undefined;
    /**
     * <p>The contact's preference for being opted-in to or opted-out of a topic.</p>
     * @public
     */
    TopicPreferences?: TopicPreference[] | undefined;
    /**
     * <p>A boolean value status noting if the contact is unsubscribed from all contact list
     *             topics.</p>
     * @public
     */
    UnsubscribeAll?: boolean | undefined;
    /**
     * <p>The attribute data attached to a contact.</p>
     * @public
     */
    AttributesData?: string | undefined;
}
/**
 * @public
 */
export interface UpdateContactResponse {
}
/**
 * @public
 */
export interface UpdateContactListRequest {
    /**
     * <p>The name of the contact list.</p>
     * @public
     */
    ContactListName: string | undefined;
    /**
     * <p>An interest group, theme, or label within a list. A contact list can have multiple
     *             topics.</p>
     * @public
     */
    Topics?: Topic[] | undefined;
    /**
     * <p>A description of what the contact list is about.</p>
     * @public
     */
    Description?: string | undefined;
}
/**
 * @public
 */
export interface UpdateContactListResponse {
}
/**
 * <p>Represents a request to update an existing custom verification email template.</p>
 * @public
 */
export interface UpdateCustomVerificationEmailTemplateRequest {
    /**
     * <p>The name of the custom verification email template that you want to update.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>The email address that the custom verification email is sent from.</p>
     * @public
     */
    FromEmailAddress: string | undefined;
    /**
     * <p>The subject line of the custom verification email.</p>
     * @public
     */
    TemplateSubject: string | undefined;
    /**
     * <p>The content of the custom verification email. The total size of the email must be less
     *             than 10 MB. The message body may contain HTML, with some limitations. For more
     *             information, see <a href="https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html#send-email-verify-address-custom-faq">Custom verification email frequently asked questions</a> in the <i>Amazon SES
     *                 Developer Guide</i>.</p>
     * @public
     */
    TemplateContent: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is successfully verified.</p>
     * @public
     */
    SuccessRedirectionURL: string | undefined;
    /**
     * <p>The URL that the recipient of the verification email is sent to if his or her address
     *             is not successfully verified.</p>
     * @public
     */
    FailureRedirectionURL: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface UpdateCustomVerificationEmailTemplateResponse {
}
/**
 * <p>Represents a request to update a sending authorization policy for an identity. Sending
 *             authorization is an Amazon SES feature that enables you to authorize other senders to use
 *             your identities. For information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization-identity-owner-tasks-management.html">Amazon SES Developer Guide</a>.</p>
 * @public
 */
export interface UpdateEmailIdentityPolicyRequest {
    /**
     * <p>The email identity.</p>
     * @public
     */
    EmailIdentity: string | undefined;
    /**
     * <p>The name of the policy.</p>
     *          <p>The policy name cannot exceed 64 characters and can only include alphanumeric
     *             characters, dashes, and underscores.</p>
     * @public
     */
    PolicyName: string | undefined;
    /**
     * <p>The text of the policy in JSON format. The policy cannot exceed 4 KB.</p>
     *          <p> For information about the syntax of sending authorization policies, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/sending-authorization-policies.html">Amazon SES Developer
     *                 Guide</a>.</p>
     * @public
     */
    Policy: string | undefined;
}
/**
 * <p>An HTTP 200 response if the request succeeds, or an error message if the request
 *             fails.</p>
 * @public
 */
export interface UpdateEmailIdentityPolicyResponse {
}
/**
 * <p>Represents a request to update an email template. For more information, see the <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/send-personalized-email-api.html">Amazon SES
 *                 Developer Guide</a>.</p>
 * @public
 */
export interface UpdateEmailTemplateRequest {
    /**
     * <p>The name of the template.</p>
     * @public
     */
    TemplateName: string | undefined;
    /**
     * <p>The content of the email template, composed of a subject line, an HTML part, and a
     *             text-only part.</p>
     * @public
     */
    TemplateContent: EmailTemplateContent | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty
 *             HTTP body.</p>
 * @public
 */
export interface UpdateEmailTemplateResponse {
}
/**
 * <p>Represents a request to update the customer-managed sending status for a reputation entity.</p>
 * @public
 */
export interface UpdateReputationEntityCustomerManagedStatusRequest {
    /**
     * <p>The type of reputation entity. Currently, only <code>RESOURCE</code> type entities are supported.</p>
     * @public
     */
    ReputationEntityType: ReputationEntityType | undefined;
    /**
     * <p>The unique identifier for the reputation entity. For resource-type entities,
     *             this is the Amazon Resource Name (ARN) of the resource.</p>
     * @public
     */
    ReputationEntityReference: string | undefined;
    /**
     * <p>The new customer-managed sending status for the reputation entity. This can be one of the following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>ENABLED</code> – Allow sending for this entity.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DISABLED</code> – Prevent sending for this entity.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>REINSTATED</code> – Allow sending even if there are active reputation findings.</p>
     *             </li>
     *          </ul>
     * @public
     */
    SendingStatus: SendingStatus | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty HTTP body.</p>
 * @public
 */
export interface UpdateReputationEntityCustomerManagedStatusResponse {
}
/**
 * <p>Represents a request to update the reputation management policy for a reputation entity.</p>
 * @public
 */
export interface UpdateReputationEntityPolicyRequest {
    /**
     * <p>The type of reputation entity. Currently, only <code>RESOURCE</code> type entities are supported.</p>
     * @public
     */
    ReputationEntityType: ReputationEntityType | undefined;
    /**
     * <p>The unique identifier for the reputation entity. For resource-type entities,
     *             this is the Amazon Resource Name (ARN) of the resource.</p>
     * @public
     */
    ReputationEntityReference: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the reputation management policy to apply
     *             to this entity. This is an Amazon Web Services Amazon SES-managed policy.</p>
     * @public
     */
    ReputationEntityPolicy: string | undefined;
}
/**
 * <p>If the action is successful, the service sends back an HTTP 200 response with an empty HTTP body.</p>
 * @public
 */
export interface UpdateReputationEntityPolicyResponse {
}
/**
 * @internal
 */
export declare const PutAccountDetailsRequestFilterSensitiveLog: (obj: PutAccountDetailsRequest) => any;
/**
 * @internal
 */
export declare const PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog: (obj: PutEmailIdentityDkimSigningAttributesRequest) => any;
