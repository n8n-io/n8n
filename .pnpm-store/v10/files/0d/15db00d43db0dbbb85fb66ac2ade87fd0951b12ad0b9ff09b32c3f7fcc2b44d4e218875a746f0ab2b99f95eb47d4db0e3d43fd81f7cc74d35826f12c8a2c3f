'use strict';

var middlewareEventstream = require('@aws-sdk/middleware-eventstream');
var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var middlewareWebsocket = require('@aws-sdk/middleware-websocket');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var schema = require('@smithy/core/schema');
var eventstreamSerdeConfigResolver = require('@smithy/eventstream-serde-config-resolver');
var middlewareContentLength = require('@smithy/middleware-content-length');
var middlewareEndpoint = require('@smithy/middleware-endpoint');
var middlewareRetry = require('@smithy/middleware-retry');
var smithyClient = require('@smithy/smithy-client');
var httpAuthSchemeProvider = require('./auth/httpAuthSchemeProvider');
var runtimeConfig = require('./runtimeConfig');
var regionConfigResolver = require('@aws-sdk/region-config-resolver');
var protocolHttp = require('@smithy/protocol-http');
var schemas_0 = require('./schemas/schemas_0');
var errors = require('./models/errors');
var BedrockRuntimeServiceException = require('./models/BedrockRuntimeServiceException');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "bedrock",
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
    let _token = runtimeConfig.token;
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
        setToken(token) {
            _token = token;
        },
        token() {
            return _token;
        },
    };
};
const resolveHttpAuthRuntimeConfig = (config) => {
    return {
        httpAuthSchemes: config.httpAuthSchemes(),
        httpAuthSchemeProvider: config.httpAuthSchemeProvider(),
        credentials: config.credentials(),
        token: config.token(),
    };
};

const resolveRuntimeExtensions = (runtimeConfig, extensions) => {
    const extensionConfiguration = Object.assign(regionConfigResolver.getAwsRegionExtensionConfiguration(runtimeConfig), smithyClient.getDefaultExtensionConfiguration(runtimeConfig), protocolHttp.getHttpHandlerExtensionConfiguration(runtimeConfig), getHttpAuthExtensionConfiguration(runtimeConfig));
    extensions.forEach((extension) => extension.configure(extensionConfiguration));
    return Object.assign(runtimeConfig, regionConfigResolver.resolveAwsRegionExtensionConfiguration(extensionConfiguration), smithyClient.resolveDefaultRuntimeConfig(extensionConfiguration), protocolHttp.resolveHttpHandlerRuntimeConfig(extensionConfiguration), resolveHttpAuthRuntimeConfig(extensionConfiguration));
};

class BedrockRuntimeClient extends smithyClient.Client {
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
        const _config_7 = eventstreamSerdeConfigResolver.resolveEventStreamSerdeConfig(_config_6);
        const _config_8 = httpAuthSchemeProvider.resolveHttpAuthSchemeConfig(_config_7);
        const _config_9 = middlewareEventstream.resolveEventStreamConfig(_config_8);
        const _config_10 = middlewareWebsocket.resolveWebSocketConfig(_config_9);
        const _config_11 = resolveRuntimeExtensions(_config_10, configuration?.extensions || []);
        this.config = _config_11;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultBedrockRuntimeHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
                "smithy.api#httpBearerAuth": config.token,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class ApplyGuardrailCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ApplyGuardrail", {})
    .n("BedrockRuntimeClient", "ApplyGuardrailCommand")
    .sc(schemas_0.ApplyGuardrail$)
    .build() {
}

class ConverseCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "Converse", {})
    .n("BedrockRuntimeClient", "ConverseCommand")
    .sc(schemas_0.Converse$)
    .build() {
}

class ConverseStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ConverseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "ConverseStreamCommand")
    .sc(schemas_0.ConverseStream$)
    .build() {
}

class CountTokensCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "CountTokens", {})
    .n("BedrockRuntimeClient", "CountTokensCommand")
    .sc(schemas_0.CountTokens$)
    .build() {
}

class GetAsyncInvokeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "GetAsyncInvoke", {})
    .n("BedrockRuntimeClient", "GetAsyncInvokeCommand")
    .sc(schemas_0.GetAsyncInvoke$)
    .build() {
}

class InvokeModelCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModel", {})
    .n("BedrockRuntimeClient", "InvokeModelCommand")
    .sc(schemas_0.InvokeModel$)
    .build() {
}

class InvokeModelWithBidirectionalStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [
        middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions()),
        middlewareEventstream.getEventStreamPlugin(config),
        middlewareWebsocket.getWebSocketPlugin(config, {
            headerPrefix: 'x-amz-bedrock-',
        }),
    ];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithBidirectionalStream", {
    eventStream: {
        input: true,
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithBidirectionalStreamCommand")
    .sc(schemas_0.InvokeModelWithBidirectionalStream$)
    .build() {
}

class InvokeModelWithResponseStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "InvokeModelWithResponseStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockRuntimeClient", "InvokeModelWithResponseStreamCommand")
    .sc(schemas_0.InvokeModelWithResponseStream$)
    .build() {
}

class ListAsyncInvokesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "ListAsyncInvokes", {})
    .n("BedrockRuntimeClient", "ListAsyncInvokesCommand")
    .sc(schemas_0.ListAsyncInvokes$)
    .build() {
}

class StartAsyncInvokeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockFrontendService", "StartAsyncInvoke", {})
    .n("BedrockRuntimeClient", "StartAsyncInvokeCommand")
    .sc(schemas_0.StartAsyncInvoke$)
    .build() {
}

const paginateListAsyncInvokes = core.createPaginator(BedrockRuntimeClient, ListAsyncInvokesCommand, "nextToken", "nextToken", "maxResults");

const commands = {
    ApplyGuardrailCommand,
    ConverseCommand,
    ConverseStreamCommand,
    CountTokensCommand,
    GetAsyncInvokeCommand,
    InvokeModelCommand,
    InvokeModelWithBidirectionalStreamCommand,
    InvokeModelWithResponseStreamCommand,
    ListAsyncInvokesCommand,
    StartAsyncInvokeCommand,
};
const paginators = {
    paginateListAsyncInvokes,
};
class BedrockRuntime extends BedrockRuntimeClient {
}
smithyClient.createAggregatedClient(commands, BedrockRuntime, { paginators });

const AsyncInvokeStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
};
const SortAsyncInvocationBy = {
    SUBMISSION_TIME: "SubmissionTime",
};
const SortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const GuardrailImageFormat = {
    JPEG: "jpeg",
    PNG: "png",
};
const GuardrailContentQualifier = {
    GROUNDING_SOURCE: "grounding_source",
    GUARD_CONTENT: "guard_content",
    QUERY: "query",
};
const GuardrailOutputScope = {
    FULL: "FULL",
    INTERVENTIONS: "INTERVENTIONS",
};
const GuardrailContentSource = {
    INPUT: "INPUT",
    OUTPUT: "OUTPUT",
};
const GuardrailAction = {
    GUARDRAIL_INTERVENED: "GUARDRAIL_INTERVENED",
    NONE: "NONE",
};
const GuardrailOrigin = {
    ACCOUNT_ENFORCED: "ACCOUNT_ENFORCED",
    ORGANIZATION_ENFORCED: "ORGANIZATION_ENFORCED",
    REQUEST: "REQUEST",
};
const GuardrailOwnership = {
    CROSS_ACCOUNT: "CROSS_ACCOUNT",
    SELF: "SELF",
};
const GuardrailAutomatedReasoningLogicWarningType = {
    ALWAYS_FALSE: "ALWAYS_FALSE",
    ALWAYS_TRUE: "ALWAYS_TRUE",
};
const GuardrailContentPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailContentFilterConfidence = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
const GuardrailContentFilterStrength = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NONE: "NONE",
};
const GuardrailContentFilterType = {
    HATE: "HATE",
    INSULTS: "INSULTS",
    MISCONDUCT: "MISCONDUCT",
    PROMPT_ATTACK: "PROMPT_ATTACK",
    SEXUAL: "SEXUAL",
    VIOLENCE: "VIOLENCE",
};
const GuardrailContextualGroundingPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailContextualGroundingFilterType = {
    GROUNDING: "GROUNDING",
    RELEVANCE: "RELEVANCE",
};
const GuardrailSensitiveInformationPolicyAction = {
    ANONYMIZED: "ANONYMIZED",
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailPiiEntityType = {
    ADDRESS: "ADDRESS",
    AGE: "AGE",
    AWS_ACCESS_KEY: "AWS_ACCESS_KEY",
    AWS_SECRET_KEY: "AWS_SECRET_KEY",
    CA_HEALTH_NUMBER: "CA_HEALTH_NUMBER",
    CA_SOCIAL_INSURANCE_NUMBER: "CA_SOCIAL_INSURANCE_NUMBER",
    CREDIT_DEBIT_CARD_CVV: "CREDIT_DEBIT_CARD_CVV",
    CREDIT_DEBIT_CARD_EXPIRY: "CREDIT_DEBIT_CARD_EXPIRY",
    CREDIT_DEBIT_CARD_NUMBER: "CREDIT_DEBIT_CARD_NUMBER",
    DRIVER_ID: "DRIVER_ID",
    EMAIL: "EMAIL",
    INTERNATIONAL_BANK_ACCOUNT_NUMBER: "INTERNATIONAL_BANK_ACCOUNT_NUMBER",
    IP_ADDRESS: "IP_ADDRESS",
    LICENSE_PLATE: "LICENSE_PLATE",
    MAC_ADDRESS: "MAC_ADDRESS",
    NAME: "NAME",
    PASSWORD: "PASSWORD",
    PHONE: "PHONE",
    PIN: "PIN",
    SWIFT_CODE: "SWIFT_CODE",
    UK_NATIONAL_HEALTH_SERVICE_NUMBER: "UK_NATIONAL_HEALTH_SERVICE_NUMBER",
    UK_NATIONAL_INSURANCE_NUMBER: "UK_NATIONAL_INSURANCE_NUMBER",
    UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER: "UK_UNIQUE_TAXPAYER_REFERENCE_NUMBER",
    URL: "URL",
    USERNAME: "USERNAME",
    US_BANK_ACCOUNT_NUMBER: "US_BANK_ACCOUNT_NUMBER",
    US_BANK_ROUTING_NUMBER: "US_BANK_ROUTING_NUMBER",
    US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER: "US_INDIVIDUAL_TAX_IDENTIFICATION_NUMBER",
    US_PASSPORT_NUMBER: "US_PASSPORT_NUMBER",
    US_SOCIAL_SECURITY_NUMBER: "US_SOCIAL_SECURITY_NUMBER",
    VEHICLE_IDENTIFICATION_NUMBER: "VEHICLE_IDENTIFICATION_NUMBER",
};
const GuardrailTopicPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailTopicType = {
    DENY: "DENY",
};
const GuardrailWordPolicyAction = {
    BLOCKED: "BLOCKED",
    NONE: "NONE",
};
const GuardrailManagedWordType = {
    PROFANITY: "PROFANITY",
};
const GuardrailTrace = {
    DISABLED: "disabled",
    ENABLED: "enabled",
    ENABLED_FULL: "enabled_full",
};
const AudioFormat = {
    AAC: "aac",
    FLAC: "flac",
    M4A: "m4a",
    MKA: "mka",
    MKV: "mkv",
    MP3: "mp3",
    MP4: "mp4",
    MPEG: "mpeg",
    MPGA: "mpga",
    OGG: "ogg",
    OPUS: "opus",
    PCM: "pcm",
    WAV: "wav",
    WEBM: "webm",
    X_AAC: "x-aac",
};
const CacheTTL = {
    FIVE_MINUTES: "5m",
    ONE_HOUR: "1h",
};
const CachePointType = {
    DEFAULT: "default",
};
const DocumentFormat = {
    CSV: "csv",
    DOC: "doc",
    DOCX: "docx",
    HTML: "html",
    MD: "md",
    PDF: "pdf",
    TXT: "txt",
    XLS: "xls",
    XLSX: "xlsx",
};
const GuardrailConverseImageFormat = {
    JPEG: "jpeg",
    PNG: "png",
};
const GuardrailConverseContentQualifier = {
    GROUNDING_SOURCE: "grounding_source",
    GUARD_CONTENT: "guard_content",
    QUERY: "query",
};
const ImageFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};
const VideoFormat = {
    FLV: "flv",
    MKV: "mkv",
    MOV: "mov",
    MP4: "mp4",
    MPEG: "mpeg",
    MPG: "mpg",
    THREE_GP: "three_gp",
    WEBM: "webm",
    WMV: "wmv",
};
const ToolResultStatus = {
    ERROR: "error",
    SUCCESS: "success",
};
const ToolUseType = {
    SERVER_TOOL_USE: "server_tool_use",
};
const ConversationRole = {
    ASSISTANT: "assistant",
    USER: "user",
};
const OutputFormatType = {
    JSON_SCHEMA: "json_schema",
};
const PerformanceConfigLatency = {
    OPTIMIZED: "optimized",
    STANDARD: "standard",
};
const ServiceTierType = {
    DEFAULT: "default",
    FLEX: "flex",
    PRIORITY: "priority",
    RESERVED: "reserved",
};
const StopReason = {
    CONTENT_FILTERED: "content_filtered",
    END_TURN: "end_turn",
    GUARDRAIL_INTERVENED: "guardrail_intervened",
    MALFORMED_MODEL_OUTPUT: "malformed_model_output",
    MALFORMED_TOOL_USE: "malformed_tool_use",
    MAX_TOKENS: "max_tokens",
    MODEL_CONTEXT_WINDOW_EXCEEDED: "model_context_window_exceeded",
    STOP_SEQUENCE: "stop_sequence",
    TOOL_USE: "tool_use",
};
const GuardrailStreamProcessingMode = {
    ASYNC: "async",
    SYNC: "sync",
};
const Trace = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
    ENABLED_FULL: "ENABLED_FULL",
};

