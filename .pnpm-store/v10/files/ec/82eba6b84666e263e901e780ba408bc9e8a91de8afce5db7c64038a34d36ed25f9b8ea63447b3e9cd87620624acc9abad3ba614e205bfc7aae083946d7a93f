'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
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
var BedrockAgentRuntimeServiceException = require('./models/BedrockAgentRuntimeServiceException');

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

class BedrockAgentRuntimeClient extends smithyClient.Client {
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
        const _config_9 = resolveRuntimeExtensions(_config_8, configuration?.extensions || []);
        this.config = _config_9;
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultBedrockAgentRuntimeHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (config) => new core.DefaultIdentityProviderConfig({
                "aws.auth#sigv4": config.credentials,
            }),
        }));
        this.middlewareStack.use(core.getHttpSigningPlugin(this.config));
    }
    destroy() {
        super.destroy();
    }
}

class CreateInvocationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "CreateInvocation", {})
    .n("BedrockAgentRuntimeClient", "CreateInvocationCommand")
    .sc(schemas_0.CreateInvocation$)
    .build() {
}

class CreateSessionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "CreateSession", {})
    .n("BedrockAgentRuntimeClient", "CreateSessionCommand")
    .sc(schemas_0.CreateSession$)
    .build() {
}

class DeleteAgentMemoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "DeleteAgentMemory", {})
    .n("BedrockAgentRuntimeClient", "DeleteAgentMemoryCommand")
    .sc(schemas_0.DeleteAgentMemory$)
    .build() {
}

class DeleteSessionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "DeleteSession", {})
    .n("BedrockAgentRuntimeClient", "DeleteSessionCommand")
    .sc(schemas_0.DeleteSession$)
    .build() {
}

class EndSessionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "EndSession", {})
    .n("BedrockAgentRuntimeClient", "EndSessionCommand")
    .sc(schemas_0.EndSession$)
    .build() {
}

class GenerateQueryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GenerateQuery", {})
    .n("BedrockAgentRuntimeClient", "GenerateQueryCommand")
    .sc(schemas_0.GenerateQuery$)
    .build() {
}

class GetAgentMemoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetAgentMemory", {})
    .n("BedrockAgentRuntimeClient", "GetAgentMemoryCommand")
    .sc(schemas_0.GetAgentMemory$)
    .build() {
}

class GetExecutionFlowSnapshotCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetExecutionFlowSnapshot", {})
    .n("BedrockAgentRuntimeClient", "GetExecutionFlowSnapshotCommand")
    .sc(schemas_0.GetExecutionFlowSnapshot$)
    .build() {
}

class GetFlowExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetFlowExecution", {})
    .n("BedrockAgentRuntimeClient", "GetFlowExecutionCommand")
    .sc(schemas_0.GetFlowExecution$)
    .build() {
}

class GetInvocationStepCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetInvocationStep", {})
    .n("BedrockAgentRuntimeClient", "GetInvocationStepCommand")
    .sc(schemas_0.GetInvocationStep$)
    .build() {
}

class GetSessionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "GetSession", {})
    .n("BedrockAgentRuntimeClient", "GetSessionCommand")
    .sc(schemas_0.GetSession$)
    .build() {
}

class InvokeAgentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeAgent", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeAgentCommand")
    .sc(schemas_0.InvokeAgent$)
    .build() {
}

class InvokeFlowCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeFlow", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeFlowCommand")
    .sc(schemas_0.InvokeFlow$)
    .build() {
}

class InvokeInlineAgentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "InvokeInlineAgent", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "InvokeInlineAgentCommand")
    .sc(schemas_0.InvokeInlineAgent$)
    .build() {
}

class ListFlowExecutionEventsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListFlowExecutionEvents", {})
    .n("BedrockAgentRuntimeClient", "ListFlowExecutionEventsCommand")
    .sc(schemas_0.ListFlowExecutionEvents$)
    .build() {
}

class ListFlowExecutionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListFlowExecutions", {})
    .n("BedrockAgentRuntimeClient", "ListFlowExecutionsCommand")
    .sc(schemas_0.ListFlowExecutions$)
    .build() {
}

class ListInvocationsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListInvocations", {})
    .n("BedrockAgentRuntimeClient", "ListInvocationsCommand")
    .sc(schemas_0.ListInvocations$)
    .build() {
}

class ListInvocationStepsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListInvocationSteps", {})
    .n("BedrockAgentRuntimeClient", "ListInvocationStepsCommand")
    .sc(schemas_0.ListInvocationSteps$)
    .build() {
}

class ListSessionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListSessions", {})
    .n("BedrockAgentRuntimeClient", "ListSessionsCommand")
    .sc(schemas_0.ListSessions$)
    .build() {
}

class ListTagsForResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "ListTagsForResource", {})
    .n("BedrockAgentRuntimeClient", "ListTagsForResourceCommand")
    .sc(schemas_0.ListTagsForResource$)
    .build() {
}

class OptimizePromptCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "OptimizePrompt", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "OptimizePromptCommand")
    .sc(schemas_0.OptimizePrompt$)
    .build() {
}

class PutInvocationStepCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "PutInvocationStep", {})
    .n("BedrockAgentRuntimeClient", "PutInvocationStepCommand")
    .sc(schemas_0.PutInvocationStep$)
    .build() {
}

class RerankCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "Rerank", {})
    .n("BedrockAgentRuntimeClient", "RerankCommand")
    .sc(schemas_0.Rerank$)
    .build() {
}

class RetrieveAndGenerateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "RetrieveAndGenerate", {})
    .n("BedrockAgentRuntimeClient", "RetrieveAndGenerateCommand")
    .sc(schemas_0.RetrieveAndGenerate$)
    .build() {
}

class RetrieveAndGenerateStreamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "RetrieveAndGenerateStream", {
    eventStream: {
        output: true,
    },
})
    .n("BedrockAgentRuntimeClient", "RetrieveAndGenerateStreamCommand")
    .sc(schemas_0.RetrieveAndGenerateStream$)
    .build() {
}

class RetrieveCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "Retrieve", {})
    .n("BedrockAgentRuntimeClient", "RetrieveCommand")
    .sc(schemas_0.Retrieve$)
    .build() {
}

class StartFlowExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "StartFlowExecution", {})
    .n("BedrockAgentRuntimeClient", "StartFlowExecutionCommand")
    .sc(schemas_0.StartFlowExecution$)
    .build() {
}

class StopFlowExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "StopFlowExecution", {})
    .n("BedrockAgentRuntimeClient", "StopFlowExecutionCommand")
    .sc(schemas_0.StopFlowExecution$)
    .build() {
}

class TagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "TagResource", {})
    .n("BedrockAgentRuntimeClient", "TagResourceCommand")
    .sc(schemas_0.TagResource$)
    .build() {
}

class UntagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "UntagResource", {})
    .n("BedrockAgentRuntimeClient", "UntagResourceCommand")
    .sc(schemas_0.UntagResource$)
    .build() {
}

class UpdateSessionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AmazonBedrockAgentRunTimeService", "UpdateSession", {})
    .n("BedrockAgentRuntimeClient", "UpdateSessionCommand")
    .sc(schemas_0.UpdateSession$)
    .build() {
}

const paginateGetAgentMemory = core.createPaginator(BedrockAgentRuntimeClient, GetAgentMemoryCommand, "nextToken", "nextToken", "maxItems");

const paginateListFlowExecutionEvents = core.createPaginator(BedrockAgentRuntimeClient, ListFlowExecutionEventsCommand, "nextToken", "nextToken", "maxResults");

const paginateListFlowExecutions = core.createPaginator(BedrockAgentRuntimeClient, ListFlowExecutionsCommand, "nextToken", "nextToken", "maxResults");

const paginateListInvocations = core.createPaginator(BedrockAgentRuntimeClient, ListInvocationsCommand, "nextToken", "nextToken", "maxResults");

const paginateListInvocationSteps = core.createPaginator(BedrockAgentRuntimeClient, ListInvocationStepsCommand, "nextToken", "nextToken", "maxResults");

const paginateListSessions = core.createPaginator(BedrockAgentRuntimeClient, ListSessionsCommand, "nextToken", "nextToken", "maxResults");

const paginateRerank = core.createPaginator(BedrockAgentRuntimeClient, RerankCommand, "nextToken", "nextToken", "");

const paginateRetrieve = core.createPaginator(BedrockAgentRuntimeClient, RetrieveCommand, "nextToken", "nextToken", "");

