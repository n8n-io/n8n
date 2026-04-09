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
var utilWaiter = require('@smithy/util-waiter');
var errors = require('./models/errors');
var SageMakerServiceException = require('./models/SageMakerServiceException');

const resolveClientEndpointParameters = (options) => {
    return Object.assign(options, {
        useDualstackEndpoint: options.useDualstackEndpoint ?? false,
        useFipsEndpoint: options.useFipsEndpoint ?? false,
        defaultSigningName: "sagemaker",
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

class SageMakerClient extends smithyClient.Client {
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
            httpAuthSchemeParametersProvider: httpAuthSchemeProvider.defaultSageMakerHttpAuthSchemeParametersProvider,
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

class AddAssociationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "AddAssociation", {})
    .n("SageMakerClient", "AddAssociationCommand")
    .sc(schemas_0.AddAssociation$)
    .build() {
}

class AddTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "AddTags", {})
    .n("SageMakerClient", "AddTagsCommand")
    .sc(schemas_0.AddTags$)
    .build() {
}

class AssociateTrialComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "AssociateTrialComponent", {})
    .n("SageMakerClient", "AssociateTrialComponentCommand")
    .sc(schemas_0.AssociateTrialComponent$)
    .build() {
}

class AttachClusterNodeVolumeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "AttachClusterNodeVolume", {})
    .n("SageMakerClient", "AttachClusterNodeVolumeCommand")
    .sc(schemas_0.AttachClusterNodeVolume$)
    .build() {
}

class BatchAddClusterNodesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "BatchAddClusterNodes", {})
    .n("SageMakerClient", "BatchAddClusterNodesCommand")
    .sc(schemas_0.BatchAddClusterNodes$)
    .build() {
}

class BatchDeleteClusterNodesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "BatchDeleteClusterNodes", {})
    .n("SageMakerClient", "BatchDeleteClusterNodesCommand")
    .sc(schemas_0.BatchDeleteClusterNodes$)
    .build() {
}

class BatchDescribeModelPackageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "BatchDescribeModelPackage", {})
    .n("SageMakerClient", "BatchDescribeModelPackageCommand")
    .sc(schemas_0.BatchDescribeModelPackage$)
    .build() {
}

class BatchRebootClusterNodesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "BatchRebootClusterNodes", {})
    .n("SageMakerClient", "BatchRebootClusterNodesCommand")
    .sc(schemas_0.BatchRebootClusterNodes$)
    .build() {
}

class BatchReplaceClusterNodesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "BatchReplaceClusterNodes", {})
    .n("SageMakerClient", "BatchReplaceClusterNodesCommand")
    .sc(schemas_0.BatchReplaceClusterNodes$)
    .build() {
}

class CreateActionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAction", {})
    .n("SageMakerClient", "CreateActionCommand")
    .sc(schemas_0.CreateAction$)
    .build() {
}

class CreateAlgorithmCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAlgorithm", {})
    .n("SageMakerClient", "CreateAlgorithmCommand")
    .sc(schemas_0.CreateAlgorithm$)
    .build() {
}

class CreateAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateApp", {})
    .n("SageMakerClient", "CreateAppCommand")
    .sc(schemas_0.CreateApp$)
    .build() {
}

class CreateAppImageConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAppImageConfig", {})
    .n("SageMakerClient", "CreateAppImageConfigCommand")
    .sc(schemas_0.CreateAppImageConfig$)
    .build() {
}

class CreateArtifactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateArtifact", {})
    .n("SageMakerClient", "CreateArtifactCommand")
    .sc(schemas_0.CreateArtifact$)
    .build() {
}

class CreateAutoMLJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAutoMLJob", {})
    .n("SageMakerClient", "CreateAutoMLJobCommand")
    .sc(schemas_0.CreateAutoMLJob$)
    .build() {
}

class CreateAutoMLJobV2Command extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateAutoMLJobV2", {})
    .n("SageMakerClient", "CreateAutoMLJobV2Command")
    .sc(schemas_0.CreateAutoMLJobV2$)
    .build() {
}

class CreateClusterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateCluster", {})
    .n("SageMakerClient", "CreateClusterCommand")
    .sc(schemas_0.CreateCluster$)
    .build() {
}

class CreateClusterSchedulerConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateClusterSchedulerConfig", {})
    .n("SageMakerClient", "CreateClusterSchedulerConfigCommand")
    .sc(schemas_0.CreateClusterSchedulerConfig$)
    .build() {
}

class CreateCodeRepositoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateCodeRepository", {})
    .n("SageMakerClient", "CreateCodeRepositoryCommand")
    .sc(schemas_0.CreateCodeRepository$)
    .build() {
}

class CreateCompilationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateCompilationJob", {})
    .n("SageMakerClient", "CreateCompilationJobCommand")
    .sc(schemas_0.CreateCompilationJob$)
    .build() {
}

class CreateComputeQuotaCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateComputeQuota", {})
    .n("SageMakerClient", "CreateComputeQuotaCommand")
    .sc(schemas_0.CreateComputeQuota$)
    .build() {
}

class CreateContextCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateContext", {})
    .n("SageMakerClient", "CreateContextCommand")
    .sc(schemas_0.CreateContext$)
    .build() {
}

class CreateDataQualityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateDataQualityJobDefinition", {})
    .n("SageMakerClient", "CreateDataQualityJobDefinitionCommand")
    .sc(schemas_0.CreateDataQualityJobDefinition$)
    .build() {
}

class CreateDeviceFleetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateDeviceFleet", {})
    .n("SageMakerClient", "CreateDeviceFleetCommand")
    .sc(schemas_0.CreateDeviceFleet$)
    .build() {
}

class CreateDomainCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateDomain", {})
    .n("SageMakerClient", "CreateDomainCommand")
    .sc(schemas_0.CreateDomain$)
    .build() {
}

class CreateEdgeDeploymentPlanCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateEdgeDeploymentPlan", {})
    .n("SageMakerClient", "CreateEdgeDeploymentPlanCommand")
    .sc(schemas_0.CreateEdgeDeploymentPlan$)
    .build() {
}

class CreateEdgeDeploymentStageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateEdgeDeploymentStage", {})
    .n("SageMakerClient", "CreateEdgeDeploymentStageCommand")
    .sc(schemas_0.CreateEdgeDeploymentStage$)
    .build() {
}

class CreateEdgePackagingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateEdgePackagingJob", {})
    .n("SageMakerClient", "CreateEdgePackagingJobCommand")
    .sc(schemas_0.CreateEdgePackagingJob$)
    .build() {
}

class CreateEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateEndpoint", {})
    .n("SageMakerClient", "CreateEndpointCommand")
    .sc(schemas_0.CreateEndpoint$)
    .build() {
}

class CreateEndpointConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateEndpointConfig", {})
    .n("SageMakerClient", "CreateEndpointConfigCommand")
    .sc(schemas_0.CreateEndpointConfig$)
    .build() {
}

class CreateExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateExperiment", {})
    .n("SageMakerClient", "CreateExperimentCommand")
    .sc(schemas_0.CreateExperiment$)
    .build() {
}

class CreateFeatureGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateFeatureGroup", {})
    .n("SageMakerClient", "CreateFeatureGroupCommand")
    .sc(schemas_0.CreateFeatureGroup$)
    .build() {
}

class CreateFlowDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateFlowDefinition", {})
    .n("SageMakerClient", "CreateFlowDefinitionCommand")
    .sc(schemas_0.CreateFlowDefinition$)
    .build() {
}

class CreateHubCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateHub", {})
    .n("SageMakerClient", "CreateHubCommand")
    .sc(schemas_0.CreateHub$)
    .build() {
}

class CreateHubContentPresignedUrlsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateHubContentPresignedUrls", {})
    .n("SageMakerClient", "CreateHubContentPresignedUrlsCommand")
    .sc(schemas_0.CreateHubContentPresignedUrls$)
    .build() {
}

class CreateHubContentReferenceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateHubContentReference", {})
    .n("SageMakerClient", "CreateHubContentReferenceCommand")
    .sc(schemas_0.CreateHubContentReference$)
    .build() {
}

class CreateHumanTaskUiCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateHumanTaskUi", {})
    .n("SageMakerClient", "CreateHumanTaskUiCommand")
    .sc(schemas_0.CreateHumanTaskUi$)
    .build() {
}

class CreateHyperParameterTuningJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateHyperParameterTuningJob", {})
    .n("SageMakerClient", "CreateHyperParameterTuningJobCommand")
    .sc(schemas_0.CreateHyperParameterTuningJob$)
    .build() {
}

class CreateImageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateImage", {})
    .n("SageMakerClient", "CreateImageCommand")
    .sc(schemas_0.CreateImage$)
    .build() {
}

class CreateImageVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateImageVersion", {})
    .n("SageMakerClient", "CreateImageVersionCommand")
    .sc(schemas_0.CreateImageVersion$)
    .build() {
}

class CreateInferenceComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateInferenceComponent", {})
    .n("SageMakerClient", "CreateInferenceComponentCommand")
    .sc(schemas_0.CreateInferenceComponent$)
    .build() {
}

class CreateInferenceExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateInferenceExperiment", {})
    .n("SageMakerClient", "CreateInferenceExperimentCommand")
    .sc(schemas_0.CreateInferenceExperiment$)
    .build() {
}

class CreateInferenceRecommendationsJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateInferenceRecommendationsJob", {})
    .n("SageMakerClient", "CreateInferenceRecommendationsJobCommand")
    .sc(schemas_0.CreateInferenceRecommendationsJob$)
    .build() {
}

class CreateLabelingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateLabelingJob", {})
    .n("SageMakerClient", "CreateLabelingJobCommand")
    .sc(schemas_0.CreateLabelingJob$)
    .build() {
}

class CreateMlflowAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateMlflowApp", {})
    .n("SageMakerClient", "CreateMlflowAppCommand")
    .sc(schemas_0.CreateMlflowApp$)
    .build() {
}

class CreateMlflowTrackingServerCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateMlflowTrackingServer", {})
    .n("SageMakerClient", "CreateMlflowTrackingServerCommand")
    .sc(schemas_0.CreateMlflowTrackingServer$)
    .build() {
}

class CreateModelBiasJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelBiasJobDefinition", {})
    .n("SageMakerClient", "CreateModelBiasJobDefinitionCommand")
    .sc(schemas_0.CreateModelBiasJobDefinition$)
    .build() {
}

class CreateModelCardCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelCard", {})
    .n("SageMakerClient", "CreateModelCardCommand")
    .sc(schemas_0.CreateModelCard$)
    .build() {
}

class CreateModelCardExportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelCardExportJob", {})
    .n("SageMakerClient", "CreateModelCardExportJobCommand")
    .sc(schemas_0.CreateModelCardExportJob$)
    .build() {
}

class CreateModelCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModel", {})
    .n("SageMakerClient", "CreateModelCommand")
    .sc(schemas_0.CreateModel$)
    .build() {
}

class CreateModelExplainabilityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelExplainabilityJobDefinition", {})
    .n("SageMakerClient", "CreateModelExplainabilityJobDefinitionCommand")
    .sc(schemas_0.CreateModelExplainabilityJobDefinition$)
    .build() {
}

class CreateModelPackageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelPackage", {})
    .n("SageMakerClient", "CreateModelPackageCommand")
    .sc(schemas_0.CreateModelPackage$)
    .build() {
}

class CreateModelPackageGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelPackageGroup", {})
    .n("SageMakerClient", "CreateModelPackageGroupCommand")
    .sc(schemas_0.CreateModelPackageGroup$)
    .build() {
}

class CreateModelQualityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateModelQualityJobDefinition", {})
    .n("SageMakerClient", "CreateModelQualityJobDefinitionCommand")
    .sc(schemas_0.CreateModelQualityJobDefinition$)
    .build() {
}

class CreateMonitoringScheduleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateMonitoringSchedule", {})
    .n("SageMakerClient", "CreateMonitoringScheduleCommand")
    .sc(schemas_0.CreateMonitoringSchedule$)
    .build() {
}

class CreateNotebookInstanceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateNotebookInstance", {})
    .n("SageMakerClient", "CreateNotebookInstanceCommand")
    .sc(schemas_0.CreateNotebookInstance$)
    .build() {
}

class CreateNotebookInstanceLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateNotebookInstanceLifecycleConfig", {})
    .n("SageMakerClient", "CreateNotebookInstanceLifecycleConfigCommand")
    .sc(schemas_0.CreateNotebookInstanceLifecycleConfig$)
    .build() {
}

class CreateOptimizationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateOptimizationJob", {})
    .n("SageMakerClient", "CreateOptimizationJobCommand")
    .sc(schemas_0.CreateOptimizationJob$)
    .build() {
}

class CreatePartnerAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePartnerApp", {})
    .n("SageMakerClient", "CreatePartnerAppCommand")
    .sc(schemas_0.CreatePartnerApp$)
    .build() {
}

class CreatePartnerAppPresignedUrlCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePartnerAppPresignedUrl", {})
    .n("SageMakerClient", "CreatePartnerAppPresignedUrlCommand")
    .sc(schemas_0.CreatePartnerAppPresignedUrl$)
    .build() {
}

class CreatePipelineCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePipeline", {})
    .n("SageMakerClient", "CreatePipelineCommand")
    .sc(schemas_0.CreatePipeline$)
    .build() {
}

class CreatePresignedDomainUrlCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePresignedDomainUrl", {})
    .n("SageMakerClient", "CreatePresignedDomainUrlCommand")
    .sc(schemas_0.CreatePresignedDomainUrl$)
    .build() {
}

class CreatePresignedMlflowAppUrlCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePresignedMlflowAppUrl", {})
    .n("SageMakerClient", "CreatePresignedMlflowAppUrlCommand")
    .sc(schemas_0.CreatePresignedMlflowAppUrl$)
    .build() {
}

class CreatePresignedMlflowTrackingServerUrlCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePresignedMlflowTrackingServerUrl", {})
    .n("SageMakerClient", "CreatePresignedMlflowTrackingServerUrlCommand")
    .sc(schemas_0.CreatePresignedMlflowTrackingServerUrl$)
    .build() {
}

class CreatePresignedNotebookInstanceUrlCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreatePresignedNotebookInstanceUrl", {})
    .n("SageMakerClient", "CreatePresignedNotebookInstanceUrlCommand")
    .sc(schemas_0.CreatePresignedNotebookInstanceUrl$)
    .build() {
}

class CreateProcessingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateProcessingJob", {})
    .n("SageMakerClient", "CreateProcessingJobCommand")
    .sc(schemas_0.CreateProcessingJob$)
    .build() {
}

class CreateProjectCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateProject", {})
    .n("SageMakerClient", "CreateProjectCommand")
    .sc(schemas_0.CreateProject$)
    .build() {
}

class CreateSpaceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateSpace", {})
    .n("SageMakerClient", "CreateSpaceCommand")
    .sc(schemas_0.CreateSpace$)
    .build() {
}

class CreateStudioLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateStudioLifecycleConfig", {})
    .n("SageMakerClient", "CreateStudioLifecycleConfigCommand")
    .sc(schemas_0.CreateStudioLifecycleConfig$)
    .build() {
}

class CreateTrainingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateTrainingJob", {})
    .n("SageMakerClient", "CreateTrainingJobCommand")
    .sc(schemas_0.CreateTrainingJob$)
    .build() {
}

class CreateTrainingPlanCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateTrainingPlan", {})
    .n("SageMakerClient", "CreateTrainingPlanCommand")
    .sc(schemas_0.CreateTrainingPlan$)
    .build() {
}

class CreateTransformJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateTransformJob", {})
    .n("SageMakerClient", "CreateTransformJobCommand")
    .sc(schemas_0.CreateTransformJob$)
    .build() {
}

class CreateTrialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateTrial", {})
    .n("SageMakerClient", "CreateTrialCommand")
    .sc(schemas_0.CreateTrial$)
    .build() {
}

class CreateTrialComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateTrialComponent", {})
    .n("SageMakerClient", "CreateTrialComponentCommand")
    .sc(schemas_0.CreateTrialComponent$)
    .build() {
}

class CreateUserProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateUserProfile", {})
    .n("SageMakerClient", "CreateUserProfileCommand")
    .sc(schemas_0.CreateUserProfile$)
    .build() {
}

class CreateWorkforceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateWorkforce", {})
    .n("SageMakerClient", "CreateWorkforceCommand")
    .sc(schemas_0.CreateWorkforce$)
    .build() {
}

class CreateWorkteamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "CreateWorkteam", {})
    .n("SageMakerClient", "CreateWorkteamCommand")
    .sc(schemas_0.CreateWorkteam$)
    .build() {
}

class DeleteActionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteAction", {})
    .n("SageMakerClient", "DeleteActionCommand")
    .sc(schemas_0.DeleteAction$)
    .build() {
}

class DeleteAlgorithmCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteAlgorithm", {})
    .n("SageMakerClient", "DeleteAlgorithmCommand")
    .sc(schemas_0.DeleteAlgorithm$)
    .build() {
}

class DeleteAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteApp", {})
    .n("SageMakerClient", "DeleteAppCommand")
    .sc(schemas_0.DeleteApp$)
    .build() {
}

class DeleteAppImageConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteAppImageConfig", {})
    .n("SageMakerClient", "DeleteAppImageConfigCommand")
    .sc(schemas_0.DeleteAppImageConfig$)
    .build() {
}

class DeleteArtifactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteArtifact", {})
    .n("SageMakerClient", "DeleteArtifactCommand")
    .sc(schemas_0.DeleteArtifact$)
    .build() {
}

class DeleteAssociationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteAssociation", {})
    .n("SageMakerClient", "DeleteAssociationCommand")
    .sc(schemas_0.DeleteAssociation$)
    .build() {
}

class DeleteClusterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteCluster", {})
    .n("SageMakerClient", "DeleteClusterCommand")
    .sc(schemas_0.DeleteCluster$)
    .build() {
}

class DeleteClusterSchedulerConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteClusterSchedulerConfig", {})
    .n("SageMakerClient", "DeleteClusterSchedulerConfigCommand")
    .sc(schemas_0.DeleteClusterSchedulerConfig$)
    .build() {
}

class DeleteCodeRepositoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteCodeRepository", {})
    .n("SageMakerClient", "DeleteCodeRepositoryCommand")
    .sc(schemas_0.DeleteCodeRepository$)
    .build() {
}

class DeleteCompilationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteCompilationJob", {})
    .n("SageMakerClient", "DeleteCompilationJobCommand")
    .sc(schemas_0.DeleteCompilationJob$)
    .build() {
}

class DeleteComputeQuotaCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteComputeQuota", {})
    .n("SageMakerClient", "DeleteComputeQuotaCommand")
    .sc(schemas_0.DeleteComputeQuota$)
    .build() {
}

class DeleteContextCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteContext", {})
    .n("SageMakerClient", "DeleteContextCommand")
    .sc(schemas_0.DeleteContext$)
    .build() {
}

class DeleteDataQualityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteDataQualityJobDefinition", {})
    .n("SageMakerClient", "DeleteDataQualityJobDefinitionCommand")
    .sc(schemas_0.DeleteDataQualityJobDefinition$)
    .build() {
}

class DeleteDeviceFleetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteDeviceFleet", {})
    .n("SageMakerClient", "DeleteDeviceFleetCommand")
    .sc(schemas_0.DeleteDeviceFleet$)
    .build() {
}

class DeleteDomainCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteDomain", {})
    .n("SageMakerClient", "DeleteDomainCommand")
    .sc(schemas_0.DeleteDomain$)
    .build() {
}

class DeleteEdgeDeploymentPlanCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteEdgeDeploymentPlan", {})
    .n("SageMakerClient", "DeleteEdgeDeploymentPlanCommand")
    .sc(schemas_0.DeleteEdgeDeploymentPlan$)
    .build() {
}

class DeleteEdgeDeploymentStageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteEdgeDeploymentStage", {})
    .n("SageMakerClient", "DeleteEdgeDeploymentStageCommand")
    .sc(schemas_0.DeleteEdgeDeploymentStage$)
    .build() {
}

class DeleteEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteEndpoint", {})
    .n("SageMakerClient", "DeleteEndpointCommand")
    .sc(schemas_0.DeleteEndpoint$)
    .build() {
}

class DeleteEndpointConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteEndpointConfig", {})
    .n("SageMakerClient", "DeleteEndpointConfigCommand")
    .sc(schemas_0.DeleteEndpointConfig$)
    .build() {
}

class DeleteExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteExperiment", {})
    .n("SageMakerClient", "DeleteExperimentCommand")
    .sc(schemas_0.DeleteExperiment$)
    .build() {
}

class DeleteFeatureGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteFeatureGroup", {})
    .n("SageMakerClient", "DeleteFeatureGroupCommand")
    .sc(schemas_0.DeleteFeatureGroup$)
    .build() {
}

class DeleteFlowDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteFlowDefinition", {})
    .n("SageMakerClient", "DeleteFlowDefinitionCommand")
    .sc(schemas_0.DeleteFlowDefinition$)
    .build() {
}

class DeleteHubCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteHub", {})
    .n("SageMakerClient", "DeleteHubCommand")
    .sc(schemas_0.DeleteHub$)
    .build() {
}

class DeleteHubContentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteHubContent", {})
    .n("SageMakerClient", "DeleteHubContentCommand")
    .sc(schemas_0.DeleteHubContent$)
    .build() {
}

class DeleteHubContentReferenceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteHubContentReference", {})
    .n("SageMakerClient", "DeleteHubContentReferenceCommand")
    .sc(schemas_0.DeleteHubContentReference$)
    .build() {
}

class DeleteHumanTaskUiCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteHumanTaskUi", {})
    .n("SageMakerClient", "DeleteHumanTaskUiCommand")
    .sc(schemas_0.DeleteHumanTaskUi$)
    .build() {
}

class DeleteHyperParameterTuningJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteHyperParameterTuningJob", {})
    .n("SageMakerClient", "DeleteHyperParameterTuningJobCommand")
    .sc(schemas_0.DeleteHyperParameterTuningJob$)
    .build() {
}

class DeleteImageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteImage", {})
    .n("SageMakerClient", "DeleteImageCommand")
    .sc(schemas_0.DeleteImage$)
    .build() {
}

class DeleteImageVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteImageVersion", {})
    .n("SageMakerClient", "DeleteImageVersionCommand")
    .sc(schemas_0.DeleteImageVersion$)
    .build() {
}

class DeleteInferenceComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteInferenceComponent", {})
    .n("SageMakerClient", "DeleteInferenceComponentCommand")
    .sc(schemas_0.DeleteInferenceComponent$)
    .build() {
}

class DeleteInferenceExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteInferenceExperiment", {})
    .n("SageMakerClient", "DeleteInferenceExperimentCommand")
    .sc(schemas_0.DeleteInferenceExperiment$)
    .build() {
}

class DeleteMlflowAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteMlflowApp", {})
    .n("SageMakerClient", "DeleteMlflowAppCommand")
    .sc(schemas_0.DeleteMlflowApp$)
    .build() {
}

class DeleteMlflowTrackingServerCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteMlflowTrackingServer", {})
    .n("SageMakerClient", "DeleteMlflowTrackingServerCommand")
    .sc(schemas_0.DeleteMlflowTrackingServer$)
    .build() {
}

class DeleteModelBiasJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelBiasJobDefinition", {})
    .n("SageMakerClient", "DeleteModelBiasJobDefinitionCommand")
    .sc(schemas_0.DeleteModelBiasJobDefinition$)
    .build() {
}

class DeleteModelCardCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelCard", {})
    .n("SageMakerClient", "DeleteModelCardCommand")
    .sc(schemas_0.DeleteModelCard$)
    .build() {
}

class DeleteModelCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModel", {})
    .n("SageMakerClient", "DeleteModelCommand")
    .sc(schemas_0.DeleteModel$)
    .build() {
}

class DeleteModelExplainabilityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelExplainabilityJobDefinition", {})
    .n("SageMakerClient", "DeleteModelExplainabilityJobDefinitionCommand")
    .sc(schemas_0.DeleteModelExplainabilityJobDefinition$)
    .build() {
}

class DeleteModelPackageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelPackage", {})
    .n("SageMakerClient", "DeleteModelPackageCommand")
    .sc(schemas_0.DeleteModelPackage$)
    .build() {
}

class DeleteModelPackageGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelPackageGroup", {})
    .n("SageMakerClient", "DeleteModelPackageGroupCommand")
    .sc(schemas_0.DeleteModelPackageGroup$)
    .build() {
}

class DeleteModelPackageGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelPackageGroupPolicy", {})
    .n("SageMakerClient", "DeleteModelPackageGroupPolicyCommand")
    .sc(schemas_0.DeleteModelPackageGroupPolicy$)
    .build() {
}

class DeleteModelQualityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteModelQualityJobDefinition", {})
    .n("SageMakerClient", "DeleteModelQualityJobDefinitionCommand")
    .sc(schemas_0.DeleteModelQualityJobDefinition$)
    .build() {
}

class DeleteMonitoringScheduleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteMonitoringSchedule", {})
    .n("SageMakerClient", "DeleteMonitoringScheduleCommand")
    .sc(schemas_0.DeleteMonitoringSchedule$)
    .build() {
}

class DeleteNotebookInstanceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteNotebookInstance", {})
    .n("SageMakerClient", "DeleteNotebookInstanceCommand")
    .sc(schemas_0.DeleteNotebookInstance$)
    .build() {
}

class DeleteNotebookInstanceLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteNotebookInstanceLifecycleConfig", {})
    .n("SageMakerClient", "DeleteNotebookInstanceLifecycleConfigCommand")
    .sc(schemas_0.DeleteNotebookInstanceLifecycleConfig$)
    .build() {
}

class DeleteOptimizationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteOptimizationJob", {})
    .n("SageMakerClient", "DeleteOptimizationJobCommand")
    .sc(schemas_0.DeleteOptimizationJob$)
    .build() {
}

class DeletePartnerAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeletePartnerApp", {})
    .n("SageMakerClient", "DeletePartnerAppCommand")
    .sc(schemas_0.DeletePartnerApp$)
    .build() {
}

class DeletePipelineCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeletePipeline", {})
    .n("SageMakerClient", "DeletePipelineCommand")
    .sc(schemas_0.DeletePipeline$)
    .build() {
}

class DeleteProcessingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteProcessingJob", {})
    .n("SageMakerClient", "DeleteProcessingJobCommand")
    .sc(schemas_0.DeleteProcessingJob$)
    .build() {
}

class DeleteProjectCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteProject", {})
    .n("SageMakerClient", "DeleteProjectCommand")
    .sc(schemas_0.DeleteProject$)
    .build() {
}

class DeleteSpaceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteSpace", {})
    .n("SageMakerClient", "DeleteSpaceCommand")
    .sc(schemas_0.DeleteSpace$)
    .build() {
}

class DeleteStudioLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteStudioLifecycleConfig", {})
    .n("SageMakerClient", "DeleteStudioLifecycleConfigCommand")
    .sc(schemas_0.DeleteStudioLifecycleConfig$)
    .build() {
}

class DeleteTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteTags", {})
    .n("SageMakerClient", "DeleteTagsCommand")
    .sc(schemas_0.DeleteTags$)
    .build() {
}

class DeleteTrainingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteTrainingJob", {})
    .n("SageMakerClient", "DeleteTrainingJobCommand")
    .sc(schemas_0.DeleteTrainingJob$)
    .build() {
}

class DeleteTrialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteTrial", {})
    .n("SageMakerClient", "DeleteTrialCommand")
    .sc(schemas_0.DeleteTrial$)
    .build() {
}

class DeleteTrialComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteTrialComponent", {})
    .n("SageMakerClient", "DeleteTrialComponentCommand")
    .sc(schemas_0.DeleteTrialComponent$)
    .build() {
}

class DeleteUserProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteUserProfile", {})
    .n("SageMakerClient", "DeleteUserProfileCommand")
    .sc(schemas_0.DeleteUserProfile$)
    .build() {
}

class DeleteWorkforceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteWorkforce", {})
    .n("SageMakerClient", "DeleteWorkforceCommand")
    .sc(schemas_0.DeleteWorkforce$)
    .build() {
}

class DeleteWorkteamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeleteWorkteam", {})
    .n("SageMakerClient", "DeleteWorkteamCommand")
    .sc(schemas_0.DeleteWorkteam$)
    .build() {
}

class DeregisterDevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DeregisterDevices", {})
    .n("SageMakerClient", "DeregisterDevicesCommand")
    .sc(schemas_0.DeregisterDevices$)
    .build() {
}

class DescribeActionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAction", {})
    .n("SageMakerClient", "DescribeActionCommand")
    .sc(schemas_0.DescribeAction$)
    .build() {
}

class DescribeAlgorithmCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAlgorithm", {})
    .n("SageMakerClient", "DescribeAlgorithmCommand")
    .sc(schemas_0.DescribeAlgorithm$)
    .build() {
}

class DescribeAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeApp", {})
    .n("SageMakerClient", "DescribeAppCommand")
    .sc(schemas_0.DescribeApp$)
    .build() {
}

class DescribeAppImageConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAppImageConfig", {})
    .n("SageMakerClient", "DescribeAppImageConfigCommand")
    .sc(schemas_0.DescribeAppImageConfig$)
    .build() {
}

class DescribeArtifactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeArtifact", {})
    .n("SageMakerClient", "DescribeArtifactCommand")
    .sc(schemas_0.DescribeArtifact$)
    .build() {
}

class DescribeAutoMLJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAutoMLJob", {})
    .n("SageMakerClient", "DescribeAutoMLJobCommand")
    .sc(schemas_0.DescribeAutoMLJob$)
    .build() {
}

class DescribeAutoMLJobV2Command extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeAutoMLJobV2", {})
    .n("SageMakerClient", "DescribeAutoMLJobV2Command")
    .sc(schemas_0.DescribeAutoMLJobV2$)
    .build() {
}

class DescribeClusterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeCluster", {})
    .n("SageMakerClient", "DescribeClusterCommand")
    .sc(schemas_0.DescribeCluster$)
    .build() {
}

class DescribeClusterEventCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeClusterEvent", {})
    .n("SageMakerClient", "DescribeClusterEventCommand")
    .sc(schemas_0.DescribeClusterEvent$)
    .build() {
}

class DescribeClusterNodeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeClusterNode", {})
    .n("SageMakerClient", "DescribeClusterNodeCommand")
    .sc(schemas_0.DescribeClusterNode$)
    .build() {
}

class DescribeClusterSchedulerConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeClusterSchedulerConfig", {})
    .n("SageMakerClient", "DescribeClusterSchedulerConfigCommand")
    .sc(schemas_0.DescribeClusterSchedulerConfig$)
    .build() {
}

class DescribeCodeRepositoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeCodeRepository", {})
    .n("SageMakerClient", "DescribeCodeRepositoryCommand")
    .sc(schemas_0.DescribeCodeRepository$)
    .build() {
}

class DescribeCompilationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeCompilationJob", {})
    .n("SageMakerClient", "DescribeCompilationJobCommand")
    .sc(schemas_0.DescribeCompilationJob$)
    .build() {
}

class DescribeComputeQuotaCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeComputeQuota", {})
    .n("SageMakerClient", "DescribeComputeQuotaCommand")
    .sc(schemas_0.DescribeComputeQuota$)
    .build() {
}

class DescribeContextCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeContext", {})
    .n("SageMakerClient", "DescribeContextCommand")
    .sc(schemas_0.DescribeContext$)
    .build() {
}

class DescribeDataQualityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeDataQualityJobDefinition", {})
    .n("SageMakerClient", "DescribeDataQualityJobDefinitionCommand")
    .sc(schemas_0.DescribeDataQualityJobDefinition$)
    .build() {
}

class DescribeDeviceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeDevice", {})
    .n("SageMakerClient", "DescribeDeviceCommand")
    .sc(schemas_0.DescribeDevice$)
    .build() {
}

class DescribeDeviceFleetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeDeviceFleet", {})
    .n("SageMakerClient", "DescribeDeviceFleetCommand")
    .sc(schemas_0.DescribeDeviceFleet$)
    .build() {
}

class DescribeDomainCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeDomain", {})
    .n("SageMakerClient", "DescribeDomainCommand")
    .sc(schemas_0.DescribeDomain$)
    .build() {
}

class DescribeEdgeDeploymentPlanCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeEdgeDeploymentPlan", {})
    .n("SageMakerClient", "DescribeEdgeDeploymentPlanCommand")
    .sc(schemas_0.DescribeEdgeDeploymentPlan$)
    .build() {
}

class DescribeEdgePackagingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeEdgePackagingJob", {})
    .n("SageMakerClient", "DescribeEdgePackagingJobCommand")
    .sc(schemas_0.DescribeEdgePackagingJob$)
    .build() {
}

class DescribeEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeEndpoint", {})
    .n("SageMakerClient", "DescribeEndpointCommand")
    .sc(schemas_0.DescribeEndpoint$)
    .build() {
}

class DescribeEndpointConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeEndpointConfig", {})
    .n("SageMakerClient", "DescribeEndpointConfigCommand")
    .sc(schemas_0.DescribeEndpointConfig$)
    .build() {
}

class DescribeExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeExperiment", {})
    .n("SageMakerClient", "DescribeExperimentCommand")
    .sc(schemas_0.DescribeExperiment$)
    .build() {
}

class DescribeFeatureGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeFeatureGroup", {})
    .n("SageMakerClient", "DescribeFeatureGroupCommand")
    .sc(schemas_0.DescribeFeatureGroup$)
    .build() {
}

class DescribeFeatureMetadataCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeFeatureMetadata", {})
    .n("SageMakerClient", "DescribeFeatureMetadataCommand")
    .sc(schemas_0.DescribeFeatureMetadata$)
    .build() {
}

class DescribeFlowDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeFlowDefinition", {})
    .n("SageMakerClient", "DescribeFlowDefinitionCommand")
    .sc(schemas_0.DescribeFlowDefinition$)
    .build() {
}

class DescribeHubCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeHub", {})
    .n("SageMakerClient", "DescribeHubCommand")
    .sc(schemas_0.DescribeHub$)
    .build() {
}

class DescribeHubContentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeHubContent", {})
    .n("SageMakerClient", "DescribeHubContentCommand")
    .sc(schemas_0.DescribeHubContent$)
    .build() {
}

class DescribeHumanTaskUiCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeHumanTaskUi", {})
    .n("SageMakerClient", "DescribeHumanTaskUiCommand")
    .sc(schemas_0.DescribeHumanTaskUi$)
    .build() {
}

class DescribeHyperParameterTuningJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeHyperParameterTuningJob", {})
    .n("SageMakerClient", "DescribeHyperParameterTuningJobCommand")
    .sc(schemas_0.DescribeHyperParameterTuningJob$)
    .build() {
}

class DescribeImageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeImage", {})
    .n("SageMakerClient", "DescribeImageCommand")
    .sc(schemas_0.DescribeImage$)
    .build() {
}

class DescribeImageVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeImageVersion", {})
    .n("SageMakerClient", "DescribeImageVersionCommand")
    .sc(schemas_0.DescribeImageVersion$)
    .build() {
}

class DescribeInferenceComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeInferenceComponent", {})
    .n("SageMakerClient", "DescribeInferenceComponentCommand")
    .sc(schemas_0.DescribeInferenceComponent$)
    .build() {
}

class DescribeInferenceExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeInferenceExperiment", {})
    .n("SageMakerClient", "DescribeInferenceExperimentCommand")
    .sc(schemas_0.DescribeInferenceExperiment$)
    .build() {
}

class DescribeInferenceRecommendationsJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeInferenceRecommendationsJob", {})
    .n("SageMakerClient", "DescribeInferenceRecommendationsJobCommand")
    .sc(schemas_0.DescribeInferenceRecommendationsJob$)
    .build() {
}

class DescribeLabelingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeLabelingJob", {})
    .n("SageMakerClient", "DescribeLabelingJobCommand")
    .sc(schemas_0.DescribeLabelingJob$)
    .build() {
}

class DescribeLineageGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeLineageGroup", {})
    .n("SageMakerClient", "DescribeLineageGroupCommand")
    .sc(schemas_0.DescribeLineageGroup$)
    .build() {
}

class DescribeMlflowAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeMlflowApp", {})
    .n("SageMakerClient", "DescribeMlflowAppCommand")
    .sc(schemas_0.DescribeMlflowApp$)
    .build() {
}

class DescribeMlflowTrackingServerCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeMlflowTrackingServer", {})
    .n("SageMakerClient", "DescribeMlflowTrackingServerCommand")
    .sc(schemas_0.DescribeMlflowTrackingServer$)
    .build() {
}

class DescribeModelBiasJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelBiasJobDefinition", {})
    .n("SageMakerClient", "DescribeModelBiasJobDefinitionCommand")
    .sc(schemas_0.DescribeModelBiasJobDefinition$)
    .build() {
}

class DescribeModelCardCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelCard", {})
    .n("SageMakerClient", "DescribeModelCardCommand")
    .sc(schemas_0.DescribeModelCard$)
    .build() {
}

class DescribeModelCardExportJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelCardExportJob", {})
    .n("SageMakerClient", "DescribeModelCardExportJobCommand")
    .sc(schemas_0.DescribeModelCardExportJob$)
    .build() {
}

class DescribeModelCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModel", {})
    .n("SageMakerClient", "DescribeModelCommand")
    .sc(schemas_0.DescribeModel$)
    .build() {
}

class DescribeModelExplainabilityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelExplainabilityJobDefinition", {})
    .n("SageMakerClient", "DescribeModelExplainabilityJobDefinitionCommand")
    .sc(schemas_0.DescribeModelExplainabilityJobDefinition$)
    .build() {
}

class DescribeModelPackageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelPackage", {})
    .n("SageMakerClient", "DescribeModelPackageCommand")
    .sc(schemas_0.DescribeModelPackage$)
    .build() {
}

class DescribeModelPackageGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelPackageGroup", {})
    .n("SageMakerClient", "DescribeModelPackageGroupCommand")
    .sc(schemas_0.DescribeModelPackageGroup$)
    .build() {
}

class DescribeModelQualityJobDefinitionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeModelQualityJobDefinition", {})
    .n("SageMakerClient", "DescribeModelQualityJobDefinitionCommand")
    .sc(schemas_0.DescribeModelQualityJobDefinition$)
    .build() {
}

class DescribeMonitoringScheduleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeMonitoringSchedule", {})
    .n("SageMakerClient", "DescribeMonitoringScheduleCommand")
    .sc(schemas_0.DescribeMonitoringSchedule$)
    .build() {
}

class DescribeNotebookInstanceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeNotebookInstance", {})
    .n("SageMakerClient", "DescribeNotebookInstanceCommand")
    .sc(schemas_0.DescribeNotebookInstance$)
    .build() {
}

class DescribeNotebookInstanceLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeNotebookInstanceLifecycleConfig", {})
    .n("SageMakerClient", "DescribeNotebookInstanceLifecycleConfigCommand")
    .sc(schemas_0.DescribeNotebookInstanceLifecycleConfig$)
    .build() {
}

class DescribeOptimizationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeOptimizationJob", {})
    .n("SageMakerClient", "DescribeOptimizationJobCommand")
    .sc(schemas_0.DescribeOptimizationJob$)
    .build() {
}

class DescribePartnerAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribePartnerApp", {})
    .n("SageMakerClient", "DescribePartnerAppCommand")
    .sc(schemas_0.DescribePartnerApp$)
    .build() {
}

class DescribePipelineCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribePipeline", {})
    .n("SageMakerClient", "DescribePipelineCommand")
    .sc(schemas_0.DescribePipeline$)
    .build() {
}

class DescribePipelineDefinitionForExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribePipelineDefinitionForExecution", {})
    .n("SageMakerClient", "DescribePipelineDefinitionForExecutionCommand")
    .sc(schemas_0.DescribePipelineDefinitionForExecution$)
    .build() {
}

class DescribePipelineExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribePipelineExecution", {})
    .n("SageMakerClient", "DescribePipelineExecutionCommand")
    .sc(schemas_0.DescribePipelineExecution$)
    .build() {
}

class DescribeProcessingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeProcessingJob", {})
    .n("SageMakerClient", "DescribeProcessingJobCommand")
    .sc(schemas_0.DescribeProcessingJob$)
    .build() {
}

class DescribeProjectCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeProject", {})
    .n("SageMakerClient", "DescribeProjectCommand")
    .sc(schemas_0.DescribeProject$)
    .build() {
}

class DescribeReservedCapacityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeReservedCapacity", {})
    .n("SageMakerClient", "DescribeReservedCapacityCommand")
    .sc(schemas_0.DescribeReservedCapacity$)
    .build() {
}

class DescribeSpaceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeSpace", {})
    .n("SageMakerClient", "DescribeSpaceCommand")
    .sc(schemas_0.DescribeSpace$)
    .build() {
}

class DescribeStudioLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeStudioLifecycleConfig", {})
    .n("SageMakerClient", "DescribeStudioLifecycleConfigCommand")
    .sc(schemas_0.DescribeStudioLifecycleConfig$)
    .build() {
}

class DescribeSubscribedWorkteamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeSubscribedWorkteam", {})
    .n("SageMakerClient", "DescribeSubscribedWorkteamCommand")
    .sc(schemas_0.DescribeSubscribedWorkteam$)
    .build() {
}

class DescribeTrainingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTrainingJob", {})
    .n("SageMakerClient", "DescribeTrainingJobCommand")
    .sc(schemas_0.DescribeTrainingJob$)
    .build() {
}

class DescribeTrainingPlanCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTrainingPlan", {})
    .n("SageMakerClient", "DescribeTrainingPlanCommand")
    .sc(schemas_0.DescribeTrainingPlan$)
    .build() {
}

class DescribeTrainingPlanExtensionHistoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTrainingPlanExtensionHistory", {})
    .n("SageMakerClient", "DescribeTrainingPlanExtensionHistoryCommand")
    .sc(schemas_0.DescribeTrainingPlanExtensionHistory$)
    .build() {
}

class DescribeTransformJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTransformJob", {})
    .n("SageMakerClient", "DescribeTransformJobCommand")
    .sc(schemas_0.DescribeTransformJob$)
    .build() {
}

class DescribeTrialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTrial", {})
    .n("SageMakerClient", "DescribeTrialCommand")
    .sc(schemas_0.DescribeTrial$)
    .build() {
}

class DescribeTrialComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeTrialComponent", {})
    .n("SageMakerClient", "DescribeTrialComponentCommand")
    .sc(schemas_0.DescribeTrialComponent$)
    .build() {
}

class DescribeUserProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeUserProfile", {})
    .n("SageMakerClient", "DescribeUserProfileCommand")
    .sc(schemas_0.DescribeUserProfile$)
    .build() {
}

class DescribeWorkforceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeWorkforce", {})
    .n("SageMakerClient", "DescribeWorkforceCommand")
    .sc(schemas_0.DescribeWorkforce$)
    .build() {
}

class DescribeWorkteamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DescribeWorkteam", {})
    .n("SageMakerClient", "DescribeWorkteamCommand")
    .sc(schemas_0.DescribeWorkteam$)
    .build() {
}

class DetachClusterNodeVolumeCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DetachClusterNodeVolume", {})
    .n("SageMakerClient", "DetachClusterNodeVolumeCommand")
    .sc(schemas_0.DetachClusterNodeVolume$)
    .build() {
}

class DisableSagemakerServicecatalogPortfolioCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DisableSagemakerServicecatalogPortfolio", {})
    .n("SageMakerClient", "DisableSagemakerServicecatalogPortfolioCommand")
    .sc(schemas_0.DisableSagemakerServicecatalogPortfolio$)
    .build() {
}

class DisassociateTrialComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "DisassociateTrialComponent", {})
    .n("SageMakerClient", "DisassociateTrialComponentCommand")
    .sc(schemas_0.DisassociateTrialComponent$)
    .build() {
}

class EnableSagemakerServicecatalogPortfolioCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "EnableSagemakerServicecatalogPortfolio", {})
    .n("SageMakerClient", "EnableSagemakerServicecatalogPortfolioCommand")
    .sc(schemas_0.EnableSagemakerServicecatalogPortfolio$)
    .build() {
}

class ExtendTrainingPlanCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ExtendTrainingPlan", {})
    .n("SageMakerClient", "ExtendTrainingPlanCommand")
    .sc(schemas_0.ExtendTrainingPlan$)
    .build() {
}

class GetDeviceFleetReportCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetDeviceFleetReport", {})
    .n("SageMakerClient", "GetDeviceFleetReportCommand")
    .sc(schemas_0.GetDeviceFleetReport$)
    .build() {
}

class GetLineageGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetLineageGroupPolicy", {})
    .n("SageMakerClient", "GetLineageGroupPolicyCommand")
    .sc(schemas_0.GetLineageGroupPolicy$)
    .build() {
}

class GetModelPackageGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetModelPackageGroupPolicy", {})
    .n("SageMakerClient", "GetModelPackageGroupPolicyCommand")
    .sc(schemas_0.GetModelPackageGroupPolicy$)
    .build() {
}

class GetSagemakerServicecatalogPortfolioStatusCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetSagemakerServicecatalogPortfolioStatus", {})
    .n("SageMakerClient", "GetSagemakerServicecatalogPortfolioStatusCommand")
    .sc(schemas_0.GetSagemakerServicecatalogPortfolioStatus$)
    .build() {
}

class GetScalingConfigurationRecommendationCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetScalingConfigurationRecommendation", {})
    .n("SageMakerClient", "GetScalingConfigurationRecommendationCommand")
    .sc(schemas_0.GetScalingConfigurationRecommendation$)
    .build() {
}

class GetSearchSuggestionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "GetSearchSuggestions", {})
    .n("SageMakerClient", "GetSearchSuggestionsCommand")
    .sc(schemas_0.GetSearchSuggestions$)
    .build() {
}

class ImportHubContentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ImportHubContent", {})
    .n("SageMakerClient", "ImportHubContentCommand")
    .sc(schemas_0.ImportHubContent$)
    .build() {
}

class ListActionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListActions", {})
    .n("SageMakerClient", "ListActionsCommand")
    .sc(schemas_0.ListActions$)
    .build() {
}

class ListAlgorithmsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListAlgorithms", {})
    .n("SageMakerClient", "ListAlgorithmsCommand")
    .sc(schemas_0.ListAlgorithms$)
    .build() {
}

class ListAliasesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListAliases", {})
    .n("SageMakerClient", "ListAliasesCommand")
    .sc(schemas_0.ListAliases$)
    .build() {
}

class ListAppImageConfigsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListAppImageConfigs", {})
    .n("SageMakerClient", "ListAppImageConfigsCommand")
    .sc(schemas_0.ListAppImageConfigs$)
    .build() {
}

class ListAppsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListApps", {})
    .n("SageMakerClient", "ListAppsCommand")
    .sc(schemas_0.ListApps$)
    .build() {
}

class ListArtifactsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListArtifacts", {})
    .n("SageMakerClient", "ListArtifactsCommand")
    .sc(schemas_0.ListArtifacts$)
    .build() {
}

class ListAssociationsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListAssociations", {})
    .n("SageMakerClient", "ListAssociationsCommand")
    .sc(schemas_0.ListAssociations$)
    .build() {
}

class ListAutoMLJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListAutoMLJobs", {})
    .n("SageMakerClient", "ListAutoMLJobsCommand")
    .sc(schemas_0.ListAutoMLJobs$)
    .build() {
}

class ListCandidatesForAutoMLJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListCandidatesForAutoMLJob", {})
    .n("SageMakerClient", "ListCandidatesForAutoMLJobCommand")
    .sc(schemas_0.ListCandidatesForAutoMLJob$)
    .build() {
}

class ListClusterEventsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListClusterEvents", {})
    .n("SageMakerClient", "ListClusterEventsCommand")
    .sc(schemas_0.ListClusterEvents$)
    .build() {
}

class ListClusterNodesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListClusterNodes", {})
    .n("SageMakerClient", "ListClusterNodesCommand")
    .sc(schemas_0.ListClusterNodes$)
    .build() {
}

class ListClusterSchedulerConfigsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListClusterSchedulerConfigs", {})
    .n("SageMakerClient", "ListClusterSchedulerConfigsCommand")
    .sc(schemas_0.ListClusterSchedulerConfigs$)
    .build() {
}

class ListClustersCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListClusters", {})
    .n("SageMakerClient", "ListClustersCommand")
    .sc(schemas_0.ListClusters$)
    .build() {
}

class ListCodeRepositoriesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListCodeRepositories", {})
    .n("SageMakerClient", "ListCodeRepositoriesCommand")
    .sc(schemas_0.ListCodeRepositories$)
    .build() {
}

class ListCompilationJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListCompilationJobs", {})
    .n("SageMakerClient", "ListCompilationJobsCommand")
    .sc(schemas_0.ListCompilationJobs$)
    .build() {
}

class ListComputeQuotasCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListComputeQuotas", {})
    .n("SageMakerClient", "ListComputeQuotasCommand")
    .sc(schemas_0.ListComputeQuotas$)
    .build() {
}

class ListContextsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListContexts", {})
    .n("SageMakerClient", "ListContextsCommand")
    .sc(schemas_0.ListContexts$)
    .build() {
}

class ListDataQualityJobDefinitionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListDataQualityJobDefinitions", {})
    .n("SageMakerClient", "ListDataQualityJobDefinitionsCommand")
    .sc(schemas_0.ListDataQualityJobDefinitions$)
    .build() {
}

class ListDeviceFleetsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListDeviceFleets", {})
    .n("SageMakerClient", "ListDeviceFleetsCommand")
    .sc(schemas_0.ListDeviceFleets$)
    .build() {
}

class ListDevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListDevices", {})
    .n("SageMakerClient", "ListDevicesCommand")
    .sc(schemas_0.ListDevices$)
    .build() {
}

class ListDomainsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListDomains", {})
    .n("SageMakerClient", "ListDomainsCommand")
    .sc(schemas_0.ListDomains$)
    .build() {
}

class ListEdgeDeploymentPlansCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListEdgeDeploymentPlans", {})
    .n("SageMakerClient", "ListEdgeDeploymentPlansCommand")
    .sc(schemas_0.ListEdgeDeploymentPlans$)
    .build() {
}

class ListEdgePackagingJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListEdgePackagingJobs", {})
    .n("SageMakerClient", "ListEdgePackagingJobsCommand")
    .sc(schemas_0.ListEdgePackagingJobs$)
    .build() {
}

class ListEndpointConfigsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListEndpointConfigs", {})
    .n("SageMakerClient", "ListEndpointConfigsCommand")
    .sc(schemas_0.ListEndpointConfigs$)
    .build() {
}

class ListEndpointsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListEndpoints", {})
    .n("SageMakerClient", "ListEndpointsCommand")
    .sc(schemas_0.ListEndpoints$)
    .build() {
}

class ListExperimentsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListExperiments", {})
    .n("SageMakerClient", "ListExperimentsCommand")
    .sc(schemas_0.ListExperiments$)
    .build() {
}

class ListFeatureGroupsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListFeatureGroups", {})
    .n("SageMakerClient", "ListFeatureGroupsCommand")
    .sc(schemas_0.ListFeatureGroups$)
    .build() {
}

class ListFlowDefinitionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListFlowDefinitions", {})
    .n("SageMakerClient", "ListFlowDefinitionsCommand")
    .sc(schemas_0.ListFlowDefinitions$)
    .build() {
}

class ListHubContentsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListHubContents", {})
    .n("SageMakerClient", "ListHubContentsCommand")
    .sc(schemas_0.ListHubContents$)
    .build() {
}

class ListHubContentVersionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListHubContentVersions", {})
    .n("SageMakerClient", "ListHubContentVersionsCommand")
    .sc(schemas_0.ListHubContentVersions$)
    .build() {
}

class ListHubsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListHubs", {})
    .n("SageMakerClient", "ListHubsCommand")
    .sc(schemas_0.ListHubs$)
    .build() {
}

class ListHumanTaskUisCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListHumanTaskUis", {})
    .n("SageMakerClient", "ListHumanTaskUisCommand")
    .sc(schemas_0.ListHumanTaskUis$)
    .build() {
}

class ListHyperParameterTuningJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListHyperParameterTuningJobs", {})
    .n("SageMakerClient", "ListHyperParameterTuningJobsCommand")
    .sc(schemas_0.ListHyperParameterTuningJobs$)
    .build() {
}

class ListImagesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListImages", {})
    .n("SageMakerClient", "ListImagesCommand")
    .sc(schemas_0.ListImages$)
    .build() {
}

class ListImageVersionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListImageVersions", {})
    .n("SageMakerClient", "ListImageVersionsCommand")
    .sc(schemas_0.ListImageVersions$)
    .build() {
}

class ListInferenceComponentsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListInferenceComponents", {})
    .n("SageMakerClient", "ListInferenceComponentsCommand")
    .sc(schemas_0.ListInferenceComponents$)
    .build() {
}

class ListInferenceExperimentsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListInferenceExperiments", {})
    .n("SageMakerClient", "ListInferenceExperimentsCommand")
    .sc(schemas_0.ListInferenceExperiments$)
    .build() {
}

class ListInferenceRecommendationsJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListInferenceRecommendationsJobs", {})
    .n("SageMakerClient", "ListInferenceRecommendationsJobsCommand")
    .sc(schemas_0.ListInferenceRecommendationsJobs$)
    .build() {
}

class ListInferenceRecommendationsJobStepsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListInferenceRecommendationsJobSteps", {})
    .n("SageMakerClient", "ListInferenceRecommendationsJobStepsCommand")
    .sc(schemas_0.ListInferenceRecommendationsJobSteps$)
    .build() {
}

class ListLabelingJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListLabelingJobs", {})
    .n("SageMakerClient", "ListLabelingJobsCommand")
    .sc(schemas_0.ListLabelingJobs$)
    .build() {
}

class ListLabelingJobsForWorkteamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListLabelingJobsForWorkteam", {})
    .n("SageMakerClient", "ListLabelingJobsForWorkteamCommand")
    .sc(schemas_0.ListLabelingJobsForWorkteam$)
    .build() {
}

class ListLineageGroupsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListLineageGroups", {})
    .n("SageMakerClient", "ListLineageGroupsCommand")
    .sc(schemas_0.ListLineageGroups$)
    .build() {
}

class ListMlflowAppsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMlflowApps", {})
    .n("SageMakerClient", "ListMlflowAppsCommand")
    .sc(schemas_0.ListMlflowApps$)
    .build() {
}

class ListMlflowTrackingServersCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMlflowTrackingServers", {})
    .n("SageMakerClient", "ListMlflowTrackingServersCommand")
    .sc(schemas_0.ListMlflowTrackingServers$)
    .build() {
}

class ListModelBiasJobDefinitionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelBiasJobDefinitions", {})
    .n("SageMakerClient", "ListModelBiasJobDefinitionsCommand")
    .sc(schemas_0.ListModelBiasJobDefinitions$)
    .build() {
}

class ListModelCardExportJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelCardExportJobs", {})
    .n("SageMakerClient", "ListModelCardExportJobsCommand")
    .sc(schemas_0.ListModelCardExportJobs$)
    .build() {
}

class ListModelCardsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelCards", {})
    .n("SageMakerClient", "ListModelCardsCommand")
    .sc(schemas_0.ListModelCards$)
    .build() {
}

class ListModelCardVersionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelCardVersions", {})
    .n("SageMakerClient", "ListModelCardVersionsCommand")
    .sc(schemas_0.ListModelCardVersions$)
    .build() {
}

class ListModelExplainabilityJobDefinitionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelExplainabilityJobDefinitions", {})
    .n("SageMakerClient", "ListModelExplainabilityJobDefinitionsCommand")
    .sc(schemas_0.ListModelExplainabilityJobDefinitions$)
    .build() {
}

class ListModelMetadataCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelMetadata", {})
    .n("SageMakerClient", "ListModelMetadataCommand")
    .sc(schemas_0.ListModelMetadata$)
    .build() {
}

class ListModelPackageGroupsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelPackageGroups", {})
    .n("SageMakerClient", "ListModelPackageGroupsCommand")
    .sc(schemas_0.ListModelPackageGroups$)
    .build() {
}

class ListModelPackagesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelPackages", {})
    .n("SageMakerClient", "ListModelPackagesCommand")
    .sc(schemas_0.ListModelPackages$)
    .build() {
}

class ListModelQualityJobDefinitionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModelQualityJobDefinitions", {})
    .n("SageMakerClient", "ListModelQualityJobDefinitionsCommand")
    .sc(schemas_0.ListModelQualityJobDefinitions$)
    .build() {
}

class ListModelsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListModels", {})
    .n("SageMakerClient", "ListModelsCommand")
    .sc(schemas_0.ListModels$)
    .build() {
}

class ListMonitoringAlertHistoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMonitoringAlertHistory", {})
    .n("SageMakerClient", "ListMonitoringAlertHistoryCommand")
    .sc(schemas_0.ListMonitoringAlertHistory$)
    .build() {
}

class ListMonitoringAlertsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMonitoringAlerts", {})
    .n("SageMakerClient", "ListMonitoringAlertsCommand")
    .sc(schemas_0.ListMonitoringAlerts$)
    .build() {
}

class ListMonitoringExecutionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMonitoringExecutions", {})
    .n("SageMakerClient", "ListMonitoringExecutionsCommand")
    .sc(schemas_0.ListMonitoringExecutions$)
    .build() {
}

class ListMonitoringSchedulesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListMonitoringSchedules", {})
    .n("SageMakerClient", "ListMonitoringSchedulesCommand")
    .sc(schemas_0.ListMonitoringSchedules$)
    .build() {
}

class ListNotebookInstanceLifecycleConfigsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListNotebookInstanceLifecycleConfigs", {})
    .n("SageMakerClient", "ListNotebookInstanceLifecycleConfigsCommand")
    .sc(schemas_0.ListNotebookInstanceLifecycleConfigs$)
    .build() {
}

class ListNotebookInstancesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListNotebookInstances", {})
    .n("SageMakerClient", "ListNotebookInstancesCommand")
    .sc(schemas_0.ListNotebookInstances$)
    .build() {
}

class ListOptimizationJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListOptimizationJobs", {})
    .n("SageMakerClient", "ListOptimizationJobsCommand")
    .sc(schemas_0.ListOptimizationJobs$)
    .build() {
}

class ListPartnerAppsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListPartnerApps", {})
    .n("SageMakerClient", "ListPartnerAppsCommand")
    .sc(schemas_0.ListPartnerApps$)
    .build() {
}

class ListPipelineExecutionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListPipelineExecutions", {})
    .n("SageMakerClient", "ListPipelineExecutionsCommand")
    .sc(schemas_0.ListPipelineExecutions$)
    .build() {
}

class ListPipelineExecutionStepsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListPipelineExecutionSteps", {})
    .n("SageMakerClient", "ListPipelineExecutionStepsCommand")
    .sc(schemas_0.ListPipelineExecutionSteps$)
    .build() {
}

class ListPipelineParametersForExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListPipelineParametersForExecution", {})
    .n("SageMakerClient", "ListPipelineParametersForExecutionCommand")
    .sc(schemas_0.ListPipelineParametersForExecution$)
    .build() {
}

class ListPipelinesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListPipelines", {})
    .n("SageMakerClient", "ListPipelinesCommand")
    .sc(schemas_0.ListPipelines$)
    .build() {
}

class ListPipelineVersionsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListPipelineVersions", {})
    .n("SageMakerClient", "ListPipelineVersionsCommand")
    .sc(schemas_0.ListPipelineVersions$)
    .build() {
}

class ListProcessingJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListProcessingJobs", {})
    .n("SageMakerClient", "ListProcessingJobsCommand")
    .sc(schemas_0.ListProcessingJobs$)
    .build() {
}

class ListProjectsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListProjects", {})
    .n("SageMakerClient", "ListProjectsCommand")
    .sc(schemas_0.ListProjects$)
    .build() {
}

class ListResourceCatalogsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListResourceCatalogs", {})
    .n("SageMakerClient", "ListResourceCatalogsCommand")
    .sc(schemas_0.ListResourceCatalogs$)
    .build() {
}

class ListSpacesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListSpaces", {})
    .n("SageMakerClient", "ListSpacesCommand")
    .sc(schemas_0.ListSpaces$)
    .build() {
}

class ListStageDevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListStageDevices", {})
    .n("SageMakerClient", "ListStageDevicesCommand")
    .sc(schemas_0.ListStageDevices$)
    .build() {
}

class ListStudioLifecycleConfigsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListStudioLifecycleConfigs", {})
    .n("SageMakerClient", "ListStudioLifecycleConfigsCommand")
    .sc(schemas_0.ListStudioLifecycleConfigs$)
    .build() {
}

class ListSubscribedWorkteamsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListSubscribedWorkteams", {})
    .n("SageMakerClient", "ListSubscribedWorkteamsCommand")
    .sc(schemas_0.ListSubscribedWorkteams$)
    .build() {
}

class ListTagsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTags", {})
    .n("SageMakerClient", "ListTagsCommand")
    .sc(schemas_0.ListTags$)
    .build() {
}

class ListTrainingJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTrainingJobs", {})
    .n("SageMakerClient", "ListTrainingJobsCommand")
    .sc(schemas_0.ListTrainingJobs$)
    .build() {
}

class ListTrainingJobsForHyperParameterTuningJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTrainingJobsForHyperParameterTuningJob", {})
    .n("SageMakerClient", "ListTrainingJobsForHyperParameterTuningJobCommand")
    .sc(schemas_0.ListTrainingJobsForHyperParameterTuningJob$)
    .build() {
}

class ListTrainingPlansCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTrainingPlans", {})
    .n("SageMakerClient", "ListTrainingPlansCommand")
    .sc(schemas_0.ListTrainingPlans$)
    .build() {
}

class ListTransformJobsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTransformJobs", {})
    .n("SageMakerClient", "ListTransformJobsCommand")
    .sc(schemas_0.ListTransformJobs$)
    .build() {
}

class ListTrialComponentsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTrialComponents", {})
    .n("SageMakerClient", "ListTrialComponentsCommand")
    .sc(schemas_0.ListTrialComponents$)
    .build() {
}

class ListTrialsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListTrials", {})
    .n("SageMakerClient", "ListTrialsCommand")
    .sc(schemas_0.ListTrials$)
    .build() {
}

class ListUltraServersByReservedCapacityCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListUltraServersByReservedCapacity", {})
    .n("SageMakerClient", "ListUltraServersByReservedCapacityCommand")
    .sc(schemas_0.ListUltraServersByReservedCapacity$)
    .build() {
}

class ListUserProfilesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListUserProfiles", {})
    .n("SageMakerClient", "ListUserProfilesCommand")
    .sc(schemas_0.ListUserProfiles$)
    .build() {
}

class ListWorkforcesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListWorkforces", {})
    .n("SageMakerClient", "ListWorkforcesCommand")
    .sc(schemas_0.ListWorkforces$)
    .build() {
}

class ListWorkteamsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "ListWorkteams", {})
    .n("SageMakerClient", "ListWorkteamsCommand")
    .sc(schemas_0.ListWorkteams$)
    .build() {
}

class PutModelPackageGroupPolicyCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "PutModelPackageGroupPolicy", {})
    .n("SageMakerClient", "PutModelPackageGroupPolicyCommand")
    .sc(schemas_0.PutModelPackageGroupPolicy$)
    .build() {
}

class QueryLineageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "QueryLineage", {})
    .n("SageMakerClient", "QueryLineageCommand")
    .sc(schemas_0.QueryLineage$)
    .build() {
}

class RegisterDevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "RegisterDevices", {})
    .n("SageMakerClient", "RegisterDevicesCommand")
    .sc(schemas_0.RegisterDevices$)
    .build() {
}

class RenderUiTemplateCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "RenderUiTemplate", {})
    .n("SageMakerClient", "RenderUiTemplateCommand")
    .sc(schemas_0.RenderUiTemplate$)
    .build() {
}

class RetryPipelineExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "RetryPipelineExecution", {})
    .n("SageMakerClient", "RetryPipelineExecutionCommand")
    .sc(schemas_0.RetryPipelineExecution$)
    .build() {
}

class SearchCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "Search", {})
    .n("SageMakerClient", "SearchCommand")
    .sc(schemas_0.Search$)
    .build() {
}

class SearchTrainingPlanOfferingsCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "SearchTrainingPlanOfferings", {})
    .n("SageMakerClient", "SearchTrainingPlanOfferingsCommand")
    .sc(schemas_0.SearchTrainingPlanOfferings$)
    .build() {
}

class SendPipelineExecutionStepFailureCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "SendPipelineExecutionStepFailure", {})
    .n("SageMakerClient", "SendPipelineExecutionStepFailureCommand")
    .sc(schemas_0.SendPipelineExecutionStepFailure$)
    .build() {
}

class SendPipelineExecutionStepSuccessCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "SendPipelineExecutionStepSuccess", {})
    .n("SageMakerClient", "SendPipelineExecutionStepSuccessCommand")
    .sc(schemas_0.SendPipelineExecutionStepSuccess$)
    .build() {
}

class StartEdgeDeploymentStageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartEdgeDeploymentStage", {})
    .n("SageMakerClient", "StartEdgeDeploymentStageCommand")
    .sc(schemas_0.StartEdgeDeploymentStage$)
    .build() {
}

class StartInferenceExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartInferenceExperiment", {})
    .n("SageMakerClient", "StartInferenceExperimentCommand")
    .sc(schemas_0.StartInferenceExperiment$)
    .build() {
}

class StartMlflowTrackingServerCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartMlflowTrackingServer", {})
    .n("SageMakerClient", "StartMlflowTrackingServerCommand")
    .sc(schemas_0.StartMlflowTrackingServer$)
    .build() {
}

class StartMonitoringScheduleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartMonitoringSchedule", {})
    .n("SageMakerClient", "StartMonitoringScheduleCommand")
    .sc(schemas_0.StartMonitoringSchedule$)
    .build() {
}

class StartNotebookInstanceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartNotebookInstance", {})
    .n("SageMakerClient", "StartNotebookInstanceCommand")
    .sc(schemas_0.StartNotebookInstance$)
    .build() {
}

class StartPipelineExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartPipelineExecution", {})
    .n("SageMakerClient", "StartPipelineExecutionCommand")
    .sc(schemas_0.StartPipelineExecution$)
    .build() {
}

class StartSessionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StartSession", {})
    .n("SageMakerClient", "StartSessionCommand")
    .sc(schemas_0.StartSession$)
    .build() {
}

class StopAutoMLJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopAutoMLJob", {})
    .n("SageMakerClient", "StopAutoMLJobCommand")
    .sc(schemas_0.StopAutoMLJob$)
    .build() {
}

class StopCompilationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopCompilationJob", {})
    .n("SageMakerClient", "StopCompilationJobCommand")
    .sc(schemas_0.StopCompilationJob$)
    .build() {
}

class StopEdgeDeploymentStageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopEdgeDeploymentStage", {})
    .n("SageMakerClient", "StopEdgeDeploymentStageCommand")
    .sc(schemas_0.StopEdgeDeploymentStage$)
    .build() {
}

class StopEdgePackagingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopEdgePackagingJob", {})
    .n("SageMakerClient", "StopEdgePackagingJobCommand")
    .sc(schemas_0.StopEdgePackagingJob$)
    .build() {
}

class StopHyperParameterTuningJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopHyperParameterTuningJob", {})
    .n("SageMakerClient", "StopHyperParameterTuningJobCommand")
    .sc(schemas_0.StopHyperParameterTuningJob$)
    .build() {
}

class StopInferenceExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopInferenceExperiment", {})
    .n("SageMakerClient", "StopInferenceExperimentCommand")
    .sc(schemas_0.StopInferenceExperiment$)
    .build() {
}

class StopInferenceRecommendationsJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopInferenceRecommendationsJob", {})
    .n("SageMakerClient", "StopInferenceRecommendationsJobCommand")
    .sc(schemas_0.StopInferenceRecommendationsJob$)
    .build() {
}

class StopLabelingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopLabelingJob", {})
    .n("SageMakerClient", "StopLabelingJobCommand")
    .sc(schemas_0.StopLabelingJob$)
    .build() {
}

class StopMlflowTrackingServerCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopMlflowTrackingServer", {})
    .n("SageMakerClient", "StopMlflowTrackingServerCommand")
    .sc(schemas_0.StopMlflowTrackingServer$)
    .build() {
}

class StopMonitoringScheduleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopMonitoringSchedule", {})
    .n("SageMakerClient", "StopMonitoringScheduleCommand")
    .sc(schemas_0.StopMonitoringSchedule$)
    .build() {
}

class StopNotebookInstanceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopNotebookInstance", {})
    .n("SageMakerClient", "StopNotebookInstanceCommand")
    .sc(schemas_0.StopNotebookInstance$)
    .build() {
}

class StopOptimizationJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopOptimizationJob", {})
    .n("SageMakerClient", "StopOptimizationJobCommand")
    .sc(schemas_0.StopOptimizationJob$)
    .build() {
}

class StopPipelineExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopPipelineExecution", {})
    .n("SageMakerClient", "StopPipelineExecutionCommand")
    .sc(schemas_0.StopPipelineExecution$)
    .build() {
}

class StopProcessingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopProcessingJob", {})
    .n("SageMakerClient", "StopProcessingJobCommand")
    .sc(schemas_0.StopProcessingJob$)
    .build() {
}

class StopTrainingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopTrainingJob", {})
    .n("SageMakerClient", "StopTrainingJobCommand")
    .sc(schemas_0.StopTrainingJob$)
    .build() {
}

class StopTransformJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "StopTransformJob", {})
    .n("SageMakerClient", "StopTransformJobCommand")
    .sc(schemas_0.StopTransformJob$)
    .build() {
}

class UpdateActionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateAction", {})
    .n("SageMakerClient", "UpdateActionCommand")
    .sc(schemas_0.UpdateAction$)
    .build() {
}

class UpdateAppImageConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateAppImageConfig", {})
    .n("SageMakerClient", "UpdateAppImageConfigCommand")
    .sc(schemas_0.UpdateAppImageConfig$)
    .build() {
}

class UpdateArtifactCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateArtifact", {})
    .n("SageMakerClient", "UpdateArtifactCommand")
    .sc(schemas_0.UpdateArtifact$)
    .build() {
}

class UpdateClusterCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateCluster", {})
    .n("SageMakerClient", "UpdateClusterCommand")
    .sc(schemas_0.UpdateCluster$)
    .build() {
}

class UpdateClusterSchedulerConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateClusterSchedulerConfig", {})
    .n("SageMakerClient", "UpdateClusterSchedulerConfigCommand")
    .sc(schemas_0.UpdateClusterSchedulerConfig$)
    .build() {
}

class UpdateClusterSoftwareCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateClusterSoftware", {})
    .n("SageMakerClient", "UpdateClusterSoftwareCommand")
    .sc(schemas_0.UpdateClusterSoftware$)
    .build() {
}

class UpdateCodeRepositoryCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateCodeRepository", {})
    .n("SageMakerClient", "UpdateCodeRepositoryCommand")
    .sc(schemas_0.UpdateCodeRepository$)
    .build() {
}

class UpdateComputeQuotaCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateComputeQuota", {})
    .n("SageMakerClient", "UpdateComputeQuotaCommand")
    .sc(schemas_0.UpdateComputeQuota$)
    .build() {
}

class UpdateContextCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateContext", {})
    .n("SageMakerClient", "UpdateContextCommand")
    .sc(schemas_0.UpdateContext$)
    .build() {
}

class UpdateDeviceFleetCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateDeviceFleet", {})
    .n("SageMakerClient", "UpdateDeviceFleetCommand")
    .sc(schemas_0.UpdateDeviceFleet$)
    .build() {
}

class UpdateDevicesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateDevices", {})
    .n("SageMakerClient", "UpdateDevicesCommand")
    .sc(schemas_0.UpdateDevices$)
    .build() {
}

class UpdateDomainCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateDomain", {})
    .n("SageMakerClient", "UpdateDomainCommand")
    .sc(schemas_0.UpdateDomain$)
    .build() {
}

class UpdateEndpointCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateEndpoint", {})
    .n("SageMakerClient", "UpdateEndpointCommand")
    .sc(schemas_0.UpdateEndpoint$)
    .build() {
}

class UpdateEndpointWeightsAndCapacitiesCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateEndpointWeightsAndCapacities", {})
    .n("SageMakerClient", "UpdateEndpointWeightsAndCapacitiesCommand")
    .sc(schemas_0.UpdateEndpointWeightsAndCapacities$)
    .build() {
}

class UpdateExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateExperiment", {})
    .n("SageMakerClient", "UpdateExperimentCommand")
    .sc(schemas_0.UpdateExperiment$)
    .build() {
}

class UpdateFeatureGroupCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateFeatureGroup", {})
    .n("SageMakerClient", "UpdateFeatureGroupCommand")
    .sc(schemas_0.UpdateFeatureGroup$)
    .build() {
}

class UpdateFeatureMetadataCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateFeatureMetadata", {})
    .n("SageMakerClient", "UpdateFeatureMetadataCommand")
    .sc(schemas_0.UpdateFeatureMetadata$)
    .build() {
}

class UpdateHubCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateHub", {})
    .n("SageMakerClient", "UpdateHubCommand")
    .sc(schemas_0.UpdateHub$)
    .build() {
}

class UpdateHubContentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateHubContent", {})
    .n("SageMakerClient", "UpdateHubContentCommand")
    .sc(schemas_0.UpdateHubContent$)
    .build() {
}

class UpdateHubContentReferenceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateHubContentReference", {})
    .n("SageMakerClient", "UpdateHubContentReferenceCommand")
    .sc(schemas_0.UpdateHubContentReference$)
    .build() {
}

class UpdateImageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateImage", {})
    .n("SageMakerClient", "UpdateImageCommand")
    .sc(schemas_0.UpdateImage$)
    .build() {
}

class UpdateImageVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateImageVersion", {})
    .n("SageMakerClient", "UpdateImageVersionCommand")
    .sc(schemas_0.UpdateImageVersion$)
    .build() {
}

class UpdateInferenceComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateInferenceComponent", {})
    .n("SageMakerClient", "UpdateInferenceComponentCommand")
    .sc(schemas_0.UpdateInferenceComponent$)
    .build() {
}

class UpdateInferenceComponentRuntimeConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateInferenceComponentRuntimeConfig", {})
    .n("SageMakerClient", "UpdateInferenceComponentRuntimeConfigCommand")
    .sc(schemas_0.UpdateInferenceComponentRuntimeConfig$)
    .build() {
}

class UpdateInferenceExperimentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateInferenceExperiment", {})
    .n("SageMakerClient", "UpdateInferenceExperimentCommand")
    .sc(schemas_0.UpdateInferenceExperiment$)
    .build() {
}

class UpdateMlflowAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateMlflowApp", {})
    .n("SageMakerClient", "UpdateMlflowAppCommand")
    .sc(schemas_0.UpdateMlflowApp$)
    .build() {
}

class UpdateMlflowTrackingServerCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateMlflowTrackingServer", {})
    .n("SageMakerClient", "UpdateMlflowTrackingServerCommand")
    .sc(schemas_0.UpdateMlflowTrackingServer$)
    .build() {
}

class UpdateModelCardCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateModelCard", {})
    .n("SageMakerClient", "UpdateModelCardCommand")
    .sc(schemas_0.UpdateModelCard$)
    .build() {
}

class UpdateModelPackageCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateModelPackage", {})
    .n("SageMakerClient", "UpdateModelPackageCommand")
    .sc(schemas_0.UpdateModelPackage$)
    .build() {
}

class UpdateMonitoringAlertCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateMonitoringAlert", {})
    .n("SageMakerClient", "UpdateMonitoringAlertCommand")
    .sc(schemas_0.UpdateMonitoringAlert$)
    .build() {
}

class UpdateMonitoringScheduleCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateMonitoringSchedule", {})
    .n("SageMakerClient", "UpdateMonitoringScheduleCommand")
    .sc(schemas_0.UpdateMonitoringSchedule$)
    .build() {
}

class UpdateNotebookInstanceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateNotebookInstance", {})
    .n("SageMakerClient", "UpdateNotebookInstanceCommand")
    .sc(schemas_0.UpdateNotebookInstance$)
    .build() {
}

class UpdateNotebookInstanceLifecycleConfigCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateNotebookInstanceLifecycleConfig", {})
    .n("SageMakerClient", "UpdateNotebookInstanceLifecycleConfigCommand")
    .sc(schemas_0.UpdateNotebookInstanceLifecycleConfig$)
    .build() {
}

class UpdatePartnerAppCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdatePartnerApp", {})
    .n("SageMakerClient", "UpdatePartnerAppCommand")
    .sc(schemas_0.UpdatePartnerApp$)
    .build() {
}

class UpdatePipelineCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdatePipeline", {})
    .n("SageMakerClient", "UpdatePipelineCommand")
    .sc(schemas_0.UpdatePipeline$)
    .build() {
}

class UpdatePipelineExecutionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdatePipelineExecution", {})
    .n("SageMakerClient", "UpdatePipelineExecutionCommand")
    .sc(schemas_0.UpdatePipelineExecution$)
    .build() {
}

class UpdatePipelineVersionCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdatePipelineVersion", {})
    .n("SageMakerClient", "UpdatePipelineVersionCommand")
    .sc(schemas_0.UpdatePipelineVersion$)
    .build() {
}

class UpdateProjectCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateProject", {})
    .n("SageMakerClient", "UpdateProjectCommand")
    .sc(schemas_0.UpdateProject$)
    .build() {
}

class UpdateSpaceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateSpace", {})
    .n("SageMakerClient", "UpdateSpaceCommand")
    .sc(schemas_0.UpdateSpace$)
    .build() {
}

class UpdateTrainingJobCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateTrainingJob", {})
    .n("SageMakerClient", "UpdateTrainingJobCommand")
    .sc(schemas_0.UpdateTrainingJob$)
    .build() {
}

class UpdateTrialCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateTrial", {})
    .n("SageMakerClient", "UpdateTrialCommand")
    .sc(schemas_0.UpdateTrial$)
    .build() {
}

class UpdateTrialComponentCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateTrialComponent", {})
    .n("SageMakerClient", "UpdateTrialComponentCommand")
    .sc(schemas_0.UpdateTrialComponent$)
    .build() {
}

class UpdateUserProfileCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateUserProfile", {})
    .n("SageMakerClient", "UpdateUserProfileCommand")
    .sc(schemas_0.UpdateUserProfile$)
    .build() {
}

class UpdateWorkforceCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateWorkforce", {})
    .n("SageMakerClient", "UpdateWorkforceCommand")
    .sc(schemas_0.UpdateWorkforce$)
    .build() {
}

class UpdateWorkteamCommand extends smithyClient.Command
    .classBuilder()
    .ep(commonParams)
    .m(function (Command, cs, config, o) {
    return [middlewareEndpoint.getEndpointPlugin(config, Command.getEndpointParameterInstructions())];
})
    .s("SageMaker", "UpdateWorkteam", {})
    .n("SageMakerClient", "UpdateWorkteamCommand")
    .sc(schemas_0.UpdateWorkteam$)
    .build() {
}

const paginateCreateHubContentPresignedUrls = core.createPaginator(SageMakerClient, CreateHubContentPresignedUrlsCommand, "NextToken", "NextToken", "MaxResults");

const paginateDescribeTrainingPlanExtensionHistory = core.createPaginator(SageMakerClient, DescribeTrainingPlanExtensionHistoryCommand, "NextToken", "NextToken", "MaxResults");

