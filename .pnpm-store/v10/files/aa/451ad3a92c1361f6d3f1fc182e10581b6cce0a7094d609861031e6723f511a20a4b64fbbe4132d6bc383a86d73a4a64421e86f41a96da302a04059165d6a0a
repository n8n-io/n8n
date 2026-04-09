'use strict';

var middlewareHostHeader = require('@aws-sdk/middleware-host-header');
var middlewareLogger = require('@aws-sdk/middleware-logger');
var middlewareRecursionDetection = require('@aws-sdk/middleware-recursion-detection');
var middlewareUserAgent = require('@aws-sdk/middleware-user-agent');
var configResolver = require('@smithy/config-resolver');
var core = require('@smithy/core');
var schema = require('@smithy/core/schema');
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
var KendraServiceException = require('./models/KendraServiceException');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "kendra",
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

class KendraClient extends smithyClient.Client {
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
        this.middlewareStack.use(schema.getSchemaSerdePlugin(this.config));
        this.middlewareStack.use(middlewareUserAgent.getUserAgentPlugin(this.config));
        this.middlewareStack.use(middlewareRetry.getRetryPlugin(this.config));
        this.middlewareStack.use(middlewareContentLength.getContentLengthPlugin(this.config));
        this.middlewareStack.use(middlewareHostHeader.getHostHeaderPlugin(this.config));
        this.middlewareStack.use(middlewareLogger.getLoggerPlugin(this.config));
        this.middlewareStack.use(middlewareRecursionDetection.getRecursionDetectionPlugin(this.config));
        this.middlewareStack.use(core.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultKendraHttpAuthSchemeParametersProvider,
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

class AssociateEntitiesToExperienceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "AssociateEntitiesToExperience", {})
    .n("KendraClient", "AssociateEntitiesToExperienceCommand")
    .sc(schemas_0.AssociateEntitiesToExperience$)
    .build() {
}

class AssociatePersonasToEntitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "AssociatePersonasToEntities", {})
    .n("KendraClient", "AssociatePersonasToEntitiesCommand")
    .sc(schemas_0.AssociatePersonasToEntities$)
    .build() {
}

class BatchDeleteDocumentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "BatchDeleteDocument", {})
    .n("KendraClient", "BatchDeleteDocumentCommand")
    .sc(schemas_0.BatchDeleteDocument$)
    .build() {
}

class BatchDeleteFeaturedResultsSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "BatchDeleteFeaturedResultsSet", {})
    .n("KendraClient", "BatchDeleteFeaturedResultsSetCommand")
    .sc(schemas_0.BatchDeleteFeaturedResultsSet$)
    .build() {
}

class BatchGetDocumentStatusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "BatchGetDocumentStatus", {})
    .n("KendraClient", "BatchGetDocumentStatusCommand")
    .sc(schemas_0.BatchGetDocumentStatus$)
    .build() {
}

class BatchPutDocumentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "BatchPutDocument", {})
    .n("KendraClient", "BatchPutDocumentCommand")
    .sc(schemas_0.BatchPutDocument$)
    .build() {
}

class ClearQuerySuggestionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ClearQuerySuggestions", {})
    .n("KendraClient", "ClearQuerySuggestionsCommand")
    .sc(schemas_0.ClearQuerySuggestions$)
    .build() {
}

class CreateAccessControlConfigurationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateAccessControlConfiguration", {})
    .n("KendraClient", "CreateAccessControlConfigurationCommand")
    .sc(schemas_0.CreateAccessControlConfiguration$)
    .build() {
}

class CreateDataSourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateDataSource", {})
    .n("KendraClient", "CreateDataSourceCommand")
    .sc(schemas_0.CreateDataSource$)
    .build() {
}

class CreateExperienceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateExperience", {})
    .n("KendraClient", "CreateExperienceCommand")
    .sc(schemas_0.CreateExperience$)
    .build() {
}

class CreateFaqCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateFaq", {})
    .n("KendraClient", "CreateFaqCommand")
    .sc(schemas_0.CreateFaq$)
    .build() {
}

class CreateFeaturedResultsSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateFeaturedResultsSet", {})
    .n("KendraClient", "CreateFeaturedResultsSetCommand")
    .sc(schemas_0.CreateFeaturedResultsSet$)
    .build() {
}

class CreateIndexCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateIndex", {})
    .n("KendraClient", "CreateIndexCommand")
    .sc(schemas_0.CreateIndex$)
    .build() {
}

class CreateQuerySuggestionsBlockListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateQuerySuggestionsBlockList", {})
    .n("KendraClient", "CreateQuerySuggestionsBlockListCommand")
    .sc(schemas_0.CreateQuerySuggestionsBlockList$)
    .build() {
}

class CreateThesaurusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "CreateThesaurus", {})
    .n("KendraClient", "CreateThesaurusCommand")
    .sc(schemas_0.CreateThesaurus$)
    .build() {
}

class DeleteAccessControlConfigurationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteAccessControlConfiguration", {})
    .n("KendraClient", "DeleteAccessControlConfigurationCommand")
    .sc(schemas_0.DeleteAccessControlConfiguration$)
    .build() {
}

class DeleteDataSourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteDataSource", {})
    .n("KendraClient", "DeleteDataSourceCommand")
    .sc(schemas_0.DeleteDataSource$)
    .build() {
}

class DeleteExperienceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteExperience", {})
    .n("KendraClient", "DeleteExperienceCommand")
    .sc(schemas_0.DeleteExperience$)
    .build() {
}

class DeleteFaqCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteFaq", {})
    .n("KendraClient", "DeleteFaqCommand")
    .sc(schemas_0.DeleteFaq$)
    .build() {
}

class DeleteIndexCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteIndex", {})
    .n("KendraClient", "DeleteIndexCommand")
    .sc(schemas_0.DeleteIndex$)
    .build() {
}

class DeletePrincipalMappingCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeletePrincipalMapping", {})
    .n("KendraClient", "DeletePrincipalMappingCommand")
    .sc(schemas_0.DeletePrincipalMapping$)
    .build() {
}

class DeleteQuerySuggestionsBlockListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteQuerySuggestionsBlockList", {})
    .n("KendraClient", "DeleteQuerySuggestionsBlockListCommand")
    .sc(schemas_0.DeleteQuerySuggestionsBlockList$)
    .build() {
}

class DeleteThesaurusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DeleteThesaurus", {})
    .n("KendraClient", "DeleteThesaurusCommand")
    .sc(schemas_0.DeleteThesaurus$)
    .build() {
}

class DescribeAccessControlConfigurationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeAccessControlConfiguration", {})
    .n("KendraClient", "DescribeAccessControlConfigurationCommand")
    .sc(schemas_0.DescribeAccessControlConfiguration$)
    .build() {
}

class DescribeDataSourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeDataSource", {})
    .n("KendraClient", "DescribeDataSourceCommand")
    .sc(schemas_0.DescribeDataSource$)
    .build() {
}

class DescribeExperienceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeExperience", {})
    .n("KendraClient", "DescribeExperienceCommand")
    .sc(schemas_0.DescribeExperience$)
    .build() {
}

class DescribeFaqCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeFaq", {})
    .n("KendraClient", "DescribeFaqCommand")
    .sc(schemas_0.DescribeFaq$)
    .build() {
}

class DescribeFeaturedResultsSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeFeaturedResultsSet", {})
    .n("KendraClient", "DescribeFeaturedResultsSetCommand")
    .sc(schemas_0.DescribeFeaturedResultsSet$)
    .build() {
}

class DescribeIndexCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeIndex", {})
    .n("KendraClient", "DescribeIndexCommand")
    .sc(schemas_0.DescribeIndex$)
    .build() {
}

class DescribePrincipalMappingCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribePrincipalMapping", {})
    .n("KendraClient", "DescribePrincipalMappingCommand")
    .sc(schemas_0.DescribePrincipalMapping$)
    .build() {
}

class DescribeQuerySuggestionsBlockListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeQuerySuggestionsBlockList", {})
    .n("KendraClient", "DescribeQuerySuggestionsBlockListCommand")
    .sc(schemas_0.DescribeQuerySuggestionsBlockList$)
    .build() {
}

class DescribeQuerySuggestionsConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeQuerySuggestionsConfig", {})
    .n("KendraClient", "DescribeQuerySuggestionsConfigCommand")
    .sc(schemas_0.DescribeQuerySuggestionsConfig$)
    .build() {
}

class DescribeThesaurusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DescribeThesaurus", {})
    .n("KendraClient", "DescribeThesaurusCommand")
    .sc(schemas_0.DescribeThesaurus$)
    .build() {
}

class DisassociateEntitiesFromExperienceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DisassociateEntitiesFromExperience", {})
    .n("KendraClient", "DisassociateEntitiesFromExperienceCommand")
    .sc(schemas_0.DisassociateEntitiesFromExperience$)
    .build() {
}

class DisassociatePersonasFromEntitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "DisassociatePersonasFromEntities", {})
    .n("KendraClient", "DisassociatePersonasFromEntitiesCommand")
    .sc(schemas_0.DisassociatePersonasFromEntities$)
    .build() {
}

class GetQuerySuggestionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "GetQuerySuggestions", {})
    .n("KendraClient", "GetQuerySuggestionsCommand")
    .sc(schemas_0.GetQuerySuggestions$)
    .build() {
}

class GetSnapshotsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "GetSnapshots", {})
    .n("KendraClient", "GetSnapshotsCommand")
    .sc(schemas_0.GetSnapshots$)
    .build() {
}

class ListAccessControlConfigurationsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListAccessControlConfigurations", {})
    .n("KendraClient", "ListAccessControlConfigurationsCommand")
    .sc(schemas_0.ListAccessControlConfigurations$)
    .build() {
}

class ListDataSourcesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListDataSources", {})
    .n("KendraClient", "ListDataSourcesCommand")
    .sc(schemas_0.ListDataSources$)
    .build() {
}

class ListDataSourceSyncJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListDataSourceSyncJobs", {})
    .n("KendraClient", "ListDataSourceSyncJobsCommand")
    .sc(schemas_0.ListDataSourceSyncJobs$)
    .build() {
}

class ListEntityPersonasCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListEntityPersonas", {})
    .n("KendraClient", "ListEntityPersonasCommand")
    .sc(schemas_0.ListEntityPersonas$)
    .build() {
}

class ListExperienceEntitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListExperienceEntities", {})
    .n("KendraClient", "ListExperienceEntitiesCommand")
    .sc(schemas_0.ListExperienceEntities$)
    .build() {
}

class ListExperiencesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListExperiences", {})
    .n("KendraClient", "ListExperiencesCommand")
    .sc(schemas_0.ListExperiences$)
    .build() {
}

class ListFaqsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListFaqs", {})
    .n("KendraClient", "ListFaqsCommand")
    .sc(schemas_0.ListFaqs$)
    .build() {
}

class ListFeaturedResultsSetsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListFeaturedResultsSets", {})
    .n("KendraClient", "ListFeaturedResultsSetsCommand")
    .sc(schemas_0.ListFeaturedResultsSets$)
    .build() {
}

class ListGroupsOlderThanOrderingIdCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListGroupsOlderThanOrderingId", {})
    .n("KendraClient", "ListGroupsOlderThanOrderingIdCommand")
    .sc(schemas_0.ListGroupsOlderThanOrderingId$)
    .build() {
}

class ListIndicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListIndices", {})
    .n("KendraClient", "ListIndicesCommand")
    .sc(schemas_0.ListIndices$)
    .build() {
}

class ListQuerySuggestionsBlockListsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListQuerySuggestionsBlockLists", {})
    .n("KendraClient", "ListQuerySuggestionsBlockListsCommand")
    .sc(schemas_0.ListQuerySuggestionsBlockLists$)
    .build() {
}

class ListTagsForResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListTagsForResource", {})
    .n("KendraClient", "ListTagsForResourceCommand")
    .sc(schemas_0.ListTagsForResource$)
    .build() {
}

class ListThesauriCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "ListThesauri", {})
    .n("KendraClient", "ListThesauriCommand")
    .sc(schemas_0.ListThesauri$)
    .build() {
}

class PutPrincipalMappingCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "PutPrincipalMapping", {})
    .n("KendraClient", "PutPrincipalMappingCommand")
    .sc(schemas_0.PutPrincipalMapping$)
    .build() {
}

class QueryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "Query", {})
    .n("KendraClient", "QueryCommand")
    .sc(schemas_0.Query$)
    .build() {
}

class RetrieveCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "Retrieve", {})
    .n("KendraClient", "RetrieveCommand")
    .sc(schemas_0.Retrieve$)
    .build() {
}

class StartDataSourceSyncJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "StartDataSourceSyncJob", {})
    .n("KendraClient", "StartDataSourceSyncJobCommand")
    .sc(schemas_0.StartDataSourceSyncJob$)
    .build() {
}

class StopDataSourceSyncJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "StopDataSourceSyncJob", {})
    .n("KendraClient", "StopDataSourceSyncJobCommand")
    .sc(schemas_0.StopDataSourceSyncJob$)
    .build() {
}

class SubmitFeedbackCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "SubmitFeedback", {})
    .n("KendraClient", "SubmitFeedbackCommand")
    .sc(schemas_0.SubmitFeedback$)
    .build() {
}

class TagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "TagResource", {})
    .n("KendraClient", "TagResourceCommand")
    .sc(schemas_0.TagResource$)
    .build() {
}

class UntagResourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UntagResource", {})
    .n("KendraClient", "UntagResourceCommand")
    .sc(schemas_0.UntagResource$)
    .build() {
}

class UpdateAccessControlConfigurationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateAccessControlConfiguration", {})
    .n("KendraClient", "UpdateAccessControlConfigurationCommand")
    .sc(schemas_0.UpdateAccessControlConfiguration$)
    .build() {
}

class UpdateDataSourceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateDataSource", {})
    .n("KendraClient", "UpdateDataSourceCommand")
    .sc(schemas_0.UpdateDataSource$)
    .build() {
}

class UpdateExperienceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateExperience", {})
    .n("KendraClient", "UpdateExperienceCommand")
    .sc(schemas_0.UpdateExperience$)
    .build() {
}

class UpdateFeaturedResultsSetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateFeaturedResultsSet", {})
    .n("KendraClient", "UpdateFeaturedResultsSetCommand")
    .sc(schemas_0.UpdateFeaturedResultsSet$)
    .build() {
}

class UpdateIndexCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateIndex", {})
    .n("KendraClient", "UpdateIndexCommand")
    .sc(schemas_0.UpdateIndex$)
    .build() {
}

class UpdateQuerySuggestionsBlockListCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateQuerySuggestionsBlockList", {})
    .n("KendraClient", "UpdateQuerySuggestionsBlockListCommand")
    .sc(schemas_0.UpdateQuerySuggestionsBlockList$)
    .build() {
}

class UpdateQuerySuggestionsConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateQuerySuggestionsConfig", {})
    .n("KendraClient", "UpdateQuerySuggestionsConfigCommand")
    .sc(schemas_0.UpdateQuerySuggestionsConfig$)
    .build() {
}

class UpdateThesaurusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("AWSKendraFrontendService", "UpdateThesaurus", {})
    .n("KendraClient", "UpdateThesaurusCommand")
    .sc(schemas_0.UpdateThesaurus$)
    .build() {
}