const commands = {
    CreateInvocationCommand,
    CreateSessionCommand,
    DeleteAgentMemoryCommand,
    DeleteSessionCommand,
    EndSessionCommand,
    GenerateQueryCommand,
    GetAgentMemoryCommand,
    GetExecutionFlowSnapshotCommand,
    GetFlowExecutionCommand,
    GetInvocationStepCommand,
    GetSessionCommand,
    InvokeAgentCommand,
    InvokeFlowCommand,
    InvokeInlineAgentCommand,
    ListFlowExecutionEventsCommand,
    ListFlowExecutionsCommand,
    ListInvocationsCommand,
    ListInvocationStepsCommand,
    ListSessionsCommand,
    ListTagsForResourceCommand,
    OptimizePromptCommand,
    PutInvocationStepCommand,
    RerankCommand,
    RetrieveCommand,
    RetrieveAndGenerateCommand,
    RetrieveAndGenerateStreamCommand,
    StartFlowExecutionCommand,
    StopFlowExecutionCommand,
    TagResourceCommand,
    UntagResourceCommand,
    UpdateSessionCommand,
};
const paginators = {
    paginateGetAgentMemory,
    paginateListFlowExecutionEvents,
    paginateListFlowExecutions,
    paginateListInvocations,
    paginateListInvocationSteps,
    paginateListSessions,
    paginateRerank,
    paginateRetrieve,
};
class BedrockAgentRuntime extends BedrockAgentRuntimeClient {
}
smithyClient.createAggregatedClient(commands, BedrockAgentRuntime, { paginators });