const paginateListActions = core.createPaginator(SageMakerClient, ListActionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAlgorithms = core.createPaginator(SageMakerClient, ListAlgorithmsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAliases = core.createPaginator(SageMakerClient, ListAliasesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAppImageConfigs = core.createPaginator(SageMakerClient, ListAppImageConfigsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListApps = core.createPaginator(SageMakerClient, ListAppsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListArtifacts = core.createPaginator(SageMakerClient, ListArtifactsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAssociations = core.createPaginator(SageMakerClient, ListAssociationsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListAutoMLJobs = core.createPaginator(SageMakerClient, ListAutoMLJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListCandidatesForAutoMLJob = core.createPaginator(SageMakerClient, ListCandidatesForAutoMLJobCommand, "NextToken", "NextToken", "MaxResults");

const paginateListClusterEvents = core.createPaginator(SageMakerClient, ListClusterEventsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListClusterNodes = core.createPaginator(SageMakerClient, ListClusterNodesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListClusterSchedulerConfigs = core.createPaginator(SageMakerClient, ListClusterSchedulerConfigsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListClusters = core.createPaginator(SageMakerClient, ListClustersCommand, "NextToken", "NextToken", "MaxResults");

const paginateListCodeRepositories = core.createPaginator(SageMakerClient, ListCodeRepositoriesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListCompilationJobs = core.createPaginator(SageMakerClient, ListCompilationJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListComputeQuotas = core.createPaginator(SageMakerClient, ListComputeQuotasCommand, "NextToken", "NextToken", "MaxResults");

const paginateListContexts = core.createPaginator(SageMakerClient, ListContextsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListDataQualityJobDefinitions = core.createPaginator(SageMakerClient, ListDataQualityJobDefinitionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListDeviceFleets = core.createPaginator(SageMakerClient, ListDeviceFleetsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListDevices = core.createPaginator(SageMakerClient, ListDevicesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListDomains = core.createPaginator(SageMakerClient, ListDomainsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListEdgeDeploymentPlans = core.createPaginator(SageMakerClient, ListEdgeDeploymentPlansCommand, "NextToken", "NextToken", "MaxResults");

const paginateListEdgePackagingJobs = core.createPaginator(SageMakerClient, ListEdgePackagingJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListEndpointConfigs = core.createPaginator(SageMakerClient, ListEndpointConfigsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListEndpoints = core.createPaginator(SageMakerClient, ListEndpointsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListExperiments = core.createPaginator(SageMakerClient, ListExperimentsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListFeatureGroups = core.createPaginator(SageMakerClient, ListFeatureGroupsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListFlowDefinitions = core.createPaginator(SageMakerClient, ListFlowDefinitionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListHumanTaskUis = core.createPaginator(SageMakerClient, ListHumanTaskUisCommand, "NextToken", "NextToken", "MaxResults");

const paginateListHyperParameterTuningJobs = core.createPaginator(SageMakerClient, ListHyperParameterTuningJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListImages = core.createPaginator(SageMakerClient, ListImagesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListImageVersions = core.createPaginator(SageMakerClient, ListImageVersionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListInferenceComponents = core.createPaginator(SageMakerClient, ListInferenceComponentsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListInferenceExperiments = core.createPaginator(SageMakerClient, ListInferenceExperimentsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListInferenceRecommendationsJobs = core.createPaginator(SageMakerClient, ListInferenceRecommendationsJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListInferenceRecommendationsJobSteps = core.createPaginator(SageMakerClient, ListInferenceRecommendationsJobStepsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListLabelingJobsForWorkteam = core.createPaginator(SageMakerClient, ListLabelingJobsForWorkteamCommand, "NextToken", "NextToken", "MaxResults");

const paginateListLabelingJobs = core.createPaginator(SageMakerClient, ListLabelingJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListLineageGroups = core.createPaginator(SageMakerClient, ListLineageGroupsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListMlflowApps = core.createPaginator(SageMakerClient, ListMlflowAppsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListMlflowTrackingServers = core.createPaginator(SageMakerClient, ListMlflowTrackingServersCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelBiasJobDefinitions = core.createPaginator(SageMakerClient, ListModelBiasJobDefinitionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelCardExportJobs = core.createPaginator(SageMakerClient, ListModelCardExportJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelCards = core.createPaginator(SageMakerClient, ListModelCardsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelCardVersions = core.createPaginator(SageMakerClient, ListModelCardVersionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelExplainabilityJobDefinitions = core.createPaginator(SageMakerClient, ListModelExplainabilityJobDefinitionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelMetadata = core.createPaginator(SageMakerClient, ListModelMetadataCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelPackageGroups = core.createPaginator(SageMakerClient, ListModelPackageGroupsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelPackages = core.createPaginator(SageMakerClient, ListModelPackagesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModelQualityJobDefinitions = core.createPaginator(SageMakerClient, ListModelQualityJobDefinitionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListModels = core.createPaginator(SageMakerClient, ListModelsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListMonitoringAlertHistory = core.createPaginator(SageMakerClient, ListMonitoringAlertHistoryCommand, "NextToken", "NextToken", "MaxResults");

const paginateListMonitoringAlerts = core.createPaginator(SageMakerClient, ListMonitoringAlertsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListMonitoringExecutions = core.createPaginator(SageMakerClient, ListMonitoringExecutionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListMonitoringSchedules = core.createPaginator(SageMakerClient, ListMonitoringSchedulesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListNotebookInstanceLifecycleConfigs = core.createPaginator(SageMakerClient, ListNotebookInstanceLifecycleConfigsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListNotebookInstances = core.createPaginator(SageMakerClient, ListNotebookInstancesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListOptimizationJobs = core.createPaginator(SageMakerClient, ListOptimizationJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListPartnerApps = core.createPaginator(SageMakerClient, ListPartnerAppsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListPipelineExecutions = core.createPaginator(SageMakerClient, ListPipelineExecutionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListPipelineExecutionSteps = core.createPaginator(SageMakerClient, ListPipelineExecutionStepsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListPipelineParametersForExecution = core.createPaginator(SageMakerClient, ListPipelineParametersForExecutionCommand, "NextToken", "NextToken", "MaxResults");

const paginateListPipelines = core.createPaginator(SageMakerClient, ListPipelinesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListPipelineVersions = core.createPaginator(SageMakerClient, ListPipelineVersionsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListProcessingJobs = core.createPaginator(SageMakerClient, ListProcessingJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListProjects = core.createPaginator(SageMakerClient, ListProjectsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListResourceCatalogs = core.createPaginator(SageMakerClient, ListResourceCatalogsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListSpaces = core.createPaginator(SageMakerClient, ListSpacesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListStageDevices = core.createPaginator(SageMakerClient, ListStageDevicesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListStudioLifecycleConfigs = core.createPaginator(SageMakerClient, ListStudioLifecycleConfigsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListSubscribedWorkteams = core.createPaginator(SageMakerClient, ListSubscribedWorkteamsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTags = core.createPaginator(SageMakerClient, ListTagsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTrainingJobsForHyperParameterTuningJob = core.createPaginator(SageMakerClient, ListTrainingJobsForHyperParameterTuningJobCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTrainingJobs = core.createPaginator(SageMakerClient, ListTrainingJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTrainingPlans = core.createPaginator(SageMakerClient, ListTrainingPlansCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTransformJobs = core.createPaginator(SageMakerClient, ListTransformJobsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTrialComponents = core.createPaginator(SageMakerClient, ListTrialComponentsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListTrials = core.createPaginator(SageMakerClient, ListTrialsCommand, "NextToken", "NextToken", "MaxResults");

const paginateListUltraServersByReservedCapacity = core.createPaginator(SageMakerClient, ListUltraServersByReservedCapacityCommand, "NextToken", "NextToken", "MaxResults");

const paginateListUserProfiles = core.createPaginator(SageMakerClient, ListUserProfilesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListWorkforces = core.createPaginator(SageMakerClient, ListWorkforcesCommand, "NextToken", "NextToken", "MaxResults");

const paginateListWorkteams = core.createPaginator(SageMakerClient, ListWorkteamsCommand, "NextToken", "NextToken", "MaxResults");

const paginateQueryLineage = core.createPaginator(SageMakerClient, QueryLineageCommand, "NextToken", "NextToken", "MaxResults");

const paginateSearch = core.createPaginator(SageMakerClient, SearchCommand, "NextToken", "NextToken", "MaxResults");

const checkState$c = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeEndpointCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.EndpointStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.SUCCESS, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForEndpointDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$c);
};
const waitUntilEndpointDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$c);
    return utilWaiter.checkExceptions(result);
};

const checkState$b = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeEndpointCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.EndpointStatus;
            };
            if (returnComparator() === "InService") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.EndpointStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForEndpointInService = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$b);
};
const waitUntilEndpointInService = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$b);
    return utilWaiter.checkExceptions(result);
};

const checkState$a = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeImageCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "CREATED") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "CREATE_FAILED") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForImageCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$a);
};
const waitUntilImageCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$a);
    return utilWaiter.checkExceptions(result);
};

const checkState$9 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeImageCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "DELETE_FAILED") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ResourceNotFoundException") {
            return { state: utilWaiter.WaiterState.SUCCESS, reason };
        }
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForImageDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$9);
};
const waitUntilImageDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$9);
    return utilWaiter.checkExceptions(result);
};

const checkState$8 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeImageCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "CREATED") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "UPDATE_FAILED") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForImageUpdated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$8);
};
const waitUntilImageUpdated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$8);
    return utilWaiter.checkExceptions(result);
};

const checkState$7 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeImageVersionCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageVersionStatus;
            };
            if (returnComparator() === "CREATED") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ImageVersionStatus;
            };
            if (returnComparator() === "CREATE_FAILED") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForImageVersionCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$7);
};
const waitUntilImageVersionCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$7);
    return utilWaiter.checkExceptions(result);
};

const checkState$6 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeImageVersionCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageVersionStatus;
            };
            if (returnComparator() === "DELETE_FAILED") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ResourceNotFoundException") {
            return { state: utilWaiter.WaiterState.SUCCESS, reason };
        }
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForImageVersionDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$6);
};
const waitUntilImageVersionDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$6);
    return utilWaiter.checkExceptions(result);
};

const checkState$5 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeNotebookInstanceCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.NotebookInstanceStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.SUCCESS, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForNotebookInstanceDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$5);
};
const waitUntilNotebookInstanceDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$5);
    return utilWaiter.checkExceptions(result);
};

const checkState$4 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeNotebookInstanceCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.NotebookInstanceStatus;
            };
            if (returnComparator() === "InService") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.NotebookInstanceStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForNotebookInstanceInService = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$4);
};
const waitUntilNotebookInstanceInService = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$4);
    return utilWaiter.checkExceptions(result);
};

const checkState$3 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeNotebookInstanceCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.NotebookInstanceStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.NotebookInstanceStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForNotebookInstanceStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$3);
};
const waitUntilNotebookInstanceStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$3);
    return utilWaiter.checkExceptions(result);
};

const checkState$2 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeProcessingJobCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ProcessingJobStatus;
            };
            if (returnComparator() === "Completed") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ProcessingJobStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ProcessingJobStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForProcessingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$2);
};
const waitUntilProcessingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$2);
    return utilWaiter.checkExceptions(result);
};

const checkState$1 = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeTrainingJobCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.TrainingJobStatus;
            };
            if (returnComparator() === "Completed") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TrainingJobStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TrainingJobStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForTrainingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 120, maxDelay: 21600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$1);
};
const waitUntilTrainingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 120, maxDelay: 21600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState$1);
    return utilWaiter.checkExceptions(result);
};

const checkState = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeTransformJobCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.TransformJobStatus;
            };
            if (returnComparator() === "Completed") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TransformJobStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: utilWaiter.WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TransformJobStatus;
            };
            if (returnComparator() === "Failed") {
                return { state: utilWaiter.WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: utilWaiter.WaiterState.FAILURE, reason };
        }
    }
    return { state: utilWaiter.WaiterState.RETRY, reason };
};
const waitForTransformJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
const waitUntilTransformJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await utilWaiter.createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return utilWaiter.checkExceptions(result);
};

const commands = {
    AddAssociationCommand,
    AddTagsCommand,
    AssociateTrialComponentCommand,
    AttachClusterNodeVolumeCommand,
    BatchAddClusterNodesCommand,
    BatchDeleteClusterNodesCommand,
    BatchDescribeModelPackageCommand,
    BatchRebootClusterNodesCommand,
    BatchReplaceClusterNodesCommand,
    CreateActionCommand,
    CreateAlgorithmCommand,
    CreateAppCommand,
    CreateAppImageConfigCommand,
    CreateArtifactCommand,
    CreateAutoMLJobCommand,
    CreateAutoMLJobV2Command,
    CreateClusterCommand,
    CreateClusterSchedulerConfigCommand,
    CreateCodeRepositoryCommand,
    CreateCompilationJobCommand,
    CreateComputeQuotaCommand,
    CreateContextCommand,
    CreateDataQualityJobDefinitionCommand,
    CreateDeviceFleetCommand,
    CreateDomainCommand,
    CreateEdgeDeploymentPlanCommand,
    CreateEdgeDeploymentStageCommand,
    CreateEdgePackagingJobCommand,
    CreateEndpointCommand,
    CreateEndpointConfigCommand,
    CreateExperimentCommand,
    CreateFeatureGroupCommand,
    CreateFlowDefinitionCommand,
    CreateHubCommand,
    CreateHubContentPresignedUrlsCommand,
    CreateHubContentReferenceCommand,
    CreateHumanTaskUiCommand,
    CreateHyperParameterTuningJobCommand,
    CreateImageCommand,
    CreateImageVersionCommand,
    CreateInferenceComponentCommand,
    CreateInferenceExperimentCommand,
    CreateInferenceRecommendationsJobCommand,
    CreateLabelingJobCommand,
    CreateMlflowAppCommand,
    CreateMlflowTrackingServerCommand,
    CreateModelCommand,
    CreateModelBiasJobDefinitionCommand,
    CreateModelCardCommand,
    CreateModelCardExportJobCommand,
    CreateModelExplainabilityJobDefinitionCommand,
    CreateModelPackageCommand,
    CreateModelPackageGroupCommand,
    CreateModelQualityJobDefinitionCommand,
    CreateMonitoringScheduleCommand,
    CreateNotebookInstanceCommand,
    CreateNotebookInstanceLifecycleConfigCommand,
    CreateOptimizationJobCommand,
    CreatePartnerAppCommand,
    CreatePartnerAppPresignedUrlCommand,
    CreatePipelineCommand,
    CreatePresignedDomainUrlCommand,
    CreatePresignedMlflowAppUrlCommand,
    CreatePresignedMlflowTrackingServerUrlCommand,
    CreatePresignedNotebookInstanceUrlCommand,
    CreateProcessingJobCommand,
    CreateProjectCommand,
    CreateSpaceCommand,
    CreateStudioLifecycleConfigCommand,
    CreateTrainingJobCommand,
    CreateTrainingPlanCommand,
    CreateTransformJobCommand,
    CreateTrialCommand,
    CreateTrialComponentCommand,
    CreateUserProfileCommand,
    CreateWorkforceCommand,
    CreateWorkteamCommand,
    DeleteActionCommand,
    DeleteAlgorithmCommand,
    DeleteAppCommand,
    DeleteAppImageConfigCommand,
    DeleteArtifactCommand,
    DeleteAssociationCommand,
    DeleteClusterCommand,
    DeleteClusterSchedulerConfigCommand,
    DeleteCodeRepositoryCommand,
    DeleteCompilationJobCommand,
    DeleteComputeQuotaCommand,
    DeleteContextCommand,
    DeleteDataQualityJobDefinitionCommand,
    DeleteDeviceFleetCommand,
    DeleteDomainCommand,
    DeleteEdgeDeploymentPlanCommand,
    DeleteEdgeDeploymentStageCommand,
    DeleteEndpointCommand,
    DeleteEndpointConfigCommand,
    DeleteExperimentCommand,
    DeleteFeatureGroupCommand,
    DeleteFlowDefinitionCommand,
    DeleteHubCommand,
    DeleteHubContentCommand,
    DeleteHubContentReferenceCommand,
    DeleteHumanTaskUiCommand,
    DeleteHyperParameterTuningJobCommand,
    DeleteImageCommand,
    DeleteImageVersionCommand,
    DeleteInferenceComponentCommand,
    DeleteInferenceExperimentCommand,
    DeleteMlflowAppCommand,
    DeleteMlflowTrackingServerCommand,
    DeleteModelCommand,
    DeleteModelBiasJobDefinitionCommand,
    DeleteModelCardCommand,
    DeleteModelExplainabilityJobDefinitionCommand,
    DeleteModelPackageCommand,
    DeleteModelPackageGroupCommand,
    DeleteModelPackageGroupPolicyCommand,
    DeleteModelQualityJobDefinitionCommand,
    DeleteMonitoringScheduleCommand,
    DeleteNotebookInstanceCommand,
    DeleteNotebookInstanceLifecycleConfigCommand,
    DeleteOptimizationJobCommand,
    DeletePartnerAppCommand,
    DeletePipelineCommand,
    DeleteProcessingJobCommand,
    DeleteProjectCommand,
    DeleteSpaceCommand,
    DeleteStudioLifecycleConfigCommand,
    DeleteTagsCommand,
    DeleteTrainingJobCommand,
    DeleteTrialCommand,
    DeleteTrialComponentCommand,
    DeleteUserProfileCommand,
    DeleteWorkforceCommand,
    DeleteWorkteamCommand,
    DeregisterDevicesCommand,
    DescribeActionCommand,
    DescribeAlgorithmCommand,
    DescribeAppCommand,
    DescribeAppImageConfigCommand,
    DescribeArtifactCommand,
    DescribeAutoMLJobCommand,
    DescribeAutoMLJobV2Command,
    DescribeClusterCommand,
    DescribeClusterEventCommand,
    DescribeClusterNodeCommand,
    DescribeClusterSchedulerConfigCommand,
    DescribeCodeRepositoryCommand,
    DescribeCompilationJobCommand,
    DescribeComputeQuotaCommand,
    DescribeContextCommand,
    DescribeDataQualityJobDefinitionCommand,
    DescribeDeviceCommand,
    DescribeDeviceFleetCommand,
    DescribeDomainCommand,
    DescribeEdgeDeploymentPlanCommand,
    DescribeEdgePackagingJobCommand,
    DescribeEndpointCommand,
    DescribeEndpointConfigCommand,
    DescribeExperimentCommand,
    DescribeFeatureGroupCommand,
    DescribeFeatureMetadataCommand,
    DescribeFlowDefinitionCommand,
    DescribeHubCommand,
    DescribeHubContentCommand,
    DescribeHumanTaskUiCommand,
    DescribeHyperParameterTuningJobCommand,
    DescribeImageCommand,
    DescribeImageVersionCommand,
    DescribeInferenceComponentCommand,
    DescribeInferenceExperimentCommand,
    DescribeInferenceRecommendationsJobCommand,
    DescribeLabelingJobCommand,
    DescribeLineageGroupCommand,
    DescribeMlflowAppCommand,
    DescribeMlflowTrackingServerCommand,
    DescribeModelCommand,
    DescribeModelBiasJobDefinitionCommand,
    DescribeModelCardCommand,
    DescribeModelCardExportJobCommand,
    DescribeModelExplainabilityJobDefinitionCommand,
    DescribeModelPackageCommand,
    DescribeModelPackageGroupCommand,
    DescribeModelQualityJobDefinitionCommand,
    DescribeMonitoringScheduleCommand,
    DescribeNotebookInstanceCommand,
    DescribeNotebookInstanceLifecycleConfigCommand,
    DescribeOptimizationJobCommand,
    DescribePartnerAppCommand,
    DescribePipelineCommand,
    DescribePipelineDefinitionForExecutionCommand,
    DescribePipelineExecutionCommand,
    DescribeProcessingJobCommand,
    DescribeProjectCommand,
    DescribeReservedCapacityCommand,
    DescribeSpaceCommand,
    DescribeStudioLifecycleConfigCommand,
    DescribeSubscribedWorkteamCommand,
    DescribeTrainingJobCommand,
    DescribeTrainingPlanCommand,
    DescribeTrainingPlanExtensionHistoryCommand,
    DescribeTransformJobCommand,
    DescribeTrialCommand,
    DescribeTrialComponentCommand,
    DescribeUserProfileCommand,
    DescribeWorkforceCommand,
    DescribeWorkteamCommand,
    DetachClusterNodeVolumeCommand,
    DisableSagemakerServicecatalogPortfolioCommand,
    DisassociateTrialComponentCommand,
    EnableSagemakerServicecatalogPortfolioCommand,
    ExtendTrainingPlanCommand,
    GetDeviceFleetReportCommand,
    GetLineageGroupPolicyCommand,
    GetModelPackageGroupPolicyCommand,
    GetSagemakerServicecatalogPortfolioStatusCommand,
    GetScalingConfigurationRecommendationCommand,
    GetSearchSuggestionsCommand,
    ImportHubContentCommand,
    ListActionsCommand,
    ListAlgorithmsCommand,
    ListAliasesCommand,
    ListAppImageConfigsCommand,
    ListAppsCommand,
    ListArtifactsCommand,
    ListAssociationsCommand,
    ListAutoMLJobsCommand,
    ListCandidatesForAutoMLJobCommand,
    ListClusterEventsCommand,
    ListClusterNodesCommand,
    ListClustersCommand,
    ListClusterSchedulerConfigsCommand,
    ListCodeRepositoriesCommand,
    ListCompilationJobsCommand,
    ListComputeQuotasCommand,
    ListContextsCommand,
    ListDataQualityJobDefinitionsCommand,
    ListDeviceFleetsCommand,
    ListDevicesCommand,
    ListDomainsCommand,
    ListEdgeDeploymentPlansCommand,
    ListEdgePackagingJobsCommand,
    ListEndpointConfigsCommand,
    ListEndpointsCommand,
    ListExperimentsCommand,
    ListFeatureGroupsCommand,
    ListFlowDefinitionsCommand,
    ListHubContentsCommand,
    ListHubContentVersionsCommand,
    ListHubsCommand,
    ListHumanTaskUisCommand,
    ListHyperParameterTuningJobsCommand,
    ListImagesCommand,
    ListImageVersionsCommand,
    ListInferenceComponentsCommand,
    ListInferenceExperimentsCommand,
    ListInferenceRecommendationsJobsCommand,
    ListInferenceRecommendationsJobStepsCommand,
    ListLabelingJobsCommand,
    ListLabelingJobsForWorkteamCommand,
    ListLineageGroupsCommand,
    ListMlflowAppsCommand,
    ListMlflowTrackingServersCommand,
    ListModelBiasJobDefinitionsCommand,
    ListModelCardExportJobsCommand,
    ListModelCardsCommand,
    ListModelCardVersionsCommand,
    ListModelExplainabilityJobDefinitionsCommand,
    ListModelMetadataCommand,
    ListModelPackageGroupsCommand,
    ListModelPackagesCommand,
    ListModelQualityJobDefinitionsCommand,
    ListModelsCommand,
    ListMonitoringAlertHistoryCommand,
    ListMonitoringAlertsCommand,
    ListMonitoringExecutionsCommand,
    ListMonitoringSchedulesCommand,
    ListNotebookInstanceLifecycleConfigsCommand,
    ListNotebookInstancesCommand,
    ListOptimizationJobsCommand,
    ListPartnerAppsCommand,
    ListPipelineExecutionsCommand,
    ListPipelineExecutionStepsCommand,
    ListPipelineParametersForExecutionCommand,
    ListPipelinesCommand,
    ListPipelineVersionsCommand,
    ListProcessingJobsCommand,
    ListProjectsCommand,
    ListResourceCatalogsCommand,
    ListSpacesCommand,
    ListStageDevicesCommand,
    ListStudioLifecycleConfigsCommand,
    ListSubscribedWorkteamsCommand,
    ListTagsCommand,
    ListTrainingJobsCommand,
    ListTrainingJobsForHyperParameterTuningJobCommand,
    ListTrainingPlansCommand,
    ListTransformJobsCommand,
    ListTrialComponentsCommand,
    ListTrialsCommand,
    ListUltraServersByReservedCapacityCommand,
    ListUserProfilesCommand,
    ListWorkforcesCommand,
    ListWorkteamsCommand,
    PutModelPackageGroupPolicyCommand,
    QueryLineageCommand,
    RegisterDevicesCommand,
    RenderUiTemplateCommand,
    RetryPipelineExecutionCommand,
    SearchCommand,
    SearchTrainingPlanOfferingsCommand,
    SendPipelineExecutionStepFailureCommand,
    SendPipelineExecutionStepSuccessCommand,
    StartEdgeDeploymentStageCommand,
    StartInferenceExperimentCommand,
    StartMlflowTrackingServerCommand,
    StartMonitoringScheduleCommand,
    StartNotebookInstanceCommand,
    StartPipelineExecutionCommand,
    StartSessionCommand,
    StopAutoMLJobCommand,
    StopCompilationJobCommand,
    StopEdgeDeploymentStageCommand,
    StopEdgePackagingJobCommand,
    StopHyperParameterTuningJobCommand,
    StopInferenceExperimentCommand,
    StopInferenceRecommendationsJobCommand,
    StopLabelingJobCommand,
    StopMlflowTrackingServerCommand,
    StopMonitoringScheduleCommand,
    StopNotebookInstanceCommand,
    StopOptimizationJobCommand,
    StopPipelineExecutionCommand,
    StopProcessingJobCommand,
    StopTrainingJobCommand,
    StopTransformJobCommand,
    UpdateActionCommand,
    UpdateAppImageConfigCommand,
    UpdateArtifactCommand,
    UpdateClusterCommand,
    UpdateClusterSchedulerConfigCommand,
    UpdateClusterSoftwareCommand,
    UpdateCodeRepositoryCommand,
    UpdateComputeQuotaCommand,
    UpdateContextCommand,
    UpdateDeviceFleetCommand,
    UpdateDevicesCommand,
    UpdateDomainCommand,
    UpdateEndpointCommand,
    UpdateEndpointWeightsAndCapacitiesCommand,
    UpdateExperimentCommand,
    UpdateFeatureGroupCommand,
    UpdateFeatureMetadataCommand,
    UpdateHubCommand,
    UpdateHubContentCommand,
    UpdateHubContentReferenceCommand,
    UpdateImageCommand,
    UpdateImageVersionCommand,
    UpdateInferenceComponentCommand,
    UpdateInferenceComponentRuntimeConfigCommand,
    UpdateInferenceExperimentCommand,
    UpdateMlflowAppCommand,
    UpdateMlflowTrackingServerCommand,
    UpdateModelCardCommand,
    UpdateModelPackageCommand,
    UpdateMonitoringAlertCommand,
    UpdateMonitoringScheduleCommand,
    UpdateNotebookInstanceCommand,
    UpdateNotebookInstanceLifecycleConfigCommand,
    UpdatePartnerAppCommand,
    UpdatePipelineCommand,
    UpdatePipelineExecutionCommand,
    UpdatePipelineVersionCommand,
    UpdateProjectCommand,
    UpdateSpaceCommand,
    UpdateTrainingJobCommand,
    UpdateTrialCommand,
    UpdateTrialComponentCommand,
    UpdateUserProfileCommand,
    UpdateWorkforceCommand,
    UpdateWorkteamCommand,
};
const paginators = {
    paginateCreateHubContentPresignedUrls,
    paginateDescribeTrainingPlanExtensionHistory,
    paginateListActions,
    paginateListAlgorithms,
    paginateListAliases,
    paginateListAppImageConfigs,
    paginateListApps,
    paginateListArtifacts,
    paginateListAssociations,
    paginateListAutoMLJobs,
    paginateListCandidatesForAutoMLJob,
    paginateListClusterEvents,
    paginateListClusterNodes,
    paginateListClusters,
    paginateListClusterSchedulerConfigs,
    paginateListCodeRepositories,
    paginateListCompilationJobs,
    paginateListComputeQuotas,
    paginateListContexts,
    paginateListDataQualityJobDefinitions,
    paginateListDeviceFleets,
    paginateListDevices,
    paginateListDomains,
    paginateListEdgeDeploymentPlans,
    paginateListEdgePackagingJobs,
    paginateListEndpointConfigs,
    paginateListEndpoints,
    paginateListExperiments,
    paginateListFeatureGroups,
    paginateListFlowDefinitions,
    paginateListHumanTaskUis,
    paginateListHyperParameterTuningJobs,
    paginateListImages,
    paginateListImageVersions,
    paginateListInferenceComponents,
    paginateListInferenceExperiments,
    paginateListInferenceRecommendationsJobs,
    paginateListInferenceRecommendationsJobSteps,
    paginateListLabelingJobs,
    paginateListLabelingJobsForWorkteam,
    paginateListLineageGroups,
    paginateListMlflowApps,
    paginateListMlflowTrackingServers,
    paginateListModelBiasJobDefinitions,
    paginateListModelCardExportJobs,
    paginateListModelCards,
    paginateListModelCardVersions,
    paginateListModelExplainabilityJobDefinitions,
    paginateListModelMetadata,
    paginateListModelPackageGroups,
    paginateListModelPackages,
    paginateListModelQualityJobDefinitions,
    paginateListModels,
    paginateListMonitoringAlertHistory,
    paginateListMonitoringAlerts,
    paginateListMonitoringExecutions,
    paginateListMonitoringSchedules,
    paginateListNotebookInstanceLifecycleConfigs,
    paginateListNotebookInstances,
    paginateListOptimizationJobs,
    paginateListPartnerApps,
    paginateListPipelineExecutions,
    paginateListPipelineExecutionSteps,
    paginateListPipelineParametersForExecution,
    paginateListPipelines,
    paginateListPipelineVersions,
    paginateListProcessingJobs,
    paginateListProjects,
    paginateListResourceCatalogs,
    paginateListSpaces,
    paginateListStageDevices,
    paginateListStudioLifecycleConfigs,
    paginateListSubscribedWorkteams,
    paginateListTags,
    paginateListTrainingJobs,
    paginateListTrainingJobsForHyperParameterTuningJob,
    paginateListTrainingPlans,
    paginateListTransformJobs,
    paginateListTrialComponents,
    paginateListTrials,
    paginateListUltraServersByReservedCapacity,
    paginateListUserProfiles,
    paginateListWorkforces,
    paginateListWorkteams,
    paginateQueryLineage,
    paginateSearch,
};
const waiters = {
    waitUntilEndpointDeleted,
    waitUntilEndpointInService,
    waitUntilImageCreated,
    waitUntilImageDeleted,
    waitUntilImageUpdated,
    waitUntilImageVersionCreated,
    waitUntilImageVersionDeleted,
    waitUntilNotebookInstanceDeleted,
    waitUntilNotebookInstanceInService,
    waitUntilNotebookInstanceStopped,
    waitUntilProcessingJobCompletedOrStopped,
    waitUntilTrainingJobCompletedOrStopped,
    waitUntilTransformJobCompletedOrStopped,
};
class SageMaker extends SageMakerClient {
}
smithyClient.createAggregatedClient(commands, SageMaker, { paginators, waiters });

const MIGProfileType = {
    MIG_1G_10GB: "mig-1g.10gb",
    MIG_1G_18GB: "mig-1g.18gb",
    MIG_1G_20GB: "mig-1g.20gb",
    MIG_1G_23GB: "mig-1g.23gb",
    MIG_1G_35GB: "mig-1g.35gb",
    MIG_1G_45GB: "mig-1g.45gb",
    MIG_1G_47GB: "mig-1g.47gb",
    MIG_1G_5GB: "mig-1g.5gb",
    MIG_2G_10GB: "mig-2g.10gb",
    MIG_2G_20GB: "mig-2g.20gb",
    MIG_2G_35GB: "mig-2g.35gb",
    MIG_2G_45GB: "mig-2g.45gb",
    MIG_2G_47GB: "mig-2g.47gb",
    MIG_3G_20GB: "mig-3g.20gb",
    MIG_3G_40GB: "mig-3g.40gb",
    MIG_3G_71GB: "mig-3g.71gb",
    MIG_3G_90GB: "mig-3g.90gb",
    MIG_3G_93GB: "mig-3g.93gb",
    MIG_4G_20GB: "mig-4g.20gb",
    MIG_4G_40GB: "mig-4g.40gb",
    MIG_4G_71GB: "mig-4g.71gb",
    MIG_4G_90GB: "mig-4g.90gb",
    MIG_4G_93GB: "mig-4g.93gb",
    MIG_7G_141GB: "mig-7g.141gb",
    MIG_7G_180GB: "mig-7g.180gb",
    MIG_7G_186GB: "mig-7g.186gb",
    MIG_7G_40GB: "mig-7g.40gb",
    MIG_7G_80GB: "mig-7g.80gb",
};
const ClusterInstanceType = {
    ML_C5N_18XLARGE: "ml.c5n.18xlarge",
    ML_C5N_2XLARGE: "ml.c5n.2xlarge",
    ML_C5N_4XLARGE: "ml.c5n.4xlarge",
    ML_C5N_9XLARGE: "ml.c5n.9xlarge",
    ML_C5N_LARGE: "ml.c5n.large",
    ML_C5_12XLARGE: "ml.c5.12xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_24XLARGE: "ml.c5.24xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_LARGE: "ml.c5.large",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_LARGE: "ml.c6i.large",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6E_12XLARGE: "ml.g6e.12xlarge",
    ML_G6E_16XLARGE: "ml.g6e.16xlarge",
    ML_G6E_24XLARGE: "ml.g6e.24xlarge",
    ML_G6E_2XLARGE: "ml.g6e.2xlarge",
    ML_G6E_48XLARGE: "ml.g6e.48xlarge",
    ML_G6E_4XLARGE: "ml.g6e.4xlarge",
    ML_G6E_8XLARGE: "ml.g6e.8xlarge",
    ML_G6E_XLARGE: "ml.g6e.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_GR6_4XLARGE: "ml.gr6.4xlarge",
    ML_GR6_8XLARGE: "ml.gr6.8xlarge",
    ML_I3EN_12XLARGE: "ml.i3en.12xlarge",
    ML_I3EN_24XLARGE: "ml.i3en.24xlarge",
    ML_I3EN_2XLARGE: "ml.i3en.2xlarge",
    ML_I3EN_3XLARGE: "ml.i3en.3xlarge",
    ML_I3EN_6XLARGE: "ml.i3en.6xlarge",
    ML_I3EN_LARGE: "ml.i3en.large",
    ML_I3EN_XLARGE: "ml.i3en.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_16XLARGE: "ml.m5.16xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_8XLARGE: "ml.m5.8xlarge",
    ML_M5_LARGE: "ml.m5.large",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5EN_48XLARGE: "ml.p5en.48xlarge",
    ML_P5E_48XLARGE: "ml.p5e.48xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_P5_4XLARGE: "ml.p5.4xlarge",
    ML_P6E_GB200_36XLARGE: "ml.p6e-gb200.36xlarge",
    ML_P6_B200_48XLARGE: "ml.p6-b200.48xlarge",
    ML_P6_B300_48XLARGE: "ml.p6-b300.48xlarge",
    ML_R5D_16XLARGE: "ml.r5d.16xlarge",
    ML_R6I_12XLARGE: "ml.r6i.12xlarge",
    ML_R6I_16XLARGE: "ml.r6i.16xlarge",
    ML_R6I_24XLARGE: "ml.r6i.24xlarge",
    ML_R6I_2XLARGE: "ml.r6i.2xlarge",
    ML_R6I_32XLARGE: "ml.r6i.32xlarge",
    ML_R6I_4XLARGE: "ml.r6i.4xlarge",
    ML_R6I_8XLARGE: "ml.r6i.8xlarge",
    ML_R6I_LARGE: "ml.r6i.large",
    ML_R6I_XLARGE: "ml.r6i.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_T3_2XLARGE: "ml.t3.2xlarge",
    ML_T3_LARGE: "ml.t3.large",
    ML_T3_MEDIUM: "ml.t3.medium",
    ML_T3_XLARGE: "ml.t3.xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
    ML_TRN2_3XLARGE: "ml.trn2.3xlarge",
    ML_TRN2_48XLARGE: "ml.trn2.48xlarge",
};
const AccountDefaultStatus = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
const ActionStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
    UNKNOWN: "Unknown",
};
const ActivationState = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const ActiveClusterOperationName = {
    SCALING: "Scaling",
};
const AssociationEdgeType = {
    ASSOCIATED_WITH: "AssociatedWith",
    CONTRIBUTED_TO: "ContributedTo",
    DERIVED_FROM: "DerivedFrom",
    PRODUCED: "Produced",
    SAME_AS: "SameAs",
};
const CompressionType = {
    GZIP: "Gzip",
    NONE: "None",
};
const AdditionalS3DataSourceDataType = {
    S3OBJECT: "S3Object",
    S3PREFIX: "S3Prefix",
};
const ModelCompressionType = {
    Gzip: "Gzip",
    None: "None",
};
const S3ModelDataType = {
    S3Object: "S3Object",
    S3Prefix: "S3Prefix",
};
const ProductionVariantInstanceType = {
    ML_C4_2XLARGE: "ml.c4.2xlarge",
    ML_C4_4XLARGE: "ml.c4.4xlarge",
    ML_C4_8XLARGE: "ml.c4.8xlarge",
    ML_C4_LARGE: "ml.c4.large",
    ML_C4_XLARGE: "ml.c4.xlarge",
    ML_C5D_18XLARGE: "ml.c5d.18xlarge",
    ML_C5D_2XLARGE: "ml.c5d.2xlarge",
    ML_C5D_4XLARGE: "ml.c5d.4xlarge",
    ML_C5D_9XLARGE: "ml.c5d.9xlarge",
    ML_C5D_LARGE: "ml.c5d.large",
    ML_C5D_XLARGE: "ml.c5d.xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_LARGE: "ml.c5.large",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6GD_12XLARGE: "ml.c6gd.12xlarge",
    ML_C6GD_16XLARGE: "ml.c6gd.16xlarge",
    ML_C6GD_2XLARGE: "ml.c6gd.2xlarge",
    ML_C6GD_4XLARGE: "ml.c6gd.4xlarge",
    ML_C6GD_8XLARGE: "ml.c6gd.8xlarge",
    ML_C6GD_LARGE: "ml.c6gd.large",
    ML_C6GD_XLARGE: "ml.c6gd.xlarge",
    ML_C6GN_12XLARGE: "ml.c6gn.12xlarge",
    ML_C6GN_16XLARGE: "ml.c6gn.16xlarge",
    ML_C6GN_2XLARGE: "ml.c6gn.2xlarge",
    ML_C6GN_4XLARGE: "ml.c6gn.4xlarge",
    ML_C6GN_8XLARGE: "ml.c6gn.8xlarge",
    ML_C6GN_LARGE: "ml.c6gn.large",
    ML_C6GN_XLARGE: "ml.c6gn.xlarge",
    ML_C6G_12XLARGE: "ml.c6g.12xlarge",
    ML_C6G_16XLARGE: "ml.c6g.16xlarge",
    ML_C6G_2XLARGE: "ml.c6g.2xlarge",
    ML_C6G_4XLARGE: "ml.c6g.4xlarge",
    ML_C6G_8XLARGE: "ml.c6g.8xlarge",
    ML_C6G_LARGE: "ml.c6g.large",
    ML_C6G_XLARGE: "ml.c6g.xlarge",
    ML_C6IN_12XLARGE: "ml.c6in.12xlarge",
    ML_C6IN_16XLARGE: "ml.c6in.16xlarge",
    ML_C6IN_24XLARGE: "ml.c6in.24xlarge",
    ML_C6IN_2XLARGE: "ml.c6in.2xlarge",
    ML_C6IN_32XLARGE: "ml.c6in.32xlarge",
    ML_C6IN_4XLARGE: "ml.c6in.4xlarge",
    ML_C6IN_8XLARGE: "ml.c6in.8xlarge",
    ML_C6IN_LARGE: "ml.c6in.large",
    ML_C6IN_XLARGE: "ml.c6in.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_LARGE: "ml.c6i.large",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_C7G_12XLARGE: "ml.c7g.12xlarge",
    ML_C7G_16XLARGE: "ml.c7g.16xlarge",
    ML_C7G_2XLARGE: "ml.c7g.2xlarge",
    ML_C7G_4XLARGE: "ml.c7g.4xlarge",
    ML_C7G_8XLARGE: "ml.c7g.8xlarge",
    ML_C7G_LARGE: "ml.c7g.large",
    ML_C7G_XLARGE: "ml.c7g.xlarge",
    ML_C7I_12XLARGE: "ml.c7i.12xlarge",
    ML_C7I_16XLARGE: "ml.c7i.16xlarge",
    ML_C7I_24XLARGE: "ml.c7i.24xlarge",
    ML_C7I_2XLARGE: "ml.c7i.2xlarge",
    ML_C7I_48XLARGE: "ml.c7i.48xlarge",
    ML_C7I_4XLARGE: "ml.c7i.4xlarge",
    ML_C7I_8XLARGE: "ml.c7i.8xlarge",
    ML_C7I_LARGE: "ml.c7i.large",
    ML_C7I_XLARGE: "ml.c7i.xlarge",
    ML_C8G_12XLARGE: "ml.c8g.12xlarge",
    ML_C8G_16XLARGE: "ml.c8g.16xlarge",
    ML_C8G_24XLARGE: "ml.c8g.24xlarge",
    ML_C8G_2XLARGE: "ml.c8g.2xlarge",
    ML_C8G_48XLARGE: "ml.c8g.48xlarge",
    ML_C8G_4XLARGE: "ml.c8g.4xlarge",
    ML_C8G_8XLARGE: "ml.c8g.8xlarge",
    ML_C8G_LARGE: "ml.c8g.large",
    ML_C8G_MEDIUM: "ml.c8g.medium",
    ML_C8G_XLARGE: "ml.c8g.xlarge",
    ML_DL1_24XLARGE: "ml.dl1.24xlarge",
    ML_G4DN_12XLARGE: "ml.g4dn.12xlarge",
    ML_G4DN_16XLARGE: "ml.g4dn.16xlarge",
    ML_G4DN_2XLARGE: "ml.g4dn.2xlarge",
    ML_G4DN_4XLARGE: "ml.g4dn.4xlarge",
    ML_G4DN_8XLARGE: "ml.g4dn.8xlarge",
    ML_G4DN_XLARGE: "ml.g4dn.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6E_12XLARGE: "ml.g6e.12xlarge",
    ML_G6E_16XLARGE: "ml.g6e.16xlarge",
    ML_G6E_24XLARGE: "ml.g6e.24xlarge",
    ML_G6E_2XLARGE: "ml.g6e.2xlarge",
    ML_G6E_48XLARGE: "ml.g6e.48xlarge",
    ML_G6E_4XLARGE: "ml.g6e.4xlarge",
    ML_G6E_8XLARGE: "ml.g6e.8xlarge",
    ML_G6E_XLARGE: "ml.g6e.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_G7E_12XLARGE: "ml.g7e.12xlarge",
    ML_G7E_24XLARGE: "ml.g7e.24xlarge",
    ML_G7E_2XLARGE: "ml.g7e.2xlarge",
    ML_G7E_48XLARGE: "ml.g7e.48xlarge",
    ML_G7E_4XLARGE: "ml.g7e.4xlarge",
    ML_G7E_8XLARGE: "ml.g7e.8xlarge",
    ML_INF1_24XLARGE: "ml.inf1.24xlarge",
    ML_INF1_2XLARGE: "ml.inf1.2xlarge",
    ML_INF1_6XLARGE: "ml.inf1.6xlarge",
    ML_INF1_XLARGE: "ml.inf1.xlarge",
    ML_INF2_24XLARGE: "ml.inf2.24xlarge",
    ML_INF2_48XLARGE: "ml.inf2.48xlarge",
    ML_INF2_8XLARGE: "ml.inf2.8xlarge",
    ML_INF2_XLARGE: "ml.inf2.xlarge",
    ML_M4_10XLARGE: "ml.m4.10xlarge",
    ML_M4_16XLARGE: "ml.m4.16xlarge",
    ML_M4_2XLARGE: "ml.m4.2xlarge",
    ML_M4_4XLARGE: "ml.m4.4xlarge",
    ML_M4_XLARGE: "ml.m4.xlarge",
    ML_M5D_12XLARGE: "ml.m5d.12xlarge",
    ML_M5D_24XLARGE: "ml.m5d.24xlarge",
    ML_M5D_2XLARGE: "ml.m5d.2xlarge",
    ML_M5D_4XLARGE: "ml.m5d.4xlarge",
    ML_M5D_LARGE: "ml.m5d.large",
    ML_M5D_XLARGE: "ml.m5d.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_LARGE: "ml.m5.large",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6GD_12XLARGE: "ml.m6gd.12xlarge",
    ML_M6GD_16XLARGE: "ml.m6gd.16xlarge",
    ML_M6GD_2XLARGE: "ml.m6gd.2xlarge",
    ML_M6GD_4XLARGE: "ml.m6gd.4xlarge",
    ML_M6GD_8XLARGE: "ml.m6gd.8xlarge",
    ML_M6GD_LARGE: "ml.m6gd.large",
    ML_M6GD_XLARGE: "ml.m6gd.xlarge",
    ML_M6G_12XLARGE: "ml.m6g.12xlarge",
    ML_M6G_16XLARGE: "ml.m6g.16xlarge",
    ML_M6G_2XLARGE: "ml.m6g.2xlarge",
    ML_M6G_4XLARGE: "ml.m6g.4xlarge",
    ML_M6G_8XLARGE: "ml.m6g.8xlarge",
    ML_M6G_LARGE: "ml.m6g.large",
    ML_M6G_XLARGE: "ml.m6g.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_M8G_12XLARGE: "ml.m8g.12xlarge",
    ML_M8G_16XLARGE: "ml.m8g.16xlarge",
    ML_M8G_24XLARGE: "ml.m8g.24xlarge",
    ML_M8G_2XLARGE: "ml.m8g.2xlarge",
    ML_M8G_48XLARGE: "ml.m8g.48xlarge",
    ML_M8G_4XLARGE: "ml.m8g.4xlarge",
    ML_M8G_8XLARGE: "ml.m8g.8xlarge",
    ML_M8G_LARGE: "ml.m8g.large",
    ML_M8G_MEDIUM: "ml.m8g.medium",
    ML_M8G_XLARGE: "ml.m8g.xlarge",
    ML_P2_16XLARGE: "ml.p2.16xlarge",
    ML_P2_8XLARGE: "ml.p2.8xlarge",
    ML_P2_XLARGE: "ml.p2.xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5EN_48XLARGE: "ml.p5en.48xlarge",
    ML_P5E_48XLARGE: "ml.p5e.48xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_P5_4XLARGE: "ml.p5.4xlarge",
    ML_P6E_GB200_36XLARGE: "ml.p6e-gb200.36xlarge",
    ML_P6_B200_48XLARGE: "ml.p6-b200.48xlarge",
    ML_P6_B300_48XLARGE: "ml.p6-b300.48xlarge",
    ML_R5D_12XLARGE: "ml.r5d.12xlarge",
    ML_R5D_24XLARGE: "ml.r5d.24xlarge",
    ML_R5D_2XLARGE: "ml.r5d.2xlarge",
    ML_R5D_4XLARGE: "ml.r5d.4xlarge",
    ML_R5D_LARGE: "ml.r5d.large",
    ML_R5D_XLARGE: "ml.r5d.xlarge",
    ML_R5_12XLARGE: "ml.r5.12xlarge",
    ML_R5_24XLARGE: "ml.r5.24xlarge",
    ML_R5_2XLARGE: "ml.r5.2xlarge",
    ML_R5_4XLARGE: "ml.r5.4xlarge",
    ML_R5_LARGE: "ml.r5.large",
    ML_R5_XLARGE: "ml.r5.xlarge",
    ML_R6GD_12XLARGE: "ml.r6gd.12xlarge",
    ML_R6GD_16XLARGE: "ml.r6gd.16xlarge",
    ML_R6GD_2XLARGE: "ml.r6gd.2xlarge",
    ML_R6GD_4XLARGE: "ml.r6gd.4xlarge",
    ML_R6GD_8XLARGE: "ml.r6gd.8xlarge",
    ML_R6GD_LARGE: "ml.r6gd.large",
    ML_R6GD_XLARGE: "ml.r6gd.xlarge",
    ML_R6G_12XLARGE: "ml.r6g.12xlarge",
    ML_R6G_16XLARGE: "ml.r6g.16xlarge",
    ML_R6G_2XLARGE: "ml.r6g.2xlarge",
    ML_R6G_4XLARGE: "ml.r6g.4xlarge",
    ML_R6G_8XLARGE: "ml.r6g.8xlarge",
    ML_R6G_LARGE: "ml.r6g.large",
    ML_R6G_XLARGE: "ml.r6g.xlarge",
    ML_R6I_12XLARGE: "ml.r6i.12xlarge",
    ML_R6I_16XLARGE: "ml.r6i.16xlarge",
    ML_R6I_24XLARGE: "ml.r6i.24xlarge",
    ML_R6I_2XLARGE: "ml.r6i.2xlarge",
    ML_R6I_32XLARGE: "ml.r6i.32xlarge",
    ML_R6I_4XLARGE: "ml.r6i.4xlarge",
    ML_R6I_8XLARGE: "ml.r6i.8xlarge",
    ML_R6I_LARGE: "ml.r6i.large",
    ML_R6I_XLARGE: "ml.r6i.xlarge",
    ML_R7GD_12XLARGE: "ml.r7gd.12xlarge",
    ML_R7GD_16XLARGE: "ml.r7gd.16xlarge",
    ML_R7GD_2XLARGE: "ml.r7gd.2xlarge",
    ML_R7GD_4XLARGE: "ml.r7gd.4xlarge",
    ML_R7GD_8XLARGE: "ml.r7gd.8xlarge",
    ML_R7GD_LARGE: "ml.r7gd.large",
    ML_R7GD_MEDIUM: "ml.r7gd.medium",
    ML_R7GD_XLARGE: "ml.r7gd.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_R8G_12XLARGE: "ml.r8g.12xlarge",
    ML_R8G_16XLARGE: "ml.r8g.16xlarge",
    ML_R8G_24XLARGE: "ml.r8g.24xlarge",
    ML_R8G_2XLARGE: "ml.r8g.2xlarge",
    ML_R8G_48XLARGE: "ml.r8g.48xlarge",
    ML_R8G_4XLARGE: "ml.r8g.4xlarge",
    ML_R8G_8XLARGE: "ml.r8g.8xlarge",
    ML_R8G_LARGE: "ml.r8g.large",
    ML_R8G_MEDIUM: "ml.r8g.medium",
    ML_R8G_XLARGE: "ml.r8g.xlarge",
    ML_T2_2XLARGE: "ml.t2.2xlarge",
    ML_T2_LARGE: "ml.t2.large",
    ML_T2_MEDIUM: "ml.t2.medium",
    ML_T2_XLARGE: "ml.t2.xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
    ML_TRN2_48XLARGE: "ml.trn2.48xlarge",
};
const TransformInstanceType = {
    ML_C4_2XLARGE: "ml.c4.2xlarge",
    ML_C4_4XLARGE: "ml.c4.4xlarge",
    ML_C4_8XLARGE: "ml.c4.8xlarge",
    ML_C4_XLARGE: "ml.c4.xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_LARGE: "ml.c6i.large",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_C7I_12XLARGE: "ml.c7i.12xlarge",
    ML_C7I_16XLARGE: "ml.c7i.16xlarge",
    ML_C7I_24XLARGE: "ml.c7i.24xlarge",
    ML_C7I_2XLARGE: "ml.c7i.2xlarge",
    ML_C7I_48XLARGE: "ml.c7i.48xlarge",
    ML_C7I_4XLARGE: "ml.c7i.4xlarge",
    ML_C7I_8XLARGE: "ml.c7i.8xlarge",
    ML_C7I_LARGE: "ml.c7i.large",
    ML_C7I_XLARGE: "ml.c7i.xlarge",
    ML_G4DN_12XLARGE: "ml.g4dn.12xlarge",
    ML_G4DN_16XLARGE: "ml.g4dn.16xlarge",
    ML_G4DN_2XLARGE: "ml.g4dn.2xlarge",
    ML_G4DN_4XLARGE: "ml.g4dn.4xlarge",
    ML_G4DN_8XLARGE: "ml.g4dn.8xlarge",
    ML_G4DN_XLARGE: "ml.g4dn.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_INF2_24XLARGE: "ml.inf2.24xlarge",
    ML_INF2_48XLARGE: "ml.inf2.48xlarge",
    ML_INF2_8XLARGE: "ml.inf2.8xlarge",
    ML_INF2_XLARGE: "ml.inf2.xlarge",
    ML_M4_10XLARGE: "ml.m4.10xlarge",
    ML_M4_16XLARGE: "ml.m4.16xlarge",
    ML_M4_2XLARGE: "ml.m4.2xlarge",
    ML_M4_4XLARGE: "ml.m4.4xlarge",
    ML_M4_XLARGE: "ml.m4.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_LARGE: "ml.m5.large",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_P2_16XLARGE: "ml.p2.16xlarge",
    ML_P2_8XLARGE: "ml.p2.8xlarge",
    ML_P2_XLARGE: "ml.p2.xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
    ML_R6I_12XLARGE: "ml.r6i.12xlarge",
    ML_R6I_16XLARGE: "ml.r6i.16xlarge",
    ML_R6I_24XLARGE: "ml.r6i.24xlarge",
    ML_R6I_2XLARGE: "ml.r6i.2xlarge",
    ML_R6I_32XLARGE: "ml.r6i.32xlarge",
    ML_R6I_4XLARGE: "ml.r6i.4xlarge",
    ML_R6I_8XLARGE: "ml.r6i.8xlarge",
    ML_R6I_LARGE: "ml.r6i.large",
    ML_R6I_XLARGE: "ml.r6i.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
};
const AggregationTransformationValue = {
    Avg: "avg",
    First: "first",
    Max: "max",
    Min: "min",
    Sum: "sum",
};
const AlgorithmSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const TrainingRepositoryAccessMode = {
    PLATFORM: "Platform",
    VPC: "Vpc",
};
const TrainingInputMode = {
    FASTFILE: "FastFile",
    FILE: "File",
    PIPE: "Pipe",
};
const AlgorithmStatus = {
    COMPLETED: "Completed",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    PENDING: "Pending",
};
const DetailedAlgorithmStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    NOT_STARTED: "NotStarted",
};
const FileSystemAccessMode = {
    RO: "ro",
    RW: "rw",
};
const FileSystemType = {
    EFS: "EFS",
    FSXLUSTRE: "FSxLustre",
};
const S3DataDistribution = {
    FULLY_REPLICATED: "FullyReplicated",
    SHARDED_BY_S3_KEY: "ShardedByS3Key",
};
const S3DataType = {
    AUGMENTED_MANIFEST_FILE: "AugmentedManifestFile",
    CONVERSE: "Converse",
    MANIFEST_FILE: "ManifestFile",
    S3_PREFIX: "S3Prefix",
};
const RecordWrapper = {
    NONE: "None",
    RECORDIO: "RecordIO",
};
const OutputCompressionType = {
    GZIP: "GZIP",
    NONE: "NONE",
};
const TrainingInstanceType = {
    ML_C4_2XLARGE: "ml.c4.2xlarge",
    ML_C4_4XLARGE: "ml.c4.4xlarge",
    ML_C4_8XLARGE: "ml.c4.8xlarge",
    ML_C4_XLARGE: "ml.c4.xlarge",
    ML_C5N_18XLARGE: "ml.c5n.18xlarge",
    ML_C5N_2XLARGE: "ml.c5n.2xlarge",
    ML_C5N_4XLARGE: "ml.c5n.4xlarge",
    ML_C5N_9XLARGE: "ml.c5n.9xlarge",
    ML_C5N_XLARGE: "ml.c5n.xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_C7I_12XLARGE: "ml.c7i.12xlarge",
    ML_C7I_16XLARGE: "ml.c7i.16xlarge",
    ML_C7I_24XLARGE: "ml.c7i.24xlarge",
    ML_C7I_2XLARGE: "ml.c7i.2xlarge",
    ML_C7I_48XLARGE: "ml.c7i.48xlarge",
    ML_C7I_4XLARGE: "ml.c7i.4xlarge",
    ML_C7I_8XLARGE: "ml.c7i.8xlarge",
    ML_C7I_LARGE: "ml.c7i.large",
    ML_C7I_XLARGE: "ml.c7i.xlarge",
    ML_G4DN_12XLARGE: "ml.g4dn.12xlarge",
    ML_G4DN_16XLARGE: "ml.g4dn.16xlarge",
    ML_G4DN_2XLARGE: "ml.g4dn.2xlarge",
    ML_G4DN_4XLARGE: "ml.g4dn.4xlarge",
    ML_G4DN_8XLARGE: "ml.g4dn.8xlarge",
    ML_G4DN_XLARGE: "ml.g4dn.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6E_12XLARGE: "ml.g6e.12xlarge",
    ML_G6E_16XLARGE: "ml.g6e.16xlarge",
    ML_G6E_24XLARGE: "ml.g6e.24xlarge",
    ML_G6E_2XLARGE: "ml.g6e.2xlarge",
    ML_G6E_48XLARGE: "ml.g6e.48xlarge",
    ML_G6E_4XLARGE: "ml.g6e.4xlarge",
    ML_G6E_8XLARGE: "ml.g6e.8xlarge",
    ML_G6E_XLARGE: "ml.g6e.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_G7E_12XLARGE: "ml.g7e.12xlarge",
    ML_G7E_24XLARGE: "ml.g7e.24xlarge",
    ML_G7E_2XLARGE: "ml.g7e.2xlarge",
    ML_G7E_48XLARGE: "ml.g7e.48xlarge",
    ML_G7E_4XLARGE: "ml.g7e.4xlarge",
    ML_G7E_8XLARGE: "ml.g7e.8xlarge",
    ML_M4_10XLARGE: "ml.m4.10xlarge",
    ML_M4_16XLARGE: "ml.m4.16xlarge",
    ML_M4_2XLARGE: "ml.m4.2xlarge",
    ML_M4_4XLARGE: "ml.m4.4xlarge",
    ML_M4_XLARGE: "ml.m4.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_LARGE: "ml.m5.large",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_P2_16XLARGE: "ml.p2.16xlarge",
    ML_P2_8XLARGE: "ml.p2.8xlarge",
    ML_P2_XLARGE: "ml.p2.xlarge",
    ML_P3DN_24XLARGE: "ml.p3dn.24xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5EN_48XLARGE: "ml.p5en.48xlarge",
    ML_P5E_48XLARGE: "ml.p5e.48xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_P5_4XLARGE: "ml.p5.4xlarge",
    ML_P6E_GB200_36XLARGE: "ml.p6e-gb200.36xlarge",
    ML_P6_B200_48XLARGE: "ml.p6-b200.48xlarge",
    ML_P6_B300_48XLARGE: "ml.p6-b300.48xlarge",
    ML_R5D_12XLARGE: "ml.r5d.12xlarge",
    ML_R5D_16XLARGE: "ml.r5d.16xlarge",
    ML_R5D_24XLARGE: "ml.r5d.24xlarge",
    ML_R5D_2XLARGE: "ml.r5d.2xlarge",
    ML_R5D_4XLARGE: "ml.r5d.4xlarge",
    ML_R5D_8XLARGE: "ml.r5d.8xlarge",
    ML_R5D_LARGE: "ml.r5d.large",
    ML_R5D_XLARGE: "ml.r5d.xlarge",
    ML_R5_12XLARGE: "ml.r5.12xlarge",
    ML_R5_16XLARGE: "ml.r5.16xlarge",
    ML_R5_24XLARGE: "ml.r5.24xlarge",
    ML_R5_2XLARGE: "ml.r5.2xlarge",
    ML_R5_4XLARGE: "ml.r5.4xlarge",
    ML_R5_8XLARGE: "ml.r5.8xlarge",
    ML_R5_LARGE: "ml.r5.large",
    ML_R5_XLARGE: "ml.r5.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_T3_2XLARGE: "ml.t3.2xlarge",
    ML_T3_LARGE: "ml.t3.large",
    ML_T3_MEDIUM: "ml.t3.medium",
    ML_T3_XLARGE: "ml.t3.xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
    ML_TRN2_48XLARGE: "ml.trn2.48xlarge",
};
const BatchStrategy = {
    MULTI_RECORD: "MultiRecord",
    SINGLE_RECORD: "SingleRecord",
};
const SplitType = {
    LINE: "Line",
    NONE: "None",
    RECORDIO: "RecordIO",
    TFRECORD: "TFRecord",
};
const AssemblyType = {
    LINE: "Line",
    NONE: "None",
};
const FeatureStatus = {
    Disabled: "DISABLED",
    Enabled: "ENABLED",
};
const AppType = {
    Canvas: "Canvas",
    CodeEditor: "CodeEditor",
    DetailedProfiler: "DetailedProfiler",
    JupyterLab: "JupyterLab",
    JupyterServer: "JupyterServer",
    KernelGateway: "KernelGateway",
    RSessionGateway: "RSessionGateway",
    RStudioServerPro: "RStudioServerPro",
    TensorBoard: "TensorBoard",
};
const AppInstanceType = {
    ML_C5_12XLARGE: "ml.c5.12xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_24XLARGE: "ml.c5.24xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_LARGE: "ml.c5.large",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6ID_12XLARGE: "ml.c6id.12xlarge",
    ML_C6ID_16XLARGE: "ml.c6id.16xlarge",
    ML_C6ID_24XLARGE: "ml.c6id.24xlarge",
    ML_C6ID_2XLARGE: "ml.c6id.2xlarge",
    ML_C6ID_32XLARGE: "ml.c6id.32xlarge",
    ML_C6ID_4XLARGE: "ml.c6id.4xlarge",
    ML_C6ID_8XLARGE: "ml.c6id.8xlarge",
    ML_C6ID_LARGE: "ml.c6id.large",
    ML_C6ID_XLARGE: "ml.c6id.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_LARGE: "ml.c6i.large",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_C7I_12XLARGE: "ml.c7i.12xlarge",
    ML_C7I_16XLARGE: "ml.c7i.16xlarge",
    ML_C7I_24XLARGE: "ml.c7i.24xlarge",
    ML_C7I_2XLARGE: "ml.c7i.2xlarge",
    ML_C7I_48XLARGE: "ml.c7i.48xlarge",
    ML_C7I_4XLARGE: "ml.c7i.4xlarge",
    ML_C7I_8XLARGE: "ml.c7i.8xlarge",
    ML_C7I_LARGE: "ml.c7i.large",
    ML_C7I_XLARGE: "ml.c7i.xlarge",
    ML_G4DN_12XLARGE: "ml.g4dn.12xlarge",
    ML_G4DN_16XLARGE: "ml.g4dn.16xlarge",
    ML_G4DN_2XLARGE: "ml.g4dn.2xlarge",
    ML_G4DN_4XLARGE: "ml.g4dn.4xlarge",
    ML_G4DN_8XLARGE: "ml.g4dn.8xlarge",
    ML_G4DN_XLARGE: "ml.g4dn.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6E_12XLARGE: "ml.g6e.12xlarge",
    ML_G6E_16XLARGE: "ml.g6e.16xlarge",
    ML_G6E_24XLARGE: "ml.g6e.24xlarge",
    ML_G6E_2XLARGE: "ml.g6e.2xlarge",
    ML_G6E_48XLARGE: "ml.g6e.48xlarge",
    ML_G6E_4XLARGE: "ml.g6e.4xlarge",
    ML_G6E_8XLARGE: "ml.g6e.8xlarge",
    ML_G6E_XLARGE: "ml.g6e.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_GEOSPATIAL_INTERACTIVE: "ml.geospatial.interactive",
    ML_M5D_12XLARGE: "ml.m5d.12xlarge",
    ML_M5D_16XLARGE: "ml.m5d.16xlarge",
    ML_M5D_24XLARGE: "ml.m5d.24xlarge",
    ML_M5D_2XLARGE: "ml.m5d.2xlarge",
    ML_M5D_4XLARGE: "ml.m5d.4xlarge",
    ML_M5D_8XLARGE: "ml.m5d.8xlarge",
    ML_M5D_LARGE: "ml.m5d.large",
    ML_M5D_XLARGE: "ml.m5d.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_16XLARGE: "ml.m5.16xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_8XLARGE: "ml.m5.8xlarge",
    ML_M5_LARGE: "ml.m5.large",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6ID_12XLARGE: "ml.m6id.12xlarge",
    ML_M6ID_16XLARGE: "ml.m6id.16xlarge",
    ML_M6ID_24XLARGE: "ml.m6id.24xlarge",
    ML_M6ID_2XLARGE: "ml.m6id.2xlarge",
    ML_M6ID_32XLARGE: "ml.m6id.32xlarge",
    ML_M6ID_4XLARGE: "ml.m6id.4xlarge",
    ML_M6ID_8XLARGE: "ml.m6id.8xlarge",
    ML_M6ID_LARGE: "ml.m6id.large",
    ML_M6ID_XLARGE: "ml.m6id.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_P3DN_24XLARGE: "ml.p3dn.24xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5EN_48XLARGE: "ml.p5en.48xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_P6_B200_48XLARGE: "ml.p6-b200.48xlarge",
    ML_R5_12XLARGE: "ml.r5.12xlarge",
    ML_R5_16XLARGE: "ml.r5.16xlarge",
    ML_R5_24XLARGE: "ml.r5.24xlarge",
    ML_R5_2XLARGE: "ml.r5.2xlarge",
    ML_R5_4XLARGE: "ml.r5.4xlarge",
    ML_R5_8XLARGE: "ml.r5.8xlarge",
    ML_R5_LARGE: "ml.r5.large",
    ML_R5_XLARGE: "ml.r5.xlarge",
    ML_R6ID_12XLARGE: "ml.r6id.12xlarge",
    ML_R6ID_16XLARGE: "ml.r6id.16xlarge",
    ML_R6ID_24XLARGE: "ml.r6id.24xlarge",
    ML_R6ID_2XLARGE: "ml.r6id.2xlarge",
    ML_R6ID_32XLARGE: "ml.r6id.32xlarge",
    ML_R6ID_4XLARGE: "ml.r6id.4xlarge",
    ML_R6ID_8XLARGE: "ml.r6id.8xlarge",
    ML_R6ID_LARGE: "ml.r6id.large",
    ML_R6ID_XLARGE: "ml.r6id.xlarge",
    ML_R6I_12XLARGE: "ml.r6i.12xlarge",
    ML_R6I_16XLARGE: "ml.r6i.16xlarge",
    ML_R6I_24XLARGE: "ml.r6i.24xlarge",
    ML_R6I_2XLARGE: "ml.r6i.2xlarge",
    ML_R6I_32XLARGE: "ml.r6i.32xlarge",
    ML_R6I_4XLARGE: "ml.r6i.4xlarge",
    ML_R6I_8XLARGE: "ml.r6i.8xlarge",
    ML_R6I_LARGE: "ml.r6i.large",
    ML_R6I_XLARGE: "ml.r6i.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_T3_2XLARGE: "ml.t3.2xlarge",
    ML_T3_LARGE: "ml.t3.large",
    ML_T3_MEDIUM: "ml.t3.medium",
    ML_T3_MICRO: "ml.t3.micro",
    ML_T3_SMALL: "ml.t3.small",
    ML_T3_XLARGE: "ml.t3.xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
    SYSTEM: "system",
};
const AppStatus = {
    Deleted: "Deleted",
    Deleting: "Deleting",
    Failed: "Failed",
    InService: "InService",
    Pending: "Pending",
};
const AppImageConfigSortKey = {
    CreationTime: "CreationTime",
    LastModifiedTime: "LastModifiedTime",
    Name: "Name",
};
const LifecycleManagement = {
    Disabled: "DISABLED",
    Enabled: "ENABLED",
};
const AppNetworkAccessType = {
    PublicInternetOnly: "PublicInternetOnly",
    VpcOnly: "VpcOnly",
};
const AppSecurityGroupManagement = {
    Customer: "Customer",
    Service: "Service",
};
const AppSortKey = {
    CreationTime: "CreationTime",
};
const ArtifactSourceIdType = {
    CUSTOM: "Custom",
    MD5_HASH: "MD5Hash",
    S3_ETAG: "S3ETag",
    S3_VERSION: "S3Version",
};
const AsyncNotificationTopicTypes = {
    ERROR_NOTIFICATION_TOPIC: "ERROR_NOTIFICATION_TOPIC",
    SUCCESS_NOTIFICATION_TOPIC: "SUCCESS_NOTIFICATION_TOPIC",
};
const AthenaResultCompressionType = {
    GZIP: "GZIP",
    SNAPPY: "SNAPPY",
    ZLIB: "ZLIB",
};
const AthenaResultFormat = {
    AVRO: "AVRO",
    JSON: "JSON",
    ORC: "ORC",
    PARQUET: "PARQUET",
    TEXTFILE: "TEXTFILE",
};
const VolumeAttachmentStatus = {
    ATTACHED: "attached",
    ATTACHING: "attaching",
    BUSY: "busy",
    DETACHED: "detached",
    DETACHING: "detaching",
};
const AuthMode = {
    IAM: "IAM",
    SSO: "SSO",
};
const AutoMLAlgorithm = {
    ARIMA: "arima",
    CATBOOST: "catboost",
    CNN_QR: "cnn-qr",
    DEEPAR: "deepar",
    ETS: "ets",
    EXTRA_TREES: "extra-trees",
    FASTAI: "fastai",
    LIGHTGBM: "lightgbm",
    LINEAR_LEARNER: "linear-learner",
    MLP: "mlp",
    NN_TORCH: "nn-torch",
    NPTS: "npts",
    PROPHET: "prophet",
    RANDOMFOREST: "randomforest",
    XGBOOST: "xgboost",
};
const AutoMLMetricEnum = {
    ACCURACY: "Accuracy",
    AUC: "AUC",
    AVERAGE_WEIGHTED_QUANTILE_LOSS: "AverageWeightedQuantileLoss",
    BALANCED_ACCURACY: "BalancedAccuracy",
    F1: "F1",
    F1_MACRO: "F1macro",
    MAE: "MAE",
    MAPE: "MAPE",
    MASE: "MASE",
    MSE: "MSE",
    PRECISION: "Precision",
    PRECISION_MACRO: "PrecisionMacro",
    R2: "R2",
    RECALL: "Recall",
    RECALL_MACRO: "RecallMacro",
    RMSE: "RMSE",
    WAPE: "WAPE",
};
const MetricSetSource = {
    TEST: "Test",
    TRAIN: "Train",
    VALIDATION: "Validation",
};
const AutoMLMetricExtendedEnum = {
    ACCURACY: "Accuracy",
    AUC: "AUC",
    AVERAGE_WEIGHTED_QUANTILE_LOSS: "AverageWeightedQuantileLoss",
    BALANCED_ACCURACY: "BalancedAccuracy",
    F1: "F1",
    F1_MACRO: "F1macro",
    INFERENCE_LATENCY: "InferenceLatency",
    LogLoss: "LogLoss",
    MAE: "MAE",
    MAPE: "MAPE",
    MASE: "MASE",
    MSE: "MSE",
    PERPLEXITY: "Perplexity",
    PRECISION: "Precision",
    PRECISION_MACRO: "PrecisionMacro",
    R2: "R2",
    RECALL: "Recall",
    RECALL_MACRO: "RecallMacro",
    RMSE: "RMSE",
    ROUGE1: "Rouge1",
    ROUGE2: "Rouge2",
    ROUGEL: "RougeL",
    ROUGEL_SUM: "RougeLSum",
    TRAINING_LOSS: "TrainingLoss",
    VALIDATION_LOSS: "ValidationLoss",
    WAPE: "WAPE",
};
const CandidateStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const CandidateStepType = {
    PROCESSING: "AWS::SageMaker::ProcessingJob",
    TRAINING: "AWS::SageMaker::TrainingJob",
    TRANSFORM: "AWS::SageMaker::TransformJob",
};
const AutoMLJobObjectiveType = {
    MAXIMIZE: "Maximize",
    MINIMIZE: "Minimize",
};
const AutoMLProcessingUnit = {
    CPU: "CPU",
    GPU: "GPU",
};
const ObjectiveStatus = {
    Failed: "Failed",
    Pending: "Pending",
    Succeeded: "Succeeded",
};
const AutoMLChannelType = {
    TRAINING: "training",
    VALIDATION: "validation",
};
const AutoMLS3DataType = {
    AUGMENTED_MANIFEST_FILE: "AugmentedManifestFile",
    MANIFEST_FILE: "ManifestFile",
    S3_PREFIX: "S3Prefix",
};
const AutoMLMode = {
    AUTO: "AUTO",
    ENSEMBLING: "ENSEMBLING",
    HYPERPARAMETER_TUNING: "HYPERPARAMETER_TUNING",
};
const AutoMLJobSecondaryStatus = {
    ANALYZING_DATA: "AnalyzingData",
    CANDIDATE_DEFINITIONS_GENERATED: "CandidateDefinitionsGenerated",
    COMPLETED: "Completed",
    DEPLOYING_MODEL: "DeployingModel",
    EXPLAINABILITY_ERROR: "ExplainabilityError",
    FAILED: "Failed",
    FEATURE_ENGINEERING: "FeatureEngineering",
    GENERATING_EXPLAINABILITY_REPORT: "GeneratingExplainabilityReport",
    GENERATING_MODEL_INSIGHTS_REPORT: "GeneratingModelInsightsReport",
    MAX_AUTO_ML_JOB_RUNTIME_REACHED: "MaxAutoMLJobRuntimeReached",
    MAX_CANDIDATES_REACHED: "MaxCandidatesReached",
    MODEL_DEPLOYMENT_ERROR: "ModelDeploymentError",
    MODEL_INSIGHTS_ERROR: "ModelInsightsError",
    MODEL_TUNING: "ModelTuning",
    PRE_TRAINING: "PreTraining",
    STARTING: "Starting",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
    TRAINING_MODELS: "TrainingModels",
};
const AutoMLJobStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const ProblemType = {
    BINARY_CLASSIFICATION: "BinaryClassification",
    MULTICLASS_CLASSIFICATION: "MulticlassClassification",
    REGRESSION: "Regression",
};
const FillingType = {
    Backfill: "backfill",
    BackfillValue: "backfill_value",
    Frontfill: "frontfill",
    FrontfillValue: "frontfill_value",
    Futurefill: "futurefill",
    FuturefillValue: "futurefill_value",
    Middlefill: "middlefill",
    MiddlefillValue: "middlefill_value",
};
const AutoMLProblemTypeConfigName = {
    IMAGE_CLASSIFICATION: "ImageClassification",
    TABULAR: "Tabular",
    TEXT_CLASSIFICATION: "TextClassification",
    TEXT_GENERATION: "TextGeneration",
    TIMESERIES_FORECASTING: "TimeSeriesForecasting",
};
const AutoMLSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const AutoMLSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const AutoMountHomeEFS = {
    DEFAULT_AS_DOMAIN: "DefaultAsDomain",
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const AutotuneMode = {
    ENABLED: "Enabled",
};
const AwsManagedHumanLoopRequestSource = {
    REKOGNITION_DETECT_MODERATION_LABELS_IMAGE_V3: "AWS/Rekognition/DetectModerationLabels/Image/V3",
    TEXTRACT_ANALYZE_DOCUMENT_FORMS_V1: "AWS/Textract/AnalyzeDocument/Forms/V1",
};
const BatchAddClusterNodesErrorCode = {
    INSTANCE_GROUP_NOT_FOUND: "InstanceGroupNotFound",
    INVALID_INSTANCE_GROUP_STATUS: "InvalidInstanceGroupStatus",
};
const ClusterInstanceStatus = {
    DEEP_HEALTH_CHECK_IN_PROGRESS: "DeepHealthCheckInProgress",
    FAILURE: "Failure",
    NOT_FOUND: "NotFound",
    PENDING: "Pending",
    RUNNING: "Running",
    SHUTTING_DOWN: "ShuttingDown",
    SYSTEM_UPDATING: "SystemUpdating",
};
const BatchDeleteClusterNodesErrorCode = {
    INVALID_NODE_STATUS: "InvalidNodeStatus",
    NODE_ID_IN_USE: "NodeIdInUse",
    NODE_ID_NOT_FOUND: "NodeIdNotFound",
};
const ModelApprovalStatus = {
    APPROVED: "Approved",
    PENDING_MANUAL_APPROVAL: "PendingManualApproval",
    REJECTED: "Rejected",
};
const ModelPackageRegistrationType = {
    LOGGED: "Logged",
    REGISTERED: "Registered",
};
const ModelPackageStatus = {
    COMPLETED: "Completed",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    PENDING: "Pending",
};
const BatchRebootClusterNodesErrorCode = {
    INSTANCE_ID_IN_USE: "InstanceIdInUse",
    INSTANCE_ID_NOT_FOUND: "InstanceIdNotFound",
    INTERNAL_SERVER_ERROR: "InternalServerError",
    INVALID_INSTANCE_STATUS: "InvalidInstanceStatus",
};
const BatchReplaceClusterNodesErrorCode = {
    INSTANCE_ID_IN_USE: "InstanceIdInUse",
    INSTANCE_ID_NOT_FOUND: "InstanceIdNotFound",
    INTERNAL_SERVER_ERROR: "InternalServerError",
    INVALID_INSTANCE_STATUS: "InvalidInstanceStatus",
};
const ProcessingS3DataDistributionType = {
    FULLYREPLICATED: "FullyReplicated",
    SHARDEDBYS3KEY: "ShardedByS3Key",
};
const ProcessingS3InputMode = {
    FILE: "File",
    PIPE: "Pipe",
};
const CapacitySizeType = {
    CAPACITY_PERCENT: "CAPACITY_PERCENT",
    INSTANCE_COUNT: "INSTANCE_COUNT",
};
const TrafficRoutingConfigType = {
    ALL_AT_ONCE: "ALL_AT_ONCE",
    CANARY: "CANARY",
    LINEAR: "LINEAR",
};
const BooleanOperator = {
    AND: "And",
    OR: "Or",
};
const CandidateSortBy = {
    CreationTime: "CreationTime",
    FinalObjectiveMetricValue: "FinalObjectiveMetricValue",
    Status: "Status",
};
const DataSourceName = {
    SalesforceGenie: "SalesforceGenie",
    Snowflake: "Snowflake",
};
const CapacityReservationType = {
    CRG: "CRG",
    ODCR: "ODCR",
};
const CapacityReservationPreference = {
    CAPACITY_RESERVATIONS_ONLY: "capacity-reservations-only",
};
const NodeUnavailabilityType = {
    CAPACITY_PERCENTAGE: "CAPACITY_PERCENTAGE",
    INSTANCE_COUNT: "INSTANCE_COUNT",
};
const CaptureMode = {
    INPUT: "Input",
    INPUT_AND_OUTPUT: "InputAndOutput",
    OUTPUT: "Output",
};
const CaptureStatus = {
    STARTED: "Started",
    STOPPED: "Stopped",
};
const ClarifyFeatureType = {
    CATEGORICAL: "categorical",
    NUMERICAL: "numerical",
    TEXT: "text",
};
const ClarifyTextGranularity = {
    PARAGRAPH: "paragraph",
    SENTENCE: "sentence",
    TOKEN: "token",
};
const ClarifyTextLanguage = {
    AFRIKAANS: "af",
    ALBANIAN: "sq",
    ARABIC: "ar",
    ARMENIAN: "hy",
    BASQUE: "eu",
    BENGALI: "bn",
    BULGARIAN: "bg",
    CATALAN: "ca",
    CHINESE: "zh",
    CROATIAN: "hr",
    CZECH: "cs",
    DANISH: "da",
    DUTCH: "nl",
    ENGLISH: "en",
    ESTONIAN: "et",
    FINNISH: "fi",
    FRENCH: "fr",
    GERMAN: "de",
    GREEK: "el",
    GUJARATI: "gu",
    HEBREW: "he",
    HINDI: "hi",
    HUNGARIAN: "hu",
    ICELANDIC: "is",
    INDONESIAN: "id",
    IRISH: "ga",
    ITALIAN: "it",
    KANNADA: "kn",
    KYRGYZ: "ky",
    LATVIAN: "lv",
    LIGURIAN: "lij",
    LITHUANIAN: "lt",
    LUXEMBOURGISH: "lb",
    MACEDONIAN: "mk",
    MALAYALAM: "ml",
    MARATHI: "mr",
    MULTI_LANGUAGE: "xx",
    NEPALI: "ne",
    NORWEGIAN_BOKMAL: "nb",
    PERSIAN: "fa",
    POLISH: "pl",
    PORTUGUESE: "pt",
    ROMANIAN: "ro",
    RUSSIAN: "ru",
    SANSKRIT: "sa",
    SERBIAN: "sr",
    SETSWANA: "tn",
    SINHALA: "si",
    SLOVAK: "sk",
    SLOVENIAN: "sl",
    SPANISH: "es",
    SWEDISH: "sv",
    TAGALOG: "tl",
    TAMIL: "ta",
    TATAR: "tt",
    TELUGU: "te",
    TURKISH: "tr",
    UKRAINIAN: "uk",
    URDU: "ur",
    YORUBA: "yo",
};
const ClusterAutoScalerType = {
    KARPENTER: "Karpenter",
};
const ClusterAutoScalingMode = {
    DISABLE: "Disable",
    ENABLE: "Enable",
};
const ClusterAutoScalingStatus = {
    CREATING: "Creating",
    DELETING: "Deleting",
    FAILED: "Failed",
    INSERVICE: "InService",
};
const ClusterCapacityType = {
    ON_DEMAND: "OnDemand",
    SPOT: "Spot",
};
const ClusterConfigMode = {
    DISABLE: "Disable",
    ENABLE: "Enable",
};
const ClusterEventResourceType = {
    CLUSTER: "Cluster",
    INSTANCE: "Instance",
    INSTANCE_GROUP: "InstanceGroup",
};
const ClusterKubernetesTaintEffect = {
    NO_EXECUTE: "NoExecute",
    NO_SCHEDULE: "NoSchedule",
    PREFER_NO_SCHEDULE: "PreferNoSchedule",
};
const DeepHealthCheckType = {
    INSTANCE_CONNECTIVITY: "InstanceConnectivity",
    INSTANCE_STRESS: "InstanceStress",
};
const ClusterSlurmNodeType = {
    COMPUTE: "Compute",
    CONTROLLER: "Controller",
    LOGIN: "Login",
};
const SoftwareUpdateStatus = {
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    PENDING: "Pending",
    ROLLBACK_COMPLETE: "RollbackComplete",
    ROLLBACK_IN_PROGRESS: "RollbackInProgress",
    SUCCEEDED: "Succeeded",
};
const InstanceGroupStatus = {
    CREATING: "Creating",
    DEGRADED: "Degraded",
    DELETING: "Deleting",
    FAILED: "Failed",
    INSERVICE: "InService",
    SYSTEMUPDATING: "SystemUpdating",
    UPDATING: "Updating",
};
const ClusterNodeProvisioningMode = {
    CONTINUOUS: "Continuous",
};
const ClusterNodeRecovery = {
    AUTOMATIC: "Automatic",
    NONE: "None",
};
const ClusterSlurmConfigStrategy = {
    MANAGED: "Managed",
    MERGE: "Merge",
    OVERWRITE: "Overwrite",
};
const SchedulerResourceStatus = {
    CREATED: "Created",
    CREATE_FAILED: "CreateFailed",
    CREATE_ROLLBACK_FAILED: "CreateRollbackFailed",
    CREATING: "Creating",
    DELETED: "Deleted",
    DELETE_FAILED: "DeleteFailed",
    DELETE_ROLLBACK_FAILED: "DeleteRollbackFailed",
    DELETING: "Deleting",
    UPDATED: "Updated",
    UPDATE_FAILED: "UpdateFailed",
    UPDATE_ROLLBACK_FAILED: "UpdateRollbackFailed",
    UPDATING: "Updating",
};
const ClusterSortBy = {
    CREATION_TIME: "CREATION_TIME",
    NAME: "NAME",
};
const ClusterStatus = {
    CREATING: "Creating",
    DELETING: "Deleting",
    FAILED: "Failed",
    INSERVICE: "InService",
    ROLLINGBACK: "RollingBack",
    SYSTEMUPDATING: "SystemUpdating",
    UPDATING: "Updating",
};
const CodeRepositorySortBy = {
    CREATION_TIME: "CreationTime",
    LAST_MODIFIED_TIME: "LastModifiedTime",
    NAME: "Name",
};
const CodeRepositorySortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const CollectionType = {
    LIST: "List",
    SET: "Set",
    VECTOR: "Vector",
};
const CompilationJobStatus = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    INPROGRESS: "INPROGRESS",
    STARTING: "STARTING",
    STOPPED: "STOPPED",
    STOPPING: "STOPPING",
};
const TargetDevice = {
    AISAGE: "aisage",
    AMBA_CV2: "amba_cv2",
    AMBA_CV22: "amba_cv22",
    AMBA_CV25: "amba_cv25",
    COREML: "coreml",
    DEEPLENS: "deeplens",
    IMX8MPLUS: "imx8mplus",
    IMX8QM: "imx8qm",
    JACINTO_TDA4VM: "jacinto_tda4vm",
    JETSON_NANO: "jetson_nano",
    JETSON_TX1: "jetson_tx1",
    JETSON_TX2: "jetson_tx2",
    JETSON_XAVIER: "jetson_xavier",
    LAMBDA: "lambda",
    ML_C4: "ml_c4",
    ML_C5: "ml_c5",
    ML_C6G: "ml_c6g",
    ML_EIA2: "ml_eia2",
    ML_G4DN: "ml_g4dn",
    ML_INF1: "ml_inf1",
    ML_INF2: "ml_inf2",
    ML_M4: "ml_m4",
    ML_M5: "ml_m5",
    ML_M6G: "ml_m6g",
    ML_P2: "ml_p2",
    ML_P3: "ml_p3",
    ML_TRN1: "ml_trn1",
    QCS603: "qcs603",
    QCS605: "qcs605",
    RASP3B: "rasp3b",
    RASP4B: "rasp4b",
    RK3288: "rk3288",
    RK3399: "rk3399",
    SBE_C: "sbe_c",
    SITARA_AM57X: "sitara_am57x",
    X86_WIN32: "x86_win32",
    X86_WIN64: "x86_win64",
};
const TargetPlatformAccelerator = {
    INTEL_GRAPHICS: "INTEL_GRAPHICS",
    MALI: "MALI",
    NNA: "NNA",
    NVIDIA: "NVIDIA",
};
const TargetPlatformArch = {
    ARM64: "ARM64",
    ARM_EABI: "ARM_EABI",
    ARM_EABIHF: "ARM_EABIHF",
    X86: "X86",
    X86_64: "X86_64",
};
const TargetPlatformOs = {
    ANDROID: "ANDROID",
    LINUX: "LINUX",
};
const CompleteOnConvergence = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const PreemptTeamTasks = {
    LOWERPRIORITY: "LowerPriority",
    NEVER: "Never",
};
const ResourceSharingStrategy = {
    DONTLEND: "DontLend",
    LEND: "Lend",
    LENDANDBORROW: "LendAndBorrow",
};
const ConditionOutcome = {
    FALSE: "False",
    TRUE: "True",
};
const RepositoryAccessMode = {
    PLATFORM: "Platform",
    VPC: "Vpc",
};
const ContainerMode = {
    MULTI_MODEL: "MultiModel",
    SINGLE_MODEL: "SingleModel",
};
const ModelCacheSetting = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const ContentClassifier = {
    FREE_OF_ADULT_CONTENT: "FreeOfAdultContent",
    FREE_OF_PERSONALLY_IDENTIFIABLE_INFORMATION: "FreeOfPersonallyIdentifiableInformation",
};
const HyperParameterScalingType = {
    AUTO: "Auto",
    LINEAR: "Linear",
    LOGARITHMIC: "Logarithmic",
    REVERSE_LOGARITHMIC: "ReverseLogarithmic",
};
const ParameterType = {
    CATEGORICAL: "Categorical",
    CONTINUOUS: "Continuous",
    FREE_TEXT: "FreeText",
    INTEGER: "Integer",
};
const HyperParameterTuningJobObjectiveType = {
    MAXIMIZE: "Maximize",
    MINIMIZE: "Minimize",
};
const FairShare = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const IdleResourceSharing = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const Framework = {
    DARKNET: "DARKNET",
    KERAS: "KERAS",
    MXNET: "MXNET",
    ONNX: "ONNX",
    PYTORCH: "PYTORCH",
    SKLEARN: "SKLEARN",
    TENSORFLOW: "TENSORFLOW",
    TFLITE: "TFLITE",
    XGBOOST: "XGBOOST",
};
const ProcessingS3UploadMode = {
    CONTINUOUS: "Continuous",
    END_OF_JOB: "EndOfJob",
};
const ProcessingInstanceType = {
    ML_C4_2XLARGE: "ml.c4.2xlarge",
    ML_C4_4XLARGE: "ml.c4.4xlarge",
    ML_C4_8XLARGE: "ml.c4.8xlarge",
    ML_C4_XLARGE: "ml.c4.xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_C7I_12XLARGE: "ml.c7i.12xlarge",
    ML_C7I_16XLARGE: "ml.c7i.16xlarge",
    ML_C7I_24XLARGE: "ml.c7i.24xlarge",
    ML_C7I_2XLARGE: "ml.c7i.2xlarge",
    ML_C7I_48XLARGE: "ml.c7i.48xlarge",
    ML_C7I_4XLARGE: "ml.c7i.4xlarge",
    ML_C7I_8XLARGE: "ml.c7i.8xlarge",
    ML_C7I_LARGE: "ml.c7i.large",
    ML_C7I_XLARGE: "ml.c7i.xlarge",
    ML_G4DN_12XLARGE: "ml.g4dn.12xlarge",
    ML_G4DN_16XLARGE: "ml.g4dn.16xlarge",
    ML_G4DN_2XLARGE: "ml.g4dn.2xlarge",
    ML_G4DN_4XLARGE: "ml.g4dn.4xlarge",
    ML_G4DN_8XLARGE: "ml.g4dn.8xlarge",
    ML_G4DN_XLARGE: "ml.g4dn.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6E_12XLARGE: "ml.g6e.12xlarge",
    ML_G6E_16XLARGE: "ml.g6e.16xlarge",
    ML_G6E_24XLARGE: "ml.g6e.24xlarge",
    ML_G6E_2XLARGE: "ml.g6e.2xlarge",
    ML_G6E_48XLARGE: "ml.g6e.48xlarge",
    ML_G6E_4XLARGE: "ml.g6e.4xlarge",
    ML_G6E_8XLARGE: "ml.g6e.8xlarge",
    ML_G6E_XLARGE: "ml.g6e.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_G7E_12XLARGE: "ml.g7e.12xlarge",
    ML_G7E_24XLARGE: "ml.g7e.24xlarge",
    ML_G7E_2XLARGE: "ml.g7e.2xlarge",
    ML_G7E_48XLARGE: "ml.g7e.48xlarge",
    ML_G7E_4XLARGE: "ml.g7e.4xlarge",
    ML_G7E_8XLARGE: "ml.g7e.8xlarge",
    ML_M4_10XLARGE: "ml.m4.10xlarge",
    ML_M4_16XLARGE: "ml.m4.16xlarge",
    ML_M4_2XLARGE: "ml.m4.2xlarge",
    ML_M4_4XLARGE: "ml.m4.4xlarge",
    ML_M4_XLARGE: "ml.m4.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_LARGE: "ml.m5.large",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_P2_16XLARGE: "ml.p2.16xlarge",
    ML_P2_8XLARGE: "ml.p2.8xlarge",
    ML_P2_XLARGE: "ml.p2.xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
    ML_P5_4XLARGE: "ml.p5.4xlarge",
    ML_R5D_12XLARGE: "ml.r5d.12xlarge",
    ML_R5D_16XLARGE: "ml.r5d.16xlarge",
    ML_R5D_24XLARGE: "ml.r5d.24xlarge",
    ML_R5D_2XLARGE: "ml.r5d.2xlarge",
    ML_R5D_4XLARGE: "ml.r5d.4xlarge",
    ML_R5D_8XLARGE: "ml.r5d.8xlarge",
    ML_R5D_LARGE: "ml.r5d.large",
    ML_R5D_XLARGE: "ml.r5d.xlarge",
    ML_R5_12XLARGE: "ml.r5.12xlarge",
    ML_R5_16XLARGE: "ml.r5.16xlarge",
    ML_R5_24XLARGE: "ml.r5.24xlarge",
    ML_R5_2XLARGE: "ml.r5.2xlarge",
    ML_R5_4XLARGE: "ml.r5.4xlarge",
    ML_R5_8XLARGE: "ml.r5.8xlarge",
    ML_R5_LARGE: "ml.r5.large",
    ML_R5_XLARGE: "ml.r5.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_T3_2XLARGE: "ml.t3.2xlarge",
    ML_T3_LARGE: "ml.t3.large",
    ML_T3_MEDIUM: "ml.t3.medium",
    ML_T3_XLARGE: "ml.t3.xlarge",
};
const EdgePresetDeploymentType = {
    GreengrassV2Component: "GreengrassV2Component",
};
const RStudioServerProAccessStatus = {
    Disabled: "DISABLED",
    Enabled: "ENABLED",
};
const RStudioServerProUserGroup = {
    Admin: "R_STUDIO_ADMIN",
    User: "R_STUDIO_USER",
};
const NotebookOutputOption = {
    Allowed: "Allowed",
    Disabled: "Disabled",
};
const StudioWebPortal = {
    Disabled: "DISABLED",
    Enabled: "ENABLED",
};
const MlTools = {
    AUTO_ML: "AutoMl",
    COMET: "Comet",
    DATASETS: "Datasets",
    DATA_WRANGLER: "DataWrangler",
    DEEPCHECKS_LLM_EVALUATION: "DeepchecksLLMEvaluation",
    EMR_CLUSTERS: "EmrClusters",
    ENDPOINTS: "Endpoints",
    EVALUATORS: "Evaluators",
    EXPERIMENTS: "Experiments",
    FEATURE_STORE: "FeatureStore",
    FIDDLER: "Fiddler",
    HYPER_POD_CLUSTERS: "HyperPodClusters",
    INFERENCE_OPTIMIZATION: "InferenceOptimization",
    INFERENCE_RECOMMENDER: "InferenceRecommender",
    JUMP_START: "JumpStart",
    LAKERA_GUARD: "LakeraGuard",
    MODELS: "Models",
    MODEL_EVALUATION: "ModelEvaluation",
    PERFORMANCE_EVALUATION: "PerformanceEvaluation",
    PIPELINES: "Pipelines",
    PROJECTS: "Projects",
    RUNNING_INSTANCES: "RunningInstances",
    TRAINING: "Training",
};
const SageMakerImageName = {
    sagemaker_distribution: "sagemaker_distribution",
};
const ExecutionRoleIdentityConfig = {
    DISABLED: "DISABLED",
    USER_PROFILE_NAME: "USER_PROFILE_NAME",
};
const IPAddressType = {
    DUALSTACK: "dualstack",
    IPV4: "ipv4",
};
const TagPropagation = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
const FailureHandlingPolicy = {
    DoNothing: "DO_NOTHING",
    RollbackOnFailure: "ROLLBACK_ON_FAILURE",
};
const DeviceSubsetType = {
    NameContains: "NAMECONTAINS",
    Percentage: "PERCENTAGE",
    Selection: "SELECTION",
};
exports.MetricPublishFrequencyInSeconds = void 0;
(function (MetricPublishFrequencyInSeconds) {
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_10_S"] = 10] = "FREQ_10_S";
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_30_S"] = 30] = "FREQ_30_S";
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_60_S"] = 60] = "FREQ_60_S";
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_120_S"] = 120] = "FREQ_120_S";
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_180_S"] = 180] = "FREQ_180_S";
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_240_S"] = 240] = "FREQ_240_S";
    MetricPublishFrequencyInSeconds[MetricPublishFrequencyInSeconds["FREQ_300_S"] = 300] = "FREQ_300_S";
})(exports.MetricPublishFrequencyInSeconds || (exports.MetricPublishFrequencyInSeconds = {}));
const ProductionVariantAcceleratorType = {
    ML_EIA1_LARGE: "ml.eia1.large",
    ML_EIA1_MEDIUM: "ml.eia1.medium",
    ML_EIA1_XLARGE: "ml.eia1.xlarge",
    ML_EIA2_LARGE: "ml.eia2.large",
    ML_EIA2_MEDIUM: "ml.eia2.medium",
    ML_EIA2_XLARGE: "ml.eia2.xlarge",
};
const ProductionVariantInferenceAmiVersion = {
    AL2023_GPU_4_1: "al2023-ami-sagemaker-inference-gpu-4-1",
    AL2_GPU_2: "al2-ami-sagemaker-inference-gpu-2",
    AL2_GPU_2_1: "al2-ami-sagemaker-inference-gpu-2-1",
    AL2_GPU_3_1: "al2-ami-sagemaker-inference-gpu-3-1",
    AL2_NEURON_2: "al2-ami-sagemaker-inference-neuron-2",
};
const ManagedInstanceScalingStatus = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
const RoutingStrategy = {
    LEAST_OUTSTANDING_REQUESTS: "LEAST_OUTSTANDING_REQUESTS",
    RANDOM: "RANDOM",
};
const FeatureType = {
    FRACTIONAL: "Fractional",
    INTEGRAL: "Integral",
    STRING: "String",
};
const TableFormat = {
    DEFAULT: "Default",
    GLUE: "Glue",
    ICEBERG: "Iceberg",
};
const StorageType = {
    IN_MEMORY: "InMemory",
    STANDARD: "Standard",
};
const TtlDurationUnit = {
    DAYS: "Days",
    HOURS: "Hours",
    MINUTES: "Minutes",
    SECONDS: "Seconds",
    WEEKS: "Weeks",
};
const ThroughputMode = {
    ON_DEMAND: "OnDemand",
    PROVISIONED: "Provisioned",
};
const HubContentType = {
    DATA_SET: "DataSet",
    JSON_DOC: "JsonDoc",
    MODEL: "Model",
    MODEL_REFERENCE: "ModelReference",
    NOTEBOOK: "Notebook",
};
const HyperParameterTuningJobStrategyType = {
    BAYESIAN: "Bayesian",
    GRID: "Grid",
    HYPERBAND: "Hyperband",
    RANDOM: "Random",
};
const TrainingJobEarlyStoppingType = {
    AUTO: "Auto",
    OFF: "Off",
};
const HyperParameterTuningAllocationStrategy = {
    PRIORITIZED: "Prioritized",
};
const HyperParameterTuningJobWarmStartType = {
    IDENTICAL_DATA_AND_ALGORITHM: "IdenticalDataAndAlgorithm",
    TRANSFER_LEARNING: "TransferLearning",
};
const JobType = {
    INFERENCE: "INFERENCE",
    NOTEBOOK_KERNEL: "NOTEBOOK_KERNEL",
    TRAINING: "TRAINING",
};
const Processor = {
    CPU: "CPU",
    GPU: "GPU",
};
const VendorGuidance = {
    ARCHIVED: "ARCHIVED",
    NOT_PROVIDED: "NOT_PROVIDED",
    STABLE: "STABLE",
    TO_BE_ARCHIVED: "TO_BE_ARCHIVED",
};
const ModelInfrastructureType = {
    REAL_TIME_INFERENCE: "RealTimeInference",
};
const _InstanceType = {
    ML_C4_2XLARGE: "ml.c4.2xlarge",
    ML_C4_4XLARGE: "ml.c4.4xlarge",
    ML_C4_8XLARGE: "ml.c4.8xlarge",
    ML_C4_XLARGE: "ml.c4.xlarge",
    ML_C5D_18XLARGE: "ml.c5d.18xlarge",
    ML_C5D_2XLARGE: "ml.c5d.2xlarge",
    ML_C5D_4XLARGE: "ml.c5d.4xlarge",
    ML_C5D_9XLARGE: "ml.c5d.9xlarge",
    ML_C5D_XLARGE: "ml.c5d.xlarge",
    ML_C5_18XLARGE: "ml.c5.18xlarge",
    ML_C5_2XLARGE: "ml.c5.2xlarge",
    ML_C5_4XLARGE: "ml.c5.4xlarge",
    ML_C5_9XLARGE: "ml.c5.9xlarge",
    ML_C5_XLARGE: "ml.c5.xlarge",
    ML_C6ID_12XLARGE: "ml.c6id.12xlarge",
    ML_C6ID_16XLARGE: "ml.c6id.16xlarge",
    ML_C6ID_24XLARGE: "ml.c6id.24xlarge",
    ML_C6ID_2XLARGE: "ml.c6id.2xlarge",
    ML_C6ID_32XLARGE: "ml.c6id.32xlarge",
    ML_C6ID_4XLARGE: "ml.c6id.4xlarge",
    ML_C6ID_8XLARGE: "ml.c6id.8xlarge",
    ML_C6ID_LARGE: "ml.c6id.large",
    ML_C6ID_XLARGE: "ml.c6id.xlarge",
    ML_C6I_12XLARGE: "ml.c6i.12xlarge",
    ML_C6I_16XLARGE: "ml.c6i.16xlarge",
    ML_C6I_24XLARGE: "ml.c6i.24xlarge",
    ML_C6I_2XLARGE: "ml.c6i.2xlarge",
    ML_C6I_32XLARGE: "ml.c6i.32xlarge",
    ML_C6I_4XLARGE: "ml.c6i.4xlarge",
    ML_C6I_8XLARGE: "ml.c6i.8xlarge",
    ML_C6I_LARGE: "ml.c6i.large",
    ML_C6I_XLARGE: "ml.c6i.xlarge",
    ML_C7I_12XLARGE: "ml.c7i.12xlarge",
    ML_C7I_16XLARGE: "ml.c7i.16xlarge",
    ML_C7I_24XLARGE: "ml.c7i.24xlarge",
    ML_C7I_2XLARGE: "ml.c7i.2xlarge",
    ML_C7I_48XLARGE: "ml.c7i.48xlarge",
    ML_C7I_4XLARGE: "ml.c7i.4xlarge",
    ML_C7I_8XLARGE: "ml.c7i.8xlarge",
    ML_C7I_LARGE: "ml.c7i.large",
    ML_C7I_XLARGE: "ml.c7i.xlarge",
    ML_G4DN_12XLARGE: "ml.g4dn.12xlarge",
    ML_G4DN_16XLARGE: "ml.g4dn.16xlarge",
    ML_G4DN_2XLARGE: "ml.g4dn.2xlarge",
    ML_G4DN_4XLARGE: "ml.g4dn.4xlarge",
    ML_G4DN_8XLARGE: "ml.g4dn.8xlarge",
    ML_G4DN_XLARGE: "ml.g4dn.xlarge",
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_INF1_24XLARGE: "ml.inf1.24xlarge",
    ML_INF1_2XLARGE: "ml.inf1.2xlarge",
    ML_INF1_6XLARGE: "ml.inf1.6xlarge",
    ML_INF1_XLARGE: "ml.inf1.xlarge",
    ML_INF2_24XLARGE: "ml.inf2.24xlarge",
    ML_INF2_48XLARGE: "ml.inf2.48xlarge",
    ML_INF2_8XLARGE: "ml.inf2.8xlarge",
    ML_INF2_XLARGE: "ml.inf2.xlarge",
    ML_M4_10XLARGE: "ml.m4.10xlarge",
    ML_M4_16XLARGE: "ml.m4.16xlarge",
    ML_M4_2XLARGE: "ml.m4.2xlarge",
    ML_M4_4XLARGE: "ml.m4.4xlarge",
    ML_M4_XLARGE: "ml.m4.xlarge",
    ML_M5D_12XLARGE: "ml.m5d.12xlarge",
    ML_M5D_16XLARGE: "ml.m5d.16xlarge",
    ML_M5D_24XLARGE: "ml.m5d.24xlarge",
    ML_M5D_2XLARGE: "ml.m5d.2xlarge",
    ML_M5D_4XLARGE: "ml.m5d.4xlarge",
    ML_M5D_8XLARGE: "ml.m5d.8xlarge",
    ML_M5D_LARGE: "ml.m5d.large",
    ML_M5D_XLARGE: "ml.m5d.xlarge",
    ML_M5_12XLARGE: "ml.m5.12xlarge",
    ML_M5_24XLARGE: "ml.m5.24xlarge",
    ML_M5_2XLARGE: "ml.m5.2xlarge",
    ML_M5_4XLARGE: "ml.m5.4xlarge",
    ML_M5_XLARGE: "ml.m5.xlarge",
    ML_M6ID_12XLARGE: "ml.m6id.12xlarge",
    ML_M6ID_16XLARGE: "ml.m6id.16xlarge",
    ML_M6ID_24XLARGE: "ml.m6id.24xlarge",
    ML_M6ID_2XLARGE: "ml.m6id.2xlarge",
    ML_M6ID_32XLARGE: "ml.m6id.32xlarge",
    ML_M6ID_4XLARGE: "ml.m6id.4xlarge",
    ML_M6ID_8XLARGE: "ml.m6id.8xlarge",
    ML_M6ID_LARGE: "ml.m6id.large",
    ML_M6ID_XLARGE: "ml.m6id.xlarge",
    ML_M6I_12XLARGE: "ml.m6i.12xlarge",
    ML_M6I_16XLARGE: "ml.m6i.16xlarge",
    ML_M6I_24XLARGE: "ml.m6i.24xlarge",
    ML_M6I_2XLARGE: "ml.m6i.2xlarge",
    ML_M6I_32XLARGE: "ml.m6i.32xlarge",
    ML_M6I_4XLARGE: "ml.m6i.4xlarge",
    ML_M6I_8XLARGE: "ml.m6i.8xlarge",
    ML_M6I_LARGE: "ml.m6i.large",
    ML_M6I_XLARGE: "ml.m6i.xlarge",
    ML_M7I_12XLARGE: "ml.m7i.12xlarge",
    ML_M7I_16XLARGE: "ml.m7i.16xlarge",
    ML_M7I_24XLARGE: "ml.m7i.24xlarge",
    ML_M7I_2XLARGE: "ml.m7i.2xlarge",
    ML_M7I_48XLARGE: "ml.m7i.48xlarge",
    ML_M7I_4XLARGE: "ml.m7i.4xlarge",
    ML_M7I_8XLARGE: "ml.m7i.8xlarge",
    ML_M7I_LARGE: "ml.m7i.large",
    ML_M7I_XLARGE: "ml.m7i.xlarge",
    ML_P2_16XLARGE: "ml.p2.16xlarge",
    ML_P2_8XLARGE: "ml.p2.8xlarge",
    ML_P2_XLARGE: "ml.p2.xlarge",
    ML_P3DN_24XLARGE: "ml.p3dn.24xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_P6_B200_48XLARGE: "ml.p6-b200.48xlarge",
    ML_R5_12XLARGE: "ml.r5.12xlarge",
    ML_R5_16XLARGE: "ml.r5.16xlarge",
    ML_R5_24XLARGE: "ml.r5.24xlarge",
    ML_R5_2XLARGE: "ml.r5.2xlarge",
    ML_R5_4XLARGE: "ml.r5.4xlarge",
    ML_R5_8XLARGE: "ml.r5.8xlarge",
    ML_R5_LARGE: "ml.r5.large",
    ML_R5_XLARGE: "ml.r5.xlarge",
    ML_R6ID_12XLARGE: "ml.r6id.12xlarge",
    ML_R6ID_16XLARGE: "ml.r6id.16xlarge",
    ML_R6ID_24XLARGE: "ml.r6id.24xlarge",
    ML_R6ID_2XLARGE: "ml.r6id.2xlarge",
    ML_R6ID_32XLARGE: "ml.r6id.32xlarge",
    ML_R6ID_4XLARGE: "ml.r6id.4xlarge",
    ML_R6ID_8XLARGE: "ml.r6id.8xlarge",
    ML_R6ID_LARGE: "ml.r6id.large",
    ML_R6ID_XLARGE: "ml.r6id.xlarge",
    ML_R6I_12XLARGE: "ml.r6i.12xlarge",
    ML_R6I_16XLARGE: "ml.r6i.16xlarge",
    ML_R6I_24XLARGE: "ml.r6i.24xlarge",
    ML_R6I_2XLARGE: "ml.r6i.2xlarge",
    ML_R6I_32XLARGE: "ml.r6i.32xlarge",
    ML_R6I_4XLARGE: "ml.r6i.4xlarge",
    ML_R6I_8XLARGE: "ml.r6i.8xlarge",
    ML_R6I_LARGE: "ml.r6i.large",
    ML_R6I_XLARGE: "ml.r6i.xlarge",
    ML_R7I_12XLARGE: "ml.r7i.12xlarge",
    ML_R7I_16XLARGE: "ml.r7i.16xlarge",
    ML_R7I_24XLARGE: "ml.r7i.24xlarge",
    ML_R7I_2XLARGE: "ml.r7i.2xlarge",
    ML_R7I_48XLARGE: "ml.r7i.48xlarge",
    ML_R7I_4XLARGE: "ml.r7i.4xlarge",
    ML_R7I_8XLARGE: "ml.r7i.8xlarge",
    ML_R7I_LARGE: "ml.r7i.large",
    ML_R7I_XLARGE: "ml.r7i.xlarge",
    ML_T2_2XLARGE: "ml.t2.2xlarge",
    ML_T2_LARGE: "ml.t2.large",
    ML_T2_MEDIUM: "ml.t2.medium",
    ML_T2_XLARGE: "ml.t2.xlarge",
    ML_T3_2XLARGE: "ml.t3.2xlarge",
    ML_T3_LARGE: "ml.t3.large",
    ML_T3_MEDIUM: "ml.t3.medium",
    ML_T3_XLARGE: "ml.t3.xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
};
const InferenceExperimentType = {
    SHADOW_MODE: "ShadowMode",
};
const RecommendationJobSupportedEndpointType = {
    REALTIME: "RealTime",
    SERVERLESS: "Serverless",
};
const TrafficType = {
    PHASES: "PHASES",
    STAIRS: "STAIRS",
};
const RecommendationJobType = {
    ADVANCED: "Advanced",
    DEFAULT: "Default",
};
const FlatInvocations = {
    CONTINUE: "Continue",
    STOP: "Stop",
};
const ModelRegistrationMode = {
    AUTO_MODEL_REGISTRATION_DISABLED: "AutoModelRegistrationDisabled",
    AUTO_MODEL_REGISTRATION_ENABLED: "AutoModelRegistrationEnabled",
};
const TrackingServerSize = {
    L: "Large",
    M: "Medium",
    S: "Small",
};
const InferenceExecutionMode = {
    DIRECT: "Direct",
    SERIAL: "Serial",
};
const ModelCardStatus = {
    APPROVED: "Approved",
    ARCHIVED: "Archived",
    DRAFT: "Draft",
    PENDINGREVIEW: "PendingReview",
};
const SkipModelValidation = {
    ALL: "All",
    NONE: "None",
};
const MonitoringProblemType = {
    BINARY_CLASSIFICATION: "BinaryClassification",
    MULTICLASS_CLASSIFICATION: "MulticlassClassification",
    REGRESSION: "Regression",
};
const MonitoringType = {
    DATA_QUALITY: "DataQuality",
    MODEL_BIAS: "ModelBias",
    MODEL_EXPLAINABILITY: "ModelExplainability",
    MODEL_QUALITY: "ModelQuality",
};
const NotebookInstanceAcceleratorType = {
    ML_EIA1_LARGE: "ml.eia1.large",
    ML_EIA1_MEDIUM: "ml.eia1.medium",
    ML_EIA1_XLARGE: "ml.eia1.xlarge",
    ML_EIA2_LARGE: "ml.eia2.large",
    ML_EIA2_MEDIUM: "ml.eia2.medium",
    ML_EIA2_XLARGE: "ml.eia2.xlarge",
};
const DirectInternetAccess = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const RootAccess = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const OptimizationJobDeploymentInstanceType = {
    ML_G5_12XLARGE: "ml.g5.12xlarge",
    ML_G5_16XLARGE: "ml.g5.16xlarge",
    ML_G5_24XLARGE: "ml.g5.24xlarge",
    ML_G5_2XLARGE: "ml.g5.2xlarge",
    ML_G5_48XLARGE: "ml.g5.48xlarge",
    ML_G5_4XLARGE: "ml.g5.4xlarge",
    ML_G5_8XLARGE: "ml.g5.8xlarge",
    ML_G5_XLARGE: "ml.g5.xlarge",
    ML_G6E_12XLARGE: "ml.g6e.12xlarge",
    ML_G6E_16XLARGE: "ml.g6e.16xlarge",
    ML_G6E_24XLARGE: "ml.g6e.24xlarge",
    ML_G6E_2XLARGE: "ml.g6e.2xlarge",
    ML_G6E_48XLARGE: "ml.g6e.48xlarge",
    ML_G6E_4XLARGE: "ml.g6e.4xlarge",
    ML_G6E_8XLARGE: "ml.g6e.8xlarge",
    ML_G6E_XLARGE: "ml.g6e.xlarge",
    ML_G6_12XLARGE: "ml.g6.12xlarge",
    ML_G6_16XLARGE: "ml.g6.16xlarge",
    ML_G6_24XLARGE: "ml.g6.24xlarge",
    ML_G6_2XLARGE: "ml.g6.2xlarge",
    ML_G6_48XLARGE: "ml.g6.48xlarge",
    ML_G6_4XLARGE: "ml.g6.4xlarge",
    ML_G6_8XLARGE: "ml.g6.8xlarge",
    ML_G6_XLARGE: "ml.g6.xlarge",
    ML_INF2_24XLARGE: "ml.inf2.24xlarge",
    ML_INF2_48XLARGE: "ml.inf2.48xlarge",
    ML_INF2_8XLARGE: "ml.inf2.8xlarge",
    ML_INF2_XLARGE: "ml.inf2.xlarge",
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5EN_48XLARGE: "ml.p5en.48xlarge",
    ML_P5E_48XLARGE: "ml.p5e.48xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
};
const ModelSpeculativeDecodingTechnique = {
    EAGLE: "EAGLE",
};
const ModelSpeculativeDecodingS3DataType = {
    ManifestFile: "ManifestFile",
    S3Prefix: "S3Prefix",
};
const PartnerAppAuthType = {
    IAM: "IAM",
};
const PartnerAppType = {
    COMET: "comet",
    DEEPCHECKS_LLM_EVALUATION: "deepchecks-llm-evaluation",
    FIDDLER: "fiddler",
    LAKERA_GUARD: "lakera-guard",
};
const DataDistributionType = {
    FULLYREPLICATED: "FullyReplicated",
    SHARDEDBYS3KEY: "ShardedByS3Key",
};
const InputMode = {
    FILE: "File",
    PIPE: "Pipe",
};
const RedshiftResultCompressionType = {
    BZIP2: "BZIP2",
    GZIP: "GZIP",
    NONE: "None",
    SNAPPY: "SNAPPY",
    ZSTD: "ZSTD",
};
const RedshiftResultFormat = {
    CSV: "CSV",
    PARQUET: "PARQUET",
};
const ProcessingS3CompressionType = {
    GZIP: "Gzip",
    NONE: "None",
};
const ProcessingS3DataType = {
    MANIFEST_FILE: "ManifestFile",
    S3_PREFIX: "S3Prefix",
};
const SharingType = {
    Private: "Private",
    Shared: "Shared",
};
const StudioLifecycleConfigAppType = {
    CodeEditor: "CodeEditor",
    JupyterLab: "JupyterLab",
    JupyterServer: "JupyterServer",
    KernelGateway: "KernelGateway",
};
const CustomizationTechnique = {
    DPO: "DPO",
    RLAIF: "RLAIF",
    RLVR: "RLVR",
    SFT: "SFT",
};
const EvaluationType = {
    BENCHMARK_EVALUATION: "BenchmarkEvaluation",
    CUSTOM_SCORER_EVALUATION: "CustomScorerEvaluation",
    LLMAJ_EVALUATION: "LLMAJEvaluation",
};
const ServerlessJobType = {
    EVALUATION: "Evaluation",
    FINE_TUNING: "FineTuning",
};
const Peft = {
    LORA: "LORA",
};
const JoinSource = {
    INPUT: "Input",
    NONE: "None",
};
const TrialComponentPrimaryStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const WorkforceIpAddressType = {
    dualstack: "dualstack",
    ipv4: "ipv4",
};
const EnabledOrDisabled = {
    Disabled: "Disabled",
    Enabled: "Enabled",
};
const CrossAccountFilterOption = {
    CROSS_ACCOUNT: "CrossAccount",
    SAME_ACCOUNT: "SameAccount",
};
const Statistic = {
    AVERAGE: "Average",
    MAXIMUM: "Maximum",
    MINIMUM: "Minimum",
    SAMPLE_COUNT: "SampleCount",
    SUM: "Sum",
};
const RuleEvaluationStatus = {
    ERROR: "Error",
    IN_PROGRESS: "InProgress",
    ISSUES_FOUND: "IssuesFound",
    NO_ISSUES_FOUND: "NoIssuesFound",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const RetentionType = {
    Delete: "Delete",
    Retain: "Retain",
};
const RecommendationStatus = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
    NOT_APPLICABLE: "NOT_APPLICABLE",
};
const StageStatus = {
    Creating: "CREATING",
    Deployed: "DEPLOYED",
    Failed: "FAILED",
    InProgress: "INPROGRESS",
    ReadyToDeploy: "READYTODEPLOY",
    Starting: "STARTING",
    Stopped: "STOPPED",
    Stopping: "STOPPING",
};
const SchedulerConfigComponent = {
    FAIR_SHARE: "FairShare",
    IDLE_RESOURCE_SHARING: "IdleResourceSharing",
    PRIORITY_CLASSES: "PriorityClasses",
};
const DomainStatus = {
    Delete_Failed: "Delete_Failed",
    Deleting: "Deleting",
    Failed: "Failed",
    InService: "InService",
    Pending: "Pending",
    Update_Failed: "Update_Failed",
    Updating: "Updating",
};
const EdgePackagingJobStatus = {
    Completed: "COMPLETED",
    Failed: "FAILED",
    InProgress: "INPROGRESS",
    Starting: "STARTING",
    Stopped: "STOPPED",
    Stopping: "STOPPING",
};
const EdgePresetDeploymentStatus = {
    Completed: "COMPLETED",
    Failed: "FAILED",
};
const EndpointStatus = {
    CREATING: "Creating",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_SERVICE: "InService",
    OUT_OF_SERVICE: "OutOfService",
    ROLLING_BACK: "RollingBack",
    SYSTEM_UPDATING: "SystemUpdating",
    UPDATE_ROLLBACK_FAILED: "UpdateRollbackFailed",
    UPDATING: "Updating",
};
const VariantStatus = {
    ACTIVATING_TRAFFIC: "ActivatingTraffic",
    BAKING: "Baking",
    CREATING: "Creating",
    DELETING: "Deleting",
    UPDATING: "Updating",
};
const FeatureGroupStatus = {
    CREATED: "Created",
    CREATE_FAILED: "CreateFailed",
    CREATING: "Creating",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
};
const LastUpdateStatusValue = {
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    SUCCESSFUL: "Successful",
};
const OfflineStoreStatusValue = {
    ACTIVE: "Active",
    BLOCKED: "Blocked",
    DISABLED: "Disabled",
};
const FlowDefinitionStatus = {
    ACTIVE: "Active",
    DELETING: "Deleting",
    FAILED: "Failed",
    INITIALIZING: "Initializing",
};
const HubStatus = {
    CREATE_FAILED: "CreateFailed",
    CREATING: "Creating",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    IN_SERVICE: "InService",
    UPDATE_FAILED: "UpdateFailed",
    UPDATING: "Updating",
};
const HubContentStatus = {
    AVAILABLE: "Available",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    IMPORTING: "Importing",
    IMPORT_FAILED: "ImportFailed",
    PENDING_DELETE: "PendingDelete",
    PENDING_IMPORT: "PendingImport",
};
const HubContentSupportStatus = {
    DEPRECATED: "Deprecated",
    RESTRICTED: "Restricted",
    SUPPORTED: "Supported",
};
const HumanTaskUiStatus = {
    ACTIVE: "Active",
    DELETING: "Deleting",
};
const TrainingJobStatus = {
    COMPLETED: "Completed",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const HyperParameterTuningJobStatus = {
    COMPLETED: "Completed",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const ImageStatus = {
    CREATED: "CREATED",
    CREATE_FAILED: "CREATE_FAILED",
    CREATING: "CREATING",
    DELETE_FAILED: "DELETE_FAILED",
    DELETING: "DELETING",
    UPDATE_FAILED: "UPDATE_FAILED",
    UPDATING: "UPDATING",
};
const ImageVersionStatus = {
    CREATED: "CREATED",
    CREATE_FAILED: "CREATE_FAILED",
    CREATING: "CREATING",
    DELETE_FAILED: "DELETE_FAILED",
    DELETING: "DELETING",
};
const InferenceComponentStatus = {
    CREATING: "Creating",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_SERVICE: "InService",
    UPDATING: "Updating",
};
const InferenceComponentCapacitySizeType = {
    CAPACITY_PERCENT: "CAPACITY_PERCENT",
    COPY_COUNT: "COPY_COUNT",
};
const ModelVariantStatus = {
    CREATING: "Creating",
    DELETED: "Deleted",
    DELETING: "Deleting",
    IN_SERVICE: "InService",
    UPDATING: "Updating",
};
const InferenceExperimentStatus = {
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
    CREATED: "Created",
    CREATING: "Creating",
    RUNNING: "Running",
    STARTING: "Starting",
    STOPPING: "Stopping",
    UPDATING: "Updating",
};
const RecommendationJobStatus = {
    COMPLETED: "COMPLETED",
    DELETED: "DELETED",
    DELETING: "DELETING",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
    PENDING: "PENDING",
    STOPPED: "STOPPED",
    STOPPING: "STOPPING",
};
const LabelingJobStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    INITIALIZING: "Initializing",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const MaintenanceStatus = {
    MAINTENANCE_COMPLETE: "MaintenanceComplete",
    MAINTENANCE_FAILED: "MaintenanceFailed",
    MAINTENANCE_IN_PROGRESS: "MaintenanceInProgress",
};
const MlflowAppStatus = {
    CREATED: "Created",
    CREATE_FAILED: "CreateFailed",
    CREATING: "Creating",
    DELETED: "Deleted",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    UPDATED: "Updated",
    UPDATE_FAILED: "UpdateFailed",
    UPDATING: "Updating",
};
const IsTrackingServerActive = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
};
const TrackingServerMaintenanceStatus = {
    MAINTENANCE_COMPLETE: "MaintenanceComplete",
    MAINTENANCE_FAILED: "MaintenanceFailed",
    MAINTENANCE_IN_PROGRESS: "MaintenanceInProgress",
};
const TrackingServerStatus = {
    CREATED: "Created",
    CREATE_FAILED: "CreateFailed",
    CREATING: "Creating",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    MAINTENANCE_COMPLETE: "MaintenanceComplete",
    MAINTENANCE_FAILED: "MaintenanceFailed",
    MAINTENANCE_IN_PROGRESS: "MaintenanceInProgress",
    STARTED: "Started",
    STARTING: "Starting",
    START_FAILED: "StartFailed",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
    STOP_FAILED: "StopFailed",
    UPDATED: "Updated",
    UPDATE_FAILED: "UpdateFailed",
    UPDATING: "Updating",
};
const ModelCardProcessingStatus = {
    CONTENT_DELETED: "ContentDeleted",
    DELETE_COMPLETED: "DeleteCompleted",
    DELETE_FAILED: "DeleteFailed",
    DELETE_INPROGRESS: "DeleteInProgress",
    DELETE_PENDING: "DeletePending",
    EXPORTJOBS_DELETED: "ExportJobsDeleted",
};
const ModelCardExportJobStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
};
const DetailedModelPackageStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    NOT_STARTED: "NotStarted",
};
const ModelPackageGroupStatus = {
    COMPLETED: "Completed",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    PENDING: "Pending",
};
const ExecutionStatus = {
    COMPLETED: "Completed",
    COMPLETED_WITH_VIOLATIONS: "CompletedWithViolations",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    PENDING: "Pending",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const ScheduleStatus = {
    FAILED: "Failed",
    PENDING: "Pending",
    SCHEDULED: "Scheduled",
    STOPPED: "Stopped",
};
const NotebookInstanceStatus = {
    Deleting: "Deleting",
    Failed: "Failed",
    InService: "InService",
    Pending: "Pending",
    Stopped: "Stopped",
    Stopping: "Stopping",
    Updating: "Updating",
};
const OptimizationJobStatus = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    INPROGRESS: "INPROGRESS",
    STARTING: "STARTING",
    STOPPED: "STOPPED",
    STOPPING: "STOPPING",
};
const PartnerAppStatus = {
    AVAILABLE: "Available",
    CREATING: "Creating",
    DELETED: "Deleted",
    DELETING: "Deleting",
    FAILED: "Failed",
    UPDATE_FAILED: "UpdateFailed",
    UPDATING: "Updating",
};
const PipelineStatus = {
    ACTIVE: "Active",
    DELETING: "Deleting",
};
const PipelineExecutionStatus = {
    EXECUTING: "Executing",
    FAILED: "Failed",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
    SUCCEEDED: "Succeeded",
};
const ProcessingJobStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const ProjectStatus = {
    CREATE_COMPLETED: "CreateCompleted",
    CREATE_FAILED: "CreateFailed",
    CREATE_IN_PROGRESS: "CreateInProgress",
    DELETE_COMPLETED: "DeleteCompleted",
    DELETE_FAILED: "DeleteFailed",
    DELETE_IN_PROGRESS: "DeleteInProgress",
    PENDING: "Pending",
    UPDATE_COMPLETED: "UpdateCompleted",
    UPDATE_FAILED: "UpdateFailed",
    UPDATE_IN_PROGRESS: "UpdateInProgress",
};
const ReservedCapacityInstanceType = {
    ML_P4DE_24XLARGE: "ml.p4de.24xlarge",
    ML_P4D_24XLARGE: "ml.p4d.24xlarge",
    ML_P5EN_48XLARGE: "ml.p5en.48xlarge",
    ML_P5E_48XLARGE: "ml.p5e.48xlarge",
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_P5_4XLARGE: "ml.p5.4xlarge",
    ML_P6E_GB200_36XLARGE: "ml.p6e-gb200.36xlarge",
    ML_P6_B200_48XLARGE: "ml.p6-b200.48xlarge",
    ML_P6_B300_48XLARGE: "ml.p6-b300.48xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
    ML_TRN2_48XLARGE: "ml.trn2.48xlarge",
};
const ReservedCapacityType = {
    INSTANCE: "Instance",
    ULTRASERVER: "UltraServer",
};
const ReservedCapacityStatus = {
    ACTIVE: "Active",
    EXPIRED: "Expired",
    FAILED: "Failed",
    PENDING: "Pending",
    SCHEDULED: "Scheduled",
};
const SpaceStatus = {
    Delete_Failed: "Delete_Failed",
    Deleting: "Deleting",
    Failed: "Failed",
    InService: "InService",
    Pending: "Pending",
    Update_Failed: "Update_Failed",
    Updating: "Updating",
};
const ProfilingStatus = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const SecondaryStatus = {
    COMPLETED: "Completed",
    DOWNLOADING: "Downloading",
    DOWNLOADING_TRAINING_IMAGE: "DownloadingTrainingImage",
    FAILED: "Failed",
    INTERRUPTED: "Interrupted",
    LAUNCHING_ML_INSTANCES: "LaunchingMLInstances",
    MAX_RUNTIME_EXCEEDED: "MaxRuntimeExceeded",
    MAX_WAIT_TIME_EXCEEDED: "MaxWaitTimeExceeded",
    PENDING: "Pending",
    PREPARING_TRAINING_STACK: "PreparingTrainingStack",
    RESTARTING: "Restarting",
    STARTING: "Starting",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
    TRAINING: "Training",
    UPDATING: "Updating",
    UPLOADING: "Uploading",
};
const WarmPoolResourceStatus = {
    AVAILABLE: "Available",
    INUSE: "InUse",
    REUSED: "Reused",
    TERMINATED: "Terminated",
};
const TrainingPlanStatus = {
    ACTIVE: "Active",
    EXPIRED: "Expired",
    FAILED: "Failed",
    PENDING: "Pending",
    SCHEDULED: "Scheduled",
};
const SageMakerResourceName = {
    ENDPOINT: "endpoint",
    HYPERPOD_CLUSTER: "hyperpod-cluster",
    TRAINING_JOB: "training-job",
};
const TransformJobStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
const UserProfileStatus = {
    Delete_Failed: "Delete_Failed",
    Deleting: "Deleting",
    Failed: "Failed",
    InService: "InService",
    Pending: "Pending",
    Update_Failed: "Update_Failed",
    Updating: "Updating",
};
const WorkforceStatus = {
    ACTIVE: "Active",
    DELETING: "Deleting",
    FAILED: "Failed",
    INITIALIZING: "Initializing",
    UPDATING: "Updating",
};
const DeviceDeploymentStatus = {
    Deployed: "DEPLOYED",
    Failed: "FAILED",
    InProgress: "INPROGRESS",
    ReadyToDeploy: "READYTODEPLOY",
    Stopped: "STOPPED",
    Stopping: "STOPPING",
};
const Direction = {
    ASCENDANTS: "Ascendants",
    BOTH: "Both",
    DESCENDANTS: "Descendants",
};
const EndpointConfigSortKey = {
    CreationTime: "CreationTime",
    Name: "Name",
};
const EndpointSortKey = {
    CreationTime: "CreationTime",
    Name: "Name",
    Status: "Status",
};
const EventSortBy = {
    EVENT_TIME: "EventTime",
};
const FeatureGroupSortBy = {
    CREATION_TIME: "CreationTime",
    FEATURE_GROUP_STATUS: "FeatureGroupStatus",
    NAME: "Name",
    OFFLINE_STORE_STATUS: "OfflineStoreStatus",
};
const FeatureGroupSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const Operator = {
    CONTAINS: "Contains",
    EQUALS: "Equals",
    EXISTS: "Exists",
    GREATER_THAN: "GreaterThan",
    GREATER_THAN_OR_EQUAL_TO: "GreaterThanOrEqualTo",
    IN: "In",
    LESS_THAN: "LessThan",
    LESS_THAN_OR_EQUAL_TO: "LessThanOrEqualTo",
    NOT_EQUALS: "NotEquals",
    NOT_EXISTS: "NotExists",
};
const SagemakerServicecatalogStatus = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
const ResourceType = {
    ENDPOINT: "Endpoint",
    EXPERIMENT: "Experiment",
    EXPERIMENT_TRIAL: "ExperimentTrial",
    EXPERIMENT_TRIAL_COMPONENT: "ExperimentTrialComponent",
    FEATURE_GROUP: "FeatureGroup",
    FEATURE_METADATA: "FeatureMetadata",
    HYPER_PARAMETER_TUNING_JOB: "HyperParameterTuningJob",
    IMAGE: "Image",
    IMAGE_VERSION: "ImageVersion",
    MODEL: "Model",
    MODEL_CARD: "ModelCard",
    MODEL_PACKAGE: "ModelPackage",
    MODEL_PACKAGE_GROUP: "ModelPackageGroup",
    PIPELINE: "Pipeline",
    PIPELINE_EXECUTION: "PipelineExecution",
    PIPELINE_VERSION: "PipelineVersion",
    PROJECT: "Project",
    TRAINING_JOB: "TrainingJob",
};
const HubContentSortBy = {
    CREATION_TIME: "CreationTime",
    HUB_CONTENT_NAME: "HubContentName",
    HUB_CONTENT_STATUS: "HubContentStatus",
};
const HubSortBy = {
    ACCOUNT_ID_OWNER: "AccountIdOwner",
    CREATION_TIME: "CreationTime",
    HUB_NAME: "HubName",
    HUB_STATUS: "HubStatus",
};
const HyperParameterTuningJobSortByOptions = {
    CreationTime: "CreationTime",
    Name: "Name",
    Status: "Status",
};
const ImageSortBy = {
    CREATION_TIME: "CREATION_TIME",
    IMAGE_NAME: "IMAGE_NAME",
    LAST_MODIFIED_TIME: "LAST_MODIFIED_TIME",
};
const ImageSortOrder = {
    ASCENDING: "ASCENDING",
    DESCENDING: "DESCENDING",
};
const ImageVersionSortBy = {
    CREATION_TIME: "CREATION_TIME",
    LAST_MODIFIED_TIME: "LAST_MODIFIED_TIME",
    VERSION: "VERSION",
};
const ImageVersionSortOrder = {
    ASCENDING: "ASCENDING",
    DESCENDING: "DESCENDING",
};
const InferenceComponentSortKey = {
    CreationTime: "CreationTime",
    Name: "Name",
    Status: "Status",
};
const InferenceExperimentStopDesiredState = {
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
};
const RecommendationStepType = {
    BENCHMARK: "BENCHMARK",
};
const LineageType = {
    ACTION: "Action",
    ARTIFACT: "Artifact",
    CONTEXT: "Context",
    TRIAL_COMPONENT: "TrialComponent",
};
const SortActionsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const SortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const SortArtifactsBy = {
    CREATION_TIME: "CreationTime",
};
const SortAssociationsBy = {
    CREATION_TIME: "CreationTime",
    DESTINATION_ARN: "DestinationArn",
    DESTINATION_TYPE: "DestinationType",
    SOURCE_ARN: "SourceArn",
    SOURCE_TYPE: "SourceType",
};
const SortClusterSchedulerConfigBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const ListCompilationJobsSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const SortQuotaBy = {
    CLUSTER_ARN: "ClusterArn",
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const SortContextsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const MonitoringJobDefinitionSortKey = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const ListDeviceFleetsSortBy = {
    CreationTime: "CREATION_TIME",
    LastModifiedTime: "LAST_MODIFIED_TIME",
    Name: "NAME",
};
const ListEdgeDeploymentPlansSortBy = {
    CreationTime: "CREATION_TIME",
    DeviceFleetName: "DEVICE_FLEET_NAME",
    LastModifiedTime: "LAST_MODIFIED_TIME",
    Name: "NAME",
};
const ListEdgePackagingJobsSortBy = {
    CreationTime: "CREATION_TIME",
    EdgePackagingJobStatus: "STATUS",
    LastModifiedTime: "LAST_MODIFIED_TIME",
    ModelName: "MODEL_NAME",
    Name: "NAME",
};
const OrderKey = {
    Ascending: "Ascending",
    Descending: "Descending",
};
const SortExperimentsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const SortInferenceExperimentsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const ListInferenceRecommendationsJobsSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const SortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const ListLabelingJobsForWorkteamSortByOptions = {
    CREATION_TIME: "CreationTime",
};
const SortLineageGroupsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const SortMlflowAppBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const SortTrackingServerBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const ModelCardExportJobSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const ModelCardExportJobSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const ModelCardSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const ModelCardSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const ModelCardVersionSortBy = {
    VERSION: "Version",
};
const ModelMetadataFilterType = {
    DOMAIN: "Domain",
    FRAMEWORK: "Framework",
    FRAMEWORKVERSION: "FrameworkVersion",
    TASK: "Task",
};
const ModelPackageGroupSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const ModelPackageType = {
    BOTH: "Both",
    UNVERSIONED: "Unversioned",
    VERSIONED: "Versioned",
};
const ModelPackageSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const ModelSortKey = {
    CreationTime: "CreationTime",
    Name: "Name",
};
const MonitoringAlertHistorySortKey = {
    CreationTime: "CreationTime",
    Status: "Status",
};
const MonitoringAlertStatus = {
    IN_ALERT: "InAlert",
    OK: "OK",
};
const MonitoringExecutionSortKey = {
    CREATION_TIME: "CreationTime",
    SCHEDULED_TIME: "ScheduledTime",
    STATUS: "Status",
};
const MonitoringScheduleSortKey = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const NotebookInstanceLifecycleConfigSortKey = {
    CREATION_TIME: "CreationTime",
    LAST_MODIFIED_TIME: "LastModifiedTime",
    NAME: "Name",
};
const NotebookInstanceLifecycleConfigSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const NotebookInstanceSortKey = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const NotebookInstanceSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const ListOptimizationJobsSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
    STATUS: "Status",
};
const SortPipelineExecutionsBy = {
    CREATION_TIME: "CreationTime",
    PIPELINE_EXECUTION_ARN: "PipelineExecutionArn",
};
const StepStatus = {
    EXECUTING: "Executing",
    FAILED: "Failed",
    STARTING: "Starting",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
    SUCCEEDED: "Succeeded",
};
const SortPipelinesBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const ProjectSortBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const ProjectSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const ResourceCatalogSortBy = {
    CREATION_TIME: "CreationTime",
};
const ResourceCatalogSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const SpaceSortKey = {
    CreationTime: "CreationTime",
    LastModifiedTime: "LastModifiedTime",
};
const StudioLifecycleConfigSortKey = {
    CreationTime: "CreationTime",
    LastModifiedTime: "LastModifiedTime",
    Name: "Name",
};
const TrainingJobSortByOptions = {
    CreationTime: "CreationTime",
    FinalObjectiveMetricValue: "FinalObjectiveMetricValue",
    Name: "Name",
    Status: "Status",
};
const TrainingPlanFilterName = {
    STATUS: "Status",
};
const TrainingPlanSortBy = {
    NAME: "TrainingPlanName",
    START_TIME: "StartTime",
    STATUS: "Status",
};
const TrainingPlanSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const SortTrialComponentsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const SortTrialsBy = {
    CREATION_TIME: "CreationTime",
    NAME: "Name",
};
const UltraServerHealthStatus = {
    IMPAIRED: "Impaired",
    INSUFFICIENT_DATA: "Insufficient-Data",
    OK: "OK",
};
const UserProfileSortKey = {
    CreationTime: "CreationTime",
    LastModifiedTime: "LastModifiedTime",
};
const ListWorkforcesSortByOptions = {
    CreateDate: "CreateDate",
    Name: "Name",
};
const ListWorkteamsSortByOptions = {
    CreateDate: "CreateDate",
    Name: "Name",
};
const ModelVariantAction = {
    PROMOTE: "Promote",
    REMOVE: "Remove",
    RETAIN: "Retain",
};
const Relation = {
    EQUAL_TO: "EqualTo",
    GREATER_THAN_OR_EQUAL_TO: "GreaterThanOrEqualTo",
};
const SearchSortOrder = {
    ASCENDING: "Ascending",
    DESCENDING: "Descending",
};
const VariantPropertyType = {
    DataCaptureConfig: "DataCaptureConfig",
    DesiredInstanceCount: "DesiredInstanceCount",
    DesiredWeight: "DesiredWeight",
};