const paginateGetSnapshots = core.createPaginator(KendraClient, GetSnapshotsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAccessControlConfigurations = core.createPaginator(KendraClient, ListAccessControlConfigurationsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListDataSources = core.createPaginator(KendraClient, ListDataSourcesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListDataSourceSyncJobs = core.createPaginator(KendraClient, ListDataSourceSyncJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListEntityPersonas = core.createPaginator(KendraClient, ListEntityPersonasCommand, "NextToken", "NextToken", "MaxResults");

const paginateListExperienceEntities = core.createPaginator(KendraClient, ListExperienceEntitiesCommand, "NextToken", "NextToken", "");

const paginateListExperiences = core.createPaginator(KendraClient, ListExperiencesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListFaqs = core.createPaginator(KendraClient, ListFaqsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListGroupsOlderThanOrderingId = core.createPaginator(KendraClient, ListGroupsOlderThanOrderingIdCommand, "NextToken", "NextToken", "MaxResults");

const paginateListIndices = core.createPaginator(KendraClient, ListIndicesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListQuerySuggestionsBlockLists = core.createPaginator(KendraClient, ListQuerySuggestionsBlockListsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListThesauri = core.createPaginator(KendraClient, ListThesauriCommand, "NextToken", "NextToken", "MaxResults");

const commands = {
    AssociateEntitiesToExperienceCommand,
    AssociatePersonasToEntitiesCommand,
    BatchDeleteDocumentCommand,
    BatchDeleteFeaturedResultsSetCommand,
    BatchGetDocumentStatusCommand,
    BatchPutDocumentCommand,
    ClearQuerySuggestionsCommand,
    CreateAccessControlConfigurationCommand,
    CreateDataSourceCommand,
    CreateExperienceCommand,
    CreateFaqCommand,
    CreateFeaturedResultsSetCommand,
    CreateIndexCommand,
    CreateQuerySuggestionsBlockListCommand,
    CreateThesaurusCommand,
    DeleteAccessControlConfigurationCommand,
    DeleteDataSourceCommand,
    DeleteExperienceCommand,
    DeleteFaqCommand,
    DeleteIndexCommand,
    DeletePrincipalMappingCommand,
    DeleteQuerySuggestionsBlockListCommand,
    DeleteThesaurusCommand,
    DescribeAccessControlConfigurationCommand,
    DescribeDataSourceCommand,
    DescribeExperienceCommand,
    DescribeFaqCommand,
    DescribeFeaturedResultsSetCommand,
    DescribeIndexCommand,
    DescribePrincipalMappingCommand,
    DescribeQuerySuggestionsBlockListCommand,
    DescribeQuerySuggestionsConfigCommand,
    DescribeThesaurusCommand,
    DisassociateEntitiesFromExperienceCommand,
    DisassociatePersonasFromEntitiesCommand,
    GetQuerySuggestionsCommand,
    GetSnapshotsCommand,
    ListAccessControlConfigurationsCommand,
    ListDataSourcesCommand,
    ListDataSourceSyncJobsCommand,
    ListEntityPersonasCommand,
    ListExperienceEntitiesCommand,
    ListExperiencesCommand,
    ListFaqsCommand,
    ListFeaturedResultsSetsCommand,
    ListGroupsOlderThanOrderingIdCommand,
    ListIndicesCommand,
    ListQuerySuggestionsBlockListsCommand,
    ListTagsForResourceCommand,
    ListThesauriCommand,
    PutPrincipalMappingCommand,
    QueryCommand,
    RetrieveCommand,
    StartDataSourceSyncJobCommand,
    StopDataSourceSyncJobCommand,
    SubmitFeedbackCommand,
    TagResourceCommand,
    UntagResourceCommand,
    UpdateAccessControlConfigurationCommand,
    UpdateDataSourceCommand,
    UpdateExperienceCommand,
    UpdateFeaturedResultsSetCommand,
    UpdateIndexCommand,
    UpdateQuerySuggestionsBlockListCommand,
    UpdateQuerySuggestionsConfigCommand,
    UpdateThesaurusCommand,
};
const paginators = {
    paginateGetSnapshots,
    paginateListAccessControlConfigurations,
    paginateListDataSources,
    paginateListDataSourceSyncJobs,
    paginateListEntityPersonas,
    paginateListExperienceEntities,
    paginateListExperiences,
    paginateListFaqs,
    paginateListGroupsOlderThanOrderingId,
    paginateListIndices,
    paginateListQuerySuggestionsBlockLists,
    paginateListThesauri,
};
class Kendra extends KendraClient {
}
smithyClient.createAggregatedClient(commands, Kendra, { paginators });

const HighlightType = {
    STANDARD: "STANDARD",
    THESAURUS_SYNONYM: "THESAURUS_SYNONYM",
};
const AdditionalResultAttributeValueType = {
    TEXT_WITH_HIGHLIGHTS_VALUE: "TEXT_WITH_HIGHLIGHTS_VALUE",
};
const AlfrescoEntity = {
    blog: "blog",
    documentLibrary: "documentLibrary",
    wiki: "wiki",
};
const EntityType = {
    GROUP: "GROUP",
    USER: "USER",
};
const Persona = {
    OWNER: "OWNER",
    VIEWER: "VIEWER",
};
const AttributeSuggestionsMode = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};
const ErrorCode = {
    INTERNAL_ERROR: "InternalError",
    INVALID_REQUEST: "InvalidRequest",
};
const DocumentStatus = {
    FAILED: "FAILED",
    INDEXED: "INDEXED",
    NOT_FOUND: "NOT_FOUND",
    PROCESSING: "PROCESSING",
    UPDATED: "UPDATED",
    UPDATE_FAILED: "UPDATE_FAILED",
};
const ConditionOperator = {
    BeginsWith: "BeginsWith",
    Contains: "Contains",
    Equals: "Equals",
    Exists: "Exists",
    GreaterThan: "GreaterThan",
    GreaterThanOrEquals: "GreaterThanOrEquals",
    LessThan: "LessThan",
    LessThanOrEquals: "LessThanOrEquals",
    NotContains: "NotContains",
    NotEquals: "NotEquals",
    NotExists: "NotExists",
};
const ReadAccessType = {
    ALLOW: "ALLOW",
    DENY: "DENY",
};
const PrincipalType = {
    GROUP: "GROUP",
    USER: "USER",
};
const ContentType = {
    CSV: "CSV",
    HTML: "HTML",
    JSON: "JSON",
    MD: "MD",
    MS_EXCEL: "MS_EXCEL",
    MS_WORD: "MS_WORD",
    PDF: "PDF",
    PLAIN_TEXT: "PLAIN_TEXT",
    PPT: "PPT",
    RTF: "RTF",
    XML: "XML",
    XSLT: "XSLT",
};
const ConfluenceAttachmentFieldName = {
    AUTHOR: "AUTHOR",
    CONTENT_TYPE: "CONTENT_TYPE",
    CREATED_DATE: "CREATED_DATE",
    DISPLAY_URL: "DISPLAY_URL",
    FILE_SIZE: "FILE_SIZE",
    ITEM_TYPE: "ITEM_TYPE",
    PARENT_ID: "PARENT_ID",
    SPACE_KEY: "SPACE_KEY",
    SPACE_NAME: "SPACE_NAME",
    URL: "URL",
    VERSION: "VERSION",
};
const ConfluenceAuthenticationType = {
    HTTP_BASIC: "HTTP_BASIC",
    PAT: "PAT",
};
const ConfluenceBlogFieldName = {
    AUTHOR: "AUTHOR",
    DISPLAY_URL: "DISPLAY_URL",
    ITEM_TYPE: "ITEM_TYPE",
    LABELS: "LABELS",
    PUBLISH_DATE: "PUBLISH_DATE",
    SPACE_KEY: "SPACE_KEY",
    SPACE_NAME: "SPACE_NAME",
    URL: "URL",
    VERSION: "VERSION",
};
const ConfluencePageFieldName = {
    AUTHOR: "AUTHOR",
    CONTENT_STATUS: "CONTENT_STATUS",
    CREATED_DATE: "CREATED_DATE",
    DISPLAY_URL: "DISPLAY_URL",
    ITEM_TYPE: "ITEM_TYPE",
    LABELS: "LABELS",
    MODIFIED_DATE: "MODIFIED_DATE",
    PARENT_ID: "PARENT_ID",
    SPACE_KEY: "SPACE_KEY",
    SPACE_NAME: "SPACE_NAME",
    URL: "URL",
    VERSION: "VERSION",
};
const ConfluenceSpaceFieldName = {
    DISPLAY_URL: "DISPLAY_URL",
    ITEM_TYPE: "ITEM_TYPE",
    SPACE_KEY: "SPACE_KEY",
    URL: "URL",
};
const ConfluenceVersion = {
    CLOUD: "CLOUD",
    SERVER: "SERVER",
};
const DatabaseEngineType = {
    RDS_AURORA_MYSQL: "RDS_AURORA_MYSQL",
    RDS_AURORA_POSTGRESQL: "RDS_AURORA_POSTGRESQL",
    RDS_MYSQL: "RDS_MYSQL",
    RDS_POSTGRESQL: "RDS_POSTGRESQL",
};
const QueryIdentifiersEnclosingOption = {
    DOUBLE_QUOTES: "DOUBLE_QUOTES",
    NONE: "NONE",
};
const FsxFileSystemType = {
    WINDOWS: "WINDOWS",
};
const Type = {
    ON_PREMISE: "ON_PREMISE",
    SAAS: "SAAS",
};
const IssueSubEntity = {
    ATTACHMENTS: "ATTACHMENTS",
    COMMENTS: "COMMENTS",
    WORKLOGS: "WORKLOGS",
};
const SalesforceChatterFeedIncludeFilterType = {
    ACTIVE_USER: "ACTIVE_USER",
    STANDARD_USER: "STANDARD_USER",
};
const SalesforceKnowledgeArticleState = {
    ARCHIVED: "ARCHIVED",
    DRAFT: "DRAFT",
    PUBLISHED: "PUBLISHED",
};
const SalesforceStandardObjectName = {
    ACCOUNT: "ACCOUNT",
    CAMPAIGN: "CAMPAIGN",
    CASE: "CASE",
    CONTACT: "CONTACT",
    CONTRACT: "CONTRACT",
    DOCUMENT: "DOCUMENT",
    GROUP: "GROUP",
    IDEA: "IDEA",
    LEAD: "LEAD",
    OPPORTUNITY: "OPPORTUNITY",
    PARTNER: "PARTNER",
    PRICEBOOK: "PRICEBOOK",
    PRODUCT: "PRODUCT",
    PROFILE: "PROFILE",
    SOLUTION: "SOLUTION",
    TASK: "TASK",
    USER: "USER",
};
const ServiceNowAuthenticationType = {
    HTTP_BASIC: "HTTP_BASIC",
    OAUTH2: "OAUTH2",
};
const ServiceNowBuildVersionType = {
    LONDON: "LONDON",
    OTHERS: "OTHERS",
};
const SharePointOnlineAuthenticationType = {
    HTTP_BASIC: "HTTP_BASIC",
    OAUTH2: "OAUTH2",
};
const SharePointVersion = {
    SHAREPOINT_2013: "SHAREPOINT_2013",
    SHAREPOINT_2016: "SHAREPOINT_2016",
    SHAREPOINT_2019: "SHAREPOINT_2019",
    SHAREPOINT_ONLINE: "SHAREPOINT_ONLINE",
};
const SlackEntity = {
    DIRECT_MESSAGE: "DIRECT_MESSAGE",
    GROUP_MESSAGE: "GROUP_MESSAGE",
    PRIVATE_CHANNEL: "PRIVATE_CHANNEL",
    PUBLIC_CHANNEL: "PUBLIC_CHANNEL",
};
const WebCrawlerMode = {
    EVERYTHING: "EVERYTHING",
    HOST_ONLY: "HOST_ONLY",
    SUBDOMAINS: "SUBDOMAINS",
};
const DataSourceType = {
    ALFRESCO: "ALFRESCO",
    BOX: "BOX",
    CONFLUENCE: "CONFLUENCE",
    CUSTOM: "CUSTOM",
    DATABASE: "DATABASE",
    FSX: "FSX",
    GITHUB: "GITHUB",
    GOOGLEDRIVE: "GOOGLEDRIVE",
    JIRA: "JIRA",
    ONEDRIVE: "ONEDRIVE",
    QUIP: "QUIP",
    S3: "S3",
    SALESFORCE: "SALESFORCE",
    SERVICENOW: "SERVICENOW",
    SHAREPOINT: "SHAREPOINT",
    SLACK: "SLACK",
    TEMPLATE: "TEMPLATE",
    WEBCRAWLER: "WEBCRAWLER",
    WORKDOCS: "WORKDOCS",
};
const FaqFileFormat = {
    CSV: "CSV",
    CSV_WITH_HEADER: "CSV_WITH_HEADER",
    JSON: "JSON",
};
const FeaturedResultsSetStatus = {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
};
const IndexEdition = {
    DEVELOPER_EDITION: "DEVELOPER_EDITION",
    ENTERPRISE_EDITION: "ENTERPRISE_EDITION",
    GEN_AI_ENTERPRISE_EDITION: "GEN_AI_ENTERPRISE_EDITION",
};
const UserContextPolicy = {
    ATTRIBUTE_FILTER: "ATTRIBUTE_FILTER",
    USER_TOKEN: "USER_TOKEN",
};
const UserGroupResolutionMode = {
    AWS_SSO: "AWS_SSO",
    NONE: "NONE",
};
const KeyLocation = {
    SECRET_MANAGER: "SECRET_MANAGER",
    URL: "URL",
};
const DataSourceStatus = {
    ACTIVE: "ACTIVE",
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
    UPDATING: "UPDATING",
};
const EndpointType = {
    HOME: "HOME",
};
const ExperienceStatus = {
    ACTIVE: "ACTIVE",
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
};
const FaqStatus = {
    ACTIVE: "ACTIVE",
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
    UPDATING: "UPDATING",
};
const Order = {
    ASCENDING: "ASCENDING",
    DESCENDING: "DESCENDING",
};
const DocumentAttributeValueType = {
    DATE_VALUE: "DATE_VALUE",
    LONG_VALUE: "LONG_VALUE",
    STRING_LIST_VALUE: "STRING_LIST_VALUE",
    STRING_VALUE: "STRING_VALUE",
};
const IndexStatus = {
    ACTIVE: "ACTIVE",
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
    SYSTEM_UPDATING: "SYSTEM_UPDATING",
    UPDATING: "UPDATING",
};
const PrincipalMappingStatus = {
    DELETED: "DELETED",
    DELETING: "DELETING",
    FAILED: "FAILED",
    PROCESSING: "PROCESSING",
    SUCCEEDED: "SUCCEEDED",
};
const QuerySuggestionsBlockListStatus = {
    ACTIVE: "ACTIVE",
    ACTIVE_BUT_UPDATE_FAILED: "ACTIVE_BUT_UPDATE_FAILED",
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
    UPDATING: "UPDATING",
};
const Mode = {
    ENABLED: "ENABLED",
    LEARN_ONLY: "LEARN_ONLY",
};
const QuerySuggestionsStatus = {
    ACTIVE: "ACTIVE",
    UPDATING: "UPDATING",
};
const ThesaurusStatus = {
    ACTIVE: "ACTIVE",
    ACTIVE_BUT_UPDATE_FAILED: "ACTIVE_BUT_UPDATE_FAILED",
    CREATING: "CREATING",
    DELETING: "DELETING",
    FAILED: "FAILED",
    UPDATING: "UPDATING",
};
const SuggestionType = {
    DOCUMENT_ATTRIBUTES: "DOCUMENT_ATTRIBUTES",
    QUERY: "QUERY",
};
const Interval = {
    ONE_MONTH_AGO: "ONE_MONTH_AGO",
    ONE_WEEK_AGO: "ONE_WEEK_AGO",
    THIS_MONTH: "THIS_MONTH",
    THIS_WEEK: "THIS_WEEK",
    TWO_MONTHS_AGO: "TWO_MONTHS_AGO",
    TWO_WEEKS_AGO: "TWO_WEEKS_AGO",
};
const MetricType = {
    AGG_QUERY_DOC_METRICS: "AGG_QUERY_DOC_METRICS",
    DOCS_BY_CLICK_COUNT: "DOCS_BY_CLICK_COUNT",
    QUERIES_BY_COUNT: "QUERIES_BY_COUNT",
    QUERIES_BY_ZERO_CLICK_RATE: "QUERIES_BY_ZERO_CLICK_RATE",
    QUERIES_BY_ZERO_RESULT_RATE: "QUERIES_BY_ZERO_RESULT_RATE",
    TREND_QUERY_DOC_METRICS: "TREND_QUERY_DOC_METRICS",
};
const DataSourceSyncJobStatus = {
    ABORTED: "ABORTED",
    FAILED: "FAILED",
    INCOMPLETE: "INCOMPLETE",
    STOPPING: "STOPPING",
    SUCCEEDED: "SUCCEEDED",
    SYNCING: "SYNCING",
    SYNCING_INDEXING: "SYNCING_INDEXING",
};
const MissingAttributeKeyStrategy = {
    COLLAPSE: "COLLAPSE",
    EXPAND: "EXPAND",
    IGNORE: "IGNORE",
};
const SortOrder = {
    ASC: "ASC",
    DESC: "DESC",
};
const QueryResultType = {
    ANSWER: "ANSWER",
    DOCUMENT: "DOCUMENT",
    QUESTION_ANSWER: "QUESTION_ANSWER",
};
const QueryResultFormat = {
    TABLE: "TABLE",
    TEXT: "TEXT",
};
const ScoreConfidence = {
    HIGH: "HIGH",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    NOT_AVAILABLE: "NOT_AVAILABLE",
    VERY_HIGH: "VERY_HIGH",
};
const WarningCode = {
    QUERY_LANGUAGE_INVALID_SYNTAX: "QUERY_LANGUAGE_INVALID_SYNTAX",
};
const RelevanceType = {
    NOT_RELEVANT: "NOT_RELEVANT",
    RELEVANT: "RELEVANT",
};

exports.$Command = smithyClient.Command;
exports.__Client = smithyClient.Client;
exports.KendraServiceException = KendraServiceException.KendraServiceException;
exports.AdditionalResultAttributeValueType = AdditionalResultAttributeValueType;
exports.AlfrescoEntity = AlfrescoEntity;
exports.AssociateEntitiesToExperienceCommand = AssociateEntitiesToExperienceCommand;
exports.AssociatePersonasToEntitiesCommand = AssociatePersonasToEntitiesCommand;
exports.AttributeSuggestionsMode = AttributeSuggestionsMode;
exports.BatchDeleteDocumentCommand = BatchDeleteDocumentCommand;
exports.BatchDeleteFeaturedResultsSetCommand = BatchDeleteFeaturedResultsSetCommand;
exports.BatchGetDocumentStatusCommand = BatchGetDocumentStatusCommand;
exports.BatchPutDocumentCommand = BatchPutDocumentCommand;
exports.ClearQuerySuggestionsCommand = ClearQuerySuggestionsCommand;
exports.ConditionOperator = ConditionOperator;
exports.ConfluenceAttachmentFieldName = ConfluenceAttachmentFieldName;
exports.ConfluenceAuthenticationType = ConfluenceAuthenticationType;
exports.ConfluenceBlogFieldName = ConfluenceBlogFieldName;
exports.ConfluencePageFieldName = ConfluencePageFieldName;
exports.ConfluenceSpaceFieldName = ConfluenceSpaceFieldName;
exports.ConfluenceVersion = ConfluenceVersion;
exports.ContentType = ContentType;
exports.CreateAccessControlConfigurationCommand = CreateAccessControlConfigurationCommand;
exports.CreateDataSourceCommand = CreateDataSourceCommand;
exports.CreateExperienceCommand = CreateExperienceCommand;
exports.CreateFaqCommand = CreateFaqCommand;
exports.CreateFeaturedResultsSetCommand = CreateFeaturedResultsSetCommand;
exports.CreateIndexCommand = CreateIndexCommand;
exports.CreateQuerySuggestionsBlockListCommand = CreateQuerySuggestionsBlockListCommand;
exports.CreateThesaurusCommand = CreateThesaurusCommand;
exports.DataSourceStatus = DataSourceStatus;
exports.DataSourceSyncJobStatus = DataSourceSyncJobStatus;
exports.DataSourceType = DataSourceType;
exports.DatabaseEngineType = DatabaseEngineType;
exports.DeleteAccessControlConfigurationCommand = DeleteAccessControlConfigurationCommand;
exports.DeleteDataSourceCommand = DeleteDataSourceCommand;
exports.DeleteExperienceCommand = DeleteExperienceCommand;
exports.DeleteFaqCommand = DeleteFaqCommand;
exports.DeleteIndexCommand = DeleteIndexCommand;
exports.DeletePrincipalMappingCommand = DeletePrincipalMappingCommand;
exports.DeleteQuerySuggestionsBlockListCommand = DeleteQuerySuggestionsBlockListCommand;
exports.DeleteThesaurusCommand = DeleteThesaurusCommand;
exports.DescribeAccessControlConfigurationCommand = DescribeAccessControlConfigurationCommand;
exports.DescribeDataSourceCommand = DescribeDataSourceCommand;
exports.DescribeExperienceCommand = DescribeExperienceCommand;
exports.DescribeFaqCommand = DescribeFaqCommand;
exports.DescribeFeaturedResultsSetCommand = DescribeFeaturedResultsSetCommand;
exports.DescribeIndexCommand = DescribeIndexCommand;
exports.DescribePrincipalMappingCommand = DescribePrincipalMappingCommand;
exports.DescribeQuerySuggestionsBlockListCommand = DescribeQuerySuggestionsBlockListCommand;
exports.DescribeQuerySuggestionsConfigCommand = DescribeQuerySuggestionsConfigCommand;
exports.DescribeThesaurusCommand = DescribeThesaurusCommand;
exports.DisassociateEntitiesFromExperienceCommand = DisassociateEntitiesFromExperienceCommand;
exports.DisassociatePersonasFromEntitiesCommand = DisassociatePersonasFromEntitiesCommand;
exports.DocumentAttributeValueType = DocumentAttributeValueType;
exports.DocumentStatus = DocumentStatus;
exports.EndpointType = EndpointType;
exports.EntityType = EntityType;
exports.ErrorCode = ErrorCode;
exports.ExperienceStatus = ExperienceStatus;
exports.FaqFileFormat = FaqFileFormat;
exports.FaqStatus = FaqStatus;
exports.FeaturedResultsSetStatus = FeaturedResultsSetStatus;
exports.FsxFileSystemType = FsxFileSystemType;
exports.GetQuerySuggestionsCommand = GetQuerySuggestionsCommand;
exports.GetSnapshotsCommand = GetSnapshotsCommand;
exports.HighlightType = HighlightType;
exports.IndexEdition = IndexEdition;
exports.IndexStatus = IndexStatus;
exports.Interval = Interval;
exports.IssueSubEntity = IssueSubEntity;
exports.Kendra = Kendra;
exports.KendraClient = KendraClient;
exports.KeyLocation = KeyLocation;
exports.ListAccessControlConfigurationsCommand = ListAccessControlConfigurationsCommand;
exports.ListDataSourceSyncJobsCommand = ListDataSourceSyncJobsCommand;
exports.ListDataSourcesCommand = ListDataSourcesCommand;
exports.ListEntityPersonasCommand = ListEntityPersonasCommand;
exports.ListExperienceEntitiesCommand = ListExperienceEntitiesCommand;
exports.ListExperiencesCommand = ListExperiencesCommand;
exports.ListFaqsCommand = ListFaqsCommand;
exports.ListFeaturedResultsSetsCommand = ListFeaturedResultsSetsCommand;
exports.ListGroupsOlderThanOrderingIdCommand = ListGroupsOlderThanOrderingIdCommand;
exports.ListIndicesCommand = ListIndicesCommand;
exports.ListQuerySuggestionsBlockListsCommand = ListQuerySuggestionsBlockListsCommand;
exports.ListTagsForResourceCommand = ListTagsForResourceCommand;
exports.ListThesauriCommand = ListThesauriCommand;
exports.MetricType = MetricType;
exports.MissingAttributeKeyStrategy = MissingAttributeKeyStrategy;
exports.Mode = Mode;
exports.Order = Order;
exports.Persona = Persona;
exports.PrincipalMappingStatus = PrincipalMappingStatus;
exports.PrincipalType = PrincipalType;
exports.PutPrincipalMappingCommand = PutPrincipalMappingCommand;
exports.QueryCommand = QueryCommand;
exports.QueryIdentifiersEnclosingOption = QueryIdentifiersEnclosingOption;
exports.QueryResultFormat = QueryResultFormat;
exports.QueryResultType = QueryResultType;
exports.QuerySuggestionsBlockListStatus = QuerySuggestionsBlockListStatus;
exports.QuerySuggestionsStatus = QuerySuggestionsStatus;
exports.ReadAccessType = ReadAccessType;
exports.RelevanceType = RelevanceType;
exports.RetrieveCommand = RetrieveCommand;
exports.SalesforceChatterFeedIncludeFilterType = SalesforceChatterFeedIncludeFilterType;
exports.SalesforceKnowledgeArticleState = SalesforceKnowledgeArticleState;
exports.SalesforceStandardObjectName = SalesforceStandardObjectName;
exports.ScoreConfidence = ScoreConfidence;
exports.ServiceNowAuthenticationType = ServiceNowAuthenticationType;
exports.ServiceNowBuildVersionType = ServiceNowBuildVersionType;
exports.SharePointOnlineAuthenticationType = SharePointOnlineAuthenticationType;
exports.SharePointVersion = SharePointVersion;
exports.SlackEntity = SlackEntity;
exports.SortOrder = SortOrder;
exports.StartDataSourceSyncJobCommand = StartDataSourceSyncJobCommand;
exports.StopDataSourceSyncJobCommand = StopDataSourceSyncJobCommand;
exports.SubmitFeedbackCommand = SubmitFeedbackCommand;
exports.SuggestionType = SuggestionType;
exports.TagResourceCommand = TagResourceCommand;
exports.ThesaurusStatus = ThesaurusStatus;
exports.Type = Type;
exports.UntagResourceCommand = UntagResourceCommand;
exports.UpdateAccessControlConfigurationCommand = UpdateAccessControlConfigurationCommand;
exports.UpdateDataSourceCommand = UpdateDataSourceCommand;
exports.UpdateExperienceCommand = UpdateExperienceCommand;
exports.UpdateFeaturedResultsSetCommand = UpdateFeaturedResultsSetCommand;
exports.UpdateIndexCommand = UpdateIndexCommand;
exports.UpdateQuerySuggestionsBlockListCommand = UpdateQuerySuggestionsBlockListCommand;
exports.UpdateQuerySuggestionsConfigCommand = UpdateQuerySuggestionsConfigCommand;
exports.UpdateThesaurusCommand = UpdateThesaurusCommand;
exports.UserContextPolicy = UserContextPolicy;
exports.UserGroupResolutionMode = UserGroupResolutionMode;
exports.WarningCode = WarningCode;
exports.WebCrawlerMode = WebCrawlerMode;
exports.paginateGetSnapshots = paginateGetSnapshots;
exports.paginateListAccessControlConfigurations = paginateListAccessControlConfigurations;
exports.paginateListDataSourceSyncJobs = paginateListDataSourceSyncJobs;
exports.paginateListDataSources = paginateListDataSources;
exports.paginateListEntityPersonas = paginateListEntityPersonas;
exports.paginateListExperienceEntities = paginateListExperienceEntities;
exports.paginateListExperiences = paginateListExperiences;
exports.paginateListFaqs = paginateListFaqs;
exports.paginateListGroupsOlderThanOrderingId = paginateListGroupsOlderThanOrderingId;
exports.paginateListIndices = paginateListIndices;
exports.paginateListQuerySuggestionsBlockLists = paginateListQuerySuggestionsBlockLists;
exports.paginateListThesauri = paginateListThesauri;
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