const CustomControlMethod = {
    RETURN_CONTROL: "RETURN_CONTROL",
};
const ExecutionType = {
    LAMBDA: "LAMBDA",
    RETURN_CONTROL: "RETURN_CONTROL",
};
const ActionGroupSignature = {
    AMAZON_CODEINTERPRETER: "AMAZON.CodeInterpreter",
    AMAZON_USERINPUT: "AMAZON.UserInput",
    ANTHROPIC_BASH: "ANTHROPIC.Bash",
    ANTHROPIC_COMPUTER: "ANTHROPIC.Computer",
    ANTHROPIC_TEXTEDITOR: "ANTHROPIC.TextEditor",
};
const ActionInvocationType = {
    RESULT: "RESULT",
    USER_CONFIRMATION: "USER_CONFIRMATION",
    USER_CONFIRMATION_AND_RESULT: "USER_CONFIRMATION_AND_RESULT",
};
const ParameterType = {
    ARRAY: "array",
    BOOLEAN: "boolean",
    INTEGER: "integer",
    NUMBER: "number",
    STRING: "string",
};
const RequireConfirmation = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
const AgentCollaboration = {
    DISABLED: "DISABLED",
    SUPERVISOR: "SUPERVISOR",
    SUPERVISOR_ROUTER: "SUPERVISOR_ROUTER",
};
const ConfirmationState = {
    CONFIRM: "CONFIRM",
    DENY: "DENY",
};
const ImageInputFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};
const ResponseState = {
    FAILURE: "FAILURE",
    REPROMPT: "REPROMPT",
};
const PayloadType = {
    RETURN_CONTROL: "RETURN_CONTROL",
    TEXT: "TEXT",
};
const GuardrailAction = {
    INTERVENED: "INTERVENED",
    NONE: "NONE",
};
const GuardrailContentPolicyAction = {
    BLOCKED: "BLOCKED",
};
const GuardrailContentFilterConfidence = {
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
const GuardrailSensitiveInformationPolicyAction = {
    ANONYMIZED: "ANONYMIZED",
    BLOCKED: "BLOCKED",
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
};
const GuardrailTopicType = {
    DENY: "DENY",
};
const GuardrailWordPolicyAction = {
    BLOCKED: "BLOCKED",
};
const GuardrailManagedWordType = {
    PROFANITY: "PROFANITY",
};
const InvocationType = {
    ACTION_GROUP: "ACTION_GROUP",
    ACTION_GROUP_CODE_INTERPRETER: "ACTION_GROUP_CODE_INTERPRETER",
    AGENT_COLLABORATOR: "AGENT_COLLABORATOR",
    FINISH: "FINISH",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
};
const CreationMode = {
    DEFAULT: "DEFAULT",
    OVERRIDDEN: "OVERRIDDEN",
};
const PromptType = {
    KNOWLEDGE_BASE_RESPONSE_GENERATION: "KNOWLEDGE_BASE_RESPONSE_GENERATION",
    ORCHESTRATION: "ORCHESTRATION",
    POST_PROCESSING: "POST_PROCESSING",
    PRE_PROCESSING: "PRE_PROCESSING",
    ROUTING_CLASSIFIER: "ROUTING_CLASSIFIER",
};
const RetrievalResultContentColumnType = {
    BLOB: "BLOB",
    BOOLEAN: "BOOLEAN",
    DOUBLE: "DOUBLE",
    LONG: "LONG",
    NULL: "NULL",
    STRING: "STRING",
};
const RetrievalResultContentType = {
    AUDIO: "AUDIO",
    IMAGE: "IMAGE",
    ROW: "ROW",
    TEXT: "TEXT",
    VIDEO: "VIDEO",
};
const RetrievalResultLocationType = {
    CONFLUENCE: "CONFLUENCE",
    CUSTOM: "CUSTOM",
    KENDRA: "KENDRA",
    S3: "S3",
    SALESFORCE: "SALESFORCE",
    SHAREPOINT: "SHAREPOINT",
    SQL: "SQL",
    WEB: "WEB",
};
const Source = {
    ACTION_GROUP: "ACTION_GROUP",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
    PARSER: "PARSER",
};
const Type = {
    ACTION_GROUP: "ACTION_GROUP",
    AGENT_COLLABORATOR: "AGENT_COLLABORATOR",
    ASK_USER: "ASK_USER",
    FINISH: "FINISH",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
    REPROMPT: "REPROMPT",
};
const FlowExecutionErrorType = {
    TIMED_OUT: "ExecutionTimedOut",
};
const FlowExecutionStatus = {
    ABORTED: "Aborted",
    FAILED: "Failed",
    RUNNING: "Running",
    SUCCEEDED: "Succeeded",
    TIMED_OUT: "TimedOut",
};
const FlowExecutionEventType = {
    FLOW: "Flow",
    NODE: "Node",
};
const FlowErrorCode = {
    INTERNAL_SERVER: "INTERNAL_SERVER",
    NODE_EXECUTION_FAILED: "NODE_EXECUTION_FAILED",
    VALIDATION: "VALIDATION",
};
const NodeErrorCode = {
    BAD_GATEWAY: "BAD_GATEWAY",
    DEPENDENCY_FAILED: "DEPENDENCY_FAILED",
    INTERNAL_SERVER: "INTERNAL_SERVER",
    VALIDATION: "VALIDATION",
};
const FlowNodeInputCategory = {
    EXIT_LOOP: "ExitLoop",
    LOOP_CONDITION: "LoopCondition",
    RETURN_VALUE_TO_LOOP_START: "ReturnValueToLoopStart",
};
const FlowControlNodeType = {
    ITERATOR: "Iterator",
    LOOP: "Loop",
};
const FlowNodeIODataType = {
    ARRAY: "Array",
    BOOLEAN: "Boolean",
    NUMBER: "Number",
    OBJECT: "Object",
    STRING: "String",
};
const PerformanceConfigLatency = {
    OPTIMIZED: "optimized",
    STANDARD: "standard",
};
const FlowCompletionReason = {
    INPUT_REQUIRED: "INPUT_REQUIRED",
    SUCCESS: "SUCCESS",
};
const NodeType = {
    CONDITION_NODE: "ConditionNode",
    FLOW_INPUT_NODE: "FlowInputNode",
    FLOW_OUTPUT_NODE: "FlowOutputNode",
    KNOWLEDGE_BASE_NODE: "KnowledgeBaseNode",
    LAMBDA_FUNCTION_NODE: "LambdaFunctionNode",
    LEX_NODE: "LexNode",
    PROMPT_NODE: "PromptNode",
};
const InputQueryType = {
    TEXT: "TEXT",
};
const QueryTransformationMode = {
    TEXT_TO_SQL: "TEXT_TO_SQL",
};
const TextToSqlConfigurationType = {
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
};
const GeneratedQueryType = {
    REDSHIFT_SQL: "REDSHIFT_SQL",
};
const ConversationRole = {
    ASSISTANT: "assistant",
    USER: "user",
};
const FileSourceType = {
    BYTE_CONTENT: "BYTE_CONTENT",
    S3: "S3",
};
const FileUseCase = {
    CHAT: "CHAT",
    CODE_INTERPRETER: "CODE_INTERPRETER",
};
const AttributeType = {
    BOOLEAN: "BOOLEAN",
    NUMBER: "NUMBER",
    STRING: "STRING",
    STRING_LIST: "STRING_LIST",
};
const SearchType = {
    HYBRID: "HYBRID",
    SEMANTIC: "SEMANTIC",
};
const RerankingMetadataSelectionMode = {
    ALL: "ALL",
    SELECTIVE: "SELECTIVE",
};
const VectorSearchRerankingConfigurationType = {
    BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL",
};
const RelayConversationHistory = {
    DISABLED: "DISABLED",
    TO_COLLABORATOR: "TO_COLLABORATOR",
};
const PromptState = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
const OrchestrationType = {
    CUSTOM_ORCHESTRATION: "CUSTOM_ORCHESTRATION",
    DEFAULT: "DEFAULT",
};
const MemoryType = {
    SESSION_SUMMARY: "SESSION_SUMMARY",
};
const RerankQueryContentType = {
    TEXT: "TEXT",
};
const RerankingConfigurationType = {
    BEDROCK_RERANKING_MODEL: "BEDROCK_RERANKING_MODEL",
};
const RerankDocumentType = {
    JSON: "JSON",
    TEXT: "TEXT",
};
const RerankSourceType = {
    INLINE: "INLINE",
};
const ExternalSourceType = {
    BYTE_CONTENT: "BYTE_CONTENT",
    S3: "S3",
};
const QueryTransformationType = {
    QUERY_DECOMPOSITION: "QUERY_DECOMPOSITION",
};
const RetrieveAndGenerateType = {
    EXTERNAL_SOURCES: "EXTERNAL_SOURCES",
    KNOWLEDGE_BASE: "KNOWLEDGE_BASE",
};
const GuadrailAction = {
    INTERVENED: "INTERVENED",
    NONE: "NONE",
};
const InputImageFormat = {
    gif: "gif",
    jpeg: "jpeg",
    png: "png",
    webp: "webp",
};
const KnowledgeBaseQueryType = {
    IMAGE: "IMAGE",
    TEXT: "TEXT",
};
const SessionStatus = {
    ACTIVE: "ACTIVE",
    ENDED: "ENDED",
    EXPIRED: "EXPIRED",
};
const ImageFormat = {
    GIF: "gif",
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
};

exports.$Command = smithyClient.Command;
exports.__Client = smithyClient.Client;
exports.BedrockAgentRuntimeServiceException = BedrockAgentRuntimeServiceException.BedrockAgentRuntimeServiceException;
exports.ActionGroupSignature = ActionGroupSignature;
exports.ActionInvocationType = ActionInvocationType;
exports.AgentCollaboration = AgentCollaboration;
exports.AttributeType = AttributeType;
exports.BedrockAgentRuntime = BedrockAgentRuntime;
exports.BedrockAgentRuntimeClient = BedrockAgentRuntimeClient;
exports.ConfirmationState = ConfirmationState;
exports.ConversationRole = ConversationRole;
exports.CreateInvocationCommand = CreateInvocationCommand;
exports.CreateSessionCommand = CreateSessionCommand;
exports.CreationMode = CreationMode;
exports.CustomControlMethod = CustomControlMethod;
exports.DeleteAgentMemoryCommand = DeleteAgentMemoryCommand;
exports.DeleteSessionCommand = DeleteSessionCommand;
exports.EndSessionCommand = EndSessionCommand;
exports.ExecutionType = ExecutionType;
exports.ExternalSourceType = ExternalSourceType;
exports.FileSourceType = FileSourceType;
exports.FileUseCase = FileUseCase;
exports.FlowCompletionReason = FlowCompletionReason;
exports.FlowControlNodeType = FlowControlNodeType;
exports.FlowErrorCode = FlowErrorCode;
exports.FlowExecutionErrorType = FlowExecutionErrorType;
exports.FlowExecutionEventType = FlowExecutionEventType;
exports.FlowExecutionStatus = FlowExecutionStatus;
exports.FlowNodeIODataType = FlowNodeIODataType;
exports.FlowNodeInputCategory = FlowNodeInputCategory;
exports.GenerateQueryCommand = GenerateQueryCommand;
exports.GeneratedQueryType = GeneratedQueryType;
exports.GetAgentMemoryCommand = GetAgentMemoryCommand;
exports.GetExecutionFlowSnapshotCommand = GetExecutionFlowSnapshotCommand;
exports.GetFlowExecutionCommand = GetFlowExecutionCommand;
exports.GetInvocationStepCommand = GetInvocationStepCommand;
exports.GetSessionCommand = GetSessionCommand;
exports.GuadrailAction = GuadrailAction;
exports.GuardrailAction = GuardrailAction;
exports.GuardrailContentFilterConfidence = GuardrailContentFilterConfidence;
exports.GuardrailContentFilterType = GuardrailContentFilterType;
exports.GuardrailContentPolicyAction = GuardrailContentPolicyAction;
exports.GuardrailManagedWordType = GuardrailManagedWordType;
exports.GuardrailPiiEntityType = GuardrailPiiEntityType;
exports.GuardrailSensitiveInformationPolicyAction = GuardrailSensitiveInformationPolicyAction;
exports.GuardrailTopicPolicyAction = GuardrailTopicPolicyAction;
exports.GuardrailTopicType = GuardrailTopicType;
exports.GuardrailWordPolicyAction = GuardrailWordPolicyAction;
exports.ImageFormat = ImageFormat;
exports.ImageInputFormat = ImageInputFormat;
exports.InputImageFormat = InputImageFormat;
exports.InputQueryType = InputQueryType;
exports.InvocationType = InvocationType;
exports.InvokeAgentCommand = InvokeAgentCommand;
exports.InvokeFlowCommand = InvokeFlowCommand;
exports.InvokeInlineAgentCommand = InvokeInlineAgentCommand;
exports.KnowledgeBaseQueryType = KnowledgeBaseQueryType;
exports.ListFlowExecutionEventsCommand = ListFlowExecutionEventsCommand;
exports.ListFlowExecutionsCommand = ListFlowExecutionsCommand;
exports.ListInvocationStepsCommand = ListInvocationStepsCommand;
exports.ListInvocationsCommand = ListInvocationsCommand;
exports.ListSessionsCommand = ListSessionsCommand;
exports.ListTagsForResourceCommand = ListTagsForResourceCommand;
exports.MemoryType = MemoryType;
exports.NodeErrorCode = NodeErrorCode;
exports.NodeType = NodeType;
exports.OptimizePromptCommand = OptimizePromptCommand;
exports.OrchestrationType = OrchestrationType;
exports.ParameterType = ParameterType;
exports.PayloadType = PayloadType;
exports.PerformanceConfigLatency = PerformanceConfigLatency;
exports.PromptState = PromptState;
exports.PromptType = PromptType;
exports.PutInvocationStepCommand = PutInvocationStepCommand;
exports.QueryTransformationMode = QueryTransformationMode;
exports.QueryTransformationType = QueryTransformationType;
exports.RelayConversationHistory = RelayConversationHistory;
exports.RequireConfirmation = RequireConfirmation;
exports.RerankCommand = RerankCommand;
exports.RerankDocumentType = RerankDocumentType;
exports.RerankQueryContentType = RerankQueryContentType;
exports.RerankSourceType = RerankSourceType;
exports.RerankingConfigurationType = RerankingConfigurationType;
exports.RerankingMetadataSelectionMode = RerankingMetadataSelectionMode;
exports.ResponseState = ResponseState;
exports.RetrievalResultContentColumnType = RetrievalResultContentColumnType;
exports.RetrievalResultContentType = RetrievalResultContentType;
exports.RetrievalResultLocationType = RetrievalResultLocationType;
exports.RetrieveAndGenerateCommand = RetrieveAndGenerateCommand;
exports.RetrieveAndGenerateStreamCommand = RetrieveAndGenerateStreamCommand;
exports.RetrieveAndGenerateType = RetrieveAndGenerateType;
exports.RetrieveCommand = RetrieveCommand;
exports.SearchType = SearchType;
exports.SessionStatus = SessionStatus;
exports.Source = Source;
exports.StartFlowExecutionCommand = StartFlowExecutionCommand;
exports.StopFlowExecutionCommand = StopFlowExecutionCommand;
exports.TagResourceCommand = TagResourceCommand;
exports.TextToSqlConfigurationType = TextToSqlConfigurationType;
exports.Type = Type;
exports.UntagResourceCommand = UntagResourceCommand;
exports.UpdateSessionCommand = UpdateSessionCommand;
exports.VectorSearchRerankingConfigurationType = VectorSearchRerankingConfigurationType;
exports.paginateGetAgentMemory = paginateGetAgentMemory;
exports.paginateListFlowExecutionEvents = paginateListFlowExecutionEvents;
exports.paginateListFlowExecutions = paginateListFlowExecutions;
exports.paginateListInvocationSteps = paginateListInvocationSteps;
exports.paginateListInvocations = paginateListInvocations;
exports.paginateListSessions = paginateListSessions;
exports.paginateRerank = paginateRerank;
exports.paginateRetrieve = paginateRetrieve;
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