exports.$Command = smithyClient.Command;
exports.__Client = smithyClient.Client;
exports.SageMakerServiceException = SageMakerServiceException.SageMakerServiceException;
exports.AccountDefaultStatus = AccountDefaultStatus;
exports.ActionStatus = ActionStatus;
exports.ActivationState = ActivationState;
exports.ActiveClusterOperationName = ActiveClusterOperationName;
exports.AddAssociationCommand = AddAssociationCommand;
exports.AddTagsCommand = AddTagsCommand;
exports.AdditionalS3DataSourceDataType = AdditionalS3DataSourceDataType;
exports.AggregationTransformationValue = AggregationTransformationValue;
exports.AlgorithmSortBy = AlgorithmSortBy;
exports.AlgorithmStatus = AlgorithmStatus;
exports.AppImageConfigSortKey = AppImageConfigSortKey;
exports.AppInstanceType = AppInstanceType;
exports.AppNetworkAccessType = AppNetworkAccessType;
exports.AppSecurityGroupManagement = AppSecurityGroupManagement;
exports.AppSortKey = AppSortKey;
exports.AppStatus = AppStatus;
exports.AppType = AppType;
exports.ArtifactSourceIdType = ArtifactSourceIdType;
exports.AssemblyType = AssemblyType;
exports.AssociateTrialComponentCommand = AssociateTrialComponentCommand;
exports.AssociationEdgeType = AssociationEdgeType;
exports.AsyncNotificationTopicTypes = AsyncNotificationTopicTypes;
exports.AthenaResultCompressionType = AthenaResultCompressionType;
exports.AthenaResultFormat = AthenaResultFormat;
exports.AttachClusterNodeVolumeCommand = AttachClusterNodeVolumeCommand;
exports.AuthMode = AuthMode;
exports.AutoMLAlgorithm = AutoMLAlgorithm;
exports.AutoMLChannelType = AutoMLChannelType;
exports.AutoMLJobObjectiveType = AutoMLJobObjectiveType;
exports.AutoMLJobSecondaryStatus = AutoMLJobSecondaryStatus;
exports.AutoMLJobStatus = AutoMLJobStatus;
exports.AutoMLMetricEnum = AutoMLMetricEnum;
exports.AutoMLMetricExtendedEnum = AutoMLMetricExtendedEnum;
exports.AutoMLMode = AutoMLMode;
exports.AutoMLProblemTypeConfigName = AutoMLProblemTypeConfigName;
exports.AutoMLProcessingUnit = AutoMLProcessingUnit;
exports.AutoMLS3DataType = AutoMLS3DataType;
exports.AutoMLSortBy = AutoMLSortBy;
exports.AutoMLSortOrder = AutoMLSortOrder;
exports.AutoMountHomeEFS = AutoMountHomeEFS;
exports.AutotuneMode = AutotuneMode;
exports.AwsManagedHumanLoopRequestSource = AwsManagedHumanLoopRequestSource;
exports.BatchAddClusterNodesCommand = BatchAddClusterNodesCommand;
exports.BatchAddClusterNodesErrorCode = BatchAddClusterNodesErrorCode;
exports.BatchDeleteClusterNodesCommand = BatchDeleteClusterNodesCommand;
exports.BatchDeleteClusterNodesErrorCode = BatchDeleteClusterNodesErrorCode;
exports.BatchDescribeModelPackageCommand = BatchDescribeModelPackageCommand;
exports.BatchRebootClusterNodesCommand = BatchRebootClusterNodesCommand;
exports.BatchRebootClusterNodesErrorCode = BatchRebootClusterNodesErrorCode;
exports.BatchReplaceClusterNodesCommand = BatchReplaceClusterNodesCommand;
exports.BatchReplaceClusterNodesErrorCode = BatchReplaceClusterNodesErrorCode;
exports.BatchStrategy = BatchStrategy;
exports.BooleanOperator = BooleanOperator;
exports.CandidateSortBy = CandidateSortBy;
exports.CandidateStatus = CandidateStatus;
exports.CandidateStepType = CandidateStepType;
exports.CapacityReservationPreference = CapacityReservationPreference;
exports.CapacityReservationType = CapacityReservationType;
exports.CapacitySizeType = CapacitySizeType;
exports.CaptureMode = CaptureMode;
exports.CaptureStatus = CaptureStatus;
exports.ClarifyFeatureType = ClarifyFeatureType;
exports.ClarifyTextGranularity = ClarifyTextGranularity;
exports.ClarifyTextLanguage = ClarifyTextLanguage;
exports.ClusterAutoScalerType = ClusterAutoScalerType;
exports.ClusterAutoScalingMode = ClusterAutoScalingMode;
exports.ClusterAutoScalingStatus = ClusterAutoScalingStatus;
exports.ClusterCapacityType = ClusterCapacityType;
exports.ClusterConfigMode = ClusterConfigMode;
exports.ClusterEventResourceType = ClusterEventResourceType;
exports.ClusterInstanceStatus = ClusterInstanceStatus;
exports.ClusterInstanceType = ClusterInstanceType;
exports.ClusterKubernetesTaintEffect = ClusterKubernetesTaintEffect;
exports.ClusterNodeProvisioningMode = ClusterNodeProvisioningMode;
exports.ClusterNodeRecovery = ClusterNodeRecovery;
exports.ClusterSlurmConfigStrategy = ClusterSlurmConfigStrategy;
exports.ClusterSlurmNodeType = ClusterSlurmNodeType;
exports.ClusterSortBy = ClusterSortBy;
exports.ClusterStatus = ClusterStatus;
exports.CodeRepositorySortBy = CodeRepositorySortBy;
exports.CodeRepositorySortOrder = CodeRepositorySortOrder;
exports.CollectionType = CollectionType;
exports.CompilationJobStatus = CompilationJobStatus;
exports.CompleteOnConvergence = CompleteOnConvergence;
exports.CompressionType = CompressionType;
exports.ConditionOutcome = ConditionOutcome;
exports.ContainerMode = ContainerMode;
exports.ContentClassifier = ContentClassifier;
exports.CreateActionCommand = CreateActionCommand;
exports.CreateAlgorithmCommand = CreateAlgorithmCommand;
exports.CreateAppCommand = CreateAppCommand;
exports.CreateAppImageConfigCommand = CreateAppImageConfigCommand;
exports.CreateArtifactCommand = CreateArtifactCommand;
exports.CreateAutoMLJobCommand = CreateAutoMLJobCommand;
exports.CreateAutoMLJobV2Command = CreateAutoMLJobV2Command;
exports.CreateClusterCommand = CreateClusterCommand;
exports.CreateClusterSchedulerConfigCommand = CreateClusterSchedulerConfigCommand;
exports.CreateCodeRepositoryCommand = CreateCodeRepositoryCommand;
exports.CreateCompilationJobCommand = CreateCompilationJobCommand;
exports.CreateComputeQuotaCommand = CreateComputeQuotaCommand;
exports.CreateContextCommand = CreateContextCommand;
exports.CreateDataQualityJobDefinitionCommand = CreateDataQualityJobDefinitionCommand;
exports.CreateDeviceFleetCommand = CreateDeviceFleetCommand;
exports.CreateDomainCommand = CreateDomainCommand;
exports.CreateEdgeDeploymentPlanCommand = CreateEdgeDeploymentPlanCommand;
exports.CreateEdgeDeploymentStageCommand = CreateEdgeDeploymentStageCommand;
exports.CreateEdgePackagingJobCommand = CreateEdgePackagingJobCommand;
exports.CreateEndpointCommand = CreateEndpointCommand;
exports.CreateEndpointConfigCommand = CreateEndpointConfigCommand;
exports.CreateExperimentCommand = CreateExperimentCommand;
exports.CreateFeatureGroupCommand = CreateFeatureGroupCommand;
exports.CreateFlowDefinitionCommand = CreateFlowDefinitionCommand;
exports.CreateHubCommand = CreateHubCommand;
exports.CreateHubContentPresignedUrlsCommand = CreateHubContentPresignedUrlsCommand;
exports.CreateHubContentReferenceCommand = CreateHubContentReferenceCommand;
exports.CreateHumanTaskUiCommand = CreateHumanTaskUiCommand;
exports.CreateHyperParameterTuningJobCommand = CreateHyperParameterTuningJobCommand;
exports.CreateImageCommand = CreateImageCommand;
exports.CreateImageVersionCommand = CreateImageVersionCommand;
exports.CreateInferenceComponentCommand = CreateInferenceComponentCommand;
exports.CreateInferenceExperimentCommand = CreateInferenceExperimentCommand;
exports.CreateInferenceRecommendationsJobCommand = CreateInferenceRecommendationsJobCommand;
exports.CreateLabelingJobCommand = CreateLabelingJobCommand;
exports.CreateMlflowAppCommand = CreateMlflowAppCommand;
exports.CreateMlflowTrackingServerCommand = CreateMlflowTrackingServerCommand;
exports.CreateModelBiasJobDefinitionCommand = CreateModelBiasJobDefinitionCommand;
exports.CreateModelCardCommand = CreateModelCardCommand;
exports.CreateModelCardExportJobCommand = CreateModelCardExportJobCommand;
exports.CreateModelCommand = CreateModelCommand;
exports.CreateModelExplainabilityJobDefinitionCommand = CreateModelExplainabilityJobDefinitionCommand;
exports.CreateModelPackageCommand = CreateModelPackageCommand;
exports.CreateModelPackageGroupCommand = CreateModelPackageGroupCommand;
exports.CreateModelQualityJobDefinitionCommand = CreateModelQualityJobDefinitionCommand;
exports.CreateMonitoringScheduleCommand = CreateMonitoringScheduleCommand;
exports.CreateNotebookInstanceCommand = CreateNotebookInstanceCommand;
exports.CreateNotebookInstanceLifecycleConfigCommand = CreateNotebookInstanceLifecycleConfigCommand;
exports.CreateOptimizationJobCommand = CreateOptimizationJobCommand;
exports.CreatePartnerAppCommand = CreatePartnerAppCommand;
exports.CreatePartnerAppPresignedUrlCommand = CreatePartnerAppPresignedUrlCommand;
exports.CreatePipelineCommand = CreatePipelineCommand;
exports.CreatePresignedDomainUrlCommand = CreatePresignedDomainUrlCommand;
exports.CreatePresignedMlflowAppUrlCommand = CreatePresignedMlflowAppUrlCommand;
exports.CreatePresignedMlflowTrackingServerUrlCommand = CreatePresignedMlflowTrackingServerUrlCommand;
exports.CreatePresignedNotebookInstanceUrlCommand = CreatePresignedNotebookInstanceUrlCommand;
exports.CreateProcessingJobCommand = CreateProcessingJobCommand;
exports.CreateProjectCommand = CreateProjectCommand;
exports.CreateSpaceCommand = CreateSpaceCommand;
exports.CreateStudioLifecycleConfigCommand = CreateStudioLifecycleConfigCommand;
exports.CreateTrainingJobCommand = CreateTrainingJobCommand;
exports.CreateTrainingPlanCommand = CreateTrainingPlanCommand;
exports.CreateTransformJobCommand = CreateTransformJobCommand;
exports.CreateTrialCommand = CreateTrialCommand;
exports.CreateTrialComponentCommand = CreateTrialComponentCommand;
exports.CreateUserProfileCommand = CreateUserProfileCommand;
exports.CreateWorkforceCommand = CreateWorkforceCommand;
exports.CreateWorkteamCommand = CreateWorkteamCommand;
exports.CrossAccountFilterOption = CrossAccountFilterOption;
exports.CustomizationTechnique = CustomizationTechnique;
exports.DataDistributionType = DataDistributionType;
exports.DataSourceName = DataSourceName;
exports.DeepHealthCheckType = DeepHealthCheckType;
exports.DeleteActionCommand = DeleteActionCommand;
exports.DeleteAlgorithmCommand = DeleteAlgorithmCommand;
exports.DeleteAppCommand = DeleteAppCommand;
exports.DeleteAppImageConfigCommand = DeleteAppImageConfigCommand;
exports.DeleteArtifactCommand = DeleteArtifactCommand;
exports.DeleteAssociationCommand = DeleteAssociationCommand;
exports.DeleteClusterCommand = DeleteClusterCommand;
exports.DeleteClusterSchedulerConfigCommand = DeleteClusterSchedulerConfigCommand;
exports.DeleteCodeRepositoryCommand = DeleteCodeRepositoryCommand;
exports.DeleteCompilationJobCommand = DeleteCompilationJobCommand;
exports.DeleteComputeQuotaCommand = DeleteComputeQuotaCommand;
exports.DeleteContextCommand = DeleteContextCommand;
exports.DeleteDataQualityJobDefinitionCommand = DeleteDataQualityJobDefinitionCommand;
exports.DeleteDeviceFleetCommand = DeleteDeviceFleetCommand;
exports.DeleteDomainCommand = DeleteDomainCommand;
exports.DeleteEdgeDeploymentPlanCommand = DeleteEdgeDeploymentPlanCommand;
exports.DeleteEdgeDeploymentStageCommand = DeleteEdgeDeploymentStageCommand;
exports.DeleteEndpointCommand = DeleteEndpointCommand;
exports.DeleteEndpointConfigCommand = DeleteEndpointConfigCommand;
exports.DeleteExperimentCommand = DeleteExperimentCommand;
exports.DeleteFeatureGroupCommand = DeleteFeatureGroupCommand;
exports.DeleteFlowDefinitionCommand = DeleteFlowDefinitionCommand;
exports.DeleteHubCommand = DeleteHubCommand;
exports.DeleteHubContentCommand = DeleteHubContentCommand;
exports.DeleteHubContentReferenceCommand = DeleteHubContentReferenceCommand;
exports.DeleteHumanTaskUiCommand = DeleteHumanTaskUiCommand;
exports.DeleteHyperParameterTuningJobCommand = DeleteHyperParameterTuningJobCommand;
exports.DeleteImageCommand = DeleteImageCommand;
exports.DeleteImageVersionCommand = DeleteImageVersionCommand;
exports.DeleteInferenceComponentCommand = DeleteInferenceComponentCommand;
exports.DeleteInferenceExperimentCommand = DeleteInferenceExperimentCommand;
exports.DeleteMlflowAppCommand = DeleteMlflowAppCommand;
exports.DeleteMlflowTrackingServerCommand = DeleteMlflowTrackingServerCommand;
exports.DeleteModelBiasJobDefinitionCommand = DeleteModelBiasJobDefinitionCommand;
exports.DeleteModelCardCommand = DeleteModelCardCommand;
exports.DeleteModelCommand = DeleteModelCommand;
exports.DeleteModelExplainabilityJobDefinitionCommand = DeleteModelExplainabilityJobDefinitionCommand;
exports.DeleteModelPackageCommand = DeleteModelPackageCommand;
exports.DeleteModelPackageGroupCommand = DeleteModelPackageGroupCommand;
exports.DeleteModelPackageGroupPolicyCommand = DeleteModelPackageGroupPolicyCommand;
exports.DeleteModelQualityJobDefinitionCommand = DeleteModelQualityJobDefinitionCommand;
exports.DeleteMonitoringScheduleCommand = DeleteMonitoringScheduleCommand;
exports.DeleteNotebookInstanceCommand = DeleteNotebookInstanceCommand;
exports.DeleteNotebookInstanceLifecycleConfigCommand = DeleteNotebookInstanceLifecycleConfigCommand;
exports.DeleteOptimizationJobCommand = DeleteOptimizationJobCommand;
exports.DeletePartnerAppCommand = DeletePartnerAppCommand;
exports.DeletePipelineCommand = DeletePipelineCommand;
exports.DeleteProcessingJobCommand = DeleteProcessingJobCommand;
exports.DeleteProjectCommand = DeleteProjectCommand;
exports.DeleteSpaceCommand = DeleteSpaceCommand;
exports.DeleteStudioLifecycleConfigCommand = DeleteStudioLifecycleConfigCommand;
exports.DeleteTagsCommand = DeleteTagsCommand;
exports.DeleteTrainingJobCommand = DeleteTrainingJobCommand;
exports.DeleteTrialCommand = DeleteTrialCommand;
exports.DeleteTrialComponentCommand = DeleteTrialComponentCommand;
exports.DeleteUserProfileCommand = DeleteUserProfileCommand;
exports.DeleteWorkforceCommand = DeleteWorkforceCommand;
exports.DeleteWorkteamCommand = DeleteWorkteamCommand;
exports.DeregisterDevicesCommand = DeregisterDevicesCommand;
exports.DescribeActionCommand = DescribeActionCommand;
exports.DescribeAlgorithmCommand = DescribeAlgorithmCommand;
exports.DescribeAppCommand = DescribeAppCommand;
exports.DescribeAppImageConfigCommand = DescribeAppImageConfigCommand;
exports.DescribeArtifactCommand = DescribeArtifactCommand;
exports.DescribeAutoMLJobCommand = DescribeAutoMLJobCommand;
exports.DescribeAutoMLJobV2Command = DescribeAutoMLJobV2Command;
exports.DescribeClusterCommand = DescribeClusterCommand;
exports.DescribeClusterEventCommand = DescribeClusterEventCommand;
exports.DescribeClusterNodeCommand = DescribeClusterNodeCommand;
exports.DescribeClusterSchedulerConfigCommand = DescribeClusterSchedulerConfigCommand;
exports.DescribeCodeRepositoryCommand = DescribeCodeRepositoryCommand;
exports.DescribeCompilationJobCommand = DescribeCompilationJobCommand;
exports.DescribeComputeQuotaCommand = DescribeComputeQuotaCommand;
exports.DescribeContextCommand = DescribeContextCommand;
exports.DescribeDataQualityJobDefinitionCommand = DescribeDataQualityJobDefinitionCommand;
exports.DescribeDeviceCommand = DescribeDeviceCommand;
exports.DescribeDeviceFleetCommand = DescribeDeviceFleetCommand;
exports.DescribeDomainCommand = DescribeDomainCommand;
exports.DescribeEdgeDeploymentPlanCommand = DescribeEdgeDeploymentPlanCommand;
exports.DescribeEdgePackagingJobCommand = DescribeEdgePackagingJobCommand;
exports.DescribeEndpointCommand = DescribeEndpointCommand;
exports.DescribeEndpointConfigCommand = DescribeEndpointConfigCommand;
exports.DescribeExperimentCommand = DescribeExperimentCommand;
exports.DescribeFeatureGroupCommand = DescribeFeatureGroupCommand;
exports.DescribeFeatureMetadataCommand = DescribeFeatureMetadataCommand;
exports.DescribeFlowDefinitionCommand = DescribeFlowDefinitionCommand;
exports.DescribeHubCommand = DescribeHubCommand;
exports.DescribeHubContentCommand = DescribeHubContentCommand;
exports.DescribeHumanTaskUiCommand = DescribeHumanTaskUiCommand;
exports.DescribeHyperParameterTuningJobCommand = DescribeHyperParameterTuningJobCommand;
exports.DescribeImageCommand = DescribeImageCommand;
exports.DescribeImageVersionCommand = DescribeImageVersionCommand;
exports.DescribeInferenceComponentCommand = DescribeInferenceComponentCommand;
exports.DescribeInferenceExperimentCommand = DescribeInferenceExperimentCommand;
exports.DescribeInferenceRecommendationsJobCommand = DescribeInferenceRecommendationsJobCommand;
exports.DescribeLabelingJobCommand = DescribeLabelingJobCommand;
exports.DescribeLineageGroupCommand = DescribeLineageGroupCommand;
exports.DescribeMlflowAppCommand = DescribeMlflowAppCommand;
exports.DescribeMlflowTrackingServerCommand = DescribeMlflowTrackingServerCommand;
exports.DescribeModelBiasJobDefinitionCommand = DescribeModelBiasJobDefinitionCommand;
exports.DescribeModelCardCommand = DescribeModelCardCommand;
exports.DescribeModelCardExportJobCommand = DescribeModelCardExportJobCommand;
exports.DescribeModelCommand = DescribeModelCommand;
exports.DescribeModelExplainabilityJobDefinitionCommand = DescribeModelExplainabilityJobDefinitionCommand;
exports.DescribeModelPackageCommand = DescribeModelPackageCommand;
exports.DescribeModelPackageGroupCommand = DescribeModelPackageGroupCommand;
exports.DescribeModelQualityJobDefinitionCommand = DescribeModelQualityJobDefinitionCommand;
exports.DescribeMonitoringScheduleCommand = DescribeMonitoringScheduleCommand;
exports.DescribeNotebookInstanceCommand = DescribeNotebookInstanceCommand;
exports.DescribeNotebookInstanceLifecycleConfigCommand = DescribeNotebookInstanceLifecycleConfigCommand;
exports.DescribeOptimizationJobCommand = DescribeOptimizationJobCommand;
exports.DescribePartnerAppCommand = DescribePartnerAppCommand;
exports.DescribePipelineCommand = DescribePipelineCommand;
exports.DescribePipelineDefinitionForExecutionCommand = DescribePipelineDefinitionForExecutionCommand;
exports.DescribePipelineExecutionCommand = DescribePipelineExecutionCommand;
exports.DescribeProcessingJobCommand = DescribeProcessingJobCommand;
exports.DescribeProjectCommand = DescribeProjectCommand;
exports.DescribeReservedCapacityCommand = DescribeReservedCapacityCommand;
exports.DescribeSpaceCommand = DescribeSpaceCommand;
exports.DescribeStudioLifecycleConfigCommand = DescribeStudioLifecycleConfigCommand;
exports.DescribeSubscribedWorkteamCommand = DescribeSubscribedWorkteamCommand;
exports.DescribeTrainingJobCommand = DescribeTrainingJobCommand;
exports.DescribeTrainingPlanCommand = DescribeTrainingPlanCommand;
exports.DescribeTrainingPlanExtensionHistoryCommand = DescribeTrainingPlanExtensionHistoryCommand;
exports.DescribeTransformJobCommand = DescribeTransformJobCommand;
exports.DescribeTrialCommand = DescribeTrialCommand;
exports.DescribeTrialComponentCommand = DescribeTrialComponentCommand;
exports.DescribeUserProfileCommand = DescribeUserProfileCommand;
exports.DescribeWorkforceCommand = DescribeWorkforceCommand;
exports.DescribeWorkteamCommand = DescribeWorkteamCommand;
exports.DetachClusterNodeVolumeCommand = DetachClusterNodeVolumeCommand;
exports.DetailedAlgorithmStatus = DetailedAlgorithmStatus;
exports.DetailedModelPackageStatus = DetailedModelPackageStatus;
exports.DeviceDeploymentStatus = DeviceDeploymentStatus;
exports.DeviceSubsetType = DeviceSubsetType;
exports.DirectInternetAccess = DirectInternetAccess;
exports.Direction = Direction;
exports.DisableSagemakerServicecatalogPortfolioCommand = DisableSagemakerServicecatalogPortfolioCommand;
exports.DisassociateTrialComponentCommand = DisassociateTrialComponentCommand;
exports.DomainStatus = DomainStatus;
exports.EdgePackagingJobStatus = EdgePackagingJobStatus;
exports.EdgePresetDeploymentStatus = EdgePresetDeploymentStatus;
exports.EdgePresetDeploymentType = EdgePresetDeploymentType;
exports.EnableSagemakerServicecatalogPortfolioCommand = EnableSagemakerServicecatalogPortfolioCommand;
exports.EnabledOrDisabled = EnabledOrDisabled;
exports.EndpointConfigSortKey = EndpointConfigSortKey;
exports.EndpointSortKey = EndpointSortKey;
exports.EndpointStatus = EndpointStatus;
exports.EvaluationType = EvaluationType;
exports.EventSortBy = EventSortBy;
exports.ExecutionRoleIdentityConfig = ExecutionRoleIdentityConfig;
exports.ExecutionStatus = ExecutionStatus;
exports.ExtendTrainingPlanCommand = ExtendTrainingPlanCommand;
exports.FailureHandlingPolicy = FailureHandlingPolicy;
exports.FairShare = FairShare;
exports.FeatureGroupSortBy = FeatureGroupSortBy;
exports.FeatureGroupSortOrder = FeatureGroupSortOrder;
exports.FeatureGroupStatus = FeatureGroupStatus;
exports.FeatureStatus = FeatureStatus;
exports.FeatureType = FeatureType;
exports.FileSystemAccessMode = FileSystemAccessMode;
exports.FileSystemType = FileSystemType;
exports.FillingType = FillingType;
exports.FlatInvocations = FlatInvocations;
exports.FlowDefinitionStatus = FlowDefinitionStatus;
exports.Framework = Framework;
exports.GetDeviceFleetReportCommand = GetDeviceFleetReportCommand;
exports.GetLineageGroupPolicyCommand = GetLineageGroupPolicyCommand;
exports.GetModelPackageGroupPolicyCommand = GetModelPackageGroupPolicyCommand;
exports.GetSagemakerServicecatalogPortfolioStatusCommand = GetSagemakerServicecatalogPortfolioStatusCommand;
exports.GetScalingConfigurationRecommendationCommand = GetScalingConfigurationRecommendationCommand;
exports.GetSearchSuggestionsCommand = GetSearchSuggestionsCommand;
exports.HubContentSortBy = HubContentSortBy;
exports.HubContentStatus = HubContentStatus;
exports.HubContentSupportStatus = HubContentSupportStatus;
exports.HubContentType = HubContentType;
exports.HubSortBy = HubSortBy;
exports.HubStatus = HubStatus;
exports.HumanTaskUiStatus = HumanTaskUiStatus;
exports.HyperParameterScalingType = HyperParameterScalingType;
exports.HyperParameterTuningAllocationStrategy = HyperParameterTuningAllocationStrategy;
exports.HyperParameterTuningJobObjectiveType = HyperParameterTuningJobObjectiveType;
exports.HyperParameterTuningJobSortByOptions = HyperParameterTuningJobSortByOptions;
exports.HyperParameterTuningJobStatus = HyperParameterTuningJobStatus;
exports.HyperParameterTuningJobStrategyType = HyperParameterTuningJobStrategyType;
exports.HyperParameterTuningJobWarmStartType = HyperParameterTuningJobWarmStartType;
exports.IPAddressType = IPAddressType;
exports.IdleResourceSharing = IdleResourceSharing;
exports.ImageSortBy = ImageSortBy;
exports.ImageSortOrder = ImageSortOrder;
exports.ImageStatus = ImageStatus;
exports.ImageVersionSortBy = ImageVersionSortBy;
exports.ImageVersionSortOrder = ImageVersionSortOrder;
exports.ImageVersionStatus = ImageVersionStatus;
exports.ImportHubContentCommand = ImportHubContentCommand;
exports.InferenceComponentCapacitySizeType = InferenceComponentCapacitySizeType;
exports.InferenceComponentSortKey = InferenceComponentSortKey;
exports.InferenceComponentStatus = InferenceComponentStatus;
exports.InferenceExecutionMode = InferenceExecutionMode;
exports.InferenceExperimentStatus = InferenceExperimentStatus;
exports.InferenceExperimentStopDesiredState = InferenceExperimentStopDesiredState;
exports.InferenceExperimentType = InferenceExperimentType;
exports.InputMode = InputMode;
exports.InstanceGroupStatus = InstanceGroupStatus;
exports.IsTrackingServerActive = IsTrackingServerActive;
exports.JobType = JobType;
exports.JoinSource = JoinSource;
exports.LabelingJobStatus = LabelingJobStatus;
exports.LastUpdateStatusValue = LastUpdateStatusValue;
exports.LifecycleManagement = LifecycleManagement;
exports.LineageType = LineageType;
exports.ListActionsCommand = ListActionsCommand;
exports.ListAlgorithmsCommand = ListAlgorithmsCommand;
exports.ListAliasesCommand = ListAliasesCommand;
exports.ListAppImageConfigsCommand = ListAppImageConfigsCommand;
exports.ListAppsCommand = ListAppsCommand;
exports.ListArtifactsCommand = ListArtifactsCommand;
exports.ListAssociationsCommand = ListAssociationsCommand;
exports.ListAutoMLJobsCommand = ListAutoMLJobsCommand;
exports.ListCandidatesForAutoMLJobCommand = ListCandidatesForAutoMLJobCommand;
exports.ListClusterEventsCommand = ListClusterEventsCommand;
exports.ListClusterNodesCommand = ListClusterNodesCommand;
exports.ListClusterSchedulerConfigsCommand = ListClusterSchedulerConfigsCommand;
exports.ListClustersCommand = ListClustersCommand;
exports.ListCodeRepositoriesCommand = ListCodeRepositoriesCommand;
exports.ListCompilationJobsCommand = ListCompilationJobsCommand;
exports.ListCompilationJobsSortBy = ListCompilationJobsSortBy;
exports.ListComputeQuotasCommand = ListComputeQuotasCommand;
exports.ListContextsCommand = ListContextsCommand;
exports.ListDataQualityJobDefinitionsCommand = ListDataQualityJobDefinitionsCommand;
exports.ListDeviceFleetsCommand = ListDeviceFleetsCommand;
exports.ListDeviceFleetsSortBy = ListDeviceFleetsSortBy;
exports.ListDevicesCommand = ListDevicesCommand;
exports.ListDomainsCommand = ListDomainsCommand;
exports.ListEdgeDeploymentPlansCommand = ListEdgeDeploymentPlansCommand;
exports.ListEdgeDeploymentPlansSortBy = ListEdgeDeploymentPlansSortBy;
exports.ListEdgePackagingJobsCommand = ListEdgePackagingJobsCommand;
exports.ListEdgePackagingJobsSortBy = ListEdgePackagingJobsSortBy;
exports.ListEndpointConfigsCommand = ListEndpointConfigsCommand;
exports.ListEndpointsCommand = ListEndpointsCommand;
exports.ListExperimentsCommand = ListExperimentsCommand;
exports.ListFeatureGroupsCommand = ListFeatureGroupsCommand;
exports.ListFlowDefinitionsCommand = ListFlowDefinitionsCommand;
exports.ListHubContentVersionsCommand = ListHubContentVersionsCommand;
exports.ListHubContentsCommand = ListHubContentsCommand;
exports.ListHubsCommand = ListHubsCommand;
exports.ListHumanTaskUisCommand = ListHumanTaskUisCommand;
exports.ListHyperParameterTuningJobsCommand = ListHyperParameterTuningJobsCommand;
exports.ListImageVersionsCommand = ListImageVersionsCommand;
exports.ListImagesCommand = ListImagesCommand;
exports.ListInferenceComponentsCommand = ListInferenceComponentsCommand;
exports.ListInferenceExperimentsCommand = ListInferenceExperimentsCommand;
exports.ListInferenceRecommendationsJobStepsCommand = ListInferenceRecommendationsJobStepsCommand;
exports.ListInferenceRecommendationsJobsCommand = ListInferenceRecommendationsJobsCommand;
exports.ListInferenceRecommendationsJobsSortBy = ListInferenceRecommendationsJobsSortBy;
exports.ListLabelingJobsCommand = ListLabelingJobsCommand;
exports.ListLabelingJobsForWorkteamCommand = ListLabelingJobsForWorkteamCommand;
exports.ListLabelingJobsForWorkteamSortByOptions = ListLabelingJobsForWorkteamSortByOptions;
exports.ListLineageGroupsCommand = ListLineageGroupsCommand;
exports.ListMlflowAppsCommand = ListMlflowAppsCommand;
exports.ListMlflowTrackingServersCommand = ListMlflowTrackingServersCommand;
exports.ListModelBiasJobDefinitionsCommand = ListModelBiasJobDefinitionsCommand;
exports.ListModelCardExportJobsCommand = ListModelCardExportJobsCommand;
exports.ListModelCardVersionsCommand = ListModelCardVersionsCommand;
exports.ListModelCardsCommand = ListModelCardsCommand;
exports.ListModelExplainabilityJobDefinitionsCommand = ListModelExplainabilityJobDefinitionsCommand;
exports.ListModelMetadataCommand = ListModelMetadataCommand;
exports.ListModelPackageGroupsCommand = ListModelPackageGroupsCommand;
exports.ListModelPackagesCommand = ListModelPackagesCommand;
exports.ListModelQualityJobDefinitionsCommand = ListModelQualityJobDefinitionsCommand;
exports.ListModelsCommand = ListModelsCommand;
exports.ListMonitoringAlertHistoryCommand = ListMonitoringAlertHistoryCommand;
exports.ListMonitoringAlertsCommand = ListMonitoringAlertsCommand;
exports.ListMonitoringExecutionsCommand = ListMonitoringExecutionsCommand;
exports.ListMonitoringSchedulesCommand = ListMonitoringSchedulesCommand;
exports.ListNotebookInstanceLifecycleConfigsCommand = ListNotebookInstanceLifecycleConfigsCommand;
exports.ListNotebookInstancesCommand = ListNotebookInstancesCommand;
exports.ListOptimizationJobsCommand = ListOptimizationJobsCommand;
exports.ListOptimizationJobsSortBy = ListOptimizationJobsSortBy;
exports.ListPartnerAppsCommand = ListPartnerAppsCommand;
exports.ListPipelineExecutionStepsCommand = ListPipelineExecutionStepsCommand;
exports.ListPipelineExecutionsCommand = ListPipelineExecutionsCommand;
exports.ListPipelineParametersForExecutionCommand = ListPipelineParametersForExecutionCommand;
exports.ListPipelineVersionsCommand = ListPipelineVersionsCommand;
exports.ListPipelinesCommand = ListPipelinesCommand;
exports.ListProcessingJobsCommand = ListProcessingJobsCommand;
exports.ListProjectsCommand = ListProjectsCommand;
exports.ListResourceCatalogsCommand = ListResourceCatalogsCommand;
exports.ListSpacesCommand = ListSpacesCommand;
exports.ListStageDevicesCommand = ListStageDevicesCommand;
exports.ListStudioLifecycleConfigsCommand = ListStudioLifecycleConfigsCommand;
exports.ListSubscribedWorkteamsCommand = ListSubscribedWorkteamsCommand;
exports.ListTagsCommand = ListTagsCommand;
exports.ListTrainingJobsCommand = ListTrainingJobsCommand;
exports.ListTrainingJobsForHyperParameterTuningJobCommand = ListTrainingJobsForHyperParameterTuningJobCommand;
exports.ListTrainingPlansCommand = ListTrainingPlansCommand;
exports.ListTransformJobsCommand = ListTransformJobsCommand;
exports.ListTrialComponentsCommand = ListTrialComponentsCommand;
exports.ListTrialsCommand = ListTrialsCommand;
exports.ListUltraServersByReservedCapacityCommand = ListUltraServersByReservedCapacityCommand;
exports.ListUserProfilesCommand = ListUserProfilesCommand;
exports.ListWorkforcesCommand = ListWorkforcesCommand;
exports.ListWorkforcesSortByOptions = ListWorkforcesSortByOptions;
exports.ListWorkteamsCommand = ListWorkteamsCommand;
exports.ListWorkteamsSortByOptions = ListWorkteamsSortByOptions;
exports.MIGProfileType = MIGProfileType;
exports.MaintenanceStatus = MaintenanceStatus;
exports.ManagedInstanceScalingStatus = ManagedInstanceScalingStatus;
exports.MetricSetSource = MetricSetSource;
exports.MlTools = MlTools;
exports.MlflowAppStatus = MlflowAppStatus;
exports.ModelApprovalStatus = ModelApprovalStatus;
exports.ModelCacheSetting = ModelCacheSetting;
exports.ModelCardExportJobSortBy = ModelCardExportJobSortBy;
exports.ModelCardExportJobSortOrder = ModelCardExportJobSortOrder;
exports.ModelCardExportJobStatus = ModelCardExportJobStatus;
exports.ModelCardProcessingStatus = ModelCardProcessingStatus;
exports.ModelCardSortBy = ModelCardSortBy;
exports.ModelCardSortOrder = ModelCardSortOrder;
exports.ModelCardStatus = ModelCardStatus;
exports.ModelCardVersionSortBy = ModelCardVersionSortBy;
exports.ModelCompressionType = ModelCompressionType;
exports.ModelInfrastructureType = ModelInfrastructureType;
exports.ModelMetadataFilterType = ModelMetadataFilterType;
exports.ModelPackageGroupSortBy = ModelPackageGroupSortBy;
exports.ModelPackageGroupStatus = ModelPackageGroupStatus;
exports.ModelPackageRegistrationType = ModelPackageRegistrationType;
exports.ModelPackageSortBy = ModelPackageSortBy;
exports.ModelPackageStatus = ModelPackageStatus;
exports.ModelPackageType = ModelPackageType;
exports.ModelRegistrationMode = ModelRegistrationMode;
exports.ModelSortKey = ModelSortKey;
exports.ModelSpeculativeDecodingS3DataType = ModelSpeculativeDecodingS3DataType;
exports.ModelSpeculativeDecodingTechnique = ModelSpeculativeDecodingTechnique;
exports.ModelVariantAction = ModelVariantAction;
exports.ModelVariantStatus = ModelVariantStatus;
exports.MonitoringAlertHistorySortKey = MonitoringAlertHistorySortKey;
exports.MonitoringAlertStatus = MonitoringAlertStatus;
exports.MonitoringExecutionSortKey = MonitoringExecutionSortKey;
exports.MonitoringJobDefinitionSortKey = MonitoringJobDefinitionSortKey;
exports.MonitoringProblemType = MonitoringProblemType;
exports.MonitoringScheduleSortKey = MonitoringScheduleSortKey;
exports.MonitoringType = MonitoringType;
exports.NodeUnavailabilityType = NodeUnavailabilityType;
exports.NotebookInstanceAcceleratorType = NotebookInstanceAcceleratorType;
exports.NotebookInstanceLifecycleConfigSortKey = NotebookInstanceLifecycleConfigSortKey;
exports.NotebookInstanceLifecycleConfigSortOrder = NotebookInstanceLifecycleConfigSortOrder;
exports.NotebookInstanceSortKey = NotebookInstanceSortKey;
exports.NotebookInstanceSortOrder = NotebookInstanceSortOrder;
exports.NotebookInstanceStatus = NotebookInstanceStatus;
exports.NotebookOutputOption = NotebookOutputOption;
exports.ObjectiveStatus = ObjectiveStatus;
exports.OfflineStoreStatusValue = OfflineStoreStatusValue;
exports.Operator = Operator;
exports.OptimizationJobDeploymentInstanceType = OptimizationJobDeploymentInstanceType;
exports.OptimizationJobStatus = OptimizationJobStatus;
exports.OrderKey = OrderKey;
exports.OutputCompressionType = OutputCompressionType;
exports.ParameterType = ParameterType;
exports.PartnerAppAuthType = PartnerAppAuthType;
exports.PartnerAppStatus = PartnerAppStatus;
exports.PartnerAppType = PartnerAppType;
exports.Peft = Peft;
exports.PipelineExecutionStatus = PipelineExecutionStatus;
exports.PipelineStatus = PipelineStatus;
exports.PreemptTeamTasks = PreemptTeamTasks;
exports.ProblemType = ProblemType;
exports.ProcessingInstanceType = ProcessingInstanceType;
exports.ProcessingJobStatus = ProcessingJobStatus;
exports.ProcessingS3CompressionType = ProcessingS3CompressionType;
exports.ProcessingS3DataDistributionType = ProcessingS3DataDistributionType;
exports.ProcessingS3DataType = ProcessingS3DataType;
exports.ProcessingS3InputMode = ProcessingS3InputMode;
exports.ProcessingS3UploadMode = ProcessingS3UploadMode;
exports.Processor = Processor;
exports.ProductionVariantAcceleratorType = ProductionVariantAcceleratorType;
exports.ProductionVariantInferenceAmiVersion = ProductionVariantInferenceAmiVersion;
exports.ProductionVariantInstanceType = ProductionVariantInstanceType;
exports.ProfilingStatus = ProfilingStatus;
exports.ProjectSortBy = ProjectSortBy;
exports.ProjectSortOrder = ProjectSortOrder;
exports.ProjectStatus = ProjectStatus;
exports.PutModelPackageGroupPolicyCommand = PutModelPackageGroupPolicyCommand;
exports.QueryLineageCommand = QueryLineageCommand;
exports.RStudioServerProAccessStatus = RStudioServerProAccessStatus;
exports.RStudioServerProUserGroup = RStudioServerProUserGroup;
exports.RecommendationJobStatus = RecommendationJobStatus;
exports.RecommendationJobSupportedEndpointType = RecommendationJobSupportedEndpointType;
exports.RecommendationJobType = RecommendationJobType;
exports.RecommendationStatus = RecommendationStatus;
exports.RecommendationStepType = RecommendationStepType;
exports.RecordWrapper = RecordWrapper;
exports.RedshiftResultCompressionType = RedshiftResultCompressionType;
exports.RedshiftResultFormat = RedshiftResultFormat;
exports.RegisterDevicesCommand = RegisterDevicesCommand;
exports.Relation = Relation;
exports.RenderUiTemplateCommand = RenderUiTemplateCommand;
exports.RepositoryAccessMode = RepositoryAccessMode;
exports.ReservedCapacityInstanceType = ReservedCapacityInstanceType;
exports.ReservedCapacityStatus = ReservedCapacityStatus;
exports.ReservedCapacityType = ReservedCapacityType;
exports.ResourceCatalogSortBy = ResourceCatalogSortBy;
exports.ResourceCatalogSortOrder = ResourceCatalogSortOrder;
exports.ResourceSharingStrategy = ResourceSharingStrategy;
exports.ResourceType = ResourceType;
exports.RetentionType = RetentionType;
exports.RetryPipelineExecutionCommand = RetryPipelineExecutionCommand;
exports.RootAccess = RootAccess;
exports.RoutingStrategy = RoutingStrategy;
exports.RuleEvaluationStatus = RuleEvaluationStatus;
exports.S3DataDistribution = S3DataDistribution;
exports.S3DataType = S3DataType;
exports.S3ModelDataType = S3ModelDataType;
exports.SageMaker = SageMaker;
exports.SageMakerClient = SageMakerClient;
exports.SageMakerImageName = SageMakerImageName;
exports.SageMakerResourceName = SageMakerResourceName;
exports.SagemakerServicecatalogStatus = SagemakerServicecatalogStatus;
exports.ScheduleStatus = ScheduleStatus;
exports.SchedulerConfigComponent = SchedulerConfigComponent;
exports.SchedulerResourceStatus = SchedulerResourceStatus;
exports.SearchCommand = SearchCommand;
exports.SearchSortOrder = SearchSortOrder;
exports.SearchTrainingPlanOfferingsCommand = SearchTrainingPlanOfferingsCommand;
exports.SecondaryStatus = SecondaryStatus;
exports.SendPipelineExecutionStepFailureCommand = SendPipelineExecutionStepFailureCommand;
exports.SendPipelineExecutionStepSuccessCommand = SendPipelineExecutionStepSuccessCommand;
exports.ServerlessJobType = ServerlessJobType;
exports.SharingType = SharingType;
exports.SkipModelValidation = SkipModelValidation;
exports.SoftwareUpdateStatus = SoftwareUpdateStatus;
exports.SortActionsBy = SortActionsBy;
exports.SortArtifactsBy = SortArtifactsBy;
exports.SortAssociationsBy = SortAssociationsBy;
exports.SortBy = SortBy;
exports.SortClusterSchedulerConfigBy = SortClusterSchedulerConfigBy;
exports.SortContextsBy = SortContextsBy;
exports.SortExperimentsBy = SortExperimentsBy;
exports.SortInferenceExperimentsBy = SortInferenceExperimentsBy;
exports.SortLineageGroupsBy = SortLineageGroupsBy;
exports.SortMlflowAppBy = SortMlflowAppBy;
exports.SortOrder = SortOrder;
exports.SortPipelineExecutionsBy = SortPipelineExecutionsBy;
exports.SortPipelinesBy = SortPipelinesBy;
exports.SortQuotaBy = SortQuotaBy;
exports.SortTrackingServerBy = SortTrackingServerBy;
exports.SortTrialComponentsBy = SortTrialComponentsBy;
exports.SortTrialsBy = SortTrialsBy;
exports.SpaceSortKey = SpaceSortKey;
exports.SpaceStatus = SpaceStatus;
exports.SplitType = SplitType;
exports.StageStatus = StageStatus;
exports.StartEdgeDeploymentStageCommand = StartEdgeDeploymentStageCommand;
exports.StartInferenceExperimentCommand = StartInferenceExperimentCommand;
exports.StartMlflowTrackingServerCommand = StartMlflowTrackingServerCommand;
exports.StartMonitoringScheduleCommand = StartMonitoringScheduleCommand;
exports.StartNotebookInstanceCommand = StartNotebookInstanceCommand;
exports.StartPipelineExecutionCommand = StartPipelineExecutionCommand;
exports.StartSessionCommand = StartSessionCommand;
exports.Statistic = Statistic;
exports.StepStatus = StepStatus;
exports.StopAutoMLJobCommand = StopAutoMLJobCommand;
exports.StopCompilationJobCommand = StopCompilationJobCommand;
exports.StopEdgeDeploymentStageCommand = StopEdgeDeploymentStageCommand;
exports.StopEdgePackagingJobCommand = StopEdgePackagingJobCommand;
exports.StopHyperParameterTuningJobCommand = StopHyperParameterTuningJobCommand;
exports.StopInferenceExperimentCommand = StopInferenceExperimentCommand;
exports.StopInferenceRecommendationsJobCommand = StopInferenceRecommendationsJobCommand;
exports.StopLabelingJobCommand = StopLabelingJobCommand;
exports.StopMlflowTrackingServerCommand = StopMlflowTrackingServerCommand;
exports.StopMonitoringScheduleCommand = StopMonitoringScheduleCommand;
exports.StopNotebookInstanceCommand = StopNotebookInstanceCommand;
exports.StopOptimizationJobCommand = StopOptimizationJobCommand;
exports.StopPipelineExecutionCommand = StopPipelineExecutionCommand;
exports.StopProcessingJobCommand = StopProcessingJobCommand;
exports.StopTrainingJobCommand = StopTrainingJobCommand;
exports.StopTransformJobCommand = StopTransformJobCommand;
exports.StorageType = StorageType;
exports.StudioLifecycleConfigAppType = StudioLifecycleConfigAppType;
exports.StudioLifecycleConfigSortKey = StudioLifecycleConfigSortKey;
exports.StudioWebPortal = StudioWebPortal;
exports.TableFormat = TableFormat;
exports.TagPropagation = TagPropagation;
exports.TargetDevice = TargetDevice;
exports.TargetPlatformAccelerator = TargetPlatformAccelerator;
exports.TargetPlatformArch = TargetPlatformArch;
exports.TargetPlatformOs = TargetPlatformOs;
exports.ThroughputMode = ThroughputMode;
exports.TrackingServerMaintenanceStatus = TrackingServerMaintenanceStatus;
exports.TrackingServerSize = TrackingServerSize;
exports.TrackingServerStatus = TrackingServerStatus;
exports.TrafficRoutingConfigType = TrafficRoutingConfigType;
exports.TrafficType = TrafficType;
exports.TrainingInputMode = TrainingInputMode;
exports.TrainingInstanceType = TrainingInstanceType;
exports.TrainingJobEarlyStoppingType = TrainingJobEarlyStoppingType;
exports.TrainingJobSortByOptions = TrainingJobSortByOptions;
exports.TrainingJobStatus = TrainingJobStatus;
exports.TrainingPlanFilterName = TrainingPlanFilterName;
exports.TrainingPlanSortBy = TrainingPlanSortBy;
exports.TrainingPlanSortOrder = TrainingPlanSortOrder;
exports.TrainingPlanStatus = TrainingPlanStatus;
exports.TrainingRepositoryAccessMode = TrainingRepositoryAccessMode;
exports.TransformInstanceType = TransformInstanceType;
exports.TransformJobStatus = TransformJobStatus;
exports.TrialComponentPrimaryStatus = TrialComponentPrimaryStatus;
exports.TtlDurationUnit = TtlDurationUnit;
exports.UltraServerHealthStatus = UltraServerHealthStatus;
exports.UpdateActionCommand = UpdateActionCommand;
exports.UpdateAppImageConfigCommand = UpdateAppImageConfigCommand;
exports.UpdateArtifactCommand = UpdateArtifactCommand;
exports.UpdateClusterCommand = UpdateClusterCommand;
exports.UpdateClusterSchedulerConfigCommand = UpdateClusterSchedulerConfigCommand;
exports.UpdateClusterSoftwareCommand = UpdateClusterSoftwareCommand;
exports.UpdateCodeRepositoryCommand = UpdateCodeRepositoryCommand;
exports.UpdateComputeQuotaCommand = UpdateComputeQuotaCommand;
exports.UpdateContextCommand = UpdateContextCommand;
exports.UpdateDeviceFleetCommand = UpdateDeviceFleetCommand;
exports.UpdateDevicesCommand = UpdateDevicesCommand;
exports.UpdateDomainCommand = UpdateDomainCommand;
exports.UpdateEndpointCommand = UpdateEndpointCommand;
exports.UpdateEndpointWeightsAndCapacitiesCommand = UpdateEndpointWeightsAndCapacitiesCommand;
exports.UpdateExperimentCommand = UpdateExperimentCommand;
exports.UpdateFeatureGroupCommand = UpdateFeatureGroupCommand;
exports.UpdateFeatureMetadataCommand = UpdateFeatureMetadataCommand;
exports.UpdateHubCommand = UpdateHubCommand;
exports.UpdateHubContentCommand = UpdateHubContentCommand;
exports.UpdateHubContentReferenceCommand = UpdateHubContentReferenceCommand;
exports.UpdateImageCommand = UpdateImageCommand;
exports.UpdateImageVersionCommand = UpdateImageVersionCommand;
exports.UpdateInferenceComponentCommand = UpdateInferenceComponentCommand;
exports.UpdateInferenceComponentRuntimeConfigCommand = UpdateInferenceComponentRuntimeConfigCommand;
exports.UpdateInferenceExperimentCommand = UpdateInferenceExperimentCommand;
exports.UpdateMlflowAppCommand = UpdateMlflowAppCommand;
exports.UpdateMlflowTrackingServerCommand = UpdateMlflowTrackingServerCommand;
exports.UpdateModelCardCommand = UpdateModelCardCommand;
exports.UpdateModelPackageCommand = UpdateModelPackageCommand;
exports.UpdateMonitoringAlertCommand = UpdateMonitoringAlertCommand;
exports.UpdateMonitoringScheduleCommand = UpdateMonitoringScheduleCommand;
exports.UpdateNotebookInstanceCommand = UpdateNotebookInstanceCommand;
exports.UpdateNotebookInstanceLifecycleConfigCommand = UpdateNotebookInstanceLifecycleConfigCommand;
exports.UpdatePartnerAppCommand = UpdatePartnerAppCommand;
exports.UpdatePipelineCommand = UpdatePipelineCommand;
exports.UpdatePipelineExecutionCommand = UpdatePipelineExecutionCommand;
exports.UpdatePipelineVersionCommand = UpdatePipelineVersionCommand;
exports.UpdateProjectCommand = UpdateProjectCommand;
exports.UpdateSpaceCommand = UpdateSpaceCommand;
exports.UpdateTrainingJobCommand = UpdateTrainingJobCommand;
exports.UpdateTrialCommand = UpdateTrialCommand;
exports.UpdateTrialComponentCommand = UpdateTrialComponentCommand;
exports.UpdateUserProfileCommand = UpdateUserProfileCommand;
exports.UpdateWorkforceCommand = UpdateWorkforceCommand;
exports.UpdateWorkteamCommand = UpdateWorkteamCommand;
exports.UserProfileSortKey = UserProfileSortKey;
exports.UserProfileStatus = UserProfileStatus;
exports.VariantPropertyType = VariantPropertyType;
exports.VariantStatus = VariantStatus;
exports.VendorGuidance = VendorGuidance;
exports.VolumeAttachmentStatus = VolumeAttachmentStatus;
exports.WarmPoolResourceStatus = WarmPoolResourceStatus;
exports.WorkforceIpAddressType = WorkforceIpAddressType;
exports.WorkforceStatus = WorkforceStatus;
exports._InstanceType = _InstanceType;
exports.paginateCreateHubContentPresignedUrls = paginateCreateHubContentPresignedUrls;
exports.paginateDescribeTrainingPlanExtensionHistory = paginateDescribeTrainingPlanExtensionHistory;
exports.paginateListActions = paginateListActions;
exports.paginateListAlgorithms = paginateListAlgorithms;
exports.paginateListAliases = paginateListAliases;
exports.paginateListAppImageConfigs = paginateListAppImageConfigs;
exports.paginateListApps = paginateListApps;
exports.paginateListArtifacts = paginateListArtifacts;
exports.paginateListAssociations = paginateListAssociations;
exports.paginateListAutoMLJobs = paginateListAutoMLJobs;
exports.paginateListCandidatesForAutoMLJob = paginateListCandidatesForAutoMLJob;
exports.paginateListClusterEvents = paginateListClusterEvents;
exports.paginateListClusterNodes = paginateListClusterNodes;
exports.paginateListClusterSchedulerConfigs = paginateListClusterSchedulerConfigs;
exports.paginateListClusters = paginateListClusters;
exports.paginateListCodeRepositories = paginateListCodeRepositories;
exports.paginateListCompilationJobs = paginateListCompilationJobs;
exports.paginateListComputeQuotas = paginateListComputeQuotas;
exports.paginateListContexts = paginateListContexts;
exports.paginateListDataQualityJobDefinitions = paginateListDataQualityJobDefinitions;
exports.paginateListDeviceFleets = paginateListDeviceFleets;
exports.paginateListDevices = paginateListDevices;
exports.paginateListDomains = paginateListDomains;
exports.paginateListEdgeDeploymentPlans = paginateListEdgeDeploymentPlans;
exports.paginateListEdgePackagingJobs = paginateListEdgePackagingJobs;
exports.paginateListEndpointConfigs = paginateListEndpointConfigs;
exports.paginateListEndpoints = paginateListEndpoints;
exports.paginateListExperiments = paginateListExperiments;
exports.paginateListFeatureGroups = paginateListFeatureGroups;
exports.paginateListFlowDefinitions = paginateListFlowDefinitions;
exports.paginateListHumanTaskUis = paginateListHumanTaskUis;
exports.paginateListHyperParameterTuningJobs = paginateListHyperParameterTuningJobs;
exports.paginateListImageVersions = paginateListImageVersions;
exports.paginateListImages = paginateListImages;
exports.paginateListInferenceComponents = paginateListInferenceComponents;
exports.paginateListInferenceExperiments = paginateListInferenceExperiments;
exports.paginateListInferenceRecommendationsJobSteps = paginateListInferenceRecommendationsJobSteps;
exports.paginateListInferenceRecommendationsJobs = paginateListInferenceRecommendationsJobs;
exports.paginateListLabelingJobs = paginateListLabelingJobs;
exports.paginateListLabelingJobsForWorkteam = paginateListLabelingJobsForWorkteam;
exports.paginateListLineageGroups = paginateListLineageGroups;
exports.paginateListMlflowApps = paginateListMlflowApps;
exports.paginateListMlflowTrackingServers = paginateListMlflowTrackingServers;
exports.paginateListModelBiasJobDefinitions = paginateListModelBiasJobDefinitions;
exports.paginateListModelCardExportJobs = paginateListModelCardExportJobs;
exports.paginateListModelCardVersions = paginateListModelCardVersions;
exports.paginateListModelCards = paginateListModelCards;
exports.paginateListModelExplainabilityJobDefinitions = paginateListModelExplainabilityJobDefinitions;
exports.paginateListModelMetadata = paginateListModelMetadata;
exports.paginateListModelPackageGroups = paginateListModelPackageGroups;
exports.paginateListModelPackages = paginateListModelPackages;
exports.paginateListModelQualityJobDefinitions = paginateListModelQualityJobDefinitions;
exports.paginateListModels = paginateListModels;
exports.paginateListMonitoringAlertHistory = paginateListMonitoringAlertHistory;
exports.paginateListMonitoringAlerts = paginateListMonitoringAlerts;
exports.paginateListMonitoringExecutions = paginateListMonitoringExecutions;
exports.paginateListMonitoringSchedules = paginateListMonitoringSchedules;
exports.paginateListNotebookInstanceLifecycleConfigs = paginateListNotebookInstanceLifecycleConfigs;
exports.paginateListNotebookInstances = paginateListNotebookInstances;
exports.paginateListOptimizationJobs = paginateListOptimizationJobs;
exports.paginateListPartnerApps = paginateListPartnerApps;
exports.paginateListPipelineExecutionSteps = paginateListPipelineExecutionSteps;
exports.paginateListPipelineExecutions = paginateListPipelineExecutions;
exports.paginateListPipelineParametersForExecution = paginateListPipelineParametersForExecution;
exports.paginateListPipelineVersions = paginateListPipelineVersions;
exports.paginateListPipelines = paginateListPipelines;
exports.paginateListProcessingJobs = paginateListProcessingJobs;
exports.paginateListProjects = paginateListProjects;
exports.paginateListResourceCatalogs = paginateListResourceCatalogs;
exports.paginateListSpaces = paginateListSpaces;
exports.paginateListStageDevices = paginateListStageDevices;
exports.paginateListStudioLifecycleConfigs = paginateListStudioLifecycleConfigs;
exports.paginateListSubscribedWorkteams = paginateListSubscribedWorkteams;
exports.paginateListTags = paginateListTags;
exports.paginateListTrainingJobs = paginateListTrainingJobs;
exports.paginateListTrainingJobsForHyperParameterTuningJob = paginateListTrainingJobsForHyperParameterTuningJob;
exports.paginateListTrainingPlans = paginateListTrainingPlans;
exports.paginateListTransformJobs = paginateListTransformJobs;
exports.paginateListTrialComponents = paginateListTrialComponents;
exports.paginateListTrials = paginateListTrials;
exports.paginateListUltraServersByReservedCapacity = paginateListUltraServersByReservedCapacity;
exports.paginateListUserProfiles = paginateListUserProfiles;
exports.paginateListWorkforces = paginateListWorkforces;
exports.paginateListWorkteams = paginateListWorkteams;
exports.paginateQueryLineage = paginateQueryLineage;
exports.paginateSearch = paginateSearch;
exports.waitForEndpointDeleted = waitForEndpointDeleted;
exports.waitForEndpointInService = waitForEndpointInService;
exports.waitForImageCreated = waitForImageCreated;
exports.waitForImageDeleted = waitForImageDeleted;
exports.waitForImageUpdated = waitForImageUpdated;
exports.waitForImageVersionCreated = waitForImageVersionCreated;
exports.waitForImageVersionDeleted = waitForImageVersionDeleted;
exports.waitForNotebookInstanceDeleted = waitForNotebookInstanceDeleted;
exports.waitForNotebookInstanceInService = waitForNotebookInstanceInService;
exports.waitForNotebookInstanceStopped = waitForNotebookInstanceStopped;
exports.waitForProcessingJobCompletedOrStopped = waitForProcessingJobCompletedOrStopped;
exports.waitForTrainingJobCompletedOrStopped = waitForTrainingJobCompletedOrStopped;
exports.waitForTransformJobCompletedOrStopped = waitForTransformJobCompletedOrStopped;
exports.waitUntilEndpointDeleted = waitUntilEndpointDeleted;
exports.waitUntilEndpointInService = waitUntilEndpointInService;
exports.waitUntilImageCreated = waitUntilImageCreated;
exports.waitUntilImageDeleted = waitUntilImageDeleted;
exports.waitUntilImageUpdated = waitUntilImageUpdated;
exports.waitUntilImageVersionCreated = waitUntilImageVersionCreated;
exports.waitUntilImageVersionDeleted = waitUntilImageVersionDeleted;
exports.waitUntilNotebookInstanceDeleted = waitUntilNotebookInstanceDeleted;
exports.waitUntilNotebookInstanceInService = waitUntilNotebookInstanceInService;
exports.waitUntilNotebookInstanceStopped = waitUntilNotebookInstanceStopped;
exports.waitUntilProcessingJobCompletedOrStopped = waitUntilProcessingJobCompletedOrStopped;
exports.waitUntilTrainingJobCompletedOrStopped = waitUntilTrainingJobCompletedOrStopped;
exports.waitUntilTransformJobCompletedOrStopped = waitUntilTransformJobCompletedOrStopped;
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
