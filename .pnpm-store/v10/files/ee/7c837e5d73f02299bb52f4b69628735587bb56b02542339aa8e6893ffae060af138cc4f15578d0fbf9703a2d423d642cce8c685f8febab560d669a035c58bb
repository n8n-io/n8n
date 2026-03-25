'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var middlewareContentLength = require('@smithy/middleware-content-length');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var middlewareRetry = require('@smithy/middleware-retry');
var smithyClient = require('@smithy/smithy-client');
var httpAuthSchemeProvider = require('./auth/httpAuthSchemeProvider');
var runtimeConfig = require('./runtimeConfig');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');
var protocolHttp = require('@smithy/protocol-http');
var middlewareSerde = require('@smithy/middleware-serde');
var core$1 = require('@aws-sdk/core');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "ses",
    });
};
const commonParams = {
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
};

const getHttpAuthExtensionConfiguration = (runtimeConfig) => {
    const _httpAuthSchemes = runtimeConfig.httpAuthSchemes;
    let _httpAuthSchemeProvider = runtimeConfig.httpAuthSchemeProvider;
    let _credentials = runtimeConfig.credentials;
    return {
        setHttpAuthScheme(httpAuthScheme) {
            const index = _httpAuthSchemes.findIndex((scheme) => scheme.schemeId === httpAuthScheme.schemeId);
            if (index === -1) {
                _httpAuthSchemes.push(httpAuthScheme);
            }
            else {
                _httpAuthSchemes.splice(index, 1, httpAuthScheme);
            }
        },
        httpAuthSchemes() {
            return _httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(httpAuthSchemeProvider) {
            _httpAuthSchemeProvider = httpAuthSchemeProvider;
        },
        httpAuthSchemeProvider() {
            return _httpAuthSchemeProvider;
        },
        setCredentials(credentials) {
            _credentials = credentials;
        },
        credentials() {
            return _credentials;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig), smithyClient.getDefaultExtensionConfiguration(runtimeConfig), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class SESv2Client extends smithyClient.Client {
    config;
    constructor(...[configuration]) {
        const _config_0 = runtimeConfig.getRuntimeConfig(configuration || {});
        super(_config_0);
        this.initConfig = _config_0;
        const _config_1 = resolveClientEndpointParameters(_config_0);
        const _config_2 = middlewareUserAgent.resolveUserAgentConfig(_config_1);
        const _config_3 = middlewareRetry.resolveRetryConfig(_config_2);
        const _config_4 = configResolver.resolveRegionConfig(_config_3);
        const _config_5 = middlewareHostHeader.resolveHostHeaderConfig(_config_4);
        const _config_6 = middlewareEndpoint.resolveEndpointConfig(_config_5);
        const _config_7 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_6);
        const _config_8 = resolveRuntimeExtensions(_config_7, configuration?.extensions || []);
        this.config = _config_8;
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultSESv2HttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
                "aws.auth#sigv4a": config.credentials,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class SESv2ServiceException extends smithyClient.ServiceException {
    constructor(options) {
        super(options);
        Object.setPrototypeOf(this, SESv2ServiceException.prototype);
    }
}

const ContactLanguage = {
    EN: "EN",
    JA: "JA",
};
const MailType = {
    MARKETING: "MARKETING",
    TRANSACTIONAL: "TRANSACTIONAL",
};
const ReviewStatus = {
    DENIED: "DENIED",
    FAILED: "FAILED",
    GRANTED: "GRANTED",
    PENDING: "PENDING",
};
class AccountSuspendedException extends SESv2ServiceException {
    name = "AccountSuspendedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AccountSuspendedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AccountSuspendedException.prototype);
    }
}
class AlreadyExistsException extends SESv2ServiceException {
    name = "AlreadyExistsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "AlreadyExistsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, AlreadyExistsException.prototype);
    }
}
const AttachmentContentDisposition = {
    ATTACHMENT: "ATTACHMENT",
    INLINE: "INLINE",
};
const AttachmentContentTransferEncoding = {
    BASE64: "BASE64",
    QUOTED_PRINTABLE: "QUOTED_PRINTABLE",
    SEVEN_BIT: "SEVEN_BIT",
};
class BadRequestException extends SESv2ServiceException {
    name = "BadRequestException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "BadRequestException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, BadRequestException.prototype);
    }
}
const MetricDimensionName = {
    CONFIGURATION_SET: "CONFIGURATION_SET",
    EMAIL_IDENTITY: "EMAIL_IDENTITY",
    ISP: "ISP",
};
const Metric = {
    CLICK: "CLICK",
    COMPLAINT: "COMPLAINT",
    DELIVERY: "DELIVERY",
    DELIVERY_CLICK: "DELIVERY_CLICK",
    DELIVERY_COMPLAINT: "DELIVERY_COMPLAINT",
    DELIVERY_OPEN: "DELIVERY_OPEN",
    OPEN: "OPEN",
    PERMANENT_BOUNCE: "PERMANENT_BOUNCE",
    SEND: "SEND",
    TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE",
};
const MetricNamespace = {
    VDM: "VDM",
};
const QueryErrorCode = {
    ACCESS_DENIED: "ACCESS_DENIED",
    INTERNAL_FAILURE: "INTERNAL_FAILURE",
};
class InternalServiceErrorException extends SESv2ServiceException {
    name = "InternalServiceErrorException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "InternalServiceErrorException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, InternalServiceErrorException.prototype);
    }
}
class NotFoundException extends SESv2ServiceException {
    name = "NotFoundException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "NotFoundException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, NotFoundException.prototype);
    }
}
class TooManyRequestsException extends SESv2ServiceException {
    name = "TooManyRequestsException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "TooManyRequestsException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, TooManyRequestsException.prototype);
    }
}
const BehaviorOnMxFailure = {
    REJECT_MESSAGE: "REJECT_MESSAGE",
    USE_DEFAULT_VALUE: "USE_DEFAULT_VALUE",
};
const BounceType = {
    PERMANENT: "PERMANENT",
    TRANSIENT: "TRANSIENT",
    UNDETERMINED: "UNDETERMINED",
};
const BulkEmailStatus = {
    ACCOUNT_DAILY_QUOTA_EXCEEDED: "ACCOUNT_DAILY_QUOTA_EXCEEDED",
    ACCOUNT_SENDING_PAUSED: "ACCOUNT_SENDING_PAUSED",
    ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
    ACCOUNT_THROTTLED: "ACCOUNT_THROTTLED",
    CONFIGURATION_SET_NOT_FOUND: "CONFIGURATION_SET_NOT_FOUND",
    CONFIGURATION_SET_SENDING_PAUSED: "CONFIGURATION_SET_SENDING_PAUSED",
    FAILED: "FAILED",
    INVALID_PARAMETER: "INVALID_PARAMETER",
    INVALID_SENDING_POOL_NAME: "INVALID_SENDING_POOL_NAME",
    MAIL_FROM_DOMAIN_NOT_VERIFIED: "MAIL_FROM_DOMAIN_NOT_VERIFIED",
    MESSAGE_REJECTED: "MESSAGE_REJECTED",
    SUCCESS: "SUCCESS",
    TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
    TRANSIENT_FAILURE: "TRANSIENT_FAILURE",
};
const DimensionValueSource = {
    EMAIL_HEADER: "EMAIL_HEADER",
    LINK_TAG: "LINK_TAG",
    MESSAGE_TAG: "MESSAGE_TAG",
};
class ConcurrentModificationException extends SESv2ServiceException {
    name = "ConcurrentModificationException";
    $fault = "server";
    constructor(opts) {
        super({
            name: "ConcurrentModificationException",
            $fault: "server",
            ...opts,
        });
        Object.setPrototypeOf(this, ConcurrentModificationException.prototype);
    }
}
class ConflictException extends SESv2ServiceException {
    name = "ConflictException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "ConflictException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ConflictException.prototype);
    }
}
const SubscriptionStatus = {
    OPT_IN: "OPT_IN",
    OPT_OUT: "OPT_OUT",
};
const ContactListImportAction = {
    DELETE: "DELETE",
    PUT: "PUT",
};
const TlsPolicy = {
    OPTIONAL: "OPTIONAL",
    REQUIRE: "REQUIRE",
};
const SuppressionListReason = {
    BOUNCE: "BOUNCE",
    COMPLAINT: "COMPLAINT",
};
const HttpsPolicy = {
    OPTIONAL: "OPTIONAL",
    REQUIRE: "REQUIRE",
    REQUIRE_OPEN_ONLY: "REQUIRE_OPEN_ONLY",
};
const FeatureStatus = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
class LimitExceededException extends SESv2ServiceException {
    name = "LimitExceededException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "LimitExceededException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, LimitExceededException.prototype);
    }
}
const EventType = {
    BOUNCE: "BOUNCE",
    CLICK: "CLICK",
    COMPLAINT: "COMPLAINT",
    DELIVERY: "DELIVERY",
    DELIVERY_DELAY: "DELIVERY_DELAY",
    OPEN: "OPEN",
    REJECT: "REJECT",
    RENDERING_FAILURE: "RENDERING_FAILURE",
    SEND: "SEND",
    SUBSCRIPTION: "SUBSCRIPTION",
};
const ScalingMode = {
    MANAGED: "MANAGED",
    STANDARD: "STANDARD",
};
const DeliverabilityTestStatus = {
    COMPLETED: "COMPLETED",
    IN_PROGRESS: "IN_PROGRESS",
};
class MailFromDomainNotVerifiedException extends SESv2ServiceException {
    name = "MailFromDomainNotVerifiedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MailFromDomainNotVerifiedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MailFromDomainNotVerifiedException.prototype);
    }
}
class MessageRejected extends SESv2ServiceException {
    name = "MessageRejected";
    $fault = "client";
    constructor(opts) {
        super({
            name: "MessageRejected",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, MessageRejected.prototype);
    }
}
class SendingPausedException extends SESv2ServiceException {
    name = "SendingPausedException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "SendingPausedException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, SendingPausedException.prototype);
    }
}
const DkimSigningAttributesOrigin = {
    AWS_SES: "AWS_SES",
    AWS_SES_AF_SOUTH_1: "AWS_SES_AF_SOUTH_1",
    AWS_SES_AP_NORTHEAST_1: "AWS_SES_AP_NORTHEAST_1",
    AWS_SES_AP_NORTHEAST_2: "AWS_SES_AP_NORTHEAST_2",
    AWS_SES_AP_NORTHEAST_3: "AWS_SES_AP_NORTHEAST_3",
    AWS_SES_AP_SOUTHEAST_1: "AWS_SES_AP_SOUTHEAST_1",
    AWS_SES_AP_SOUTHEAST_2: "AWS_SES_AP_SOUTHEAST_2",
    AWS_SES_AP_SOUTHEAST_3: "AWS_SES_AP_SOUTHEAST_3",
    AWS_SES_AP_SOUTH_1: "AWS_SES_AP_SOUTH_1",
    AWS_SES_AP_SOUTH_2: "AWS_SES_AP_SOUTH_2",
    AWS_SES_CA_CENTRAL_1: "AWS_SES_CA_CENTRAL_1",
    AWS_SES_EU_CENTRAL_1: "AWS_SES_EU_CENTRAL_1",
    AWS_SES_EU_CENTRAL_2: "AWS_SES_EU_CENTRAL_2",
    AWS_SES_EU_NORTH_1: "AWS_SES_EU_NORTH_1",
    AWS_SES_EU_SOUTH_1: "AWS_SES_EU_SOUTH_1",
    AWS_SES_EU_WEST_1: "AWS_SES_EU_WEST_1",
    AWS_SES_EU_WEST_2: "AWS_SES_EU_WEST_2",
    AWS_SES_EU_WEST_3: "AWS_SES_EU_WEST_3",
    AWS_SES_IL_CENTRAL_1: "AWS_SES_IL_CENTRAL_1",
    AWS_SES_ME_CENTRAL_1: "AWS_SES_ME_CENTRAL_1",
    AWS_SES_ME_SOUTH_1: "AWS_SES_ME_SOUTH_1",
    AWS_SES_SA_EAST_1: "AWS_SES_SA_EAST_1",
    AWS_SES_US_EAST_1: "AWS_SES_US_EAST_1",
    AWS_SES_US_EAST_2: "AWS_SES_US_EAST_2",
    AWS_SES_US_WEST_1: "AWS_SES_US_WEST_1",
    AWS_SES_US_WEST_2: "AWS_SES_US_WEST_2",
    EXTERNAL: "EXTERNAL",
};
const DkimSigningKeyLength = {
    RSA_1024_BIT: "RSA_1024_BIT",
    RSA_2048_BIT: "RSA_2048_BIT",
};
const DkimStatus = {
    FAILED: "FAILED",
    NOT_STARTED: "NOT_STARTED",
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    TEMPORARY_FAILURE: "TEMPORARY_FAILURE",
};
const IdentityType = {
    DOMAIN: "DOMAIN",
    EMAIL_ADDRESS: "EMAIL_ADDRESS",
    MANAGED_DOMAIN: "MANAGED_DOMAIN",
};
const DeliveryEventType = {
    COMPLAINT: "COMPLAINT",
    DELIVERY: "DELIVERY",
    PERMANENT_BOUNCE: "PERMANENT_BOUNCE",
    SEND: "SEND",
    TRANSIENT_BOUNCE: "TRANSIENT_BOUNCE",
    UNDETERMINED_BOUNCE: "UNDETERMINED_BOUNCE",
};
const EngagementEventType = {
    CLICK: "CLICK",
    OPEN: "OPEN",
};
const MetricAggregation = {
    RATE: "RATE",
    VOLUME: "VOLUME",
};
const DataFormat = {
    CSV: "CSV",
    JSON: "JSON",
};
const SuppressionListImportAction = {
    DELETE: "DELETE",
    PUT: "PUT",
};
const Status = {
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
    READY: "READY",
};
const SendingStatus = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
    REINSTATED: "REINSTATED",
};
const WarmupStatus = {
    DONE: "DONE",
    IN_PROGRESS: "IN_PROGRESS",
    NOT_APPLICABLE: "NOT_APPLICABLE",
};
const DeliverabilityDashboardAccountStatus = {
    ACTIVE: "ACTIVE",
    DISABLED: "DISABLED",
    PENDING_EXPIRATION: "PENDING_EXPIRATION",
};
const ExportSourceType = {
    MESSAGE_INSIGHTS: "MESSAGE_INSIGHTS",
    METRICS_DATA: "METRICS_DATA",
};
const JobStatus = {
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
    CREATED: "CREATED",
    FAILED: "FAILED",
    PROCESSING: "PROCESSING",
};
const MailFromDomainStatus = {
    FAILED: "FAILED",
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    TEMPORARY_FAILURE: "TEMPORARY_FAILURE",
};
const VerificationError = {
    DNS_SERVER_ERROR: "DNS_SERVER_ERROR",
    HOST_NOT_FOUND: "HOST_NOT_FOUND",
    INVALID_VALUE: "INVALID_VALUE",
    REPLICATION_ACCESS_DENIED: "REPLICATION_ACCESS_DENIED",
    REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED: "REPLICATION_PRIMARY_BYO_DKIM_NOT_SUPPORTED",
    REPLICATION_PRIMARY_INVALID_REGION: "REPLICATION_PRIMARY_INVALID_REGION",
    REPLICATION_PRIMARY_NOT_FOUND: "REPLICATION_PRIMARY_NOT_FOUND",
    REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED: "REPLICATION_REPLICA_AS_PRIMARY_NOT_SUPPORTED",
    SERVICE_ERROR: "SERVICE_ERROR",
    TYPE_NOT_FOUND: "TYPE_NOT_FOUND",
};
const VerificationStatus = {
    FAILED: "FAILED",
    NOT_STARTED: "NOT_STARTED",
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    TEMPORARY_FAILURE: "TEMPORARY_FAILURE",
};
const ReputationEntityType = {
    RESOURCE: "RESOURCE",
};
const RecommendationImpact = {
    HIGH: "HIGH",
    LOW: "LOW",
};
const ImportDestinationType = {
    CONTACT_LIST: "CONTACT_LIST",
    SUPPRESSION_LIST: "SUPPRESSION_LIST",
};
class InvalidNextTokenException extends SESv2ServiceException {
    name = "InvalidNextTokenException";
    $fault = "client";
    constructor(opts) {
        super({
            name: "InvalidNextTokenException",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, InvalidNextTokenException.prototype);
    }
}
const ListRecommendationsFilterKey = {
    IMPACT: "IMPACT",
    RESOURCE_ARN: "RESOURCE_ARN",
    STATUS: "STATUS",
    TYPE: "TYPE",
};
const RecommendationStatus = {
    FIXED: "FIXED",
    OPEN: "OPEN",
};
const RecommendationType = {
    BIMI: "BIMI",
    BOUNCE: "BOUNCE",
    COMPLAINT: "COMPLAINT",
    DKIM: "DKIM",
    DMARC: "DMARC",
    FEEDBACK_3P: "FEEDBACK_3P",
    IP_LISTING: "IP_LISTING",
    SPF: "SPF",
};
const ReputationEntityFilterKey = {
    ENTITY_REFERENCE_PREFIX: "ENTITY_REFERENCE_PREFIX",
    ENTITY_TYPE: "ENTITY_TYPE",
    REPUTATION_IMPACT: "REPUTATION_IMPACT",
    STATUS: "SENDING_STATUS",
};
const AccountDetailsFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.WebsiteURL && { WebsiteURL: smithyClient.SENSITIVE_STRING }),
    ...(obj.UseCaseDescription && { UseCaseDescription: smithyClient.SENSITIVE_STRING }),
    ...(obj.AdditionalContactEmailAddresses && { AdditionalContactEmailAddresses: smithyClient.SENSITIVE_STRING }),
});
const DkimSigningAttributesFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.DomainSigningPrivateKey && { DomainSigningPrivateKey: smithyClient.SENSITIVE_STRING }),
});
const CreateEmailIdentityRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.DkimSigningAttributes && {
        DkimSigningAttributes: DkimSigningAttributesFilterSensitiveLog(obj.DkimSigningAttributes),
    }),
});
const MessageInsightsFiltersFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.FromEmailAddress && { FromEmailAddress: smithyClient.SENSITIVE_STRING }),
    ...(obj.Destination && { Destination: smithyClient.SENSITIVE_STRING }),
    ...(obj.Subject && { Subject: smithyClient.SENSITIVE_STRING }),
});
const MessageInsightsDataSourceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Include && { Include: MessageInsightsFiltersFilterSensitiveLog(obj.Include) }),
    ...(obj.Exclude && { Exclude: MessageInsightsFiltersFilterSensitiveLog(obj.Exclude) }),
});
const ExportDataSourceFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.MessageInsightsDataSource && {
        MessageInsightsDataSource: MessageInsightsDataSourceFilterSensitiveLog(obj.MessageInsightsDataSource),
    }),
});
const CreateExportJobRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ExportDataSource && { ExportDataSource: ExportDataSourceFilterSensitiveLog(obj.ExportDataSource) }),
});
const EmailInsightsFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Destination && { Destination: smithyClient.SENSITIVE_STRING }),
});
const GetAccountResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Details && { Details: AccountDetailsFilterSensitiveLog(obj.Details) }),
});
const GetExportJobResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ExportDataSource && { ExportDataSource: ExportDataSourceFilterSensitiveLog(obj.ExportDataSource) }),
});
const GetMessageInsightsResponseFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.FromEmailAddress && { FromEmailAddress: smithyClient.SENSITIVE_STRING }),
    ...(obj.Subject && { Subject: smithyClient.SENSITIVE_STRING }),
    ...(obj.Insights && { Insights: obj.Insights.map((item) => EmailInsightsFilterSensitiveLog(item)) }),
});