exports.$Command = smithyClient.Command;
exports.__Client = smithyClient.Client;
exports.BedrockRuntimeServiceException = BedrockRuntimeServiceException.BedrockRuntimeServiceException;
exports.ApplyGuardrailCommand = ApplyGuardrailCommand;
exports.AsyncInvokeStatus = AsyncInvokeStatus;
exports.AudioFormat = AudioFormat;
exports.BedrockRuntime = BedrockRuntime;
exports.BedrockRuntimeClient = BedrockRuntimeClient;
exports.CachePointType = CachePointType;
exports.CacheTTL = CacheTTL;
exports.ConversationRole = ConversationRole;
exports.ConverseCommand = ConverseCommand;
exports.ConverseStreamCommand = ConverseStreamCommand;
exports.CountTokensCommand = CountTokensCommand;
exports.DocumentFormat = DocumentFormat;
exports.GetAsyncInvokeCommand = GetAsyncInvokeCommand;
exports.GuardrailAction = GuardrailAction;
exports.GuardrailAutomatedReasoningLogicWarningType = GuardrailAutomatedReasoningLogicWarningType;
exports.GuardrailContentFilterConfidence = GuardrailContentFilterConfidence;
exports.GuardrailContentFilterStrength = GuardrailContentFilterStrength;
exports.GuardrailContentFilterType = GuardrailContentFilterType;
exports.GuardrailContentPolicyAction = GuardrailContentPolicyAction;
exports.GuardrailContentQualifier = GuardrailContentQualifier;
exports.GuardrailContentSource = GuardrailContentSource;
exports.GuardrailContextualGroundingFilterType = GuardrailContextualGroundingFilterType;
exports.GuardrailContextualGroundingPolicyAction = GuardrailContextualGroundingPolicyAction;
exports.GuardrailConverseContentQualifier = GuardrailConverseContentQualifier;
exports.GuardrailConverseImageFormat = GuardrailConverseImageFormat;
exports.GuardrailImageFormat = GuardrailImageFormat;
exports.GuardrailManagedWordType = GuardrailManagedWordType;
exports.GuardrailOrigin = GuardrailOrigin;
exports.GuardrailOutputScope = GuardrailOutputScope;
exports.GuardrailOwnership = GuardrailOwnership;
exports.GuardrailPiiEntityType = GuardrailPiiEntityType;
exports.GuardrailSensitiveInformationPolicyAction = GuardrailSensitiveInformationPolicyAction;
exports.GuardrailStreamProcessingMode = GuardrailStreamProcessingMode;
exports.GuardrailTopicPolicyAction = GuardrailTopicPolicyAction;
exports.GuardrailTopicType = GuardrailTopicType;
exports.GuardrailTrace = GuardrailTrace;
exports.GuardrailWordPolicyAction = GuardrailWordPolicyAction;
exports.ImageFormat = ImageFormat;
exports.InvokeModelCommand = InvokeModelCommand;
exports.InvokeModelWithBidirectionalStreamCommand = InvokeModelWithBidirectionalStreamCommand;
exports.InvokeModelWithResponseStreamCommand = InvokeModelWithResponseStreamCommand;
exports.ListAsyncInvokesCommand = ListAsyncInvokesCommand;
exports.OutputFormatType = OutputFormatType;
exports.PerformanceConfigLatency = PerformanceConfigLatency;
exports.ServiceTierType = ServiceTierType;
exports.SortAsyncInvocationBy = SortAsyncInvocationBy;
exports.SortOrder = SortOrder;
exports.StartAsyncInvokeCommand = StartAsyncInvokeCommand;
exports.StopReason = StopReason;
exports.ToolResultStatus = ToolResultStatus;
exports.ToolUseType = ToolUseType;
exports.Trace = Trace;
exports.VideoFormat = VideoFormat;
exports.paginateListAsyncInvokes = paginateListAsyncInvokes;
Object.prototype.hasOwnProperty.call(schemas_0, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: schemas_0['__proto__']
    });

Object.keys(schemas_0).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = schemas_0[k];
});
Object.prototype.hasOwnProperty.call(errors, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(exports, '__proto__') &&
    Object.defineProperty(exports, '__proto__', {
        enumerable: true,
        value: errors['__proto__']
    });

Object.keys(errors).forEach(function (k) {
    if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) exports[k] = errors[k];
});
