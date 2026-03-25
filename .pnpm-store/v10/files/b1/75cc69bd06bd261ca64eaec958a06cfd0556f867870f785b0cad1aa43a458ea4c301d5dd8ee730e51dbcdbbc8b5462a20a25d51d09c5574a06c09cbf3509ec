import { SENSITIVE_STRING } from "@smithy/smithy-client";
export const MonitoringType = {
    DATA_QUALITY: "DataQuality",
    MODEL_BIAS: "ModelBias",
    MODEL_EXPLAINABILITY: "ModelExplainability",
    MODEL_QUALITY: "ModelQuality",
};
export const NotebookInstanceAcceleratorType = {
    ML_EIA1_LARGE: "ml.eia1.large",
    ML_EIA1_MEDIUM: "ml.eia1.medium",
    ML_EIA1_XLARGE: "ml.eia1.xlarge",
    ML_EIA2_LARGE: "ml.eia2.large",
    ML_EIA2_MEDIUM: "ml.eia2.medium",
    ML_EIA2_XLARGE: "ml.eia2.xlarge",
};
export const DirectInternetAccess = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
export const RootAccess = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
export const OptimizationJobDeploymentInstanceType = {
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
    ML_P5_48XLARGE: "ml.p5.48xlarge",
    ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge",
    ML_TRN1_2XLARGE: "ml.trn1.2xlarge",
    ML_TRN1_32XLARGE: "ml.trn1.32xlarge",
};
export var OptimizationConfig;
(function (OptimizationConfig) {
    OptimizationConfig.visit = (value, visitor) => {
        if (value.ModelQuantizationConfig !== undefined)
            return visitor.ModelQuantizationConfig(value.ModelQuantizationConfig);
        if (value.ModelCompilationConfig !== undefined)
            return visitor.ModelCompilationConfig(value.ModelCompilationConfig);
        if (value.ModelShardingConfig !== undefined)
            return visitor.ModelShardingConfig(value.ModelShardingConfig);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(OptimizationConfig || (OptimizationConfig = {}));
export const PartnerAppAuthType = {
    IAM: "IAM",
};
export const PartnerAppType = {
    COMET: "comet",
    DEEPCHECKS_LLM_EVALUATION: "deepchecks-llm-evaluation",
    FIDDLER: "fiddler",
    LAKERA_GUARD: "lakera-guard",
};
export const DataDistributionType = {
    FULLYREPLICATED: "FullyReplicated",
    SHARDEDBYS3KEY: "ShardedByS3Key",
};
export const InputMode = {
    FILE: "File",
    PIPE: "Pipe",
};
export const RedshiftResultCompressionType = {
    BZIP2: "BZIP2",
    GZIP: "GZIP",
    NONE: "None",
    SNAPPY: "SNAPPY",
    ZSTD: "ZSTD",
};
export const RedshiftResultFormat = {
    CSV: "CSV",
    PARQUET: "PARQUET",
};
export const ProcessingS3CompressionType = {
    GZIP: "Gzip",
    NONE: "None",
};
export const ProcessingS3DataType = {
    MANIFEST_FILE: "ManifestFile",
    S3_PREFIX: "S3Prefix",
};
export var CustomFileSystem;
(function (CustomFileSystem) {
    CustomFileSystem.visit = (value, visitor) => {
        if (value.EFSFileSystem !== undefined)
            return visitor.EFSFileSystem(value.EFSFileSystem);
        if (value.FSxLustreFileSystem !== undefined)
            return visitor.FSxLustreFileSystem(value.FSxLustreFileSystem);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(CustomFileSystem || (CustomFileSystem = {}));
export const SharingType = {
    Private: "Private",
    Shared: "Shared",
};
export const StudioLifecycleConfigAppType = {
    CodeEditor: "CodeEditor",
    JupyterLab: "JupyterLab",
    JupyterServer: "JupyterServer",
    KernelGateway: "KernelGateway",
};
export const JoinSource = {
    INPUT: "Input",
    NONE: "None",
};
export var TrialComponentParameterValue;
(function (TrialComponentParameterValue) {
    TrialComponentParameterValue.visit = (value, visitor) => {
        if (value.StringValue !== undefined)
            return visitor.StringValue(value.StringValue);
        if (value.NumberValue !== undefined)
            return visitor.NumberValue(value.NumberValue);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(TrialComponentParameterValue || (TrialComponentParameterValue = {}));
export const TrialComponentPrimaryStatus = {
    COMPLETED: "Completed",
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
export const EnabledOrDisabled = {
    Disabled: "Disabled",
    Enabled: "Enabled",
};
export const CrossAccountFilterOption = {
    CROSS_ACCOUNT: "CrossAccount",
    SAME_ACCOUNT: "SameAccount",
};
export const Statistic = {
    AVERAGE: "Average",
    MAXIMUM: "Maximum",
    MINIMUM: "Minimum",
    SAMPLE_COUNT: "SampleCount",
    SUM: "Sum",
};
export const RuleEvaluationStatus = {
    ERROR: "Error",
    IN_PROGRESS: "InProgress",
    ISSUES_FOUND: "IssuesFound",
    NO_ISSUES_FOUND: "NoIssuesFound",
    STOPPED: "Stopped",
    STOPPING: "Stopping",
};
export const RetentionType = {
    Delete: "Delete",
    Retain: "Retain",
};
export const HubContentType = {
    MODEL: "Model",
    MODEL_REFERENCE: "ModelReference",
    NOTEBOOK: "Notebook",
};
export const RecommendationStatus = {
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    IN_PROGRESS: "IN_PROGRESS",
    NOT_APPLICABLE: "NOT_APPLICABLE",
};
export const StageStatus = {
    Creating: "CREATING",
    Deployed: "DEPLOYED",
    Failed: "FAILED",
    InProgress: "INPROGRESS",
    ReadyToDeploy: "READYTODEPLOY",
    Starting: "STARTING",
    Stopped: "STOPPED",
    Stopping: "STOPPING",
};
export const DomainStatus = {
    Delete_Failed: "Delete_Failed",
    Deleting: "Deleting",
    Failed: "Failed",
    InService: "InService",
    Pending: "Pending",
    Update_Failed: "Update_Failed",
    Updating: "Updating",
};
export const EdgePackagingJobStatus = {
    Completed: "COMPLETED",
    Failed: "FAILED",
    InProgress: "INPROGRESS",
    Starting: "STARTING",
    Stopped: "STOPPED",
    Stopping: "STOPPING",
};
export const EdgePresetDeploymentStatus = {
    Completed: "COMPLETED",
    Failed: "FAILED",
};
export const EndpointStatus = {
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
export const VariantStatus = {
    ACTIVATING_TRAFFIC: "ActivatingTraffic",
    BAKING: "Baking",
    CREATING: "Creating",
    DELETING: "Deleting",
    UPDATING: "Updating",
};
export const FeatureGroupStatus = {
    CREATED: "Created",
    CREATE_FAILED: "CreateFailed",
    CREATING: "Creating",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
};
export const LastUpdateStatusValue = {
    FAILED: "Failed",
    IN_PROGRESS: "InProgress",
    SUCCESSFUL: "Successful",
};
export const OfflineStoreStatusValue = {
    ACTIVE: "Active",
    BLOCKED: "Blocked",
    DISABLED: "Disabled",
};
export const FlowDefinitionStatus = {
    ACTIVE: "Active",
    DELETING: "Deleting",
    FAILED: "Failed",
    INITIALIZING: "Initializing",
};
export const HubStatus = {
    CREATE_FAILED: "CreateFailed",
    CREATING: "Creating",
    DELETE_FAILED: "DeleteFailed",
    DELETING: "Deleting",
    IN_SERVICE: "InService",
    UPDATE_FAILED: "UpdateFailed",
    UPDATING: "Updating",
};
export const OidcConfigFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ClientSecret && { ClientSecret: SENSITIVE_STRING }),
});
export const CreateWorkforceRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.OidcConfig && { OidcConfig: OidcConfigFilterSensitiveLog(obj.OidcConfig) }),
});