const se_BatchGetMetricDataCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/metrics/batch");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Queries: (_) => se_BatchGetMetricDataQueries(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CancelExportJobCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/export-jobs/{JobId}/cancel");
    b.p("JobId", () => input.JobId, "{JobId}", false);
    let body;
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_CreateConfigurationSetCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ArchivingOptions: (_) => smithyClient._json(_),
        ConfigurationSetName: [],
        DeliveryOptions: (_) => smithyClient._json(_),
        ReputationOptions: (_) => se_ReputationOptions(_),
        SendingOptions: (_) => smithyClient._json(_),
        SuppressionOptions: (_) => smithyClient._json(_),
        Tags: (_) => smithyClient._json(_),
        TrackingOptions: (_) => smithyClient._json(_),
        VdmOptions: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateConfigurationSetEventDestinationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        EventDestination: (_) => smithyClient._json(_),
        EventDestinationName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateContactCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        AttributesData: [],
        EmailAddress: [],
        TopicPreferences: (_) => smithyClient._json(_),
        UnsubscribeAll: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateContactListCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ContactListName: [],
        Description: [],
        Tags: (_) => smithyClient._json(_),
        Topics: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/custom-verification-email-templates");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        FailureRedirectionURL: [],
        FromEmailAddress: [],
        SuccessRedirectionURL: [],
        TemplateContent: [],
        TemplateName: [],
        TemplateSubject: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateDedicatedIpPoolCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ip-pools");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        PoolName: [],
        ScalingMode: [],
        Tags: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateDeliverabilityTestReportCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/deliverability-dashboard/test");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Content: (_) => se_EmailContent(_, context),
        FromEmailAddress: [],
        ReportName: [],
        Tags: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateEmailIdentityCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ConfigurationSetName: [],
        DkimSigningAttributes: (_) => smithyClient._json(_),
        EmailIdentity: [],
        Tags: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateEmailIdentityPolicyCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/policies/{PolicyName}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    b.p("PolicyName", () => input.PolicyName, "{PolicyName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Policy: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/templates");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        TemplateContent: (_) => smithyClient._json(_),
        TemplateName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateExportJobCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/export-jobs");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ExportDataSource: (_) => se_ExportDataSource(_),
        ExportDestination: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateImportJobCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/import-jobs");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ImportDataSource: (_) => smithyClient._json(_),
        ImportDestination: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateMultiRegionEndpointCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/multi-region-endpoints");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Details: (_) => smithyClient._json(_),
        EndpointName: [],
        Tags: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateTenantCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Tags: (_) => smithyClient._json(_),
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_CreateTenantResourceAssociationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/resources");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ResourceArn: [],
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_DeleteConfigurationSetCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteConfigurationSetEventDestinationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations/{EventDestinationName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    b.p("EventDestinationName", () => input.EventDestinationName, "{EventDestinationName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteContactCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteContactListCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/custom-verification-email-templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteDedicatedIpPoolCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ip-pools/{PoolName}");
    b.p("PoolName", () => input.PoolName, "{PoolName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteEmailIdentityCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteEmailIdentityPolicyCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}/policies/{PolicyName}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    b.p("PolicyName", () => input.PolicyName, "{PolicyName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteMultiRegionEndpointCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/multi-region-endpoints/{EndpointName}");
    b.p("EndpointName", () => input.EndpointName, "{EndpointName}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteSuppressedDestinationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/suppression/addresses/{EmailAddress}");
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("DELETE").h(headers).b(body);
    return b.build();
};
const se_DeleteTenantCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/delete");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_DeleteTenantResourceAssociationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/resources/delete");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ResourceArn: [],
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_GetAccountCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/account");
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetBlacklistReportsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/blacklist-report");
    const query = smithyClient.map({
        [_BIN]: [smithyClient.expectNonNull(input.BlacklistItemNames, `BlacklistItemNames`) != null, () => input[_BIN] || []],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_GetConfigurationSetCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetConfigurationSetEventDestinationsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetContactCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetContactListCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists/{ContactListName}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/custom-verification-email-templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetDedicatedIpCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ips/{Ip}");
    b.p("Ip", () => input.Ip, "{Ip}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetDedicatedIpPoolCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ip-pools/{PoolName}");
    b.p("PoolName", () => input.PoolName, "{PoolName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetDedicatedIpsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ips");
    const query = smithyClient.map({
        [_PN]: [, input[_PN]],
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_GetDeliverabilityDashboardOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard");
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetDeliverabilityTestReportCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/test-reports/{ReportId}");
    b.p("ReportId", () => input.ReportId, "{ReportId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetDomainDeliverabilityCampaignCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/campaigns/{CampaignId}");
    b.p("CampaignId", () => input.CampaignId, "{CampaignId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetDomainStatisticsReportCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/statistics-report/{Domain}");
    b.p("Domain", () => input.Domain, "{Domain}", false);
    const query = smithyClient.map({
        [_SD]: [smithyClient.expectNonNull(input.StartDate, `StartDate`) != null, () => smithyClient.serializeDateTime(input[_SD]).toString()],
        [_ED]: [smithyClient.expectNonNull(input.EndDate, `EndDate`) != null, () => smithyClient.serializeDateTime(input[_ED]).toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_GetEmailIdentityCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetEmailIdentityPoliciesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/identities/{EmailIdentity}/policies");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetExportJobCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/export-jobs/{JobId}");
    b.p("JobId", () => input.JobId, "{JobId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetImportJobCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/import-jobs/{JobId}");
    b.p("JobId", () => input.JobId, "{JobId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetMessageInsightsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/insights/{MessageId}");
    b.p("MessageId", () => input.MessageId, "{MessageId}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetMultiRegionEndpointCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/multi-region-endpoints/{EndpointName}");
    b.p("EndpointName", () => input.EndpointName, "{EndpointName}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetReputationEntityCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/reputation/entities/{ReputationEntityType}/{ReputationEntityReference}");
    b.p("ReputationEntityReference", () => input.ReputationEntityReference, "{ReputationEntityReference}", false);
    b.p("ReputationEntityType", () => input.ReputationEntityType, "{ReputationEntityType}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetSuppressedDestinationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/suppression/addresses/{EmailAddress}");
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    b.m("GET").h(headers).b(body);
    return b.build();
};
const se_GetTenantCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/get");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListConfigurationSetsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/configuration-sets");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListContactListsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/contact-lists");
    const query = smithyClient.map({
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
        [_NT]: [, input[_NT]],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListContactsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/list");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Filter: (_) => smithyClient._json(_),
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListCustomVerificationEmailTemplatesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/custom-verification-email-templates");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListDedicatedIpPoolsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/dedicated-ip-pools");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListDeliverabilityTestReportsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/test-reports");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListDomainDeliverabilityCampaignsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/deliverability-dashboard/domains/{SubscribedDomain}/campaigns");
    b.p("SubscribedDomain", () => input.SubscribedDomain, "{SubscribedDomain}", false);
    const query = smithyClient.map({
        [_SD]: [smithyClient.expectNonNull(input.StartDate, `StartDate`) != null, () => smithyClient.serializeDateTime(input[_SD]).toString()],
        [_ED]: [smithyClient.expectNonNull(input.EndDate, `EndDate`) != null, () => smithyClient.serializeDateTime(input[_ED]).toString()],
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListEmailIdentitiesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/identities");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListEmailTemplatesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/templates");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListExportJobsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/list-export-jobs");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ExportSourceType: [],
        JobStatus: [],
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListImportJobsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/import-jobs/list");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ImportDestinationType: [],
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListMultiRegionEndpointsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/multi-region-endpoints");
    const query = smithyClient.map({
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListRecommendationsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/vdm/recommendations");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Filter: (_) => smithyClient._json(_),
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListReputationEntitiesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/reputation/entities");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Filter: (_) => smithyClient._json(_),
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListResourceTenantsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/resources/tenants/list");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        NextToken: [],
        PageSize: [],
        ResourceArn: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListSuppressedDestinationsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/suppression/addresses");
    const query = smithyClient.map({
        [_Re]: [() => input.Reasons !== void 0, () => input[_R] || []],
        [_SD]: [() => input.StartDate !== void 0, () => smithyClient.serializeDateTime(input[_SD]).toString()],
        [_ED]: [() => input.EndDate !== void 0, () => smithyClient.serializeDateTime(input[_ED]).toString()],
        [_NT]: [, input[_NT]],
        [_PS]: [() => input.PageSize !== void 0, () => input[_PS].toString()],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListTagsForResourceCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/tags");
    const query = smithyClient.map({
        [_RA]: [, smithyClient.expectNonNull(input[_RA], `ResourceArn`)],
    });
    let body;
    b.m("GET").h(headers).q(query).b(body);
    return b.build();
};
const se_ListTenantResourcesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/resources/list");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Filter: (_) => smithyClient._json(_),
        NextToken: [],
        PageSize: [],
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_ListTenantsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tenants/list");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        NextToken: [],
        PageSize: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_PutAccountDedicatedIpWarmupAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/dedicated-ips/warmup");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        AutoWarmupEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutAccountDetailsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/details");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        AdditionalContactEmailAddresses: (_) => smithyClient._json(_),
        ContactLanguage: [],
        MailType: [],
        ProductionAccessEnabled: [],
        UseCaseDescription: [],
        WebsiteURL: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_PutAccountSendingAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/sending");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SendingEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutAccountSuppressionAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/suppression");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SuppressedReasons: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutAccountVdmAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/account/vdm");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        VdmAttributes: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetArchivingOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/archiving-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ArchiveArn: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetDeliveryOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/delivery-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        MaxDeliverySeconds: [],
        SendingPoolName: [],
        TlsPolicy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetReputationOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/reputation-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ReputationMetricsEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetSendingOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/sending");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SendingEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetSuppressionOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/suppression-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SuppressedReasons: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetTrackingOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/tracking-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        CustomRedirectDomain: [],
        HttpsPolicy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutConfigurationSetVdmOptionsCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/vdm-options");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        VdmOptions: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutDedicatedIpInPoolCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ips/{Ip}/pool");
    b.p("Ip", () => input.Ip, "{Ip}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        DestinationPoolName: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutDedicatedIpPoolScalingAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ip-pools/{PoolName}/scaling");
    b.p("PoolName", () => input.PoolName, "{PoolName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ScalingMode: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutDedicatedIpWarmupAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/dedicated-ips/{Ip}/warmup");
    b.p("Ip", () => input.Ip, "{Ip}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        WarmupPercentage: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutDeliverabilityDashboardOptionCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/deliverability-dashboard");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        DashboardEnabled: [],
        SubscribedDomains: (_) => se_DomainDeliverabilityTrackingOptions(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutEmailIdentityConfigurationSetAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/configuration-set");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ConfigurationSetName: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutEmailIdentityDkimAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/dkim");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SigningEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutEmailIdentityDkimSigningAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v1/email/identities/{EmailIdentity}/dkim/signing");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SigningAttributes: (_) => smithyClient._json(_),
        SigningAttributesOrigin: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutEmailIdentityFeedbackAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/feedback");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        EmailForwardingEnabled: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutEmailIdentityMailFromAttributesCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/mail-from");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        BehaviorOnMxFailure: [],
        MailFromDomain: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_PutSuppressedDestinationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/suppression/addresses");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        EmailAddress: [],
        Reason: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_SendBulkEmailCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/outbound-bulk-emails");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        BulkEmailEntries: (_) => smithyClient._json(_),
        ConfigurationSetName: [],
        DefaultContent: (_) => se_BulkEmailContent(_, context),
        DefaultEmailTags: (_) => smithyClient._json(_),
        EndpointId: [],
        FeedbackForwardingEmailAddress: [],
        FeedbackForwardingEmailAddressIdentityArn: [],
        FromEmailAddress: [],
        FromEmailAddressIdentityArn: [],
        ReplyToAddresses: (_) => smithyClient._json(_),
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_SendCustomVerificationEmailCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/outbound-custom-verification-emails");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ConfigurationSetName: [],
        EmailAddress: [],
        TemplateName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_SendEmailCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/outbound-emails");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ConfigurationSetName: [],
        Content: (_) => se_EmailContent(_, context),
        Destination: (_) => smithyClient._json(_),
        EmailTags: (_) => smithyClient._json(_),
        EndpointId: [],
        FeedbackForwardingEmailAddress: [],
        FeedbackForwardingEmailAddressIdentityArn: [],
        FromEmailAddress: [],
        FromEmailAddressIdentityArn: [],
        ListManagementOptions: (_) => smithyClient._json(_),
        ReplyToAddresses: (_) => smithyClient._json(_),
        TenantName: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_TagResourceCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/tags");
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ResourceArn: [],
        Tags: (_) => smithyClient._json(_),
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_TestRenderEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/templates/{TemplateName}/render");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        TemplateData: [],
    }));
    b.m("POST").h(headers).b(body);
    return b.build();
};
const se_UntagResourceCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {};
    b.bp("/v2/email/tags");
    const query = smithyClient.map({
        [_RA]: [, smithyClient.expectNonNull(input[_RA], `ResourceArn`)],
        [_TK]: [smithyClient.expectNonNull(input.TagKeys, `TagKeys`) != null, () => input[_TK] || []],
    });
    let body;
    b.m("DELETE").h(headers).q(query).b(body);
    return b.build();
};
const se_UpdateConfigurationSetEventDestinationCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/configuration-sets/{ConfigurationSetName}/event-destinations/{EventDestinationName}");
    b.p("ConfigurationSetName", () => input.ConfigurationSetName, "{ConfigurationSetName}", false);
    b.p("EventDestinationName", () => input.EventDestinationName, "{EventDestinationName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        EventDestination: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateContactCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    b.p("EmailAddress", () => input.EmailAddress, "{EmailAddress}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        AttributesData: [],
        TopicPreferences: (_) => smithyClient._json(_),
        UnsubscribeAll: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateContactListCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/contact-lists/{ContactListName}");
    b.p("ContactListName", () => input.ContactListName, "{ContactListName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Description: [],
        Topics: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateCustomVerificationEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/custom-verification-email-templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        FailureRedirectionURL: [],
        FromEmailAddress: [],
        SuccessRedirectionURL: [],
        TemplateContent: [],
        TemplateSubject: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateEmailIdentityPolicyCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/identities/{EmailIdentity}/policies/{PolicyName}");
    b.p("EmailIdentity", () => input.EmailIdentity, "{EmailIdentity}", false);
    b.p("PolicyName", () => input.PolicyName, "{PolicyName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        Policy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateEmailTemplateCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/templates/{TemplateName}");
    b.p("TemplateName", () => input.TemplateName, "{TemplateName}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        TemplateContent: (_) => smithyClient._json(_),
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateReputationEntityCustomerManagedStatusCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/reputation/entities/{ReputationEntityType}/{ReputationEntityReference}/customer-managed-status");
    b.p("ReputationEntityType", () => input.ReputationEntityType, "{ReputationEntityType}", false);
    b.p("ReputationEntityReference", () => input.ReputationEntityReference, "{ReputationEntityReference}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        SendingStatus: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const se_UpdateReputationEntityPolicyCommand = async (input, context) => {
    const b = core.requestBuilder(input, context);
    const headers = {
        "content-type": "application/json",
    };
    b.bp("/v2/email/reputation/entities/{ReputationEntityType}/{ReputationEntityReference}/policy");
    b.p("ReputationEntityType", () => input.ReputationEntityType, "{ReputationEntityType}", false);
    b.p("ReputationEntityReference", () => input.ReputationEntityReference, "{ReputationEntityReference}", false);
    let body;
    body = JSON.stringify(smithyClient.take(input, {
        ReputationEntityPolicy: [],
    }));
    b.m("PUT").h(headers).b(body);
    return b.build();
};
const de_BatchGetMetricDataCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        Errors: smithyClient._json,
        Results: (_) => de_MetricDataResultList(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CancelExportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateConfigurationSetCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateConfigurationSetEventDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateDedicatedIpPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateDeliverabilityTestReportCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DeliverabilityTestStatus: smithyClient.expectString,
        ReportId: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CreateEmailIdentityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DkimAttributes: (_) => de_DkimAttributes(_),
        IdentityType: smithyClient.expectString,
        VerifiedForSendingStatus: smithyClient.expectBoolean,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CreateEmailIdentityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CreateExportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        JobId: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CreateImportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        JobId: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CreateMultiRegionEndpointCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        EndpointId: smithyClient.expectString,
        Status: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CreateTenantCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        SendingStatus: smithyClient.expectString,
        Tags: smithyClient._json,
        TenantArn: smithyClient.expectString,
        TenantId: smithyClient.expectString,
        TenantName: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_CreateTenantResourceAssociationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteConfigurationSetCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteConfigurationSetEventDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteDedicatedIpPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteEmailIdentityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteEmailIdentityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteMultiRegionEndpointCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        Status: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_DeleteSuppressedDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteTenantCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_DeleteTenantResourceAssociationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_GetAccountCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DedicatedIpAutoWarmupEnabled: smithyClient.expectBoolean,
        Details: smithyClient._json,
        EnforcementStatus: smithyClient.expectString,
        ProductionAccessEnabled: smithyClient.expectBoolean,
        SendQuota: (_) => de_SendQuota(_),
        SendingEnabled: smithyClient.expectBoolean,
        SuppressionAttributes: smithyClient._json,
        VdmAttributes: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetBlacklistReportsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        BlacklistReport: (_) => de_BlacklistReport(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetConfigurationSetCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ArchivingOptions: smithyClient._json,
        ConfigurationSetName: smithyClient.expectString,
        DeliveryOptions: smithyClient._json,
        ReputationOptions: (_) => de_ReputationOptions(_),
        SendingOptions: smithyClient._json,
        SuppressionOptions: smithyClient._json,
        Tags: smithyClient._json,
        TrackingOptions: smithyClient._json,
        VdmOptions: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetConfigurationSetEventDestinationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        EventDestinations: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        AttributesData: smithyClient.expectString,
        ContactListName: smithyClient.expectString,
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        EmailAddress: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        TopicDefaultPreferences: smithyClient._json,
        TopicPreferences: smithyClient._json,
        UnsubscribeAll: smithyClient.expectBoolean,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ContactListName: smithyClient.expectString,
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Description: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Tags: smithyClient._json,
        Topics: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        FailureRedirectionURL: smithyClient.expectString,
        FromEmailAddress: smithyClient.expectString,
        SuccessRedirectionURL: smithyClient.expectString,
        TemplateContent: smithyClient.expectString,
        TemplateName: smithyClient.expectString,
        TemplateSubject: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDedicatedIpCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DedicatedIp: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDedicatedIpPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DedicatedIpPool: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDedicatedIpsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DedicatedIps: smithyClient._json,
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDeliverabilityDashboardOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        AccountStatus: smithyClient.expectString,
        ActiveSubscribedDomains: (_) => de_DomainDeliverabilityTrackingOptions(_),
        DashboardEnabled: smithyClient.expectBoolean,
        PendingExpirationSubscribedDomains: (_) => de_DomainDeliverabilityTrackingOptions(_),
        SubscriptionExpiryDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDeliverabilityTestReportCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DeliverabilityTestReport: (_) => de_DeliverabilityTestReport(_),
        IspPlacements: (_) => de_IspPlacements(_),
        Message: smithyClient.expectString,
        OverallPlacement: (_) => de_PlacementStatistics(_),
        Tags: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDomainDeliverabilityCampaignCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DomainDeliverabilityCampaign: (_) => de_DomainDeliverabilityCampaign(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetDomainStatisticsReportCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DailyVolumes: (_) => de_DailyVolumes(_),
        OverallVolume: (_) => de_OverallVolume(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetEmailIdentityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ConfigurationSetName: smithyClient.expectString,
        DkimAttributes: (_) => de_DkimAttributes(_),
        FeedbackForwardingStatus: smithyClient.expectBoolean,
        IdentityType: smithyClient.expectString,
        MailFromAttributes: smithyClient._json,
        Policies: smithyClient._json,
        Tags: smithyClient._json,
        VerificationInfo: (_) => de_VerificationInfo(_),
        VerificationStatus: smithyClient.expectString,
        VerifiedForSendingStatus: smithyClient.expectBoolean,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetEmailIdentityPoliciesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        Policies: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        TemplateContent: smithyClient._json,
        TemplateName: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetExportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        CompletedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        ExportDataSource: (_) => de_ExportDataSource(_),
        ExportDestination: smithyClient._json,
        ExportSourceType: smithyClient.expectString,
        FailureInfo: smithyClient._json,
        JobId: smithyClient.expectString,
        JobStatus: smithyClient.expectString,
        Statistics: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetImportJobCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        CompletedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        FailedRecordsCount: smithyClient.expectInt32,
        FailureInfo: smithyClient._json,
        ImportDataSource: smithyClient._json,
        ImportDestination: smithyClient._json,
        JobId: smithyClient.expectString,
        JobStatus: smithyClient.expectString,
        ProcessedRecordsCount: smithyClient.expectInt32,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetMessageInsightsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        EmailTags: smithyClient._json,
        FromEmailAddress: smithyClient.expectString,
        Insights: (_) => de_EmailInsightsList(_),
        MessageId: smithyClient.expectString,
        Subject: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetMultiRegionEndpointCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        EndpointId: smithyClient.expectString,
        EndpointName: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Routes: smithyClient._json,
        Status: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetReputationEntityCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ReputationEntity: (_) => de_ReputationEntity(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetSuppressedDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        SuppressedDestination: (_) => de_SuppressedDestination(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_GetTenantCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        Tenant: (_) => de_Tenant(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListConfigurationSetsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ConfigurationSets: smithyClient._json,
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListContactListsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ContactLists: (_) => de_ListOfContactLists(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListContactsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        Contacts: (_) => de_ListOfContacts(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListCustomVerificationEmailTemplatesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        CustomVerificationEmailTemplates: smithyClient._json,
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListDedicatedIpPoolsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DedicatedIpPools: smithyClient._json,
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListDeliverabilityTestReportsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DeliverabilityTestReports: (_) => de_DeliverabilityTestReports(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListDomainDeliverabilityCampaignsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DomainDeliverabilityCampaigns: (_) => de_DomainDeliverabilityCampaignList(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListEmailIdentitiesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        EmailIdentities: smithyClient._json,
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListEmailTemplatesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        TemplatesMetadata: (_) => de_EmailTemplateMetadataList(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListExportJobsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ExportJobs: (_) => de_ExportJobSummaryList(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListImportJobsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        ImportJobs: (_) => de_ImportJobSummaryList(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListMultiRegionEndpointsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        MultiRegionEndpoints: (_) => de_MultiRegionEndpoints(_),
        NextToken: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListRecommendationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        Recommendations: (_) => de_RecommendationsList(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListReputationEntitiesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        ReputationEntities: (_) => de_ReputationEntitiesList(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListResourceTenantsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        ResourceTenants: (_) => de_ResourceTenantMetadataList(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListSuppressedDestinationsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        SuppressedDestinationSummaries: (_) => de_SuppressedDestinationSummaries(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListTagsForResourceCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        Tags: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListTenantResourcesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        TenantResources: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_ListTenantsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        NextToken: smithyClient.expectString,
        Tenants: (_) => de_TenantInfoList(_),
    });
    Object.assign(contents, doc);
    return contents;
};
const de_PutAccountDedicatedIpWarmupAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutAccountDetailsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutAccountSendingAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutAccountSuppressionAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutAccountVdmAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetArchivingOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetDeliveryOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetReputationOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetSendingOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetSuppressionOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetTrackingOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutConfigurationSetVdmOptionsCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutDedicatedIpInPoolCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutDedicatedIpPoolScalingAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutDedicatedIpWarmupAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutDeliverabilityDashboardOptionCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutEmailIdentityConfigurationSetAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutEmailIdentityDkimAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutEmailIdentityDkimSigningAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        DkimStatus: smithyClient.expectString,
        DkimTokens: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_PutEmailIdentityFeedbackAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutEmailIdentityMailFromAttributesCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_PutSuppressedDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_SendBulkEmailCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        BulkEmailEntryResults: smithyClient._json,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_SendCustomVerificationEmailCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        MessageId: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_SendEmailCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        MessageId: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_TagResourceCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_TestRenderEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    const data = smithyClient.expectNonNull(smithyClient.expectObject(await core$1.parseJsonBody(output.body, context)), "body");
    const doc = smithyClient.take(data, {
        RenderedTemplate: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    return contents;
};
const de_UntagResourceCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateConfigurationSetEventDestinationCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateContactCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateContactListCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateCustomVerificationEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateEmailIdentityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateEmailTemplateCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateReputationEntityCustomerManagedStatusCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_UpdateReputationEntityPolicyCommand = async (output, context) => {
    if (output.statusCode !== 200 && output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const contents = smithyClient.map({
        $metadata: deserializeMetadata(output),
    });
    await smithyClient.collectBody(output.body, context);
    return contents;
};
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await core$1.parseJsonErrorBody(output.body, context),
    };
    const errorCode = core$1.loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "BadRequestException":
        case "com.amazonaws.sesv2#BadRequestException":
            throw await de_BadRequestExceptionRes(parsedOutput);
        case "InternalServiceErrorException":
        case "com.amazonaws.sesv2#InternalServiceErrorException":
            throw await de_InternalServiceErrorExceptionRes(parsedOutput);
        case "NotFoundException":
        case "com.amazonaws.sesv2#NotFoundException":
            throw await de_NotFoundExceptionRes(parsedOutput);
        case "TooManyRequestsException":
        case "com.amazonaws.sesv2#TooManyRequestsException":
            throw await de_TooManyRequestsExceptionRes(parsedOutput);
        case "AlreadyExistsException":
        case "com.amazonaws.sesv2#AlreadyExistsException":
            throw await de_AlreadyExistsExceptionRes(parsedOutput);
        case "ConcurrentModificationException":
        case "com.amazonaws.sesv2#ConcurrentModificationException":
            throw await de_ConcurrentModificationExceptionRes(parsedOutput);
        case "LimitExceededException":
        case "com.amazonaws.sesv2#LimitExceededException":
            throw await de_LimitExceededExceptionRes(parsedOutput);
        case "AccountSuspendedException":
        case "com.amazonaws.sesv2#AccountSuspendedException":
            throw await de_AccountSuspendedExceptionRes(parsedOutput);
        case "MailFromDomainNotVerifiedException":
        case "com.amazonaws.sesv2#MailFromDomainNotVerifiedException":
            throw await de_MailFromDomainNotVerifiedExceptionRes(parsedOutput);
        case "MessageRejected":
        case "com.amazonaws.sesv2#MessageRejected":
            throw await de_MessageRejectedRes(parsedOutput);
        case "SendingPausedException":
        case "com.amazonaws.sesv2#SendingPausedException":
            throw await de_SendingPausedExceptionRes(parsedOutput);
        case "InvalidNextTokenException":
        case "com.amazonaws.sesv2#InvalidNextTokenException":
            throw await de_InvalidNextTokenExceptionRes(parsedOutput);
        case "ConflictException":
        case "com.amazonaws.sesv2#ConflictException":
            throw await de_ConflictExceptionRes(parsedOutput);
        default:
            const parsedBody = parsedOutput.body;
            return throwDefaultError({
                output,
                parsedBody,
                errorCode,
            });
    }
};
const throwDefaultError = smithyClient.withBaseException(SESv2ServiceException);
const de_AccountSuspendedExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new AccountSuspendedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_AlreadyExistsExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new AlreadyExistsException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_BadRequestExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new BadRequestException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_ConcurrentModificationExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new ConcurrentModificationException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_ConflictExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new ConflictException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_InternalServiceErrorExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new InternalServiceErrorException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_InvalidNextTokenExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new InvalidNextTokenException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_LimitExceededExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new LimitExceededException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_MailFromDomainNotVerifiedExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new MailFromDomainNotVerifiedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_MessageRejectedRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new MessageRejected({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_NotFoundExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new NotFoundException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_SendingPausedExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new SendingPausedException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const de_TooManyRequestsExceptionRes = async (parsedOutput, context) => {
    const contents = smithyClient.map({});
    const data = parsedOutput.body;
    const doc = smithyClient.take(data, {
        message: smithyClient.expectString,
    });
    Object.assign(contents, doc);
    const exception = new TooManyRequestsException({
        $metadata: deserializeMetadata(parsedOutput),
        ...contents,
    });
    return smithyClient.decorateServiceException(exception, parsedOutput.body);
};
const se_Attachment = (input, context) => {
    return smithyClient.take(input, {
        ContentDescription: [],
        ContentDisposition: [],
        ContentId: [],
        ContentTransferEncoding: [],
        ContentType: [],
        FileName: [],
        RawContent: context.base64Encoder,
    });
};
const se_AttachmentList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_Attachment(entry, context);
    });
};
const se_BatchGetMetricDataQueries = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_BatchGetMetricDataQuery(entry);
    });
};
const se_BatchGetMetricDataQuery = (input, context) => {
    return smithyClient.take(input, {
        Dimensions: smithyClient._json,
        EndDate: (_) => _.getTime() / 1_000,
        Id: [],
        Metric: [],
        Namespace: [],
        StartDate: (_) => _.getTime() / 1_000,
    });
};
const se_BulkEmailContent = (input, context) => {
    return smithyClient.take(input, {
        Template: (_) => se_Template(_, context),
    });
};
const se_DomainDeliverabilityTrackingOption = (input, context) => {
    return smithyClient.take(input, {
        Domain: [],
        InboxPlacementTrackingOption: smithyClient._json,
        SubscriptionStartDate: (_) => _.getTime() / 1_000,
    });
};
const se_DomainDeliverabilityTrackingOptions = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_DomainDeliverabilityTrackingOption(entry);
    });
};
const se_EmailContent = (input, context) => {
    return smithyClient.take(input, {
        Raw: (_) => se_RawMessage(_, context),
        Simple: (_) => se_Message(_, context),
        Template: (_) => se_Template(_, context),
    });
};
const se_ExportDataSource = (input, context) => {
    return smithyClient.take(input, {
        MessageInsightsDataSource: (_) => se_MessageInsightsDataSource(_),
        MetricsDataSource: (_) => se_MetricsDataSource(_),
    });
};
const se_Message = (input, context) => {
    return smithyClient.take(input, {
        Attachments: (_) => se_AttachmentList(_, context),
        Body: smithyClient._json,
        Headers: smithyClient._json,
        Subject: smithyClient._json,
    });
};
const se_MessageInsightsDataSource = (input, context) => {
    return smithyClient.take(input, {
        EndDate: (_) => _.getTime() / 1_000,
        Exclude: smithyClient._json,
        Include: smithyClient._json,
        MaxResults: [],
        StartDate: (_) => _.getTime() / 1_000,
    });
};
const se_MetricsDataSource = (input, context) => {
    return smithyClient.take(input, {
        Dimensions: smithyClient._json,
        EndDate: (_) => _.getTime() / 1_000,
        Metrics: smithyClient._json,
        Namespace: [],
        StartDate: (_) => _.getTime() / 1_000,
    });
};
const se_RawMessage = (input, context) => {
    return smithyClient.take(input, {
        Data: context.base64Encoder,
    });
};
const se_ReputationOptions = (input, context) => {
    return smithyClient.take(input, {
        LastFreshStart: (_) => _.getTime() / 1_000,
        ReputationMetricsEnabled: [],
    });
};
const se_Template = (input, context) => {
    return smithyClient.take(input, {
        Attachments: (_) => se_AttachmentList(_, context),
        Headers: smithyClient._json,
        TemplateArn: [],
        TemplateContent: smithyClient._json,
        TemplateData: [],
        TemplateName: [],
    });
};
const de_BlacklistEntries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_BlacklistEntry(entry);
    });
    return retVal;
};
const de_BlacklistEntry = (output, context) => {
    return smithyClient.take(output, {
        Description: smithyClient.expectString,
        ListingTime: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        RblName: smithyClient.expectString,
    });
};
const de_BlacklistReport = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_BlacklistEntries(value);
        return acc;
    }, {});
};
const de_Contact = (output, context) => {
    return smithyClient.take(output, {
        EmailAddress: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        TopicDefaultPreferences: smithyClient._json,
        TopicPreferences: smithyClient._json,
        UnsubscribeAll: smithyClient.expectBoolean,
    });
};
const de_ContactList = (output, context) => {
    return smithyClient.take(output, {
        ContactListName: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
    });
};
const de_DailyVolume = (output, context) => {
    return smithyClient.take(output, {
        DomainIspPlacements: (_) => de_DomainIspPlacements(_),
        StartDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        VolumeStatistics: smithyClient._json,
    });
};
const de_DailyVolumes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DailyVolume(entry);
    });
    return retVal;
};
const de_DeliverabilityTestReport = (output, context) => {
    return smithyClient.take(output, {
        CreateDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        DeliverabilityTestStatus: smithyClient.expectString,
        FromEmailAddress: smithyClient.expectString,
        ReportId: smithyClient.expectString,
        ReportName: smithyClient.expectString,
        Subject: smithyClient.expectString,
    });
};
const de_DeliverabilityTestReports = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeliverabilityTestReport(entry);
    });
    return retVal;
};
const de_DkimAttributes = (output, context) => {
    return smithyClient.take(output, {
        CurrentSigningKeyLength: smithyClient.expectString,
        LastKeyGenerationTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        NextSigningKeyLength: smithyClient.expectString,
        SigningAttributesOrigin: smithyClient.expectString,
        SigningEnabled: smithyClient.expectBoolean,
        Status: smithyClient.expectString,
        Tokens: smithyClient._json,
    });
};
const de_DomainDeliverabilityCampaign = (output, context) => {
    return smithyClient.take(output, {
        CampaignId: smithyClient.expectString,
        DeleteRate: smithyClient.limitedParseDouble,
        Esps: smithyClient._json,
        FirstSeenDateTime: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        FromAddress: smithyClient.expectString,
        ImageUrl: smithyClient.expectString,
        InboxCount: smithyClient.expectLong,
        LastSeenDateTime: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        ProjectedVolume: smithyClient.expectLong,
        ReadDeleteRate: smithyClient.limitedParseDouble,
        ReadRate: smithyClient.limitedParseDouble,
        SendingIps: smithyClient._json,
        SpamCount: smithyClient.expectLong,
        Subject: smithyClient.expectString,
    });
};
const de_DomainDeliverabilityCampaignList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainDeliverabilityCampaign(entry);
    });
    return retVal;
};
const de_DomainDeliverabilityTrackingOption = (output, context) => {
    return smithyClient.take(output, {
        Domain: smithyClient.expectString,
        InboxPlacementTrackingOption: smithyClient._json,
        SubscriptionStartDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
    });
};
const de_DomainDeliverabilityTrackingOptions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainDeliverabilityTrackingOption(entry);
    });
    return retVal;
};
const de_DomainIspPlacement = (output, context) => {
    return smithyClient.take(output, {
        InboxPercentage: smithyClient.limitedParseDouble,
        InboxRawCount: smithyClient.expectLong,
        IspName: smithyClient.expectString,
        SpamPercentage: smithyClient.limitedParseDouble,
        SpamRawCount: smithyClient.expectLong,
    });
};
const de_DomainIspPlacements = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainIspPlacement(entry);
    });
    return retVal;
};
const de_EmailInsights = (output, context) => {
    return smithyClient.take(output, {
        Destination: smithyClient.expectString,
        Events: (_) => de_InsightsEvents(_),
        Isp: smithyClient.expectString,
    });
};
const de_EmailInsightsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EmailInsights(entry);
    });
    return retVal;
};
const de_EmailTemplateMetadata = (output, context) => {
    return smithyClient.take(output, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        TemplateName: smithyClient.expectString,
    });
};
const de_EmailTemplateMetadataList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EmailTemplateMetadata(entry);
    });
    return retVal;
};
const de_ExportDataSource = (output, context) => {
    return smithyClient.take(output, {
        MessageInsightsDataSource: (_) => de_MessageInsightsDataSource(_),
        MetricsDataSource: (_) => de_MetricsDataSource(_),
    });
};
const de_ExportJobSummary = (output, context) => {
    return smithyClient.take(output, {
        CompletedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        ExportSourceType: smithyClient.expectString,
        JobId: smithyClient.expectString,
        JobStatus: smithyClient.expectString,
    });
};
const de_ExportJobSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ExportJobSummary(entry);
    });
    return retVal;
};
const de_ImportJobSummary = (output, context) => {
    return smithyClient.take(output, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        FailedRecordsCount: smithyClient.expectInt32,
        ImportDestination: smithyClient._json,
        JobId: smithyClient.expectString,
        JobStatus: smithyClient.expectString,
        ProcessedRecordsCount: smithyClient.expectInt32,
    });
};
const de_ImportJobSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ImportJobSummary(entry);
    });
    return retVal;
};
const de_InsightsEvent = (output, context) => {
    return smithyClient.take(output, {
        Details: smithyClient._json,
        Timestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Type: smithyClient.expectString,
    });
};
const de_InsightsEvents = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InsightsEvent(entry);
    });
    return retVal;
};
const de_IspPlacement = (output, context) => {
    return smithyClient.take(output, {
        IspName: smithyClient.expectString,
        PlacementStatistics: (_) => de_PlacementStatistics(_),
    });
};
const de_IspPlacements = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_IspPlacement(entry);
    });
    return retVal;
};
const de_ListOfContactLists = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ContactList(entry);
    });
    return retVal;
};
const de_ListOfContacts = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Contact(entry);
    });
    return retVal;
};
const de_MessageInsightsDataSource = (output, context) => {
    return smithyClient.take(output, {
        EndDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Exclude: smithyClient._json,
        Include: smithyClient._json,
        MaxResults: smithyClient.expectInt32,
        StartDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
    });
};
const de_MetricDataResult = (output, context) => {
    return smithyClient.take(output, {
        Id: smithyClient.expectString,
        Timestamps: (_) => de_TimestampList(_),
        Values: smithyClient._json,
    });
};
const de_MetricDataResultList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MetricDataResult(entry);
    });
    return retVal;
};
const de_MetricsDataSource = (output, context) => {
    return smithyClient.take(output, {
        Dimensions: smithyClient._json,
        EndDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Metrics: smithyClient._json,
        Namespace: smithyClient.expectString,
        StartDate: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
    });
};
const de_MultiRegionEndpoint = (output, context) => {
    return smithyClient.take(output, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        EndpointId: smithyClient.expectString,
        EndpointName: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Regions: smithyClient._json,
        Status: smithyClient.expectString,
    });
};
const de_MultiRegionEndpoints = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MultiRegionEndpoint(entry);
    });
    return retVal;
};
const de_OverallVolume = (output, context) => {
    return smithyClient.take(output, {
        DomainIspPlacements: (_) => de_DomainIspPlacements(_),
        ReadRatePercent: smithyClient.limitedParseDouble,
        VolumeStatistics: smithyClient._json,
    });
};
const de_PlacementStatistics = (output, context) => {
    return smithyClient.take(output, {
        DkimPercentage: smithyClient.limitedParseDouble,
        InboxPercentage: smithyClient.limitedParseDouble,
        MissingPercentage: smithyClient.limitedParseDouble,
        SpamPercentage: smithyClient.limitedParseDouble,
        SpfPercentage: smithyClient.limitedParseDouble,
    });
};
const de_Recommendation = (output, context) => {
    return smithyClient.take(output, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Description: smithyClient.expectString,
        Impact: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        ResourceArn: smithyClient.expectString,
        Status: smithyClient.expectString,
        Type: smithyClient.expectString,
    });
};
const de_RecommendationsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Recommendation(entry);
    });
    return retVal;
};
const de_ReputationEntitiesList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ReputationEntity(entry);
    });
    return retVal;
};
const de_ReputationEntity = (output, context) => {
    return smithyClient.take(output, {
        AwsSesManagedStatus: (_) => de_StatusRecord(_),
        CustomerManagedStatus: (_) => de_StatusRecord(_),
        ReputationEntityReference: smithyClient.expectString,
        ReputationEntityType: smithyClient.expectString,
        ReputationImpact: smithyClient.expectString,
        ReputationManagementPolicy: smithyClient.expectString,
        SendingStatusAggregate: smithyClient.expectString,
    });
};
const de_ReputationOptions = (output, context) => {
    return smithyClient.take(output, {
        LastFreshStart: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        ReputationMetricsEnabled: smithyClient.expectBoolean,
    });
};
const de_ResourceTenantMetadata = (output, context) => {
    return smithyClient.take(output, {
        AssociatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        ResourceArn: smithyClient.expectString,
        TenantId: smithyClient.expectString,
        TenantName: smithyClient.expectString,
    });
};
const de_ResourceTenantMetadataList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ResourceTenantMetadata(entry);
    });
    return retVal;
};
const de_SendQuota = (output, context) => {
    return smithyClient.take(output, {
        Max24HourSend: smithyClient.limitedParseDouble,
        MaxSendRate: smithyClient.limitedParseDouble,
        SentLast24Hours: smithyClient.limitedParseDouble,
    });
};
const de_StatusRecord = (output, context) => {
    return smithyClient.take(output, {
        Cause: smithyClient.expectString,
        LastUpdatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Status: smithyClient.expectString,
    });
};
const de_SuppressedDestination = (output, context) => {
    return smithyClient.take(output, {
        Attributes: smithyClient._json,
        EmailAddress: smithyClient.expectString,
        LastUpdateTime: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Reason: smithyClient.expectString,
    });
};
const de_SuppressedDestinationSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SuppressedDestinationSummary(entry);
    });
    return retVal;
};
const de_SuppressedDestinationSummary = (output, context) => {
    return smithyClient.take(output, {
        EmailAddress: smithyClient.expectString,
        LastUpdateTime: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        Reason: smithyClient.expectString,
    });
};
const de_Tenant = (output, context) => {
    return smithyClient.take(output, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        SendingStatus: smithyClient.expectString,
        Tags: smithyClient._json,
        TenantArn: smithyClient.expectString,
        TenantId: smithyClient.expectString,
        TenantName: smithyClient.expectString,
    });
};
const de_TenantInfo = (output, context) => {
    return smithyClient.take(output, {
        CreatedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        TenantArn: smithyClient.expectString,
        TenantId: smithyClient.expectString,
        TenantName: smithyClient.expectString,
    });
};
const de_TenantInfoList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TenantInfo(entry);
    });
    return retVal;
};
const de_TimestampList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(entry)));
    });
    return retVal;
};
const de_VerificationInfo = (output, context) => {
    return smithyClient.take(output, {
        ErrorType: smithyClient.expectString,
        LastCheckedTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        LastSuccessTimestamp: (_) => smithyClient.expectNonNull(smithyClient.parseEpochTimestamp(smithyClient.expectNumber(_))),
        SOARecord: smithyClient._json,
    });
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const _BIN = "BlacklistItemNames";
const _ED = "EndDate";
const _NT = "NextToken";
const _PN = "PoolName";
const _PS = "PageSize";
const _R = "Reasons";
const _RA = "ResourceArn";
const _Re = "Reason";
const _SD = "StartDate";
const _TK = "TagKeys";

class BatchGetMetricDataCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "BatchGetMetricData", {})
    .n("SESv2Client", "BatchGetMetricDataCommand")
    .f(void 0, void 0)
    .ser(se_BatchGetMetricDataCommand)
    .de(de_BatchGetMetricDataCommand)
    .build() {
}

class CancelExportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CancelExportJob", {})
    .n("SESv2Client", "CancelExportJobCommand")
    .f(void 0, void 0)
    .ser(se_CancelExportJobCommand)
    .de(de_CancelExportJobCommand)
    .build() {
}

class CreateConfigurationSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateConfigurationSet", {})
    .n("SESv2Client", "CreateConfigurationSetCommand")
    .f(void 0, void 0)
    .ser(se_CreateConfigurationSetCommand)
    .de(de_CreateConfigurationSetCommand)
    .build() {
}

class CreateConfigurationSetEventDestinationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateConfigurationSetEventDestination", {})
    .n("SESv2Client", "CreateConfigurationSetEventDestinationCommand")
    .f(void 0, void 0)
    .ser(se_CreateConfigurationSetEventDestinationCommand)
    .de(de_CreateConfigurationSetEventDestinationCommand)
    .build() {
}

class CreateContactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateContact", {})
    .n("SESv2Client", "CreateContactCommand")
    .f(void 0, void 0)
    .ser(se_CreateContactCommand)
    .de(de_CreateContactCommand)
    .build() {
}

class CreateContactListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateContactList", {})
    .n("SESv2Client", "CreateContactListCommand")
    .f(void 0, void 0)
    .ser(se_CreateContactListCommand)
    .de(de_CreateContactListCommand)
    .build() {
}

class CreateCustomVerificationEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateCustomVerificationEmailTemplate", {})
    .n("SESv2Client", "CreateCustomVerificationEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_CreateCustomVerificationEmailTemplateCommand)
    .de(de_CreateCustomVerificationEmailTemplateCommand)
    .build() {
}

class CreateDedicatedIpPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateDedicatedIpPool", {})
    .n("SESv2Client", "CreateDedicatedIpPoolCommand")
    .f(void 0, void 0)
    .ser(se_CreateDedicatedIpPoolCommand)
    .de(de_CreateDedicatedIpPoolCommand)
    .build() {
}

class CreateDeliverabilityTestReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateDeliverabilityTestReport", {})
    .n("SESv2Client", "CreateDeliverabilityTestReportCommand")
    .f(void 0, void 0)
    .ser(se_CreateDeliverabilityTestReportCommand)
    .de(de_CreateDeliverabilityTestReportCommand)
    .build() {
}

class CreateEmailIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateEmailIdentity", {})
    .n("SESv2Client", "CreateEmailIdentityCommand")
    .f(CreateEmailIdentityRequestFilterSensitiveLog, void 0)
    .ser(se_CreateEmailIdentityCommand)
    .de(de_CreateEmailIdentityCommand)
    .build() {
}

class CreateEmailIdentityPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateEmailIdentityPolicy", {})
    .n("SESv2Client", "CreateEmailIdentityPolicyCommand")
    .f(void 0, void 0)
    .ser(se_CreateEmailIdentityPolicyCommand)
    .de(de_CreateEmailIdentityPolicyCommand)
    .build() {
}

class CreateEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateEmailTemplate", {})
    .n("SESv2Client", "CreateEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_CreateEmailTemplateCommand)
    .de(de_CreateEmailTemplateCommand)
    .build() {
}

class CreateExportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateExportJob", {})
    .n("SESv2Client", "CreateExportJobCommand")
    .f(CreateExportJobRequestFilterSensitiveLog, void 0)
    .ser(se_CreateExportJobCommand)
    .de(de_CreateExportJobCommand)
    .build() {
}

class CreateImportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateImportJob", {})
    .n("SESv2Client", "CreateImportJobCommand")
    .f(void 0, void 0)
    .ser(se_CreateImportJobCommand)
    .de(de_CreateImportJobCommand)
    .build() {
}

class CreateMultiRegionEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateMultiRegionEndpoint", {})
    .n("SESv2Client", "CreateMultiRegionEndpointCommand")
    .f(void 0, void 0)
    .ser(se_CreateMultiRegionEndpointCommand)
    .de(de_CreateMultiRegionEndpointCommand)
    .build() {
}

class CreateTenantCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateTenant", {})
    .n("SESv2Client", "CreateTenantCommand")
    .f(void 0, void 0)
    .ser(se_CreateTenantCommand)
    .de(de_CreateTenantCommand)
    .build() {
}

class CreateTenantResourceAssociationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "CreateTenantResourceAssociation", {})
    .n("SESv2Client", "CreateTenantResourceAssociationCommand")
    .f(void 0, void 0)
    .ser(se_CreateTenantResourceAssociationCommand)
    .de(de_CreateTenantResourceAssociationCommand)
    .build() {
}

class DeleteConfigurationSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteConfigurationSet", {})
    .n("SESv2Client", "DeleteConfigurationSetCommand")
    .f(void 0, void 0)
    .ser(se_DeleteConfigurationSetCommand)
    .de(de_DeleteConfigurationSetCommand)
    .build() {
}

class DeleteConfigurationSetEventDestinationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteConfigurationSetEventDestination", {})
    .n("SESv2Client", "DeleteConfigurationSetEventDestinationCommand")
    .f(void 0, void 0)
    .ser(se_DeleteConfigurationSetEventDestinationCommand)
    .de(de_DeleteConfigurationSetEventDestinationCommand)
    .build() {
}

class DeleteContactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteContact", {})
    .n("SESv2Client", "DeleteContactCommand")
    .f(void 0, void 0)
    .ser(se_DeleteContactCommand)
    .de(de_DeleteContactCommand)
    .build() {
}

class DeleteContactListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteContactList", {})
    .n("SESv2Client", "DeleteContactListCommand")
    .f(void 0, void 0)
    .ser(se_DeleteContactListCommand)
    .de(de_DeleteContactListCommand)
    .build() {
}

class DeleteCustomVerificationEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteCustomVerificationEmailTemplate", {})
    .n("SESv2Client", "DeleteCustomVerificationEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_DeleteCustomVerificationEmailTemplateCommand)
    .de(de_DeleteCustomVerificationEmailTemplateCommand)
    .build() {
}

class DeleteDedicatedIpPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteDedicatedIpPool", {})
    .n("SESv2Client", "DeleteDedicatedIpPoolCommand")
    .f(void 0, void 0)
    .ser(se_DeleteDedicatedIpPoolCommand)
    .de(de_DeleteDedicatedIpPoolCommand)
    .build() {
}

class DeleteEmailIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteEmailIdentity", {})
    .n("SESv2Client", "DeleteEmailIdentityCommand")
    .f(void 0, void 0)
    .ser(se_DeleteEmailIdentityCommand)
    .de(de_DeleteEmailIdentityCommand)
    .build() {
}

class DeleteEmailIdentityPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteEmailIdentityPolicy", {})
    .n("SESv2Client", "DeleteEmailIdentityPolicyCommand")
    .f(void 0, void 0)
    .ser(se_DeleteEmailIdentityPolicyCommand)
    .de(de_DeleteEmailIdentityPolicyCommand)
    .build() {
}

class DeleteEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteEmailTemplate", {})
    .n("SESv2Client", "DeleteEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_DeleteEmailTemplateCommand)
    .de(de_DeleteEmailTemplateCommand)
    .build() {
}

class DeleteMultiRegionEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteMultiRegionEndpoint", {})
    .n("SESv2Client", "DeleteMultiRegionEndpointCommand")
    .f(void 0, void 0)
    .ser(se_DeleteMultiRegionEndpointCommand)
    .de(de_DeleteMultiRegionEndpointCommand)
    .build() {
}

class DeleteSuppressedDestinationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteSuppressedDestination", {})
    .n("SESv2Client", "DeleteSuppressedDestinationCommand")
    .f(void 0, void 0)
    .ser(se_DeleteSuppressedDestinationCommand)
    .de(de_DeleteSuppressedDestinationCommand)
    .build() {
}

class DeleteTenantCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteTenant", {})
    .n("SESv2Client", "DeleteTenantCommand")
    .f(void 0, void 0)
    .ser(se_DeleteTenantCommand)
    .de(de_DeleteTenantCommand)
    .build() {
}

class DeleteTenantResourceAssociationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "DeleteTenantResourceAssociation", {})
    .n("SESv2Client", "DeleteTenantResourceAssociationCommand")
    .f(void 0, void 0)
    .ser(se_DeleteTenantResourceAssociationCommand)
    .de(de_DeleteTenantResourceAssociationCommand)
    .build() {
}

class GetAccountCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetAccount", {})
    .n("SESv2Client", "GetAccountCommand")
    .f(void 0, GetAccountResponseFilterSensitiveLog)
    .ser(se_GetAccountCommand)
    .de(de_GetAccountCommand)
    .build() {
}

class GetBlacklistReportsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetBlacklistReports", {})
    .n("SESv2Client", "GetBlacklistReportsCommand")
    .f(void 0, void 0)
    .ser(se_GetBlacklistReportsCommand)
    .de(de_GetBlacklistReportsCommand)
    .build() {
}

class GetConfigurationSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetConfigurationSet", {})
    .n("SESv2Client", "GetConfigurationSetCommand")
    .f(void 0, void 0)
    .ser(se_GetConfigurationSetCommand)
    .de(de_GetConfigurationSetCommand)
    .build() {
}

class GetConfigurationSetEventDestinationsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetConfigurationSetEventDestinations", {})
    .n("SESv2Client", "GetConfigurationSetEventDestinationsCommand")
    .f(void 0, void 0)
    .ser(se_GetConfigurationSetEventDestinationsCommand)
    .de(de_GetConfigurationSetEventDestinationsCommand)
    .build() {
}

class GetContactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetContact", {})
    .n("SESv2Client", "GetContactCommand")
    .f(void 0, void 0)
    .ser(se_GetContactCommand)
    .de(de_GetContactCommand)
    .build() {
}

class GetContactListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetContactList", {})
    .n("SESv2Client", "GetContactListCommand")
    .f(void 0, void 0)
    .ser(se_GetContactListCommand)
    .de(de_GetContactListCommand)
    .build() {
}

class GetCustomVerificationEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetCustomVerificationEmailTemplate", {})
    .n("SESv2Client", "GetCustomVerificationEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_GetCustomVerificationEmailTemplateCommand)
    .de(de_GetCustomVerificationEmailTemplateCommand)
    .build() {
}

class GetDedicatedIpCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDedicatedIp", {})
    .n("SESv2Client", "GetDedicatedIpCommand")
    .f(void 0, void 0)
    .ser(se_GetDedicatedIpCommand)
    .de(de_GetDedicatedIpCommand)
    .build() {
}

class GetDedicatedIpPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDedicatedIpPool", {})
    .n("SESv2Client", "GetDedicatedIpPoolCommand")
    .f(void 0, void 0)
    .ser(se_GetDedicatedIpPoolCommand)
    .de(de_GetDedicatedIpPoolCommand)
    .build() {
}

class GetDedicatedIpsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDedicatedIps", {})
    .n("SESv2Client", "GetDedicatedIpsCommand")
    .f(void 0, void 0)
    .ser(se_GetDedicatedIpsCommand)
    .de(de_GetDedicatedIpsCommand)
    .build() {
}

class GetDeliverabilityDashboardOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDeliverabilityDashboardOptions", {})
    .n("SESv2Client", "GetDeliverabilityDashboardOptionsCommand")
    .f(void 0, void 0)
    .ser(se_GetDeliverabilityDashboardOptionsCommand)
    .de(de_GetDeliverabilityDashboardOptionsCommand)
    .build() {
}

class GetDeliverabilityTestReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDeliverabilityTestReport", {})
    .n("SESv2Client", "GetDeliverabilityTestReportCommand")
    .f(void 0, void 0)
    .ser(se_GetDeliverabilityTestReportCommand)
    .de(de_GetDeliverabilityTestReportCommand)
    .build() {
}

class GetDomainDeliverabilityCampaignCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDomainDeliverabilityCampaign", {})
    .n("SESv2Client", "GetDomainDeliverabilityCampaignCommand")
    .f(void 0, void 0)
    .ser(se_GetDomainDeliverabilityCampaignCommand)
    .de(de_GetDomainDeliverabilityCampaignCommand)
    .build() {
}

class GetDomainStatisticsReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetDomainStatisticsReport", {})
    .n("SESv2Client", "GetDomainStatisticsReportCommand")
    .f(void 0, void 0)
    .ser(se_GetDomainStatisticsReportCommand)
    .de(de_GetDomainStatisticsReportCommand)
    .build() {
}

class GetEmailIdentityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetEmailIdentity", {})
    .n("SESv2Client", "GetEmailIdentityCommand")
    .f(void 0, void 0)
    .ser(se_GetEmailIdentityCommand)
    .de(de_GetEmailIdentityCommand)
    .build() {
}

class GetEmailIdentityPoliciesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetEmailIdentityPolicies", {})
    .n("SESv2Client", "GetEmailIdentityPoliciesCommand")
    .f(void 0, void 0)
    .ser(se_GetEmailIdentityPoliciesCommand)
    .de(de_GetEmailIdentityPoliciesCommand)
    .build() {
}

class GetEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetEmailTemplate", {})
    .n("SESv2Client", "GetEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_GetEmailTemplateCommand)
    .de(de_GetEmailTemplateCommand)
    .build() {
}

class GetExportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetExportJob", {})
    .n("SESv2Client", "GetExportJobCommand")
    .f(void 0, GetExportJobResponseFilterSensitiveLog)
    .ser(se_GetExportJobCommand)
    .de(de_GetExportJobCommand)
    .build() {
}

class GetImportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetImportJob", {})
    .n("SESv2Client", "GetImportJobCommand")
    .f(void 0, void 0)
    .ser(se_GetImportJobCommand)
    .de(de_GetImportJobCommand)
    .build() {
}

class GetMessageInsightsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetMessageInsights", {})
    .n("SESv2Client", "GetMessageInsightsCommand")
    .f(void 0, GetMessageInsightsResponseFilterSensitiveLog)
    .ser(se_GetMessageInsightsCommand)
    .de(de_GetMessageInsightsCommand)
    .build() {
}

class GetMultiRegionEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetMultiRegionEndpoint", {})
    .n("SESv2Client", "GetMultiRegionEndpointCommand")
    .f(void 0, void 0)
    .ser(se_GetMultiRegionEndpointCommand)
    .de(de_GetMultiRegionEndpointCommand)
    .build() {
}

class GetReputationEntityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetReputationEntity", {})
    .n("SESv2Client", "GetReputationEntityCommand")
    .f(void 0, void 0)
    .ser(se_GetReputationEntityCommand)
    .de(de_GetReputationEntityCommand)
    .build() {
}

class GetSuppressedDestinationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetSuppressedDestination", {})
    .n("SESv2Client", "GetSuppressedDestinationCommand")
    .f(void 0, void 0)
    .ser(se_GetSuppressedDestinationCommand)
    .de(de_GetSuppressedDestinationCommand)
    .build() {
}

class GetTenantCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "GetTenant", {})
    .n("SESv2Client", "GetTenantCommand")
    .f(void 0, void 0)
    .ser(se_GetTenantCommand)
    .de(de_GetTenantCommand)
    .build() {
}

class ListConfigurationSetsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListConfigurationSets", {})
    .n("SESv2Client", "ListConfigurationSetsCommand")
    .f(void 0, void 0)
    .ser(se_ListConfigurationSetsCommand)
    .de(de_ListConfigurationSetsCommand)
    .build() {
}

class ListContactListsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListContactLists", {})
    .n("SESv2Client", "ListContactListsCommand")
    .f(void 0, void 0)
    .ser(se_ListContactListsCommand)
    .de(de_ListContactListsCommand)
    .build() {
}

class ListContactsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListContacts", {})
    .n("SESv2Client", "ListContactsCommand")
    .f(void 0, void 0)
    .ser(se_ListContactsCommand)
    .de(de_ListContactsCommand)
    .build() {
}

class ListCustomVerificationEmailTemplatesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListCustomVerificationEmailTemplates", {})
    .n("SESv2Client", "ListCustomVerificationEmailTemplatesCommand")
    .f(void 0, void 0)
    .ser(se_ListCustomVerificationEmailTemplatesCommand)
    .de(de_ListCustomVerificationEmailTemplatesCommand)
    .build() {
}

class ListDedicatedIpPoolsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListDedicatedIpPools", {})
    .n("SESv2Client", "ListDedicatedIpPoolsCommand")
    .f(void 0, void 0)
    .ser(se_ListDedicatedIpPoolsCommand)
    .de(de_ListDedicatedIpPoolsCommand)
    .build() {
}

class ListDeliverabilityTestReportsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListDeliverabilityTestReports", {})
    .n("SESv2Client", "ListDeliverabilityTestReportsCommand")
    .f(void 0, void 0)
    .ser(se_ListDeliverabilityTestReportsCommand)
    .de(de_ListDeliverabilityTestReportsCommand)
    .build() {
}

class ListDomainDeliverabilityCampaignsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListDomainDeliverabilityCampaigns", {})
    .n("SESv2Client", "ListDomainDeliverabilityCampaignsCommand")
    .f(void 0, void 0)
    .ser(se_ListDomainDeliverabilityCampaignsCommand)
    .de(de_ListDomainDeliverabilityCampaignsCommand)
    .build() {
}

class ListEmailIdentitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListEmailIdentities", {})
    .n("SESv2Client", "ListEmailIdentitiesCommand")
    .f(void 0, void 0)
    .ser(se_ListEmailIdentitiesCommand)
    .de(de_ListEmailIdentitiesCommand)
    .build() {
}

class ListEmailTemplatesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListEmailTemplates", {})
    .n("SESv2Client", "ListEmailTemplatesCommand")
    .f(void 0, void 0)
    .ser(se_ListEmailTemplatesCommand)
    .de(de_ListEmailTemplatesCommand)
    .build() {
}

class ListExportJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListExportJobs", {})
    .n("SESv2Client", "ListExportJobsCommand")
    .f(void 0, void 0)
    .ser(se_ListExportJobsCommand)
    .de(de_ListExportJobsCommand)
    .build() {
}

class ListImportJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListImportJobs", {})
    .n("SESv2Client", "ListImportJobsCommand")
    .f(void 0, void 0)
    .ser(se_ListImportJobsCommand)
    .de(de_ListImportJobsCommand)
    .build() {
}

class ListMultiRegionEndpointsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListMultiRegionEndpoints", {})
    .n("SESv2Client", "ListMultiRegionEndpointsCommand")
    .f(void 0, void 0)
    .ser(se_ListMultiRegionEndpointsCommand)
    .de(de_ListMultiRegionEndpointsCommand)
    .build() {
}

class ListRecommendationsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListRecommendations", {})
    .n("SESv2Client", "ListRecommendationsCommand")
    .f(void 0, void 0)
    .ser(se_ListRecommendationsCommand)
    .de(de_ListRecommendationsCommand)
    .build() {
}

class ListReputationEntitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListReputationEntities", {})
    .n("SESv2Client", "ListReputationEntitiesCommand")
    .f(void 0, void 0)
    .ser(se_ListReputationEntitiesCommand)
    .de(de_ListReputationEntitiesCommand)
    .build() {
}

class ListResourceTenantsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListResourceTenants", {})
    .n("SESv2Client", "ListResourceTenantsCommand")
    .f(void 0, void 0)
    .ser(se_ListResourceTenantsCommand)
    .de(de_ListResourceTenantsCommand)
    .build() {
}

class ListSuppressedDestinationsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListSuppressedDestinations", {})
    .n("SESv2Client", "ListSuppressedDestinationsCommand")
    .f(void 0, void 0)
    .ser(se_ListSuppressedDestinationsCommand)
    .de(de_ListSuppressedDestinationsCommand)
    .build() {
}

class ListTagsForResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListTagsForResource", {})
    .n("SESv2Client", "ListTagsForResourceCommand")
    .f(void 0, void 0)
    .ser(se_ListTagsForResourceCommand)
    .de(de_ListTagsForResourceCommand)
    .build() {
}

class ListTenantResourcesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListTenantResources", {})
    .n("SESv2Client", "ListTenantResourcesCommand")
    .f(void 0, void 0)
    .ser(se_ListTenantResourcesCommand)
    .de(de_ListTenantResourcesCommand)
    .build() {
}

class ListTenantsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "ListTenants", {})
    .n("SESv2Client", "ListTenantsCommand")
    .f(void 0, void 0)
    .ser(se_ListTenantsCommand)
    .de(de_ListTenantsCommand)
    .build() {
}

class PutAccountDedicatedIpWarmupAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutAccountDedicatedIpWarmupAttributes", {})
    .n("SESv2Client", "PutAccountDedicatedIpWarmupAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutAccountDedicatedIpWarmupAttributesCommand)
    .de(de_PutAccountDedicatedIpWarmupAttributesCommand)
    .build() {
}

const ListTenantResourcesFilterKey = {
    RESOURCE_TYPE: "RESOURCE_TYPE",
};
const ResourceType = {
    CONFIGURATION_SET: "CONFIGURATION_SET",
    EMAIL_IDENTITY: "EMAIL_IDENTITY",
    EMAIL_TEMPLATE: "EMAIL_TEMPLATE",
};
const PutAccountDetailsRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.WebsiteURL && { WebsiteURL: smithyClient.SENSITIVE_STRING }),
    ...(obj.UseCaseDescription && { UseCaseDescription: smithyClient.SENSITIVE_STRING }),
    ...(obj.AdditionalContactEmailAddresses && { AdditionalContactEmailAddresses: smithyClient.SENSITIVE_STRING }),
});
const PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.SigningAttributes && { SigningAttributes: DkimSigningAttributesFilterSensitiveLog(obj.SigningAttributes) }),
});

class PutAccountDetailsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutAccountDetails", {})
    .n("SESv2Client", "PutAccountDetailsCommand")
    .f(PutAccountDetailsRequestFilterSensitiveLog, void 0)
    .ser(se_PutAccountDetailsCommand)
    .de(de_PutAccountDetailsCommand)
    .build() {
}

class PutAccountSendingAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutAccountSendingAttributes", {})
    .n("SESv2Client", "PutAccountSendingAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutAccountSendingAttributesCommand)
    .de(de_PutAccountSendingAttributesCommand)
    .build() {
}

class PutAccountSuppressionAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutAccountSuppressionAttributes", {})
    .n("SESv2Client", "PutAccountSuppressionAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutAccountSuppressionAttributesCommand)
    .de(de_PutAccountSuppressionAttributesCommand)
    .build() {
}

class PutAccountVdmAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutAccountVdmAttributes", {})
    .n("SESv2Client", "PutAccountVdmAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutAccountVdmAttributesCommand)
    .de(de_PutAccountVdmAttributesCommand)
    .build() {
}

class PutConfigurationSetArchivingOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetArchivingOptions", {})
    .n("SESv2Client", "PutConfigurationSetArchivingOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetArchivingOptionsCommand)
    .de(de_PutConfigurationSetArchivingOptionsCommand)
    .build() {
}

class PutConfigurationSetDeliveryOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetDeliveryOptions", {})
    .n("SESv2Client", "PutConfigurationSetDeliveryOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetDeliveryOptionsCommand)
    .de(de_PutConfigurationSetDeliveryOptionsCommand)
    .build() {
}

class PutConfigurationSetReputationOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetReputationOptions", {})
    .n("SESv2Client", "PutConfigurationSetReputationOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetReputationOptionsCommand)
    .de(de_PutConfigurationSetReputationOptionsCommand)
    .build() {
}

class PutConfigurationSetSendingOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetSendingOptions", {})
    .n("SESv2Client", "PutConfigurationSetSendingOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetSendingOptionsCommand)
    .de(de_PutConfigurationSetSendingOptionsCommand)
    .build() {
}

class PutConfigurationSetSuppressionOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetSuppressionOptions", {})
    .n("SESv2Client", "PutConfigurationSetSuppressionOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetSuppressionOptionsCommand)
    .de(de_PutConfigurationSetSuppressionOptionsCommand)
    .build() {
}

class PutConfigurationSetTrackingOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetTrackingOptions", {})
    .n("SESv2Client", "PutConfigurationSetTrackingOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetTrackingOptionsCommand)
    .de(de_PutConfigurationSetTrackingOptionsCommand)
    .build() {
}

class PutConfigurationSetVdmOptionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutConfigurationSetVdmOptions", {})
    .n("SESv2Client", "PutConfigurationSetVdmOptionsCommand")
    .f(void 0, void 0)
    .ser(se_PutConfigurationSetVdmOptionsCommand)
    .de(de_PutConfigurationSetVdmOptionsCommand)
    .build() {
}

class PutDedicatedIpInPoolCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutDedicatedIpInPool", {})
    .n("SESv2Client", "PutDedicatedIpInPoolCommand")
    .f(void 0, void 0)
    .ser(se_PutDedicatedIpInPoolCommand)
    .de(de_PutDedicatedIpInPoolCommand)
    .build() {
}

class PutDedicatedIpPoolScalingAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutDedicatedIpPoolScalingAttributes", {})
    .n("SESv2Client", "PutDedicatedIpPoolScalingAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutDedicatedIpPoolScalingAttributesCommand)
    .de(de_PutDedicatedIpPoolScalingAttributesCommand)
    .build() {
}

class PutDedicatedIpWarmupAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutDedicatedIpWarmupAttributes", {})
    .n("SESv2Client", "PutDedicatedIpWarmupAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutDedicatedIpWarmupAttributesCommand)
    .de(de_PutDedicatedIpWarmupAttributesCommand)
    .build() {
}

class PutDeliverabilityDashboardOptionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutDeliverabilityDashboardOption", {})
    .n("SESv2Client", "PutDeliverabilityDashboardOptionCommand")
    .f(void 0, void 0)
    .ser(se_PutDeliverabilityDashboardOptionCommand)
    .de(de_PutDeliverabilityDashboardOptionCommand)
    .build() {
}

class PutEmailIdentityConfigurationSetAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutEmailIdentityConfigurationSetAttributes", {})
    .n("SESv2Client", "PutEmailIdentityConfigurationSetAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutEmailIdentityConfigurationSetAttributesCommand)
    .de(de_PutEmailIdentityConfigurationSetAttributesCommand)
    .build() {
}

class PutEmailIdentityDkimAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutEmailIdentityDkimAttributes", {})
    .n("SESv2Client", "PutEmailIdentityDkimAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutEmailIdentityDkimAttributesCommand)
    .de(de_PutEmailIdentityDkimAttributesCommand)
    .build() {
}

class PutEmailIdentityDkimSigningAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutEmailIdentityDkimSigningAttributes", {})
    .n("SESv2Client", "PutEmailIdentityDkimSigningAttributesCommand")
    .f(PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog, void 0)
    .ser(se_PutEmailIdentityDkimSigningAttributesCommand)
    .de(de_PutEmailIdentityDkimSigningAttributesCommand)
    .build() {
}

class PutEmailIdentityFeedbackAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutEmailIdentityFeedbackAttributes", {})
    .n("SESv2Client", "PutEmailIdentityFeedbackAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutEmailIdentityFeedbackAttributesCommand)
    .de(de_PutEmailIdentityFeedbackAttributesCommand)
    .build() {
}

class PutEmailIdentityMailFromAttributesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutEmailIdentityMailFromAttributes", {})
    .n("SESv2Client", "PutEmailIdentityMailFromAttributesCommand")
    .f(void 0, void 0)
    .ser(se_PutEmailIdentityMailFromAttributesCommand)
    .de(de_PutEmailIdentityMailFromAttributesCommand)
    .build() {
}

class PutSuppressedDestinationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "PutSuppressedDestination", {})
    .n("SESv2Client", "PutSuppressedDestinationCommand")
    .f(void 0, void 0)
    .ser(se_PutSuppressedDestinationCommand)
    .de(de_PutSuppressedDestinationCommand)
    .build() {
}

class SendBulkEmailCommand extends smithyClient.Command
    .classBuilder()
    .ep({
    ...commonParams,
    EndpointId: { type: "contextParams", name: "EndpointId" },
})
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "SendBulkEmail", {})
    .n("SESv2Client", "SendBulkEmailCommand")
    .f(void 0, void 0)
    .ser(se_SendBulkEmailCommand)
    .de(de_SendBulkEmailCommand)
    .build() {
}

class SendCustomVerificationEmailCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "SendCustomVerificationEmail", {})
    .n("SESv2Client", "SendCustomVerificationEmailCommand")
    .f(void 0, void 0)
    .ser(se_SendCustomVerificationEmailCommand)
    .de(de_SendCustomVerificationEmailCommand)
    .build() {
}

class SendEmailCommand extends smithyClient.Command
    .classBuilder()
    .ep({
    ...commonParams,
    EndpointId: { type: "contextParams", name: "EndpointId" },
})
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "SendEmail", {})
    .n("SESv2Client", "SendEmailCommand")
    .f(void 0, void 0)
    .ser(se_SendEmailCommand)
    .de(de_SendEmailCommand)
    .build() {
}

class TagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "TagResource", {})
    .n("SESv2Client", "TagResourceCommand")
    .f(void 0, void 0)
    .ser(se_TagResourceCommand)
    .de(de_TagResourceCommand)
    .build() {
}

class TestRenderEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "TestRenderEmailTemplate", {})
    .n("SESv2Client", "TestRenderEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_TestRenderEmailTemplateCommand)
    .de(de_TestRenderEmailTemplateCommand)
    .build() {
}

class UntagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UntagResource", {})
    .n("SESv2Client", "UntagResourceCommand")
    .f(void 0, void 0)
    .ser(se_UntagResourceCommand)
    .de(de_UntagResourceCommand)
    .build() {
}

class UpdateConfigurationSetEventDestinationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateConfigurationSetEventDestination", {})
    .n("SESv2Client", "UpdateConfigurationSetEventDestinationCommand")
    .f(void 0, void 0)
    .ser(se_UpdateConfigurationSetEventDestinationCommand)
    .de(de_UpdateConfigurationSetEventDestinationCommand)
    .build() {
}

class UpdateContactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateContact", {})
    .n("SESv2Client", "UpdateContactCommand")
    .f(void 0, void 0)
    .ser(se_UpdateContactCommand)
    .de(de_UpdateContactCommand)
    .build() {
}

class UpdateContactListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateContactList", {})
    .n("SESv2Client", "UpdateContactListCommand")
    .f(void 0, void 0)
    .ser(se_UpdateContactListCommand)
    .de(de_UpdateContactListCommand)
    .build() {
}

class UpdateCustomVerificationEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateCustomVerificationEmailTemplate", {})
    .n("SESv2Client", "UpdateCustomVerificationEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_UpdateCustomVerificationEmailTemplateCommand)
    .de(de_UpdateCustomVerificationEmailTemplateCommand)
    .build() {
}

class UpdateEmailIdentityPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateEmailIdentityPolicy", {})
    .n("SESv2Client", "UpdateEmailIdentityPolicyCommand")
    .f(void 0, void 0)
    .ser(se_UpdateEmailIdentityPolicyCommand)
    .de(de_UpdateEmailIdentityPolicyCommand)
    .build() {
}

class UpdateEmailTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateEmailTemplate", {})
    .n("SESv2Client", "UpdateEmailTemplateCommand")
    .f(void 0, void 0)
    .ser(se_UpdateEmailTemplateCommand)
    .de(de_UpdateEmailTemplateCommand)
    .build() {
}

class UpdateReputationEntityCustomerManagedStatusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateReputationEntityCustomerManagedStatus", {})
    .n("SESv2Client", "UpdateReputationEntityCustomerManagedStatusCommand")
    .f(void 0, void 0)
    .ser(se_UpdateReputationEntityCustomerManagedStatusCommand)
    .de(de_UpdateReputationEntityCustomerManagedStatusCommand)
    .build() {
}

class UpdateReputationEntityPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareSerde.getSerdePlugin(config, this.serialize, this.deserialize),
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
    ];
})
    .s("SimpleEmailService_v2", "UpdateReputationEntityPolicy", {})
    .n("SESv2Client", "UpdateReputationEntityPolicyCommand")
    .f(void 0, void 0)
    .ser(se_UpdateReputationEntityPolicyCommand)
    .de(de_UpdateReputationEntityPolicyCommand)
    .build() {
}

const commands = {
    BatchGetMetricDataCommand,
    CancelExportJobCommand,
    CreateConfigurationSetCommand,
    CreateConfigurationSetEventDestinationCommand,
    CreateContactCommand,
    CreateContactListCommand,
    CreateCustomVerificationEmailTemplateCommand,
    CreateDedicatedIpPoolCommand,
    CreateDeliverabilityTestReportCommand,
    CreateEmailIdentityCommand,
    CreateEmailIdentityPolicyCommand,
    CreateEmailTemplateCommand,
    CreateExportJobCommand,
    CreateImportJobCommand,
    CreateMultiRegionEndpointCommand,
    CreateTenantCommand,
    CreateTenantResourceAssociationCommand,
    DeleteConfigurationSetCommand,
    DeleteConfigurationSetEventDestinationCommand,
    DeleteContactCommand,
    DeleteContactListCommand,
    DeleteCustomVerificationEmailTemplateCommand,
    DeleteDedicatedIpPoolCommand,
    DeleteEmailIdentityCommand,
    DeleteEmailIdentityPolicyCommand,
    DeleteEmailTemplateCommand,
    DeleteMultiRegionEndpointCommand,
    DeleteSuppressedDestinationCommand,
    DeleteTenantCommand,
    DeleteTenantResourceAssociationCommand,
    GetAccountCommand,
    GetBlacklistReportsCommand,
    GetConfigurationSetCommand,
    GetConfigurationSetEventDestinationsCommand,
    GetContactCommand,
    GetContactListCommand,
    GetCustomVerificationEmailTemplateCommand,
    GetDedicatedIpCommand,
    GetDedicatedIpPoolCommand,
    GetDedicatedIpsCommand,
    GetDeliverabilityDashboardOptionsCommand,
    GetDeliverabilityTestReportCommand,
    GetDomainDeliverabilityCampaignCommand,
    GetDomainStatisticsReportCommand,
    GetEmailIdentityCommand,
    GetEmailIdentityPoliciesCommand,
    GetEmailTemplateCommand,
    GetExportJobCommand,
    GetImportJobCommand,
    GetMessageInsightsCommand,
    GetMultiRegionEndpointCommand,
    GetReputationEntityCommand,
    GetSuppressedDestinationCommand,
    GetTenantCommand,
    ListConfigurationSetsCommand,
    ListContactListsCommand,
    ListContactsCommand,
    ListCustomVerificationEmailTemplatesCommand,
    ListDedicatedIpPoolsCommand,
    ListDeliverabilityTestReportsCommand,
    ListDomainDeliverabilityCampaignsCommand,
    ListEmailIdentitiesCommand,
    ListEmailTemplatesCommand,
    ListExportJobsCommand,
    ListImportJobsCommand,
    ListMultiRegionEndpointsCommand,
    ListRecommendationsCommand,
    ListReputationEntitiesCommand,
    ListResourceTenantsCommand,
    ListSuppressedDestinationsCommand,
    ListTagsForResourceCommand,
    ListTenantResourcesCommand,
    ListTenantsCommand,
    PutAccountDedicatedIpWarmupAttributesCommand,
    PutAccountDetailsCommand,
    PutAccountSendingAttributesCommand,
    PutAccountSuppressionAttributesCommand,
    PutAccountVdmAttributesCommand,
    PutConfigurationSetArchivingOptionsCommand,
    PutConfigurationSetDeliveryOptionsCommand,
    PutConfigurationSetReputationOptionsCommand,
    PutConfigurationSetSendingOptionsCommand,
    PutConfigurationSetSuppressionOptionsCommand,
    PutConfigurationSetTrackingOptionsCommand,
    PutConfigurationSetVdmOptionsCommand,
    PutDedicatedIpInPoolCommand,
    PutDedicatedIpPoolScalingAttributesCommand,
    PutDedicatedIpWarmupAttributesCommand,
    PutDeliverabilityDashboardOptionCommand,
    PutEmailIdentityConfigurationSetAttributesCommand,
    PutEmailIdentityDkimAttributesCommand,
    PutEmailIdentityDkimSigningAttributesCommand,
    PutEmailIdentityFeedbackAttributesCommand,
    PutEmailIdentityMailFromAttributesCommand,
    PutSuppressedDestinationCommand,
    SendBulkEmailCommand,
    SendCustomVerificationEmailCommand,
    SendEmailCommand,
    TagResourceCommand,
    TestRenderEmailTemplateCommand,
    UntagResourceCommand,
    UpdateConfigurationSetEventDestinationCommand,
    UpdateContactCommand,
    UpdateContactListCommand,
    UpdateCustomVerificationEmailTemplateCommand,
    UpdateEmailIdentityPolicyCommand,
    UpdateEmailTemplateCommand,
    UpdateReputationEntityCustomerManagedStatusCommand,
    UpdateReputationEntityPolicyCommand,
};
class SESv2 extends SESv2Client {
}
smithyClient.createAggregatedClient(commands, SESv2);

const paginateGetDedicatedIps = core.createPaginator(SESv2Client, GetDedicatedIpsCommand, "NextToken", "NextToken", "PageSize");

const paginateListConfigurationSets = core.createPaginator(SESv2Client, ListConfigurationSetsCommand, "NextToken", "NextToken", "PageSize");

const paginateListContactLists = core.createPaginator(SESv2Client, ListContactListsCommand, "NextToken", "NextToken", "PageSize");

const paginateListContacts = core.createPaginator(SESv2Client, ListContactsCommand, "NextToken", "NextToken", "PageSize");

const paginateListCustomVerificationEmailTemplates = core.createPaginator(SESv2Client, ListCustomVerificationEmailTemplatesCommand, "NextToken", "NextToken", "PageSize");

const paginateListDedicatedIpPools = core.createPaginator(SESv2Client, ListDedicatedIpPoolsCommand, "NextToken", "NextToken", "PageSize");

const paginateListDeliverabilityTestReports = core.createPaginator(SESv2Client, ListDeliverabilityTestReportsCommand, "NextToken", "NextToken", "PageSize");

const paginateListDomainDeliverabilityCampaigns = core.createPaginator(SESv2Client, ListDomainDeliverabilityCampaignsCommand, "NextToken", "NextToken", "PageSize");

const paginateListEmailIdentities = core.createPaginator(SESv2Client, ListEmailIdentitiesCommand, "NextToken", "NextToken", "PageSize");

const paginateListEmailTemplates = core.createPaginator(SESv2Client, ListEmailTemplatesCommand, "NextToken", "NextToken", "PageSize");

const paginateListExportJobs = core.createPaginator(SESv2Client, ListExportJobsCommand, "NextToken", "NextToken", "PageSize");

const paginateListImportJobs = core.createPaginator(SESv2Client, ListImportJobsCommand, "NextToken", "NextToken", "PageSize");

const paginateListMultiRegionEndpoints = core.createPaginator(SESv2Client, ListMultiRegionEndpointsCommand, "NextToken", "NextToken", "PageSize");

const paginateListRecommendations = core.createPaginator(SESv2Client, ListRecommendationsCommand, "NextToken", "NextToken", "PageSize");

const paginateListReputationEntities = core.createPaginator(SESv2Client, ListReputationEntitiesCommand, "NextToken", "NextToken", "PageSize");

const paginateListResourceTenants = core.createPaginator(SESv2Client, ListResourceTenantsCommand, "NextToken", "NextToken", "PageSize");

const paginateListSuppressedDestinations = core.createPaginator(SESv2Client, ListSuppressedDestinationsCommand, "NextToken", "NextToken", "PageSize");

const paginateListTenantResources = core.createPaginator(SESv2Client, ListTenantResourcesCommand, "NextToken", "NextToken", "PageSize");

const paginateListTenants = core.createPaginator(SESv2Client, ListTenantsCommand, "NextToken", "NextToken", "PageSize");

Object.defineProperty(exports, "$Command", {
    enumerable: true,
    get: function () { return smithyClient.Command; }
});
Object.defineProperty(exports, "__Client", {
    enumerable: true,
    get: function () { return smithyClient.Client; }
});
exports.AccountDetailsFilterSensitiveLog = AccountDetailsFilterSensitiveLog;
exports.AccountSuspendedException = AccountSuspendedException;
exports.AlreadyExistsException = AlreadyExistsException;
exports.AttachmentContentDisposition = AttachmentContentDisposition;
exports.AttachmentContentTransferEncoding = AttachmentContentTransferEncoding;
exports.BadRequestException = BadRequestException;
exports.BatchGetMetricDataCommand = BatchGetMetricDataCommand;
exports.BehaviorOnMxFailure = BehaviorOnMxFailure;
exports.BounceType = BounceType;
exports.BulkEmailStatus = BulkEmailStatus;
exports.CancelExportJobCommand = CancelExportJobCommand;
exports.ConcurrentModificationException = ConcurrentModificationException;
exports.ConflictException = ConflictException;
exports.ContactLanguage = ContactLanguage;
exports.ContactListImportAction = ContactListImportAction;
exports.CreateConfigurationSetCommand = CreateConfigurationSetCommand;
exports.CreateConfigurationSetEventDestinationCommand = CreateConfigurationSetEventDestinationCommand;
exports.CreateContactCommand = CreateContactCommand;
exports.CreateContactListCommand = CreateContactListCommand;
exports.CreateCustomVerificationEmailTemplateCommand = CreateCustomVerificationEmailTemplateCommand;
exports.CreateDedicatedIpPoolCommand = CreateDedicatedIpPoolCommand;
exports.CreateDeliverabilityTestReportCommand = CreateDeliverabilityTestReportCommand;
exports.CreateEmailIdentityCommand = CreateEmailIdentityCommand;
exports.CreateEmailIdentityPolicyCommand = CreateEmailIdentityPolicyCommand;
exports.CreateEmailIdentityRequestFilterSensitiveLog = CreateEmailIdentityRequestFilterSensitiveLog;
exports.CreateEmailTemplateCommand = CreateEmailTemplateCommand;
exports.CreateExportJobCommand = CreateExportJobCommand;
exports.CreateExportJobRequestFilterSensitiveLog = CreateExportJobRequestFilterSensitiveLog;
exports.CreateImportJobCommand = CreateImportJobCommand;
exports.CreateMultiRegionEndpointCommand = CreateMultiRegionEndpointCommand;
exports.CreateTenantCommand = CreateTenantCommand;
exports.CreateTenantResourceAssociationCommand = CreateTenantResourceAssociationCommand;
exports.DataFormat = DataFormat;
exports.DeleteConfigurationSetCommand = DeleteConfigurationSetCommand;
exports.DeleteConfigurationSetEventDestinationCommand = DeleteConfigurationSetEventDestinationCommand;
exports.DeleteContactCommand = DeleteContactCommand;
exports.DeleteContactListCommand = DeleteContactListCommand;
exports.DeleteCustomVerificationEmailTemplateCommand = DeleteCustomVerificationEmailTemplateCommand;
exports.DeleteDedicatedIpPoolCommand = DeleteDedicatedIpPoolCommand;
exports.DeleteEmailIdentityCommand = DeleteEmailIdentityCommand;
exports.DeleteEmailIdentityPolicyCommand = DeleteEmailIdentityPolicyCommand;
exports.DeleteEmailTemplateCommand = DeleteEmailTemplateCommand;
exports.DeleteMultiRegionEndpointCommand = DeleteMultiRegionEndpointCommand;
exports.DeleteSuppressedDestinationCommand = DeleteSuppressedDestinationCommand;
exports.DeleteTenantCommand = DeleteTenantCommand;
exports.DeleteTenantResourceAssociationCommand = DeleteTenantResourceAssociationCommand;
exports.DeliverabilityDashboardAccountStatus = DeliverabilityDashboardAccountStatus;
exports.DeliverabilityTestStatus = DeliverabilityTestStatus;
exports.DeliveryEventType = DeliveryEventType;
exports.DimensionValueSource = DimensionValueSource;
exports.DkimSigningAttributesFilterSensitiveLog = DkimSigningAttributesFilterSensitiveLog;
exports.DkimSigningAttributesOrigin = DkimSigningAttributesOrigin;
exports.DkimSigningKeyLength = DkimSigningKeyLength;
exports.DkimStatus = DkimStatus;
exports.EmailInsightsFilterSensitiveLog = EmailInsightsFilterSensitiveLog;
exports.EngagementEventType = EngagementEventType;
exports.EventType = EventType;
exports.ExportDataSourceFilterSensitiveLog = ExportDataSourceFilterSensitiveLog;
exports.ExportSourceType = ExportSourceType;
exports.FeatureStatus = FeatureStatus;
exports.GetAccountCommand = GetAccountCommand;
exports.GetAccountResponseFilterSensitiveLog = GetAccountResponseFilterSensitiveLog;
exports.GetBlacklistReportsCommand = GetBlacklistReportsCommand;
exports.GetConfigurationSetCommand = GetConfigurationSetCommand;
exports.GetConfigurationSetEventDestinationsCommand = GetConfigurationSetEventDestinationsCommand;
exports.GetContactCommand = GetContactCommand;
exports.GetContactListCommand = GetContactListCommand;
exports.GetCustomVerificationEmailTemplateCommand = GetCustomVerificationEmailTemplateCommand;
exports.GetDedicatedIpCommand = GetDedicatedIpCommand;
exports.GetDedicatedIpPoolCommand = GetDedicatedIpPoolCommand;
exports.GetDedicatedIpsCommand = GetDedicatedIpsCommand;
exports.GetDeliverabilityDashboardOptionsCommand = GetDeliverabilityDashboardOptionsCommand;
exports.GetDeliverabilityTestReportCommand = GetDeliverabilityTestReportCommand;
exports.GetDomainDeliverabilityCampaignCommand = GetDomainDeliverabilityCampaignCommand;
exports.GetDomainStatisticsReportCommand = GetDomainStatisticsReportCommand;
exports.GetEmailIdentityCommand = GetEmailIdentityCommand;
exports.GetEmailIdentityPoliciesCommand = GetEmailIdentityPoliciesCommand;
exports.GetEmailTemplateCommand = GetEmailTemplateCommand;
exports.GetExportJobCommand = GetExportJobCommand;
exports.GetExportJobResponseFilterSensitiveLog = GetExportJobResponseFilterSensitiveLog;
exports.GetImportJobCommand = GetImportJobCommand;
exports.GetMessageInsightsCommand = GetMessageInsightsCommand;
exports.GetMessageInsightsResponseFilterSensitiveLog = GetMessageInsightsResponseFilterSensitiveLog;
exports.GetMultiRegionEndpointCommand = GetMultiRegionEndpointCommand;
exports.GetReputationEntityCommand = GetReputationEntityCommand;
exports.GetSuppressedDestinationCommand = GetSuppressedDestinationCommand;
exports.GetTenantCommand = GetTenantCommand;
exports.HttpsPolicy = HttpsPolicy;
exports.IdentityType = IdentityType;
exports.ImportDestinationType = ImportDestinationType;
exports.InternalServiceErrorException = InternalServiceErrorException;
exports.InvalidNextTokenException = InvalidNextTokenException;
exports.JobStatus = JobStatus;
exports.LimitExceededException = LimitExceededException;
exports.ListConfigurationSetsCommand = ListConfigurationSetsCommand;
exports.ListContactListsCommand = ListContactListsCommand;
exports.ListContactsCommand = ListContactsCommand;
exports.ListCustomVerificationEmailTemplatesCommand = ListCustomVerificationEmailTemplatesCommand;
exports.ListDedicatedIpPoolsCommand = ListDedicatedIpPoolsCommand;
exports.ListDeliverabilityTestReportsCommand = ListDeliverabilityTestReportsCommand;
exports.ListDomainDeliverabilityCampaignsCommand = ListDomainDeliverabilityCampaignsCommand;
exports.ListEmailIdentitiesCommand = ListEmailIdentitiesCommand;
exports.ListEmailTemplatesCommand = ListEmailTemplatesCommand;
exports.ListExportJobsCommand = ListExportJobsCommand;
exports.ListImportJobsCommand = ListImportJobsCommand;
exports.ListMultiRegionEndpointsCommand = ListMultiRegionEndpointsCommand;
exports.ListRecommendationsCommand = ListRecommendationsCommand;
exports.ListRecommendationsFilterKey = ListRecommendationsFilterKey;
exports.ListReputationEntitiesCommand = ListReputationEntitiesCommand;
exports.ListResourceTenantsCommand = ListResourceTenantsCommand;
exports.ListSuppressedDestinationsCommand = ListSuppressedDestinationsCommand;
exports.ListTagsForResourceCommand = ListTagsForResourceCommand;
exports.ListTenantResourcesCommand = ListTenantResourcesCommand;
exports.ListTenantResourcesFilterKey = ListTenantResourcesFilterKey;
exports.ListTenantsCommand = ListTenantsCommand;
exports.MailFromDomainNotVerifiedException = MailFromDomainNotVerifiedException;
exports.MailFromDomainStatus = MailFromDomainStatus;
exports.MailType = MailType;
exports.MessageInsightsDataSourceFilterSensitiveLog = MessageInsightsDataSourceFilterSensitiveLog;
exports.MessageInsightsFiltersFilterSensitiveLog = MessageInsightsFiltersFilterSensitiveLog;
exports.MessageRejected = MessageRejected;
exports.Metric = Metric;
exports.MetricAggregation = MetricAggregation;
exports.MetricDimensionName = MetricDimensionName;
exports.MetricNamespace = MetricNamespace;
exports.NotFoundException = NotFoundException;
exports.PutAccountDedicatedIpWarmupAttributesCommand = PutAccountDedicatedIpWarmupAttributesCommand;
exports.PutAccountDetailsCommand = PutAccountDetailsCommand;
exports.PutAccountDetailsRequestFilterSensitiveLog = PutAccountDetailsRequestFilterSensitiveLog;
exports.PutAccountSendingAttributesCommand = PutAccountSendingAttributesCommand;
exports.PutAccountSuppressionAttributesCommand = PutAccountSuppressionAttributesCommand;
exports.PutAccountVdmAttributesCommand = PutAccountVdmAttributesCommand;
exports.PutConfigurationSetArchivingOptionsCommand = PutConfigurationSetArchivingOptionsCommand;
exports.PutConfigurationSetDeliveryOptionsCommand = PutConfigurationSetDeliveryOptionsCommand;
exports.PutConfigurationSetReputationOptionsCommand = PutConfigurationSetReputationOptionsCommand;
exports.PutConfigurationSetSendingOptionsCommand = PutConfigurationSetSendingOptionsCommand;
exports.PutConfigurationSetSuppressionOptionsCommand = PutConfigurationSetSuppressionOptionsCommand;
exports.PutConfigurationSetTrackingOptionsCommand = PutConfigurationSetTrackingOptionsCommand;
exports.PutConfigurationSetVdmOptionsCommand = PutConfigurationSetVdmOptionsCommand;
exports.PutDedicatedIpInPoolCommand = PutDedicatedIpInPoolCommand;
exports.PutDedicatedIpPoolScalingAttributesCommand = PutDedicatedIpPoolScalingAttributesCommand;
exports.PutDedicatedIpWarmupAttributesCommand = PutDedicatedIpWarmupAttributesCommand;
exports.PutDeliverabilityDashboardOptionCommand = PutDeliverabilityDashboardOptionCommand;
exports.PutEmailIdentityConfigurationSetAttributesCommand = PutEmailIdentityConfigurationSetAttributesCommand;
exports.PutEmailIdentityDkimAttributesCommand = PutEmailIdentityDkimAttributesCommand;
exports.PutEmailIdentityDkimSigningAttributesCommand = PutEmailIdentityDkimSigningAttributesCommand;
exports.PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog = PutEmailIdentityDkimSigningAttributesRequestFilterSensitiveLog;
exports.PutEmailIdentityFeedbackAttributesCommand = PutEmailIdentityFeedbackAttributesCommand;
exports.PutEmailIdentityMailFromAttributesCommand = PutEmailIdentityMailFromAttributesCommand;
exports.PutSuppressedDestinationCommand = PutSuppressedDestinationCommand;
exports.QueryErrorCode = QueryErrorCode;
exports.RecommendationImpact = RecommendationImpact;
exports.RecommendationStatus = RecommendationStatus;
exports.RecommendationType = RecommendationType;
exports.ReputationEntityFilterKey = ReputationEntityFilterKey;
exports.ReputationEntityType = ReputationEntityType;
exports.ResourceType = ResourceType;
exports.ReviewStatus = ReviewStatus;
exports.SESv2 = SESv2;
exports.SESv2Client = SESv2Client;
exports.SESv2ServiceException = SESv2ServiceException;
exports.ScalingMode = ScalingMode;
exports.SendBulkEmailCommand = SendBulkEmailCommand;
exports.SendCustomVerificationEmailCommand = SendCustomVerificationEmailCommand;
exports.SendEmailCommand = SendEmailCommand;
exports.SendingPausedException = SendingPausedException;
exports.SendingStatus = SendingStatus;
exports.Status = Status;
exports.SubscriptionStatus = SubscriptionStatus;
exports.SuppressionListImportAction = SuppressionListImportAction;
exports.SuppressionListReason = SuppressionListReason;
exports.TagResourceCommand = TagResourceCommand;
exports.TestRenderEmailTemplateCommand = TestRenderEmailTemplateCommand;
exports.TlsPolicy = TlsPolicy;
exports.TooManyRequestsException = TooManyRequestsException;
exports.UntagResourceCommand = UntagResourceCommand;
exports.UpdateConfigurationSetEventDestinationCommand = UpdateConfigurationSetEventDestinationCommand;
exports.UpdateContactCommand = UpdateContactCommand;
exports.UpdateContactListCommand = UpdateContactListCommand;
exports.UpdateCustomVerificationEmailTemplateCommand = UpdateCustomVerificationEmailTemplateCommand;
exports.UpdateEmailIdentityPolicyCommand = UpdateEmailIdentityPolicyCommand;
exports.UpdateEmailTemplateCommand = UpdateEmailTemplateCommand;
exports.UpdateReputationEntityCustomerManagedStatusCommand = UpdateReputationEntityCustomerManagedStatusCommand;
exports.UpdateReputationEntityPolicyCommand = UpdateReputationEntityPolicyCommand;
exports.VerificationError = VerificationError;
exports.VerificationStatus = VerificationStatus;
exports.WarmupStatus = WarmupStatus;
exports.paginateGetDedicatedIps = paginateGetDedicatedIps;
exports.paginateListConfigurationSets = paginateListConfigurationSets;
exports.paginateListContactLists = paginateListContactLists;
exports.paginateListContacts = paginateListContacts;
exports.paginateListCustomVerificationEmailTemplates = paginateListCustomVerificationEmailTemplates;
exports.paginateListDedicatedIpPools = paginateListDedicatedIpPools;
exports.paginateListDeliverabilityTestReports = paginateListDeliverabilityTestReports;
exports.paginateListDomainDeliverabilityCampaigns = paginateListDomainDeliverabilityCampaigns;
exports.paginateListEmailIdentities = paginateListEmailIdentities;
exports.paginateListEmailTemplates = paginateListEmailTemplates;
exports.paginateListExportJobs = paginateListExportJobs;
exports.paginateListImportJobs = paginateListImportJobs;
exports.paginateListMultiRegionEndpoints = paginateListMultiRegionEndpoints;
exports.paginateListRecommendations = paginateListRecommendations;
exports.paginateListReputationEntities = paginateListReputationEntities;
exports.paginateListResourceTenants = paginateListResourceTenants;
exports.paginateListSuppressedDestinations = paginateListSuppressedDestinations;
exports.paginateListTenantResources = paginateListTenantResources;
exports.paginateListTenants = paginateListTenants;
