import { awsExpectUnion as __expectUnion, loadRestJsonErrorCode, parseJsonBody as parseBody, parseJsonErrorBody as parseErrorBody, } from "@aws-sdk/core";
import { HttpRequest as __HttpRequest } from "@smithy/protocol-http";
import { _json, collectBody, decorateServiceException as __decorateServiceException, expectBoolean as __expectBoolean, expectInt32 as __expectInt32, expectLong as __expectLong, expectNonNull as __expectNonNull, expectNumber as __expectNumber, expectString as __expectString, LazyJsonString as __LazyJsonString, limitedParseDouble as __limitedParseDouble, limitedParseFloat32 as __limitedParseFloat32, parseEpochTimestamp as __parseEpochTimestamp, serializeFloat as __serializeFloat, take, withBaseException, } from "@smithy/smithy-client";
import { v4 as generateIdempotencyToken } from "uuid";
import { ConflictException, ResourceLimitExceeded, ResourceNotFound, } from "../models/models_0";
import { ResourceInUse, } from "../models/models_1";
import { TrialComponentParameterValue, } from "../models/models_2";
import { SageMakerServiceException as __BaseException } from "../models/SageMakerServiceException";
export const se_AddAssociationCommand = async (input, context) => {
    const headers = sharedHeaders("AddAssociation");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_AddTagsCommand = async (input, context) => {
    const headers = sharedHeaders("AddTags");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_AssociateTrialComponentCommand = async (input, context) => {
    const headers = sharedHeaders("AssociateTrialComponent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_BatchDeleteClusterNodesCommand = async (input, context) => {
    const headers = sharedHeaders("BatchDeleteClusterNodes");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_BatchDescribeModelPackageCommand = async (input, context) => {
    const headers = sharedHeaders("BatchDescribeModelPackage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateActionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateAction");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateAlgorithmCommand = async (input, context) => {
    const headers = sharedHeaders("CreateAlgorithm");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateAppCommand = async (input, context) => {
    const headers = sharedHeaders("CreateApp");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateAppImageConfigCommand = async (input, context) => {
    const headers = sharedHeaders("CreateAppImageConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateArtifactCommand = async (input, context) => {
    const headers = sharedHeaders("CreateArtifact");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateAutoMLJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateAutoMLJob");
    let body;
    body = JSON.stringify(se_CreateAutoMLJobRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateAutoMLJobV2Command = async (input, context) => {
    const headers = sharedHeaders("CreateAutoMLJobV2");
    let body;
    body = JSON.stringify(se_CreateAutoMLJobV2Request(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateClusterCommand = async (input, context) => {
    const headers = sharedHeaders("CreateCluster");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateClusterSchedulerConfigCommand = async (input, context) => {
    const headers = sharedHeaders("CreateClusterSchedulerConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateCodeRepositoryCommand = async (input, context) => {
    const headers = sharedHeaders("CreateCodeRepository");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateCompilationJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateCompilationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateComputeQuotaCommand = async (input, context) => {
    const headers = sharedHeaders("CreateComputeQuota");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateContextCommand = async (input, context) => {
    const headers = sharedHeaders("CreateContext");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateDataQualityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateDataQualityJobDefinition");
    let body;
    body = JSON.stringify(se_CreateDataQualityJobDefinitionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateDeviceFleetCommand = async (input, context) => {
    const headers = sharedHeaders("CreateDeviceFleet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateDomainCommand = async (input, context) => {
    const headers = sharedHeaders("CreateDomain");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateEdgeDeploymentPlanCommand = async (input, context) => {
    const headers = sharedHeaders("CreateEdgeDeploymentPlan");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateEdgeDeploymentStageCommand = async (input, context) => {
    const headers = sharedHeaders("CreateEdgeDeploymentStage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateEdgePackagingJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateEdgePackagingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateEndpointCommand = async (input, context) => {
    const headers = sharedHeaders("CreateEndpoint");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateEndpointConfigCommand = async (input, context) => {
    const headers = sharedHeaders("CreateEndpointConfig");
    let body;
    body = JSON.stringify(se_CreateEndpointConfigInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("CreateExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateFeatureGroupCommand = async (input, context) => {
    const headers = sharedHeaders("CreateFeatureGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateFlowDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateFlowDefinition");
    let body;
    body = JSON.stringify(se_CreateFlowDefinitionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateHubCommand = async (input, context) => {
    const headers = sharedHeaders("CreateHub");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateHubContentReferenceCommand = async (input, context) => {
    const headers = sharedHeaders("CreateHubContentReference");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateHumanTaskUiCommand = async (input, context) => {
    const headers = sharedHeaders("CreateHumanTaskUi");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateHyperParameterTuningJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateHyperParameterTuningJob");
    let body;
    body = JSON.stringify(se_CreateHyperParameterTuningJobRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateImageCommand = async (input, context) => {
    const headers = sharedHeaders("CreateImage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateImageVersionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateImageVersion");
    let body;
    body = JSON.stringify(se_CreateImageVersionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateInferenceComponentCommand = async (input, context) => {
    const headers = sharedHeaders("CreateInferenceComponent");
    let body;
    body = JSON.stringify(se_CreateInferenceComponentInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateInferenceExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("CreateInferenceExperiment");
    let body;
    body = JSON.stringify(se_CreateInferenceExperimentRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateInferenceRecommendationsJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateInferenceRecommendationsJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateLabelingJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateLabelingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateMlflowTrackingServerCommand = async (input, context) => {
    const headers = sharedHeaders("CreateMlflowTrackingServer");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModel");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelBiasJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelBiasJobDefinition");
    let body;
    body = JSON.stringify(se_CreateModelBiasJobDefinitionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelCardCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelCard");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelCardExportJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelCardExportJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelExplainabilityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelExplainabilityJobDefinition");
    let body;
    body = JSON.stringify(se_CreateModelExplainabilityJobDefinitionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelPackageCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelPackage");
    let body;
    body = JSON.stringify(se_CreateModelPackageInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelPackageGroupCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelPackageGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateModelQualityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("CreateModelQualityJobDefinition");
    let body;
    body = JSON.stringify(se_CreateModelQualityJobDefinitionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateMonitoringScheduleCommand = async (input, context) => {
    const headers = sharedHeaders("CreateMonitoringSchedule");
    let body;
    body = JSON.stringify(se_CreateMonitoringScheduleRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateNotebookInstanceCommand = async (input, context) => {
    const headers = sharedHeaders("CreateNotebookInstance");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateNotebookInstanceLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("CreateNotebookInstanceLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateOptimizationJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateOptimizationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreatePartnerAppCommand = async (input, context) => {
    const headers = sharedHeaders("CreatePartnerApp");
    let body;
    body = JSON.stringify(se_CreatePartnerAppRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreatePartnerAppPresignedUrlCommand = async (input, context) => {
    const headers = sharedHeaders("CreatePartnerAppPresignedUrl");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreatePipelineCommand = async (input, context) => {
    const headers = sharedHeaders("CreatePipeline");
    let body;
    body = JSON.stringify(se_CreatePipelineRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreatePresignedDomainUrlCommand = async (input, context) => {
    const headers = sharedHeaders("CreatePresignedDomainUrl");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreatePresignedMlflowTrackingServerUrlCommand = async (input, context) => {
    const headers = sharedHeaders("CreatePresignedMlflowTrackingServerUrl");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreatePresignedNotebookInstanceUrlCommand = async (input, context) => {
    const headers = sharedHeaders("CreatePresignedNotebookInstanceUrl");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateProcessingJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateProcessingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateProjectCommand = async (input, context) => {
    const headers = sharedHeaders("CreateProject");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateSpaceCommand = async (input, context) => {
    const headers = sharedHeaders("CreateSpace");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateStudioLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("CreateStudioLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateTrainingJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateTrainingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateTrainingPlanCommand = async (input, context) => {
    const headers = sharedHeaders("CreateTrainingPlan");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateTransformJobCommand = async (input, context) => {
    const headers = sharedHeaders("CreateTransformJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateTrialCommand = async (input, context) => {
    const headers = sharedHeaders("CreateTrial");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateTrialComponentCommand = async (input, context) => {
    const headers = sharedHeaders("CreateTrialComponent");
    let body;
    body = JSON.stringify(se_CreateTrialComponentRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateUserProfileCommand = async (input, context) => {
    const headers = sharedHeaders("CreateUserProfile");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateWorkforceCommand = async (input, context) => {
    const headers = sharedHeaders("CreateWorkforce");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_CreateWorkteamCommand = async (input, context) => {
    const headers = sharedHeaders("CreateWorkteam");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteActionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteAction");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteAlgorithmCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteAlgorithm");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteAppCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteApp");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteAppImageConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteAppImageConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteArtifactCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteArtifact");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteAssociationCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteAssociation");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteClusterCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteCluster");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteClusterSchedulerConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteClusterSchedulerConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteCodeRepositoryCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteCodeRepository");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteCompilationJobCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteCompilationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteComputeQuotaCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteComputeQuota");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteContextCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteContext");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteDataQualityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteDataQualityJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteDeviceFleetCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteDeviceFleet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteDomainCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteDomain");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteEdgeDeploymentPlanCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteEdgeDeploymentPlan");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteEdgeDeploymentStageCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteEdgeDeploymentStage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteEndpointCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteEndpoint");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteEndpointConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteEndpointConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteFeatureGroupCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteFeatureGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteFlowDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteFlowDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteHubCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteHub");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteHubContentCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteHubContent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteHubContentReferenceCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteHubContentReference");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteHumanTaskUiCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteHumanTaskUi");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteHyperParameterTuningJobCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteHyperParameterTuningJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteImageCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteImage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteImageVersionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteImageVersion");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteInferenceComponentCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteInferenceComponent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteInferenceExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteInferenceExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteMlflowTrackingServerCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteMlflowTrackingServer");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModel");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelBiasJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelBiasJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelCardCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelCard");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelExplainabilityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelExplainabilityJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelPackageCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelPackage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelPackageGroupCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelPackageGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelPackageGroupPolicyCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelPackageGroupPolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteModelQualityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteModelQualityJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteMonitoringScheduleCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteMonitoringSchedule");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteNotebookInstanceCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteNotebookInstance");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteNotebookInstanceLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteNotebookInstanceLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteOptimizationJobCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteOptimizationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeletePartnerAppCommand = async (input, context) => {
    const headers = sharedHeaders("DeletePartnerApp");
    let body;
    body = JSON.stringify(se_DeletePartnerAppRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeletePipelineCommand = async (input, context) => {
    const headers = sharedHeaders("DeletePipeline");
    let body;
    body = JSON.stringify(se_DeletePipelineRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteProjectCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteProject");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteSpaceCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteSpace");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteStudioLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteStudioLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteTagsCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteTags");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteTrialCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteTrial");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteTrialComponentCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteTrialComponent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteUserProfileCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteUserProfile");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteWorkforceCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteWorkforce");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeleteWorkteamCommand = async (input, context) => {
    const headers = sharedHeaders("DeleteWorkteam");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DeregisterDevicesCommand = async (input, context) => {
    const headers = sharedHeaders("DeregisterDevices");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeActionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeAction");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeAlgorithmCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeAlgorithm");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeAppCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeApp");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeAppImageConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeAppImageConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeArtifactCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeArtifact");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeAutoMLJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeAutoMLJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeAutoMLJobV2Command = async (input, context) => {
    const headers = sharedHeaders("DescribeAutoMLJobV2");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeClusterCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeCluster");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeClusterNodeCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeClusterNode");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeClusterSchedulerConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeClusterSchedulerConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeCodeRepositoryCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeCodeRepository");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeCompilationJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeCompilationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeComputeQuotaCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeComputeQuota");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeContextCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeContext");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeDataQualityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeDataQualityJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeDeviceCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeDevice");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeDeviceFleetCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeDeviceFleet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeDomainCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeDomain");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeEdgeDeploymentPlanCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeEdgeDeploymentPlan");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeEdgePackagingJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeEdgePackagingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeEndpointCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeEndpoint");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeEndpointConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeEndpointConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeFeatureGroupCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeFeatureGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeFeatureMetadataCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeFeatureMetadata");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeFlowDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeFlowDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeHubCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeHub");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeHubContentCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeHubContent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeHumanTaskUiCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeHumanTaskUi");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeHyperParameterTuningJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeHyperParameterTuningJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeImageCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeImage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeImageVersionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeImageVersion");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeInferenceComponentCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeInferenceComponent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeInferenceExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeInferenceExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeInferenceRecommendationsJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeInferenceRecommendationsJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeLabelingJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeLabelingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeLineageGroupCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeLineageGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeMlflowTrackingServerCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeMlflowTrackingServer");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModel");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelBiasJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelBiasJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelCardCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelCard");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelCardExportJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelCardExportJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelExplainabilityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelExplainabilityJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelPackageCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelPackage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelPackageGroupCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelPackageGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeModelQualityJobDefinitionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeModelQualityJobDefinition");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeMonitoringScheduleCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeMonitoringSchedule");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeNotebookInstanceCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeNotebookInstance");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeNotebookInstanceLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeNotebookInstanceLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeOptimizationJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeOptimizationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribePartnerAppCommand = async (input, context) => {
    const headers = sharedHeaders("DescribePartnerApp");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribePipelineCommand = async (input, context) => {
    const headers = sharedHeaders("DescribePipeline");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribePipelineDefinitionForExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribePipelineDefinitionForExecution");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribePipelineExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("DescribePipelineExecution");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeProcessingJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeProcessingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeProjectCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeProject");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeSpaceCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeSpace");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeStudioLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeStudioLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeSubscribedWorkteamCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeSubscribedWorkteam");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeTrainingJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeTrainingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeTrainingPlanCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeTrainingPlan");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeTransformJobCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeTransformJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeTrialCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeTrial");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeTrialComponentCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeTrialComponent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeUserProfileCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeUserProfile");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeWorkforceCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeWorkforce");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DescribeWorkteamCommand = async (input, context) => {
    const headers = sharedHeaders("DescribeWorkteam");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DisableSagemakerServicecatalogPortfolioCommand = async (input, context) => {
    const headers = sharedHeaders("DisableSagemakerServicecatalogPortfolio");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_DisassociateTrialComponentCommand = async (input, context) => {
    const headers = sharedHeaders("DisassociateTrialComponent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_EnableSagemakerServicecatalogPortfolioCommand = async (input, context) => {
    const headers = sharedHeaders("EnableSagemakerServicecatalogPortfolio");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetDeviceFleetReportCommand = async (input, context) => {
    const headers = sharedHeaders("GetDeviceFleetReport");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetLineageGroupPolicyCommand = async (input, context) => {
    const headers = sharedHeaders("GetLineageGroupPolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetModelPackageGroupPolicyCommand = async (input, context) => {
    const headers = sharedHeaders("GetModelPackageGroupPolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetSagemakerServicecatalogPortfolioStatusCommand = async (input, context) => {
    const headers = sharedHeaders("GetSagemakerServicecatalogPortfolioStatus");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetScalingConfigurationRecommendationCommand = async (input, context) => {
    const headers = sharedHeaders("GetScalingConfigurationRecommendation");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_GetSearchSuggestionsCommand = async (input, context) => {
    const headers = sharedHeaders("GetSearchSuggestions");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ImportHubContentCommand = async (input, context) => {
    const headers = sharedHeaders("ImportHubContent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListActionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListActions");
    let body;
    body = JSON.stringify(se_ListActionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAlgorithmsCommand = async (input, context) => {
    const headers = sharedHeaders("ListAlgorithms");
    let body;
    body = JSON.stringify(se_ListAlgorithmsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAliasesCommand = async (input, context) => {
    const headers = sharedHeaders("ListAliases");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAppImageConfigsCommand = async (input, context) => {
    const headers = sharedHeaders("ListAppImageConfigs");
    let body;
    body = JSON.stringify(se_ListAppImageConfigsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAppsCommand = async (input, context) => {
    const headers = sharedHeaders("ListApps");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListArtifactsCommand = async (input, context) => {
    const headers = sharedHeaders("ListArtifacts");
    let body;
    body = JSON.stringify(se_ListArtifactsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAssociationsCommand = async (input, context) => {
    const headers = sharedHeaders("ListAssociations");
    let body;
    body = JSON.stringify(se_ListAssociationsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListAutoMLJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListAutoMLJobs");
    let body;
    body = JSON.stringify(se_ListAutoMLJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListCandidatesForAutoMLJobCommand = async (input, context) => {
    const headers = sharedHeaders("ListCandidatesForAutoMLJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListClusterNodesCommand = async (input, context) => {
    const headers = sharedHeaders("ListClusterNodes");
    let body;
    body = JSON.stringify(se_ListClusterNodesRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListClustersCommand = async (input, context) => {
    const headers = sharedHeaders("ListClusters");
    let body;
    body = JSON.stringify(se_ListClustersRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListClusterSchedulerConfigsCommand = async (input, context) => {
    const headers = sharedHeaders("ListClusterSchedulerConfigs");
    let body;
    body = JSON.stringify(se_ListClusterSchedulerConfigsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListCodeRepositoriesCommand = async (input, context) => {
    const headers = sharedHeaders("ListCodeRepositories");
    let body;
    body = JSON.stringify(se_ListCodeRepositoriesInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListCompilationJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListCompilationJobs");
    let body;
    body = JSON.stringify(se_ListCompilationJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListComputeQuotasCommand = async (input, context) => {
    const headers = sharedHeaders("ListComputeQuotas");
    let body;
    body = JSON.stringify(se_ListComputeQuotasRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListContextsCommand = async (input, context) => {
    const headers = sharedHeaders("ListContexts");
    let body;
    body = JSON.stringify(se_ListContextsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListDataQualityJobDefinitionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListDataQualityJobDefinitions");
    let body;
    body = JSON.stringify(se_ListDataQualityJobDefinitionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListDeviceFleetsCommand = async (input, context) => {
    const headers = sharedHeaders("ListDeviceFleets");
    let body;
    body = JSON.stringify(se_ListDeviceFleetsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListDevicesCommand = async (input, context) => {
    const headers = sharedHeaders("ListDevices");
    let body;
    body = JSON.stringify(se_ListDevicesRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListDomainsCommand = async (input, context) => {
    const headers = sharedHeaders("ListDomains");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListEdgeDeploymentPlansCommand = async (input, context) => {
    const headers = sharedHeaders("ListEdgeDeploymentPlans");
    let body;
    body = JSON.stringify(se_ListEdgeDeploymentPlansRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListEdgePackagingJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListEdgePackagingJobs");
    let body;
    body = JSON.stringify(se_ListEdgePackagingJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListEndpointConfigsCommand = async (input, context) => {
    const headers = sharedHeaders("ListEndpointConfigs");
    let body;
    body = JSON.stringify(se_ListEndpointConfigsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListEndpointsCommand = async (input, context) => {
    const headers = sharedHeaders("ListEndpoints");
    let body;
    body = JSON.stringify(se_ListEndpointsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListExperimentsCommand = async (input, context) => {
    const headers = sharedHeaders("ListExperiments");
    let body;
    body = JSON.stringify(se_ListExperimentsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListFeatureGroupsCommand = async (input, context) => {
    const headers = sharedHeaders("ListFeatureGroups");
    let body;
    body = JSON.stringify(se_ListFeatureGroupsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListFlowDefinitionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListFlowDefinitions");
    let body;
    body = JSON.stringify(se_ListFlowDefinitionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListHubContentsCommand = async (input, context) => {
    const headers = sharedHeaders("ListHubContents");
    let body;
    body = JSON.stringify(se_ListHubContentsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListHubContentVersionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListHubContentVersions");
    let body;
    body = JSON.stringify(se_ListHubContentVersionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListHubsCommand = async (input, context) => {
    const headers = sharedHeaders("ListHubs");
    let body;
    body = JSON.stringify(se_ListHubsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListHumanTaskUisCommand = async (input, context) => {
    const headers = sharedHeaders("ListHumanTaskUis");
    let body;
    body = JSON.stringify(se_ListHumanTaskUisRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListHyperParameterTuningJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListHyperParameterTuningJobs");
    let body;
    body = JSON.stringify(se_ListHyperParameterTuningJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListImagesCommand = async (input, context) => {
    const headers = sharedHeaders("ListImages");
    let body;
    body = JSON.stringify(se_ListImagesRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListImageVersionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListImageVersions");
    let body;
    body = JSON.stringify(se_ListImageVersionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListInferenceComponentsCommand = async (input, context) => {
    const headers = sharedHeaders("ListInferenceComponents");
    let body;
    body = JSON.stringify(se_ListInferenceComponentsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListInferenceExperimentsCommand = async (input, context) => {
    const headers = sharedHeaders("ListInferenceExperiments");
    let body;
    body = JSON.stringify(se_ListInferenceExperimentsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListInferenceRecommendationsJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListInferenceRecommendationsJobs");
    let body;
    body = JSON.stringify(se_ListInferenceRecommendationsJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListInferenceRecommendationsJobStepsCommand = async (input, context) => {
    const headers = sharedHeaders("ListInferenceRecommendationsJobSteps");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListLabelingJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListLabelingJobs");
    let body;
    body = JSON.stringify(se_ListLabelingJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListLabelingJobsForWorkteamCommand = async (input, context) => {
    const headers = sharedHeaders("ListLabelingJobsForWorkteam");
    let body;
    body = JSON.stringify(se_ListLabelingJobsForWorkteamRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListLineageGroupsCommand = async (input, context) => {
    const headers = sharedHeaders("ListLineageGroups");
    let body;
    body = JSON.stringify(se_ListLineageGroupsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListMlflowTrackingServersCommand = async (input, context) => {
    const headers = sharedHeaders("ListMlflowTrackingServers");
    let body;
    body = JSON.stringify(se_ListMlflowTrackingServersRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelBiasJobDefinitionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelBiasJobDefinitions");
    let body;
    body = JSON.stringify(se_ListModelBiasJobDefinitionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelCardExportJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelCardExportJobs");
    let body;
    body = JSON.stringify(se_ListModelCardExportJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelCardsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelCards");
    let body;
    body = JSON.stringify(se_ListModelCardsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelCardVersionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelCardVersions");
    let body;
    body = JSON.stringify(se_ListModelCardVersionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelExplainabilityJobDefinitionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelExplainabilityJobDefinitions");
    let body;
    body = JSON.stringify(se_ListModelExplainabilityJobDefinitionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelMetadataCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelMetadata");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelPackageGroupsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelPackageGroups");
    let body;
    body = JSON.stringify(se_ListModelPackageGroupsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelPackagesCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelPackages");
    let body;
    body = JSON.stringify(se_ListModelPackagesInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelQualityJobDefinitionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModelQualityJobDefinitions");
    let body;
    body = JSON.stringify(se_ListModelQualityJobDefinitionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListModelsCommand = async (input, context) => {
    const headers = sharedHeaders("ListModels");
    let body;
    body = JSON.stringify(se_ListModelsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListMonitoringAlertHistoryCommand = async (input, context) => {
    const headers = sharedHeaders("ListMonitoringAlertHistory");
    let body;
    body = JSON.stringify(se_ListMonitoringAlertHistoryRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListMonitoringAlertsCommand = async (input, context) => {
    const headers = sharedHeaders("ListMonitoringAlerts");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListMonitoringExecutionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListMonitoringExecutions");
    let body;
    body = JSON.stringify(se_ListMonitoringExecutionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListMonitoringSchedulesCommand = async (input, context) => {
    const headers = sharedHeaders("ListMonitoringSchedules");
    let body;
    body = JSON.stringify(se_ListMonitoringSchedulesRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListNotebookInstanceLifecycleConfigsCommand = async (input, context) => {
    const headers = sharedHeaders("ListNotebookInstanceLifecycleConfigs");
    let body;
    body = JSON.stringify(se_ListNotebookInstanceLifecycleConfigsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListNotebookInstancesCommand = async (input, context) => {
    const headers = sharedHeaders("ListNotebookInstances");
    let body;
    body = JSON.stringify(se_ListNotebookInstancesInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListOptimizationJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListOptimizationJobs");
    let body;
    body = JSON.stringify(se_ListOptimizationJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListPartnerAppsCommand = async (input, context) => {
    const headers = sharedHeaders("ListPartnerApps");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListPipelineExecutionsCommand = async (input, context) => {
    const headers = sharedHeaders("ListPipelineExecutions");
    let body;
    body = JSON.stringify(se_ListPipelineExecutionsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListPipelineExecutionStepsCommand = async (input, context) => {
    const headers = sharedHeaders("ListPipelineExecutionSteps");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListPipelineParametersForExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("ListPipelineParametersForExecution");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListPipelinesCommand = async (input, context) => {
    const headers = sharedHeaders("ListPipelines");
    let body;
    body = JSON.stringify(se_ListPipelinesRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListProcessingJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListProcessingJobs");
    let body;
    body = JSON.stringify(se_ListProcessingJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListProjectsCommand = async (input, context) => {
    const headers = sharedHeaders("ListProjects");
    let body;
    body = JSON.stringify(se_ListProjectsInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListResourceCatalogsCommand = async (input, context) => {
    const headers = sharedHeaders("ListResourceCatalogs");
    let body;
    body = JSON.stringify(se_ListResourceCatalogsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListSpacesCommand = async (input, context) => {
    const headers = sharedHeaders("ListSpaces");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListStageDevicesCommand = async (input, context) => {
    const headers = sharedHeaders("ListStageDevices");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListStudioLifecycleConfigsCommand = async (input, context) => {
    const headers = sharedHeaders("ListStudioLifecycleConfigs");
    let body;
    body = JSON.stringify(se_ListStudioLifecycleConfigsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListSubscribedWorkteamsCommand = async (input, context) => {
    const headers = sharedHeaders("ListSubscribedWorkteams");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTagsCommand = async (input, context) => {
    const headers = sharedHeaders("ListTags");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTrainingJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListTrainingJobs");
    let body;
    body = JSON.stringify(se_ListTrainingJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTrainingJobsForHyperParameterTuningJobCommand = async (input, context) => {
    const headers = sharedHeaders("ListTrainingJobsForHyperParameterTuningJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTrainingPlansCommand = async (input, context) => {
    const headers = sharedHeaders("ListTrainingPlans");
    let body;
    body = JSON.stringify(se_ListTrainingPlansRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTransformJobsCommand = async (input, context) => {
    const headers = sharedHeaders("ListTransformJobs");
    let body;
    body = JSON.stringify(se_ListTransformJobsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTrialComponentsCommand = async (input, context) => {
    const headers = sharedHeaders("ListTrialComponents");
    let body;
    body = JSON.stringify(se_ListTrialComponentsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListTrialsCommand = async (input, context) => {
    const headers = sharedHeaders("ListTrials");
    let body;
    body = JSON.stringify(se_ListTrialsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListUserProfilesCommand = async (input, context) => {
    const headers = sharedHeaders("ListUserProfiles");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListWorkforcesCommand = async (input, context) => {
    const headers = sharedHeaders("ListWorkforces");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_ListWorkteamsCommand = async (input, context) => {
    const headers = sharedHeaders("ListWorkteams");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_PutModelPackageGroupPolicyCommand = async (input, context) => {
    const headers = sharedHeaders("PutModelPackageGroupPolicy");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_QueryLineageCommand = async (input, context) => {
    const headers = sharedHeaders("QueryLineage");
    let body;
    body = JSON.stringify(se_QueryLineageRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RegisterDevicesCommand = async (input, context) => {
    const headers = sharedHeaders("RegisterDevices");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RenderUiTemplateCommand = async (input, context) => {
    const headers = sharedHeaders("RenderUiTemplate");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_RetryPipelineExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("RetryPipelineExecution");
    let body;
    body = JSON.stringify(se_RetryPipelineExecutionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_SearchCommand = async (input, context) => {
    const headers = sharedHeaders("Search");
    let body;
    body = JSON.stringify(se_SearchRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_SearchTrainingPlanOfferingsCommand = async (input, context) => {
    const headers = sharedHeaders("SearchTrainingPlanOfferings");
    let body;
    body = JSON.stringify(se_SearchTrainingPlanOfferingsRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_SendPipelineExecutionStepFailureCommand = async (input, context) => {
    const headers = sharedHeaders("SendPipelineExecutionStepFailure");
    let body;
    body = JSON.stringify(se_SendPipelineExecutionStepFailureRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_SendPipelineExecutionStepSuccessCommand = async (input, context) => {
    const headers = sharedHeaders("SendPipelineExecutionStepSuccess");
    let body;
    body = JSON.stringify(se_SendPipelineExecutionStepSuccessRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartEdgeDeploymentStageCommand = async (input, context) => {
    const headers = sharedHeaders("StartEdgeDeploymentStage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartInferenceExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("StartInferenceExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartMlflowTrackingServerCommand = async (input, context) => {
    const headers = sharedHeaders("StartMlflowTrackingServer");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartMonitoringScheduleCommand = async (input, context) => {
    const headers = sharedHeaders("StartMonitoringSchedule");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartNotebookInstanceCommand = async (input, context) => {
    const headers = sharedHeaders("StartNotebookInstance");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StartPipelineExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("StartPipelineExecution");
    let body;
    body = JSON.stringify(se_StartPipelineExecutionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopAutoMLJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopAutoMLJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopCompilationJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopCompilationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopEdgeDeploymentStageCommand = async (input, context) => {
    const headers = sharedHeaders("StopEdgeDeploymentStage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopEdgePackagingJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopEdgePackagingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopHyperParameterTuningJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopHyperParameterTuningJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopInferenceExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("StopInferenceExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopInferenceRecommendationsJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopInferenceRecommendationsJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopLabelingJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopLabelingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopMlflowTrackingServerCommand = async (input, context) => {
    const headers = sharedHeaders("StopMlflowTrackingServer");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopMonitoringScheduleCommand = async (input, context) => {
    const headers = sharedHeaders("StopMonitoringSchedule");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopNotebookInstanceCommand = async (input, context) => {
    const headers = sharedHeaders("StopNotebookInstance");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopOptimizationJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopOptimizationJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopPipelineExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("StopPipelineExecution");
    let body;
    body = JSON.stringify(se_StopPipelineExecutionRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopProcessingJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopProcessingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopTrainingJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopTrainingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_StopTransformJobCommand = async (input, context) => {
    const headers = sharedHeaders("StopTransformJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateActionCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateAction");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateAppImageConfigCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateAppImageConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateArtifactCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateArtifact");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateClusterCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateCluster");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateClusterSchedulerConfigCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateClusterSchedulerConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateClusterSoftwareCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateClusterSoftware");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateCodeRepositoryCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateCodeRepository");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateComputeQuotaCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateComputeQuota");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateContextCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateContext");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateDeviceFleetCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateDeviceFleet");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateDevicesCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateDevices");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateDomainCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateDomain");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateEndpointCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateEndpoint");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateEndpointWeightsAndCapacitiesCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateEndpointWeightsAndCapacities");
    let body;
    body = JSON.stringify(se_UpdateEndpointWeightsAndCapacitiesInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateExperiment");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateFeatureGroupCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateFeatureGroup");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateFeatureMetadataCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateFeatureMetadata");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateHubCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateHub");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateHubContentCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateHubContent");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateHubContentReferenceCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateHubContentReference");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateImageCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateImage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateImageVersionCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateImageVersion");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateInferenceComponentCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateInferenceComponent");
    let body;
    body = JSON.stringify(se_UpdateInferenceComponentInput(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateInferenceComponentRuntimeConfigCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateInferenceComponentRuntimeConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateInferenceExperimentCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateInferenceExperiment");
    let body;
    body = JSON.stringify(se_UpdateInferenceExperimentRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateMlflowTrackingServerCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateMlflowTrackingServer");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateModelCardCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateModelCard");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateModelPackageCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateModelPackage");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateMonitoringAlertCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateMonitoringAlert");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateMonitoringScheduleCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateMonitoringSchedule");
    let body;
    body = JSON.stringify(se_UpdateMonitoringScheduleRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateNotebookInstanceCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateNotebookInstance");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateNotebookInstanceLifecycleConfigCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateNotebookInstanceLifecycleConfig");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdatePartnerAppCommand = async (input, context) => {
    const headers = sharedHeaders("UpdatePartnerApp");
    let body;
    body = JSON.stringify(se_UpdatePartnerAppRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdatePipelineCommand = async (input, context) => {
    const headers = sharedHeaders("UpdatePipeline");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdatePipelineExecutionCommand = async (input, context) => {
    const headers = sharedHeaders("UpdatePipelineExecution");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateProjectCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateProject");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateSpaceCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateSpace");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateTrainingJobCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateTrainingJob");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateTrialCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateTrial");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateTrialComponentCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateTrialComponent");
    let body;
    body = JSON.stringify(se_UpdateTrialComponentRequest(input, context));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateUserProfileCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateUserProfile");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateWorkforceCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateWorkforce");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const se_UpdateWorkteamCommand = async (input, context) => {
    const headers = sharedHeaders("UpdateWorkteam");
    let body;
    body = JSON.stringify(_json(input));
    return buildHttpRpcRequest(context, headers, "/", undefined, body);
};
export const de_AddAssociationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_AddAssociationResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_AddTagsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_AddTagsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_AssociateTrialComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_AssociateTrialComponentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_BatchDeleteClusterNodesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_BatchDeleteClusterNodesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_BatchDescribeModelPackageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_BatchDescribeModelPackageOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateActionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateActionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateAlgorithmCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateAlgorithmOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateAppResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateAppImageConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateAppImageConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateArtifactCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateArtifactResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateAutoMLJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateAutoMLJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateAutoMLJobV2Command = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateAutoMLJobV2Response(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateClusterCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateClusterResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateClusterSchedulerConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateClusterSchedulerConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateCodeRepositoryCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateCodeRepositoryOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateCompilationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateCompilationJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateComputeQuotaCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateComputeQuotaResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateContextCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateContextResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateDataQualityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateDataQualityJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateDeviceFleetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_CreateDomainCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateDomainResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateEdgeDeploymentPlanCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateEdgeDeploymentPlanResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateEdgeDeploymentStageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_CreateEdgePackagingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_CreateEndpointCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateEndpointOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateEndpointConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateEndpointConfigOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateFeatureGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateFeatureGroupResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateFlowDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateFlowDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateHubCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateHubResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateHubContentReferenceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateHubContentReferenceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateHumanTaskUiCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateHumanTaskUiResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateHyperParameterTuningJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateHyperParameterTuningJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateImageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateImageResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateImageVersionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateImageVersionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateInferenceComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateInferenceComponentOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateInferenceExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateInferenceExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateInferenceRecommendationsJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateInferenceRecommendationsJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateLabelingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateLabelingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateMlflowTrackingServerCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateMlflowTrackingServerResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelBiasJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelBiasJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelCardCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelCardResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelCardExportJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelCardExportJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelExplainabilityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelExplainabilityJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelPackageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelPackageOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelPackageGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelPackageGroupOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateModelQualityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateModelQualityJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateMonitoringScheduleCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateMonitoringScheduleResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateNotebookInstanceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateNotebookInstanceOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateNotebookInstanceLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateNotebookInstanceLifecycleConfigOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateOptimizationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateOptimizationJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreatePartnerAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreatePartnerAppResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreatePartnerAppPresignedUrlCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreatePartnerAppPresignedUrlResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreatePipelineCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreatePipelineResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreatePresignedDomainUrlCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreatePresignedDomainUrlResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreatePresignedMlflowTrackingServerUrlCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreatePresignedMlflowTrackingServerUrlResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreatePresignedNotebookInstanceUrlCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreatePresignedNotebookInstanceUrlOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateProcessingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateProcessingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateProjectCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateProjectOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateSpaceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateSpaceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateStudioLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateStudioLifecycleConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateTrainingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateTrainingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateTrainingPlanCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateTrainingPlanResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateTransformJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateTransformJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateTrialCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateTrialResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateTrialComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateTrialComponentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateUserProfileCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateUserProfileResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateWorkforceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateWorkforceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_CreateWorkteamCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_CreateWorkteamResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteActionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteActionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteAlgorithmCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteAppImageConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteArtifactCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteArtifactResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteAssociationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteAssociationResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteClusterCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteClusterResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteClusterSchedulerConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteCodeRepositoryCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteCompilationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteComputeQuotaCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteContextCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteContextResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteDataQualityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteDeviceFleetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteDomainCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteEdgeDeploymentPlanCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteEdgeDeploymentStageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteEndpointCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteEndpointConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteFeatureGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteFlowDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteFlowDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteHubCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteHubContentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteHubContentReferenceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteHumanTaskUiCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteHumanTaskUiResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteHyperParameterTuningJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteImageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteImageResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteImageVersionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteImageVersionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteInferenceComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteInferenceExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteInferenceExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteMlflowTrackingServerCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteMlflowTrackingServerResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteModelCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelBiasJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelCardCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelExplainabilityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelPackageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelPackageGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelPackageGroupPolicyCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteModelQualityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteMonitoringScheduleCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteNotebookInstanceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteNotebookInstanceLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteOptimizationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeletePartnerAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeletePartnerAppResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeletePipelineCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeletePipelineResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteProjectCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteSpaceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteStudioLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteTagsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteTagsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteTrialCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteTrialResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteTrialComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteTrialComponentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteUserProfileCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DeleteWorkforceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteWorkforceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeleteWorkteamCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DeleteWorkteamResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DeregisterDevicesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_DescribeActionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeActionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeAlgorithmCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeAlgorithmOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeAppResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeAppImageConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeAppImageConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeArtifactCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeArtifactResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeAutoMLJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeAutoMLJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeAutoMLJobV2Command = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeAutoMLJobV2Response(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeClusterCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeClusterResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeClusterNodeCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeClusterNodeResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeClusterSchedulerConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeClusterSchedulerConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeCodeRepositoryCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeCodeRepositoryOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeCompilationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeCompilationJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeComputeQuotaCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeComputeQuotaResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeContextCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeContextResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeDataQualityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeDataQualityJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeDeviceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeDeviceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeDeviceFleetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeDeviceFleetResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeDomainCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeDomainResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeEdgeDeploymentPlanCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeEdgeDeploymentPlanResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeEdgePackagingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeEdgePackagingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeEndpointCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeEndpointOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeEndpointConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeEndpointConfigOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeFeatureGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeFeatureGroupResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeFeatureMetadataCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeFeatureMetadataResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeFlowDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeFlowDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeHubCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeHubResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeHubContentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeHubContentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeHumanTaskUiCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeHumanTaskUiResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeHyperParameterTuningJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeHyperParameterTuningJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeImageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeImageResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeImageVersionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeImageVersionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeInferenceComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeInferenceComponentOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeInferenceExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeInferenceExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeInferenceRecommendationsJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeInferenceRecommendationsJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeLabelingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeLabelingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeLineageGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeLineageGroupResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeMlflowTrackingServerCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeMlflowTrackingServerResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelBiasJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelBiasJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelCardCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelCardResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelCardExportJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelCardExportJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelExplainabilityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelExplainabilityJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelPackageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelPackageOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelPackageGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelPackageGroupOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeModelQualityJobDefinitionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeModelQualityJobDefinitionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeMonitoringScheduleCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeMonitoringScheduleResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeNotebookInstanceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeNotebookInstanceOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeNotebookInstanceLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeNotebookInstanceLifecycleConfigOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeOptimizationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeOptimizationJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribePartnerAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribePartnerAppResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribePipelineCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribePipelineResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribePipelineDefinitionForExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribePipelineDefinitionForExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribePipelineExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribePipelineExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeProcessingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeProcessingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeProjectCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeProjectOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeSpaceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeSpaceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeStudioLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeStudioLifecycleConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeSubscribedWorkteamCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeSubscribedWorkteamResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeTrainingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeTrainingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeTrainingPlanCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeTrainingPlanResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeTransformJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeTransformJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeTrialCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeTrialResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeTrialComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeTrialComponentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeUserProfileCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeUserProfileResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeWorkforceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeWorkforceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DescribeWorkteamCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DescribeWorkteamResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DisableSagemakerServicecatalogPortfolioCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DisableSagemakerServicecatalogPortfolioOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_DisassociateTrialComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_DisassociateTrialComponentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_EnableSagemakerServicecatalogPortfolioCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_EnableSagemakerServicecatalogPortfolioOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetDeviceFleetReportCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetDeviceFleetReportResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetLineageGroupPolicyCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetLineageGroupPolicyResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetModelPackageGroupPolicyCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetModelPackageGroupPolicyOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetSagemakerServicecatalogPortfolioStatusCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetSagemakerServicecatalogPortfolioStatusOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetScalingConfigurationRecommendationCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetScalingConfigurationRecommendationResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_GetSearchSuggestionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_GetSearchSuggestionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ImportHubContentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ImportHubContentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListActionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListActionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAlgorithmsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListAlgorithmsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAliasesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListAliasesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAppImageConfigsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListAppImageConfigsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAppsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListAppsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListArtifactsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListArtifactsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAssociationsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListAssociationsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListAutoMLJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListAutoMLJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListCandidatesForAutoMLJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListCandidatesForAutoMLJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListClusterNodesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListClusterNodesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListClustersCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListClustersResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListClusterSchedulerConfigsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListClusterSchedulerConfigsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListCodeRepositoriesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListCodeRepositoriesOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListCompilationJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListCompilationJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListComputeQuotasCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListComputeQuotasResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListContextsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListContextsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListDataQualityJobDefinitionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListDataQualityJobDefinitionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListDeviceFleetsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListDeviceFleetsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListDevicesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListDevicesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListDomainsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListDomainsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListEdgeDeploymentPlansCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListEdgeDeploymentPlansResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListEdgePackagingJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListEdgePackagingJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListEndpointConfigsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListEndpointConfigsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListEndpointsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListEndpointsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListExperimentsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListExperimentsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListFeatureGroupsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListFeatureGroupsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListFlowDefinitionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListFlowDefinitionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListHubContentsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListHubContentsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListHubContentVersionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListHubContentVersionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListHubsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListHubsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListHumanTaskUisCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListHumanTaskUisResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListHyperParameterTuningJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListHyperParameterTuningJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListImagesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListImagesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListImageVersionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListImageVersionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListInferenceComponentsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListInferenceComponentsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListInferenceExperimentsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListInferenceExperimentsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListInferenceRecommendationsJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListInferenceRecommendationsJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListInferenceRecommendationsJobStepsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListInferenceRecommendationsJobStepsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListLabelingJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListLabelingJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListLabelingJobsForWorkteamCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListLabelingJobsForWorkteamResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListLineageGroupsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListLineageGroupsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListMlflowTrackingServersCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListMlflowTrackingServersResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelBiasJobDefinitionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelBiasJobDefinitionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelCardExportJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelCardExportJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelCardsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelCardsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelCardVersionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelCardVersionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelExplainabilityJobDefinitionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelExplainabilityJobDefinitionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelMetadataCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelMetadataResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelPackageGroupsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelPackageGroupsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelPackagesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelPackagesOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelQualityJobDefinitionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelQualityJobDefinitionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListModelsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListModelsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListMonitoringAlertHistoryCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListMonitoringAlertHistoryResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListMonitoringAlertsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListMonitoringAlertsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListMonitoringExecutionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListMonitoringExecutionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListMonitoringSchedulesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListMonitoringSchedulesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListNotebookInstanceLifecycleConfigsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListNotebookInstanceLifecycleConfigsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListNotebookInstancesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListNotebookInstancesOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListOptimizationJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListOptimizationJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListPartnerAppsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListPartnerAppsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListPipelineExecutionsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListPipelineExecutionsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListPipelineExecutionStepsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListPipelineExecutionStepsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListPipelineParametersForExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListPipelineParametersForExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListPipelinesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListPipelinesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListProcessingJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListProcessingJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListProjectsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListProjectsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListResourceCatalogsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListResourceCatalogsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListSpacesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListSpacesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListStageDevicesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListStageDevicesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListStudioLifecycleConfigsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListStudioLifecycleConfigsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListSubscribedWorkteamsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListSubscribedWorkteamsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTagsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTagsOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTrainingJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTrainingJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTrainingJobsForHyperParameterTuningJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTrainingJobsForHyperParameterTuningJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTrainingPlansCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTrainingPlansResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTransformJobsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTransformJobsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTrialComponentsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTrialComponentsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListTrialsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListTrialsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListUserProfilesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListUserProfilesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListWorkforcesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListWorkforcesResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_ListWorkteamsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_ListWorkteamsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_PutModelPackageGroupPolicyCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_PutModelPackageGroupPolicyOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_QueryLineageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_QueryLineageResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_RegisterDevicesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_RenderUiTemplateCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_RenderUiTemplateResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_RetryPipelineExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_RetryPipelineExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_SearchCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_SearchResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_SearchTrainingPlanOfferingsCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_SearchTrainingPlanOfferingsResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_SendPipelineExecutionStepFailureCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_SendPipelineExecutionStepFailureResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_SendPipelineExecutionStepSuccessCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_SendPipelineExecutionStepSuccessResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StartEdgeDeploymentStageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StartInferenceExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_StartInferenceExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StartMlflowTrackingServerCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_StartMlflowTrackingServerResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StartMonitoringScheduleCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StartNotebookInstanceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StartPipelineExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_StartPipelineExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StopAutoMLJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopCompilationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopEdgeDeploymentStageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopEdgePackagingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopHyperParameterTuningJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopInferenceExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_StopInferenceExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StopInferenceRecommendationsJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopLabelingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopMlflowTrackingServerCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_StopMlflowTrackingServerResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StopMonitoringScheduleCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopNotebookInstanceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopOptimizationJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopPipelineExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_StopPipelineExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_StopProcessingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopTrainingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_StopTransformJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateActionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateActionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateAppImageConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateAppImageConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateArtifactCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateArtifactResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateClusterCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateClusterResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateClusterSchedulerConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateClusterSchedulerConfigResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateClusterSoftwareCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateClusterSoftwareResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateCodeRepositoryCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateCodeRepositoryOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateComputeQuotaCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateComputeQuotaResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateContextCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateContextResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateDeviceFleetCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateDevicesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateDomainCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateDomainResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateEndpointCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateEndpointOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateEndpointWeightsAndCapacitiesCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateEndpointWeightsAndCapacitiesOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateFeatureGroupCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateFeatureGroupResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateFeatureMetadataCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    await collectBody(output.body, context);
    const response = {
        $metadata: deserializeMetadata(output),
    };
    return response;
};
export const de_UpdateHubCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateHubResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateHubContentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateHubContentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateHubContentReferenceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateHubContentReferenceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateImageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateImageResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateImageVersionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateImageVersionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateInferenceComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateInferenceComponentOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateInferenceComponentRuntimeConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateInferenceComponentRuntimeConfigOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateInferenceExperimentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateInferenceExperimentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateMlflowTrackingServerCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateMlflowTrackingServerResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateModelCardCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateModelCardResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateModelPackageCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateModelPackageOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateMonitoringAlertCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateMonitoringAlertResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateMonitoringScheduleCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateMonitoringScheduleResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateNotebookInstanceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateNotebookInstanceOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateNotebookInstanceLifecycleConfigCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateNotebookInstanceLifecycleConfigOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdatePartnerAppCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdatePartnerAppResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdatePipelineCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdatePipelineResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdatePipelineExecutionCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdatePipelineExecutionResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateProjectCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateProjectOutput(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateSpaceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateSpaceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateTrainingJobCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateTrainingJobResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateTrialCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateTrialResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateTrialComponentCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateTrialComponentResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateUserProfileCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateUserProfileResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateWorkforceCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateWorkforceResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
export const de_UpdateWorkteamCommand = async (output, context) => {
    if (output.statusCode >= 300) {
        return de_CommandError(output, context);
    }
    const data = await parseBody(output.body, context);
    let contents = {};
    contents = de_UpdateWorkteamResponse(data, context);
    const response = {
        $metadata: deserializeMetadata(output),
        ...contents,
    };
    return response;
};
const de_CommandError = async (output, context) => {
    const parsedOutput = {
        ...output,
        body: await parseErrorBody(output.body, context),
    };
    const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
    switch (errorCode) {
        case "ResourceLimitExceeded":
        case "com.amazonaws.sagemaker#ResourceLimitExceeded":
            throw await de_ResourceLimitExceededRes(parsedOutput, context);
        case "ResourceNotFound":
        case "com.amazonaws.sagemaker#ResourceNotFound":
            throw await de_ResourceNotFoundRes(parsedOutput, context);
        case "ResourceInUse":
        case "com.amazonaws.sagemaker#ResourceInUse":
            throw await de_ResourceInUseRes(parsedOutput, context);
        case "ConflictException":
        case "com.amazonaws.sagemaker#ConflictException":
            throw await de_ConflictExceptionRes(parsedOutput, context);
        default:
            const parsedBody = parsedOutput.body;
            return throwDefaultError({
                output,
                parsedBody,
                errorCode,
            });
    }
};
const de_ConflictExceptionRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ConflictException({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceInUseRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceInUse({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceLimitExceededRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceLimitExceeded({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const de_ResourceNotFoundRes = async (parsedOutput, context) => {
    const body = parsedOutput.body;
    const deserialized = _json(body);
    const exception = new ResourceNotFound({
        $metadata: deserializeMetadata(parsedOutput),
        ...deserialized,
    });
    return __decorateServiceException(exception, body);
};
const se_AutoMLDataSplitConfig = (input, context) => {
    return take(input, {
        ValidationFraction: __serializeFloat,
    });
};
const se_AutoMLJobConfig = (input, context) => {
    return take(input, {
        CandidateGenerationConfig: _json,
        CompletionCriteria: _json,
        DataSplitConfig: (_) => se_AutoMLDataSplitConfig(_, context),
        Mode: [],
        SecurityConfig: _json,
    });
};
const se_BatchTransformInput = (input, context) => {
    return take(input, {
        DataCapturedDestinationS3Uri: [],
        DatasetFormat: _json,
        EndTimeOffset: [],
        ExcludeFeaturesAttribute: [],
        FeaturesAttribute: [],
        InferenceAttribute: [],
        LocalPath: [],
        ProbabilityAttribute: [],
        ProbabilityThresholdAttribute: __serializeFloat,
        S3DataDistributionType: [],
        S3InputMode: [],
        StartTimeOffset: [],
    });
};
const se_CreateAutoMLJobRequest = (input, context) => {
    return take(input, {
        AutoMLJobConfig: (_) => se_AutoMLJobConfig(_, context),
        AutoMLJobName: [],
        AutoMLJobObjective: _json,
        GenerateCandidateDefinitionsOnly: [],
        InputDataConfig: _json,
        ModelDeployConfig: _json,
        OutputDataConfig: _json,
        ProblemType: [],
        RoleArn: [],
        Tags: _json,
    });
};
const se_CreateAutoMLJobV2Request = (input, context) => {
    return take(input, {
        AutoMLComputeConfig: _json,
        AutoMLJobInputDataConfig: _json,
        AutoMLJobName: [],
        AutoMLJobObjective: _json,
        AutoMLProblemTypeConfig: _json,
        DataSplitConfig: (_) => se_AutoMLDataSplitConfig(_, context),
        ModelDeployConfig: _json,
        OutputDataConfig: _json,
        RoleArn: [],
        SecurityConfig: _json,
        Tags: _json,
    });
};
const se_CreateDataQualityJobDefinitionRequest = (input, context) => {
    return take(input, {
        DataQualityAppSpecification: _json,
        DataQualityBaselineConfig: _json,
        DataQualityJobInput: (_) => se_DataQualityJobInput(_, context),
        DataQualityJobOutputConfig: _json,
        JobDefinitionName: [],
        JobResources: _json,
        NetworkConfig: _json,
        RoleArn: [],
        StoppingCondition: _json,
        Tags: _json,
    });
};
const se_CreateEndpointConfigInput = (input, context) => {
    return take(input, {
        AsyncInferenceConfig: _json,
        DataCaptureConfig: _json,
        EnableNetworkIsolation: [],
        EndpointConfigName: [],
        ExecutionRoleArn: [],
        ExplainerConfig: _json,
        KmsKeyId: [],
        ProductionVariants: (_) => se_ProductionVariantList(_, context),
        ShadowProductionVariants: (_) => se_ProductionVariantList(_, context),
        Tags: _json,
        VpcConfig: _json,
    });
};
const se_CreateFlowDefinitionRequest = (input, context) => {
    return take(input, {
        FlowDefinitionName: [],
        HumanLoopActivationConfig: (_) => se_HumanLoopActivationConfig(_, context),
        HumanLoopConfig: _json,
        HumanLoopRequestSource: _json,
        OutputConfig: _json,
        RoleArn: [],
        Tags: _json,
    });
};
const se_CreateHyperParameterTuningJobRequest = (input, context) => {
    return take(input, {
        Autotune: _json,
        HyperParameterTuningJobConfig: (_) => se_HyperParameterTuningJobConfig(_, context),
        HyperParameterTuningJobName: [],
        Tags: _json,
        TrainingJobDefinition: _json,
        TrainingJobDefinitions: _json,
        WarmStartConfig: _json,
    });
};
const se_CreateImageVersionRequest = (input, context) => {
    return take(input, {
        Aliases: _json,
        BaseImage: [],
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        Horovod: [],
        ImageName: [],
        JobType: [],
        MLFramework: [],
        Processor: [],
        ProgrammingLang: [],
        ReleaseNotes: [],
        VendorGuidance: [],
    });
};
const se_CreateInferenceComponentInput = (input, context) => {
    return take(input, {
        EndpointName: [],
        InferenceComponentName: [],
        RuntimeConfig: _json,
        Specification: (_) => se_InferenceComponentSpecification(_, context),
        Tags: _json,
        VariantName: [],
    });
};
const se_CreateInferenceExperimentRequest = (input, context) => {
    return take(input, {
        DataStorageConfig: _json,
        Description: [],
        EndpointName: [],
        KmsKey: [],
        ModelVariants: _json,
        Name: [],
        RoleArn: [],
        Schedule: (_) => se_InferenceExperimentSchedule(_, context),
        ShadowModeConfig: _json,
        Tags: _json,
        Type: [],
    });
};
const se_CreateModelBiasJobDefinitionRequest = (input, context) => {
    return take(input, {
        JobDefinitionName: [],
        JobResources: _json,
        ModelBiasAppSpecification: _json,
        ModelBiasBaselineConfig: _json,
        ModelBiasJobInput: (_) => se_ModelBiasJobInput(_, context),
        ModelBiasJobOutputConfig: _json,
        NetworkConfig: _json,
        RoleArn: [],
        StoppingCondition: _json,
        Tags: _json,
    });
};
const se_CreateModelExplainabilityJobDefinitionRequest = (input, context) => {
    return take(input, {
        JobDefinitionName: [],
        JobResources: _json,
        ModelExplainabilityAppSpecification: _json,
        ModelExplainabilityBaselineConfig: _json,
        ModelExplainabilityJobInput: (_) => se_ModelExplainabilityJobInput(_, context),
        ModelExplainabilityJobOutputConfig: _json,
        NetworkConfig: _json,
        RoleArn: [],
        StoppingCondition: _json,
        Tags: _json,
    });
};
const se_CreateModelPackageInput = (input, context) => {
    return take(input, {
        AdditionalInferenceSpecifications: _json,
        CertifyForMarketplace: [],
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        CustomerMetadataProperties: _json,
        Domain: [],
        DriftCheckBaselines: _json,
        InferenceSpecification: _json,
        MetadataProperties: _json,
        ModelApprovalStatus: [],
        ModelCard: _json,
        ModelLifeCycle: _json,
        ModelMetrics: _json,
        ModelPackageDescription: [],
        ModelPackageGroupName: [],
        ModelPackageName: [],
        SamplePayloadUrl: [],
        SecurityConfig: _json,
        SkipModelValidation: [],
        SourceAlgorithmSpecification: _json,
        SourceUri: [],
        Tags: _json,
        Task: [],
        ValidationSpecification: _json,
    });
};
const se_CreateModelQualityJobDefinitionRequest = (input, context) => {
    return take(input, {
        JobDefinitionName: [],
        JobResources: _json,
        ModelQualityAppSpecification: _json,
        ModelQualityBaselineConfig: _json,
        ModelQualityJobInput: (_) => se_ModelQualityJobInput(_, context),
        ModelQualityJobOutputConfig: _json,
        NetworkConfig: _json,
        RoleArn: [],
        StoppingCondition: _json,
        Tags: _json,
    });
};
const se_CreateMonitoringScheduleRequest = (input, context) => {
    return take(input, {
        MonitoringScheduleConfig: (_) => se_MonitoringScheduleConfig(_, context),
        MonitoringScheduleName: [],
        Tags: _json,
    });
};
const se_CreatePartnerAppRequest = (input, context) => {
    return take(input, {
        ApplicationConfig: _json,
        AuthType: [],
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        EnableIamSessionBasedIdentity: [],
        ExecutionRoleArn: [],
        KmsKeyId: [],
        MaintenanceConfig: _json,
        Name: [],
        Tags: _json,
        Tier: [],
        Type: [],
    });
};
const se_CreatePipelineRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        ParallelismConfiguration: _json,
        PipelineDefinition: [],
        PipelineDefinitionS3Location: _json,
        PipelineDescription: [],
        PipelineDisplayName: [],
        PipelineName: [],
        RoleArn: [],
        Tags: _json,
    });
};
const se_CreateTrialComponentRequest = (input, context) => {
    return take(input, {
        DisplayName: [],
        EndTime: (_) => _.getTime() / 1_000,
        InputArtifacts: _json,
        MetadataProperties: _json,
        OutputArtifacts: _json,
        Parameters: (_) => se_TrialComponentParameters(_, context),
        StartTime: (_) => _.getTime() / 1_000,
        Status: _json,
        Tags: _json,
        TrialComponentName: [],
    });
};
const se_DataQualityJobInput = (input, context) => {
    return take(input, {
        BatchTransformInput: (_) => se_BatchTransformInput(_, context),
        EndpointInput: (_) => se_EndpointInput(_, context),
    });
};
const se_DeletePartnerAppRequest = (input, context) => {
    return take(input, {
        Arn: [],
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
    });
};
const se_DeletePipelineRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        PipelineName: [],
    });
};
const se_DesiredWeightAndCapacity = (input, context) => {
    return take(input, {
        DesiredInstanceCount: [],
        DesiredWeight: __serializeFloat,
        ServerlessUpdateConfig: _json,
        VariantName: [],
    });
};
const se_DesiredWeightAndCapacityList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_DesiredWeightAndCapacity(entry, context);
    });
};
const se_EndpointInput = (input, context) => {
    return take(input, {
        EndTimeOffset: [],
        EndpointName: [],
        ExcludeFeaturesAttribute: [],
        FeaturesAttribute: [],
        InferenceAttribute: [],
        LocalPath: [],
        ProbabilityAttribute: [],
        ProbabilityThresholdAttribute: __serializeFloat,
        S3DataDistributionType: [],
        S3InputMode: [],
        StartTimeOffset: [],
    });
};
const se_HumanLoopActivationConditionsConfig = (input, context) => {
    return take(input, {
        HumanLoopActivationConditions: __LazyJsonString.from,
    });
};
const se_HumanLoopActivationConfig = (input, context) => {
    return take(input, {
        HumanLoopActivationConditionsConfig: (_) => se_HumanLoopActivationConditionsConfig(_, context),
    });
};
const se_HyperParameterTuningJobConfig = (input, context) => {
    return take(input, {
        HyperParameterTuningJobObjective: _json,
        ParameterRanges: _json,
        RandomSeed: [],
        ResourceLimits: _json,
        Strategy: [],
        StrategyConfig: _json,
        TrainingJobEarlyStoppingType: [],
        TuningJobCompletionCriteria: (_) => se_TuningJobCompletionCriteria(_, context),
    });
};
const se_InferenceComponentComputeResourceRequirements = (input, context) => {
    return take(input, {
        MaxMemoryRequiredInMb: [],
        MinMemoryRequiredInMb: [],
        NumberOfAcceleratorDevicesRequired: __serializeFloat,
        NumberOfCpuCoresRequired: __serializeFloat,
    });
};
const se_InferenceComponentSpecification = (input, context) => {
    return take(input, {
        BaseInferenceComponentName: [],
        ComputeResourceRequirements: (_) => se_InferenceComponentComputeResourceRequirements(_, context),
        Container: _json,
        ModelName: [],
        StartupParameters: _json,
    });
};
const se_InferenceExperimentSchedule = (input, context) => {
    return take(input, {
        EndTime: (_) => _.getTime() / 1_000,
        StartTime: (_) => _.getTime() / 1_000,
    });
};
const se_ListActionsRequest = (input, context) => {
    return take(input, {
        ActionType: [],
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        SourceUri: [],
    });
};
const se_ListAlgorithmsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListAppImageConfigsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModifiedTimeAfter: (_) => _.getTime() / 1_000,
        ModifiedTimeBefore: (_) => _.getTime() / 1_000,
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListArtifactsRequest = (input, context) => {
    return take(input, {
        ArtifactType: [],
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        SourceUri: [],
    });
};
const se_ListAssociationsRequest = (input, context) => {
    return take(input, {
        AssociationType: [],
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        DestinationArn: [],
        DestinationType: [],
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        SourceArn: [],
        SourceType: [],
    });
};
const se_ListAutoMLJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListClusterNodesRequest = (input, context) => {
    return take(input, {
        ClusterName: [],
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        InstanceGroupNameContains: [],
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListClusterSchedulerConfigsRequest = (input, context) => {
    return take(input, {
        ClusterArn: [],
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        Status: [],
    });
};
const se_ListClustersRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        TrainingPlanArn: [],
    });
};
const se_ListCodeRepositoriesInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListCompilationJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListComputeQuotasRequest = (input, context) => {
    return take(input, {
        ClusterArn: [],
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        Status: [],
    });
};
const se_ListContextsRequest = (input, context) => {
    return take(input, {
        ContextType: [],
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        SourceUri: [],
    });
};
const se_ListDataQualityJobDefinitionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointName: [],
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListDeviceFleetsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListDevicesRequest = (input, context) => {
    return take(input, {
        DeviceFleetName: [],
        LatestHeartbeatAfter: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelName: [],
        NextToken: [],
    });
};
const se_ListEdgeDeploymentPlansRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        DeviceFleetNameContains: [],
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListEdgePackagingJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelNameContains: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListEndpointConfigsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListEndpointsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListExperimentsRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListFeatureGroupsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        FeatureGroupStatusEquals: [],
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        OfflineStoreStatusEquals: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListFlowDefinitionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortOrder: [],
    });
};
const se_ListHubContentsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        HubContentType: [],
        HubName: [],
        MaxResults: [],
        MaxSchemaVersion: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListHubContentVersionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        HubContentName: [],
        HubContentType: [],
        HubName: [],
        MaxResults: [],
        MaxSchemaVersion: [],
        MinVersion: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListHubsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListHumanTaskUisRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortOrder: [],
    });
};
const se_ListHyperParameterTuningJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListImagesRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListImageVersionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        ImageName: [],
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListInferenceComponentsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointNameEquals: [],
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
        VariantNameEquals: [],
    });
};
const se_ListInferenceExperimentsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
        Type: [],
    });
};
const se_ListInferenceRecommendationsJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelNameEquals: [],
        ModelPackageVersionArnEquals: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListLabelingJobsForWorkteamRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        JobReferenceCodeContains: [],
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        WorkteamArn: [],
    });
};
const se_ListLabelingJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListLineageGroupsRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListMlflowTrackingServersRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        MlflowVersion: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        TrackingServerStatus: [],
    });
};
const se_ListModelBiasJobDefinitionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointName: [],
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelCardExportJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelCardExportJobNameContains: [],
        ModelCardName: [],
        ModelCardVersion: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListModelCardsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelCardStatus: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelCardVersionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelCardName: [],
        ModelCardStatus: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelExplainabilityJobDefinitionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointName: [],
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelPackageGroupsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        CrossAccountFilterOption: [],
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelPackagesInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModelApprovalStatus: [],
        ModelPackageGroupName: [],
        ModelPackageType: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelQualityJobDefinitionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointName: [],
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListModelsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListMonitoringAlertHistoryRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        MonitoringAlertName: [],
        MonitoringScheduleName: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListMonitoringExecutionsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointName: [],
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        MonitoringJobDefinitionName: [],
        MonitoringScheduleName: [],
        MonitoringTypeEquals: [],
        NextToken: [],
        ScheduledTimeAfter: (_) => _.getTime() / 1_000,
        ScheduledTimeBefore: (_) => _.getTime() / 1_000,
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListMonitoringSchedulesRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        EndpointName: [],
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        MonitoringJobDefinitionName: [],
        MonitoringTypeEquals: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListNotebookInstanceLifecycleConfigsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListNotebookInstancesInput = (input, context) => {
    return take(input, {
        AdditionalCodeRepositoryEquals: [],
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        DefaultCodeRepositoryContains: [],
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        NotebookInstanceLifecycleConfigNameContains: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListOptimizationJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        OptimizationContains: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListPipelineExecutionsRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        PipelineName: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListPipelinesRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NextToken: [],
        PipelineNamePrefix: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListProcessingJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListProjectsInput = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListResourceCatalogsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListStudioLifecycleConfigsRequest = (input, context) => {
    return take(input, {
        AppTypeEquals: [],
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        ModifiedTimeAfter: (_) => _.getTime() / 1_000,
        ModifiedTimeBefore: (_) => _.getTime() / 1_000,
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
    });
};
const se_ListTrainingJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
        TrainingPlanArnEquals: [],
        WarmPoolStatusEquals: [],
    });
};
const se_ListTrainingPlansRequest = (input, context) => {
    return take(input, {
        Filters: _json,
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StartTimeAfter: (_) => _.getTime() / 1_000,
        StartTimeBefore: (_) => _.getTime() / 1_000,
    });
};
const se_ListTransformJobsRequest = (input, context) => {
    return take(input, {
        CreationTimeAfter: (_) => _.getTime() / 1_000,
        CreationTimeBefore: (_) => _.getTime() / 1_000,
        LastModifiedTimeAfter: (_) => _.getTime() / 1_000,
        LastModifiedTimeBefore: (_) => _.getTime() / 1_000,
        MaxResults: [],
        NameContains: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        StatusEquals: [],
    });
};
const se_ListTrialComponentsRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        ExperimentName: [],
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        SourceArn: [],
        TrialName: [],
    });
};
const se_ListTrialsRequest = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        ExperimentName: [],
        MaxResults: [],
        NextToken: [],
        SortBy: [],
        SortOrder: [],
        TrialComponentName: [],
    });
};
const se_ModelBiasJobInput = (input, context) => {
    return take(input, {
        BatchTransformInput: (_) => se_BatchTransformInput(_, context),
        EndpointInput: (_) => se_EndpointInput(_, context),
        GroundTruthS3Input: _json,
    });
};
const se_ModelExplainabilityJobInput = (input, context) => {
    return take(input, {
        BatchTransformInput: (_) => se_BatchTransformInput(_, context),
        EndpointInput: (_) => se_EndpointInput(_, context),
    });
};
const se_ModelQualityJobInput = (input, context) => {
    return take(input, {
        BatchTransformInput: (_) => se_BatchTransformInput(_, context),
        EndpointInput: (_) => se_EndpointInput(_, context),
        GroundTruthS3Input: _json,
    });
};
const se_MonitoringInput = (input, context) => {
    return take(input, {
        BatchTransformInput: (_) => se_BatchTransformInput(_, context),
        EndpointInput: (_) => se_EndpointInput(_, context),
    });
};
const se_MonitoringInputs = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_MonitoringInput(entry, context);
    });
};
const se_MonitoringJobDefinition = (input, context) => {
    return take(input, {
        BaselineConfig: _json,
        Environment: _json,
        MonitoringAppSpecification: _json,
        MonitoringInputs: (_) => se_MonitoringInputs(_, context),
        MonitoringOutputConfig: _json,
        MonitoringResources: _json,
        NetworkConfig: _json,
        RoleArn: [],
        StoppingCondition: _json,
    });
};
const se_MonitoringScheduleConfig = (input, context) => {
    return take(input, {
        MonitoringJobDefinition: (_) => se_MonitoringJobDefinition(_, context),
        MonitoringJobDefinitionName: [],
        MonitoringType: [],
        ScheduleConfig: _json,
    });
};
const se_ProductionVariant = (input, context) => {
    return take(input, {
        AcceleratorType: [],
        ContainerStartupHealthCheckTimeoutInSeconds: [],
        CoreDumpConfig: _json,
        EnableSSMAccess: [],
        InferenceAmiVersion: [],
        InitialInstanceCount: [],
        InitialVariantWeight: __serializeFloat,
        InstanceType: [],
        ManagedInstanceScaling: _json,
        ModelDataDownloadTimeoutInSeconds: [],
        ModelName: [],
        RoutingConfig: _json,
        ServerlessConfig: _json,
        VariantName: [],
        VolumeSizeInGB: [],
    });
};
const se_ProductionVariantList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_ProductionVariant(entry, context);
    });
};
const se_QueryFilters = (input, context) => {
    return take(input, {
        CreatedAfter: (_) => _.getTime() / 1_000,
        CreatedBefore: (_) => _.getTime() / 1_000,
        LineageTypes: _json,
        ModifiedAfter: (_) => _.getTime() / 1_000,
        ModifiedBefore: (_) => _.getTime() / 1_000,
        Properties: _json,
        Types: _json,
    });
};
const se_QueryLineageRequest = (input, context) => {
    return take(input, {
        Direction: [],
        Filters: (_) => se_QueryFilters(_, context),
        IncludeEdges: [],
        MaxDepth: [],
        MaxResults: [],
        NextToken: [],
        StartArns: _json,
    });
};
const se_RetryPipelineExecutionRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        ParallelismConfiguration: _json,
        PipelineExecutionArn: [],
    });
};
const se_SearchExpression = (input, context) => {
    return take(input, {
        Filters: _json,
        NestedFilters: _json,
        Operator: [],
        SubExpressions: (_) => se_SearchExpressionList(_, context),
    });
};
const se_SearchExpressionList = (input, context) => {
    return input
        .filter((e) => e != null)
        .map((entry) => {
        return se_SearchExpression(entry, context);
    });
};
const se_SearchRequest = (input, context) => {
    return take(input, {
        CrossAccountFilterOption: [],
        MaxResults: [],
        NextToken: [],
        Resource: [],
        SearchExpression: (_) => se_SearchExpression(_, context),
        SortBy: [],
        SortOrder: [],
        VisibilityConditions: _json,
    });
};
const se_SearchTrainingPlanOfferingsRequest = (input, context) => {
    return take(input, {
        DurationHours: [],
        EndTimeBefore: (_) => _.getTime() / 1_000,
        InstanceCount: [],
        InstanceType: [],
        StartTimeAfter: (_) => _.getTime() / 1_000,
        TargetResources: _json,
    });
};
const se_SendPipelineExecutionStepFailureRequest = (input, context) => {
    return take(input, {
        CallbackToken: [],
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        FailureReason: [],
    });
};
const se_SendPipelineExecutionStepSuccessRequest = (input, context) => {
    return take(input, {
        CallbackToken: [],
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        OutputParameters: _json,
    });
};
const se_StartPipelineExecutionRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        ParallelismConfiguration: _json,
        PipelineExecutionDescription: [],
        PipelineExecutionDisplayName: [],
        PipelineName: [],
        PipelineParameters: _json,
        SelectiveExecutionConfig: _json,
    });
};
const se_StopPipelineExecutionRequest = (input, context) => {
    return take(input, {
        ClientRequestToken: [true, (_) => _ ?? generateIdempotencyToken()],
        PipelineExecutionArn: [],
    });
};
const se_TrialComponentParameters = (input, context) => {
    return Object.entries(input).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = se_TrialComponentParameterValue(value, context);
        return acc;
    }, {});
};
const se_TrialComponentParameterValue = (input, context) => {
    return TrialComponentParameterValue.visit(input, {
        NumberValue: (value) => ({ NumberValue: __serializeFloat(value) }),
        StringValue: (value) => ({ StringValue: value }),
        _: (name, value) => ({ [name]: value }),
    });
};
const se_TuningJobCompletionCriteria = (input, context) => {
    return take(input, {
        BestObjectiveNotImproving: _json,
        ConvergenceDetected: _json,
        TargetObjectiveMetricValue: __serializeFloat,
    });
};
const se_UpdateEndpointWeightsAndCapacitiesInput = (input, context) => {
    return take(input, {
        DesiredWeightsAndCapacities: (_) => se_DesiredWeightAndCapacityList(_, context),
        EndpointName: [],
    });
};
const se_UpdateInferenceComponentInput = (input, context) => {
    return take(input, {
        DeploymentConfig: _json,
        InferenceComponentName: [],
        RuntimeConfig: _json,
        Specification: (_) => se_InferenceComponentSpecification(_, context),
    });
};
const se_UpdateInferenceExperimentRequest = (input, context) => {
    return take(input, {
        DataStorageConfig: _json,
        Description: [],
        ModelVariants: _json,
        Name: [],
        Schedule: (_) => se_InferenceExperimentSchedule(_, context),
        ShadowModeConfig: _json,
    });
};
const se_UpdateMonitoringScheduleRequest = (input, context) => {
    return take(input, {
        MonitoringScheduleConfig: (_) => se_MonitoringScheduleConfig(_, context),
        MonitoringScheduleName: [],
    });
};
const se_UpdatePartnerAppRequest = (input, context) => {
    return take(input, {
        ApplicationConfig: _json,
        Arn: [],
        ClientToken: [true, (_) => _ ?? generateIdempotencyToken()],
        EnableIamSessionBasedIdentity: [],
        MaintenanceConfig: _json,
        Tags: _json,
        Tier: [],
    });
};
const se_UpdateTrialComponentRequest = (input, context) => {
    return take(input, {
        DisplayName: [],
        EndTime: (_) => _.getTime() / 1_000,
        InputArtifacts: _json,
        InputArtifactsToRemove: _json,
        OutputArtifacts: _json,
        OutputArtifactsToRemove: _json,
        Parameters: (_) => se_TrialComponentParameters(_, context),
        ParametersToRemove: _json,
        StartTime: (_) => _.getTime() / 1_000,
        Status: _json,
        TrialComponentName: [],
    });
};
const de_ActionSource = (output, context) => {
    return take(output, {
        SourceId: __expectString,
        SourceType: __expectString,
        SourceUri: __expectString,
    });
};
const de_ActionSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ActionSummary(entry, context);
    });
    return retVal;
};
const de_ActionSummary = (output, context) => {
    return take(output, {
        ActionArn: __expectString,
        ActionName: __expectString,
        ActionType: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Source: (_) => de_ActionSource(_, context),
        Status: __expectString,
    });
};
const de_AddAssociationResponse = (output, context) => {
    return take(output, {
        DestinationArn: __expectString,
        SourceArn: __expectString,
    });
};
const de_AdditionalCodeRepositoryNamesOrUrls = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_AdditionalInferenceSpecificationDefinition = (output, context) => {
    return take(output, {
        Containers: (_) => de_ModelPackageContainerDefinitionList(_, context),
        Description: __expectString,
        Name: __expectString,
        SupportedContentTypes: (_) => de_ContentTypes(_, context),
        SupportedRealtimeInferenceInstanceTypes: (_) => de_RealtimeInferenceInstanceTypes(_, context),
        SupportedResponseMIMETypes: (_) => de_ResponseMIMETypes(_, context),
        SupportedTransformInstanceTypes: (_) => de_TransformInstanceTypes(_, context),
    });
};
const de_AdditionalInferenceSpecifications = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AdditionalInferenceSpecificationDefinition(entry, context);
    });
    return retVal;
};
const de_AdditionalModelDataSource = (output, context) => {
    return take(output, {
        ChannelName: __expectString,
        S3DataSource: (_) => de_S3ModelDataSource(_, context),
    });
};
const de_AdditionalModelDataSources = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AdditionalModelDataSource(entry, context);
    });
    return retVal;
};
const de_AdditionalS3DataSource = (output, context) => {
    return take(output, {
        CompressionType: __expectString,
        ETag: __expectString,
        S3DataType: __expectString,
        S3Uri: __expectString,
    });
};
const de_AddTagsOutput = (output, context) => {
    return take(output, {
        Tags: (_) => de_TagList(_, context),
    });
};
const de_AgentVersion = (output, context) => {
    return take(output, {
        AgentCount: __expectLong,
        Version: __expectString,
    });
};
const de_AgentVersions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AgentVersion(entry, context);
    });
    return retVal;
};
const de_AggregationTransformations = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_Alarm = (output, context) => {
    return take(output, {
        AlarmName: __expectString,
    });
};
const de_AlarmDetails = (output, context) => {
    return take(output, {
        AlarmName: __expectString,
    });
};
const de_AlarmList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Alarm(entry, context);
    });
    return retVal;
};
const de_AlgorithmSpecification = (output, context) => {
    return take(output, {
        AlgorithmName: __expectString,
        ContainerArguments: (_) => de_TrainingContainerArguments(_, context),
        ContainerEntrypoint: (_) => de_TrainingContainerEntrypoint(_, context),
        EnableSageMakerMetricsTimeSeries: __expectBoolean,
        MetricDefinitions: (_) => de_MetricDefinitionList(_, context),
        TrainingImage: __expectString,
        TrainingImageConfig: (_) => de_TrainingImageConfig(_, context),
        TrainingInputMode: __expectString,
    });
};
const de_AlgorithmStatusDetails = (output, context) => {
    return take(output, {
        ImageScanStatuses: (_) => de_AlgorithmStatusItemList(_, context),
        ValidationStatuses: (_) => de_AlgorithmStatusItemList(_, context),
    });
};
const de_AlgorithmStatusItem = (output, context) => {
    return take(output, {
        FailureReason: __expectString,
        Name: __expectString,
        Status: __expectString,
    });
};
const de_AlgorithmStatusItemList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AlgorithmStatusItem(entry, context);
    });
    return retVal;
};
const de_AlgorithmSummary = (output, context) => {
    return take(output, {
        AlgorithmArn: __expectString,
        AlgorithmDescription: __expectString,
        AlgorithmName: __expectString,
        AlgorithmStatus: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_AlgorithmSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AlgorithmSummary(entry, context);
    });
    return retVal;
};
const de_AlgorithmValidationProfile = (output, context) => {
    return take(output, {
        ProfileName: __expectString,
        TrainingJobDefinition: (_) => de_TrainingJobDefinition(_, context),
        TransformJobDefinition: (_) => de_TransformJobDefinition(_, context),
    });
};
const de_AlgorithmValidationProfiles = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AlgorithmValidationProfile(entry, context);
    });
    return retVal;
};
const de_AlgorithmValidationSpecification = (output, context) => {
    return take(output, {
        ValidationProfiles: (_) => de_AlgorithmValidationProfiles(_, context),
        ValidationRole: __expectString,
    });
};
const de_AmazonQSettings = (output, context) => {
    return take(output, {
        QProfileArn: __expectString,
        Status: __expectString,
    });
};
const de_AnnotationConsolidationConfig = (output, context) => {
    return take(output, {
        AnnotationConsolidationLambdaArn: __expectString,
    });
};
const de_AppDetails = (output, context) => {
    return take(output, {
        AppName: __expectString,
        AppType: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainId: __expectString,
        ResourceSpec: (_) => de_ResourceSpec(_, context),
        SpaceName: __expectString,
        Status: __expectString,
        UserProfileName: __expectString,
    });
};
const de_AppImageConfigDetails = (output, context) => {
    return take(output, {
        AppImageConfigArn: __expectString,
        AppImageConfigName: __expectString,
        CodeEditorAppImageConfig: (_) => de_CodeEditorAppImageConfig(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        JupyterLabAppImageConfig: (_) => de_JupyterLabAppImageConfig(_, context),
        KernelGatewayImageConfig: (_) => de_KernelGatewayImageConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_AppImageConfigList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AppImageConfigDetails(entry, context);
    });
    return retVal;
};
const de_AppLifecycleManagement = (output, context) => {
    return take(output, {
        IdleSettings: (_) => de_IdleSettings(_, context),
    });
};
const de_AppList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AppDetails(entry, context);
    });
    return retVal;
};
const de_AppSpecification = (output, context) => {
    return take(output, {
        ContainerArguments: (_) => de_ContainerArguments(_, context),
        ContainerEntrypoint: (_) => de_ContainerEntrypoint(_, context),
        ImageUri: __expectString,
    });
};
const de_ArtifactSource = (output, context) => {
    return take(output, {
        SourceTypes: (_) => de_ArtifactSourceTypes(_, context),
        SourceUri: __expectString,
    });
};
const de_ArtifactSourceType = (output, context) => {
    return take(output, {
        SourceIdType: __expectString,
        Value: __expectString,
    });
};
const de_ArtifactSourceTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ArtifactSourceType(entry, context);
    });
    return retVal;
};
const de_ArtifactSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ArtifactSummary(entry, context);
    });
    return retVal;
};
const de_ArtifactSummary = (output, context) => {
    return take(output, {
        ArtifactArn: __expectString,
        ArtifactName: __expectString,
        ArtifactType: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Source: (_) => de_ArtifactSource(_, context),
    });
};
const de_AssociateTrialComponentResponse = (output, context) => {
    return take(output, {
        TrialArn: __expectString,
        TrialComponentArn: __expectString,
    });
};
const de_AssociationSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AssociationSummary(entry, context);
    });
    return retVal;
};
const de_AssociationSummary = (output, context) => {
    return take(output, {
        AssociationType: __expectString,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DestinationArn: __expectString,
        DestinationName: __expectString,
        DestinationType: __expectString,
        SourceArn: __expectString,
        SourceName: __expectString,
        SourceType: __expectString,
    });
};
const de_AssumableRoleArns = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_AsyncInferenceClientConfig = (output, context) => {
    return take(output, {
        MaxConcurrentInvocationsPerInstance: __expectInt32,
    });
};
const de_AsyncInferenceConfig = (output, context) => {
    return take(output, {
        ClientConfig: (_) => de_AsyncInferenceClientConfig(_, context),
        OutputConfig: (_) => de_AsyncInferenceOutputConfig(_, context),
    });
};
const de_AsyncInferenceNotificationConfig = (output, context) => {
    return take(output, {
        ErrorTopic: __expectString,
        IncludeInferenceResponseIn: (_) => de_AsyncNotificationTopicTypeList(_, context),
        SuccessTopic: __expectString,
    });
};
const de_AsyncInferenceOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        NotificationConfig: (_) => de_AsyncInferenceNotificationConfig(_, context),
        S3FailurePath: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_AsyncNotificationTopicTypeList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_AthenaDatasetDefinition = (output, context) => {
    return take(output, {
        Catalog: __expectString,
        Database: __expectString,
        KmsKeyId: __expectString,
        OutputCompression: __expectString,
        OutputFormat: __expectString,
        OutputS3Uri: __expectString,
        QueryString: __expectString,
        WorkGroup: __expectString,
    });
};
const de_AttributeNames = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_AuthenticationRequestExtraParams = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_AutoMLAlgorithmConfig = (output, context) => {
    return take(output, {
        AutoMLAlgorithms: (_) => de_AutoMLAlgorithms(_, context),
    });
};
const de_AutoMLAlgorithms = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_AutoMLAlgorithmsConfig = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLAlgorithmConfig(entry, context);
    });
    return retVal;
};
const de_AutoMLCandidate = (output, context) => {
    return take(output, {
        CandidateName: __expectString,
        CandidateProperties: (_) => de_CandidateProperties(_, context),
        CandidateStatus: __expectString,
        CandidateSteps: (_) => de_CandidateSteps(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        FinalAutoMLJobObjectiveMetric: (_) => de_FinalAutoMLJobObjectiveMetric(_, context),
        InferenceContainerDefinitions: (_) => de_AutoMLInferenceContainerDefinitions(_, context),
        InferenceContainers: (_) => de_AutoMLContainerDefinitions(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ObjectiveStatus: __expectString,
    });
};
const de_AutoMLCandidateGenerationConfig = (output, context) => {
    return take(output, {
        AlgorithmsConfig: (_) => de_AutoMLAlgorithmsConfig(_, context),
        FeatureSpecificationS3Uri: __expectString,
    });
};
const de_AutoMLCandidates = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLCandidate(entry, context);
    });
    return retVal;
};
const de_AutoMLCandidateStep = (output, context) => {
    return take(output, {
        CandidateStepArn: __expectString,
        CandidateStepName: __expectString,
        CandidateStepType: __expectString,
    });
};
const de_AutoMLChannel = (output, context) => {
    return take(output, {
        ChannelType: __expectString,
        CompressionType: __expectString,
        ContentType: __expectString,
        DataSource: (_) => de_AutoMLDataSource(_, context),
        SampleWeightAttributeName: __expectString,
        TargetAttributeName: __expectString,
    });
};
const de_AutoMLComputeConfig = (output, context) => {
    return take(output, {
        EmrServerlessComputeConfig: (_) => de_EmrServerlessComputeConfig(_, context),
    });
};
const de_AutoMLContainerDefinition = (output, context) => {
    return take(output, {
        Environment: (_) => de_EnvironmentMap(_, context),
        Image: __expectString,
        ModelDataUrl: __expectString,
    });
};
const de_AutoMLContainerDefinitions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLContainerDefinition(entry, context);
    });
    return retVal;
};
const de_AutoMLDataSource = (output, context) => {
    return take(output, {
        S3DataSource: (_) => de_AutoMLS3DataSource(_, context),
    });
};
const de_AutoMLDataSplitConfig = (output, context) => {
    return take(output, {
        ValidationFraction: __limitedParseFloat32,
    });
};
const de_AutoMLInferenceContainerDefinitions = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_AutoMLContainerDefinitions(value, context);
        return acc;
    }, {});
};
const de_AutoMLInputDataConfig = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLChannel(entry, context);
    });
    return retVal;
};
const de_AutoMLJobArtifacts = (output, context) => {
    return take(output, {
        CandidateDefinitionNotebookLocation: __expectString,
        DataExplorationNotebookLocation: __expectString,
    });
};
const de_AutoMLJobChannel = (output, context) => {
    return take(output, {
        ChannelType: __expectString,
        CompressionType: __expectString,
        ContentType: __expectString,
        DataSource: (_) => de_AutoMLDataSource(_, context),
    });
};
const de_AutoMLJobCompletionCriteria = (output, context) => {
    return take(output, {
        MaxAutoMLJobRuntimeInSeconds: __expectInt32,
        MaxCandidates: __expectInt32,
        MaxRuntimePerTrainingJobInSeconds: __expectInt32,
    });
};
const de_AutoMLJobConfig = (output, context) => {
    return take(output, {
        CandidateGenerationConfig: (_) => de_AutoMLCandidateGenerationConfig(_, context),
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
        DataSplitConfig: (_) => de_AutoMLDataSplitConfig(_, context),
        Mode: __expectString,
        SecurityConfig: (_) => de_AutoMLSecurityConfig(_, context),
    });
};
const de_AutoMLJobInputDataConfig = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLJobChannel(entry, context);
    });
    return retVal;
};
const de_AutoMLJobObjective = (output, context) => {
    return take(output, {
        MetricName: __expectString,
    });
};
const de_AutoMLJobStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_AutoMLJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLJobSummary(entry, context);
    });
    return retVal;
};
const de_AutoMLJobSummary = (output, context) => {
    return take(output, {
        AutoMLJobArn: __expectString,
        AutoMLJobName: __expectString,
        AutoMLJobSecondaryStatus: __expectString,
        AutoMLJobStatus: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        PartialFailureReasons: (_) => de_AutoMLPartialFailureReasons(_, context),
    });
};
const de_AutoMLOutputDataConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_AutoMLPartialFailureReason = (output, context) => {
    return take(output, {
        PartialFailureMessage: __expectString,
    });
};
const de_AutoMLPartialFailureReasons = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLPartialFailureReason(entry, context);
    });
    return retVal;
};
const de_AutoMLProblemTypeConfig = (output, context) => {
    if (output.ImageClassificationJobConfig != null) {
        return {
            ImageClassificationJobConfig: de_ImageClassificationJobConfig(output.ImageClassificationJobConfig, context),
        };
    }
    if (output.TabularJobConfig != null) {
        return {
            TabularJobConfig: de_TabularJobConfig(output.TabularJobConfig, context),
        };
    }
    if (output.TextClassificationJobConfig != null) {
        return {
            TextClassificationJobConfig: de_TextClassificationJobConfig(output.TextClassificationJobConfig, context),
        };
    }
    if (output.TextGenerationJobConfig != null) {
        return {
            TextGenerationJobConfig: de_TextGenerationJobConfig(output.TextGenerationJobConfig, context),
        };
    }
    if (output.TimeSeriesForecastingJobConfig != null) {
        return {
            TimeSeriesForecastingJobConfig: de_TimeSeriesForecastingJobConfig(output.TimeSeriesForecastingJobConfig, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_AutoMLProblemTypeResolvedAttributes = (output, context) => {
    if (output.TabularResolvedAttributes != null) {
        return {
            TabularResolvedAttributes: de_TabularResolvedAttributes(output.TabularResolvedAttributes, context),
        };
    }
    if (output.TextGenerationResolvedAttributes != null) {
        return {
            TextGenerationResolvedAttributes: de_TextGenerationResolvedAttributes(output.TextGenerationResolvedAttributes, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_AutoMLResolvedAttributes = (output, context) => {
    return take(output, {
        AutoMLJobObjective: (_) => de_AutoMLJobObjective(_, context),
        AutoMLProblemTypeResolvedAttributes: (_) => de_AutoMLProblemTypeResolvedAttributes(__expectUnion(_), context),
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
    });
};
const de_AutoMLS3DataSource = (output, context) => {
    return take(output, {
        S3DataType: __expectString,
        S3Uri: __expectString,
    });
};
const de_AutoMLSecurityConfig = (output, context) => {
    return take(output, {
        EnableInterContainerTrafficEncryption: __expectBoolean,
        VolumeKmsKeyId: __expectString,
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_AutoParameter = (output, context) => {
    return take(output, {
        Name: __expectString,
        ValueHint: __expectString,
    });
};
const de_AutoParameters = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoParameter(entry, context);
    });
    return retVal;
};
const de_AutoRollbackAlarms = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AlarmDetails(entry, context);
    });
    return retVal;
};
const de_AutoRollbackConfig = (output, context) => {
    return take(output, {
        Alarms: (_) => de_AlarmList(_, context),
    });
};
const de_Autotune = (output, context) => {
    return take(output, {
        Mode: __expectString,
    });
};
const de_BatchDataCaptureConfig = (output, context) => {
    return take(output, {
        DestinationS3Uri: __expectString,
        GenerateInferenceId: __expectBoolean,
        KmsKeyId: __expectString,
    });
};
const de_BatchDeleteClusterNodesError = (output, context) => {
    return take(output, {
        Code: __expectString,
        Message: __expectString,
        NodeId: __expectString,
    });
};
const de_BatchDeleteClusterNodesErrorList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_BatchDeleteClusterNodesError(entry, context);
    });
    return retVal;
};
const de_BatchDeleteClusterNodesResponse = (output, context) => {
    return take(output, {
        Failed: (_) => de_BatchDeleteClusterNodesErrorList(_, context),
        Successful: (_) => de_ClusterNodeIds(_, context),
    });
};
const de_BatchDescribeModelPackageError = (output, context) => {
    return take(output, {
        ErrorCode: __expectString,
        ErrorResponse: __expectString,
    });
};
const de_BatchDescribeModelPackageErrorMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_BatchDescribeModelPackageError(value, context);
        return acc;
    }, {});
};
const de_BatchDescribeModelPackageOutput = (output, context) => {
    return take(output, {
        BatchDescribeModelPackageErrorMap: (_) => de_BatchDescribeModelPackageErrorMap(_, context),
        ModelPackageSummaries: (_) => de_ModelPackageSummaries(_, context),
    });
};
const de_BatchDescribeModelPackageSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InferenceSpecification: (_) => de_InferenceSpecification(_, context),
        ModelApprovalStatus: __expectString,
        ModelPackageArn: __expectString,
        ModelPackageDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageStatus: __expectString,
        ModelPackageVersion: __expectInt32,
    });
};
const de_BatchTransformInput = (output, context) => {
    return take(output, {
        DataCapturedDestinationS3Uri: __expectString,
        DatasetFormat: (_) => de_MonitoringDatasetFormat(_, context),
        EndTimeOffset: __expectString,
        ExcludeFeaturesAttribute: __expectString,
        FeaturesAttribute: __expectString,
        InferenceAttribute: __expectString,
        LocalPath: __expectString,
        ProbabilityAttribute: __expectString,
        ProbabilityThresholdAttribute: __limitedParseDouble,
        S3DataDistributionType: __expectString,
        S3InputMode: __expectString,
        StartTimeOffset: __expectString,
    });
};
const de_BestObjectiveNotImproving = (output, context) => {
    return take(output, {
        MaxNumberOfTrainingJobsNotImproving: __expectInt32,
    });
};
const de_Bias = (output, context) => {
    return take(output, {
        PostTrainingReport: (_) => de_MetricsSource(_, context),
        PreTrainingReport: (_) => de_MetricsSource(_, context),
        Report: (_) => de_MetricsSource(_, context),
    });
};
const de_BlueGreenUpdatePolicy = (output, context) => {
    return take(output, {
        MaximumExecutionTimeoutInSeconds: __expectInt32,
        TerminationWaitInSeconds: __expectInt32,
        TrafficRoutingConfiguration: (_) => de_TrafficRoutingConfig(_, context),
    });
};
const de_CacheHitResult = (output, context) => {
    return take(output, {
        SourcePipelineExecutionArn: __expectString,
    });
};
const de_CallbackStepMetadata = (output, context) => {
    return take(output, {
        CallbackToken: __expectString,
        OutputParameters: (_) => de_OutputParameterList(_, context),
        SqsQueueUrl: __expectString,
    });
};
const de_CandidateArtifactLocations = (output, context) => {
    return take(output, {
        BacktestResults: __expectString,
        Explainability: __expectString,
        ModelInsights: __expectString,
    });
};
const de_CandidateGenerationConfig = (output, context) => {
    return take(output, {
        AlgorithmsConfig: (_) => de_AutoMLAlgorithmsConfig(_, context),
    });
};
const de_CandidateProperties = (output, context) => {
    return take(output, {
        CandidateArtifactLocations: (_) => de_CandidateArtifactLocations(_, context),
        CandidateMetrics: (_) => de_MetricDataList(_, context),
    });
};
const de_CandidateSteps = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_AutoMLCandidateStep(entry, context);
    });
    return retVal;
};
const de_CanvasAppSettings = (output, context) => {
    return take(output, {
        DirectDeploySettings: (_) => de_DirectDeploySettings(_, context),
        EmrServerlessSettings: (_) => de_EmrServerlessSettings(_, context),
        GenerativeAiSettings: (_) => de_GenerativeAiSettings(_, context),
        IdentityProviderOAuthSettings: (_) => de_IdentityProviderOAuthSettings(_, context),
        KendraSettings: (_) => de_KendraSettings(_, context),
        ModelRegisterSettings: (_) => de_ModelRegisterSettings(_, context),
        TimeSeriesForecastingSettings: (_) => de_TimeSeriesForecastingSettings(_, context),
        WorkspaceSettings: (_) => de_WorkspaceSettings(_, context),
    });
};
const de_CapacitySize = (output, context) => {
    return take(output, {
        Type: __expectString,
        Value: __expectInt32,
    });
};
const de_CapacitySizeConfig = (output, context) => {
    return take(output, {
        Type: __expectString,
        Value: __expectInt32,
    });
};
const de_CaptureContentTypeHeader = (output, context) => {
    return take(output, {
        CsvContentTypes: (_) => de_CsvContentTypes(_, context),
        JsonContentTypes: (_) => de_JsonContentTypes(_, context),
    });
};
const de_CaptureOption = (output, context) => {
    return take(output, {
        CaptureMode: __expectString,
    });
};
const de_CaptureOptionList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CaptureOption(entry, context);
    });
    return retVal;
};
const de_CategoricalParameter = (output, context) => {
    return take(output, {
        Name: __expectString,
        Value: (_) => de_CategoricalParameterRangeValues(_, context),
    });
};
const de_CategoricalParameterRange = (output, context) => {
    return take(output, {
        Name: __expectString,
        Values: (_) => de_ParameterValues(_, context),
    });
};
const de_CategoricalParameterRanges = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CategoricalParameterRange(entry, context);
    });
    return retVal;
};
const de_CategoricalParameterRangeSpecification = (output, context) => {
    return take(output, {
        Values: (_) => de_ParameterValues(_, context),
    });
};
const de_CategoricalParameterRangeValues = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_CategoricalParameters = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CategoricalParameter(entry, context);
    });
    return retVal;
};
const de_Channel = (output, context) => {
    return take(output, {
        ChannelName: __expectString,
        CompressionType: __expectString,
        ContentType: __expectString,
        DataSource: (_) => de_DataSource(_, context),
        InputMode: __expectString,
        RecordWrapperType: __expectString,
        ShuffleConfig: (_) => de_ShuffleConfig(_, context),
    });
};
const de_ChannelSpecification = (output, context) => {
    return take(output, {
        Description: __expectString,
        IsRequired: __expectBoolean,
        Name: __expectString,
        SupportedCompressionTypes: (_) => de_CompressionTypes(_, context),
        SupportedContentTypes: (_) => de_ContentTypes(_, context),
        SupportedInputModes: (_) => de_InputModes(_, context),
    });
};
const de_ChannelSpecifications = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ChannelSpecification(entry, context);
    });
    return retVal;
};
const de_CheckpointConfig = (output, context) => {
    return take(output, {
        LocalPath: __expectString,
        S3Uri: __expectString,
    });
};
const de_Cidrs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ClarifyCheckStepMetadata = (output, context) => {
    return take(output, {
        BaselineUsedForDriftCheckConstraints: __expectString,
        CalculatedBaselineConstraints: __expectString,
        CheckJobArn: __expectString,
        CheckType: __expectString,
        ModelPackageGroupName: __expectString,
        RegisterNewBaseline: __expectBoolean,
        SkipCheck: __expectBoolean,
        ViolationReport: __expectString,
    });
};
const de_ClarifyExplainerConfig = (output, context) => {
    return take(output, {
        EnableExplanations: __expectString,
        InferenceConfig: (_) => de_ClarifyInferenceConfig(_, context),
        ShapConfig: (_) => de_ClarifyShapConfig(_, context),
    });
};
const de_ClarifyFeatureHeaders = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ClarifyFeatureTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ClarifyInferenceConfig = (output, context) => {
    return take(output, {
        ContentTemplate: __expectString,
        FeatureHeaders: (_) => de_ClarifyFeatureHeaders(_, context),
        FeatureTypes: (_) => de_ClarifyFeatureTypes(_, context),
        FeaturesAttribute: __expectString,
        LabelAttribute: __expectString,
        LabelHeaders: (_) => de_ClarifyLabelHeaders(_, context),
        LabelIndex: __expectInt32,
        MaxPayloadInMB: __expectInt32,
        MaxRecordCount: __expectInt32,
        ProbabilityAttribute: __expectString,
        ProbabilityIndex: __expectInt32,
    });
};
const de_ClarifyLabelHeaders = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ClarifyShapBaselineConfig = (output, context) => {
    return take(output, {
        MimeType: __expectString,
        ShapBaseline: __expectString,
        ShapBaselineUri: __expectString,
    });
};
const de_ClarifyShapConfig = (output, context) => {
    return take(output, {
        NumberOfSamples: __expectInt32,
        Seed: __expectInt32,
        ShapBaselineConfig: (_) => de_ClarifyShapBaselineConfig(_, context),
        TextConfig: (_) => de_ClarifyTextConfig(_, context),
        UseLogit: __expectBoolean,
    });
};
const de_ClarifyTextConfig = (output, context) => {
    return take(output, {
        Granularity: __expectString,
        Language: __expectString,
    });
};
const de_ClusterEbsVolumeConfig = (output, context) => {
    return take(output, {
        VolumeSizeInGB: __expectInt32,
    });
};
const de_ClusterInstanceGroupDetails = (output, context) => {
    return take(output, {
        CurrentCount: __expectInt32,
        ExecutionRole: __expectString,
        InstanceGroupName: __expectString,
        InstanceStorageConfigs: (_) => de_ClusterInstanceStorageConfigs(_, context),
        InstanceType: __expectString,
        LifeCycleConfig: (_) => de_ClusterLifeCycleConfig(_, context),
        OnStartDeepHealthChecks: (_) => de_OnStartDeepHealthChecks(_, context),
        OverrideVpcConfig: (_) => de_VpcConfig(_, context),
        ScheduledUpdateConfig: (_) => de_ScheduledUpdateConfig(_, context),
        Status: __expectString,
        TargetCount: __expectInt32,
        ThreadsPerCore: __expectInt32,
        TrainingPlanArn: __expectString,
        TrainingPlanStatus: __expectString,
    });
};
const de_ClusterInstanceGroupDetailsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ClusterInstanceGroupDetails(entry, context);
    });
    return retVal;
};
const de_ClusterInstancePlacement = (output, context) => {
    return take(output, {
        AvailabilityZone: __expectString,
        AvailabilityZoneId: __expectString,
    });
};
const de_ClusterInstanceStatusDetails = (output, context) => {
    return take(output, {
        Message: __expectString,
        Status: __expectString,
    });
};
const de_ClusterInstanceStorageConfig = (output, context) => {
    if (output.EbsVolumeConfig != null) {
        return {
            EbsVolumeConfig: de_ClusterEbsVolumeConfig(output.EbsVolumeConfig, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_ClusterInstanceStorageConfigs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ClusterInstanceStorageConfig(__expectUnion(entry), context);
    });
    return retVal;
};
const de_ClusterLifeCycleConfig = (output, context) => {
    return take(output, {
        OnCreate: __expectString,
        SourceS3Uri: __expectString,
    });
};
const de_ClusterNodeDetails = (output, context) => {
    return take(output, {
        InstanceGroupName: __expectString,
        InstanceId: __expectString,
        InstanceStatus: (_) => de_ClusterInstanceStatusDetails(_, context),
        InstanceStorageConfigs: (_) => de_ClusterInstanceStorageConfigs(_, context),
        InstanceType: __expectString,
        LastSoftwareUpdateTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LaunchTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LifeCycleConfig: (_) => de_ClusterLifeCycleConfig(_, context),
        OverrideVpcConfig: (_) => de_VpcConfig(_, context),
        Placement: (_) => de_ClusterInstancePlacement(_, context),
        PrivateDnsHostname: __expectString,
        PrivatePrimaryIp: __expectString,
        PrivatePrimaryIpv6: __expectString,
        ThreadsPerCore: __expectInt32,
    });
};
const de_ClusterNodeIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ClusterNodeSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ClusterNodeSummary(entry, context);
    });
    return retVal;
};
const de_ClusterNodeSummary = (output, context) => {
    return take(output, {
        InstanceGroupName: __expectString,
        InstanceId: __expectString,
        InstanceStatus: (_) => de_ClusterInstanceStatusDetails(_, context),
        InstanceType: __expectString,
        LastSoftwareUpdateTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LaunchTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_ClusterOrchestrator = (output, context) => {
    return take(output, {
        Eks: (_) => de_ClusterOrchestratorEksConfig(_, context),
    });
};
const de_ClusterOrchestratorEksConfig = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
    });
};
const de_ClusterSchedulerConfigSummary = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
        ClusterSchedulerConfigArn: __expectString,
        ClusterSchedulerConfigId: __expectString,
        ClusterSchedulerConfigVersion: __expectInt32,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        Status: __expectString,
    });
};
const de_ClusterSchedulerConfigSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ClusterSchedulerConfigSummary(entry, context);
    });
    return retVal;
};
const de_ClusterSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ClusterSummary(entry, context);
    });
    return retVal;
};
const de_ClusterSummary = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
        ClusterName: __expectString,
        ClusterStatus: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingPlanArns: (_) => de_TrainingPlanArns(_, context),
    });
};
const de_CodeEditorAppImageConfig = (output, context) => {
    return take(output, {
        ContainerConfig: (_) => de_ContainerConfig(_, context),
        FileSystemConfig: (_) => de_FileSystemConfig(_, context),
    });
};
const de_CodeEditorAppSettings = (output, context) => {
    return take(output, {
        AppLifecycleManagement: (_) => de_AppLifecycleManagement(_, context),
        BuiltInLifecycleConfigArn: __expectString,
        CustomImages: (_) => de_CustomImages(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
        LifecycleConfigArns: (_) => de_LifecycleConfigArns(_, context),
    });
};
const de_CodeRepositories = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CodeRepository(entry, context);
    });
    return retVal;
};
const de_CodeRepository = (output, context) => {
    return take(output, {
        RepositoryUrl: __expectString,
    });
};
const de_CodeRepositorySummary = (output, context) => {
    return take(output, {
        CodeRepositoryArn: __expectString,
        CodeRepositoryName: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        GitConfig: (_) => de_GitConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_CodeRepositorySummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CodeRepositorySummary(entry, context);
    });
    return retVal;
};
const de_CognitoConfig = (output, context) => {
    return take(output, {
        ClientId: __expectString,
        UserPool: __expectString,
    });
};
const de_CognitoMemberDefinition = (output, context) => {
    return take(output, {
        ClientId: __expectString,
        UserGroup: __expectString,
        UserPool: __expectString,
    });
};
const de_CollectionConfig = (output, context) => {
    if (output.VectorConfig != null) {
        return {
            VectorConfig: de_VectorConfig(output.VectorConfig, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_CollectionConfiguration = (output, context) => {
    return take(output, {
        CollectionName: __expectString,
        CollectionParameters: (_) => de_CollectionParameters(_, context),
    });
};
const de_CollectionConfigurations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CollectionConfiguration(entry, context);
    });
    return retVal;
};
const de_CollectionParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_CompilationJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CompilationJobSummary(entry, context);
    });
    return retVal;
};
const de_CompilationJobSummary = (output, context) => {
    return take(output, {
        CompilationEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CompilationJobArn: __expectString,
        CompilationJobName: __expectString,
        CompilationJobStatus: __expectString,
        CompilationStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CompilationTargetDevice: __expectString,
        CompilationTargetPlatformAccelerator: __expectString,
        CompilationTargetPlatformArch: __expectString,
        CompilationTargetPlatformOs: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_CompressionTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ComputeQuotaConfig = (output, context) => {
    return take(output, {
        ComputeQuotaResources: (_) => de_ComputeQuotaResourceConfigList(_, context),
        PreemptTeamTasks: __expectString,
        ResourceSharingConfig: (_) => de_ResourceSharingConfig(_, context),
    });
};
const de_ComputeQuotaResourceConfig = (output, context) => {
    return take(output, {
        Count: __expectInt32,
        InstanceType: __expectString,
    });
};
const de_ComputeQuotaResourceConfigList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ComputeQuotaResourceConfig(entry, context);
    });
    return retVal;
};
const de_ComputeQuotaSummary = (output, context) => {
    return take(output, {
        ActivationState: __expectString,
        ClusterArn: __expectString,
        ComputeQuotaArn: __expectString,
        ComputeQuotaConfig: (_) => de_ComputeQuotaConfig(_, context),
        ComputeQuotaId: __expectString,
        ComputeQuotaTarget: (_) => de_ComputeQuotaTarget(_, context),
        ComputeQuotaVersion: __expectInt32,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        Status: __expectString,
    });
};
const de_ComputeQuotaSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ComputeQuotaSummary(entry, context);
    });
    return retVal;
};
const de_ComputeQuotaTarget = (output, context) => {
    return take(output, {
        FairShareWeight: __expectInt32,
        TeamName: __expectString,
    });
};
const de_ConditionStepMetadata = (output, context) => {
    return take(output, {
        Outcome: __expectString,
    });
};
const de_ConflictException = (output, context) => {
    return take(output, {
        Message: __expectString,
    });
};
const de_ContainerArguments = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ContainerConfig = (output, context) => {
    return take(output, {
        ContainerArguments: (_) => de_CustomImageContainerArguments(_, context),
        ContainerEntrypoint: (_) => de_CustomImageContainerEntrypoint(_, context),
        ContainerEnvironmentVariables: (_) => de_CustomImageContainerEnvironmentVariables(_, context),
    });
};
const de_ContainerDefinition = (output, context) => {
    return take(output, {
        AdditionalModelDataSources: (_) => de_AdditionalModelDataSources(_, context),
        ContainerHostname: __expectString,
        Environment: (_) => de_EnvironmentMap(_, context),
        Image: __expectString,
        ImageConfig: (_) => de_ImageConfig(_, context),
        InferenceSpecificationName: __expectString,
        Mode: __expectString,
        ModelDataSource: (_) => de_ModelDataSource(_, context),
        ModelDataUrl: __expectString,
        ModelPackageName: __expectString,
        MultiModelConfig: (_) => de_MultiModelConfig(_, context),
    });
};
const de_ContainerDefinitionList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ContainerDefinition(entry, context);
    });
    return retVal;
};
const de_ContainerEntrypoint = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ContentClassifiers = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ContentTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ContextSource = (output, context) => {
    return take(output, {
        SourceId: __expectString,
        SourceType: __expectString,
        SourceUri: __expectString,
    });
};
const de_ContextSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ContextSummary(entry, context);
    });
    return retVal;
};
const de_ContextSummary = (output, context) => {
    return take(output, {
        ContextArn: __expectString,
        ContextName: __expectString,
        ContextType: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Source: (_) => de_ContextSource(_, context),
    });
};
const de_ContinuousParameterRange = (output, context) => {
    return take(output, {
        MaxValue: __expectString,
        MinValue: __expectString,
        Name: __expectString,
        ScalingType: __expectString,
    });
};
const de_ContinuousParameterRanges = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ContinuousParameterRange(entry, context);
    });
    return retVal;
};
const de_ContinuousParameterRangeSpecification = (output, context) => {
    return take(output, {
        MaxValue: __expectString,
        MinValue: __expectString,
    });
};
const de_ConvergenceDetected = (output, context) => {
    return take(output, {
        CompleteOnConvergence: __expectString,
    });
};
const de_CreateActionResponse = (output, context) => {
    return take(output, {
        ActionArn: __expectString,
    });
};
const de_CreateAlgorithmOutput = (output, context) => {
    return take(output, {
        AlgorithmArn: __expectString,
    });
};
const de_CreateAppImageConfigResponse = (output, context) => {
    return take(output, {
        AppImageConfigArn: __expectString,
    });
};
const de_CreateAppResponse = (output, context) => {
    return take(output, {
        AppArn: __expectString,
    });
};
const de_CreateArtifactResponse = (output, context) => {
    return take(output, {
        ArtifactArn: __expectString,
    });
};
const de_CreateAutoMLJobResponse = (output, context) => {
    return take(output, {
        AutoMLJobArn: __expectString,
    });
};
const de_CreateAutoMLJobV2Response = (output, context) => {
    return take(output, {
        AutoMLJobArn: __expectString,
    });
};
const de_CreateClusterResponse = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
    });
};
const de_CreateClusterSchedulerConfigResponse = (output, context) => {
    return take(output, {
        ClusterSchedulerConfigArn: __expectString,
        ClusterSchedulerConfigId: __expectString,
    });
};
const de_CreateCodeRepositoryOutput = (output, context) => {
    return take(output, {
        CodeRepositoryArn: __expectString,
    });
};
const de_CreateCompilationJobResponse = (output, context) => {
    return take(output, {
        CompilationJobArn: __expectString,
    });
};
const de_CreateComputeQuotaResponse = (output, context) => {
    return take(output, {
        ComputeQuotaArn: __expectString,
        ComputeQuotaId: __expectString,
    });
};
const de_CreateContextResponse = (output, context) => {
    return take(output, {
        ContextArn: __expectString,
    });
};
const de_CreateDataQualityJobDefinitionResponse = (output, context) => {
    return take(output, {
        JobDefinitionArn: __expectString,
    });
};
const de_CreateDomainResponse = (output, context) => {
    return take(output, {
        DomainArn: __expectString,
        DomainId: __expectString,
        Url: __expectString,
    });
};
const de_CreateEdgeDeploymentPlanResponse = (output, context) => {
    return take(output, {
        EdgeDeploymentPlanArn: __expectString,
    });
};
const de_CreateEndpointConfigOutput = (output, context) => {
    return take(output, {
        EndpointConfigArn: __expectString,
    });
};
const de_CreateEndpointOutput = (output, context) => {
    return take(output, {
        EndpointArn: __expectString,
    });
};
const de_CreateExperimentResponse = (output, context) => {
    return take(output, {
        ExperimentArn: __expectString,
    });
};
const de_CreateFeatureGroupResponse = (output, context) => {
    return take(output, {
        FeatureGroupArn: __expectString,
    });
};
const de_CreateFlowDefinitionResponse = (output, context) => {
    return take(output, {
        FlowDefinitionArn: __expectString,
    });
};
const de_CreateHubContentReferenceResponse = (output, context) => {
    return take(output, {
        HubArn: __expectString,
        HubContentArn: __expectString,
    });
};
const de_CreateHubResponse = (output, context) => {
    return take(output, {
        HubArn: __expectString,
    });
};
const de_CreateHumanTaskUiResponse = (output, context) => {
    return take(output, {
        HumanTaskUiArn: __expectString,
    });
};
const de_CreateHyperParameterTuningJobResponse = (output, context) => {
    return take(output, {
        HyperParameterTuningJobArn: __expectString,
    });
};
const de_CreateImageResponse = (output, context) => {
    return take(output, {
        ImageArn: __expectString,
    });
};
const de_CreateImageVersionResponse = (output, context) => {
    return take(output, {
        ImageVersionArn: __expectString,
    });
};
const de_CreateInferenceComponentOutput = (output, context) => {
    return take(output, {
        InferenceComponentArn: __expectString,
    });
};
const de_CreateInferenceExperimentResponse = (output, context) => {
    return take(output, {
        InferenceExperimentArn: __expectString,
    });
};
const de_CreateInferenceRecommendationsJobResponse = (output, context) => {
    return take(output, {
        JobArn: __expectString,
    });
};
const de_CreateLabelingJobResponse = (output, context) => {
    return take(output, {
        LabelingJobArn: __expectString,
    });
};
const de_CreateMlflowTrackingServerResponse = (output, context) => {
    return take(output, {
        TrackingServerArn: __expectString,
    });
};
const de_CreateModelBiasJobDefinitionResponse = (output, context) => {
    return take(output, {
        JobDefinitionArn: __expectString,
    });
};
const de_CreateModelCardExportJobResponse = (output, context) => {
    return take(output, {
        ModelCardExportJobArn: __expectString,
    });
};
const de_CreateModelCardResponse = (output, context) => {
    return take(output, {
        ModelCardArn: __expectString,
    });
};
const de_CreateModelExplainabilityJobDefinitionResponse = (output, context) => {
    return take(output, {
        JobDefinitionArn: __expectString,
    });
};
const de_CreateModelOutput = (output, context) => {
    return take(output, {
        ModelArn: __expectString,
    });
};
const de_CreateModelPackageGroupOutput = (output, context) => {
    return take(output, {
        ModelPackageGroupArn: __expectString,
    });
};
const de_CreateModelPackageOutput = (output, context) => {
    return take(output, {
        ModelPackageArn: __expectString,
    });
};
const de_CreateModelQualityJobDefinitionResponse = (output, context) => {
    return take(output, {
        JobDefinitionArn: __expectString,
    });
};
const de_CreateMonitoringScheduleResponse = (output, context) => {
    return take(output, {
        MonitoringScheduleArn: __expectString,
    });
};
const de_CreateNotebookInstanceLifecycleConfigOutput = (output, context) => {
    return take(output, {
        NotebookInstanceLifecycleConfigArn: __expectString,
    });
};
const de_CreateNotebookInstanceOutput = (output, context) => {
    return take(output, {
        NotebookInstanceArn: __expectString,
    });
};
const de_CreateOptimizationJobResponse = (output, context) => {
    return take(output, {
        OptimizationJobArn: __expectString,
    });
};
const de_CreatePartnerAppPresignedUrlResponse = (output, context) => {
    return take(output, {
        Url: __expectString,
    });
};
const de_CreatePartnerAppResponse = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_CreatePipelineResponse = (output, context) => {
    return take(output, {
        PipelineArn: __expectString,
    });
};
const de_CreatePresignedDomainUrlResponse = (output, context) => {
    return take(output, {
        AuthorizedUrl: __expectString,
    });
};
const de_CreatePresignedMlflowTrackingServerUrlResponse = (output, context) => {
    return take(output, {
        AuthorizedUrl: __expectString,
    });
};
const de_CreatePresignedNotebookInstanceUrlOutput = (output, context) => {
    return take(output, {
        AuthorizedUrl: __expectString,
    });
};
const de_CreateProcessingJobResponse = (output, context) => {
    return take(output, {
        ProcessingJobArn: __expectString,
    });
};
const de_CreateProjectOutput = (output, context) => {
    return take(output, {
        ProjectArn: __expectString,
        ProjectId: __expectString,
    });
};
const de_CreateSpaceResponse = (output, context) => {
    return take(output, {
        SpaceArn: __expectString,
    });
};
const de_CreateStudioLifecycleConfigResponse = (output, context) => {
    return take(output, {
        StudioLifecycleConfigArn: __expectString,
    });
};
const de_CreateTrainingJobResponse = (output, context) => {
    return take(output, {
        TrainingJobArn: __expectString,
    });
};
const de_CreateTrainingPlanResponse = (output, context) => {
    return take(output, {
        TrainingPlanArn: __expectString,
    });
};
const de_CreateTransformJobResponse = (output, context) => {
    return take(output, {
        TransformJobArn: __expectString,
    });
};
const de_CreateTrialComponentResponse = (output, context) => {
    return take(output, {
        TrialComponentArn: __expectString,
    });
};
const de_CreateTrialResponse = (output, context) => {
    return take(output, {
        TrialArn: __expectString,
    });
};
const de_CreateUserProfileResponse = (output, context) => {
    return take(output, {
        UserProfileArn: __expectString,
    });
};
const de_CreateWorkforceResponse = (output, context) => {
    return take(output, {
        WorkforceArn: __expectString,
    });
};
const de_CreateWorkteamResponse = (output, context) => {
    return take(output, {
        WorkteamArn: __expectString,
    });
};
const de_CsvContentTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_CustomerMetadataMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_CustomFileSystem = (output, context) => {
    if (output.EFSFileSystem != null) {
        return {
            EFSFileSystem: de_EFSFileSystem(output.EFSFileSystem, context),
        };
    }
    if (output.FSxLustreFileSystem != null) {
        return {
            FSxLustreFileSystem: de_FSxLustreFileSystem(output.FSxLustreFileSystem, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_CustomFileSystemConfig = (output, context) => {
    if (output.EFSFileSystemConfig != null) {
        return {
            EFSFileSystemConfig: de_EFSFileSystemConfig(output.EFSFileSystemConfig, context),
        };
    }
    if (output.FSxLustreFileSystemConfig != null) {
        return {
            FSxLustreFileSystemConfig: de_FSxLustreFileSystemConfig(output.FSxLustreFileSystemConfig, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_CustomFileSystemConfigs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CustomFileSystemConfig(__expectUnion(entry), context);
    });
    return retVal;
};
const de_CustomFileSystems = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CustomFileSystem(__expectUnion(entry), context);
    });
    return retVal;
};
const de_CustomImage = (output, context) => {
    return take(output, {
        AppImageConfigName: __expectString,
        ImageName: __expectString,
        ImageVersionNumber: __expectInt32,
    });
};
const de_CustomImageContainerArguments = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_CustomImageContainerEntrypoint = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_CustomImageContainerEnvironmentVariables = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_CustomImages = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_CustomImage(entry, context);
    });
    return retVal;
};
const de_CustomizedMetricSpecification = (output, context) => {
    return take(output, {
        MetricName: __expectString,
        Namespace: __expectString,
        Statistic: __expectString,
    });
};
const de_CustomPosixUserConfig = (output, context) => {
    return take(output, {
        Gid: __expectLong,
        Uid: __expectLong,
    });
};
const de_DataCaptureConfig = (output, context) => {
    return take(output, {
        CaptureContentTypeHeader: (_) => de_CaptureContentTypeHeader(_, context),
        CaptureOptions: (_) => de_CaptureOptionList(_, context),
        DestinationS3Uri: __expectString,
        EnableCapture: __expectBoolean,
        InitialSamplingPercentage: __expectInt32,
        KmsKeyId: __expectString,
    });
};
const de_DataCaptureConfigSummary = (output, context) => {
    return take(output, {
        CaptureStatus: __expectString,
        CurrentSamplingPercentage: __expectInt32,
        DestinationS3Uri: __expectString,
        EnableCapture: __expectBoolean,
        KmsKeyId: __expectString,
    });
};
const de_DataCatalogConfig = (output, context) => {
    return take(output, {
        Catalog: __expectString,
        Database: __expectString,
        TableName: __expectString,
    });
};
const de_DataProcessing = (output, context) => {
    return take(output, {
        InputFilter: __expectString,
        JoinSource: __expectString,
        OutputFilter: __expectString,
    });
};
const de_DataQualityAppSpecification = (output, context) => {
    return take(output, {
        ContainerArguments: (_) => de_MonitoringContainerArguments(_, context),
        ContainerEntrypoint: (_) => de_ContainerEntrypoint(_, context),
        Environment: (_) => de_MonitoringEnvironmentMap(_, context),
        ImageUri: __expectString,
        PostAnalyticsProcessorSourceUri: __expectString,
        RecordPreprocessorSourceUri: __expectString,
    });
};
const de_DataQualityBaselineConfig = (output, context) => {
    return take(output, {
        BaseliningJobName: __expectString,
        ConstraintsResource: (_) => de_MonitoringConstraintsResource(_, context),
        StatisticsResource: (_) => de_MonitoringStatisticsResource(_, context),
    });
};
const de_DataQualityJobInput = (output, context) => {
    return take(output, {
        BatchTransformInput: (_) => de_BatchTransformInput(_, context),
        EndpointInput: (_) => de_EndpointInput(_, context),
    });
};
const de_DatasetDefinition = (output, context) => {
    return take(output, {
        AthenaDatasetDefinition: (_) => de_AthenaDatasetDefinition(_, context),
        DataDistributionType: __expectString,
        InputMode: __expectString,
        LocalPath: __expectString,
        RedshiftDatasetDefinition: (_) => de_RedshiftDatasetDefinition(_, context),
    });
};
const de_DataSource = (output, context) => {
    return take(output, {
        FileSystemDataSource: (_) => de_FileSystemDataSource(_, context),
        S3DataSource: (_) => de_S3DataSource(_, context),
    });
};
const de_DebugHookConfig = (output, context) => {
    return take(output, {
        CollectionConfigurations: (_) => de_CollectionConfigurations(_, context),
        HookParameters: (_) => de_HookParameters(_, context),
        LocalPath: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_DebugRuleConfiguration = (output, context) => {
    return take(output, {
        InstanceType: __expectString,
        LocalPath: __expectString,
        RuleConfigurationName: __expectString,
        RuleEvaluatorImage: __expectString,
        RuleParameters: (_) => de_RuleParameters(_, context),
        S3OutputPath: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_DebugRuleConfigurations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DebugRuleConfiguration(entry, context);
    });
    return retVal;
};
const de_DebugRuleEvaluationStatus = (output, context) => {
    return take(output, {
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RuleConfigurationName: __expectString,
        RuleEvaluationJobArn: __expectString,
        RuleEvaluationStatus: __expectString,
        StatusDetails: __expectString,
    });
};
const de_DebugRuleEvaluationStatuses = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DebugRuleEvaluationStatus(entry, context);
    });
    return retVal;
};
const de_DefaultEbsStorageSettings = (output, context) => {
    return take(output, {
        DefaultEbsVolumeSizeInGb: __expectInt32,
        MaximumEbsVolumeSizeInGb: __expectInt32,
    });
};
const de_DefaultSpaceSettings = (output, context) => {
    return take(output, {
        CustomFileSystemConfigs: (_) => de_CustomFileSystemConfigs(_, context),
        CustomPosixUserConfig: (_) => de_CustomPosixUserConfig(_, context),
        ExecutionRole: __expectString,
        JupyterLabAppSettings: (_) => de_JupyterLabAppSettings(_, context),
        JupyterServerAppSettings: (_) => de_JupyterServerAppSettings(_, context),
        KernelGatewayAppSettings: (_) => de_KernelGatewayAppSettings(_, context),
        SecurityGroups: (_) => de_SecurityGroupIds(_, context),
        SpaceStorageSettings: (_) => de_DefaultSpaceStorageSettings(_, context),
    });
};
const de_DefaultSpaceStorageSettings = (output, context) => {
    return take(output, {
        DefaultEbsStorageSettings: (_) => de_DefaultEbsStorageSettings(_, context),
    });
};
const de_DeleteActionResponse = (output, context) => {
    return take(output, {
        ActionArn: __expectString,
    });
};
const de_DeleteArtifactResponse = (output, context) => {
    return take(output, {
        ArtifactArn: __expectString,
    });
};
const de_DeleteAssociationResponse = (output, context) => {
    return take(output, {
        DestinationArn: __expectString,
        SourceArn: __expectString,
    });
};
const de_DeleteClusterResponse = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
    });
};
const de_DeleteContextResponse = (output, context) => {
    return take(output, {
        ContextArn: __expectString,
    });
};
const de_DeleteExperimentResponse = (output, context) => {
    return take(output, {
        ExperimentArn: __expectString,
    });
};
const de_DeleteFlowDefinitionResponse = (output, context) => {
    return take(output, {});
};
const de_DeleteHumanTaskUiResponse = (output, context) => {
    return take(output, {});
};
const de_DeleteImageResponse = (output, context) => {
    return take(output, {});
};
const de_DeleteImageVersionResponse = (output, context) => {
    return take(output, {});
};
const de_DeleteInferenceExperimentResponse = (output, context) => {
    return take(output, {
        InferenceExperimentArn: __expectString,
    });
};
const de_DeleteMlflowTrackingServerResponse = (output, context) => {
    return take(output, {
        TrackingServerArn: __expectString,
    });
};
const de_DeletePartnerAppResponse = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_DeletePipelineResponse = (output, context) => {
    return take(output, {
        PipelineArn: __expectString,
    });
};
const de_DeleteTagsOutput = (output, context) => {
    return take(output, {});
};
const de_DeleteTrialComponentResponse = (output, context) => {
    return take(output, {
        TrialComponentArn: __expectString,
    });
};
const de_DeleteTrialResponse = (output, context) => {
    return take(output, {
        TrialArn: __expectString,
    });
};
const de_DeleteWorkforceResponse = (output, context) => {
    return take(output, {});
};
const de_DeleteWorkteamResponse = (output, context) => {
    return take(output, {
        Success: __expectBoolean,
    });
};
const de_DeployedImage = (output, context) => {
    return take(output, {
        ResolutionTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ResolvedImage: __expectString,
        SpecifiedImage: __expectString,
    });
};
const de_DeployedImages = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeployedImage(entry, context);
    });
    return retVal;
};
const de_DeploymentConfig = (output, context) => {
    return take(output, {
        AutoRollbackConfiguration: (_) => de_AutoRollbackConfig(_, context),
        BlueGreenUpdatePolicy: (_) => de_BlueGreenUpdatePolicy(_, context),
        RollingUpdatePolicy: (_) => de_RollingUpdatePolicy(_, context),
    });
};
const de_DeploymentConfiguration = (output, context) => {
    return take(output, {
        AutoRollbackConfiguration: (_) => de_AutoRollbackAlarms(_, context),
        RollingUpdatePolicy: (_) => de_RollingDeploymentPolicy(_, context),
        WaitIntervalInSeconds: __expectInt32,
    });
};
const de_DeploymentRecommendation = (output, context) => {
    return take(output, {
        RealTimeInferenceRecommendations: (_) => de_RealTimeInferenceRecommendations(_, context),
        RecommendationStatus: __expectString,
    });
};
const de_DeploymentStageStatusSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeploymentStageStatusSummary(entry, context);
    });
    return retVal;
};
const de_DeploymentStageStatusSummary = (output, context) => {
    return take(output, {
        DeploymentConfig: (_) => de_EdgeDeploymentConfig(_, context),
        DeploymentStatus: (_) => de_EdgeDeploymentStatus(_, context),
        DeviceSelectionConfig: (_) => de_DeviceSelectionConfig(_, context),
        StageName: __expectString,
    });
};
const de_DerivedInformation = (output, context) => {
    return take(output, {
        DerivedDataInputConfig: __expectString,
    });
};
const de_DescribeActionResponse = (output, context) => {
    return take(output, {
        ActionArn: __expectString,
        ActionName: __expectString,
        ActionType: __expectString,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        Properties: (_) => de_LineageEntityParameters(_, context),
        Source: (_) => de_ActionSource(_, context),
        Status: __expectString,
    });
};
const de_DescribeAlgorithmOutput = (output, context) => {
    return take(output, {
        AlgorithmArn: __expectString,
        AlgorithmDescription: __expectString,
        AlgorithmName: __expectString,
        AlgorithmStatus: __expectString,
        AlgorithmStatusDetails: (_) => de_AlgorithmStatusDetails(_, context),
        CertifyForMarketplace: __expectBoolean,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InferenceSpecification: (_) => de_InferenceSpecification(_, context),
        ProductId: __expectString,
        TrainingSpecification: (_) => de_TrainingSpecification(_, context),
        ValidationSpecification: (_) => de_AlgorithmValidationSpecification(_, context),
    });
};
const de_DescribeAppImageConfigResponse = (output, context) => {
    return take(output, {
        AppImageConfigArn: __expectString,
        AppImageConfigName: __expectString,
        CodeEditorAppImageConfig: (_) => de_CodeEditorAppImageConfig(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        JupyterLabAppImageConfig: (_) => de_JupyterLabAppImageConfig(_, context),
        KernelGatewayImageConfig: (_) => de_KernelGatewayImageConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeAppResponse = (output, context) => {
    return take(output, {
        AppArn: __expectString,
        AppName: __expectString,
        AppType: __expectString,
        BuiltInLifecycleConfigArn: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainId: __expectString,
        FailureReason: __expectString,
        LastHealthCheckTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastUserActivityTimestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RecoveryMode: __expectBoolean,
        ResourceSpec: (_) => de_ResourceSpec(_, context),
        SpaceName: __expectString,
        Status: __expectString,
        UserProfileName: __expectString,
    });
};
const de_DescribeArtifactResponse = (output, context) => {
    return take(output, {
        ArtifactArn: __expectString,
        ArtifactName: __expectString,
        ArtifactType: __expectString,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        Properties: (_) => de_LineageEntityParameters(_, context),
        Source: (_) => de_ArtifactSource(_, context),
    });
};
const de_DescribeAutoMLJobResponse = (output, context) => {
    return take(output, {
        AutoMLJobArn: __expectString,
        AutoMLJobArtifacts: (_) => de_AutoMLJobArtifacts(_, context),
        AutoMLJobConfig: (_) => de_AutoMLJobConfig(_, context),
        AutoMLJobName: __expectString,
        AutoMLJobObjective: (_) => de_AutoMLJobObjective(_, context),
        AutoMLJobSecondaryStatus: __expectString,
        AutoMLJobStatus: __expectString,
        BestCandidate: (_) => de_AutoMLCandidate(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        GenerateCandidateDefinitionsOnly: __expectBoolean,
        InputDataConfig: (_) => de_AutoMLInputDataConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelDeployConfig: (_) => de_ModelDeployConfig(_, context),
        ModelDeployResult: (_) => de_ModelDeployResult(_, context),
        OutputDataConfig: (_) => de_AutoMLOutputDataConfig(_, context),
        PartialFailureReasons: (_) => de_AutoMLPartialFailureReasons(_, context),
        ProblemType: __expectString,
        ResolvedAttributes: (_) => de_ResolvedAttributes(_, context),
        RoleArn: __expectString,
    });
};
const de_DescribeAutoMLJobV2Response = (output, context) => {
    return take(output, {
        AutoMLComputeConfig: (_) => de_AutoMLComputeConfig(_, context),
        AutoMLJobArn: __expectString,
        AutoMLJobArtifacts: (_) => de_AutoMLJobArtifacts(_, context),
        AutoMLJobInputDataConfig: (_) => de_AutoMLJobInputDataConfig(_, context),
        AutoMLJobName: __expectString,
        AutoMLJobObjective: (_) => de_AutoMLJobObjective(_, context),
        AutoMLJobSecondaryStatus: __expectString,
        AutoMLJobStatus: __expectString,
        AutoMLProblemTypeConfig: (_) => de_AutoMLProblemTypeConfig(__expectUnion(_), context),
        AutoMLProblemTypeConfigName: __expectString,
        BestCandidate: (_) => de_AutoMLCandidate(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataSplitConfig: (_) => de_AutoMLDataSplitConfig(_, context),
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelDeployConfig: (_) => de_ModelDeployConfig(_, context),
        ModelDeployResult: (_) => de_ModelDeployResult(_, context),
        OutputDataConfig: (_) => de_AutoMLOutputDataConfig(_, context),
        PartialFailureReasons: (_) => de_AutoMLPartialFailureReasons(_, context),
        ResolvedAttributes: (_) => de_AutoMLResolvedAttributes(_, context),
        RoleArn: __expectString,
        SecurityConfig: (_) => de_AutoMLSecurityConfig(_, context),
    });
};
const de_DescribeClusterNodeResponse = (output, context) => {
    return take(output, {
        NodeDetails: (_) => de_ClusterNodeDetails(_, context),
    });
};
const de_DescribeClusterResponse = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
        ClusterName: __expectString,
        ClusterStatus: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureMessage: __expectString,
        InstanceGroups: (_) => de_ClusterInstanceGroupDetailsList(_, context),
        NodeRecovery: __expectString,
        Orchestrator: (_) => de_ClusterOrchestrator(_, context),
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_DescribeClusterSchedulerConfigResponse = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
        ClusterSchedulerConfigArn: __expectString,
        ClusterSchedulerConfigId: __expectString,
        ClusterSchedulerConfigVersion: __expectInt32,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        FailureReason: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        SchedulerConfig: (_) => de_SchedulerConfig(_, context),
        Status: __expectString,
    });
};
const de_DescribeCodeRepositoryOutput = (output, context) => {
    return take(output, {
        CodeRepositoryArn: __expectString,
        CodeRepositoryName: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        GitConfig: (_) => de_GitConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeCompilationJobResponse = (output, context) => {
    return take(output, {
        CompilationEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CompilationJobArn: __expectString,
        CompilationJobName: __expectString,
        CompilationJobStatus: __expectString,
        CompilationStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DerivedInformation: (_) => de_DerivedInformation(_, context),
        FailureReason: __expectString,
        InferenceImage: __expectString,
        InputConfig: (_) => de_InputConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelArtifacts: (_) => de_ModelArtifacts(_, context),
        ModelDigests: (_) => de_ModelDigests(_, context),
        ModelPackageVersionArn: __expectString,
        OutputConfig: (_) => de_OutputConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_StoppingCondition(_, context),
        VpcConfig: (_) => de_NeoVpcConfig(_, context),
    });
};
const de_DescribeComputeQuotaResponse = (output, context) => {
    return take(output, {
        ActivationState: __expectString,
        ClusterArn: __expectString,
        ComputeQuotaArn: __expectString,
        ComputeQuotaConfig: (_) => de_ComputeQuotaConfig(_, context),
        ComputeQuotaId: __expectString,
        ComputeQuotaTarget: (_) => de_ComputeQuotaTarget(_, context),
        ComputeQuotaVersion: __expectInt32,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        FailureReason: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        Status: __expectString,
    });
};
const de_DescribeContextResponse = (output, context) => {
    return take(output, {
        ContextArn: __expectString,
        ContextName: __expectString,
        ContextType: __expectString,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        Properties: (_) => de_LineageEntityParameters(_, context),
        Source: (_) => de_ContextSource(_, context),
    });
};
const de_DescribeDataQualityJobDefinitionResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataQualityAppSpecification: (_) => de_DataQualityAppSpecification(_, context),
        DataQualityBaselineConfig: (_) => de_DataQualityBaselineConfig(_, context),
        DataQualityJobInput: (_) => de_DataQualityJobInput(_, context),
        DataQualityJobOutputConfig: (_) => de_MonitoringOutputConfig(_, context),
        JobDefinitionArn: __expectString,
        JobDefinitionName: __expectString,
        JobResources: (_) => de_MonitoringResources(_, context),
        NetworkConfig: (_) => de_MonitoringNetworkConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_MonitoringStoppingCondition(_, context),
    });
};
const de_DescribeDeviceFleetResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DeviceFleetArn: __expectString,
        DeviceFleetName: __expectString,
        IotRoleAlias: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OutputConfig: (_) => de_EdgeOutputConfig(_, context),
        RoleArn: __expectString,
    });
};
const de_DescribeDeviceResponse = (output, context) => {
    return take(output, {
        AgentVersion: __expectString,
        Description: __expectString,
        DeviceArn: __expectString,
        DeviceFleetName: __expectString,
        DeviceName: __expectString,
        IotThingName: __expectString,
        LatestHeartbeat: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MaxModels: __expectInt32,
        Models: (_) => de_EdgeModels(_, context),
        NextToken: __expectString,
        RegistrationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeDomainResponse = (output, context) => {
    return take(output, {
        AppNetworkAccessType: __expectString,
        AppSecurityGroupManagement: __expectString,
        AuthMode: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DefaultSpaceSettings: (_) => de_DefaultSpaceSettings(_, context),
        DefaultUserSettings: (_) => de_UserSettings(_, context),
        DomainArn: __expectString,
        DomainId: __expectString,
        DomainName: __expectString,
        DomainSettings: (_) => de_DomainSettings(_, context),
        FailureReason: __expectString,
        HomeEfsFileSystemId: __expectString,
        HomeEfsFileSystemKmsKeyId: __expectString,
        KmsKeyId: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SecurityGroupIdForDomainBoundary: __expectString,
        SingleSignOnApplicationArn: __expectString,
        SingleSignOnManagedApplicationInstanceId: __expectString,
        Status: __expectString,
        SubnetIds: (_) => de_Subnets(_, context),
        TagPropagation: __expectString,
        Url: __expectString,
        VpcId: __expectString,
    });
};
const de_DescribeEdgeDeploymentPlanResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeviceFleetName: __expectString,
        EdgeDeploymentFailed: __expectInt32,
        EdgeDeploymentPending: __expectInt32,
        EdgeDeploymentPlanArn: __expectString,
        EdgeDeploymentPlanName: __expectString,
        EdgeDeploymentSuccess: __expectInt32,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelConfigs: (_) => de_EdgeDeploymentModelConfigs(_, context),
        NextToken: __expectString,
        Stages: (_) => de_DeploymentStageStatusSummaries(_, context),
    });
};
const de_DescribeEdgePackagingJobResponse = (output, context) => {
    return take(output, {
        CompilationJobName: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EdgePackagingJobArn: __expectString,
        EdgePackagingJobName: __expectString,
        EdgePackagingJobStatus: __expectString,
        EdgePackagingJobStatusMessage: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelArtifact: __expectString,
        ModelName: __expectString,
        ModelSignature: __expectString,
        ModelVersion: __expectString,
        OutputConfig: (_) => de_EdgeOutputConfig(_, context),
        PresetDeploymentOutput: (_) => de_EdgePresetDeploymentOutput(_, context),
        ResourceKey: __expectString,
        RoleArn: __expectString,
    });
};
const de_DescribeEndpointConfigOutput = (output, context) => {
    return take(output, {
        AsyncInferenceConfig: (_) => de_AsyncInferenceConfig(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataCaptureConfig: (_) => de_DataCaptureConfig(_, context),
        EnableNetworkIsolation: __expectBoolean,
        EndpointConfigArn: __expectString,
        EndpointConfigName: __expectString,
        ExecutionRoleArn: __expectString,
        ExplainerConfig: (_) => de_ExplainerConfig(_, context),
        KmsKeyId: __expectString,
        ProductionVariants: (_) => de_ProductionVariantList(_, context),
        ShadowProductionVariants: (_) => de_ProductionVariantList(_, context),
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_DescribeEndpointOutput = (output, context) => {
    return take(output, {
        AsyncInferenceConfig: (_) => de_AsyncInferenceConfig(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataCaptureConfig: (_) => de_DataCaptureConfigSummary(_, context),
        EndpointArn: __expectString,
        EndpointConfigName: __expectString,
        EndpointName: __expectString,
        EndpointStatus: __expectString,
        ExplainerConfig: (_) => de_ExplainerConfig(_, context),
        FailureReason: __expectString,
        LastDeploymentConfig: (_) => de_DeploymentConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        PendingDeploymentSummary: (_) => de_PendingDeploymentSummary(_, context),
        ProductionVariants: (_) => de_ProductionVariantSummaryList(_, context),
        ShadowProductionVariants: (_) => de_ProductionVariantSummaryList(_, context),
    });
};
const de_DescribeExperimentResponse = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DisplayName: __expectString,
        ExperimentArn: __expectString,
        ExperimentName: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Source: (_) => de_ExperimentSource(_, context),
    });
};
const de_DescribeFeatureGroupResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        EventTimeFeatureName: __expectString,
        FailureReason: __expectString,
        FeatureDefinitions: (_) => de_FeatureDefinitions(_, context),
        FeatureGroupArn: __expectString,
        FeatureGroupName: __expectString,
        FeatureGroupStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastUpdateStatus: (_) => de_LastUpdateStatus(_, context),
        NextToken: __expectString,
        OfflineStoreConfig: (_) => de_OfflineStoreConfig(_, context),
        OfflineStoreStatus: (_) => de_OfflineStoreStatus(_, context),
        OnlineStoreConfig: (_) => de_OnlineStoreConfig(_, context),
        OnlineStoreTotalSizeBytes: __expectLong,
        RecordIdentifierFeatureName: __expectString,
        RoleArn: __expectString,
        ThroughputConfig: (_) => de_ThroughputConfigDescription(_, context),
    });
};
const de_DescribeFeatureMetadataResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        FeatureGroupArn: __expectString,
        FeatureGroupName: __expectString,
        FeatureName: __expectString,
        FeatureType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Parameters: (_) => de_FeatureParameters(_, context),
    });
};
const de_DescribeFlowDefinitionResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        FlowDefinitionArn: __expectString,
        FlowDefinitionName: __expectString,
        FlowDefinitionStatus: __expectString,
        HumanLoopActivationConfig: (_) => de_HumanLoopActivationConfig(_, context),
        HumanLoopConfig: (_) => de_HumanLoopConfig(_, context),
        HumanLoopRequestSource: (_) => de_HumanLoopRequestSource(_, context),
        OutputConfig: (_) => de_FlowDefinitionOutputConfig(_, context),
        RoleArn: __expectString,
    });
};
const de_DescribeHubContentResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DocumentSchemaVersion: __expectString,
        FailureReason: __expectString,
        HubArn: __expectString,
        HubContentArn: __expectString,
        HubContentDependencies: (_) => de_HubContentDependencyList(_, context),
        HubContentDescription: __expectString,
        HubContentDisplayName: __expectString,
        HubContentDocument: __expectString,
        HubContentMarkdown: __expectString,
        HubContentName: __expectString,
        HubContentSearchKeywords: (_) => de_HubContentSearchKeywordList(_, context),
        HubContentStatus: __expectString,
        HubContentType: __expectString,
        HubContentVersion: __expectString,
        HubName: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ReferenceMinVersion: __expectString,
        SageMakerPublicHubContentArn: __expectString,
        SupportStatus: __expectString,
    });
};
const de_DescribeHubResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        HubArn: __expectString,
        HubDescription: __expectString,
        HubDisplayName: __expectString,
        HubName: __expectString,
        HubSearchKeywords: (_) => de_HubSearchKeywordList(_, context),
        HubStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        S3StorageConfig: (_) => de_HubS3StorageConfig(_, context),
    });
};
const de_DescribeHumanTaskUiResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HumanTaskUiArn: __expectString,
        HumanTaskUiName: __expectString,
        HumanTaskUiStatus: __expectString,
        UiTemplate: (_) => de_UiTemplateInfo(_, context),
    });
};
const de_DescribeHyperParameterTuningJobResponse = (output, context) => {
    return take(output, {
        Autotune: (_) => de_Autotune(_, context),
        BestTrainingJob: (_) => de_HyperParameterTrainingJobSummary(_, context),
        ConsumedResources: (_) => de_HyperParameterTuningJobConsumedResources(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        HyperParameterTuningEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HyperParameterTuningJobArn: __expectString,
        HyperParameterTuningJobConfig: (_) => de_HyperParameterTuningJobConfig(_, context),
        HyperParameterTuningJobName: __expectString,
        HyperParameterTuningJobStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ObjectiveStatusCounters: (_) => de_ObjectiveStatusCounters(_, context),
        OverallBestTrainingJob: (_) => de_HyperParameterTrainingJobSummary(_, context),
        TrainingJobDefinition: (_) => de_HyperParameterTrainingJobDefinition(_, context),
        TrainingJobDefinitions: (_) => de_HyperParameterTrainingJobDefinitions(_, context),
        TrainingJobStatusCounters: (_) => de_TrainingJobStatusCounters(_, context),
        TuningJobCompletionDetails: (_) => de_HyperParameterTuningJobCompletionDetails(_, context),
        WarmStartConfig: (_) => de_HyperParameterTuningJobWarmStartConfig(_, context),
    });
};
const de_DescribeImageResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DisplayName: __expectString,
        FailureReason: __expectString,
        ImageArn: __expectString,
        ImageName: __expectString,
        ImageStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RoleArn: __expectString,
    });
};
const de_DescribeImageVersionResponse = (output, context) => {
    return take(output, {
        BaseImage: __expectString,
        ContainerImage: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        Horovod: __expectBoolean,
        ImageArn: __expectString,
        ImageVersionArn: __expectString,
        ImageVersionStatus: __expectString,
        JobType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MLFramework: __expectString,
        Processor: __expectString,
        ProgrammingLang: __expectString,
        ReleaseNotes: __expectString,
        VendorGuidance: __expectString,
        Version: __expectInt32,
    });
};
const de_DescribeInferenceComponentOutput = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointArn: __expectString,
        EndpointName: __expectString,
        FailureReason: __expectString,
        InferenceComponentArn: __expectString,
        InferenceComponentName: __expectString,
        InferenceComponentStatus: __expectString,
        LastDeploymentConfig: (_) => de_InferenceComponentDeploymentConfig(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RuntimeConfig: (_) => de_InferenceComponentRuntimeConfigSummary(_, context),
        Specification: (_) => de_InferenceComponentSpecificationSummary(_, context),
        VariantName: __expectString,
    });
};
const de_DescribeInferenceExperimentResponse = (output, context) => {
    return take(output, {
        Arn: __expectString,
        CompletionTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataStorageConfig: (_) => de_InferenceExperimentDataStorageConfig(_, context),
        Description: __expectString,
        EndpointMetadata: (_) => de_EndpointMetadata(_, context),
        KmsKey: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelVariants: (_) => de_ModelVariantConfigSummaryList(_, context),
        Name: __expectString,
        RoleArn: __expectString,
        Schedule: (_) => de_InferenceExperimentSchedule(_, context),
        ShadowModeConfig: (_) => de_ShadowModeConfig(_, context),
        Status: __expectString,
        StatusReason: __expectString,
        Type: __expectString,
    });
};
const de_DescribeInferenceRecommendationsJobResponse = (output, context) => {
    return take(output, {
        CompletionTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointPerformances: (_) => de_EndpointPerformances(_, context),
        FailureReason: __expectString,
        InferenceRecommendations: (_) => de_InferenceRecommendations(_, context),
        InputConfig: (_) => de_RecommendationJobInputConfig(_, context),
        JobArn: __expectString,
        JobDescription: __expectString,
        JobName: __expectString,
        JobType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RoleArn: __expectString,
        Status: __expectString,
        StoppingConditions: (_) => de_RecommendationJobStoppingConditions(_, context),
    });
};
const de_DescribeLabelingJobResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        HumanTaskConfig: (_) => de_HumanTaskConfig(_, context),
        InputConfig: (_) => de_LabelingJobInputConfig(_, context),
        JobReferenceCode: __expectString,
        LabelAttributeName: __expectString,
        LabelCategoryConfigS3Uri: __expectString,
        LabelCounters: (_) => de_LabelCounters(_, context),
        LabelingJobAlgorithmsConfig: (_) => de_LabelingJobAlgorithmsConfig(_, context),
        LabelingJobArn: __expectString,
        LabelingJobName: __expectString,
        LabelingJobOutput: (_) => de_LabelingJobOutput(_, context),
        LabelingJobStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OutputConfig: (_) => de_LabelingJobOutputConfig(_, context),
        RoleArn: __expectString,
        StoppingConditions: (_) => de_LabelingJobStoppingConditions(_, context),
        Tags: (_) => de_TagList(_, context),
    });
};
const de_DescribeLineageGroupResponse = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DisplayName: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        LineageGroupName: __expectString,
    });
};
const de_DescribeMlflowTrackingServerResponse = (output, context) => {
    return take(output, {
        ArtifactStoreUri: __expectString,
        AutomaticModelRegistration: __expectBoolean,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        IsActive: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MlflowVersion: __expectString,
        RoleArn: __expectString,
        TrackingServerArn: __expectString,
        TrackingServerName: __expectString,
        TrackingServerSize: __expectString,
        TrackingServerStatus: __expectString,
        TrackingServerUrl: __expectString,
        WeeklyMaintenanceWindowStart: __expectString,
    });
};
const de_DescribeModelBiasJobDefinitionResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        JobDefinitionArn: __expectString,
        JobDefinitionName: __expectString,
        JobResources: (_) => de_MonitoringResources(_, context),
        ModelBiasAppSpecification: (_) => de_ModelBiasAppSpecification(_, context),
        ModelBiasBaselineConfig: (_) => de_ModelBiasBaselineConfig(_, context),
        ModelBiasJobInput: (_) => de_ModelBiasJobInput(_, context),
        ModelBiasJobOutputConfig: (_) => de_MonitoringOutputConfig(_, context),
        NetworkConfig: (_) => de_MonitoringNetworkConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_MonitoringStoppingCondition(_, context),
    });
};
const de_DescribeModelCardExportJobResponse = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ExportArtifacts: (_) => de_ModelCardExportArtifacts(_, context),
        FailureReason: __expectString,
        LastModifiedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardExportJobArn: __expectString,
        ModelCardExportJobName: __expectString,
        ModelCardName: __expectString,
        ModelCardVersion: __expectInt32,
        OutputConfig: (_) => de_ModelCardExportOutputConfig(_, context),
        Status: __expectString,
    });
};
const de_DescribeModelCardResponse = (output, context) => {
    return take(output, {
        Content: __expectString,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardArn: __expectString,
        ModelCardName: __expectString,
        ModelCardProcessingStatus: __expectString,
        ModelCardStatus: __expectString,
        ModelCardVersion: __expectInt32,
        SecurityConfig: (_) => de_ModelCardSecurityConfig(_, context),
    });
};
const de_DescribeModelExplainabilityJobDefinitionResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        JobDefinitionArn: __expectString,
        JobDefinitionName: __expectString,
        JobResources: (_) => de_MonitoringResources(_, context),
        ModelExplainabilityAppSpecification: (_) => de_ModelExplainabilityAppSpecification(_, context),
        ModelExplainabilityBaselineConfig: (_) => de_ModelExplainabilityBaselineConfig(_, context),
        ModelExplainabilityJobInput: (_) => de_ModelExplainabilityJobInput(_, context),
        ModelExplainabilityJobOutputConfig: (_) => de_MonitoringOutputConfig(_, context),
        NetworkConfig: (_) => de_MonitoringNetworkConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_MonitoringStoppingCondition(_, context),
    });
};
const de_DescribeModelOutput = (output, context) => {
    return take(output, {
        Containers: (_) => de_ContainerDefinitionList(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeploymentRecommendation: (_) => de_DeploymentRecommendation(_, context),
        EnableNetworkIsolation: __expectBoolean,
        ExecutionRoleArn: __expectString,
        InferenceExecutionConfig: (_) => de_InferenceExecutionConfig(_, context),
        ModelArn: __expectString,
        ModelName: __expectString,
        PrimaryContainer: (_) => de_ContainerDefinition(_, context),
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_DescribeModelPackageGroupOutput = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelPackageGroupArn: __expectString,
        ModelPackageGroupDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageGroupStatus: __expectString,
    });
};
const de_DescribeModelPackageOutput = (output, context) => {
    return take(output, {
        AdditionalInferenceSpecifications: (_) => de_AdditionalInferenceSpecifications(_, context),
        ApprovalDescription: __expectString,
        CertifyForMarketplace: __expectBoolean,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CustomerMetadataProperties: (_) => de_CustomerMetadataMap(_, context),
        Domain: __expectString,
        DriftCheckBaselines: (_) => de_DriftCheckBaselines(_, context),
        InferenceSpecification: (_) => de_InferenceSpecification(_, context),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        ModelApprovalStatus: __expectString,
        ModelCard: (_) => de_ModelPackageModelCard(_, context),
        ModelLifeCycle: (_) => de_ModelLifeCycle(_, context),
        ModelMetrics: (_) => de_ModelMetrics(_, context),
        ModelPackageArn: __expectString,
        ModelPackageDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageName: __expectString,
        ModelPackageStatus: __expectString,
        ModelPackageStatusDetails: (_) => de_ModelPackageStatusDetails(_, context),
        ModelPackageVersion: __expectInt32,
        SamplePayloadUrl: __expectString,
        SecurityConfig: (_) => de_ModelPackageSecurityConfig(_, context),
        SkipModelValidation: __expectString,
        SourceAlgorithmSpecification: (_) => de_SourceAlgorithmSpecification(_, context),
        SourceUri: __expectString,
        Task: __expectString,
        ValidationSpecification: (_) => de_ModelPackageValidationSpecification(_, context),
    });
};
const de_DescribeModelQualityJobDefinitionResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        JobDefinitionArn: __expectString,
        JobDefinitionName: __expectString,
        JobResources: (_) => de_MonitoringResources(_, context),
        ModelQualityAppSpecification: (_) => de_ModelQualityAppSpecification(_, context),
        ModelQualityBaselineConfig: (_) => de_ModelQualityBaselineConfig(_, context),
        ModelQualityJobInput: (_) => de_ModelQualityJobInput(_, context),
        ModelQualityJobOutputConfig: (_) => de_MonitoringOutputConfig(_, context),
        NetworkConfig: (_) => de_MonitoringNetworkConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_MonitoringStoppingCondition(_, context),
    });
};
const de_DescribeMonitoringScheduleResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointName: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastMonitoringExecutionSummary: (_) => de_MonitoringExecutionSummary(_, context),
        MonitoringScheduleArn: __expectString,
        MonitoringScheduleConfig: (_) => de_MonitoringScheduleConfig(_, context),
        MonitoringScheduleName: __expectString,
        MonitoringScheduleStatus: __expectString,
        MonitoringType: __expectString,
    });
};
const de_DescribeNotebookInstanceLifecycleConfigOutput = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        NotebookInstanceLifecycleConfigArn: __expectString,
        NotebookInstanceLifecycleConfigName: __expectString,
        OnCreate: (_) => de_NotebookInstanceLifecycleConfigList(_, context),
        OnStart: (_) => de_NotebookInstanceLifecycleConfigList(_, context),
    });
};
const de_DescribeNotebookInstanceOutput = (output, context) => {
    return take(output, {
        AcceleratorTypes: (_) => de_NotebookInstanceAcceleratorTypes(_, context),
        AdditionalCodeRepositories: (_) => de_AdditionalCodeRepositoryNamesOrUrls(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DefaultCodeRepository: __expectString,
        DirectInternetAccess: __expectString,
        FailureReason: __expectString,
        InstanceMetadataServiceConfiguration: (_) => de_InstanceMetadataServiceConfiguration(_, context),
        InstanceType: __expectString,
        KmsKeyId: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        NetworkInterfaceId: __expectString,
        NotebookInstanceArn: __expectString,
        NotebookInstanceLifecycleConfigName: __expectString,
        NotebookInstanceName: __expectString,
        NotebookInstanceStatus: __expectString,
        PlatformIdentifier: __expectString,
        RoleArn: __expectString,
        RootAccess: __expectString,
        SecurityGroups: (_) => de_SecurityGroupIds(_, context),
        SubnetId: __expectString,
        Url: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_DescribeOptimizationJobResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeploymentInstanceType: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelSource: (_) => de_OptimizationJobModelSource(_, context),
        OptimizationConfigs: (_) => de_OptimizationConfigs(_, context),
        OptimizationEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OptimizationEnvironment: (_) => de_OptimizationJobEnvironmentVariables(_, context),
        OptimizationJobArn: __expectString,
        OptimizationJobName: __expectString,
        OptimizationJobStatus: __expectString,
        OptimizationOutput: (_) => de_OptimizationOutput(_, context),
        OptimizationStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OutputConfig: (_) => de_OptimizationJobOutputConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_StoppingCondition(_, context),
        VpcConfig: (_) => de_OptimizationVpcConfig(_, context),
    });
};
const de_DescribePartnerAppResponse = (output, context) => {
    return take(output, {
        ApplicationConfig: (_) => de_PartnerAppConfig(_, context),
        Arn: __expectString,
        AuthType: __expectString,
        BaseUrl: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EnableIamSessionBasedIdentity: __expectBoolean,
        Error: (_) => de_ErrorInfo(_, context),
        ExecutionRoleArn: __expectString,
        KmsKeyId: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MaintenanceConfig: (_) => de_PartnerAppMaintenanceConfig(_, context),
        Name: __expectString,
        Status: __expectString,
        Tier: __expectString,
        Type: __expectString,
        Version: __expectString,
    });
};
const de_DescribePipelineDefinitionForExecutionResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        PipelineDefinition: __expectString,
    });
};
const de_DescribePipelineExecutionResponse = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ParallelismConfiguration: (_) => de_ParallelismConfiguration(_, context),
        PipelineArn: __expectString,
        PipelineExecutionArn: __expectString,
        PipelineExecutionDescription: __expectString,
        PipelineExecutionDisplayName: __expectString,
        PipelineExecutionStatus: __expectString,
        PipelineExperimentConfig: (_) => de_PipelineExperimentConfig(_, context),
        SelectiveExecutionConfig: (_) => de_SelectiveExecutionConfig(_, context),
    });
};
const de_DescribePipelineResponse = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastRunTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ParallelismConfiguration: (_) => de_ParallelismConfiguration(_, context),
        PipelineArn: __expectString,
        PipelineDefinition: __expectString,
        PipelineDescription: __expectString,
        PipelineDisplayName: __expectString,
        PipelineName: __expectString,
        PipelineStatus: __expectString,
        RoleArn: __expectString,
    });
};
const de_DescribeProcessingJobResponse = (output, context) => {
    return take(output, {
        AppSpecification: (_) => de_AppSpecification(_, context),
        AutoMLJobArn: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Environment: (_) => de_ProcessingEnvironmentMap(_, context),
        ExitMessage: __expectString,
        ExperimentConfig: (_) => de_ExperimentConfig(_, context),
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringScheduleArn: __expectString,
        NetworkConfig: (_) => de_NetworkConfig(_, context),
        ProcessingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProcessingInputs: (_) => de_ProcessingInputs(_, context),
        ProcessingJobArn: __expectString,
        ProcessingJobName: __expectString,
        ProcessingJobStatus: __expectString,
        ProcessingOutputConfig: (_) => de_ProcessingOutputConfig(_, context),
        ProcessingResources: (_) => de_ProcessingResources(_, context),
        ProcessingStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_ProcessingStoppingCondition(_, context),
        TrainingJobArn: __expectString,
    });
};
const de_DescribeProjectOutput = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProjectArn: __expectString,
        ProjectDescription: __expectString,
        ProjectId: __expectString,
        ProjectName: __expectString,
        ProjectStatus: __expectString,
        ServiceCatalogProvisionedProductDetails: (_) => de_ServiceCatalogProvisionedProductDetails(_, context),
        ServiceCatalogProvisioningDetails: (_) => de_ServiceCatalogProvisioningDetails(_, context),
    });
};
const de_DescribeSpaceResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainId: __expectString,
        FailureReason: __expectString,
        HomeEfsFileSystemUid: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OwnershipSettings: (_) => de_OwnershipSettings(_, context),
        SpaceArn: __expectString,
        SpaceDisplayName: __expectString,
        SpaceName: __expectString,
        SpaceSettings: (_) => de_SpaceSettings(_, context),
        SpaceSharingSettings: (_) => de_SpaceSharingSettings(_, context),
        Status: __expectString,
        Url: __expectString,
    });
};
const de_DescribeStudioLifecycleConfigResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StudioLifecycleConfigAppType: __expectString,
        StudioLifecycleConfigArn: __expectString,
        StudioLifecycleConfigContent: __expectString,
        StudioLifecycleConfigName: __expectString,
    });
};
const de_DescribeSubscribedWorkteamResponse = (output, context) => {
    return take(output, {
        SubscribedWorkteam: (_) => de_SubscribedWorkteam(_, context),
    });
};
const de_DescribeTrainingJobResponse = (output, context) => {
    return take(output, {
        AlgorithmSpecification: (_) => de_AlgorithmSpecification(_, context),
        AutoMLJobArn: __expectString,
        BillableTimeInSeconds: __expectInt32,
        CheckpointConfig: (_) => de_CheckpointConfig(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DebugHookConfig: (_) => de_DebugHookConfig(_, context),
        DebugRuleConfigurations: (_) => de_DebugRuleConfigurations(_, context),
        DebugRuleEvaluationStatuses: (_) => de_DebugRuleEvaluationStatuses(_, context),
        EnableInterContainerTrafficEncryption: __expectBoolean,
        EnableManagedSpotTraining: __expectBoolean,
        EnableNetworkIsolation: __expectBoolean,
        Environment: (_) => de_TrainingEnvironmentMap(_, context),
        ExperimentConfig: (_) => de_ExperimentConfig(_, context),
        FailureReason: __expectString,
        FinalMetricDataList: (_) => de_FinalMetricDataList(_, context),
        HyperParameters: (_) => de_HyperParameters(_, context),
        InfraCheckConfig: (_) => de_InfraCheckConfig(_, context),
        InputDataConfig: (_) => de_InputDataConfig(_, context),
        LabelingJobArn: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelArtifacts: (_) => de_ModelArtifacts(_, context),
        OutputDataConfig: (_) => de_OutputDataConfig(_, context),
        ProfilerConfig: (_) => de_ProfilerConfig(_, context),
        ProfilerRuleConfigurations: (_) => de_ProfilerRuleConfigurations(_, context),
        ProfilerRuleEvaluationStatuses: (_) => de_ProfilerRuleEvaluationStatuses(_, context),
        ProfilingStatus: __expectString,
        RemoteDebugConfig: (_) => de_RemoteDebugConfig(_, context),
        ResourceConfig: (_) => de_ResourceConfig(_, context),
        RetryStrategy: (_) => de_RetryStrategy(_, context),
        RoleArn: __expectString,
        SecondaryStatus: __expectString,
        SecondaryStatusTransitions: (_) => de_SecondaryStatusTransitions(_, context),
        StoppingCondition: (_) => de_StoppingCondition(_, context),
        TensorBoardOutputConfig: (_) => de_TensorBoardOutputConfig(_, context),
        TrainingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingJobArn: __expectString,
        TrainingJobName: __expectString,
        TrainingJobStatus: __expectString,
        TrainingStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingTimeInSeconds: __expectInt32,
        TuningJobArn: __expectString,
        VpcConfig: (_) => de_VpcConfig(_, context),
        WarmPoolStatus: (_) => de_WarmPoolStatus(_, context),
    });
};
const de_DescribeTrainingPlanResponse = (output, context) => {
    return take(output, {
        AvailableInstanceCount: __expectInt32,
        CurrencyCode: __expectString,
        DurationHours: __expectLong,
        DurationMinutes: __expectLong,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InUseInstanceCount: __expectInt32,
        ReservedCapacitySummaries: (_) => de_ReservedCapacitySummaries(_, context),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        StatusMessage: __expectString,
        TargetResources: (_) => de_SageMakerResourceNames(_, context),
        TotalInstanceCount: __expectInt32,
        TrainingPlanArn: __expectString,
        TrainingPlanName: __expectString,
        UpfrontFee: __expectString,
    });
};
const de_DescribeTransformJobResponse = (output, context) => {
    return take(output, {
        AutoMLJobArn: __expectString,
        BatchStrategy: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataCaptureConfig: (_) => de_BatchDataCaptureConfig(_, context),
        DataProcessing: (_) => de_DataProcessing(_, context),
        Environment: (_) => de_TransformEnvironmentMap(_, context),
        ExperimentConfig: (_) => de_ExperimentConfig(_, context),
        FailureReason: __expectString,
        LabelingJobArn: __expectString,
        MaxConcurrentTransforms: __expectInt32,
        MaxPayloadInMB: __expectInt32,
        ModelClientConfig: (_) => de_ModelClientConfig(_, context),
        ModelName: __expectString,
        TransformEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TransformInput: (_) => de_TransformInput(_, context),
        TransformJobArn: __expectString,
        TransformJobName: __expectString,
        TransformJobStatus: __expectString,
        TransformOutput: (_) => de_TransformOutput(_, context),
        TransformResources: (_) => de_TransformResources(_, context),
        TransformStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DescribeTrialComponentResponse = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InputArtifacts: (_) => de_TrialComponentArtifacts(_, context),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        Metrics: (_) => de_TrialComponentMetricSummaries(_, context),
        OutputArtifacts: (_) => de_TrialComponentArtifacts(_, context),
        Parameters: (_) => de_TrialComponentParameters(_, context),
        Source: (_) => de_TrialComponentSource(_, context),
        Sources: (_) => de_TrialComponentSources(_, context),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: (_) => de_TrialComponentStatus(_, context),
        TrialComponentArn: __expectString,
        TrialComponentName: __expectString,
    });
};
const de_DescribeTrialResponse = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        ExperimentName: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        Source: (_) => de_TrialSource(_, context),
        TrialArn: __expectString,
        TrialName: __expectString,
    });
};
const de_DescribeUserProfileResponse = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainId: __expectString,
        FailureReason: __expectString,
        HomeEfsFileSystemUid: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SingleSignOnUserIdentifier: __expectString,
        SingleSignOnUserValue: __expectString,
        Status: __expectString,
        UserProfileArn: __expectString,
        UserProfileName: __expectString,
        UserSettings: (_) => de_UserSettings(_, context),
    });
};
const de_DescribeWorkforceResponse = (output, context) => {
    return take(output, {
        Workforce: (_) => de_Workforce(_, context),
    });
};
const de_DescribeWorkteamResponse = (output, context) => {
    return take(output, {
        Workteam: (_) => de_Workteam(_, context),
    });
};
const de_DeviceDeploymentSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeviceDeploymentSummary(entry, context);
    });
    return retVal;
};
const de_DeviceDeploymentSummary = (output, context) => {
    return take(output, {
        DeployedStageName: __expectString,
        DeploymentStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DeviceArn: __expectString,
        DeviceDeploymentStatus: __expectString,
        DeviceDeploymentStatusMessage: __expectString,
        DeviceFleetName: __expectString,
        DeviceName: __expectString,
        EdgeDeploymentPlanArn: __expectString,
        EdgeDeploymentPlanName: __expectString,
        StageName: __expectString,
    });
};
const de_DeviceFleetSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeviceFleetSummary(entry, context);
    });
    return retVal;
};
const de_DeviceFleetSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeviceFleetArn: __expectString,
        DeviceFleetName: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DeviceNames = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_DeviceSelectionConfig = (output, context) => {
    return take(output, {
        DeviceNameContains: __expectString,
        DeviceNames: (_) => de_DeviceNames(_, context),
        DeviceSubsetType: __expectString,
        Percentage: __expectInt32,
    });
};
const de_DeviceStats = (output, context) => {
    return take(output, {
        ConnectedDeviceCount: __expectLong,
        RegisteredDeviceCount: __expectLong,
    });
};
const de_DeviceSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DeviceSummary(entry, context);
    });
    return retVal;
};
const de_DeviceSummary = (output, context) => {
    return take(output, {
        AgentVersion: __expectString,
        Description: __expectString,
        DeviceArn: __expectString,
        DeviceFleetName: __expectString,
        DeviceName: __expectString,
        IotThingName: __expectString,
        LatestHeartbeat: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Models: (_) => de_EdgeModelSummaries(_, context),
        RegistrationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_DirectDeploySettings = (output, context) => {
    return take(output, {
        Status: __expectString,
    });
};
const de_DisableSagemakerServicecatalogPortfolioOutput = (output, context) => {
    return take(output, {});
};
const de_DisassociateTrialComponentResponse = (output, context) => {
    return take(output, {
        TrialArn: __expectString,
        TrialComponentArn: __expectString,
    });
};
const de_DockerSettings = (output, context) => {
    return take(output, {
        EnableDockerAccess: __expectString,
        VpcOnlyTrustedAccounts: (_) => de_VpcOnlyTrustedAccounts(_, context),
    });
};
const de_DomainDetails = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainArn: __expectString,
        DomainId: __expectString,
        DomainName: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        Url: __expectString,
    });
};
const de_DomainList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_DomainDetails(entry, context);
    });
    return retVal;
};
const de_DomainSecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_DomainSettings = (output, context) => {
    return take(output, {
        AmazonQSettings: (_) => de_AmazonQSettings(_, context),
        DockerSettings: (_) => de_DockerSettings(_, context),
        ExecutionRoleIdentityConfig: __expectString,
        RStudioServerProDomainSettings: (_) => de_RStudioServerProDomainSettings(_, context),
        SecurityGroupIds: (_) => de_DomainSecurityGroupIds(_, context),
        UnifiedStudioSettings: (_) => de_UnifiedStudioSettings(_, context),
    });
};
const de_DriftCheckBaselines = (output, context) => {
    return take(output, {
        Bias: (_) => de_DriftCheckBias(_, context),
        Explainability: (_) => de_DriftCheckExplainability(_, context),
        ModelDataQuality: (_) => de_DriftCheckModelDataQuality(_, context),
        ModelQuality: (_) => de_DriftCheckModelQuality(_, context),
    });
};
const de_DriftCheckBias = (output, context) => {
    return take(output, {
        ConfigFile: (_) => de_FileSource(_, context),
        PostTrainingConstraints: (_) => de_MetricsSource(_, context),
        PreTrainingConstraints: (_) => de_MetricsSource(_, context),
    });
};
const de_DriftCheckExplainability = (output, context) => {
    return take(output, {
        ConfigFile: (_) => de_FileSource(_, context),
        Constraints: (_) => de_MetricsSource(_, context),
    });
};
const de_DriftCheckModelDataQuality = (output, context) => {
    return take(output, {
        Constraints: (_) => de_MetricsSource(_, context),
        Statistics: (_) => de_MetricsSource(_, context),
    });
};
const de_DriftCheckModelQuality = (output, context) => {
    return take(output, {
        Constraints: (_) => de_MetricsSource(_, context),
        Statistics: (_) => de_MetricsSource(_, context),
    });
};
const de_DynamicScalingConfiguration = (output, context) => {
    return take(output, {
        MaxCapacity: __expectInt32,
        MinCapacity: __expectInt32,
        ScaleInCooldown: __expectInt32,
        ScaleOutCooldown: __expectInt32,
        ScalingPolicies: (_) => de_ScalingPolicies(_, context),
    });
};
const de_EbsStorageSettings = (output, context) => {
    return take(output, {
        EbsVolumeSizeInGb: __expectInt32,
    });
};
const de_Edge = (output, context) => {
    return take(output, {
        AssociationType: __expectString,
        DestinationArn: __expectString,
        SourceArn: __expectString,
    });
};
const de_EdgeDeploymentConfig = (output, context) => {
    return take(output, {
        FailureHandlingPolicy: __expectString,
    });
};
const de_EdgeDeploymentModelConfig = (output, context) => {
    return take(output, {
        EdgePackagingJobName: __expectString,
        ModelHandle: __expectString,
    });
};
const de_EdgeDeploymentModelConfigs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EdgeDeploymentModelConfig(entry, context);
    });
    return retVal;
};
const de_EdgeDeploymentPlanSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EdgeDeploymentPlanSummary(entry, context);
    });
    return retVal;
};
const de_EdgeDeploymentPlanSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeviceFleetName: __expectString,
        EdgeDeploymentFailed: __expectInt32,
        EdgeDeploymentPending: __expectInt32,
        EdgeDeploymentPlanArn: __expectString,
        EdgeDeploymentPlanName: __expectString,
        EdgeDeploymentSuccess: __expectInt32,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_EdgeDeploymentStatus = (output, context) => {
    return take(output, {
        EdgeDeploymentFailedInStage: __expectInt32,
        EdgeDeploymentPendingInStage: __expectInt32,
        EdgeDeploymentStageStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EdgeDeploymentStatusMessage: __expectString,
        EdgeDeploymentSuccessInStage: __expectInt32,
        StageStatus: __expectString,
    });
};
const de_EdgeModel = (output, context) => {
    return take(output, {
        LatestInference: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LatestSampleTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelName: __expectString,
        ModelVersion: __expectString,
    });
};
const de_EdgeModels = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EdgeModel(entry, context);
    });
    return retVal;
};
const de_EdgeModelStat = (output, context) => {
    return take(output, {
        ActiveDeviceCount: __expectLong,
        ConnectedDeviceCount: __expectLong,
        ModelName: __expectString,
        ModelVersion: __expectString,
        OfflineDeviceCount: __expectLong,
        SamplingDeviceCount: __expectLong,
    });
};
const de_EdgeModelStats = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EdgeModelStat(entry, context);
    });
    return retVal;
};
const de_EdgeModelSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EdgeModelSummary(entry, context);
    });
    return retVal;
};
const de_EdgeModelSummary = (output, context) => {
    return take(output, {
        ModelName: __expectString,
        ModelVersion: __expectString,
    });
};
const de_EdgeOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        PresetDeploymentConfig: __expectString,
        PresetDeploymentType: __expectString,
        S3OutputLocation: __expectString,
    });
};
const de_EdgePackagingJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EdgePackagingJobSummary(entry, context);
    });
    return retVal;
};
const de_EdgePackagingJobSummary = (output, context) => {
    return take(output, {
        CompilationJobName: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EdgePackagingJobArn: __expectString,
        EdgePackagingJobName: __expectString,
        EdgePackagingJobStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelName: __expectString,
        ModelVersion: __expectString,
    });
};
const de_EdgePresetDeploymentOutput = (output, context) => {
    return take(output, {
        Artifact: __expectString,
        Status: __expectString,
        StatusMessage: __expectString,
        Type: __expectString,
    });
};
const de_Edges = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Edge(entry, context);
    });
    return retVal;
};
const de_EFSFileSystem = (output, context) => {
    return take(output, {
        FileSystemId: __expectString,
    });
};
const de_EFSFileSystemConfig = (output, context) => {
    return take(output, {
        FileSystemId: __expectString,
        FileSystemPath: __expectString,
    });
};
const de_EmrServerlessComputeConfig = (output, context) => {
    return take(output, {
        ExecutionRoleARN: __expectString,
    });
};
const de_EmrServerlessSettings = (output, context) => {
    return take(output, {
        ExecutionRoleArn: __expectString,
        Status: __expectString,
    });
};
const de_EmrSettings = (output, context) => {
    return take(output, {
        AssumableRoleArns: (_) => de_AssumableRoleArns(_, context),
        ExecutionRoleArns: (_) => de_ExecutionRoleArns(_, context),
    });
};
const de_EMRStepMetadata = (output, context) => {
    return take(output, {
        ClusterId: __expectString,
        LogFilePath: __expectString,
        StepId: __expectString,
        StepName: __expectString,
    });
};
const de_EnableSagemakerServicecatalogPortfolioOutput = (output, context) => {
    return take(output, {});
};
const de_Endpoint = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataCaptureConfig: (_) => de_DataCaptureConfigSummary(_, context),
        EndpointArn: __expectString,
        EndpointConfigName: __expectString,
        EndpointName: __expectString,
        EndpointStatus: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringSchedules: (_) => de_MonitoringScheduleList(_, context),
        ProductionVariants: (_) => de_ProductionVariantSummaryList(_, context),
        ShadowProductionVariants: (_) => de_ProductionVariantSummaryList(_, context),
        Tags: (_) => de_TagList(_, context),
    });
};
const de_EndpointConfigStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_EndpointConfigSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointConfigArn: __expectString,
        EndpointConfigName: __expectString,
    });
};
const de_EndpointConfigSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EndpointConfigSummary(entry, context);
    });
    return retVal;
};
const de_EndpointInfo = (output, context) => {
    return take(output, {
        EndpointName: __expectString,
    });
};
const de_EndpointInput = (output, context) => {
    return take(output, {
        EndTimeOffset: __expectString,
        EndpointName: __expectString,
        ExcludeFeaturesAttribute: __expectString,
        FeaturesAttribute: __expectString,
        InferenceAttribute: __expectString,
        LocalPath: __expectString,
        ProbabilityAttribute: __expectString,
        ProbabilityThresholdAttribute: __limitedParseDouble,
        S3DataDistributionType: __expectString,
        S3InputMode: __expectString,
        StartTimeOffset: __expectString,
    });
};
const de_EndpointInputConfiguration = (output, context) => {
    return take(output, {
        EnvironmentParameterRanges: (_) => de_EnvironmentParameterRanges(_, context),
        InferenceSpecificationName: __expectString,
        InstanceType: __expectString,
        ServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
    });
};
const de_EndpointInputConfigurations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EndpointInputConfiguration(entry, context);
    });
    return retVal;
};
const de_EndpointMetadata = (output, context) => {
    return take(output, {
        EndpointConfigName: __expectString,
        EndpointName: __expectString,
        EndpointStatus: __expectString,
        FailureReason: __expectString,
    });
};
const de_EndpointOutputConfiguration = (output, context) => {
    return take(output, {
        EndpointName: __expectString,
        InitialInstanceCount: __expectInt32,
        InstanceType: __expectString,
        ServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
        VariantName: __expectString,
    });
};
const de_EndpointPerformance = (output, context) => {
    return take(output, {
        EndpointInfo: (_) => de_EndpointInfo(_, context),
        Metrics: (_) => de_InferenceMetrics(_, context),
    });
};
const de_EndpointPerformances = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EndpointPerformance(entry, context);
    });
    return retVal;
};
const de_Endpoints = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EndpointInfo(entry, context);
    });
    return retVal;
};
const de_EndpointStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_EndpointSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointArn: __expectString,
        EndpointName: __expectString,
        EndpointStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_EndpointSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EndpointSummary(entry, context);
    });
    return retVal;
};
const de_EnvironmentMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_EnvironmentParameter = (output, context) => {
    return take(output, {
        Key: __expectString,
        Value: __expectString,
        ValueType: __expectString,
    });
};
const de_EnvironmentParameterRanges = (output, context) => {
    return take(output, {
        CategoricalParameterRanges: (_) => de_CategoricalParameters(_, context),
    });
};
const de_EnvironmentParameters = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_EnvironmentParameter(entry, context);
    });
    return retVal;
};
const de_ErrorInfo = (output, context) => {
    return take(output, {
        Code: __expectString,
        Reason: __expectString,
    });
};
const de_ExecutionRoleArns = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_Experiment = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DisplayName: __expectString,
        ExperimentArn: __expectString,
        ExperimentName: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Source: (_) => de_ExperimentSource(_, context),
        Tags: (_) => de_TagList(_, context),
    });
};
const de_ExperimentConfig = (output, context) => {
    return take(output, {
        ExperimentName: __expectString,
        RunName: __expectString,
        TrialComponentDisplayName: __expectString,
        TrialName: __expectString,
    });
};
const de_ExperimentSource = (output, context) => {
    return take(output, {
        SourceArn: __expectString,
        SourceType: __expectString,
    });
};
const de_ExperimentSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ExperimentSummary(entry, context);
    });
    return retVal;
};
const de_ExperimentSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        ExperimentArn: __expectString,
        ExperimentName: __expectString,
        ExperimentSource: (_) => de_ExperimentSource(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_Explainability = (output, context) => {
    return take(output, {
        Report: (_) => de_MetricsSource(_, context),
    });
};
const de_ExplainerConfig = (output, context) => {
    return take(output, {
        ClarifyExplainerConfig: (_) => de_ClarifyExplainerConfig(_, context),
    });
};
const de_FailStepMetadata = (output, context) => {
    return take(output, {
        ErrorMessage: __expectString,
    });
};
const de_FeatureDefinition = (output, context) => {
    return take(output, {
        CollectionConfig: (_) => de_CollectionConfig(__expectUnion(_), context),
        CollectionType: __expectString,
        FeatureName: __expectString,
        FeatureType: __expectString,
    });
};
const de_FeatureDefinitions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FeatureDefinition(entry, context);
    });
    return retVal;
};
const de_FeatureGroup = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        EventTimeFeatureName: __expectString,
        FailureReason: __expectString,
        FeatureDefinitions: (_) => de_FeatureDefinitions(_, context),
        FeatureGroupArn: __expectString,
        FeatureGroupName: __expectString,
        FeatureGroupStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastUpdateStatus: (_) => de_LastUpdateStatus(_, context),
        OfflineStoreConfig: (_) => de_OfflineStoreConfig(_, context),
        OfflineStoreStatus: (_) => de_OfflineStoreStatus(_, context),
        OnlineStoreConfig: (_) => de_OnlineStoreConfig(_, context),
        RecordIdentifierFeatureName: __expectString,
        RoleArn: __expectString,
        Tags: (_) => de_TagList(_, context),
    });
};
const de_FeatureGroupSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FeatureGroupSummary(entry, context);
    });
    return retVal;
};
const de_FeatureGroupSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FeatureGroupArn: __expectString,
        FeatureGroupName: __expectString,
        FeatureGroupStatus: __expectString,
        OfflineStoreStatus: (_) => de_OfflineStoreStatus(_, context),
    });
};
const de_FeatureMetadata = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        FeatureGroupArn: __expectString,
        FeatureGroupName: __expectString,
        FeatureName: __expectString,
        FeatureType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Parameters: (_) => de_FeatureParameters(_, context),
    });
};
const de_FeatureParameter = (output, context) => {
    return take(output, {
        Key: __expectString,
        Value: __expectString,
    });
};
const de_FeatureParameters = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FeatureParameter(entry, context);
    });
    return retVal;
};
const de_FileSource = (output, context) => {
    return take(output, {
        ContentDigest: __expectString,
        ContentType: __expectString,
        S3Uri: __expectString,
    });
};
const de_FileSystemConfig = (output, context) => {
    return take(output, {
        DefaultGid: __expectInt32,
        DefaultUid: __expectInt32,
        MountPath: __expectString,
    });
};
const de_FileSystemDataSource = (output, context) => {
    return take(output, {
        DirectoryPath: __expectString,
        FileSystemAccessMode: __expectString,
        FileSystemId: __expectString,
        FileSystemType: __expectString,
    });
};
const de_FillingTransformationMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_FillingTransformations = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_FillingTransformationMap(value, context);
        return acc;
    }, {});
};
const de_FinalAutoMLJobObjectiveMetric = (output, context) => {
    return take(output, {
        MetricName: __expectString,
        StandardMetricName: __expectString,
        Type: __expectString,
        Value: __limitedParseFloat32,
    });
};
const de_FinalHyperParameterTuningJobObjectiveMetric = (output, context) => {
    return take(output, {
        MetricName: __expectString,
        Type: __expectString,
        Value: __limitedParseFloat32,
    });
};
const de_FinalMetricDataList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MetricData(entry, context);
    });
    return retVal;
};
const de_FlowDefinitionOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_FlowDefinitionSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_FlowDefinitionSummary(entry, context);
    });
    return retVal;
};
const de_FlowDefinitionSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        FlowDefinitionArn: __expectString,
        FlowDefinitionName: __expectString,
        FlowDefinitionStatus: __expectString,
    });
};
const de_FlowDefinitionTaskKeywords = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ForecastQuantiles = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_FSxLustreFileSystem = (output, context) => {
    return take(output, {
        FileSystemId: __expectString,
    });
};
const de_FSxLustreFileSystemConfig = (output, context) => {
    return take(output, {
        FileSystemId: __expectString,
        FileSystemPath: __expectString,
    });
};
const de_GenerativeAiSettings = (output, context) => {
    return take(output, {
        AmazonBedrockRoleArn: __expectString,
    });
};
const de_GetDeviceFleetReportResponse = (output, context) => {
    return take(output, {
        AgentVersions: (_) => de_AgentVersions(_, context),
        Description: __expectString,
        DeviceFleetArn: __expectString,
        DeviceFleetName: __expectString,
        DeviceStats: (_) => de_DeviceStats(_, context),
        ModelStats: (_) => de_EdgeModelStats(_, context),
        OutputConfig: (_) => de_EdgeOutputConfig(_, context),
        ReportGenerated: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_GetLineageGroupPolicyResponse = (output, context) => {
    return take(output, {
        LineageGroupArn: __expectString,
        ResourcePolicy: __expectString,
    });
};
const de_GetModelPackageGroupPolicyOutput = (output, context) => {
    return take(output, {
        ResourcePolicy: __expectString,
    });
};
const de_GetSagemakerServicecatalogPortfolioStatusOutput = (output, context) => {
    return take(output, {
        Status: __expectString,
    });
};
const de_GetScalingConfigurationRecommendationResponse = (output, context) => {
    return take(output, {
        DynamicScalingConfiguration: (_) => de_DynamicScalingConfiguration(_, context),
        EndpointName: __expectString,
        InferenceRecommendationsJobName: __expectString,
        Metric: (_) => de_ScalingPolicyMetric(_, context),
        RecommendationId: __expectString,
        ScalingPolicyObjective: (_) => de_ScalingPolicyObjective(_, context),
        TargetCpuUtilizationPerCore: __expectInt32,
    });
};
const de_GetSearchSuggestionsResponse = (output, context) => {
    return take(output, {
        PropertyNameSuggestions: (_) => de_PropertyNameSuggestionList(_, context),
    });
};
const de_GitConfig = (output, context) => {
    return take(output, {
        Branch: __expectString,
        RepositoryUrl: __expectString,
        SecretArn: __expectString,
    });
};
const de_GroupingAttributeNames = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_Groups = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_HiddenAppTypesList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_HiddenInstanceTypesList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_HiddenMlToolsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_HiddenSageMakerImage = (output, context) => {
    return take(output, {
        SageMakerImageName: __expectString,
        VersionAliases: (_) => de_VersionAliasesList(_, context),
    });
};
const de_HiddenSageMakerImageVersionAliasesList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HiddenSageMakerImage(entry, context);
    });
    return retVal;
};
const de_HolidayConfig = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HolidayConfigAttributes(entry, context);
    });
    return retVal;
};
const de_HolidayConfigAttributes = (output, context) => {
    return take(output, {
        CountryCode: __expectString,
    });
};
const de_HookParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_HubAccessConfig = (output, context) => {
    return take(output, {
        HubContentArn: __expectString,
    });
};
const de_HubContentDependency = (output, context) => {
    return take(output, {
        DependencyCopyPath: __expectString,
        DependencyOriginPath: __expectString,
    });
};
const de_HubContentDependencyList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HubContentDependency(entry, context);
    });
    return retVal;
};
const de_HubContentInfo = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DocumentSchemaVersion: __expectString,
        HubContentArn: __expectString,
        HubContentDescription: __expectString,
        HubContentDisplayName: __expectString,
        HubContentName: __expectString,
        HubContentSearchKeywords: (_) => de_HubContentSearchKeywordList(_, context),
        HubContentStatus: __expectString,
        HubContentType: __expectString,
        HubContentVersion: __expectString,
        OriginalCreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SageMakerPublicHubContentArn: __expectString,
        SupportStatus: __expectString,
    });
};
const de_HubContentInfoList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HubContentInfo(entry, context);
    });
    return retVal;
};
const de_HubContentSearchKeywordList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_HubInfo = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HubArn: __expectString,
        HubDescription: __expectString,
        HubDisplayName: __expectString,
        HubName: __expectString,
        HubSearchKeywords: (_) => de_HubSearchKeywordList(_, context),
        HubStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_HubInfoList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HubInfo(entry, context);
    });
    return retVal;
};
const de_HubS3StorageConfig = (output, context) => {
    return take(output, {
        S3OutputPath: __expectString,
    });
};
const de_HubSearchKeywordList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_HumanLoopActivationConditionsConfig = (output, context) => {
    return take(output, {
        HumanLoopActivationConditions: __LazyJsonString.from,
    });
};
const de_HumanLoopActivationConfig = (output, context) => {
    return take(output, {
        HumanLoopActivationConditionsConfig: (_) => de_HumanLoopActivationConditionsConfig(_, context),
    });
};
const de_HumanLoopConfig = (output, context) => {
    return take(output, {
        HumanTaskUiArn: __expectString,
        PublicWorkforceTaskPrice: (_) => de_PublicWorkforceTaskPrice(_, context),
        TaskAvailabilityLifetimeInSeconds: __expectInt32,
        TaskCount: __expectInt32,
        TaskDescription: __expectString,
        TaskKeywords: (_) => de_FlowDefinitionTaskKeywords(_, context),
        TaskTimeLimitInSeconds: __expectInt32,
        TaskTitle: __expectString,
        WorkteamArn: __expectString,
    });
};
const de_HumanLoopRequestSource = (output, context) => {
    return take(output, {
        AwsManagedHumanLoopRequestSource: __expectString,
    });
};
const de_HumanTaskConfig = (output, context) => {
    return take(output, {
        AnnotationConsolidationConfig: (_) => de_AnnotationConsolidationConfig(_, context),
        MaxConcurrentTaskCount: __expectInt32,
        NumberOfHumanWorkersPerDataObject: __expectInt32,
        PreHumanTaskLambdaArn: __expectString,
        PublicWorkforceTaskPrice: (_) => de_PublicWorkforceTaskPrice(_, context),
        TaskAvailabilityLifetimeInSeconds: __expectInt32,
        TaskDescription: __expectString,
        TaskKeywords: (_) => de_TaskKeywords(_, context),
        TaskTimeLimitInSeconds: __expectInt32,
        TaskTitle: __expectString,
        UiConfig: (_) => de_UiConfig(_, context),
        WorkteamArn: __expectString,
    });
};
const de_HumanTaskUiSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HumanTaskUiSummary(entry, context);
    });
    return retVal;
};
const de_HumanTaskUiSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HumanTaskUiArn: __expectString,
        HumanTaskUiName: __expectString,
    });
};
const de_HyperbandStrategyConfig = (output, context) => {
    return take(output, {
        MaxResource: __expectInt32,
        MinResource: __expectInt32,
    });
};
const de_HyperParameterAlgorithmSpecification = (output, context) => {
    return take(output, {
        AlgorithmName: __expectString,
        MetricDefinitions: (_) => de_MetricDefinitionList(_, context),
        TrainingImage: __expectString,
        TrainingInputMode: __expectString,
    });
};
const de_HyperParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_HyperParameterSpecification = (output, context) => {
    return take(output, {
        DefaultValue: __expectString,
        Description: __expectString,
        IsRequired: __expectBoolean,
        IsTunable: __expectBoolean,
        Name: __expectString,
        Range: (_) => de_ParameterRange(_, context),
        Type: __expectString,
    });
};
const de_HyperParameterSpecifications = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HyperParameterSpecification(entry, context);
    });
    return retVal;
};
const de_HyperParameterTrainingJobDefinition = (output, context) => {
    return take(output, {
        AlgorithmSpecification: (_) => de_HyperParameterAlgorithmSpecification(_, context),
        CheckpointConfig: (_) => de_CheckpointConfig(_, context),
        DefinitionName: __expectString,
        EnableInterContainerTrafficEncryption: __expectBoolean,
        EnableManagedSpotTraining: __expectBoolean,
        EnableNetworkIsolation: __expectBoolean,
        Environment: (_) => de_HyperParameterTrainingJobEnvironmentMap(_, context),
        HyperParameterRanges: (_) => de_ParameterRanges(_, context),
        HyperParameterTuningResourceConfig: (_) => de_HyperParameterTuningResourceConfig(_, context),
        InputDataConfig: (_) => de_InputDataConfig(_, context),
        OutputDataConfig: (_) => de_OutputDataConfig(_, context),
        ResourceConfig: (_) => de_ResourceConfig(_, context),
        RetryStrategy: (_) => de_RetryStrategy(_, context),
        RoleArn: __expectString,
        StaticHyperParameters: (_) => de_HyperParameters(_, context),
        StoppingCondition: (_) => de_StoppingCondition(_, context),
        TuningObjective: (_) => de_HyperParameterTuningJobObjective(_, context),
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_HyperParameterTrainingJobDefinitions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HyperParameterTrainingJobDefinition(entry, context);
    });
    return retVal;
};
const de_HyperParameterTrainingJobEnvironmentMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_HyperParameterTrainingJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HyperParameterTrainingJobSummary(entry, context);
    });
    return retVal;
};
const de_HyperParameterTrainingJobSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        FinalHyperParameterTuningJobObjectiveMetric: (_) => de_FinalHyperParameterTuningJobObjectiveMetric(_, context),
        ObjectiveStatus: __expectString,
        TrainingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingJobArn: __expectString,
        TrainingJobDefinitionName: __expectString,
        TrainingJobName: __expectString,
        TrainingJobStatus: __expectString,
        TrainingStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TunedHyperParameters: (_) => de_HyperParameters(_, context),
        TuningJobName: __expectString,
    });
};
const de_HyperParameterTuningInstanceConfig = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_HyperParameterTuningInstanceConfigs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HyperParameterTuningInstanceConfig(entry, context);
    });
    return retVal;
};
const de_HyperParameterTuningJobCompletionDetails = (output, context) => {
    return take(output, {
        ConvergenceDetectedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        NumberOfTrainingJobsObjectiveNotImproving: __expectInt32,
    });
};
const de_HyperParameterTuningJobConfig = (output, context) => {
    return take(output, {
        HyperParameterTuningJobObjective: (_) => de_HyperParameterTuningJobObjective(_, context),
        ParameterRanges: (_) => de_ParameterRanges(_, context),
        RandomSeed: __expectInt32,
        ResourceLimits: (_) => de_ResourceLimits(_, context),
        Strategy: __expectString,
        StrategyConfig: (_) => de_HyperParameterTuningJobStrategyConfig(_, context),
        TrainingJobEarlyStoppingType: __expectString,
        TuningJobCompletionCriteria: (_) => de_TuningJobCompletionCriteria(_, context),
    });
};
const de_HyperParameterTuningJobConsumedResources = (output, context) => {
    return take(output, {
        RuntimeInSeconds: __expectInt32,
    });
};
const de_HyperParameterTuningJobObjective = (output, context) => {
    return take(output, {
        MetricName: __expectString,
        Type: __expectString,
    });
};
const de_HyperParameterTuningJobObjectives = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HyperParameterTuningJobObjective(entry, context);
    });
    return retVal;
};
const de_HyperParameterTuningJobSearchEntity = (output, context) => {
    return take(output, {
        BestTrainingJob: (_) => de_HyperParameterTrainingJobSummary(_, context),
        ConsumedResources: (_) => de_HyperParameterTuningJobConsumedResources(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        HyperParameterTuningEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HyperParameterTuningJobArn: __expectString,
        HyperParameterTuningJobConfig: (_) => de_HyperParameterTuningJobConfig(_, context),
        HyperParameterTuningJobName: __expectString,
        HyperParameterTuningJobStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ObjectiveStatusCounters: (_) => de_ObjectiveStatusCounters(_, context),
        OverallBestTrainingJob: (_) => de_HyperParameterTrainingJobSummary(_, context),
        Tags: (_) => de_TagList(_, context),
        TrainingJobDefinition: (_) => de_HyperParameterTrainingJobDefinition(_, context),
        TrainingJobDefinitions: (_) => de_HyperParameterTrainingJobDefinitions(_, context),
        TrainingJobStatusCounters: (_) => de_TrainingJobStatusCounters(_, context),
        TuningJobCompletionDetails: (_) => de_HyperParameterTuningJobCompletionDetails(_, context),
        WarmStartConfig: (_) => de_HyperParameterTuningJobWarmStartConfig(_, context),
    });
};
const de_HyperParameterTuningJobStrategyConfig = (output, context) => {
    return take(output, {
        HyperbandStrategyConfig: (_) => de_HyperbandStrategyConfig(_, context),
    });
};
const de_HyperParameterTuningJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_HyperParameterTuningJobSummary(entry, context);
    });
    return retVal;
};
const de_HyperParameterTuningJobSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HyperParameterTuningEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        HyperParameterTuningJobArn: __expectString,
        HyperParameterTuningJobName: __expectString,
        HyperParameterTuningJobStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ObjectiveStatusCounters: (_) => de_ObjectiveStatusCounters(_, context),
        ResourceLimits: (_) => de_ResourceLimits(_, context),
        Strategy: __expectString,
        TrainingJobStatusCounters: (_) => de_TrainingJobStatusCounters(_, context),
    });
};
const de_HyperParameterTuningJobWarmStartConfig = (output, context) => {
    return take(output, {
        ParentHyperParameterTuningJobs: (_) => de_ParentHyperParameterTuningJobs(_, context),
        WarmStartType: __expectString,
    });
};
const de_HyperParameterTuningResourceConfig = (output, context) => {
    return take(output, {
        AllocationStrategy: __expectString,
        InstanceConfigs: (_) => de_HyperParameterTuningInstanceConfigs(_, context),
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
        VolumeKmsKeyId: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_IamIdentity = (output, context) => {
    return take(output, {
        Arn: __expectString,
        PrincipalId: __expectString,
        SourceIdentity: __expectString,
    });
};
const de_IamPolicyConstraints = (output, context) => {
    return take(output, {
        SourceIp: __expectString,
        VpcSourceIp: __expectString,
    });
};
const de_IdentityProviderOAuthSetting = (output, context) => {
    return take(output, {
        DataSourceName: __expectString,
        SecretArn: __expectString,
        Status: __expectString,
    });
};
const de_IdentityProviderOAuthSettings = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_IdentityProviderOAuthSetting(entry, context);
    });
    return retVal;
};
const de_IdleSettings = (output, context) => {
    return take(output, {
        IdleTimeoutInMinutes: __expectInt32,
        LifecycleManagement: __expectString,
        MaxIdleTimeoutInMinutes: __expectInt32,
        MinIdleTimeoutInMinutes: __expectInt32,
    });
};
const de_Image = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        DisplayName: __expectString,
        FailureReason: __expectString,
        ImageArn: __expectString,
        ImageName: __expectString,
        ImageStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_ImageClassificationJobConfig = (output, context) => {
    return take(output, {
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
    });
};
const de_ImageConfig = (output, context) => {
    return take(output, {
        RepositoryAccessMode: __expectString,
        RepositoryAuthConfig: (_) => de_RepositoryAuthConfig(_, context),
    });
};
const de_Images = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Image(entry, context);
    });
    return retVal;
};
const de_ImageVersion = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        ImageArn: __expectString,
        ImageVersionArn: __expectString,
        ImageVersionStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Version: __expectInt32,
    });
};
const de_ImageVersions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ImageVersion(entry, context);
    });
    return retVal;
};
const de_ImportHubContentResponse = (output, context) => {
    return take(output, {
        HubArn: __expectString,
        HubContentArn: __expectString,
    });
};
const de_InferenceComponentCapacitySize = (output, context) => {
    return take(output, {
        Type: __expectString,
        Value: __expectInt32,
    });
};
const de_InferenceComponentComputeResourceRequirements = (output, context) => {
    return take(output, {
        MaxMemoryRequiredInMb: __expectInt32,
        MinMemoryRequiredInMb: __expectInt32,
        NumberOfAcceleratorDevicesRequired: __limitedParseFloat32,
        NumberOfCpuCoresRequired: __limitedParseFloat32,
    });
};
const de_InferenceComponentContainerSpecificationSummary = (output, context) => {
    return take(output, {
        ArtifactUrl: __expectString,
        DeployedImage: (_) => de_DeployedImage(_, context),
        Environment: (_) => de_EnvironmentMap(_, context),
    });
};
const de_InferenceComponentDeploymentConfig = (output, context) => {
    return take(output, {
        AutoRollbackConfiguration: (_) => de_AutoRollbackConfig(_, context),
        RollingUpdatePolicy: (_) => de_InferenceComponentRollingUpdatePolicy(_, context),
    });
};
const de_InferenceComponentRollingUpdatePolicy = (output, context) => {
    return take(output, {
        MaximumBatchSize: (_) => de_InferenceComponentCapacitySize(_, context),
        MaximumExecutionTimeoutInSeconds: __expectInt32,
        RollbackMaximumBatchSize: (_) => de_InferenceComponentCapacitySize(_, context),
        WaitIntervalInSeconds: __expectInt32,
    });
};
const de_InferenceComponentRuntimeConfigSummary = (output, context) => {
    return take(output, {
        CurrentCopyCount: __expectInt32,
        DesiredCopyCount: __expectInt32,
    });
};
const de_InferenceComponentSpecificationSummary = (output, context) => {
    return take(output, {
        BaseInferenceComponentName: __expectString,
        ComputeResourceRequirements: (_) => de_InferenceComponentComputeResourceRequirements(_, context),
        Container: (_) => de_InferenceComponentContainerSpecificationSummary(_, context),
        ModelName: __expectString,
        StartupParameters: (_) => de_InferenceComponentStartupParameters(_, context),
    });
};
const de_InferenceComponentStartupParameters = (output, context) => {
    return take(output, {
        ContainerStartupHealthCheckTimeoutInSeconds: __expectInt32,
        ModelDataDownloadTimeoutInSeconds: __expectInt32,
    });
};
const de_InferenceComponentSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointArn: __expectString,
        EndpointName: __expectString,
        InferenceComponentArn: __expectString,
        InferenceComponentName: __expectString,
        InferenceComponentStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        VariantName: __expectString,
    });
};
const de_InferenceComponentSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InferenceComponentSummary(entry, context);
    });
    return retVal;
};
const de_InferenceExecutionConfig = (output, context) => {
    return take(output, {
        Mode: __expectString,
    });
};
const de_InferenceExperimentDataStorageConfig = (output, context) => {
    return take(output, {
        ContentType: (_) => de_CaptureContentTypeHeader(_, context),
        Destination: __expectString,
        KmsKey: __expectString,
    });
};
const de_InferenceExperimentList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InferenceExperimentSummary(entry, context);
    });
    return retVal;
};
const de_InferenceExperimentSchedule = (output, context) => {
    return take(output, {
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_InferenceExperimentSummary = (output, context) => {
    return take(output, {
        CompletionTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        RoleArn: __expectString,
        Schedule: (_) => de_InferenceExperimentSchedule(_, context),
        Status: __expectString,
        StatusReason: __expectString,
        Type: __expectString,
    });
};
const de_InferenceHubAccessConfig = (output, context) => {
    return take(output, {
        HubContentArn: __expectString,
    });
};
const de_InferenceMetrics = (output, context) => {
    return take(output, {
        MaxInvocations: __expectInt32,
        ModelLatency: __expectInt32,
    });
};
const de_InferenceRecommendation = (output, context) => {
    return take(output, {
        EndpointConfiguration: (_) => de_EndpointOutputConfiguration(_, context),
        InvocationEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InvocationStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Metrics: (_) => de_RecommendationMetrics(_, context),
        ModelConfiguration: (_) => de_ModelConfiguration(_, context),
        RecommendationId: __expectString,
    });
};
const de_InferenceRecommendations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InferenceRecommendation(entry, context);
    });
    return retVal;
};
const de_InferenceRecommendationsJob = (output, context) => {
    return take(output, {
        CompletionTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        JobArn: __expectString,
        JobDescription: __expectString,
        JobName: __expectString,
        JobType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelName: __expectString,
        ModelPackageVersionArn: __expectString,
        RoleArn: __expectString,
        SamplePayloadUrl: __expectString,
        Status: __expectString,
    });
};
const de_InferenceRecommendationsJobs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InferenceRecommendationsJob(entry, context);
    });
    return retVal;
};
const de_InferenceRecommendationsJobStep = (output, context) => {
    return take(output, {
        InferenceBenchmark: (_) => de_RecommendationJobInferenceBenchmark(_, context),
        JobName: __expectString,
        Status: __expectString,
        StepType: __expectString,
    });
};
const de_InferenceRecommendationsJobSteps = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InferenceRecommendationsJobStep(entry, context);
    });
    return retVal;
};
const de_InferenceSpecification = (output, context) => {
    return take(output, {
        Containers: (_) => de_ModelPackageContainerDefinitionList(_, context),
        SupportedContentTypes: (_) => de_ContentTypes(_, context),
        SupportedRealtimeInferenceInstanceTypes: (_) => de_RealtimeInferenceInstanceTypes(_, context),
        SupportedResponseMIMETypes: (_) => de_ResponseMIMETypes(_, context),
        SupportedTransformInstanceTypes: (_) => de_TransformInstanceTypes(_, context),
    });
};
const de_InfraCheckConfig = (output, context) => {
    return take(output, {
        EnableInfraCheck: __expectBoolean,
    });
};
const de_InputConfig = (output, context) => {
    return take(output, {
        DataInputConfig: __expectString,
        Framework: __expectString,
        FrameworkVersion: __expectString,
        S3Uri: __expectString,
    });
};
const de_InputDataConfig = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Channel(entry, context);
    });
    return retVal;
};
const de_InputModes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_InstanceGroup = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceGroupName: __expectString,
        InstanceType: __expectString,
    });
};
const de_InstanceGroupNames = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_InstanceGroups = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_InstanceGroup(entry, context);
    });
    return retVal;
};
const de_InstanceMetadataServiceConfiguration = (output, context) => {
    return take(output, {
        MinimumInstanceMetadataServiceVersion: __expectString,
    });
};
const de_IntegerParameterRange = (output, context) => {
    return take(output, {
        MaxValue: __expectString,
        MinValue: __expectString,
        Name: __expectString,
        ScalingType: __expectString,
    });
};
const de_IntegerParameterRanges = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_IntegerParameterRange(entry, context);
    });
    return retVal;
};
const de_IntegerParameterRangeSpecification = (output, context) => {
    return take(output, {
        MaxValue: __expectString,
        MinValue: __expectString,
    });
};
const de_JsonContentTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_JupyterLabAppImageConfig = (output, context) => {
    return take(output, {
        ContainerConfig: (_) => de_ContainerConfig(_, context),
        FileSystemConfig: (_) => de_FileSystemConfig(_, context),
    });
};
const de_JupyterLabAppSettings = (output, context) => {
    return take(output, {
        AppLifecycleManagement: (_) => de_AppLifecycleManagement(_, context),
        BuiltInLifecycleConfigArn: __expectString,
        CodeRepositories: (_) => de_CodeRepositories(_, context),
        CustomImages: (_) => de_CustomImages(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
        EmrSettings: (_) => de_EmrSettings(_, context),
        LifecycleConfigArns: (_) => de_LifecycleConfigArns(_, context),
    });
};
const de_JupyterServerAppSettings = (output, context) => {
    return take(output, {
        CodeRepositories: (_) => de_CodeRepositories(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
        LifecycleConfigArns: (_) => de_LifecycleConfigArns(_, context),
    });
};
const de_KendraSettings = (output, context) => {
    return take(output, {
        Status: __expectString,
    });
};
const de_KernelGatewayAppSettings = (output, context) => {
    return take(output, {
        CustomImages: (_) => de_CustomImages(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
        LifecycleConfigArns: (_) => de_LifecycleConfigArns(_, context),
    });
};
const de_KernelGatewayImageConfig = (output, context) => {
    return take(output, {
        FileSystemConfig: (_) => de_FileSystemConfig(_, context),
        KernelSpecs: (_) => de_KernelSpecs(_, context),
    });
};
const de_KernelSpec = (output, context) => {
    return take(output, {
        DisplayName: __expectString,
        Name: __expectString,
    });
};
const de_KernelSpecs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_KernelSpec(entry, context);
    });
    return retVal;
};
const de_LabelCounters = (output, context) => {
    return take(output, {
        FailedNonRetryableError: __expectInt32,
        HumanLabeled: __expectInt32,
        MachineLabeled: __expectInt32,
        TotalLabeled: __expectInt32,
        Unlabeled: __expectInt32,
    });
};
const de_LabelCountersForWorkteam = (output, context) => {
    return take(output, {
        HumanLabeled: __expectInt32,
        PendingHuman: __expectInt32,
        Total: __expectInt32,
    });
};
const de_LabelingJobAlgorithmsConfig = (output, context) => {
    return take(output, {
        InitialActiveLearningModelArn: __expectString,
        LabelingJobAlgorithmSpecificationArn: __expectString,
        LabelingJobResourceConfig: (_) => de_LabelingJobResourceConfig(_, context),
    });
};
const de_LabelingJobDataAttributes = (output, context) => {
    return take(output, {
        ContentClassifiers: (_) => de_ContentClassifiers(_, context),
    });
};
const de_LabelingJobDataSource = (output, context) => {
    return take(output, {
        S3DataSource: (_) => de_LabelingJobS3DataSource(_, context),
        SnsDataSource: (_) => de_LabelingJobSnsDataSource(_, context),
    });
};
const de_LabelingJobForWorkteamSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        JobReferenceCode: __expectString,
        LabelCounters: (_) => de_LabelCountersForWorkteam(_, context),
        LabelingJobName: __expectString,
        NumberOfHumanWorkersPerDataObject: __expectInt32,
        WorkRequesterAccountId: __expectString,
    });
};
const de_LabelingJobForWorkteamSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_LabelingJobForWorkteamSummary(entry, context);
    });
    return retVal;
};
const de_LabelingJobInputConfig = (output, context) => {
    return take(output, {
        DataAttributes: (_) => de_LabelingJobDataAttributes(_, context),
        DataSource: (_) => de_LabelingJobDataSource(_, context),
    });
};
const de_LabelingJobOutput = (output, context) => {
    return take(output, {
        FinalActiveLearningModelArn: __expectString,
        OutputDatasetS3Uri: __expectString,
    });
};
const de_LabelingJobOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        S3OutputPath: __expectString,
        SnsTopicArn: __expectString,
    });
};
const de_LabelingJobResourceConfig = (output, context) => {
    return take(output, {
        VolumeKmsKeyId: __expectString,
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_LabelingJobS3DataSource = (output, context) => {
    return take(output, {
        ManifestS3Uri: __expectString,
    });
};
const de_LabelingJobSnsDataSource = (output, context) => {
    return take(output, {
        SnsTopicArn: __expectString,
    });
};
const de_LabelingJobStoppingConditions = (output, context) => {
    return take(output, {
        MaxHumanLabeledObjectCount: __expectInt32,
        MaxPercentageOfInputDatasetLabeled: __expectInt32,
    });
};
const de_LabelingJobSummary = (output, context) => {
    return take(output, {
        AnnotationConsolidationLambdaArn: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        InputConfig: (_) => de_LabelingJobInputConfig(_, context),
        LabelCounters: (_) => de_LabelCounters(_, context),
        LabelingJobArn: __expectString,
        LabelingJobName: __expectString,
        LabelingJobOutput: (_) => de_LabelingJobOutput(_, context),
        LabelingJobStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        PreHumanTaskLambdaArn: __expectString,
        WorkteamArn: __expectString,
    });
};
const de_LabelingJobSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_LabelingJobSummary(entry, context);
    });
    return retVal;
};
const de_LambdaStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
        OutputParameters: (_) => de_OutputParameterList(_, context),
    });
};
const de_LastUpdateStatus = (output, context) => {
    return take(output, {
        FailureReason: __expectString,
        Status: __expectString,
    });
};
const de_LifecycleConfigArns = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_LineageEntityParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_LineageGroupSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_LineageGroupSummary(entry, context);
    });
    return retVal;
};
const de_LineageGroupSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        LineageGroupName: __expectString,
    });
};
const de_ListActionsResponse = (output, context) => {
    return take(output, {
        ActionSummaries: (_) => de_ActionSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListAlgorithmsOutput = (output, context) => {
    return take(output, {
        AlgorithmSummaryList: (_) => de_AlgorithmSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListAliasesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SageMakerImageVersionAliases: (_) => de_SageMakerImageVersionAliases(_, context),
    });
};
const de_ListAppImageConfigsResponse = (output, context) => {
    return take(output, {
        AppImageConfigs: (_) => de_AppImageConfigList(_, context),
        NextToken: __expectString,
    });
};
const de_ListAppsResponse = (output, context) => {
    return take(output, {
        Apps: (_) => de_AppList(_, context),
        NextToken: __expectString,
    });
};
const de_ListArtifactsResponse = (output, context) => {
    return take(output, {
        ArtifactSummaries: (_) => de_ArtifactSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListAssociationsResponse = (output, context) => {
    return take(output, {
        AssociationSummaries: (_) => de_AssociationSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListAutoMLJobsResponse = (output, context) => {
    return take(output, {
        AutoMLJobSummaries: (_) => de_AutoMLJobSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListCandidatesForAutoMLJobResponse = (output, context) => {
    return take(output, {
        Candidates: (_) => de_AutoMLCandidates(_, context),
        NextToken: __expectString,
    });
};
const de_ListClusterNodesResponse = (output, context) => {
    return take(output, {
        ClusterNodeSummaries: (_) => de_ClusterNodeSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListClusterSchedulerConfigsResponse = (output, context) => {
    return take(output, {
        ClusterSchedulerConfigSummaries: (_) => de_ClusterSchedulerConfigSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListClustersResponse = (output, context) => {
    return take(output, {
        ClusterSummaries: (_) => de_ClusterSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListCodeRepositoriesOutput = (output, context) => {
    return take(output, {
        CodeRepositorySummaryList: (_) => de_CodeRepositorySummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListCompilationJobsResponse = (output, context) => {
    return take(output, {
        CompilationJobSummaries: (_) => de_CompilationJobSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListComputeQuotasResponse = (output, context) => {
    return take(output, {
        ComputeQuotaSummaries: (_) => de_ComputeQuotaSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListContextsResponse = (output, context) => {
    return take(output, {
        ContextSummaries: (_) => de_ContextSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListDataQualityJobDefinitionsResponse = (output, context) => {
    return take(output, {
        JobDefinitionSummaries: (_) => de_MonitoringJobDefinitionSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListDeviceFleetsResponse = (output, context) => {
    return take(output, {
        DeviceFleetSummaries: (_) => de_DeviceFleetSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListDevicesResponse = (output, context) => {
    return take(output, {
        DeviceSummaries: (_) => de_DeviceSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListDomainsResponse = (output, context) => {
    return take(output, {
        Domains: (_) => de_DomainList(_, context),
        NextToken: __expectString,
    });
};
const de_ListEdgeDeploymentPlansResponse = (output, context) => {
    return take(output, {
        EdgeDeploymentPlanSummaries: (_) => de_EdgeDeploymentPlanSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListEdgePackagingJobsResponse = (output, context) => {
    return take(output, {
        EdgePackagingJobSummaries: (_) => de_EdgePackagingJobSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListEndpointConfigsOutput = (output, context) => {
    return take(output, {
        EndpointConfigs: (_) => de_EndpointConfigSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListEndpointsOutput = (output, context) => {
    return take(output, {
        Endpoints: (_) => de_EndpointSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListExperimentsResponse = (output, context) => {
    return take(output, {
        ExperimentSummaries: (_) => de_ExperimentSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListFeatureGroupsResponse = (output, context) => {
    return take(output, {
        FeatureGroupSummaries: (_) => de_FeatureGroupSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListFlowDefinitionsResponse = (output, context) => {
    return take(output, {
        FlowDefinitionSummaries: (_) => de_FlowDefinitionSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListHubContentsResponse = (output, context) => {
    return take(output, {
        HubContentSummaries: (_) => de_HubContentInfoList(_, context),
        NextToken: __expectString,
    });
};
const de_ListHubContentVersionsResponse = (output, context) => {
    return take(output, {
        HubContentSummaries: (_) => de_HubContentInfoList(_, context),
        NextToken: __expectString,
    });
};
const de_ListHubsResponse = (output, context) => {
    return take(output, {
        HubSummaries: (_) => de_HubInfoList(_, context),
        NextToken: __expectString,
    });
};
const de_ListHumanTaskUisResponse = (output, context) => {
    return take(output, {
        HumanTaskUiSummaries: (_) => de_HumanTaskUiSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListHyperParameterTuningJobsResponse = (output, context) => {
    return take(output, {
        HyperParameterTuningJobSummaries: (_) => de_HyperParameterTuningJobSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListImagesResponse = (output, context) => {
    return take(output, {
        Images: (_) => de_Images(_, context),
        NextToken: __expectString,
    });
};
const de_ListImageVersionsResponse = (output, context) => {
    return take(output, {
        ImageVersions: (_) => de_ImageVersions(_, context),
        NextToken: __expectString,
    });
};
const de_ListInferenceComponentsOutput = (output, context) => {
    return take(output, {
        InferenceComponents: (_) => de_InferenceComponentSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListInferenceExperimentsResponse = (output, context) => {
    return take(output, {
        InferenceExperiments: (_) => de_InferenceExperimentList(_, context),
        NextToken: __expectString,
    });
};
const de_ListInferenceRecommendationsJobsResponse = (output, context) => {
    return take(output, {
        InferenceRecommendationsJobs: (_) => de_InferenceRecommendationsJobs(_, context),
        NextToken: __expectString,
    });
};
const de_ListInferenceRecommendationsJobStepsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Steps: (_) => de_InferenceRecommendationsJobSteps(_, context),
    });
};
const de_ListLabelingJobsForWorkteamResponse = (output, context) => {
    return take(output, {
        LabelingJobSummaryList: (_) => de_LabelingJobForWorkteamSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListLabelingJobsResponse = (output, context) => {
    return take(output, {
        LabelingJobSummaryList: (_) => de_LabelingJobSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListLineageGroupsResponse = (output, context) => {
    return take(output, {
        LineageGroupSummaries: (_) => de_LineageGroupSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListMlflowTrackingServersResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TrackingServerSummaries: (_) => de_TrackingServerSummaryList(_, context),
    });
};
const de_ListModelBiasJobDefinitionsResponse = (output, context) => {
    return take(output, {
        JobDefinitionSummaries: (_) => de_MonitoringJobDefinitionSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelCardExportJobsResponse = (output, context) => {
    return take(output, {
        ModelCardExportJobSummaries: (_) => de_ModelCardExportJobSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelCardsResponse = (output, context) => {
    return take(output, {
        ModelCardSummaries: (_) => de_ModelCardSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelCardVersionsResponse = (output, context) => {
    return take(output, {
        ModelCardVersionSummaryList: (_) => de_ModelCardVersionSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelExplainabilityJobDefinitionsResponse = (output, context) => {
    return take(output, {
        JobDefinitionSummaries: (_) => de_MonitoringJobDefinitionSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelMetadataResponse = (output, context) => {
    return take(output, {
        ModelMetadataSummaries: (_) => de_ModelMetadataSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelPackageGroupsOutput = (output, context) => {
    return take(output, {
        ModelPackageGroupSummaryList: (_) => de_ModelPackageGroupSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelPackagesOutput = (output, context) => {
    return take(output, {
        ModelPackageSummaryList: (_) => de_ModelPackageSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelQualityJobDefinitionsResponse = (output, context) => {
    return take(output, {
        JobDefinitionSummaries: (_) => de_MonitoringJobDefinitionSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListModelsOutput = (output, context) => {
    return take(output, {
        Models: (_) => de_ModelSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListMonitoringAlertHistoryResponse = (output, context) => {
    return take(output, {
        MonitoringAlertHistory: (_) => de_MonitoringAlertHistoryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListMonitoringAlertsResponse = (output, context) => {
    return take(output, {
        MonitoringAlertSummaries: (_) => de_MonitoringAlertSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListMonitoringExecutionsResponse = (output, context) => {
    return take(output, {
        MonitoringExecutionSummaries: (_) => de_MonitoringExecutionSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListMonitoringSchedulesResponse = (output, context) => {
    return take(output, {
        MonitoringScheduleSummaries: (_) => de_MonitoringScheduleSummaryList(_, context),
        NextToken: __expectString,
    });
};
const de_ListNotebookInstanceLifecycleConfigsOutput = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        NotebookInstanceLifecycleConfigs: (_) => de_NotebookInstanceLifecycleConfigSummaryList(_, context),
    });
};
const de_ListNotebookInstancesOutput = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        NotebookInstances: (_) => de_NotebookInstanceSummaryList(_, context),
    });
};
const de_ListOptimizationJobsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        OptimizationJobSummaries: (_) => de_OptimizationJobSummaries(_, context),
    });
};
const de_ListPartnerAppsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Summaries: (_) => de_PartnerAppSummaries(_, context),
    });
};
const de_ListPipelineExecutionsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        PipelineExecutionSummaries: (_) => de_PipelineExecutionSummaryList(_, context),
    });
};
const de_ListPipelineExecutionStepsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        PipelineExecutionSteps: (_) => de_PipelineExecutionStepList(_, context),
    });
};
const de_ListPipelineParametersForExecutionResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        PipelineParameters: (_) => de_ParameterList(_, context),
    });
};
const de_ListPipelinesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        PipelineSummaries: (_) => de_PipelineSummaryList(_, context),
    });
};
const de_ListProcessingJobsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        ProcessingJobSummaries: (_) => de_ProcessingJobSummaries(_, context),
    });
};
const de_ListProjectsOutput = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        ProjectSummaryList: (_) => de_ProjectSummaryList(_, context),
    });
};
const de_ListResourceCatalogsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        ResourceCatalogs: (_) => de_ResourceCatalogList(_, context),
    });
};
const de_ListSpacesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Spaces: (_) => de_SpaceList(_, context),
    });
};
const de_ListStageDevicesResponse = (output, context) => {
    return take(output, {
        DeviceDeploymentSummaries: (_) => de_DeviceDeploymentSummaries(_, context),
        NextToken: __expectString,
    });
};
const de_ListStudioLifecycleConfigsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        StudioLifecycleConfigs: (_) => de_StudioLifecycleConfigsList(_, context),
    });
};
const de_ListSubscribedWorkteamsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        SubscribedWorkteams: (_) => de_SubscribedWorkteams(_, context),
    });
};
const de_ListTagsOutput = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Tags: (_) => de_TagList(_, context),
    });
};
const de_ListTrainingJobsForHyperParameterTuningJobResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TrainingJobSummaries: (_) => de_HyperParameterTrainingJobSummaries(_, context),
    });
};
const de_ListTrainingJobsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TrainingJobSummaries: (_) => de_TrainingJobSummaries(_, context),
    });
};
const de_ListTrainingPlansResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TrainingPlanSummaries: (_) => de_TrainingPlanSummaries(_, context),
    });
};
const de_ListTransformJobsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TransformJobSummaries: (_) => de_TransformJobSummaries(_, context),
    });
};
const de_ListTrialComponentsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TrialComponentSummaries: (_) => de_TrialComponentSummaries(_, context),
    });
};
const de_ListTrialsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        TrialSummaries: (_) => de_TrialSummaries(_, context),
    });
};
const de_ListUserProfilesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        UserProfiles: (_) => de_UserProfileList(_, context),
    });
};
const de_ListWorkforcesResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Workforces: (_) => de_Workforces(_, context),
    });
};
const de_ListWorkteamsResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Workteams: (_) => de_Workteams(_, context),
    });
};
const de_MemberDefinition = (output, context) => {
    return take(output, {
        CognitoMemberDefinition: (_) => de_CognitoMemberDefinition(_, context),
        OidcMemberDefinition: (_) => de_OidcMemberDefinition(_, context),
    });
};
const de_MemberDefinitions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MemberDefinition(entry, context);
    });
    return retVal;
};
const de_MetadataProperties = (output, context) => {
    return take(output, {
        CommitId: __expectString,
        GeneratedBy: __expectString,
        ProjectId: __expectString,
        Repository: __expectString,
    });
};
const de_MetricData = (output, context) => {
    return take(output, {
        MetricName: __expectString,
        Timestamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Value: __limitedParseFloat32,
    });
};
const de_MetricDataList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MetricDatum(entry, context);
    });
    return retVal;
};
const de_MetricDatum = (output, context) => {
    return take(output, {
        MetricName: __expectString,
        Set: __expectString,
        StandardMetricName: __expectString,
        Value: __limitedParseFloat32,
    });
};
const de_MetricDefinition = (output, context) => {
    return take(output, {
        Name: __expectString,
        Regex: __expectString,
    });
};
const de_MetricDefinitionList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MetricDefinition(entry, context);
    });
    return retVal;
};
const de_MetricSpecification = (output, context) => {
    if (output.Customized != null) {
        return {
            Customized: de_CustomizedMetricSpecification(output.Customized, context),
        };
    }
    if (output.Predefined != null) {
        return {
            Predefined: de_PredefinedMetricSpecification(output.Predefined, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_MetricsSource = (output, context) => {
    return take(output, {
        ContentDigest: __expectString,
        ContentType: __expectString,
        S3Uri: __expectString,
    });
};
const de_Model = (output, context) => {
    return take(output, {
        Containers: (_) => de_ContainerDefinitionList(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeploymentRecommendation: (_) => de_DeploymentRecommendation(_, context),
        EnableNetworkIsolation: __expectBoolean,
        ExecutionRoleArn: __expectString,
        InferenceExecutionConfig: (_) => de_InferenceExecutionConfig(_, context),
        ModelArn: __expectString,
        ModelName: __expectString,
        PrimaryContainer: (_) => de_ContainerDefinition(_, context),
        Tags: (_) => de_TagList(_, context),
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_ModelAccessConfig = (output, context) => {
    return take(output, {
        AcceptEula: __expectBoolean,
    });
};
const de_ModelArtifacts = (output, context) => {
    return take(output, {
        S3ModelArtifacts: __expectString,
    });
};
const de_ModelBiasAppSpecification = (output, context) => {
    return take(output, {
        ConfigUri: __expectString,
        Environment: (_) => de_MonitoringEnvironmentMap(_, context),
        ImageUri: __expectString,
    });
};
const de_ModelBiasBaselineConfig = (output, context) => {
    return take(output, {
        BaseliningJobName: __expectString,
        ConstraintsResource: (_) => de_MonitoringConstraintsResource(_, context),
    });
};
const de_ModelBiasJobInput = (output, context) => {
    return take(output, {
        BatchTransformInput: (_) => de_BatchTransformInput(_, context),
        EndpointInput: (_) => de_EndpointInput(_, context),
        GroundTruthS3Input: (_) => de_MonitoringGroundTruthS3Input(_, context),
    });
};
const de_ModelCard = (output, context) => {
    return take(output, {
        Content: __expectString,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardArn: __expectString,
        ModelCardName: __expectString,
        ModelCardStatus: __expectString,
        ModelCardVersion: __expectInt32,
        ModelId: __expectString,
        ModelPackageGroupName: __expectString,
        RiskRating: __expectString,
        SecurityConfig: (_) => de_ModelCardSecurityConfig(_, context),
        Tags: (_) => de_TagList(_, context),
    });
};
const de_ModelCardExportArtifacts = (output, context) => {
    return take(output, {
        S3ExportArtifacts: __expectString,
    });
};
const de_ModelCardExportJobSummary = (output, context) => {
    return take(output, {
        CreatedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedAt: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardExportJobArn: __expectString,
        ModelCardExportJobName: __expectString,
        ModelCardName: __expectString,
        ModelCardVersion: __expectInt32,
        Status: __expectString,
    });
};
const de_ModelCardExportJobSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelCardExportJobSummary(entry, context);
    });
    return retVal;
};
const de_ModelCardExportOutputConfig = (output, context) => {
    return take(output, {
        S3OutputPath: __expectString,
    });
};
const de_ModelCardSecurityConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
    });
};
const de_ModelCardSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardArn: __expectString,
        ModelCardName: __expectString,
        ModelCardStatus: __expectString,
    });
};
const de_ModelCardSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelCardSummary(entry, context);
    });
    return retVal;
};
const de_ModelCardVersionSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardArn: __expectString,
        ModelCardName: __expectString,
        ModelCardStatus: __expectString,
        ModelCardVersion: __expectInt32,
    });
};
const de_ModelCardVersionSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelCardVersionSummary(entry, context);
    });
    return retVal;
};
const de_ModelClientConfig = (output, context) => {
    return take(output, {
        InvocationsMaxRetries: __expectInt32,
        InvocationsTimeoutInSeconds: __expectInt32,
    });
};
const de_ModelCompilationConfig = (output, context) => {
    return take(output, {
        Image: __expectString,
        OverrideEnvironment: (_) => de_OptimizationJobEnvironmentVariables(_, context),
    });
};
const de_ModelConfiguration = (output, context) => {
    return take(output, {
        CompilationJobName: __expectString,
        EnvironmentParameters: (_) => de_EnvironmentParameters(_, context),
        InferenceSpecificationName: __expectString,
    });
};
const de_ModelDashboardEndpoint = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointArn: __expectString,
        EndpointName: __expectString,
        EndpointStatus: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_ModelDashboardEndpoints = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelDashboardEndpoint(entry, context);
    });
    return retVal;
};
const de_ModelDashboardIndicatorAction = (output, context) => {
    return take(output, {
        Enabled: __expectBoolean,
    });
};
const de_ModelDashboardModel = (output, context) => {
    return take(output, {
        Endpoints: (_) => de_ModelDashboardEndpoints(_, context),
        LastBatchTransformJob: (_) => de_TransformJob(_, context),
        Model: (_) => de_Model(_, context),
        ModelCard: (_) => de_ModelDashboardModelCard(_, context),
        MonitoringSchedules: (_) => de_ModelDashboardMonitoringSchedules(_, context),
    });
};
const de_ModelDashboardModelCard = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelCardArn: __expectString,
        ModelCardName: __expectString,
        ModelCardStatus: __expectString,
        ModelCardVersion: __expectInt32,
        ModelId: __expectString,
        RiskRating: __expectString,
        SecurityConfig: (_) => de_ModelCardSecurityConfig(_, context),
        Tags: (_) => de_TagList(_, context),
    });
};
const de_ModelDashboardMonitoringSchedule = (output, context) => {
    return take(output, {
        BatchTransformInput: (_) => de_BatchTransformInput(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointName: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastMonitoringExecutionSummary: (_) => de_MonitoringExecutionSummary(_, context),
        MonitoringAlertSummaries: (_) => de_MonitoringAlertSummaryList(_, context),
        MonitoringScheduleArn: __expectString,
        MonitoringScheduleConfig: (_) => de_MonitoringScheduleConfig(_, context),
        MonitoringScheduleName: __expectString,
        MonitoringScheduleStatus: __expectString,
        MonitoringType: __expectString,
    });
};
const de_ModelDashboardMonitoringSchedules = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelDashboardMonitoringSchedule(entry, context);
    });
    return retVal;
};
const de_ModelDataQuality = (output, context) => {
    return take(output, {
        Constraints: (_) => de_MetricsSource(_, context),
        Statistics: (_) => de_MetricsSource(_, context),
    });
};
const de_ModelDataSource = (output, context) => {
    return take(output, {
        S3DataSource: (_) => de_S3ModelDataSource(_, context),
    });
};
const de_ModelDeployConfig = (output, context) => {
    return take(output, {
        AutoGenerateEndpointName: __expectBoolean,
        EndpointName: __expectString,
    });
};
const de_ModelDeployResult = (output, context) => {
    return take(output, {
        EndpointName: __expectString,
    });
};
const de_ModelDigests = (output, context) => {
    return take(output, {
        ArtifactDigest: __expectString,
    });
};
const de_ModelExplainabilityAppSpecification = (output, context) => {
    return take(output, {
        ConfigUri: __expectString,
        Environment: (_) => de_MonitoringEnvironmentMap(_, context),
        ImageUri: __expectString,
    });
};
const de_ModelExplainabilityBaselineConfig = (output, context) => {
    return take(output, {
        BaseliningJobName: __expectString,
        ConstraintsResource: (_) => de_MonitoringConstraintsResource(_, context),
    });
};
const de_ModelExplainabilityJobInput = (output, context) => {
    return take(output, {
        BatchTransformInput: (_) => de_BatchTransformInput(_, context),
        EndpointInput: (_) => de_EndpointInput(_, context),
    });
};
const de_ModelInfrastructureConfig = (output, context) => {
    return take(output, {
        InfrastructureType: __expectString,
        RealTimeInferenceConfig: (_) => de_RealTimeInferenceConfig(_, context),
    });
};
const de_ModelInput = (output, context) => {
    return take(output, {
        DataInputConfig: __expectString,
    });
};
const de_ModelLatencyThreshold = (output, context) => {
    return take(output, {
        Percentile: __expectString,
        ValueInMilliseconds: __expectInt32,
    });
};
const de_ModelLatencyThresholds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelLatencyThreshold(entry, context);
    });
    return retVal;
};
const de_ModelLifeCycle = (output, context) => {
    return take(output, {
        Stage: __expectString,
        StageDescription: __expectString,
        StageStatus: __expectString,
    });
};
const de_ModelMetadataSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelMetadataSummary(entry, context);
    });
    return retVal;
};
const de_ModelMetadataSummary = (output, context) => {
    return take(output, {
        Domain: __expectString,
        Framework: __expectString,
        FrameworkVersion: __expectString,
        Model: __expectString,
        Task: __expectString,
    });
};
const de_ModelMetrics = (output, context) => {
    return take(output, {
        Bias: (_) => de_Bias(_, context),
        Explainability: (_) => de_Explainability(_, context),
        ModelDataQuality: (_) => de_ModelDataQuality(_, context),
        ModelQuality: (_) => de_ModelQuality(_, context),
    });
};
const de_ModelPackage = (output, context) => {
    return take(output, {
        AdditionalInferenceSpecifications: (_) => de_AdditionalInferenceSpecifications(_, context),
        ApprovalDescription: __expectString,
        CertifyForMarketplace: __expectBoolean,
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        CustomerMetadataProperties: (_) => de_CustomerMetadataMap(_, context),
        Domain: __expectString,
        DriftCheckBaselines: (_) => de_DriftCheckBaselines(_, context),
        InferenceSpecification: (_) => de_InferenceSpecification(_, context),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        ModelApprovalStatus: __expectString,
        ModelCard: (_) => de_ModelPackageModelCard(_, context),
        ModelLifeCycle: (_) => de_ModelLifeCycle(_, context),
        ModelMetrics: (_) => de_ModelMetrics(_, context),
        ModelPackageArn: __expectString,
        ModelPackageDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageName: __expectString,
        ModelPackageStatus: __expectString,
        ModelPackageStatusDetails: (_) => de_ModelPackageStatusDetails(_, context),
        ModelPackageVersion: __expectInt32,
        SamplePayloadUrl: __expectString,
        SecurityConfig: (_) => de_ModelPackageSecurityConfig(_, context),
        SkipModelValidation: __expectString,
        SourceAlgorithmSpecification: (_) => de_SourceAlgorithmSpecification(_, context),
        SourceUri: __expectString,
        Tags: (_) => de_TagList(_, context),
        Task: __expectString,
        ValidationSpecification: (_) => de_ModelPackageValidationSpecification(_, context),
    });
};
const de_ModelPackageContainerDefinition = (output, context) => {
    return take(output, {
        AdditionalS3DataSource: (_) => de_AdditionalS3DataSource(_, context),
        ContainerHostname: __expectString,
        Environment: (_) => de_EnvironmentMap(_, context),
        Framework: __expectString,
        FrameworkVersion: __expectString,
        Image: __expectString,
        ImageDigest: __expectString,
        ModelDataETag: __expectString,
        ModelDataSource: (_) => de_ModelDataSource(_, context),
        ModelDataUrl: __expectString,
        ModelInput: (_) => de_ModelInput(_, context),
        NearestModelName: __expectString,
        ProductId: __expectString,
    });
};
const de_ModelPackageContainerDefinitionList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelPackageContainerDefinition(entry, context);
    });
    return retVal;
};
const de_ModelPackageGroup = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelPackageGroupArn: __expectString,
        ModelPackageGroupDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageGroupStatus: __expectString,
        Tags: (_) => de_TagList(_, context),
    });
};
const de_ModelPackageGroupSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelPackageGroupArn: __expectString,
        ModelPackageGroupDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageGroupStatus: __expectString,
    });
};
const de_ModelPackageGroupSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelPackageGroupSummary(entry, context);
    });
    return retVal;
};
const de_ModelPackageModelCard = (output, context) => {
    return take(output, {
        ModelCardContent: __expectString,
        ModelCardStatus: __expectString,
    });
};
const de_ModelPackageSecurityConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
    });
};
const de_ModelPackageStatusDetails = (output, context) => {
    return take(output, {
        ImageScanStatuses: (_) => de_ModelPackageStatusItemList(_, context),
        ValidationStatuses: (_) => de_ModelPackageStatusItemList(_, context),
    });
};
const de_ModelPackageStatusItem = (output, context) => {
    return take(output, {
        FailureReason: __expectString,
        Name: __expectString,
        Status: __expectString,
    });
};
const de_ModelPackageStatusItemList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelPackageStatusItem(entry, context);
    });
    return retVal;
};
const de_ModelPackageSummaries = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_BatchDescribeModelPackageSummary(value, context);
        return acc;
    }, {});
};
const de_ModelPackageSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelApprovalStatus: __expectString,
        ModelLifeCycle: (_) => de_ModelLifeCycle(_, context),
        ModelPackageArn: __expectString,
        ModelPackageDescription: __expectString,
        ModelPackageGroupName: __expectString,
        ModelPackageName: __expectString,
        ModelPackageStatus: __expectString,
        ModelPackageVersion: __expectInt32,
    });
};
const de_ModelPackageSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelPackageSummary(entry, context);
    });
    return retVal;
};
const de_ModelPackageValidationProfile = (output, context) => {
    return take(output, {
        ProfileName: __expectString,
        TransformJobDefinition: (_) => de_TransformJobDefinition(_, context),
    });
};
const de_ModelPackageValidationProfiles = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelPackageValidationProfile(entry, context);
    });
    return retVal;
};
const de_ModelPackageValidationSpecification = (output, context) => {
    return take(output, {
        ValidationProfiles: (_) => de_ModelPackageValidationProfiles(_, context),
        ValidationRole: __expectString,
    });
};
const de_ModelQuality = (output, context) => {
    return take(output, {
        Constraints: (_) => de_MetricsSource(_, context),
        Statistics: (_) => de_MetricsSource(_, context),
    });
};
const de_ModelQualityAppSpecification = (output, context) => {
    return take(output, {
        ContainerArguments: (_) => de_MonitoringContainerArguments(_, context),
        ContainerEntrypoint: (_) => de_ContainerEntrypoint(_, context),
        Environment: (_) => de_MonitoringEnvironmentMap(_, context),
        ImageUri: __expectString,
        PostAnalyticsProcessorSourceUri: __expectString,
        ProblemType: __expectString,
        RecordPreprocessorSourceUri: __expectString,
    });
};
const de_ModelQualityBaselineConfig = (output, context) => {
    return take(output, {
        BaseliningJobName: __expectString,
        ConstraintsResource: (_) => de_MonitoringConstraintsResource(_, context),
    });
};
const de_ModelQualityJobInput = (output, context) => {
    return take(output, {
        BatchTransformInput: (_) => de_BatchTransformInput(_, context),
        EndpointInput: (_) => de_EndpointInput(_, context),
        GroundTruthS3Input: (_) => de_MonitoringGroundTruthS3Input(_, context),
    });
};
const de_ModelQuantizationConfig = (output, context) => {
    return take(output, {
        Image: __expectString,
        OverrideEnvironment: (_) => de_OptimizationJobEnvironmentVariables(_, context),
    });
};
const de_ModelRegisterSettings = (output, context) => {
    return take(output, {
        CrossAccountModelRegisterRoleArn: __expectString,
        Status: __expectString,
    });
};
const de_ModelShardingConfig = (output, context) => {
    return take(output, {
        Image: __expectString,
        OverrideEnvironment: (_) => de_OptimizationJobEnvironmentVariables(_, context),
    });
};
const de_ModelStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_ModelSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelArn: __expectString,
        ModelName: __expectString,
    });
};
const de_ModelSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelSummary(entry, context);
    });
    return retVal;
};
const de_ModelVariantConfigSummary = (output, context) => {
    return take(output, {
        InfrastructureConfig: (_) => de_ModelInfrastructureConfig(_, context),
        ModelName: __expectString,
        Status: __expectString,
        VariantName: __expectString,
    });
};
const de_ModelVariantConfigSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ModelVariantConfigSummary(entry, context);
    });
    return retVal;
};
const de_MonitoringAlertActions = (output, context) => {
    return take(output, {
        ModelDashboardIndicator: (_) => de_ModelDashboardIndicatorAction(_, context),
    });
};
const de_MonitoringAlertHistoryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringAlertHistorySummary(entry, context);
    });
    return retVal;
};
const de_MonitoringAlertHistorySummary = (output, context) => {
    return take(output, {
        AlertStatus: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringAlertName: __expectString,
        MonitoringScheduleName: __expectString,
    });
};
const de_MonitoringAlertSummary = (output, context) => {
    return take(output, {
        Actions: (_) => de_MonitoringAlertActions(_, context),
        AlertStatus: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DatapointsToAlert: __expectInt32,
        EvaluationPeriod: __expectInt32,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringAlertName: __expectString,
    });
};
const de_MonitoringAlertSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringAlertSummary(entry, context);
    });
    return retVal;
};
const de_MonitoringAppSpecification = (output, context) => {
    return take(output, {
        ContainerArguments: (_) => de_MonitoringContainerArguments(_, context),
        ContainerEntrypoint: (_) => de_ContainerEntrypoint(_, context),
        ImageUri: __expectString,
        PostAnalyticsProcessorSourceUri: __expectString,
        RecordPreprocessorSourceUri: __expectString,
    });
};
const de_MonitoringBaselineConfig = (output, context) => {
    return take(output, {
        BaseliningJobName: __expectString,
        ConstraintsResource: (_) => de_MonitoringConstraintsResource(_, context),
        StatisticsResource: (_) => de_MonitoringStatisticsResource(_, context),
    });
};
const de_MonitoringClusterConfig = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
        VolumeKmsKeyId: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_MonitoringConstraintsResource = (output, context) => {
    return take(output, {
        S3Uri: __expectString,
    });
};
const de_MonitoringContainerArguments = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_MonitoringCsvDatasetFormat = (output, context) => {
    return take(output, {
        Header: __expectBoolean,
    });
};
const de_MonitoringDatasetFormat = (output, context) => {
    return take(output, {
        Csv: (_) => de_MonitoringCsvDatasetFormat(_, context),
        Json: (_) => de_MonitoringJsonDatasetFormat(_, context),
        Parquet: (_) => de_MonitoringParquetDatasetFormat(_, context),
    });
};
const de_MonitoringEnvironmentMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_MonitoringExecutionSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointName: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringExecutionStatus: __expectString,
        MonitoringJobDefinitionName: __expectString,
        MonitoringScheduleName: __expectString,
        MonitoringType: __expectString,
        ProcessingJobArn: __expectString,
        ScheduledTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_MonitoringExecutionSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringExecutionSummary(entry, context);
    });
    return retVal;
};
const de_MonitoringGroundTruthS3Input = (output, context) => {
    return take(output, {
        S3Uri: __expectString,
    });
};
const de_MonitoringInput = (output, context) => {
    return take(output, {
        BatchTransformInput: (_) => de_BatchTransformInput(_, context),
        EndpointInput: (_) => de_EndpointInput(_, context),
    });
};
const de_MonitoringInputs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringInput(entry, context);
    });
    return retVal;
};
const de_MonitoringJobDefinition = (output, context) => {
    return take(output, {
        BaselineConfig: (_) => de_MonitoringBaselineConfig(_, context),
        Environment: (_) => de_MonitoringEnvironmentMap(_, context),
        MonitoringAppSpecification: (_) => de_MonitoringAppSpecification(_, context),
        MonitoringInputs: (_) => de_MonitoringInputs(_, context),
        MonitoringOutputConfig: (_) => de_MonitoringOutputConfig(_, context),
        MonitoringResources: (_) => de_MonitoringResources(_, context),
        NetworkConfig: (_) => de_NetworkConfig(_, context),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_MonitoringStoppingCondition(_, context),
    });
};
const de_MonitoringJobDefinitionSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointName: __expectString,
        MonitoringJobDefinitionArn: __expectString,
        MonitoringJobDefinitionName: __expectString,
    });
};
const de_MonitoringJobDefinitionSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringJobDefinitionSummary(entry, context);
    });
    return retVal;
};
const de_MonitoringJsonDatasetFormat = (output, context) => {
    return take(output, {
        Line: __expectBoolean,
    });
};
const de_MonitoringNetworkConfig = (output, context) => {
    return take(output, {
        EnableInterContainerTrafficEncryption: __expectBoolean,
        EnableNetworkIsolation: __expectBoolean,
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_MonitoringOutput = (output, context) => {
    return take(output, {
        S3Output: (_) => de_MonitoringS3Output(_, context),
    });
};
const de_MonitoringOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        MonitoringOutputs: (_) => de_MonitoringOutputs(_, context),
    });
};
const de_MonitoringOutputs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringOutput(entry, context);
    });
    return retVal;
};
const de_MonitoringParquetDatasetFormat = (output, context) => {
    return take(output, {});
};
const de_MonitoringResources = (output, context) => {
    return take(output, {
        ClusterConfig: (_) => de_MonitoringClusterConfig(_, context),
    });
};
const de_MonitoringS3Output = (output, context) => {
    return take(output, {
        LocalPath: __expectString,
        S3UploadMode: __expectString,
        S3Uri: __expectString,
    });
};
const de_MonitoringSchedule = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointName: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastMonitoringExecutionSummary: (_) => de_MonitoringExecutionSummary(_, context),
        MonitoringScheduleArn: __expectString,
        MonitoringScheduleConfig: (_) => de_MonitoringScheduleConfig(_, context),
        MonitoringScheduleName: __expectString,
        MonitoringScheduleStatus: __expectString,
        MonitoringType: __expectString,
        Tags: (_) => de_TagList(_, context),
    });
};
const de_MonitoringScheduleConfig = (output, context) => {
    return take(output, {
        MonitoringJobDefinition: (_) => de_MonitoringJobDefinition(_, context),
        MonitoringJobDefinitionName: __expectString,
        MonitoringType: __expectString,
        ScheduleConfig: (_) => de_ScheduleConfig(_, context),
    });
};
const de_MonitoringScheduleList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringSchedule(entry, context);
    });
    return retVal;
};
const de_MonitoringScheduleSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        EndpointName: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringJobDefinitionName: __expectString,
        MonitoringScheduleArn: __expectString,
        MonitoringScheduleName: __expectString,
        MonitoringScheduleStatus: __expectString,
        MonitoringType: __expectString,
    });
};
const de_MonitoringScheduleSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_MonitoringScheduleSummary(entry, context);
    });
    return retVal;
};
const de_MonitoringStatisticsResource = (output, context) => {
    return take(output, {
        S3Uri: __expectString,
    });
};
const de_MonitoringStoppingCondition = (output, context) => {
    return take(output, {
        MaxRuntimeInSeconds: __expectInt32,
    });
};
const de_MultiModelConfig = (output, context) => {
    return take(output, {
        ModelCacheSetting: __expectString,
    });
};
const de_NeoVpcConfig = (output, context) => {
    return take(output, {
        SecurityGroupIds: (_) => de_NeoVpcSecurityGroupIds(_, context),
        Subnets: (_) => de_NeoVpcSubnets(_, context),
    });
};
const de_NeoVpcSecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_NeoVpcSubnets = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_NetworkConfig = (output, context) => {
    return take(output, {
        EnableInterContainerTrafficEncryption: __expectBoolean,
        EnableNetworkIsolation: __expectBoolean,
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_NotebookInstanceAcceleratorTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_NotebookInstanceLifecycleConfigList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_NotebookInstanceLifecycleHook(entry, context);
    });
    return retVal;
};
const de_NotebookInstanceLifecycleConfigSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        NotebookInstanceLifecycleConfigArn: __expectString,
        NotebookInstanceLifecycleConfigName: __expectString,
    });
};
const de_NotebookInstanceLifecycleConfigSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_NotebookInstanceLifecycleConfigSummary(entry, context);
    });
    return retVal;
};
const de_NotebookInstanceLifecycleHook = (output, context) => {
    return take(output, {
        Content: __expectString,
    });
};
const de_NotebookInstanceSummary = (output, context) => {
    return take(output, {
        AdditionalCodeRepositories: (_) => de_AdditionalCodeRepositoryNamesOrUrls(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DefaultCodeRepository: __expectString,
        InstanceType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        NotebookInstanceArn: __expectString,
        NotebookInstanceLifecycleConfigName: __expectString,
        NotebookInstanceName: __expectString,
        NotebookInstanceStatus: __expectString,
        Url: __expectString,
    });
};
const de_NotebookInstanceSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_NotebookInstanceSummary(entry, context);
    });
    return retVal;
};
const de_NotificationConfiguration = (output, context) => {
    return take(output, {
        NotificationTopicArn: __expectString,
    });
};
const de_ObjectiveStatusCounters = (output, context) => {
    return take(output, {
        Failed: __expectInt32,
        Pending: __expectInt32,
        Succeeded: __expectInt32,
    });
};
const de_OfflineStoreConfig = (output, context) => {
    return take(output, {
        DataCatalogConfig: (_) => de_DataCatalogConfig(_, context),
        DisableGlueTableCreation: __expectBoolean,
        S3StorageConfig: (_) => de_S3StorageConfig(_, context),
        TableFormat: __expectString,
    });
};
const de_OfflineStoreStatus = (output, context) => {
    return take(output, {
        BlockedReason: __expectString,
        Status: __expectString,
    });
};
const de_OidcConfigForResponse = (output, context) => {
    return take(output, {
        AuthenticationRequestExtraParams: (_) => de_AuthenticationRequestExtraParams(_, context),
        AuthorizationEndpoint: __expectString,
        ClientId: __expectString,
        Issuer: __expectString,
        JwksUri: __expectString,
        LogoutEndpoint: __expectString,
        Scope: __expectString,
        TokenEndpoint: __expectString,
        UserInfoEndpoint: __expectString,
    });
};
const de_OidcMemberDefinition = (output, context) => {
    return take(output, {
        Groups: (_) => de_Groups(_, context),
    });
};
const de_OnlineStoreConfig = (output, context) => {
    return take(output, {
        EnableOnlineStore: __expectBoolean,
        SecurityConfig: (_) => de_OnlineStoreSecurityConfig(_, context),
        StorageType: __expectString,
        TtlDuration: (_) => de_TtlDuration(_, context),
    });
};
const de_OnlineStoreSecurityConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
    });
};
const de_OnStartDeepHealthChecks = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_OptimizationConfig = (output, context) => {
    if (output.ModelCompilationConfig != null) {
        return {
            ModelCompilationConfig: de_ModelCompilationConfig(output.ModelCompilationConfig, context),
        };
    }
    if (output.ModelQuantizationConfig != null) {
        return {
            ModelQuantizationConfig: de_ModelQuantizationConfig(output.ModelQuantizationConfig, context),
        };
    }
    if (output.ModelShardingConfig != null) {
        return {
            ModelShardingConfig: de_ModelShardingConfig(output.ModelShardingConfig, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_OptimizationConfigs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_OptimizationConfig(__expectUnion(entry), context);
    });
    return retVal;
};
const de_OptimizationJobEnvironmentVariables = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_OptimizationJobModelSource = (output, context) => {
    return take(output, {
        S3: (_) => de_OptimizationJobModelSourceS3(_, context),
    });
};
const de_OptimizationJobModelSourceS3 = (output, context) => {
    return take(output, {
        ModelAccessConfig: (_) => de_OptimizationModelAccessConfig(_, context),
        S3Uri: __expectString,
    });
};
const de_OptimizationJobOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        S3OutputLocation: __expectString,
    });
};
const de_OptimizationJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_OptimizationJobSummary(entry, context);
    });
    return retVal;
};
const de_OptimizationJobSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DeploymentInstanceType: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OptimizationEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OptimizationJobArn: __expectString,
        OptimizationJobName: __expectString,
        OptimizationJobStatus: __expectString,
        OptimizationStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OptimizationTypes: (_) => de_OptimizationTypes(_, context),
    });
};
const de_OptimizationModelAccessConfig = (output, context) => {
    return take(output, {
        AcceptEula: __expectBoolean,
    });
};
const de_OptimizationOutput = (output, context) => {
    return take(output, {
        RecommendedInferenceImage: __expectString,
    });
};
const de_OptimizationTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_OptimizationVpcConfig = (output, context) => {
    return take(output, {
        SecurityGroupIds: (_) => de_OptimizationVpcSecurityGroupIds(_, context),
        Subnets: (_) => de_OptimizationVpcSubnets(_, context),
    });
};
const de_OptimizationVpcSecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_OptimizationVpcSubnets = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_OutputConfig = (output, context) => {
    return take(output, {
        CompilerOptions: __expectString,
        KmsKeyId: __expectString,
        S3OutputLocation: __expectString,
        TargetDevice: __expectString,
        TargetPlatform: (_) => de_TargetPlatform(_, context),
    });
};
const de_OutputDataConfig = (output, context) => {
    return take(output, {
        CompressionType: __expectString,
        KmsKeyId: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_OutputParameter = (output, context) => {
    return take(output, {
        Name: __expectString,
        Value: __expectString,
    });
};
const de_OutputParameterList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_OutputParameter(entry, context);
    });
    return retVal;
};
const de_OwnershipSettings = (output, context) => {
    return take(output, {
        OwnerUserProfileName: __expectString,
    });
};
const de_OwnershipSettingsSummary = (output, context) => {
    return take(output, {
        OwnerUserProfileName: __expectString,
    });
};
const de_ParallelismConfiguration = (output, context) => {
    return take(output, {
        MaxParallelExecutionSteps: __expectInt32,
    });
};
const de_Parameter = (output, context) => {
    return take(output, {
        Name: __expectString,
        Value: __expectString,
    });
};
const de_ParameterList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Parameter(entry, context);
    });
    return retVal;
};
const de_ParameterRange = (output, context) => {
    return take(output, {
        CategoricalParameterRangeSpecification: (_) => de_CategoricalParameterRangeSpecification(_, context),
        ContinuousParameterRangeSpecification: (_) => de_ContinuousParameterRangeSpecification(_, context),
        IntegerParameterRangeSpecification: (_) => de_IntegerParameterRangeSpecification(_, context),
    });
};
const de_ParameterRanges = (output, context) => {
    return take(output, {
        AutoParameters: (_) => de_AutoParameters(_, context),
        CategoricalParameterRanges: (_) => de_CategoricalParameterRanges(_, context),
        ContinuousParameterRanges: (_) => de_ContinuousParameterRanges(_, context),
        IntegerParameterRanges: (_) => de_IntegerParameterRanges(_, context),
    });
};
const de_ParameterValues = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_Parent = (output, context) => {
    return take(output, {
        ExperimentName: __expectString,
        TrialName: __expectString,
    });
};
const de_ParentHyperParameterTuningJob = (output, context) => {
    return take(output, {
        HyperParameterTuningJobName: __expectString,
    });
};
const de_ParentHyperParameterTuningJobs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ParentHyperParameterTuningJob(entry, context);
    });
    return retVal;
};
const de_Parents = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Parent(entry, context);
    });
    return retVal;
};
const de_PartnerAppAdminUserList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_PartnerAppArguments = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_PartnerAppConfig = (output, context) => {
    return take(output, {
        AdminUsers: (_) => de_PartnerAppAdminUserList(_, context),
        Arguments: (_) => de_PartnerAppArguments(_, context),
    });
};
const de_PartnerAppMaintenanceConfig = (output, context) => {
    return take(output, {
        MaintenanceWindowStart: __expectString,
    });
};
const de_PartnerAppSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PartnerAppSummary(entry, context);
    });
    return retVal;
};
const de_PartnerAppSummary = (output, context) => {
    return take(output, {
        Arn: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Name: __expectString,
        Status: __expectString,
        Type: __expectString,
    });
};
const de_PendingDeploymentSummary = (output, context) => {
    return take(output, {
        EndpointConfigName: __expectString,
        ProductionVariants: (_) => de_PendingProductionVariantSummaryList(_, context),
        ShadowProductionVariants: (_) => de_PendingProductionVariantSummaryList(_, context),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_PendingProductionVariantSummary = (output, context) => {
    return take(output, {
        AcceleratorType: __expectString,
        CurrentInstanceCount: __expectInt32,
        CurrentServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
        CurrentWeight: __limitedParseFloat32,
        DeployedImages: (_) => de_DeployedImages(_, context),
        DesiredInstanceCount: __expectInt32,
        DesiredServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
        DesiredWeight: __limitedParseFloat32,
        InstanceType: __expectString,
        ManagedInstanceScaling: (_) => de_ProductionVariantManagedInstanceScaling(_, context),
        RoutingConfig: (_) => de_ProductionVariantRoutingConfig(_, context),
        VariantName: __expectString,
        VariantStatus: (_) => de_ProductionVariantStatusList(_, context),
    });
};
const de_PendingProductionVariantSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PendingProductionVariantSummary(entry, context);
    });
    return retVal;
};
const de_Phase = (output, context) => {
    return take(output, {
        DurationInSeconds: __expectInt32,
        InitialNumberOfUsers: __expectInt32,
        SpawnRate: __expectInt32,
    });
};
const de_Phases = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Phase(entry, context);
    });
    return retVal;
};
const de_Pipeline = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastRunTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ParallelismConfiguration: (_) => de_ParallelismConfiguration(_, context),
        PipelineArn: __expectString,
        PipelineDescription: __expectString,
        PipelineDisplayName: __expectString,
        PipelineName: __expectString,
        PipelineStatus: __expectString,
        RoleArn: __expectString,
        Tags: (_) => de_TagList(_, context),
    });
};
const de_PipelineExecution = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ParallelismConfiguration: (_) => de_ParallelismConfiguration(_, context),
        PipelineArn: __expectString,
        PipelineExecutionArn: __expectString,
        PipelineExecutionDescription: __expectString,
        PipelineExecutionDisplayName: __expectString,
        PipelineExecutionStatus: __expectString,
        PipelineExperimentConfig: (_) => de_PipelineExperimentConfig(_, context),
        PipelineParameters: (_) => de_ParameterList(_, context),
        SelectiveExecutionConfig: (_) => de_SelectiveExecutionConfig(_, context),
    });
};
const de_PipelineExecutionStep = (output, context) => {
    return take(output, {
        AttemptCount: __expectInt32,
        CacheHitResult: (_) => de_CacheHitResult(_, context),
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        Metadata: (_) => de_PipelineExecutionStepMetadata(_, context),
        SelectiveExecutionResult: (_) => de_SelectiveExecutionResult(_, context),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StepDescription: __expectString,
        StepDisplayName: __expectString,
        StepName: __expectString,
        StepStatus: __expectString,
    });
};
const de_PipelineExecutionStepList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PipelineExecutionStep(entry, context);
    });
    return retVal;
};
const de_PipelineExecutionStepMetadata = (output, context) => {
    return take(output, {
        AutoMLJob: (_) => de_AutoMLJobStepMetadata(_, context),
        Callback: (_) => de_CallbackStepMetadata(_, context),
        ClarifyCheck: (_) => de_ClarifyCheckStepMetadata(_, context),
        Condition: (_) => de_ConditionStepMetadata(_, context),
        EMR: (_) => de_EMRStepMetadata(_, context),
        Endpoint: (_) => de_EndpointStepMetadata(_, context),
        EndpointConfig: (_) => de_EndpointConfigStepMetadata(_, context),
        Fail: (_) => de_FailStepMetadata(_, context),
        Lambda: (_) => de_LambdaStepMetadata(_, context),
        Model: (_) => de_ModelStepMetadata(_, context),
        ProcessingJob: (_) => de_ProcessingJobStepMetadata(_, context),
        QualityCheck: (_) => de_QualityCheckStepMetadata(_, context),
        RegisterModel: (_) => de_RegisterModelStepMetadata(_, context),
        TrainingJob: (_) => de_TrainingJobStepMetadata(_, context),
        TransformJob: (_) => de_TransformJobStepMetadata(_, context),
        TuningJob: (_) => de_TuningJobStepMetaData(_, context),
    });
};
const de_PipelineExecutionSummary = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
        PipelineExecutionDescription: __expectString,
        PipelineExecutionDisplayName: __expectString,
        PipelineExecutionFailureReason: __expectString,
        PipelineExecutionStatus: __expectString,
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_PipelineExecutionSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PipelineExecutionSummary(entry, context);
    });
    return retVal;
};
const de_PipelineExperimentConfig = (output, context) => {
    return take(output, {
        ExperimentName: __expectString,
        TrialName: __expectString,
    });
};
const de_PipelineSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastExecutionTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        PipelineArn: __expectString,
        PipelineDescription: __expectString,
        PipelineDisplayName: __expectString,
        PipelineName: __expectString,
        RoleArn: __expectString,
    });
};
const de_PipelineSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PipelineSummary(entry, context);
    });
    return retVal;
};
const de_PredefinedMetricSpecification = (output, context) => {
    return take(output, {
        PredefinedMetricType: __expectString,
    });
};
const de_PriorityClass = (output, context) => {
    return take(output, {
        Name: __expectString,
        Weight: __expectInt32,
    });
};
const de_PriorityClassList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PriorityClass(entry, context);
    });
    return retVal;
};
const de_ProcessingClusterConfig = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
        VolumeKmsKeyId: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_ProcessingEnvironmentMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_ProcessingFeatureStoreOutput = (output, context) => {
    return take(output, {
        FeatureGroupName: __expectString,
    });
};
const de_ProcessingInput = (output, context) => {
    return take(output, {
        AppManaged: __expectBoolean,
        DatasetDefinition: (_) => de_DatasetDefinition(_, context),
        InputName: __expectString,
        S3Input: (_) => de_ProcessingS3Input(_, context),
    });
};
const de_ProcessingInputs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProcessingInput(entry, context);
    });
    return retVal;
};
const de_ProcessingJob = (output, context) => {
    return take(output, {
        AppSpecification: (_) => de_AppSpecification(_, context),
        AutoMLJobArn: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Environment: (_) => de_ProcessingEnvironmentMap(_, context),
        ExitMessage: __expectString,
        ExperimentConfig: (_) => de_ExperimentConfig(_, context),
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MonitoringScheduleArn: __expectString,
        NetworkConfig: (_) => de_NetworkConfig(_, context),
        ProcessingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProcessingInputs: (_) => de_ProcessingInputs(_, context),
        ProcessingJobArn: __expectString,
        ProcessingJobName: __expectString,
        ProcessingJobStatus: __expectString,
        ProcessingOutputConfig: (_) => de_ProcessingOutputConfig(_, context),
        ProcessingResources: (_) => de_ProcessingResources(_, context),
        ProcessingStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RoleArn: __expectString,
        StoppingCondition: (_) => de_ProcessingStoppingCondition(_, context),
        Tags: (_) => de_TagList(_, context),
        TrainingJobArn: __expectString,
    });
};
const de_ProcessingJobStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_ProcessingJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProcessingJobSummary(entry, context);
    });
    return retVal;
};
const de_ProcessingJobSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ExitMessage: __expectString,
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProcessingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProcessingJobArn: __expectString,
        ProcessingJobName: __expectString,
        ProcessingJobStatus: __expectString,
    });
};
const de_ProcessingOutput = (output, context) => {
    return take(output, {
        AppManaged: __expectBoolean,
        FeatureStoreOutput: (_) => de_ProcessingFeatureStoreOutput(_, context),
        OutputName: __expectString,
        S3Output: (_) => de_ProcessingS3Output(_, context),
    });
};
const de_ProcessingOutputConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        Outputs: (_) => de_ProcessingOutputs(_, context),
    });
};
const de_ProcessingOutputs = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProcessingOutput(entry, context);
    });
    return retVal;
};
const de_ProcessingResources = (output, context) => {
    return take(output, {
        ClusterConfig: (_) => de_ProcessingClusterConfig(_, context),
    });
};
const de_ProcessingS3Input = (output, context) => {
    return take(output, {
        LocalPath: __expectString,
        S3CompressionType: __expectString,
        S3DataDistributionType: __expectString,
        S3DataType: __expectString,
        S3InputMode: __expectString,
        S3Uri: __expectString,
    });
};
const de_ProcessingS3Output = (output, context) => {
    return take(output, {
        LocalPath: __expectString,
        S3UploadMode: __expectString,
        S3Uri: __expectString,
    });
};
const de_ProcessingStoppingCondition = (output, context) => {
    return take(output, {
        MaxRuntimeInSeconds: __expectInt32,
    });
};
const de_ProductionVariant = (output, context) => {
    return take(output, {
        AcceleratorType: __expectString,
        ContainerStartupHealthCheckTimeoutInSeconds: __expectInt32,
        CoreDumpConfig: (_) => de_ProductionVariantCoreDumpConfig(_, context),
        EnableSSMAccess: __expectBoolean,
        InferenceAmiVersion: __expectString,
        InitialInstanceCount: __expectInt32,
        InitialVariantWeight: __limitedParseFloat32,
        InstanceType: __expectString,
        ManagedInstanceScaling: (_) => de_ProductionVariantManagedInstanceScaling(_, context),
        ModelDataDownloadTimeoutInSeconds: __expectInt32,
        ModelName: __expectString,
        RoutingConfig: (_) => de_ProductionVariantRoutingConfig(_, context),
        ServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
        VariantName: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_ProductionVariantCoreDumpConfig = (output, context) => {
    return take(output, {
        DestinationS3Uri: __expectString,
        KmsKeyId: __expectString,
    });
};
const de_ProductionVariantList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProductionVariant(entry, context);
    });
    return retVal;
};
const de_ProductionVariantManagedInstanceScaling = (output, context) => {
    return take(output, {
        MaxInstanceCount: __expectInt32,
        MinInstanceCount: __expectInt32,
        Status: __expectString,
    });
};
const de_ProductionVariantRoutingConfig = (output, context) => {
    return take(output, {
        RoutingStrategy: __expectString,
    });
};
const de_ProductionVariantServerlessConfig = (output, context) => {
    return take(output, {
        MaxConcurrency: __expectInt32,
        MemorySizeInMB: __expectInt32,
        ProvisionedConcurrency: __expectInt32,
    });
};
const de_ProductionVariantStatus = (output, context) => {
    return take(output, {
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        StatusMessage: __expectString,
    });
};
const de_ProductionVariantStatusList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProductionVariantStatus(entry, context);
    });
    return retVal;
};
const de_ProductionVariantSummary = (output, context) => {
    return take(output, {
        CurrentInstanceCount: __expectInt32,
        CurrentServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
        CurrentWeight: __limitedParseFloat32,
        DeployedImages: (_) => de_DeployedImages(_, context),
        DesiredInstanceCount: __expectInt32,
        DesiredServerlessConfig: (_) => de_ProductionVariantServerlessConfig(_, context),
        DesiredWeight: __limitedParseFloat32,
        ManagedInstanceScaling: (_) => de_ProductionVariantManagedInstanceScaling(_, context),
        RoutingConfig: (_) => de_ProductionVariantRoutingConfig(_, context),
        VariantName: __expectString,
        VariantStatus: (_) => de_ProductionVariantStatusList(_, context),
    });
};
const de_ProductionVariantSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProductionVariantSummary(entry, context);
    });
    return retVal;
};
const de_ProductListings = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ProfilerConfig = (output, context) => {
    return take(output, {
        DisableProfiler: __expectBoolean,
        ProfilingIntervalInMilliseconds: __expectLong,
        ProfilingParameters: (_) => de_ProfilingParameters(_, context),
        S3OutputPath: __expectString,
    });
};
const de_ProfilerRuleConfiguration = (output, context) => {
    return take(output, {
        InstanceType: __expectString,
        LocalPath: __expectString,
        RuleConfigurationName: __expectString,
        RuleEvaluatorImage: __expectString,
        RuleParameters: (_) => de_RuleParameters(_, context),
        S3OutputPath: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_ProfilerRuleConfigurations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProfilerRuleConfiguration(entry, context);
    });
    return retVal;
};
const de_ProfilerRuleEvaluationStatus = (output, context) => {
    return take(output, {
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RuleConfigurationName: __expectString,
        RuleEvaluationJobArn: __expectString,
        RuleEvaluationStatus: __expectString,
        StatusDetails: __expectString,
    });
};
const de_ProfilerRuleEvaluationStatuses = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProfilerRuleEvaluationStatus(entry, context);
    });
    return retVal;
};
const de_ProfilingParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_Project = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProjectArn: __expectString,
        ProjectDescription: __expectString,
        ProjectId: __expectString,
        ProjectName: __expectString,
        ProjectStatus: __expectString,
        ServiceCatalogProvisionedProductDetails: (_) => de_ServiceCatalogProvisionedProductDetails(_, context),
        ServiceCatalogProvisioningDetails: (_) => de_ServiceCatalogProvisioningDetails(_, context),
        Tags: (_) => de_TagList(_, context),
    });
};
const de_ProjectSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ProjectArn: __expectString,
        ProjectDescription: __expectString,
        ProjectId: __expectString,
        ProjectName: __expectString,
        ProjectStatus: __expectString,
    });
};
const de_ProjectSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProjectSummary(entry, context);
    });
    return retVal;
};
const de_PropertyNameSuggestion = (output, context) => {
    return take(output, {
        PropertyName: __expectString,
    });
};
const de_PropertyNameSuggestionList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_PropertyNameSuggestion(entry, context);
    });
    return retVal;
};
const de_ProvisioningParameter = (output, context) => {
    return take(output, {
        Key: __expectString,
        Value: __expectString,
    });
};
const de_ProvisioningParameters = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ProvisioningParameter(entry, context);
    });
    return retVal;
};
const de_PublicWorkforceTaskPrice = (output, context) => {
    return take(output, {
        AmountInUsd: (_) => de_USD(_, context),
    });
};
const de_PutModelPackageGroupPolicyOutput = (output, context) => {
    return take(output, {
        ModelPackageGroupArn: __expectString,
    });
};
const de_QualityCheckStepMetadata = (output, context) => {
    return take(output, {
        BaselineUsedForDriftCheckConstraints: __expectString,
        BaselineUsedForDriftCheckStatistics: __expectString,
        CalculatedBaselineConstraints: __expectString,
        CalculatedBaselineStatistics: __expectString,
        CheckJobArn: __expectString,
        CheckType: __expectString,
        ModelPackageGroupName: __expectString,
        RegisterNewBaseline: __expectBoolean,
        SkipCheck: __expectBoolean,
        ViolationReport: __expectString,
    });
};
const de_QueryLineageResponse = (output, context) => {
    return take(output, {
        Edges: (_) => de_Edges(_, context),
        NextToken: __expectString,
        Vertices: (_) => de_Vertices(_, context),
    });
};
const de_RealTimeInferenceConfig = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
    });
};
const de_RealtimeInferenceInstanceTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RealTimeInferenceRecommendation = (output, context) => {
    return take(output, {
        Environment: (_) => de_EnvironmentMap(_, context),
        InstanceType: __expectString,
        RecommendationId: __expectString,
    });
};
const de_RealTimeInferenceRecommendations = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_RealTimeInferenceRecommendation(entry, context);
    });
    return retVal;
};
const de_RecommendationJobContainerConfig = (output, context) => {
    return take(output, {
        DataInputConfig: __expectString,
        Domain: __expectString,
        Framework: __expectString,
        FrameworkVersion: __expectString,
        NearestModelName: __expectString,
        PayloadConfig: (_) => de_RecommendationJobPayloadConfig(_, context),
        SupportedEndpointType: __expectString,
        SupportedInstanceTypes: (_) => de_RecommendationJobSupportedInstanceTypes(_, context),
        SupportedResponseMIMETypes: (_) => de_RecommendationJobSupportedResponseMIMETypes(_, context),
        Task: __expectString,
    });
};
const de_RecommendationJobInferenceBenchmark = (output, context) => {
    return take(output, {
        EndpointConfiguration: (_) => de_EndpointOutputConfiguration(_, context),
        EndpointMetrics: (_) => de_InferenceMetrics(_, context),
        FailureReason: __expectString,
        InvocationEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InvocationStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Metrics: (_) => de_RecommendationMetrics(_, context),
        ModelConfiguration: (_) => de_ModelConfiguration(_, context),
    });
};
const de_RecommendationJobInputConfig = (output, context) => {
    return take(output, {
        ContainerConfig: (_) => de_RecommendationJobContainerConfig(_, context),
        EndpointConfigurations: (_) => de_EndpointInputConfigurations(_, context),
        Endpoints: (_) => de_Endpoints(_, context),
        JobDurationInSeconds: __expectInt32,
        ModelName: __expectString,
        ModelPackageVersionArn: __expectString,
        ResourceLimit: (_) => de_RecommendationJobResourceLimit(_, context),
        TrafficPattern: (_) => de_TrafficPattern(_, context),
        VolumeKmsKeyId: __expectString,
        VpcConfig: (_) => de_RecommendationJobVpcConfig(_, context),
    });
};
const de_RecommendationJobPayloadConfig = (output, context) => {
    return take(output, {
        SamplePayloadUrl: __expectString,
        SupportedContentTypes: (_) => de_RecommendationJobSupportedContentTypes(_, context),
    });
};
const de_RecommendationJobResourceLimit = (output, context) => {
    return take(output, {
        MaxNumberOfTests: __expectInt32,
        MaxParallelOfTests: __expectInt32,
    });
};
const de_RecommendationJobStoppingConditions = (output, context) => {
    return take(output, {
        FlatInvocations: __expectString,
        MaxInvocations: __expectInt32,
        ModelLatencyThresholds: (_) => de_ModelLatencyThresholds(_, context),
    });
};
const de_RecommendationJobSupportedContentTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RecommendationJobSupportedInstanceTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RecommendationJobSupportedResponseMIMETypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RecommendationJobVpcConfig = (output, context) => {
    return take(output, {
        SecurityGroupIds: (_) => de_RecommendationJobVpcSecurityGroupIds(_, context),
        Subnets: (_) => de_RecommendationJobVpcSubnets(_, context),
    });
};
const de_RecommendationJobVpcSecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RecommendationJobVpcSubnets = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RecommendationMetrics = (output, context) => {
    return take(output, {
        CostPerHour: __limitedParseFloat32,
        CostPerInference: __limitedParseFloat32,
        CpuUtilization: __limitedParseFloat32,
        MaxInvocations: __expectInt32,
        MemoryUtilization: __limitedParseFloat32,
        ModelLatency: __expectInt32,
        ModelSetupTime: __expectInt32,
    });
};
const de_RedshiftDatasetDefinition = (output, context) => {
    return take(output, {
        ClusterId: __expectString,
        ClusterRoleArn: __expectString,
        Database: __expectString,
        DbUser: __expectString,
        KmsKeyId: __expectString,
        OutputCompression: __expectString,
        OutputFormat: __expectString,
        OutputS3Uri: __expectString,
        QueryString: __expectString,
    });
};
const de_RegisterModelStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_RemoteDebugConfig = (output, context) => {
    return take(output, {
        EnableRemoteDebug: __expectBoolean,
    });
};
const de_RenderingError = (output, context) => {
    return take(output, {
        Code: __expectString,
        Message: __expectString,
    });
};
const de_RenderingErrorList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_RenderingError(entry, context);
    });
    return retVal;
};
const de_RenderUiTemplateResponse = (output, context) => {
    return take(output, {
        Errors: (_) => de_RenderingErrorList(_, context),
        RenderedContent: __expectString,
    });
};
const de_RepositoryAuthConfig = (output, context) => {
    return take(output, {
        RepositoryCredentialsProviderArn: __expectString,
    });
};
const de_ReservedCapacityOffering = (output, context) => {
    return take(output, {
        AvailabilityZone: __expectString,
        DurationHours: __expectLong,
        DurationMinutes: __expectLong,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_ReservedCapacityOfferings = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ReservedCapacityOffering(entry, context);
    });
    return retVal;
};
const de_ReservedCapacitySummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ReservedCapacitySummary(entry, context);
    });
    return retVal;
};
const de_ReservedCapacitySummary = (output, context) => {
    return take(output, {
        AvailabilityZone: __expectString,
        DurationHours: __expectLong,
        DurationMinutes: __expectLong,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InstanceType: __expectString,
        ReservedCapacityArn: __expectString,
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        TotalInstanceCount: __expectInt32,
    });
};
const de_ResolvedAttributes = (output, context) => {
    return take(output, {
        AutoMLJobObjective: (_) => de_AutoMLJobObjective(_, context),
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
        ProblemType: __expectString,
    });
};
const de_ResourceCatalog = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        ResourceCatalogArn: __expectString,
        ResourceCatalogName: __expectString,
    });
};
const de_ResourceCatalogList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ResourceCatalog(entry, context);
    });
    return retVal;
};
const de_ResourceConfig = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceGroups: (_) => de_InstanceGroups(_, context),
        InstanceType: __expectString,
        KeepAlivePeriodInSeconds: __expectInt32,
        TrainingPlanArn: __expectString,
        VolumeKmsKeyId: __expectString,
        VolumeSizeInGB: __expectInt32,
    });
};
const de_ResourceInUse = (output, context) => {
    return take(output, {
        Message: __expectString,
    });
};
const de_ResourceLimitExceeded = (output, context) => {
    return take(output, {
        Message: __expectString,
    });
};
const de_ResourceLimits = (output, context) => {
    return take(output, {
        MaxNumberOfTrainingJobs: __expectInt32,
        MaxParallelTrainingJobs: __expectInt32,
        MaxRuntimeInSeconds: __expectInt32,
    });
};
const de_ResourceNotFound = (output, context) => {
    return take(output, {
        Message: __expectString,
    });
};
const de_ResourceSharingConfig = (output, context) => {
    return take(output, {
        BorrowLimit: __expectInt32,
        Strategy: __expectString,
    });
};
const de_ResourceSpec = (output, context) => {
    return take(output, {
        InstanceType: __expectString,
        LifecycleConfigArn: __expectString,
        SageMakerImageArn: __expectString,
        SageMakerImageVersionAlias: __expectString,
        SageMakerImageVersionArn: __expectString,
    });
};
const de_ResponseMIMETypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_RetryPipelineExecutionResponse = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
    });
};
const de_RetryStrategy = (output, context) => {
    return take(output, {
        MaximumRetryAttempts: __expectInt32,
    });
};
const de_RollingDeploymentPolicy = (output, context) => {
    return take(output, {
        MaximumBatchSize: (_) => de_CapacitySizeConfig(_, context),
        RollbackMaximumBatchSize: (_) => de_CapacitySizeConfig(_, context),
    });
};
const de_RollingUpdatePolicy = (output, context) => {
    return take(output, {
        MaximumBatchSize: (_) => de_CapacitySize(_, context),
        MaximumExecutionTimeoutInSeconds: __expectInt32,
        RollbackMaximumBatchSize: (_) => de_CapacitySize(_, context),
        WaitIntervalInSeconds: __expectInt32,
    });
};
const de_RSessionAppSettings = (output, context) => {
    return take(output, {
        CustomImages: (_) => de_CustomImages(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
    });
};
const de_RStudioServerProAppSettings = (output, context) => {
    return take(output, {
        AccessStatus: __expectString,
        UserGroup: __expectString,
    });
};
const de_RStudioServerProDomainSettings = (output, context) => {
    return take(output, {
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
        DomainExecutionRoleArn: __expectString,
        RStudioConnectUrl: __expectString,
        RStudioPackageManagerUrl: __expectString,
    });
};
const de_RuleParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_S3DataSource = (output, context) => {
    return take(output, {
        AttributeNames: (_) => de_AttributeNames(_, context),
        HubAccessConfig: (_) => de_HubAccessConfig(_, context),
        InstanceGroupNames: (_) => de_InstanceGroupNames(_, context),
        ModelAccessConfig: (_) => de_ModelAccessConfig(_, context),
        S3DataDistributionType: __expectString,
        S3DataType: __expectString,
        S3Uri: __expectString,
    });
};
const de_S3ModelDataSource = (output, context) => {
    return take(output, {
        CompressionType: __expectString,
        ETag: __expectString,
        HubAccessConfig: (_) => de_InferenceHubAccessConfig(_, context),
        ManifestEtag: __expectString,
        ManifestS3Uri: __expectString,
        ModelAccessConfig: (_) => de_ModelAccessConfig(_, context),
        S3DataType: __expectString,
        S3Uri: __expectString,
    });
};
const de_S3Presign = (output, context) => {
    return take(output, {
        IamPolicyConstraints: (_) => de_IamPolicyConstraints(_, context),
    });
};
const de_S3StorageConfig = (output, context) => {
    return take(output, {
        KmsKeyId: __expectString,
        ResolvedOutputS3Uri: __expectString,
        S3Uri: __expectString,
    });
};
const de_SageMakerImageVersionAliases = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_SageMakerResourceNames = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_ScalingPolicies = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ScalingPolicy(__expectUnion(entry), context);
    });
    return retVal;
};
const de_ScalingPolicy = (output, context) => {
    if (output.TargetTracking != null) {
        return {
            TargetTracking: de_TargetTrackingScalingPolicyConfiguration(output.TargetTracking, context),
        };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_ScalingPolicyMetric = (output, context) => {
    return take(output, {
        InvocationsPerInstance: __expectInt32,
        ModelLatency: __expectInt32,
    });
};
const de_ScalingPolicyObjective = (output, context) => {
    return take(output, {
        MaxInvocationsPerMinute: __expectInt32,
        MinInvocationsPerMinute: __expectInt32,
    });
};
const de_ScheduleConfig = (output, context) => {
    return take(output, {
        DataAnalysisEndTime: __expectString,
        DataAnalysisStartTime: __expectString,
        ScheduleExpression: __expectString,
    });
};
const de_ScheduledUpdateConfig = (output, context) => {
    return take(output, {
        DeploymentConfig: (_) => de_DeploymentConfiguration(_, context),
        ScheduleExpression: __expectString,
    });
};
const de_SchedulerConfig = (output, context) => {
    return take(output, {
        FairShare: __expectString,
        PriorityClasses: (_) => de_PriorityClassList(_, context),
    });
};
const de_SearchRecord = (output, context) => {
    return take(output, {
        Endpoint: (_) => de_Endpoint(_, context),
        Experiment: (_) => de_Experiment(_, context),
        FeatureGroup: (_) => de_FeatureGroup(_, context),
        FeatureMetadata: (_) => de_FeatureMetadata(_, context),
        HyperParameterTuningJob: (_) => de_HyperParameterTuningJobSearchEntity(_, context),
        Model: (_) => de_ModelDashboardModel(_, context),
        ModelCard: (_) => de_ModelCard(_, context),
        ModelPackage: (_) => de_ModelPackage(_, context),
        ModelPackageGroup: (_) => de_ModelPackageGroup(_, context),
        Pipeline: (_) => de_Pipeline(_, context),
        PipelineExecution: (_) => de_PipelineExecution(_, context),
        Project: (_) => de_Project(_, context),
        TrainingJob: (_) => de_TrainingJob(_, context),
        Trial: (_) => de_Trial(_, context),
        TrialComponent: (_) => de_TrialComponent(_, context),
    });
};
const de_SearchResponse = (output, context) => {
    return take(output, {
        NextToken: __expectString,
        Results: (_) => de_SearchResultsList(_, context),
        TotalHits: (_) => de_TotalHits(_, context),
    });
};
const de_SearchResultsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SearchRecord(entry, context);
    });
    return retVal;
};
const de_SearchTrainingPlanOfferingsResponse = (output, context) => {
    return take(output, {
        TrainingPlanOfferings: (_) => de_TrainingPlanOfferings(_, context),
    });
};
const de_SecondaryStatusTransition = (output, context) => {
    return take(output, {
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        StatusMessage: __expectString,
    });
};
const de_SecondaryStatusTransitions = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SecondaryStatusTransition(entry, context);
    });
    return retVal;
};
const de_SecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_SelectedStep = (output, context) => {
    return take(output, {
        StepName: __expectString,
    });
};
const de_SelectedStepList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SelectedStep(entry, context);
    });
    return retVal;
};
const de_SelectiveExecutionConfig = (output, context) => {
    return take(output, {
        SelectedSteps: (_) => de_SelectedStepList(_, context),
        SourcePipelineExecutionArn: __expectString,
    });
};
const de_SelectiveExecutionResult = (output, context) => {
    return take(output, {
        SourcePipelineExecutionArn: __expectString,
    });
};
const de_SendPipelineExecutionStepFailureResponse = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
    });
};
const de_SendPipelineExecutionStepSuccessResponse = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
    });
};
const de_ServiceCatalogProvisionedProductDetails = (output, context) => {
    return take(output, {
        ProvisionedProductId: __expectString,
        ProvisionedProductStatusMessage: __expectString,
    });
};
const de_ServiceCatalogProvisioningDetails = (output, context) => {
    return take(output, {
        PathId: __expectString,
        ProductId: __expectString,
        ProvisioningArtifactId: __expectString,
        ProvisioningParameters: (_) => de_ProvisioningParameters(_, context),
    });
};
const de_ShadowModeConfig = (output, context) => {
    return take(output, {
        ShadowModelVariants: (_) => de_ShadowModelVariantConfigList(_, context),
        SourceModelVariantName: __expectString,
    });
};
const de_ShadowModelVariantConfig = (output, context) => {
    return take(output, {
        SamplingPercentage: __expectInt32,
        ShadowModelVariantName: __expectString,
    });
};
const de_ShadowModelVariantConfigList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_ShadowModelVariantConfig(entry, context);
    });
    return retVal;
};
const de_SharingSettings = (output, context) => {
    return take(output, {
        NotebookOutputOption: __expectString,
        S3KmsKeyId: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_ShuffleConfig = (output, context) => {
    return take(output, {
        Seed: __expectLong,
    });
};
const de_SourceAlgorithm = (output, context) => {
    return take(output, {
        AlgorithmName: __expectString,
        ModelDataETag: __expectString,
        ModelDataSource: (_) => de_ModelDataSource(_, context),
        ModelDataUrl: __expectString,
    });
};
const de_SourceAlgorithmList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SourceAlgorithm(entry, context);
    });
    return retVal;
};
const de_SourceAlgorithmSpecification = (output, context) => {
    return take(output, {
        SourceAlgorithms: (_) => de_SourceAlgorithmList(_, context),
    });
};
const de_SourceIpConfig = (output, context) => {
    return take(output, {
        Cidrs: (_) => de_Cidrs(_, context),
    });
};
const de_SpaceAppLifecycleManagement = (output, context) => {
    return take(output, {
        IdleSettings: (_) => de_SpaceIdleSettings(_, context),
    });
};
const de_SpaceCodeEditorAppSettings = (output, context) => {
    return take(output, {
        AppLifecycleManagement: (_) => de_SpaceAppLifecycleManagement(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
    });
};
const de_SpaceDetails = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainId: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OwnershipSettingsSummary: (_) => de_OwnershipSettingsSummary(_, context),
        SpaceDisplayName: __expectString,
        SpaceName: __expectString,
        SpaceSettingsSummary: (_) => de_SpaceSettingsSummary(_, context),
        SpaceSharingSettingsSummary: (_) => de_SpaceSharingSettingsSummary(_, context),
        Status: __expectString,
    });
};
const de_SpaceIdleSettings = (output, context) => {
    return take(output, {
        IdleTimeoutInMinutes: __expectInt32,
    });
};
const de_SpaceJupyterLabAppSettings = (output, context) => {
    return take(output, {
        AppLifecycleManagement: (_) => de_SpaceAppLifecycleManagement(_, context),
        CodeRepositories: (_) => de_CodeRepositories(_, context),
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
    });
};
const de_SpaceList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SpaceDetails(entry, context);
    });
    return retVal;
};
const de_SpaceSettings = (output, context) => {
    return take(output, {
        AppType: __expectString,
        CodeEditorAppSettings: (_) => de_SpaceCodeEditorAppSettings(_, context),
        CustomFileSystems: (_) => de_CustomFileSystems(_, context),
        JupyterLabAppSettings: (_) => de_SpaceJupyterLabAppSettings(_, context),
        JupyterServerAppSettings: (_) => de_JupyterServerAppSettings(_, context),
        KernelGatewayAppSettings: (_) => de_KernelGatewayAppSettings(_, context),
        SpaceManagedResources: __expectString,
        SpaceStorageSettings: (_) => de_SpaceStorageSettings(_, context),
    });
};
const de_SpaceSettingsSummary = (output, context) => {
    return take(output, {
        AppType: __expectString,
        SpaceStorageSettings: (_) => de_SpaceStorageSettings(_, context),
    });
};
const de_SpaceSharingSettings = (output, context) => {
    return take(output, {
        SharingType: __expectString,
    });
};
const de_SpaceSharingSettingsSummary = (output, context) => {
    return take(output, {
        SharingType: __expectString,
    });
};
const de_SpaceStorageSettings = (output, context) => {
    return take(output, {
        EbsStorageSettings: (_) => de_EbsStorageSettings(_, context),
    });
};
const de_Stairs = (output, context) => {
    return take(output, {
        DurationInSeconds: __expectInt32,
        NumberOfSteps: __expectInt32,
        UsersPerStep: __expectInt32,
    });
};
const de_StartInferenceExperimentResponse = (output, context) => {
    return take(output, {
        InferenceExperimentArn: __expectString,
    });
};
const de_StartMlflowTrackingServerResponse = (output, context) => {
    return take(output, {
        TrackingServerArn: __expectString,
    });
};
const de_StartPipelineExecutionResponse = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
    });
};
const de_StopInferenceExperimentResponse = (output, context) => {
    return take(output, {
        InferenceExperimentArn: __expectString,
    });
};
const de_StopMlflowTrackingServerResponse = (output, context) => {
    return take(output, {
        TrackingServerArn: __expectString,
    });
};
const de_StoppingCondition = (output, context) => {
    return take(output, {
        MaxPendingTimeInSeconds: __expectInt32,
        MaxRuntimeInSeconds: __expectInt32,
        MaxWaitTimeInSeconds: __expectInt32,
    });
};
const de_StopPipelineExecutionResponse = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
    });
};
const de_StudioLifecycleConfigDetails = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StudioLifecycleConfigAppType: __expectString,
        StudioLifecycleConfigArn: __expectString,
        StudioLifecycleConfigName: __expectString,
    });
};
const de_StudioLifecycleConfigsList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_StudioLifecycleConfigDetails(entry, context);
    });
    return retVal;
};
const de_StudioWebPortalSettings = (output, context) => {
    return take(output, {
        HiddenAppTypes: (_) => de_HiddenAppTypesList(_, context),
        HiddenInstanceTypes: (_) => de_HiddenInstanceTypesList(_, context),
        HiddenMlTools: (_) => de_HiddenMlToolsList(_, context),
        HiddenSageMakerImageVersionAliases: (_) => de_HiddenSageMakerImageVersionAliasesList(_, context),
    });
};
const de_Subnets = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_SubscribedWorkteam = (output, context) => {
    return take(output, {
        ListingId: __expectString,
        MarketplaceDescription: __expectString,
        MarketplaceTitle: __expectString,
        SellerName: __expectString,
        WorkteamArn: __expectString,
    });
};
const de_SubscribedWorkteams = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_SubscribedWorkteam(entry, context);
    });
    return retVal;
};
const de_TabularJobConfig = (output, context) => {
    return take(output, {
        CandidateGenerationConfig: (_) => de_CandidateGenerationConfig(_, context),
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
        FeatureSpecificationS3Uri: __expectString,
        GenerateCandidateDefinitionsOnly: __expectBoolean,
        Mode: __expectString,
        ProblemType: __expectString,
        SampleWeightAttributeName: __expectString,
        TargetAttributeName: __expectString,
    });
};
const de_TabularResolvedAttributes = (output, context) => {
    return take(output, {
        ProblemType: __expectString,
    });
};
const de_Tag = (output, context) => {
    return take(output, {
        Key: __expectString,
        Value: __expectString,
    });
};
const de_TagList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Tag(entry, context);
    });
    return retVal;
};
const de_TargetPlatform = (output, context) => {
    return take(output, {
        Accelerator: __expectString,
        Arch: __expectString,
        Os: __expectString,
    });
};
const de_TargetTrackingScalingPolicyConfiguration = (output, context) => {
    return take(output, {
        MetricSpecification: (_) => de_MetricSpecification(__expectUnion(_), context),
        TargetValue: __limitedParseDouble,
    });
};
const de_TaskKeywords = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_TensorBoardAppSettings = (output, context) => {
    return take(output, {
        DefaultResourceSpec: (_) => de_ResourceSpec(_, context),
    });
};
const de_TensorBoardOutputConfig = (output, context) => {
    return take(output, {
        LocalPath: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_TextClassificationJobConfig = (output, context) => {
    return take(output, {
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
        ContentColumn: __expectString,
        TargetLabelColumn: __expectString,
    });
};
const de_TextGenerationHyperParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_TextGenerationJobConfig = (output, context) => {
    return take(output, {
        BaseModelName: __expectString,
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
        ModelAccessConfig: (_) => de_ModelAccessConfig(_, context),
        TextGenerationHyperParameters: (_) => de_TextGenerationHyperParameters(_, context),
    });
};
const de_TextGenerationResolvedAttributes = (output, context) => {
    return take(output, {
        BaseModelName: __expectString,
    });
};
const de_ThroughputConfigDescription = (output, context) => {
    return take(output, {
        ProvisionedReadCapacityUnits: __expectInt32,
        ProvisionedWriteCapacityUnits: __expectInt32,
        ThroughputMode: __expectString,
    });
};
const de_TimeSeriesConfig = (output, context) => {
    return take(output, {
        GroupingAttributeNames: (_) => de_GroupingAttributeNames(_, context),
        ItemIdentifierAttributeName: __expectString,
        TargetAttributeName: __expectString,
        TimestampAttributeName: __expectString,
    });
};
const de_TimeSeriesForecastingJobConfig = (output, context) => {
    return take(output, {
        CandidateGenerationConfig: (_) => de_CandidateGenerationConfig(_, context),
        CompletionCriteria: (_) => de_AutoMLJobCompletionCriteria(_, context),
        FeatureSpecificationS3Uri: __expectString,
        ForecastFrequency: __expectString,
        ForecastHorizon: __expectInt32,
        ForecastQuantiles: (_) => de_ForecastQuantiles(_, context),
        HolidayConfig: (_) => de_HolidayConfig(_, context),
        TimeSeriesConfig: (_) => de_TimeSeriesConfig(_, context),
        Transformations: (_) => de_TimeSeriesTransformations(_, context),
    });
};
const de_TimeSeriesForecastingSettings = (output, context) => {
    return take(output, {
        AmazonForecastRoleArn: __expectString,
        Status: __expectString,
    });
};
const de_TimeSeriesTransformations = (output, context) => {
    return take(output, {
        Aggregation: (_) => de_AggregationTransformations(_, context),
        Filling: (_) => de_FillingTransformations(_, context),
    });
};
const de_TotalHits = (output, context) => {
    return take(output, {
        Relation: __expectString,
        Value: __expectLong,
    });
};
const de_TrackingServerSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        IsActive: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MlflowVersion: __expectString,
        TrackingServerArn: __expectString,
        TrackingServerName: __expectString,
        TrackingServerStatus: __expectString,
    });
};
const de_TrackingServerSummaryList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrackingServerSummary(entry, context);
    });
    return retVal;
};
const de_TrafficPattern = (output, context) => {
    return take(output, {
        Phases: (_) => de_Phases(_, context),
        Stairs: (_) => de_Stairs(_, context),
        TrafficType: __expectString,
    });
};
const de_TrafficRoutingConfig = (output, context) => {
    return take(output, {
        CanarySize: (_) => de_CapacitySize(_, context),
        LinearStepSize: (_) => de_CapacitySize(_, context),
        Type: __expectString,
        WaitIntervalInSeconds: __expectInt32,
    });
};
const de_TrainingContainerArguments = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_TrainingContainerEntrypoint = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_TrainingEnvironmentMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_TrainingImageConfig = (output, context) => {
    return take(output, {
        TrainingRepositoryAccessMode: __expectString,
        TrainingRepositoryAuthConfig: (_) => de_TrainingRepositoryAuthConfig(_, context),
    });
};
const de_TrainingInstanceTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_TrainingJob = (output, context) => {
    return take(output, {
        AlgorithmSpecification: (_) => de_AlgorithmSpecification(_, context),
        AutoMLJobArn: __expectString,
        BillableTimeInSeconds: __expectInt32,
        CheckpointConfig: (_) => de_CheckpointConfig(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DebugHookConfig: (_) => de_DebugHookConfig(_, context),
        DebugRuleConfigurations: (_) => de_DebugRuleConfigurations(_, context),
        DebugRuleEvaluationStatuses: (_) => de_DebugRuleEvaluationStatuses(_, context),
        EnableInterContainerTrafficEncryption: __expectBoolean,
        EnableManagedSpotTraining: __expectBoolean,
        EnableNetworkIsolation: __expectBoolean,
        Environment: (_) => de_TrainingEnvironmentMap(_, context),
        ExperimentConfig: (_) => de_ExperimentConfig(_, context),
        FailureReason: __expectString,
        FinalMetricDataList: (_) => de_FinalMetricDataList(_, context),
        HyperParameters: (_) => de_HyperParameters(_, context),
        InputDataConfig: (_) => de_InputDataConfig(_, context),
        LabelingJobArn: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ModelArtifacts: (_) => de_ModelArtifacts(_, context),
        OutputDataConfig: (_) => de_OutputDataConfig(_, context),
        ProfilerConfig: (_) => de_ProfilerConfig(_, context),
        ResourceConfig: (_) => de_ResourceConfig(_, context),
        RetryStrategy: (_) => de_RetryStrategy(_, context),
        RoleArn: __expectString,
        SecondaryStatus: __expectString,
        SecondaryStatusTransitions: (_) => de_SecondaryStatusTransitions(_, context),
        StoppingCondition: (_) => de_StoppingCondition(_, context),
        Tags: (_) => de_TagList(_, context),
        TensorBoardOutputConfig: (_) => de_TensorBoardOutputConfig(_, context),
        TrainingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingJobArn: __expectString,
        TrainingJobName: __expectString,
        TrainingJobStatus: __expectString,
        TrainingStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingTimeInSeconds: __expectInt32,
        TuningJobArn: __expectString,
        VpcConfig: (_) => de_VpcConfig(_, context),
    });
};
const de_TrainingJobDefinition = (output, context) => {
    return take(output, {
        HyperParameters: (_) => de_HyperParameters(_, context),
        InputDataConfig: (_) => de_InputDataConfig(_, context),
        OutputDataConfig: (_) => de_OutputDataConfig(_, context),
        ResourceConfig: (_) => de_ResourceConfig(_, context),
        StoppingCondition: (_) => de_StoppingCondition(_, context),
        TrainingInputMode: __expectString,
    });
};
const de_TrainingJobStatusCounters = (output, context) => {
    return take(output, {
        Completed: __expectInt32,
        InProgress: __expectInt32,
        NonRetryableError: __expectInt32,
        RetryableError: __expectInt32,
        Stopped: __expectInt32,
    });
};
const de_TrainingJobStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_TrainingJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrainingJobSummary(entry, context);
    });
    return retVal;
};
const de_TrainingJobSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        SecondaryStatus: __expectString,
        TrainingEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrainingJobArn: __expectString,
        TrainingJobName: __expectString,
        TrainingJobStatus: __expectString,
        TrainingPlanArn: __expectString,
        WarmPoolStatus: (_) => de_WarmPoolStatus(_, context),
    });
};
const de_TrainingPlanArns = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_TrainingPlanOffering = (output, context) => {
    return take(output, {
        CurrencyCode: __expectString,
        DurationHours: __expectLong,
        DurationMinutes: __expectLong,
        RequestedEndTimeBefore: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        RequestedStartTimeAfter: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        ReservedCapacityOfferings: (_) => de_ReservedCapacityOfferings(_, context),
        TargetResources: (_) => de_SageMakerResourceNames(_, context),
        TrainingPlanOfferingId: __expectString,
        UpfrontFee: __expectString,
    });
};
const de_TrainingPlanOfferings = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrainingPlanOffering(entry, context);
    });
    return retVal;
};
const de_TrainingPlanSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrainingPlanSummary(entry, context);
    });
    return retVal;
};
const de_TrainingPlanSummary = (output, context) => {
    return take(output, {
        AvailableInstanceCount: __expectInt32,
        CurrencyCode: __expectString,
        DurationHours: __expectLong,
        DurationMinutes: __expectLong,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InUseInstanceCount: __expectInt32,
        ReservedCapacitySummaries: (_) => de_ReservedCapacitySummaries(_, context),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        StatusMessage: __expectString,
        TargetResources: (_) => de_SageMakerResourceNames(_, context),
        TotalInstanceCount: __expectInt32,
        TrainingPlanArn: __expectString,
        TrainingPlanName: __expectString,
        UpfrontFee: __expectString,
    });
};
const de_TrainingRepositoryAuthConfig = (output, context) => {
    return take(output, {
        TrainingRepositoryCredentialsProviderArn: __expectString,
    });
};
const de_TrainingSpecification = (output, context) => {
    return take(output, {
        AdditionalS3DataSource: (_) => de_AdditionalS3DataSource(_, context),
        MetricDefinitions: (_) => de_MetricDefinitionList(_, context),
        SupportedHyperParameters: (_) => de_HyperParameterSpecifications(_, context),
        SupportedTrainingInstanceTypes: (_) => de_TrainingInstanceTypes(_, context),
        SupportedTuningJobObjectiveMetrics: (_) => de_HyperParameterTuningJobObjectives(_, context),
        SupportsDistributedTraining: __expectBoolean,
        TrainingChannels: (_) => de_ChannelSpecifications(_, context),
        TrainingImage: __expectString,
        TrainingImageDigest: __expectString,
    });
};
const de_TransformDataSource = (output, context) => {
    return take(output, {
        S3DataSource: (_) => de_TransformS3DataSource(_, context),
    });
};
const de_TransformEnvironmentMap = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = __expectString(value);
        return acc;
    }, {});
};
const de_TransformInput = (output, context) => {
    return take(output, {
        CompressionType: __expectString,
        ContentType: __expectString,
        DataSource: (_) => de_TransformDataSource(_, context),
        SplitType: __expectString,
    });
};
const de_TransformInstanceTypes = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_TransformJob = (output, context) => {
    return take(output, {
        AutoMLJobArn: __expectString,
        BatchStrategy: __expectString,
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DataCaptureConfig: (_) => de_BatchDataCaptureConfig(_, context),
        DataProcessing: (_) => de_DataProcessing(_, context),
        Environment: (_) => de_TransformEnvironmentMap(_, context),
        ExperimentConfig: (_) => de_ExperimentConfig(_, context),
        FailureReason: __expectString,
        LabelingJobArn: __expectString,
        MaxConcurrentTransforms: __expectInt32,
        MaxPayloadInMB: __expectInt32,
        ModelClientConfig: (_) => de_ModelClientConfig(_, context),
        ModelName: __expectString,
        Tags: (_) => de_TagList(_, context),
        TransformEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TransformInput: (_) => de_TransformInput(_, context),
        TransformJobArn: __expectString,
        TransformJobName: __expectString,
        TransformJobStatus: __expectString,
        TransformOutput: (_) => de_TransformOutput(_, context),
        TransformResources: (_) => de_TransformResources(_, context),
        TransformStartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_TransformJobDefinition = (output, context) => {
    return take(output, {
        BatchStrategy: __expectString,
        Environment: (_) => de_TransformEnvironmentMap(_, context),
        MaxConcurrentTransforms: __expectInt32,
        MaxPayloadInMB: __expectInt32,
        TransformInput: (_) => de_TransformInput(_, context),
        TransformOutput: (_) => de_TransformOutput(_, context),
        TransformResources: (_) => de_TransformResources(_, context),
    });
};
const de_TransformJobStepMetadata = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_TransformJobSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TransformJobSummary(entry, context);
    });
    return retVal;
};
const de_TransformJobSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TransformEndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TransformJobArn: __expectString,
        TransformJobName: __expectString,
        TransformJobStatus: __expectString,
    });
};
const de_TransformOutput = (output, context) => {
    return take(output, {
        Accept: __expectString,
        AssembleWith: __expectString,
        KmsKeyId: __expectString,
        S3OutputPath: __expectString,
    });
};
const de_TransformResources = (output, context) => {
    return take(output, {
        InstanceCount: __expectInt32,
        InstanceType: __expectString,
        TransformAmiVersion: __expectString,
        VolumeKmsKeyId: __expectString,
    });
};
const de_TransformS3DataSource = (output, context) => {
    return take(output, {
        S3DataType: __expectString,
        S3Uri: __expectString,
    });
};
const de_Trial = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        ExperimentName: __expectString,
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        Source: (_) => de_TrialSource(_, context),
        Tags: (_) => de_TagList(_, context),
        TrialArn: __expectString,
        TrialComponentSummaries: (_) => de_TrialComponentSimpleSummaries(_, context),
        TrialName: __expectString,
    });
};
const de_TrialComponent = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        InputArtifacts: (_) => de_TrialComponentArtifacts(_, context),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LineageGroupArn: __expectString,
        MetadataProperties: (_) => de_MetadataProperties(_, context),
        Metrics: (_) => de_TrialComponentMetricSummaries(_, context),
        OutputArtifacts: (_) => de_TrialComponentArtifacts(_, context),
        Parameters: (_) => de_TrialComponentParameters(_, context),
        Parents: (_) => de_Parents(_, context),
        RunName: __expectString,
        Source: (_) => de_TrialComponentSource(_, context),
        SourceDetail: (_) => de_TrialComponentSourceDetail(_, context),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: (_) => de_TrialComponentStatus(_, context),
        Tags: (_) => de_TagList(_, context),
        TrialComponentArn: __expectString,
        TrialComponentName: __expectString,
    });
};
const de_TrialComponentArtifact = (output, context) => {
    return take(output, {
        MediaType: __expectString,
        Value: __expectString,
    });
};
const de_TrialComponentArtifacts = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_TrialComponentArtifact(value, context);
        return acc;
    }, {});
};
const de_TrialComponentMetricSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrialComponentMetricSummary(entry, context);
    });
    return retVal;
};
const de_TrialComponentMetricSummary = (output, context) => {
    return take(output, {
        Avg: __limitedParseDouble,
        Count: __expectInt32,
        Last: __limitedParseDouble,
        Max: __limitedParseDouble,
        MetricName: __expectString,
        Min: __limitedParseDouble,
        SourceArn: __expectString,
        StdDev: __limitedParseDouble,
        TimeStamp: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
    });
};
const de_TrialComponentParameters = (output, context) => {
    return Object.entries(output).reduce((acc, [key, value]) => {
        if (value === null) {
            return acc;
        }
        acc[key] = de_TrialComponentParameterValue(__expectUnion(value), context);
        return acc;
    }, {});
};
const de_TrialComponentParameterValue = (output, context) => {
    if (__limitedParseDouble(output.NumberValue) !== undefined) {
        return { NumberValue: __limitedParseDouble(output.NumberValue) };
    }
    if (__expectString(output.StringValue) !== undefined) {
        return { StringValue: __expectString(output.StringValue) };
    }
    return { $unknown: Object.entries(output)[0] };
};
const de_TrialComponentSimpleSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrialComponentSimpleSummary(entry, context);
    });
    return retVal;
};
const de_TrialComponentSimpleSummary = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrialComponentArn: __expectString,
        TrialComponentName: __expectString,
        TrialComponentSource: (_) => de_TrialComponentSource(_, context),
    });
};
const de_TrialComponentSource = (output, context) => {
    return take(output, {
        SourceArn: __expectString,
        SourceType: __expectString,
    });
};
const de_TrialComponentSourceDetail = (output, context) => {
    return take(output, {
        ProcessingJob: (_) => de_ProcessingJob(_, context),
        SourceArn: __expectString,
        TrainingJob: (_) => de_TrainingJob(_, context),
        TransformJob: (_) => de_TransformJob(_, context),
    });
};
const de_TrialComponentSources = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrialComponentSource(entry, context);
    });
    return retVal;
};
const de_TrialComponentStatus = (output, context) => {
    return take(output, {
        Message: __expectString,
        PrimaryStatus: __expectString,
    });
};
const de_TrialComponentSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrialComponentSummary(entry, context);
    });
    return retVal;
};
const de_TrialComponentSummary = (output, context) => {
    return take(output, {
        CreatedBy: (_) => de_UserContext(_, context),
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        EndTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        LastModifiedBy: (_) => de_UserContext(_, context),
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        StartTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: (_) => de_TrialComponentStatus(_, context),
        TrialComponentArn: __expectString,
        TrialComponentName: __expectString,
        TrialComponentSource: (_) => de_TrialComponentSource(_, context),
    });
};
const de_TrialSource = (output, context) => {
    return take(output, {
        SourceArn: __expectString,
        SourceType: __expectString,
    });
};
const de_TrialSummaries = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_TrialSummary(entry, context);
    });
    return retVal;
};
const de_TrialSummary = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DisplayName: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        TrialArn: __expectString,
        TrialName: __expectString,
        TrialSource: (_) => de_TrialSource(_, context),
    });
};
const de_TtlDuration = (output, context) => {
    return take(output, {
        Unit: __expectString,
        Value: __expectInt32,
    });
};
const de_TuningJobCompletionCriteria = (output, context) => {
    return take(output, {
        BestObjectiveNotImproving: (_) => de_BestObjectiveNotImproving(_, context),
        ConvergenceDetected: (_) => de_ConvergenceDetected(_, context),
        TargetObjectiveMetricValue: __limitedParseFloat32,
    });
};
const de_TuningJobStepMetaData = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_UiConfig = (output, context) => {
    return take(output, {
        HumanTaskUiArn: __expectString,
        UiTemplateS3Uri: __expectString,
    });
};
const de_UiTemplateInfo = (output, context) => {
    return take(output, {
        ContentSha256: __expectString,
        Url: __expectString,
    });
};
const de_UnifiedStudioSettings = (output, context) => {
    return take(output, {
        DomainAccountId: __expectString,
        DomainId: __expectString,
        DomainRegion: __expectString,
        EnvironmentId: __expectString,
        ProjectId: __expectString,
        ProjectS3Path: __expectString,
        StudioWebPortalAccess: __expectString,
    });
};
const de_UpdateActionResponse = (output, context) => {
    return take(output, {
        ActionArn: __expectString,
    });
};
const de_UpdateAppImageConfigResponse = (output, context) => {
    return take(output, {
        AppImageConfigArn: __expectString,
    });
};
const de_UpdateArtifactResponse = (output, context) => {
    return take(output, {
        ArtifactArn: __expectString,
    });
};
const de_UpdateClusterResponse = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
    });
};
const de_UpdateClusterSchedulerConfigResponse = (output, context) => {
    return take(output, {
        ClusterSchedulerConfigArn: __expectString,
        ClusterSchedulerConfigVersion: __expectInt32,
    });
};
const de_UpdateClusterSoftwareResponse = (output, context) => {
    return take(output, {
        ClusterArn: __expectString,
    });
};
const de_UpdateCodeRepositoryOutput = (output, context) => {
    return take(output, {
        CodeRepositoryArn: __expectString,
    });
};
const de_UpdateComputeQuotaResponse = (output, context) => {
    return take(output, {
        ComputeQuotaArn: __expectString,
        ComputeQuotaVersion: __expectInt32,
    });
};
const de_UpdateContextResponse = (output, context) => {
    return take(output, {
        ContextArn: __expectString,
    });
};
const de_UpdateDomainResponse = (output, context) => {
    return take(output, {
        DomainArn: __expectString,
    });
};
const de_UpdateEndpointOutput = (output, context) => {
    return take(output, {
        EndpointArn: __expectString,
    });
};
const de_UpdateEndpointWeightsAndCapacitiesOutput = (output, context) => {
    return take(output, {
        EndpointArn: __expectString,
    });
};
const de_UpdateExperimentResponse = (output, context) => {
    return take(output, {
        ExperimentArn: __expectString,
    });
};
const de_UpdateFeatureGroupResponse = (output, context) => {
    return take(output, {
        FeatureGroupArn: __expectString,
    });
};
const de_UpdateHubContentReferenceResponse = (output, context) => {
    return take(output, {
        HubArn: __expectString,
        HubContentArn: __expectString,
    });
};
const de_UpdateHubContentResponse = (output, context) => {
    return take(output, {
        HubArn: __expectString,
        HubContentArn: __expectString,
    });
};
const de_UpdateHubResponse = (output, context) => {
    return take(output, {
        HubArn: __expectString,
    });
};
const de_UpdateImageResponse = (output, context) => {
    return take(output, {
        ImageArn: __expectString,
    });
};
const de_UpdateImageVersionResponse = (output, context) => {
    return take(output, {
        ImageVersionArn: __expectString,
    });
};
const de_UpdateInferenceComponentOutput = (output, context) => {
    return take(output, {
        InferenceComponentArn: __expectString,
    });
};
const de_UpdateInferenceComponentRuntimeConfigOutput = (output, context) => {
    return take(output, {
        InferenceComponentArn: __expectString,
    });
};
const de_UpdateInferenceExperimentResponse = (output, context) => {
    return take(output, {
        InferenceExperimentArn: __expectString,
    });
};
const de_UpdateMlflowTrackingServerResponse = (output, context) => {
    return take(output, {
        TrackingServerArn: __expectString,
    });
};
const de_UpdateModelCardResponse = (output, context) => {
    return take(output, {
        ModelCardArn: __expectString,
    });
};
const de_UpdateModelPackageOutput = (output, context) => {
    return take(output, {
        ModelPackageArn: __expectString,
    });
};
const de_UpdateMonitoringAlertResponse = (output, context) => {
    return take(output, {
        MonitoringAlertName: __expectString,
        MonitoringScheduleArn: __expectString,
    });
};
const de_UpdateMonitoringScheduleResponse = (output, context) => {
    return take(output, {
        MonitoringScheduleArn: __expectString,
    });
};
const de_UpdateNotebookInstanceLifecycleConfigOutput = (output, context) => {
    return take(output, {});
};
const de_UpdateNotebookInstanceOutput = (output, context) => {
    return take(output, {});
};
const de_UpdatePartnerAppResponse = (output, context) => {
    return take(output, {
        Arn: __expectString,
    });
};
const de_UpdatePipelineExecutionResponse = (output, context) => {
    return take(output, {
        PipelineExecutionArn: __expectString,
    });
};
const de_UpdatePipelineResponse = (output, context) => {
    return take(output, {
        PipelineArn: __expectString,
    });
};
const de_UpdateProjectOutput = (output, context) => {
    return take(output, {
        ProjectArn: __expectString,
    });
};
const de_UpdateSpaceResponse = (output, context) => {
    return take(output, {
        SpaceArn: __expectString,
    });
};
const de_UpdateTrainingJobResponse = (output, context) => {
    return take(output, {
        TrainingJobArn: __expectString,
    });
};
const de_UpdateTrialComponentResponse = (output, context) => {
    return take(output, {
        TrialComponentArn: __expectString,
    });
};
const de_UpdateTrialResponse = (output, context) => {
    return take(output, {
        TrialArn: __expectString,
    });
};
const de_UpdateUserProfileResponse = (output, context) => {
    return take(output, {
        UserProfileArn: __expectString,
    });
};
const de_UpdateWorkforceResponse = (output, context) => {
    return take(output, {
        Workforce: (_) => de_Workforce(_, context),
    });
};
const de_UpdateWorkteamResponse = (output, context) => {
    return take(output, {
        Workteam: (_) => de_Workteam(_, context),
    });
};
const de_USD = (output, context) => {
    return take(output, {
        Cents: __expectInt32,
        Dollars: __expectInt32,
        TenthFractionsOfACent: __expectInt32,
    });
};
const de_UserContext = (output, context) => {
    return take(output, {
        DomainId: __expectString,
        IamIdentity: (_) => de_IamIdentity(_, context),
        UserProfileArn: __expectString,
        UserProfileName: __expectString,
    });
};
const de_UserProfileDetails = (output, context) => {
    return take(output, {
        CreationTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        DomainId: __expectString,
        LastModifiedTime: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Status: __expectString,
        UserProfileName: __expectString,
    });
};
const de_UserProfileList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_UserProfileDetails(entry, context);
    });
    return retVal;
};
const de_UserSettings = (output, context) => {
    return take(output, {
        AutoMountHomeEFS: __expectString,
        CanvasAppSettings: (_) => de_CanvasAppSettings(_, context),
        CodeEditorAppSettings: (_) => de_CodeEditorAppSettings(_, context),
        CustomFileSystemConfigs: (_) => de_CustomFileSystemConfigs(_, context),
        CustomPosixUserConfig: (_) => de_CustomPosixUserConfig(_, context),
        DefaultLandingUri: __expectString,
        ExecutionRole: __expectString,
        JupyterLabAppSettings: (_) => de_JupyterLabAppSettings(_, context),
        JupyterServerAppSettings: (_) => de_JupyterServerAppSettings(_, context),
        KernelGatewayAppSettings: (_) => de_KernelGatewayAppSettings(_, context),
        RSessionAppSettings: (_) => de_RSessionAppSettings(_, context),
        RStudioServerProAppSettings: (_) => de_RStudioServerProAppSettings(_, context),
        SecurityGroups: (_) => de_SecurityGroupIds(_, context),
        SharingSettings: (_) => de_SharingSettings(_, context),
        SpaceStorageSettings: (_) => de_DefaultSpaceStorageSettings(_, context),
        StudioWebPortal: __expectString,
        StudioWebPortalSettings: (_) => de_StudioWebPortalSettings(_, context),
        TensorBoardAppSettings: (_) => de_TensorBoardAppSettings(_, context),
    });
};
const de_VectorConfig = (output, context) => {
    return take(output, {
        Dimension: __expectInt32,
    });
};
const de_VersionAliasesList = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_Vertex = (output, context) => {
    return take(output, {
        Arn: __expectString,
        LineageType: __expectString,
        Type: __expectString,
    });
};
const de_Vertices = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Vertex(entry, context);
    });
    return retVal;
};
const de_VpcConfig = (output, context) => {
    return take(output, {
        SecurityGroupIds: (_) => de_VpcSecurityGroupIds(_, context),
        Subnets: (_) => de_Subnets(_, context),
    });
};
const de_VpcOnlyTrustedAccounts = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_VpcSecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_WarmPoolStatus = (output, context) => {
    return take(output, {
        ResourceRetainedBillableTimeInSeconds: __expectInt32,
        ReusedByJob: __expectString,
        Status: __expectString,
    });
};
const de_WorkerAccessConfiguration = (output, context) => {
    return take(output, {
        S3Presign: (_) => de_S3Presign(_, context),
    });
};
const de_Workforce = (output, context) => {
    return take(output, {
        CognitoConfig: (_) => de_CognitoConfig(_, context),
        CreateDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        FailureReason: __expectString,
        LastUpdatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        OidcConfig: (_) => de_OidcConfigForResponse(_, context),
        SourceIpConfig: (_) => de_SourceIpConfig(_, context),
        Status: __expectString,
        SubDomain: __expectString,
        WorkforceArn: __expectString,
        WorkforceName: __expectString,
        WorkforceVpcConfig: (_) => de_WorkforceVpcConfigResponse(_, context),
    });
};
const de_Workforces = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Workforce(entry, context);
    });
    return retVal;
};
const de_WorkforceSecurityGroupIds = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_WorkforceSubnets = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return __expectString(entry);
    });
    return retVal;
};
const de_WorkforceVpcConfigResponse = (output, context) => {
    return take(output, {
        SecurityGroupIds: (_) => de_WorkforceSecurityGroupIds(_, context),
        Subnets: (_) => de_WorkforceSubnets(_, context),
        VpcEndpointId: __expectString,
        VpcId: __expectString,
    });
};
const de_WorkspaceSettings = (output, context) => {
    return take(output, {
        S3ArtifactPath: __expectString,
        S3KmsKeyId: __expectString,
    });
};
const de_Workteam = (output, context) => {
    return take(output, {
        CreateDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        Description: __expectString,
        LastUpdatedDate: (_) => __expectNonNull(__parseEpochTimestamp(__expectNumber(_))),
        MemberDefinitions: (_) => de_MemberDefinitions(_, context),
        NotificationConfiguration: (_) => de_NotificationConfiguration(_, context),
        ProductListingIds: (_) => de_ProductListings(_, context),
        SubDomain: __expectString,
        WorkerAccessConfiguration: (_) => de_WorkerAccessConfiguration(_, context),
        WorkforceArn: __expectString,
        WorkteamArn: __expectString,
        WorkteamName: __expectString,
    });
};
const de_Workteams = (output, context) => {
    const retVal = (output || [])
        .filter((e) => e != null)
        .map((entry) => {
        return de_Workteam(entry, context);
    });
    return retVal;
};
const deserializeMetadata = (output) => ({
    httpStatusCode: output.statusCode,
    requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
    extendedRequestId: output.headers["x-amz-id-2"],
    cfId: output.headers["x-amz-cf-id"],
});
const collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
const throwDefaultError = withBaseException(__BaseException);
const buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
    const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
    const contents = {
        protocol,
        hostname,
        port,
        method: "POST",
        path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
        headers,
    };
    if (resolvedHostname !== undefined) {
        contents.hostname = resolvedHostname;
    }
    if (body !== undefined) {
        contents.body = body;
    }
    return new __HttpRequest(contents);
};
function sharedHeaders(operation) {
    return {
        "content-type": "application/x-amz-json-1.1",
        "x-amz-target": `SageMaker.${operation}`,
    };
}
