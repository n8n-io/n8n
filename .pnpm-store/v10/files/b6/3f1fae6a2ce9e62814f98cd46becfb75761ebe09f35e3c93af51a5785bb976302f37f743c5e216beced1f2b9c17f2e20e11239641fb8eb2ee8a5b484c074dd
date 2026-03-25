import { SENSITIVE_STRING, } from "@smithy/smithy-client";
import { SageMakerServiceException as __BaseException } from "./SageMakerServiceException";
export const ContentClassifier = {
    FREE_OF_ADULT_CONTENT: "FreeOfAdultContent",
    FREE_OF_PERSONALLY_IDENTIFIABLE_INFORMATION: "FreeOfPersonallyIdentifiableInformation",
};
export const HyperParameterScalingType = {
    AUTO: "Auto",
    LINEAR: "Linear",
    LOGARITHMIC: "Logarithmic",
    REVERSE_LOGARITHMIC: "ReverseLogarithmic",
};
export const ParameterType = {
    CATEGORICAL: "Categorical",
    CONTINUOUS: "Continuous",
    FREE_TEXT: "FreeText",
    INTEGER: "Integer",
};
export const HyperParameterTuningJobObjectiveType = {
    MAXIMIZE: "Maximize",
    MINIMIZE: "Minimize",
};
export class ResourceInUse extends __BaseException {
    name = "ResourceInUse";
    $fault = "client";
    Message;
    constructor(opts) {
        super({
            name: "ResourceInUse",
            $fault: "client",
            ...opts,
        });
        Object.setPrototypeOf(this, ResourceInUse.prototype);
        this.Message = opts.Message;
    }
}
export const FairShare = {
    DISABLED: "Disabled",
    ENABLED: "Enabled",
};
export const Framework = {
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
export const ProcessingS3UploadMode = {
    CONTINUOUS: "Continuous",
    END_OF_JOB: "EndOfJob",
};
export const ProcessingInstanceType = {
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
    ML_P2_16XLARGE: "ml.p2.16xlarge",
    ML_P2_8XLARGE: "ml.p2.8xlarge",
    ML_P2_XLARGE: "ml.p2.xlarge",
    ML_P3_16XLARGE: "ml.p3.16xlarge",
    ML_P3_2XLARGE: "ml.p3.2xlarge",
    ML_P3_8XLARGE: "ml.p3.8xlarge",
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
    ML_T3_2XLARGE: "ml.t3.2xlarge",
    ML_T3_LARGE: "ml.t3.large",
    ML_T3_MEDIUM: "ml.t3.medium",
    ML_T3_XLARGE: "ml.t3.xlarge",
};
export const EdgePresetDeploymentType = {
    GreengrassV2Component: "GreengrassV2Component",
};
export var CustomFileSystemConfig;
(function (CustomFileSystemConfig) {
    CustomFileSystemConfig.visit = (value, visitor) => {
        if (value.EFSFileSystemConfig !== undefined)
            return visitor.EFSFileSystemConfig(value.EFSFileSystemConfig);
        if (value.FSxLustreFileSystemConfig !== undefined)
            return visitor.FSxLustreFileSystemConfig(value.FSxLustreFileSystemConfig);
        return visitor._(value.$unknown[0], value.$unknown[1]);
    };
})(CustomFileSystemConfig || (CustomFileSystemConfig = {}));
export const RStudioServerProAccessStatus = {
    Disabled: "DISABLED",
    Enabled: "ENABLED",
};
export const RStudioServerProUserGroup = {
    Admin: "R_STUDIO_ADMIN",
    User: "R_STUDIO_USER",
};
export const NotebookOutputOption = {
    Allowed: "Allowed",
    Disabled: "Disabled",
};
export const StudioWebPortal = {
    Disabled: "DISABLED",
    Enabled: "ENABLED",
};
export const MlTools = {
    AUTO_ML: "AutoMl",
    COMET: "Comet",
    DATA_WRANGLER: "DataWrangler",
    DEEPCHECKS_LLM_EVALUATION: "DeepchecksLLMEvaluation",
    EMR_CLUSTERS: "EmrClusters",
    ENDPOINTS: "Endpoints",
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
    TRAINING: "Training",
};
export const SageMakerImageName = {
    sagemaker_distribution: "sagemaker_distribution",
};
export const ExecutionRoleIdentityConfig = {
    DISABLED: "DISABLED",
    USER_PROFILE_NAME: "USER_PROFILE_NAME",
};
export const TagPropagation = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
export const FailureHandlingPolicy = {
    DoNothing: "DO_NOTHING",
    RollbackOnFailure: "ROLLBACK_ON_FAILURE",
};
export const DeviceSubsetType = {
    NameContains: "NAMECONTAINS",
    Percentage: "PERCENTAGE",
    Selection: "SELECTION",
};
export const ProductionVariantAcceleratorType = {
    ML_EIA1_LARGE: "ml.eia1.large",
    ML_EIA1_MEDIUM: "ml.eia1.medium",
    ML_EIA1_XLARGE: "ml.eia1.xlarge",
    ML_EIA2_LARGE: "ml.eia2.large",
    ML_EIA2_MEDIUM: "ml.eia2.medium",
    ML_EIA2_XLARGE: "ml.eia2.xlarge",
};
export const ProductionVariantInferenceAmiVersion = {
    AL2_GPU_2: "al2-ami-sagemaker-inference-gpu-2",
    AL2_GPU_2_1: "al2-ami-sagemaker-inference-gpu-2-1",
    AL2_GPU_3_1: "al2-ami-sagemaker-inference-gpu-3-1",
    AL2_NEURON_2: "al2-ami-sagemaker-inference-neuron-2",
};
export const ManagedInstanceScalingStatus = {
    DISABLED: "DISABLED",
    ENABLED: "ENABLED",
};
export const RoutingStrategy = {
    LEAST_OUTSTANDING_REQUESTS: "LEAST_OUTSTANDING_REQUESTS",
    RANDOM: "RANDOM",
};
export const FeatureType = {
    FRACTIONAL: "Fractional",
    INTEGRAL: "Integral",
    STRING: "String",
};
export const TableFormat = {
    DEFAULT: "Default",
    GLUE: "Glue",
    ICEBERG: "Iceberg",
};
export const StorageType = {
    IN_MEMORY: "InMemory",
    STANDARD: "Standard",
};
export const TtlDurationUnit = {
    DAYS: "Days",
    HOURS: "Hours",
    MINUTES: "Minutes",
    SECONDS: "Seconds",
    WEEKS: "Weeks",
};
export const ThroughputMode = {
    ON_DEMAND: "OnDemand",
    PROVISIONED: "Provisioned",
};
export const HyperParameterTuningJobStrategyType = {
    BAYESIAN: "Bayesian",
    GRID: "Grid",
    HYPERBAND: "Hyperband",
    RANDOM: "Random",
};
export const TrainingJobEarlyStoppingType = {
    AUTO: "Auto",
    OFF: "Off",
};
export const HyperParameterTuningAllocationStrategy = {
    PRIORITIZED: "Prioritized",
};
export const HyperParameterTuningJobWarmStartType = {
    IDENTICAL_DATA_AND_ALGORITHM: "IdenticalDataAndAlgorithm",
    TRANSFER_LEARNING: "TransferLearning",
};
export const JobType = {
    INFERENCE: "INFERENCE",
    NOTEBOOK_KERNEL: "NOTEBOOK_KERNEL",
    TRAINING: "TRAINING",
};
export const Processor = {
    CPU: "CPU",
    GPU: "GPU",
};
export const VendorGuidance = {
    ARCHIVED: "ARCHIVED",
    NOT_PROVIDED: "NOT_PROVIDED",
    STABLE: "STABLE",
    TO_BE_ARCHIVED: "TO_BE_ARCHIVED",
};
export const ModelInfrastructureType = {
    REAL_TIME_INFERENCE: "RealTimeInference",
};
export const _InstanceType = {
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
export const InferenceExperimentType = {
    SHADOW_MODE: "ShadowMode",
};
export const RecommendationJobSupportedEndpointType = {
    REALTIME: "RealTime",
    SERVERLESS: "Serverless",
};
export const TrafficType = {
    PHASES: "PHASES",
    STAIRS: "STAIRS",
};
export const RecommendationJobType = {
    ADVANCED: "Advanced",
    DEFAULT: "Default",
};
export const FlatInvocations = {
    CONTINUE: "Continue",
    STOP: "Stop",
};
export const TrackingServerSize = {
    L: "Large",
    M: "Medium",
    S: "Small",
};
export const InferenceExecutionMode = {
    DIRECT: "Direct",
    SERIAL: "Serial",
};
export const ModelCardStatus = {
    APPROVED: "Approved",
    ARCHIVED: "Archived",
    DRAFT: "Draft",
    PENDINGREVIEW: "PendingReview",
};
export const SkipModelValidation = {
    ALL: "All",
    NONE: "None",
};
export const MonitoringProblemType = {
    BINARY_CLASSIFICATION: "BinaryClassification",
    MULTICLASS_CLASSIFICATION: "MulticlassClassification",
    REGRESSION: "Regression",
};
export const CreateModelCardRequestFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.Content && { Content: SENSITIVE_STRING }),
});
export const ModelPackageModelCardFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ModelCardContent && { ModelCardContent: SENSITIVE_STRING }),
});
export const CreateModelPackageInputFilterSensitiveLog = (obj) => ({
    ...obj,
    ...(obj.ModelCard && { ModelCard: ModelPackageModelCardFilterSensitiveLog(obj.ModelCard) }),
});
