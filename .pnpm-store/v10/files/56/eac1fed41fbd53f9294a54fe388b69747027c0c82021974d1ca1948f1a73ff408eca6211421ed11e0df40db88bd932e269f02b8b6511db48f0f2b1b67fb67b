import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SageMakerServiceException as __BaseException } from "./SageMakerServiceException";
export interface ActionSource {
  SourceUri: string | undefined;
  SourceType?: string | undefined;
  SourceId?: string | undefined;
}
export declare const ActionStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
  readonly UNKNOWN: "Unknown";
};
export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];
export interface ActionSummary {
  ActionArn?: string | undefined;
  ActionName?: string | undefined;
  Source?: ActionSource | undefined;
  ActionType?: string | undefined;
  Status?: ActionStatus | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export declare const ActivationState: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type ActivationState =
  (typeof ActivationState)[keyof typeof ActivationState];
export declare const AssociationEdgeType: {
  readonly ASSOCIATED_WITH: "AssociatedWith";
  readonly CONTRIBUTED_TO: "ContributedTo";
  readonly DERIVED_FROM: "DerivedFrom";
  readonly PRODUCED: "Produced";
  readonly SAME_AS: "SameAs";
};
export type AssociationEdgeType =
  (typeof AssociationEdgeType)[keyof typeof AssociationEdgeType];
export interface AddAssociationRequest {
  SourceArn: string | undefined;
  DestinationArn: string | undefined;
  AssociationType?: AssociationEdgeType | undefined;
}
export interface AddAssociationResponse {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
}
export declare class ResourceLimitExceeded extends __BaseException {
  readonly name: "ResourceLimitExceeded";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceLimitExceeded, __BaseException>
  );
}
export declare class ResourceNotFound extends __BaseException {
  readonly name: "ResourceNotFound";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(opts: __ExceptionOptionType<ResourceNotFound, __BaseException>);
}
export declare const CompressionType: {
  readonly GZIP: "Gzip";
  readonly NONE: "None";
};
export type CompressionType =
  (typeof CompressionType)[keyof typeof CompressionType];
export declare const AdditionalS3DataSourceDataType: {
  readonly S3OBJECT: "S3Object";
  readonly S3PREFIX: "S3Prefix";
};
export type AdditionalS3DataSourceDataType =
  (typeof AdditionalS3DataSourceDataType)[keyof typeof AdditionalS3DataSourceDataType];
export interface AdditionalS3DataSource {
  S3DataType: AdditionalS3DataSourceDataType | undefined;
  S3Uri: string | undefined;
  CompressionType?: CompressionType | undefined;
  ETag?: string | undefined;
}
export declare const ModelCompressionType: {
  readonly Gzip: "Gzip";
  readonly None: "None";
};
export type ModelCompressionType =
  (typeof ModelCompressionType)[keyof typeof ModelCompressionType];
export interface InferenceHubAccessConfig {
  HubContentArn: string | undefined;
}
export interface ModelAccessConfig {
  AcceptEula: boolean | undefined;
}
export declare const S3ModelDataType: {
  readonly S3Object: "S3Object";
  readonly S3Prefix: "S3Prefix";
};
export type S3ModelDataType =
  (typeof S3ModelDataType)[keyof typeof S3ModelDataType];
export interface S3ModelDataSource {
  S3Uri: string | undefined;
  S3DataType: S3ModelDataType | undefined;
  CompressionType: ModelCompressionType | undefined;
  ModelAccessConfig?: ModelAccessConfig | undefined;
  HubAccessConfig?: InferenceHubAccessConfig | undefined;
  ManifestS3Uri?: string | undefined;
  ETag?: string | undefined;
  ManifestEtag?: string | undefined;
}
export interface ModelDataSource {
  S3DataSource?: S3ModelDataSource | undefined;
}
export interface ModelInput {
  DataInputConfig: string | undefined;
}
export interface ModelPackageContainerDefinition {
  ContainerHostname?: string | undefined;
  Image: string | undefined;
  ImageDigest?: string | undefined;
  ModelDataUrl?: string | undefined;
  ModelDataSource?: ModelDataSource | undefined;
  ProductId?: string | undefined;
  Environment?: Record<string, string> | undefined;
  ModelInput?: ModelInput | undefined;
  Framework?: string | undefined;
  FrameworkVersion?: string | undefined;
  NearestModelName?: string | undefined;
  AdditionalS3DataSource?: AdditionalS3DataSource | undefined;
  ModelDataETag?: string | undefined;
}
export declare const ProductionVariantInstanceType: {
  readonly ML_C4_2XLARGE: "ml.c4.2xlarge";
  readonly ML_C4_4XLARGE: "ml.c4.4xlarge";
  readonly ML_C4_8XLARGE: "ml.c4.8xlarge";
  readonly ML_C4_LARGE: "ml.c4.large";
  readonly ML_C4_XLARGE: "ml.c4.xlarge";
  readonly ML_C5D_18XLARGE: "ml.c5d.18xlarge";
  readonly ML_C5D_2XLARGE: "ml.c5d.2xlarge";
  readonly ML_C5D_4XLARGE: "ml.c5d.4xlarge";
  readonly ML_C5D_9XLARGE: "ml.c5d.9xlarge";
  readonly ML_C5D_LARGE: "ml.c5d.large";
  readonly ML_C5D_XLARGE: "ml.c5d.xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_LARGE: "ml.c5.large";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6GD_12XLARGE: "ml.c6gd.12xlarge";
  readonly ML_C6GD_16XLARGE: "ml.c6gd.16xlarge";
  readonly ML_C6GD_2XLARGE: "ml.c6gd.2xlarge";
  readonly ML_C6GD_4XLARGE: "ml.c6gd.4xlarge";
  readonly ML_C6GD_8XLARGE: "ml.c6gd.8xlarge";
  readonly ML_C6GD_LARGE: "ml.c6gd.large";
  readonly ML_C6GD_XLARGE: "ml.c6gd.xlarge";
  readonly ML_C6GN_12XLARGE: "ml.c6gn.12xlarge";
  readonly ML_C6GN_16XLARGE: "ml.c6gn.16xlarge";
  readonly ML_C6GN_2XLARGE: "ml.c6gn.2xlarge";
  readonly ML_C6GN_4XLARGE: "ml.c6gn.4xlarge";
  readonly ML_C6GN_8XLARGE: "ml.c6gn.8xlarge";
  readonly ML_C6GN_LARGE: "ml.c6gn.large";
  readonly ML_C6GN_XLARGE: "ml.c6gn.xlarge";
  readonly ML_C6G_12XLARGE: "ml.c6g.12xlarge";
  readonly ML_C6G_16XLARGE: "ml.c6g.16xlarge";
  readonly ML_C6G_2XLARGE: "ml.c6g.2xlarge";
  readonly ML_C6G_4XLARGE: "ml.c6g.4xlarge";
  readonly ML_C6G_8XLARGE: "ml.c6g.8xlarge";
  readonly ML_C6G_LARGE: "ml.c6g.large";
  readonly ML_C6G_XLARGE: "ml.c6g.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_LARGE: "ml.c6i.large";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_C7G_12XLARGE: "ml.c7g.12xlarge";
  readonly ML_C7G_16XLARGE: "ml.c7g.16xlarge";
  readonly ML_C7G_2XLARGE: "ml.c7g.2xlarge";
  readonly ML_C7G_4XLARGE: "ml.c7g.4xlarge";
  readonly ML_C7G_8XLARGE: "ml.c7g.8xlarge";
  readonly ML_C7G_LARGE: "ml.c7g.large";
  readonly ML_C7G_XLARGE: "ml.c7g.xlarge";
  readonly ML_C7I_12XLARGE: "ml.c7i.12xlarge";
  readonly ML_C7I_16XLARGE: "ml.c7i.16xlarge";
  readonly ML_C7I_24XLARGE: "ml.c7i.24xlarge";
  readonly ML_C7I_2XLARGE: "ml.c7i.2xlarge";
  readonly ML_C7I_48XLARGE: "ml.c7i.48xlarge";
  readonly ML_C7I_4XLARGE: "ml.c7i.4xlarge";
  readonly ML_C7I_8XLARGE: "ml.c7i.8xlarge";
  readonly ML_C7I_LARGE: "ml.c7i.large";
  readonly ML_C7I_XLARGE: "ml.c7i.xlarge";
  readonly ML_DL1_24XLARGE: "ml.dl1.24xlarge";
  readonly ML_G4DN_12XLARGE: "ml.g4dn.12xlarge";
  readonly ML_G4DN_16XLARGE: "ml.g4dn.16xlarge";
  readonly ML_G4DN_2XLARGE: "ml.g4dn.2xlarge";
  readonly ML_G4DN_4XLARGE: "ml.g4dn.4xlarge";
  readonly ML_G4DN_8XLARGE: "ml.g4dn.8xlarge";
  readonly ML_G4DN_XLARGE: "ml.g4dn.xlarge";
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_G6E_12XLARGE: "ml.g6e.12xlarge";
  readonly ML_G6E_16XLARGE: "ml.g6e.16xlarge";
  readonly ML_G6E_24XLARGE: "ml.g6e.24xlarge";
  readonly ML_G6E_2XLARGE: "ml.g6e.2xlarge";
  readonly ML_G6E_48XLARGE: "ml.g6e.48xlarge";
  readonly ML_G6E_4XLARGE: "ml.g6e.4xlarge";
  readonly ML_G6E_8XLARGE: "ml.g6e.8xlarge";
  readonly ML_G6E_XLARGE: "ml.g6e.xlarge";
  readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
  readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
  readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
  readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
  readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
  readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
  readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
  readonly ML_G6_XLARGE: "ml.g6.xlarge";
  readonly ML_INF1_24XLARGE: "ml.inf1.24xlarge";
  readonly ML_INF1_2XLARGE: "ml.inf1.2xlarge";
  readonly ML_INF1_6XLARGE: "ml.inf1.6xlarge";
  readonly ML_INF1_XLARGE: "ml.inf1.xlarge";
  readonly ML_INF2_24XLARGE: "ml.inf2.24xlarge";
  readonly ML_INF2_48XLARGE: "ml.inf2.48xlarge";
  readonly ML_INF2_8XLARGE: "ml.inf2.8xlarge";
  readonly ML_INF2_XLARGE: "ml.inf2.xlarge";
  readonly ML_M4_10XLARGE: "ml.m4.10xlarge";
  readonly ML_M4_16XLARGE: "ml.m4.16xlarge";
  readonly ML_M4_2XLARGE: "ml.m4.2xlarge";
  readonly ML_M4_4XLARGE: "ml.m4.4xlarge";
  readonly ML_M4_XLARGE: "ml.m4.xlarge";
  readonly ML_M5D_12XLARGE: "ml.m5d.12xlarge";
  readonly ML_M5D_24XLARGE: "ml.m5d.24xlarge";
  readonly ML_M5D_2XLARGE: "ml.m5d.2xlarge";
  readonly ML_M5D_4XLARGE: "ml.m5d.4xlarge";
  readonly ML_M5D_LARGE: "ml.m5d.large";
  readonly ML_M5D_XLARGE: "ml.m5d.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_LARGE: "ml.m5.large";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6GD_12XLARGE: "ml.m6gd.12xlarge";
  readonly ML_M6GD_16XLARGE: "ml.m6gd.16xlarge";
  readonly ML_M6GD_2XLARGE: "ml.m6gd.2xlarge";
  readonly ML_M6GD_4XLARGE: "ml.m6gd.4xlarge";
  readonly ML_M6GD_8XLARGE: "ml.m6gd.8xlarge";
  readonly ML_M6GD_LARGE: "ml.m6gd.large";
  readonly ML_M6GD_XLARGE: "ml.m6gd.xlarge";
  readonly ML_M6G_12XLARGE: "ml.m6g.12xlarge";
  readonly ML_M6G_16XLARGE: "ml.m6g.16xlarge";
  readonly ML_M6G_2XLARGE: "ml.m6g.2xlarge";
  readonly ML_M6G_4XLARGE: "ml.m6g.4xlarge";
  readonly ML_M6G_8XLARGE: "ml.m6g.8xlarge";
  readonly ML_M6G_LARGE: "ml.m6g.large";
  readonly ML_M6G_XLARGE: "ml.m6g.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_M7I_12XLARGE: "ml.m7i.12xlarge";
  readonly ML_M7I_16XLARGE: "ml.m7i.16xlarge";
  readonly ML_M7I_24XLARGE: "ml.m7i.24xlarge";
  readonly ML_M7I_2XLARGE: "ml.m7i.2xlarge";
  readonly ML_M7I_48XLARGE: "ml.m7i.48xlarge";
  readonly ML_M7I_4XLARGE: "ml.m7i.4xlarge";
  readonly ML_M7I_8XLARGE: "ml.m7i.8xlarge";
  readonly ML_M7I_LARGE: "ml.m7i.large";
  readonly ML_M7I_XLARGE: "ml.m7i.xlarge";
  readonly ML_P2_16XLARGE: "ml.p2.16xlarge";
  readonly ML_P2_8XLARGE: "ml.p2.8xlarge";
  readonly ML_P2_XLARGE: "ml.p2.xlarge";
  readonly ML_P3_16XLARGE: "ml.p3.16xlarge";
  readonly ML_P3_2XLARGE: "ml.p3.2xlarge";
  readonly ML_P3_8XLARGE: "ml.p3.8xlarge";
  readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5EN_48XLARGE: "ml.p5en.48xlarge";
  readonly ML_P5E_48XLARGE: "ml.p5e.48xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_R5D_12XLARGE: "ml.r5d.12xlarge";
  readonly ML_R5D_24XLARGE: "ml.r5d.24xlarge";
  readonly ML_R5D_2XLARGE: "ml.r5d.2xlarge";
  readonly ML_R5D_4XLARGE: "ml.r5d.4xlarge";
  readonly ML_R5D_LARGE: "ml.r5d.large";
  readonly ML_R5D_XLARGE: "ml.r5d.xlarge";
  readonly ML_R5_12XLARGE: "ml.r5.12xlarge";
  readonly ML_R5_24XLARGE: "ml.r5.24xlarge";
  readonly ML_R5_2XLARGE: "ml.r5.2xlarge";
  readonly ML_R5_4XLARGE: "ml.r5.4xlarge";
  readonly ML_R5_LARGE: "ml.r5.large";
  readonly ML_R5_XLARGE: "ml.r5.xlarge";
  readonly ML_R6GD_12XLARGE: "ml.r6gd.12xlarge";
  readonly ML_R6GD_16XLARGE: "ml.r6gd.16xlarge";
  readonly ML_R6GD_2XLARGE: "ml.r6gd.2xlarge";
  readonly ML_R6GD_4XLARGE: "ml.r6gd.4xlarge";
  readonly ML_R6GD_8XLARGE: "ml.r6gd.8xlarge";
  readonly ML_R6GD_LARGE: "ml.r6gd.large";
  readonly ML_R6GD_XLARGE: "ml.r6gd.xlarge";
  readonly ML_R6G_12XLARGE: "ml.r6g.12xlarge";
  readonly ML_R6G_16XLARGE: "ml.r6g.16xlarge";
  readonly ML_R6G_2XLARGE: "ml.r6g.2xlarge";
  readonly ML_R6G_4XLARGE: "ml.r6g.4xlarge";
  readonly ML_R6G_8XLARGE: "ml.r6g.8xlarge";
  readonly ML_R6G_LARGE: "ml.r6g.large";
  readonly ML_R6G_XLARGE: "ml.r6g.xlarge";
  readonly ML_R6I_12XLARGE: "ml.r6i.12xlarge";
  readonly ML_R6I_16XLARGE: "ml.r6i.16xlarge";
  readonly ML_R6I_24XLARGE: "ml.r6i.24xlarge";
  readonly ML_R6I_2XLARGE: "ml.r6i.2xlarge";
  readonly ML_R6I_32XLARGE: "ml.r6i.32xlarge";
  readonly ML_R6I_4XLARGE: "ml.r6i.4xlarge";
  readonly ML_R6I_8XLARGE: "ml.r6i.8xlarge";
  readonly ML_R6I_LARGE: "ml.r6i.large";
  readonly ML_R6I_XLARGE: "ml.r6i.xlarge";
  readonly ML_R7I_12XLARGE: "ml.r7i.12xlarge";
  readonly ML_R7I_16XLARGE: "ml.r7i.16xlarge";
  readonly ML_R7I_24XLARGE: "ml.r7i.24xlarge";
  readonly ML_R7I_2XLARGE: "ml.r7i.2xlarge";
  readonly ML_R7I_48XLARGE: "ml.r7i.48xlarge";
  readonly ML_R7I_4XLARGE: "ml.r7i.4xlarge";
  readonly ML_R7I_8XLARGE: "ml.r7i.8xlarge";
  readonly ML_R7I_LARGE: "ml.r7i.large";
  readonly ML_R7I_XLARGE: "ml.r7i.xlarge";
  readonly ML_R8G_12XLARGE: "ml.r8g.12xlarge";
  readonly ML_R8G_16XLARGE: "ml.r8g.16xlarge";
  readonly ML_R8G_24XLARGE: "ml.r8g.24xlarge";
  readonly ML_R8G_2XLARGE: "ml.r8g.2xlarge";
  readonly ML_R8G_48XLARGE: "ml.r8g.48xlarge";
  readonly ML_R8G_4XLARGE: "ml.r8g.4xlarge";
  readonly ML_R8G_8XLARGE: "ml.r8g.8xlarge";
  readonly ML_R8G_LARGE: "ml.r8g.large";
  readonly ML_R8G_MEDIUM: "ml.r8g.medium";
  readonly ML_R8G_XLARGE: "ml.r8g.xlarge";
  readonly ML_T2_2XLARGE: "ml.t2.2xlarge";
  readonly ML_T2_LARGE: "ml.t2.large";
  readonly ML_T2_MEDIUM: "ml.t2.medium";
  readonly ML_T2_XLARGE: "ml.t2.xlarge";
  readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
  readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
  readonly ML_TRN2_48XLARGE: "ml.trn2.48xlarge";
};
export type ProductionVariantInstanceType =
  (typeof ProductionVariantInstanceType)[keyof typeof ProductionVariantInstanceType];
export declare const TransformInstanceType: {
  readonly ML_C4_2XLARGE: "ml.c4.2xlarge";
  readonly ML_C4_4XLARGE: "ml.c4.4xlarge";
  readonly ML_C4_8XLARGE: "ml.c4.8xlarge";
  readonly ML_C4_XLARGE: "ml.c4.xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_LARGE: "ml.c6i.large";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_C7I_12XLARGE: "ml.c7i.12xlarge";
  readonly ML_C7I_16XLARGE: "ml.c7i.16xlarge";
  readonly ML_C7I_24XLARGE: "ml.c7i.24xlarge";
  readonly ML_C7I_2XLARGE: "ml.c7i.2xlarge";
  readonly ML_C7I_48XLARGE: "ml.c7i.48xlarge";
  readonly ML_C7I_4XLARGE: "ml.c7i.4xlarge";
  readonly ML_C7I_8XLARGE: "ml.c7i.8xlarge";
  readonly ML_C7I_LARGE: "ml.c7i.large";
  readonly ML_C7I_XLARGE: "ml.c7i.xlarge";
  readonly ML_G4DN_12XLARGE: "ml.g4dn.12xlarge";
  readonly ML_G4DN_16XLARGE: "ml.g4dn.16xlarge";
  readonly ML_G4DN_2XLARGE: "ml.g4dn.2xlarge";
  readonly ML_G4DN_4XLARGE: "ml.g4dn.4xlarge";
  readonly ML_G4DN_8XLARGE: "ml.g4dn.8xlarge";
  readonly ML_G4DN_XLARGE: "ml.g4dn.xlarge";
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_INF2_24XLARGE: "ml.inf2.24xlarge";
  readonly ML_INF2_48XLARGE: "ml.inf2.48xlarge";
  readonly ML_INF2_8XLARGE: "ml.inf2.8xlarge";
  readonly ML_INF2_XLARGE: "ml.inf2.xlarge";
  readonly ML_M4_10XLARGE: "ml.m4.10xlarge";
  readonly ML_M4_16XLARGE: "ml.m4.16xlarge";
  readonly ML_M4_2XLARGE: "ml.m4.2xlarge";
  readonly ML_M4_4XLARGE: "ml.m4.4xlarge";
  readonly ML_M4_XLARGE: "ml.m4.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_LARGE: "ml.m5.large";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_M7I_12XLARGE: "ml.m7i.12xlarge";
  readonly ML_M7I_16XLARGE: "ml.m7i.16xlarge";
  readonly ML_M7I_24XLARGE: "ml.m7i.24xlarge";
  readonly ML_M7I_2XLARGE: "ml.m7i.2xlarge";
  readonly ML_M7I_48XLARGE: "ml.m7i.48xlarge";
  readonly ML_M7I_4XLARGE: "ml.m7i.4xlarge";
  readonly ML_M7I_8XLARGE: "ml.m7i.8xlarge";
  readonly ML_M7I_LARGE: "ml.m7i.large";
  readonly ML_M7I_XLARGE: "ml.m7i.xlarge";
  readonly ML_P2_16XLARGE: "ml.p2.16xlarge";
  readonly ML_P2_8XLARGE: "ml.p2.8xlarge";
  readonly ML_P2_XLARGE: "ml.p2.xlarge";
  readonly ML_P3_16XLARGE: "ml.p3.16xlarge";
  readonly ML_P3_2XLARGE: "ml.p3.2xlarge";
  readonly ML_P3_8XLARGE: "ml.p3.8xlarge";
  readonly ML_R6I_12XLARGE: "ml.r6i.12xlarge";
  readonly ML_R6I_16XLARGE: "ml.r6i.16xlarge";
  readonly ML_R6I_24XLARGE: "ml.r6i.24xlarge";
  readonly ML_R6I_2XLARGE: "ml.r6i.2xlarge";
  readonly ML_R6I_32XLARGE: "ml.r6i.32xlarge";
  readonly ML_R6I_4XLARGE: "ml.r6i.4xlarge";
  readonly ML_R6I_8XLARGE: "ml.r6i.8xlarge";
  readonly ML_R6I_LARGE: "ml.r6i.large";
  readonly ML_R6I_XLARGE: "ml.r6i.xlarge";
  readonly ML_R7I_12XLARGE: "ml.r7i.12xlarge";
  readonly ML_R7I_16XLARGE: "ml.r7i.16xlarge";
  readonly ML_R7I_24XLARGE: "ml.r7i.24xlarge";
  readonly ML_R7I_2XLARGE: "ml.r7i.2xlarge";
  readonly ML_R7I_48XLARGE: "ml.r7i.48xlarge";
  readonly ML_R7I_4XLARGE: "ml.r7i.4xlarge";
  readonly ML_R7I_8XLARGE: "ml.r7i.8xlarge";
  readonly ML_R7I_LARGE: "ml.r7i.large";
  readonly ML_R7I_XLARGE: "ml.r7i.xlarge";
  readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
};
export type TransformInstanceType =
  (typeof TransformInstanceType)[keyof typeof TransformInstanceType];
export interface AdditionalInferenceSpecificationDefinition {
  Name: string | undefined;
  Description?: string | undefined;
  Containers: ModelPackageContainerDefinition[] | undefined;
  SupportedTransformInstanceTypes?: TransformInstanceType[] | undefined;
  SupportedRealtimeInferenceInstanceTypes?:
    | ProductionVariantInstanceType[]
    | undefined;
  SupportedContentTypes?: string[] | undefined;
  SupportedResponseMIMETypes?: string[] | undefined;
}
export interface AdditionalModelDataSource {
  ChannelName: string | undefined;
  S3DataSource: S3ModelDataSource | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export interface AddTagsInput {
  ResourceArn: string | undefined;
  Tags: Tag[] | undefined;
}
export interface AddTagsOutput {
  Tags?: Tag[] | undefined;
}
export interface AgentVersion {
  Version: string | undefined;
  AgentCount: number | undefined;
}
export declare const AggregationTransformationValue: {
  readonly Avg: "avg";
  readonly First: "first";
  readonly Max: "max";
  readonly Min: "min";
  readonly Sum: "sum";
};
export type AggregationTransformationValue =
  (typeof AggregationTransformationValue)[keyof typeof AggregationTransformationValue];
export interface Alarm {
  AlarmName?: string | undefined;
}
export interface AlarmDetails {
  AlarmName: string | undefined;
}
export declare const AlgorithmSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
};
export type AlgorithmSortBy =
  (typeof AlgorithmSortBy)[keyof typeof AlgorithmSortBy];
export interface MetricDefinition {
  Name: string | undefined;
  Regex: string | undefined;
}
export declare const TrainingRepositoryAccessMode: {
  readonly PLATFORM: "Platform";
  readonly VPC: "Vpc";
};
export type TrainingRepositoryAccessMode =
  (typeof TrainingRepositoryAccessMode)[keyof typeof TrainingRepositoryAccessMode];
export interface TrainingRepositoryAuthConfig {
  TrainingRepositoryCredentialsProviderArn: string | undefined;
}
export interface TrainingImageConfig {
  TrainingRepositoryAccessMode: TrainingRepositoryAccessMode | undefined;
  TrainingRepositoryAuthConfig?: TrainingRepositoryAuthConfig | undefined;
}
export declare const TrainingInputMode: {
  readonly FASTFILE: "FastFile";
  readonly FILE: "File";
  readonly PIPE: "Pipe";
};
export type TrainingInputMode =
  (typeof TrainingInputMode)[keyof typeof TrainingInputMode];
export interface AlgorithmSpecification {
  TrainingImage?: string | undefined;
  AlgorithmName?: string | undefined;
  TrainingInputMode: TrainingInputMode | undefined;
  MetricDefinitions?: MetricDefinition[] | undefined;
  EnableSageMakerMetricsTimeSeries?: boolean | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
  TrainingImageConfig?: TrainingImageConfig | undefined;
}
export declare const AlgorithmStatus: {
  readonly COMPLETED: "Completed";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly PENDING: "Pending";
};
export type AlgorithmStatus =
  (typeof AlgorithmStatus)[keyof typeof AlgorithmStatus];
export declare const DetailedAlgorithmStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly NOT_STARTED: "NotStarted";
};
export type DetailedAlgorithmStatus =
  (typeof DetailedAlgorithmStatus)[keyof typeof DetailedAlgorithmStatus];
export interface AlgorithmStatusItem {
  Name: string | undefined;
  Status: DetailedAlgorithmStatus | undefined;
  FailureReason?: string | undefined;
}
export interface AlgorithmStatusDetails {
  ValidationStatuses?: AlgorithmStatusItem[] | undefined;
  ImageScanStatuses?: AlgorithmStatusItem[] | undefined;
}
export interface AlgorithmSummary {
  AlgorithmName: string | undefined;
  AlgorithmArn: string | undefined;
  AlgorithmDescription?: string | undefined;
  CreationTime: Date | undefined;
  AlgorithmStatus: AlgorithmStatus | undefined;
}
export declare const FileSystemAccessMode: {
  readonly RO: "ro";
  readonly RW: "rw";
};
export type FileSystemAccessMode =
  (typeof FileSystemAccessMode)[keyof typeof FileSystemAccessMode];
export declare const FileSystemType: {
  readonly EFS: "EFS";
  readonly FSXLUSTRE: "FSxLustre";
};
export type FileSystemType =
  (typeof FileSystemType)[keyof typeof FileSystemType];
export interface FileSystemDataSource {
  FileSystemId: string | undefined;
  FileSystemAccessMode: FileSystemAccessMode | undefined;
  FileSystemType: FileSystemType | undefined;
  DirectoryPath: string | undefined;
}
export interface HubAccessConfig {
  HubContentArn: string | undefined;
}
export declare const S3DataDistribution: {
  readonly FULLY_REPLICATED: "FullyReplicated";
  readonly SHARDED_BY_S3_KEY: "ShardedByS3Key";
};
export type S3DataDistribution =
  (typeof S3DataDistribution)[keyof typeof S3DataDistribution];
export declare const S3DataType: {
  readonly AUGMENTED_MANIFEST_FILE: "AugmentedManifestFile";
  readonly MANIFEST_FILE: "ManifestFile";
  readonly S3_PREFIX: "S3Prefix";
};
export type S3DataType = (typeof S3DataType)[keyof typeof S3DataType];
export interface S3DataSource {
  S3DataType: S3DataType | undefined;
  S3Uri: string | undefined;
  S3DataDistributionType?: S3DataDistribution | undefined;
  AttributeNames?: string[] | undefined;
  InstanceGroupNames?: string[] | undefined;
  ModelAccessConfig?: ModelAccessConfig | undefined;
  HubAccessConfig?: HubAccessConfig | undefined;
}
export interface DataSource {
  S3DataSource?: S3DataSource | undefined;
  FileSystemDataSource?: FileSystemDataSource | undefined;
}
export declare const RecordWrapper: {
  readonly NONE: "None";
  readonly RECORDIO: "RecordIO";
};
export type RecordWrapper = (typeof RecordWrapper)[keyof typeof RecordWrapper];
export interface ShuffleConfig {
  Seed: number | undefined;
}
export interface Channel {
  ChannelName: string | undefined;
  DataSource: DataSource | undefined;
  ContentType?: string | undefined;
  CompressionType?: CompressionType | undefined;
  RecordWrapperType?: RecordWrapper | undefined;
  InputMode?: TrainingInputMode | undefined;
  ShuffleConfig?: ShuffleConfig | undefined;
}
export declare const OutputCompressionType: {
  readonly GZIP: "GZIP";
  readonly NONE: "NONE";
};
export type OutputCompressionType =
  (typeof OutputCompressionType)[keyof typeof OutputCompressionType];
export interface OutputDataConfig {
  KmsKeyId?: string | undefined;
  S3OutputPath: string | undefined;
  CompressionType?: OutputCompressionType | undefined;
}
export declare const TrainingInstanceType: {
  readonly ML_C4_2XLARGE: "ml.c4.2xlarge";
  readonly ML_C4_4XLARGE: "ml.c4.4xlarge";
  readonly ML_C4_8XLARGE: "ml.c4.8xlarge";
  readonly ML_C4_XLARGE: "ml.c4.xlarge";
  readonly ML_C5N_18XLARGE: "ml.c5n.18xlarge";
  readonly ML_C5N_2XLARGE: "ml.c5n.2xlarge";
  readonly ML_C5N_4XLARGE: "ml.c5n.4xlarge";
  readonly ML_C5N_9XLARGE: "ml.c5n.9xlarge";
  readonly ML_C5N_XLARGE: "ml.c5n.xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_G4DN_12XLARGE: "ml.g4dn.12xlarge";
  readonly ML_G4DN_16XLARGE: "ml.g4dn.16xlarge";
  readonly ML_G4DN_2XLARGE: "ml.g4dn.2xlarge";
  readonly ML_G4DN_4XLARGE: "ml.g4dn.4xlarge";
  readonly ML_G4DN_8XLARGE: "ml.g4dn.8xlarge";
  readonly ML_G4DN_XLARGE: "ml.g4dn.xlarge";
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_G6E_12XLARGE: "ml.g6e.12xlarge";
  readonly ML_G6E_16XLARGE: "ml.g6e.16xlarge";
  readonly ML_G6E_24XLARGE: "ml.g6e.24xlarge";
  readonly ML_G6E_2XLARGE: "ml.g6e.2xlarge";
  readonly ML_G6E_48XLARGE: "ml.g6e.48xlarge";
  readonly ML_G6E_4XLARGE: "ml.g6e.4xlarge";
  readonly ML_G6E_8XLARGE: "ml.g6e.8xlarge";
  readonly ML_G6E_XLARGE: "ml.g6e.xlarge";
  readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
  readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
  readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
  readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
  readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
  readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
  readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
  readonly ML_G6_XLARGE: "ml.g6.xlarge";
  readonly ML_M4_10XLARGE: "ml.m4.10xlarge";
  readonly ML_M4_16XLARGE: "ml.m4.16xlarge";
  readonly ML_M4_2XLARGE: "ml.m4.2xlarge";
  readonly ML_M4_4XLARGE: "ml.m4.4xlarge";
  readonly ML_M4_XLARGE: "ml.m4.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_LARGE: "ml.m5.large";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_P2_16XLARGE: "ml.p2.16xlarge";
  readonly ML_P2_8XLARGE: "ml.p2.8xlarge";
  readonly ML_P2_XLARGE: "ml.p2.xlarge";
  readonly ML_P3DN_24XLARGE: "ml.p3dn.24xlarge";
  readonly ML_P3_16XLARGE: "ml.p3.16xlarge";
  readonly ML_P3_2XLARGE: "ml.p3.2xlarge";
  readonly ML_P3_8XLARGE: "ml.p3.8xlarge";
  readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5EN_48XLARGE: "ml.p5en.48xlarge";
  readonly ML_P5E_48XLARGE: "ml.p5e.48xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_R5D_12XLARGE: "ml.r5d.12xlarge";
  readonly ML_R5D_16XLARGE: "ml.r5d.16xlarge";
  readonly ML_R5D_24XLARGE: "ml.r5d.24xlarge";
  readonly ML_R5D_2XLARGE: "ml.r5d.2xlarge";
  readonly ML_R5D_4XLARGE: "ml.r5d.4xlarge";
  readonly ML_R5D_8XLARGE: "ml.r5d.8xlarge";
  readonly ML_R5D_LARGE: "ml.r5d.large";
  readonly ML_R5D_XLARGE: "ml.r5d.xlarge";
  readonly ML_R5_12XLARGE: "ml.r5.12xlarge";
  readonly ML_R5_16XLARGE: "ml.r5.16xlarge";
  readonly ML_R5_24XLARGE: "ml.r5.24xlarge";
  readonly ML_R5_2XLARGE: "ml.r5.2xlarge";
  readonly ML_R5_4XLARGE: "ml.r5.4xlarge";
  readonly ML_R5_8XLARGE: "ml.r5.8xlarge";
  readonly ML_R5_LARGE: "ml.r5.large";
  readonly ML_R5_XLARGE: "ml.r5.xlarge";
  readonly ML_T3_2XLARGE: "ml.t3.2xlarge";
  readonly ML_T3_LARGE: "ml.t3.large";
  readonly ML_T3_MEDIUM: "ml.t3.medium";
  readonly ML_T3_XLARGE: "ml.t3.xlarge";
  readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
  readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
  readonly ML_TRN2_48XLARGE: "ml.trn2.48xlarge";
};
export type TrainingInstanceType =
  (typeof TrainingInstanceType)[keyof typeof TrainingInstanceType];
export interface InstanceGroup {
  InstanceType: TrainingInstanceType | undefined;
  InstanceCount: number | undefined;
  InstanceGroupName: string | undefined;
}
export interface ResourceConfig {
  InstanceType?: TrainingInstanceType | undefined;
  InstanceCount?: number | undefined;
  VolumeSizeInGB: number | undefined;
  VolumeKmsKeyId?: string | undefined;
  KeepAlivePeriodInSeconds?: number | undefined;
  InstanceGroups?: InstanceGroup[] | undefined;
  TrainingPlanArn?: string | undefined;
}
export interface StoppingCondition {
  MaxRuntimeInSeconds?: number | undefined;
  MaxWaitTimeInSeconds?: number | undefined;
  MaxPendingTimeInSeconds?: number | undefined;
}
export interface TrainingJobDefinition {
  TrainingInputMode: TrainingInputMode | undefined;
  HyperParameters?: Record<string, string> | undefined;
  InputDataConfig: Channel[] | undefined;
  OutputDataConfig: OutputDataConfig | undefined;
  ResourceConfig: ResourceConfig | undefined;
  StoppingCondition: StoppingCondition | undefined;
}
export declare const BatchStrategy: {
  readonly MULTI_RECORD: "MultiRecord";
  readonly SINGLE_RECORD: "SingleRecord";
};
export type BatchStrategy = (typeof BatchStrategy)[keyof typeof BatchStrategy];
export interface TransformS3DataSource {
  S3DataType: S3DataType | undefined;
  S3Uri: string | undefined;
}
export interface TransformDataSource {
  S3DataSource: TransformS3DataSource | undefined;
}
export declare const SplitType: {
  readonly LINE: "Line";
  readonly NONE: "None";
  readonly RECORDIO: "RecordIO";
  readonly TFRECORD: "TFRecord";
};
export type SplitType = (typeof SplitType)[keyof typeof SplitType];
export interface TransformInput {
  DataSource: TransformDataSource | undefined;
  ContentType?: string | undefined;
  CompressionType?: CompressionType | undefined;
  SplitType?: SplitType | undefined;
}
export declare const AssemblyType: {
  readonly LINE: "Line";
  readonly NONE: "None";
};
export type AssemblyType = (typeof AssemblyType)[keyof typeof AssemblyType];
export interface TransformOutput {
  S3OutputPath: string | undefined;
  Accept?: string | undefined;
  AssembleWith?: AssemblyType | undefined;
  KmsKeyId?: string | undefined;
}
export interface TransformResources {
  InstanceType: TransformInstanceType | undefined;
  InstanceCount: number | undefined;
  VolumeKmsKeyId?: string | undefined;
  TransformAmiVersion?: string | undefined;
}
export interface TransformJobDefinition {
  MaxConcurrentTransforms?: number | undefined;
  MaxPayloadInMB?: number | undefined;
  BatchStrategy?: BatchStrategy | undefined;
  Environment?: Record<string, string> | undefined;
  TransformInput: TransformInput | undefined;
  TransformOutput: TransformOutput | undefined;
  TransformResources: TransformResources | undefined;
}
export interface AlgorithmValidationProfile {
  ProfileName: string | undefined;
  TrainingJobDefinition: TrainingJobDefinition | undefined;
  TransformJobDefinition?: TransformJobDefinition | undefined;
}
export interface AlgorithmValidationSpecification {
  ValidationRole: string | undefined;
  ValidationProfiles: AlgorithmValidationProfile[] | undefined;
}
export declare const FeatureStatus: {
  readonly Disabled: "DISABLED";
  readonly Enabled: "ENABLED";
};
export type FeatureStatus = (typeof FeatureStatus)[keyof typeof FeatureStatus];
export interface AmazonQSettings {
  Status?: FeatureStatus | undefined;
  QProfileArn?: string | undefined;
}
export interface AnnotationConsolidationConfig {
  AnnotationConsolidationLambdaArn: string | undefined;
}
export declare const AppType: {
  readonly Canvas: "Canvas";
  readonly CodeEditor: "CodeEditor";
  readonly DetailedProfiler: "DetailedProfiler";
  readonly JupyterLab: "JupyterLab";
  readonly JupyterServer: "JupyterServer";
  readonly KernelGateway: "KernelGateway";
  readonly RSessionGateway: "RSessionGateway";
  readonly RStudioServerPro: "RStudioServerPro";
  readonly TensorBoard: "TensorBoard";
};
export type AppType = (typeof AppType)[keyof typeof AppType];
export declare const AppInstanceType: {
  readonly ML_C5_12XLARGE: "ml.c5.12xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_24XLARGE: "ml.c5.24xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_LARGE: "ml.c5.large";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6ID_12XLARGE: "ml.c6id.12xlarge";
  readonly ML_C6ID_16XLARGE: "ml.c6id.16xlarge";
  readonly ML_C6ID_24XLARGE: "ml.c6id.24xlarge";
  readonly ML_C6ID_2XLARGE: "ml.c6id.2xlarge";
  readonly ML_C6ID_32XLARGE: "ml.c6id.32xlarge";
  readonly ML_C6ID_4XLARGE: "ml.c6id.4xlarge";
  readonly ML_C6ID_8XLARGE: "ml.c6id.8xlarge";
  readonly ML_C6ID_LARGE: "ml.c6id.large";
  readonly ML_C6ID_XLARGE: "ml.c6id.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_LARGE: "ml.c6i.large";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_C7I_12XLARGE: "ml.c7i.12xlarge";
  readonly ML_C7I_16XLARGE: "ml.c7i.16xlarge";
  readonly ML_C7I_24XLARGE: "ml.c7i.24xlarge";
  readonly ML_C7I_2XLARGE: "ml.c7i.2xlarge";
  readonly ML_C7I_48XLARGE: "ml.c7i.48xlarge";
  readonly ML_C7I_4XLARGE: "ml.c7i.4xlarge";
  readonly ML_C7I_8XLARGE: "ml.c7i.8xlarge";
  readonly ML_C7I_LARGE: "ml.c7i.large";
  readonly ML_C7I_XLARGE: "ml.c7i.xlarge";
  readonly ML_G4DN_12XLARGE: "ml.g4dn.12xlarge";
  readonly ML_G4DN_16XLARGE: "ml.g4dn.16xlarge";
  readonly ML_G4DN_2XLARGE: "ml.g4dn.2xlarge";
  readonly ML_G4DN_4XLARGE: "ml.g4dn.4xlarge";
  readonly ML_G4DN_8XLARGE: "ml.g4dn.8xlarge";
  readonly ML_G4DN_XLARGE: "ml.g4dn.xlarge";
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_G6E_12XLARGE: "ml.g6e.12xlarge";
  readonly ML_G6E_16XLARGE: "ml.g6e.16xlarge";
  readonly ML_G6E_24XLARGE: "ml.g6e.24xlarge";
  readonly ML_G6E_2XLARGE: "ml.g6e.2xlarge";
  readonly ML_G6E_48XLARGE: "ml.g6e.48xlarge";
  readonly ML_G6E_4XLARGE: "ml.g6e.4xlarge";
  readonly ML_G6E_8XLARGE: "ml.g6e.8xlarge";
  readonly ML_G6E_XLARGE: "ml.g6e.xlarge";
  readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
  readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
  readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
  readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
  readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
  readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
  readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
  readonly ML_G6_XLARGE: "ml.g6.xlarge";
  readonly ML_GEOSPATIAL_INTERACTIVE: "ml.geospatial.interactive";
  readonly ML_M5D_12XLARGE: "ml.m5d.12xlarge";
  readonly ML_M5D_16XLARGE: "ml.m5d.16xlarge";
  readonly ML_M5D_24XLARGE: "ml.m5d.24xlarge";
  readonly ML_M5D_2XLARGE: "ml.m5d.2xlarge";
  readonly ML_M5D_4XLARGE: "ml.m5d.4xlarge";
  readonly ML_M5D_8XLARGE: "ml.m5d.8xlarge";
  readonly ML_M5D_LARGE: "ml.m5d.large";
  readonly ML_M5D_XLARGE: "ml.m5d.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_16XLARGE: "ml.m5.16xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_8XLARGE: "ml.m5.8xlarge";
  readonly ML_M5_LARGE: "ml.m5.large";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6ID_12XLARGE: "ml.m6id.12xlarge";
  readonly ML_M6ID_16XLARGE: "ml.m6id.16xlarge";
  readonly ML_M6ID_24XLARGE: "ml.m6id.24xlarge";
  readonly ML_M6ID_2XLARGE: "ml.m6id.2xlarge";
  readonly ML_M6ID_32XLARGE: "ml.m6id.32xlarge";
  readonly ML_M6ID_4XLARGE: "ml.m6id.4xlarge";
  readonly ML_M6ID_8XLARGE: "ml.m6id.8xlarge";
  readonly ML_M6ID_LARGE: "ml.m6id.large";
  readonly ML_M6ID_XLARGE: "ml.m6id.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_M7I_12XLARGE: "ml.m7i.12xlarge";
  readonly ML_M7I_16XLARGE: "ml.m7i.16xlarge";
  readonly ML_M7I_24XLARGE: "ml.m7i.24xlarge";
  readonly ML_M7I_2XLARGE: "ml.m7i.2xlarge";
  readonly ML_M7I_48XLARGE: "ml.m7i.48xlarge";
  readonly ML_M7I_4XLARGE: "ml.m7i.4xlarge";
  readonly ML_M7I_8XLARGE: "ml.m7i.8xlarge";
  readonly ML_M7I_LARGE: "ml.m7i.large";
  readonly ML_M7I_XLARGE: "ml.m7i.xlarge";
  readonly ML_P3DN_24XLARGE: "ml.p3dn.24xlarge";
  readonly ML_P3_16XLARGE: "ml.p3.16xlarge";
  readonly ML_P3_2XLARGE: "ml.p3.2xlarge";
  readonly ML_P3_8XLARGE: "ml.p3.8xlarge";
  readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5EN_48XLARGE: "ml.p5en.48xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_R5_12XLARGE: "ml.r5.12xlarge";
  readonly ML_R5_16XLARGE: "ml.r5.16xlarge";
  readonly ML_R5_24XLARGE: "ml.r5.24xlarge";
  readonly ML_R5_2XLARGE: "ml.r5.2xlarge";
  readonly ML_R5_4XLARGE: "ml.r5.4xlarge";
  readonly ML_R5_8XLARGE: "ml.r5.8xlarge";
  readonly ML_R5_LARGE: "ml.r5.large";
  readonly ML_R5_XLARGE: "ml.r5.xlarge";
  readonly ML_R6ID_12XLARGE: "ml.r6id.12xlarge";
  readonly ML_R6ID_16XLARGE: "ml.r6id.16xlarge";
  readonly ML_R6ID_24XLARGE: "ml.r6id.24xlarge";
  readonly ML_R6ID_2XLARGE: "ml.r6id.2xlarge";
  readonly ML_R6ID_32XLARGE: "ml.r6id.32xlarge";
  readonly ML_R6ID_4XLARGE: "ml.r6id.4xlarge";
  readonly ML_R6ID_8XLARGE: "ml.r6id.8xlarge";
  readonly ML_R6ID_LARGE: "ml.r6id.large";
  readonly ML_R6ID_XLARGE: "ml.r6id.xlarge";
  readonly ML_R6I_12XLARGE: "ml.r6i.12xlarge";
  readonly ML_R6I_16XLARGE: "ml.r6i.16xlarge";
  readonly ML_R6I_24XLARGE: "ml.r6i.24xlarge";
  readonly ML_R6I_2XLARGE: "ml.r6i.2xlarge";
  readonly ML_R6I_32XLARGE: "ml.r6i.32xlarge";
  readonly ML_R6I_4XLARGE: "ml.r6i.4xlarge";
  readonly ML_R6I_8XLARGE: "ml.r6i.8xlarge";
  readonly ML_R6I_LARGE: "ml.r6i.large";
  readonly ML_R6I_XLARGE: "ml.r6i.xlarge";
  readonly ML_R7I_12XLARGE: "ml.r7i.12xlarge";
  readonly ML_R7I_16XLARGE: "ml.r7i.16xlarge";
  readonly ML_R7I_24XLARGE: "ml.r7i.24xlarge";
  readonly ML_R7I_2XLARGE: "ml.r7i.2xlarge";
  readonly ML_R7I_48XLARGE: "ml.r7i.48xlarge";
  readonly ML_R7I_4XLARGE: "ml.r7i.4xlarge";
  readonly ML_R7I_8XLARGE: "ml.r7i.8xlarge";
  readonly ML_R7I_LARGE: "ml.r7i.large";
  readonly ML_R7I_XLARGE: "ml.r7i.xlarge";
  readonly ML_T3_2XLARGE: "ml.t3.2xlarge";
  readonly ML_T3_LARGE: "ml.t3.large";
  readonly ML_T3_MEDIUM: "ml.t3.medium";
  readonly ML_T3_MICRO: "ml.t3.micro";
  readonly ML_T3_SMALL: "ml.t3.small";
  readonly ML_T3_XLARGE: "ml.t3.xlarge";
  readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
  readonly ML_TRN1_2XLARGE: "ml.trn1.2xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
  readonly SYSTEM: "system";
};
export type AppInstanceType =
  (typeof AppInstanceType)[keyof typeof AppInstanceType];
export interface ResourceSpec {
  SageMakerImageArn?: string | undefined;
  SageMakerImageVersionArn?: string | undefined;
  SageMakerImageVersionAlias?: string | undefined;
  InstanceType?: AppInstanceType | undefined;
  LifecycleConfigArn?: string | undefined;
}
export declare const AppStatus: {
  readonly Deleted: "Deleted";
  readonly Deleting: "Deleting";
  readonly Failed: "Failed";
  readonly InService: "InService";
  readonly Pending: "Pending";
};
export type AppStatus = (typeof AppStatus)[keyof typeof AppStatus];
export interface AppDetails {
  DomainId?: string | undefined;
  UserProfileName?: string | undefined;
  SpaceName?: string | undefined;
  AppType?: AppType | undefined;
  AppName?: string | undefined;
  Status?: AppStatus | undefined;
  CreationTime?: Date | undefined;
  ResourceSpec?: ResourceSpec | undefined;
}
export interface ContainerConfig {
  ContainerArguments?: string[] | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerEnvironmentVariables?: Record<string, string> | undefined;
}
export interface FileSystemConfig {
  MountPath?: string | undefined;
  DefaultUid?: number | undefined;
  DefaultGid?: number | undefined;
}
export interface CodeEditorAppImageConfig {
  FileSystemConfig?: FileSystemConfig | undefined;
  ContainerConfig?: ContainerConfig | undefined;
}
export interface JupyterLabAppImageConfig {
  FileSystemConfig?: FileSystemConfig | undefined;
  ContainerConfig?: ContainerConfig | undefined;
}
export interface KernelSpec {
  Name: string | undefined;
  DisplayName?: string | undefined;
}
export interface KernelGatewayImageConfig {
  KernelSpecs: KernelSpec[] | undefined;
  FileSystemConfig?: FileSystemConfig | undefined;
}
export interface AppImageConfigDetails {
  AppImageConfigArn?: string | undefined;
  AppImageConfigName?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
  KernelGatewayImageConfig?: KernelGatewayImageConfig | undefined;
  JupyterLabAppImageConfig?: JupyterLabAppImageConfig | undefined;
  CodeEditorAppImageConfig?: CodeEditorAppImageConfig | undefined;
}
export declare const AppImageConfigSortKey: {
  readonly CreationTime: "CreationTime";
  readonly LastModifiedTime: "LastModifiedTime";
  readonly Name: "Name";
};
export type AppImageConfigSortKey =
  (typeof AppImageConfigSortKey)[keyof typeof AppImageConfigSortKey];
export declare const LifecycleManagement: {
  readonly Disabled: "DISABLED";
  readonly Enabled: "ENABLED";
};
export type LifecycleManagement =
  (typeof LifecycleManagement)[keyof typeof LifecycleManagement];
export interface IdleSettings {
  LifecycleManagement?: LifecycleManagement | undefined;
  IdleTimeoutInMinutes?: number | undefined;
  MinIdleTimeoutInMinutes?: number | undefined;
  MaxIdleTimeoutInMinutes?: number | undefined;
}
export interface AppLifecycleManagement {
  IdleSettings?: IdleSettings | undefined;
}
export declare const AppNetworkAccessType: {
  readonly PublicInternetOnly: "PublicInternetOnly";
  readonly VpcOnly: "VpcOnly";
};
export type AppNetworkAccessType =
  (typeof AppNetworkAccessType)[keyof typeof AppNetworkAccessType];
export declare const AppSecurityGroupManagement: {
  readonly Customer: "Customer";
  readonly Service: "Service";
};
export type AppSecurityGroupManagement =
  (typeof AppSecurityGroupManagement)[keyof typeof AppSecurityGroupManagement];
export declare const AppSortKey: {
  readonly CreationTime: "CreationTime";
};
export type AppSortKey = (typeof AppSortKey)[keyof typeof AppSortKey];
export interface AppSpecification {
  ImageUri: string | undefined;
  ContainerEntrypoint?: string[] | undefined;
  ContainerArguments?: string[] | undefined;
}
export declare const ArtifactSourceIdType: {
  readonly CUSTOM: "Custom";
  readonly MD5_HASH: "MD5Hash";
  readonly S3_ETAG: "S3ETag";
  readonly S3_VERSION: "S3Version";
};
export type ArtifactSourceIdType =
  (typeof ArtifactSourceIdType)[keyof typeof ArtifactSourceIdType];
export interface ArtifactSourceType {
  SourceIdType: ArtifactSourceIdType | undefined;
  Value: string | undefined;
}
export interface ArtifactSource {
  SourceUri: string | undefined;
  SourceTypes?: ArtifactSourceType[] | undefined;
}
export interface ArtifactSummary {
  ArtifactArn?: string | undefined;
  ArtifactName?: string | undefined;
  Source?: ArtifactSource | undefined;
  ArtifactType?: string | undefined;
  CreationTime?: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export interface AssociateTrialComponentRequest {
  TrialComponentName: string | undefined;
  TrialName: string | undefined;
}
export interface AssociateTrialComponentResponse {
  TrialComponentArn?: string | undefined;
  TrialArn?: string | undefined;
}
export interface IamIdentity {
  Arn?: string | undefined;
  PrincipalId?: string | undefined;
  SourceIdentity?: string | undefined;
}
export interface UserContext {
  UserProfileArn?: string | undefined;
  UserProfileName?: string | undefined;
  DomainId?: string | undefined;
  IamIdentity?: IamIdentity | undefined;
}
export interface AssociationSummary {
  SourceArn?: string | undefined;
  DestinationArn?: string | undefined;
  SourceType?: string | undefined;
  DestinationType?: string | undefined;
  AssociationType?: AssociationEdgeType | undefined;
  SourceName?: string | undefined;
  DestinationName?: string | undefined;
  CreationTime?: Date | undefined;
  CreatedBy?: UserContext | undefined;
}
export interface AsyncInferenceClientConfig {
  MaxConcurrentInvocationsPerInstance?: number | undefined;
}
export declare const AsyncNotificationTopicTypes: {
  readonly ERROR_NOTIFICATION_TOPIC: "ERROR_NOTIFICATION_TOPIC";
  readonly SUCCESS_NOTIFICATION_TOPIC: "SUCCESS_NOTIFICATION_TOPIC";
};
export type AsyncNotificationTopicTypes =
  (typeof AsyncNotificationTopicTypes)[keyof typeof AsyncNotificationTopicTypes];
export interface AsyncInferenceNotificationConfig {
  SuccessTopic?: string | undefined;
  ErrorTopic?: string | undefined;
  IncludeInferenceResponseIn?: AsyncNotificationTopicTypes[] | undefined;
}
export interface AsyncInferenceOutputConfig {
  KmsKeyId?: string | undefined;
  S3OutputPath?: string | undefined;
  NotificationConfig?: AsyncInferenceNotificationConfig | undefined;
  S3FailurePath?: string | undefined;
}
export interface AsyncInferenceConfig {
  ClientConfig?: AsyncInferenceClientConfig | undefined;
  OutputConfig: AsyncInferenceOutputConfig | undefined;
}
export declare const AthenaResultCompressionType: {
  readonly GZIP: "GZIP";
  readonly SNAPPY: "SNAPPY";
  readonly ZLIB: "ZLIB";
};
export type AthenaResultCompressionType =
  (typeof AthenaResultCompressionType)[keyof typeof AthenaResultCompressionType];
export declare const AthenaResultFormat: {
  readonly AVRO: "AVRO";
  readonly JSON: "JSON";
  readonly ORC: "ORC";
  readonly PARQUET: "PARQUET";
  readonly TEXTFILE: "TEXTFILE";
};
export type AthenaResultFormat =
  (typeof AthenaResultFormat)[keyof typeof AthenaResultFormat];
export interface AthenaDatasetDefinition {
  Catalog: string | undefined;
  Database: string | undefined;
  QueryString: string | undefined;
  WorkGroup?: string | undefined;
  OutputS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  OutputFormat: AthenaResultFormat | undefined;
  OutputCompression?: AthenaResultCompressionType | undefined;
}
export declare const AuthMode: {
  readonly IAM: "IAM";
  readonly SSO: "SSO";
};
export type AuthMode = (typeof AuthMode)[keyof typeof AuthMode];
export declare const AutoMLAlgorithm: {
  readonly ARIMA: "arima";
  readonly CATBOOST: "catboost";
  readonly CNN_QR: "cnn-qr";
  readonly DEEPAR: "deepar";
  readonly ETS: "ets";
  readonly EXTRA_TREES: "extra-trees";
  readonly FASTAI: "fastai";
  readonly LIGHTGBM: "lightgbm";
  readonly LINEAR_LEARNER: "linear-learner";
  readonly MLP: "mlp";
  readonly NN_TORCH: "nn-torch";
  readonly NPTS: "npts";
  readonly PROPHET: "prophet";
  readonly RANDOMFOREST: "randomforest";
  readonly XGBOOST: "xgboost";
};
export type AutoMLAlgorithm =
  (typeof AutoMLAlgorithm)[keyof typeof AutoMLAlgorithm];
export interface AutoMLAlgorithmConfig {
  AutoMLAlgorithms: AutoMLAlgorithm[] | undefined;
}
export interface CandidateArtifactLocations {
  Explainability: string | undefined;
  ModelInsights?: string | undefined;
  BacktestResults?: string | undefined;
}
export declare const AutoMLMetricEnum: {
  readonly ACCURACY: "Accuracy";
  readonly AUC: "AUC";
  readonly AVERAGE_WEIGHTED_QUANTILE_LOSS: "AverageWeightedQuantileLoss";
  readonly BALANCED_ACCURACY: "BalancedAccuracy";
  readonly F1: "F1";
  readonly F1_MACRO: "F1macro";
  readonly MAE: "MAE";
  readonly MAPE: "MAPE";
  readonly MASE: "MASE";
  readonly MSE: "MSE";
  readonly PRECISION: "Precision";
  readonly PRECISION_MACRO: "PrecisionMacro";
  readonly R2: "R2";
  readonly RECALL: "Recall";
  readonly RECALL_MACRO: "RecallMacro";
  readonly RMSE: "RMSE";
  readonly WAPE: "WAPE";
};
export type AutoMLMetricEnum =
  (typeof AutoMLMetricEnum)[keyof typeof AutoMLMetricEnum];
export declare const MetricSetSource: {
  readonly TEST: "Test";
  readonly TRAIN: "Train";
  readonly VALIDATION: "Validation";
};
export type MetricSetSource =
  (typeof MetricSetSource)[keyof typeof MetricSetSource];
export declare const AutoMLMetricExtendedEnum: {
  readonly ACCURACY: "Accuracy";
  readonly AUC: "AUC";
  readonly AVERAGE_WEIGHTED_QUANTILE_LOSS: "AverageWeightedQuantileLoss";
  readonly BALANCED_ACCURACY: "BalancedAccuracy";
  readonly F1: "F1";
  readonly F1_MACRO: "F1macro";
  readonly INFERENCE_LATENCY: "InferenceLatency";
  readonly LogLoss: "LogLoss";
  readonly MAE: "MAE";
  readonly MAPE: "MAPE";
  readonly MASE: "MASE";
  readonly MSE: "MSE";
  readonly PERPLEXITY: "Perplexity";
  readonly PRECISION: "Precision";
  readonly PRECISION_MACRO: "PrecisionMacro";
  readonly R2: "R2";
  readonly RECALL: "Recall";
  readonly RECALL_MACRO: "RecallMacro";
  readonly RMSE: "RMSE";
  readonly ROUGE1: "Rouge1";
  readonly ROUGE2: "Rouge2";
  readonly ROUGEL: "RougeL";
  readonly ROUGEL_SUM: "RougeLSum";
  readonly TRAINING_LOSS: "TrainingLoss";
  readonly VALIDATION_LOSS: "ValidationLoss";
  readonly WAPE: "WAPE";
};
export type AutoMLMetricExtendedEnum =
  (typeof AutoMLMetricExtendedEnum)[keyof typeof AutoMLMetricExtendedEnum];
export interface MetricDatum {
  MetricName?: AutoMLMetricEnum | undefined;
  StandardMetricName?: AutoMLMetricExtendedEnum | undefined;
  Value?: number | undefined;
  Set?: MetricSetSource | undefined;
}
export interface CandidateProperties {
  CandidateArtifactLocations?: CandidateArtifactLocations | undefined;
  CandidateMetrics?: MetricDatum[] | undefined;
}
export declare const CandidateStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type CandidateStatus =
  (typeof CandidateStatus)[keyof typeof CandidateStatus];
export declare const CandidateStepType: {
  readonly PROCESSING: "AWS::SageMaker::ProcessingJob";
  readonly TRAINING: "AWS::SageMaker::TrainingJob";
  readonly TRANSFORM: "AWS::SageMaker::TransformJob";
};
export type CandidateStepType =
  (typeof CandidateStepType)[keyof typeof CandidateStepType];
export interface AutoMLCandidateStep {
  CandidateStepType: CandidateStepType | undefined;
  CandidateStepArn: string | undefined;
  CandidateStepName: string | undefined;
}
export declare const AutoMLJobObjectiveType: {
  readonly MAXIMIZE: "Maximize";
  readonly MINIMIZE: "Minimize";
};
export type AutoMLJobObjectiveType =
  (typeof AutoMLJobObjectiveType)[keyof typeof AutoMLJobObjectiveType];
export interface FinalAutoMLJobObjectiveMetric {
  Type?: AutoMLJobObjectiveType | undefined;
  MetricName: AutoMLMetricEnum | undefined;
  Value: number | undefined;
  StandardMetricName?: AutoMLMetricEnum | undefined;
}
export declare const AutoMLProcessingUnit: {
  readonly CPU: "CPU";
  readonly GPU: "GPU";
};
export type AutoMLProcessingUnit =
  (typeof AutoMLProcessingUnit)[keyof typeof AutoMLProcessingUnit];
export interface AutoMLContainerDefinition {
  Image: string | undefined;
  ModelDataUrl: string | undefined;
  Environment?: Record<string, string> | undefined;
}
export declare const ObjectiveStatus: {
  readonly Failed: "Failed";
  readonly Pending: "Pending";
  readonly Succeeded: "Succeeded";
};
export type ObjectiveStatus =
  (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus];
export interface AutoMLCandidate {
  CandidateName: string | undefined;
  FinalAutoMLJobObjectiveMetric?: FinalAutoMLJobObjectiveMetric | undefined;
  ObjectiveStatus: ObjectiveStatus | undefined;
  CandidateSteps: AutoMLCandidateStep[] | undefined;
  CandidateStatus: CandidateStatus | undefined;
  InferenceContainers?: AutoMLContainerDefinition[] | undefined;
  CreationTime: Date | undefined;
  EndTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  CandidateProperties?: CandidateProperties | undefined;
  InferenceContainerDefinitions?:
    | Partial<Record<AutoMLProcessingUnit, AutoMLContainerDefinition[]>>
    | undefined;
}
export interface AutoMLCandidateGenerationConfig {
  FeatureSpecificationS3Uri?: string | undefined;
  AlgorithmsConfig?: AutoMLAlgorithmConfig[] | undefined;
}
export declare const AutoMLChannelType: {
  readonly TRAINING: "training";
  readonly VALIDATION: "validation";
};
export type AutoMLChannelType =
  (typeof AutoMLChannelType)[keyof typeof AutoMLChannelType];
export declare const AutoMLS3DataType: {
  readonly AUGMENTED_MANIFEST_FILE: "AugmentedManifestFile";
  readonly MANIFEST_FILE: "ManifestFile";
  readonly S3_PREFIX: "S3Prefix";
};
export type AutoMLS3DataType =
  (typeof AutoMLS3DataType)[keyof typeof AutoMLS3DataType];
export interface AutoMLS3DataSource {
  S3DataType: AutoMLS3DataType | undefined;
  S3Uri: string | undefined;
}
export interface AutoMLDataSource {
  S3DataSource: AutoMLS3DataSource | undefined;
}
export interface AutoMLChannel {
  DataSource?: AutoMLDataSource | undefined;
  CompressionType?: CompressionType | undefined;
  TargetAttributeName: string | undefined;
  ContentType?: string | undefined;
  ChannelType?: AutoMLChannelType | undefined;
  SampleWeightAttributeName?: string | undefined;
}
export interface EmrServerlessComputeConfig {
  ExecutionRoleARN: string | undefined;
}
export interface AutoMLComputeConfig {
  EmrServerlessComputeConfig?: EmrServerlessComputeConfig | undefined;
}
export interface AutoMLDataSplitConfig {
  ValidationFraction?: number | undefined;
}
export interface AutoMLJobArtifacts {
  CandidateDefinitionNotebookLocation?: string | undefined;
  DataExplorationNotebookLocation?: string | undefined;
}
export interface AutoMLJobChannel {
  ChannelType?: AutoMLChannelType | undefined;
  ContentType?: string | undefined;
  CompressionType?: CompressionType | undefined;
  DataSource?: AutoMLDataSource | undefined;
}
export interface AutoMLJobCompletionCriteria {
  MaxCandidates?: number | undefined;
  MaxRuntimePerTrainingJobInSeconds?: number | undefined;
  MaxAutoMLJobRuntimeInSeconds?: number | undefined;
}
export declare const AutoMLMode: {
  readonly AUTO: "AUTO";
  readonly ENSEMBLING: "ENSEMBLING";
  readonly HYPERPARAMETER_TUNING: "HYPERPARAMETER_TUNING";
};
export type AutoMLMode = (typeof AutoMLMode)[keyof typeof AutoMLMode];
export interface VpcConfig {
  SecurityGroupIds: string[] | undefined;
  Subnets: string[] | undefined;
}
export interface AutoMLSecurityConfig {
  VolumeKmsKeyId?: string | undefined;
  EnableInterContainerTrafficEncryption?: boolean | undefined;
  VpcConfig?: VpcConfig | undefined;
}
export interface AutoMLJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  SecurityConfig?: AutoMLSecurityConfig | undefined;
  CandidateGenerationConfig?: AutoMLCandidateGenerationConfig | undefined;
  DataSplitConfig?: AutoMLDataSplitConfig | undefined;
  Mode?: AutoMLMode | undefined;
}
export interface AutoMLJobObjective {
  MetricName: AutoMLMetricEnum | undefined;
}
export declare const AutoMLJobSecondaryStatus: {
  readonly ANALYZING_DATA: "AnalyzingData";
  readonly CANDIDATE_DEFINITIONS_GENERATED: "CandidateDefinitionsGenerated";
  readonly COMPLETED: "Completed";
  readonly DEPLOYING_MODEL: "DeployingModel";
  readonly EXPLAINABILITY_ERROR: "ExplainabilityError";
  readonly FAILED: "Failed";
  readonly FEATURE_ENGINEERING: "FeatureEngineering";
  readonly GENERATING_EXPLAINABILITY_REPORT: "GeneratingExplainabilityReport";
  readonly GENERATING_MODEL_INSIGHTS_REPORT: "GeneratingModelInsightsReport";
  readonly MAX_AUTO_ML_JOB_RUNTIME_REACHED: "MaxAutoMLJobRuntimeReached";
  readonly MAX_CANDIDATES_REACHED: "MaxCandidatesReached";
  readonly MODEL_DEPLOYMENT_ERROR: "ModelDeploymentError";
  readonly MODEL_INSIGHTS_ERROR: "ModelInsightsError";
  readonly MODEL_TUNING: "ModelTuning";
  readonly PRE_TRAINING: "PreTraining";
  readonly STARTING: "Starting";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
  readonly TRAINING_MODELS: "TrainingModels";
};
export type AutoMLJobSecondaryStatus =
  (typeof AutoMLJobSecondaryStatus)[keyof typeof AutoMLJobSecondaryStatus];
export declare const AutoMLJobStatus: {
  readonly COMPLETED: "Completed";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly STOPPED: "Stopped";
  readonly STOPPING: "Stopping";
};
export type AutoMLJobStatus =
  (typeof AutoMLJobStatus)[keyof typeof AutoMLJobStatus];
export interface AutoMLJobStepMetadata {
  Arn?: string | undefined;
}
export interface AutoMLPartialFailureReason {
  PartialFailureMessage?: string | undefined;
}
export interface AutoMLJobSummary {
  AutoMLJobName: string | undefined;
  AutoMLJobArn: string | undefined;
  AutoMLJobStatus: AutoMLJobStatus | undefined;
  AutoMLJobSecondaryStatus: AutoMLJobSecondaryStatus | undefined;
  CreationTime: Date | undefined;
  EndTime?: Date | undefined;
  LastModifiedTime: Date | undefined;
  FailureReason?: string | undefined;
  PartialFailureReasons?: AutoMLPartialFailureReason[] | undefined;
}
export interface AutoMLOutputDataConfig {
  KmsKeyId?: string | undefined;
  S3OutputPath: string | undefined;
}
export interface ImageClassificationJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
}
export interface CandidateGenerationConfig {
  AlgorithmsConfig?: AutoMLAlgorithmConfig[] | undefined;
}
export declare const ProblemType: {
  readonly BINARY_CLASSIFICATION: "BinaryClassification";
  readonly MULTICLASS_CLASSIFICATION: "MulticlassClassification";
  readonly REGRESSION: "Regression";
};
export type ProblemType = (typeof ProblemType)[keyof typeof ProblemType];
export interface TabularJobConfig {
  CandidateGenerationConfig?: CandidateGenerationConfig | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  FeatureSpecificationS3Uri?: string | undefined;
  Mode?: AutoMLMode | undefined;
  GenerateCandidateDefinitionsOnly?: boolean | undefined;
  ProblemType?: ProblemType | undefined;
  TargetAttributeName: string | undefined;
  SampleWeightAttributeName?: string | undefined;
}
export interface TextClassificationJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  ContentColumn: string | undefined;
  TargetLabelColumn: string | undefined;
}
export interface TextGenerationJobConfig {
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  BaseModelName?: string | undefined;
  TextGenerationHyperParameters?: Record<string, string> | undefined;
  ModelAccessConfig?: ModelAccessConfig | undefined;
}
export interface HolidayConfigAttributes {
  CountryCode?: string | undefined;
}
export interface TimeSeriesConfig {
  TargetAttributeName: string | undefined;
  TimestampAttributeName: string | undefined;
  ItemIdentifierAttributeName: string | undefined;
  GroupingAttributeNames?: string[] | undefined;
}
export declare const FillingType: {
  readonly Backfill: "backfill";
  readonly BackfillValue: "backfill_value";
  readonly Frontfill: "frontfill";
  readonly FrontfillValue: "frontfill_value";
  readonly Futurefill: "futurefill";
  readonly FuturefillValue: "futurefill_value";
  readonly Middlefill: "middlefill";
  readonly MiddlefillValue: "middlefill_value";
};
export type FillingType = (typeof FillingType)[keyof typeof FillingType];
export interface TimeSeriesTransformations {
  Filling?: Record<string, Partial<Record<FillingType, string>>> | undefined;
  Aggregation?: Record<string, AggregationTransformationValue> | undefined;
}
export interface TimeSeriesForecastingJobConfig {
  FeatureSpecificationS3Uri?: string | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  ForecastFrequency: string | undefined;
  ForecastHorizon: number | undefined;
  ForecastQuantiles?: string[] | undefined;
  Transformations?: TimeSeriesTransformations | undefined;
  TimeSeriesConfig: TimeSeriesConfig | undefined;
  HolidayConfig?: HolidayConfigAttributes[] | undefined;
  CandidateGenerationConfig?: CandidateGenerationConfig | undefined;
}
export type AutoMLProblemTypeConfig =
  | AutoMLProblemTypeConfig.ImageClassificationJobConfigMember
  | AutoMLProblemTypeConfig.TabularJobConfigMember
  | AutoMLProblemTypeConfig.TextClassificationJobConfigMember
  | AutoMLProblemTypeConfig.TextGenerationJobConfigMember
  | AutoMLProblemTypeConfig.TimeSeriesForecastingJobConfigMember
  | AutoMLProblemTypeConfig.$UnknownMember;
export declare namespace AutoMLProblemTypeConfig {
  interface ImageClassificationJobConfigMember {
    ImageClassificationJobConfig: ImageClassificationJobConfig;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TextClassificationJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig: TextClassificationJobConfig;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TimeSeriesForecastingJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig: TimeSeriesForecastingJobConfig;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TabularJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig: TabularJobConfig;
    TextGenerationJobConfig?: never;
    $unknown?: never;
  }
  interface TextGenerationJobConfigMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig: TextGenerationJobConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    ImageClassificationJobConfig?: never;
    TextClassificationJobConfig?: never;
    TimeSeriesForecastingJobConfig?: never;
    TabularJobConfig?: never;
    TextGenerationJobConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    ImageClassificationJobConfig: (value: ImageClassificationJobConfig) => T;
    TextClassificationJobConfig: (value: TextClassificationJobConfig) => T;
    TimeSeriesForecastingJobConfig: (
      value: TimeSeriesForecastingJobConfig
    ) => T;
    TabularJobConfig: (value: TabularJobConfig) => T;
    TextGenerationJobConfig: (value: TextGenerationJobConfig) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: AutoMLProblemTypeConfig, visitor: Visitor<T>) => T;
}
export declare const AutoMLProblemTypeConfigName: {
  readonly IMAGE_CLASSIFICATION: "ImageClassification";
  readonly TABULAR: "Tabular";
  readonly TEXT_CLASSIFICATION: "TextClassification";
  readonly TEXT_GENERATION: "TextGeneration";
  readonly TIMESERIES_FORECASTING: "TimeSeriesForecasting";
};
export type AutoMLProblemTypeConfigName =
  (typeof AutoMLProblemTypeConfigName)[keyof typeof AutoMLProblemTypeConfigName];
export interface TabularResolvedAttributes {
  ProblemType?: ProblemType | undefined;
}
export interface TextGenerationResolvedAttributes {
  BaseModelName?: string | undefined;
}
export type AutoMLProblemTypeResolvedAttributes =
  | AutoMLProblemTypeResolvedAttributes.TabularResolvedAttributesMember
  | AutoMLProblemTypeResolvedAttributes.TextGenerationResolvedAttributesMember
  | AutoMLProblemTypeResolvedAttributes.$UnknownMember;
export declare namespace AutoMLProblemTypeResolvedAttributes {
  interface TabularResolvedAttributesMember {
    TabularResolvedAttributes: TabularResolvedAttributes;
    TextGenerationResolvedAttributes?: never;
    $unknown?: never;
  }
  interface TextGenerationResolvedAttributesMember {
    TabularResolvedAttributes?: never;
    TextGenerationResolvedAttributes: TextGenerationResolvedAttributes;
    $unknown?: never;
  }
  interface $UnknownMember {
    TabularResolvedAttributes?: never;
    TextGenerationResolvedAttributes?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    TabularResolvedAttributes: (value: TabularResolvedAttributes) => T;
    TextGenerationResolvedAttributes: (
      value: TextGenerationResolvedAttributes
    ) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(
    value: AutoMLProblemTypeResolvedAttributes,
    visitor: Visitor<T>
  ) => T;
}
export interface AutoMLResolvedAttributes {
  AutoMLJobObjective?: AutoMLJobObjective | undefined;
  CompletionCriteria?: AutoMLJobCompletionCriteria | undefined;
  AutoMLProblemTypeResolvedAttributes?:
    | AutoMLProblemTypeResolvedAttributes
    | undefined;
}
export declare const AutoMLSortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly NAME: "Name";
  readonly STATUS: "Status";
};
export type AutoMLSortBy = (typeof AutoMLSortBy)[keyof typeof AutoMLSortBy];
export declare const AutoMLSortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type AutoMLSortOrder =
  (typeof AutoMLSortOrder)[keyof typeof AutoMLSortOrder];
export declare const AutoMountHomeEFS: {
  readonly DEFAULT_AS_DOMAIN: "DefaultAsDomain";
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type AutoMountHomeEFS =
  (typeof AutoMountHomeEFS)[keyof typeof AutoMountHomeEFS];
export interface AutoParameter {
  Name: string | undefined;
  ValueHint: string | undefined;
}
export interface AutoRollbackConfig {
  Alarms?: Alarm[] | undefined;
}
export declare const AutotuneMode: {
  readonly ENABLED: "Enabled";
};
export type AutotuneMode = (typeof AutotuneMode)[keyof typeof AutotuneMode];
export interface Autotune {
  Mode: AutotuneMode | undefined;
}
export declare const AwsManagedHumanLoopRequestSource: {
  readonly REKOGNITION_DETECT_MODERATION_LABELS_IMAGE_V3: "AWS/Rekognition/DetectModerationLabels/Image/V3";
  readonly TEXTRACT_ANALYZE_DOCUMENT_FORMS_V1: "AWS/Textract/AnalyzeDocument/Forms/V1";
};
export type AwsManagedHumanLoopRequestSource =
  (typeof AwsManagedHumanLoopRequestSource)[keyof typeof AwsManagedHumanLoopRequestSource];
export interface BatchDataCaptureConfig {
  DestinationS3Uri: string | undefined;
  KmsKeyId?: string | undefined;
  GenerateInferenceId?: boolean | undefined;
}
export interface BatchDeleteClusterNodesRequest {
  ClusterName: string | undefined;
  NodeIds: string[] | undefined;
}
export declare const BatchDeleteClusterNodesErrorCode: {
  readonly INVALID_NODE_STATUS: "InvalidNodeStatus";
  readonly NODE_ID_IN_USE: "NodeIdInUse";
  readonly NODE_ID_NOT_FOUND: "NodeIdNotFound";
};
export type BatchDeleteClusterNodesErrorCode =
  (typeof BatchDeleteClusterNodesErrorCode)[keyof typeof BatchDeleteClusterNodesErrorCode];
export interface BatchDeleteClusterNodesError {
  Code: BatchDeleteClusterNodesErrorCode | undefined;
  Message: string | undefined;
  NodeId: string | undefined;
}
export interface BatchDeleteClusterNodesResponse {
  Failed?: BatchDeleteClusterNodesError[] | undefined;
  Successful?: string[] | undefined;
}
export interface BatchDescribeModelPackageInput {
  ModelPackageArnList: string[] | undefined;
}
export interface BatchDescribeModelPackageError {
  ErrorCode: string | undefined;
  ErrorResponse: string | undefined;
}
export interface InferenceSpecification {
  Containers: ModelPackageContainerDefinition[] | undefined;
  SupportedTransformInstanceTypes?: TransformInstanceType[] | undefined;
  SupportedRealtimeInferenceInstanceTypes?:
    | ProductionVariantInstanceType[]
    | undefined;
  SupportedContentTypes?: string[] | undefined;
  SupportedResponseMIMETypes?: string[] | undefined;
}
export declare const ModelApprovalStatus: {
  readonly APPROVED: "Approved";
  readonly PENDING_MANUAL_APPROVAL: "PendingManualApproval";
  readonly REJECTED: "Rejected";
};
export type ModelApprovalStatus =
  (typeof ModelApprovalStatus)[keyof typeof ModelApprovalStatus];
export declare const ModelPackageStatus: {
  readonly COMPLETED: "Completed";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly IN_PROGRESS: "InProgress";
  readonly PENDING: "Pending";
};
export type ModelPackageStatus =
  (typeof ModelPackageStatus)[keyof typeof ModelPackageStatus];
export interface BatchDescribeModelPackageSummary {
  ModelPackageGroupName: string | undefined;
  ModelPackageVersion?: number | undefined;
  ModelPackageArn: string | undefined;
  ModelPackageDescription?: string | undefined;
  CreationTime: Date | undefined;
  InferenceSpecification: InferenceSpecification | undefined;
  ModelPackageStatus: ModelPackageStatus | undefined;
  ModelApprovalStatus?: ModelApprovalStatus | undefined;
}
export interface BatchDescribeModelPackageOutput {
  ModelPackageSummaries?:
    | Record<string, BatchDescribeModelPackageSummary>
    | undefined;
  BatchDescribeModelPackageErrorMap?:
    | Record<string, BatchDescribeModelPackageError>
    | undefined;
}
export interface MonitoringCsvDatasetFormat {
  Header?: boolean | undefined;
}
export interface MonitoringJsonDatasetFormat {
  Line?: boolean | undefined;
}
export interface MonitoringParquetDatasetFormat {}
export interface MonitoringDatasetFormat {
  Csv?: MonitoringCsvDatasetFormat | undefined;
  Json?: MonitoringJsonDatasetFormat | undefined;
  Parquet?: MonitoringParquetDatasetFormat | undefined;
}
export declare const ProcessingS3DataDistributionType: {
  readonly FULLYREPLICATED: "FullyReplicated";
  readonly SHARDEDBYS3KEY: "ShardedByS3Key";
};
export type ProcessingS3DataDistributionType =
  (typeof ProcessingS3DataDistributionType)[keyof typeof ProcessingS3DataDistributionType];
export declare const ProcessingS3InputMode: {
  readonly FILE: "File";
  readonly PIPE: "Pipe";
};
export type ProcessingS3InputMode =
  (typeof ProcessingS3InputMode)[keyof typeof ProcessingS3InputMode];
export interface BatchTransformInput {
  DataCapturedDestinationS3Uri: string | undefined;
  DatasetFormat: MonitoringDatasetFormat | undefined;
  LocalPath: string | undefined;
  S3InputMode?: ProcessingS3InputMode | undefined;
  S3DataDistributionType?: ProcessingS3DataDistributionType | undefined;
  FeaturesAttribute?: string | undefined;
  InferenceAttribute?: string | undefined;
  ProbabilityAttribute?: string | undefined;
  ProbabilityThresholdAttribute?: number | undefined;
  StartTimeOffset?: string | undefined;
  EndTimeOffset?: string | undefined;
  ExcludeFeaturesAttribute?: string | undefined;
}
export interface BestObjectiveNotImproving {
  MaxNumberOfTrainingJobsNotImproving?: number | undefined;
}
export interface MetricsSource {
  ContentType: string | undefined;
  ContentDigest?: string | undefined;
  S3Uri: string | undefined;
}
export interface Bias {
  Report?: MetricsSource | undefined;
  PreTrainingReport?: MetricsSource | undefined;
  PostTrainingReport?: MetricsSource | undefined;
}
export declare const CapacitySizeType: {
  readonly CAPACITY_PERCENT: "CAPACITY_PERCENT";
  readonly INSTANCE_COUNT: "INSTANCE_COUNT";
};
export type CapacitySizeType =
  (typeof CapacitySizeType)[keyof typeof CapacitySizeType];
export interface CapacitySize {
  Type: CapacitySizeType | undefined;
  Value: number | undefined;
}
export declare const TrafficRoutingConfigType: {
  readonly ALL_AT_ONCE: "ALL_AT_ONCE";
  readonly CANARY: "CANARY";
  readonly LINEAR: "LINEAR";
};
export type TrafficRoutingConfigType =
  (typeof TrafficRoutingConfigType)[keyof typeof TrafficRoutingConfigType];
export interface TrafficRoutingConfig {
  Type: TrafficRoutingConfigType | undefined;
  WaitIntervalInSeconds: number | undefined;
  CanarySize?: CapacitySize | undefined;
  LinearStepSize?: CapacitySize | undefined;
}
export interface BlueGreenUpdatePolicy {
  TrafficRoutingConfiguration: TrafficRoutingConfig | undefined;
  TerminationWaitInSeconds?: number | undefined;
  MaximumExecutionTimeoutInSeconds?: number | undefined;
}
export declare const BooleanOperator: {
  readonly AND: "And";
  readonly OR: "Or";
};
export type BooleanOperator =
  (typeof BooleanOperator)[keyof typeof BooleanOperator];
export interface CacheHitResult {
  SourcePipelineExecutionArn?: string | undefined;
}
export interface OutputParameter {
  Name: string | undefined;
  Value: string | undefined;
}
export interface CallbackStepMetadata {
  CallbackToken?: string | undefined;
  SqsQueueUrl?: string | undefined;
  OutputParameters?: OutputParameter[] | undefined;
}
export declare const CandidateSortBy: {
  readonly CreationTime: "CreationTime";
  readonly FinalObjectiveMetricValue: "FinalObjectiveMetricValue";
  readonly Status: "Status";
};
export type CandidateSortBy =
  (typeof CandidateSortBy)[keyof typeof CandidateSortBy];
export interface DirectDeploySettings {
  Status?: FeatureStatus | undefined;
}
export interface EmrServerlessSettings {
  ExecutionRoleArn?: string | undefined;
  Status?: FeatureStatus | undefined;
}
export interface GenerativeAiSettings {
  AmazonBedrockRoleArn?: string | undefined;
}
export declare const DataSourceName: {
  readonly SalesforceGenie: "SalesforceGenie";
  readonly Snowflake: "Snowflake";
};
export type DataSourceName =
  (typeof DataSourceName)[keyof typeof DataSourceName];
export interface IdentityProviderOAuthSetting {
  DataSourceName?: DataSourceName | undefined;
  Status?: FeatureStatus | undefined;
  SecretArn?: string | undefined;
}
export interface KendraSettings {
  Status?: FeatureStatus | undefined;
}
export interface ModelRegisterSettings {
  Status?: FeatureStatus | undefined;
  CrossAccountModelRegisterRoleArn?: string | undefined;
}
export interface TimeSeriesForecastingSettings {
  Status?: FeatureStatus | undefined;
  AmazonForecastRoleArn?: string | undefined;
}
export interface WorkspaceSettings {
  S3ArtifactPath?: string | undefined;
  S3KmsKeyId?: string | undefined;
}
export interface CanvasAppSettings {
  TimeSeriesForecastingSettings?: TimeSeriesForecastingSettings | undefined;
  ModelRegisterSettings?: ModelRegisterSettings | undefined;
  WorkspaceSettings?: WorkspaceSettings | undefined;
  IdentityProviderOAuthSettings?: IdentityProviderOAuthSetting[] | undefined;
  DirectDeploySettings?: DirectDeploySettings | undefined;
  KendraSettings?: KendraSettings | undefined;
  GenerativeAiSettings?: GenerativeAiSettings | undefined;
  EmrServerlessSettings?: EmrServerlessSettings | undefined;
}
export declare const NodeUnavailabilityType: {
  readonly CAPACITY_PERCENTAGE: "CAPACITY_PERCENTAGE";
  readonly INSTANCE_COUNT: "INSTANCE_COUNT";
};
export type NodeUnavailabilityType =
  (typeof NodeUnavailabilityType)[keyof typeof NodeUnavailabilityType];
export interface CapacitySizeConfig {
  Type: NodeUnavailabilityType | undefined;
  Value: number | undefined;
}
export interface CaptureContentTypeHeader {
  CsvContentTypes?: string[] | undefined;
  JsonContentTypes?: string[] | undefined;
}
export declare const CaptureMode: {
  readonly INPUT: "Input";
  readonly INPUT_AND_OUTPUT: "InputAndOutput";
  readonly OUTPUT: "Output";
};
export type CaptureMode = (typeof CaptureMode)[keyof typeof CaptureMode];
export interface CaptureOption {
  CaptureMode: CaptureMode | undefined;
}
export declare const CaptureStatus: {
  readonly STARTED: "Started";
  readonly STOPPED: "Stopped";
};
export type CaptureStatus = (typeof CaptureStatus)[keyof typeof CaptureStatus];
export interface CategoricalParameter {
  Name: string | undefined;
  Value: string[] | undefined;
}
export interface CategoricalParameterRange {
  Name: string | undefined;
  Values: string[] | undefined;
}
export interface CategoricalParameterRangeSpecification {
  Values: string[] | undefined;
}
export interface ChannelSpecification {
  Name: string | undefined;
  Description?: string | undefined;
  IsRequired?: boolean | undefined;
  SupportedContentTypes: string[] | undefined;
  SupportedCompressionTypes?: CompressionType[] | undefined;
  SupportedInputModes: TrainingInputMode[] | undefined;
}
export interface CheckpointConfig {
  S3Uri: string | undefined;
  LocalPath?: string | undefined;
}
export interface ClarifyCheckStepMetadata {
  CheckType?: string | undefined;
  BaselineUsedForDriftCheckConstraints?: string | undefined;
  CalculatedBaselineConstraints?: string | undefined;
  ModelPackageGroupName?: string | undefined;
  ViolationReport?: string | undefined;
  CheckJobArn?: string | undefined;
  SkipCheck?: boolean | undefined;
  RegisterNewBaseline?: boolean | undefined;
}
export declare const ClarifyFeatureType: {
  readonly CATEGORICAL: "categorical";
  readonly NUMERICAL: "numerical";
  readonly TEXT: "text";
};
export type ClarifyFeatureType =
  (typeof ClarifyFeatureType)[keyof typeof ClarifyFeatureType];
export interface ClarifyInferenceConfig {
  FeaturesAttribute?: string | undefined;
  ContentTemplate?: string | undefined;
  MaxRecordCount?: number | undefined;
  MaxPayloadInMB?: number | undefined;
  ProbabilityIndex?: number | undefined;
  LabelIndex?: number | undefined;
  ProbabilityAttribute?: string | undefined;
  LabelAttribute?: string | undefined;
  LabelHeaders?: string[] | undefined;
  FeatureHeaders?: string[] | undefined;
  FeatureTypes?: ClarifyFeatureType[] | undefined;
}
export interface ClarifyShapBaselineConfig {
  MimeType?: string | undefined;
  ShapBaseline?: string | undefined;
  ShapBaselineUri?: string | undefined;
}
export declare const ClarifyTextGranularity: {
  readonly PARAGRAPH: "paragraph";
  readonly SENTENCE: "sentence";
  readonly TOKEN: "token";
};
export type ClarifyTextGranularity =
  (typeof ClarifyTextGranularity)[keyof typeof ClarifyTextGranularity];
export declare const ClarifyTextLanguage: {
  readonly AFRIKAANS: "af";
  readonly ALBANIAN: "sq";
  readonly ARABIC: "ar";
  readonly ARMENIAN: "hy";
  readonly BASQUE: "eu";
  readonly BENGALI: "bn";
  readonly BULGARIAN: "bg";
  readonly CATALAN: "ca";
  readonly CHINESE: "zh";
  readonly CROATIAN: "hr";
  readonly CZECH: "cs";
  readonly DANISH: "da";
  readonly DUTCH: "nl";
  readonly ENGLISH: "en";
  readonly ESTONIAN: "et";
  readonly FINNISH: "fi";
  readonly FRENCH: "fr";
  readonly GERMAN: "de";
  readonly GREEK: "el";
  readonly GUJARATI: "gu";
  readonly HEBREW: "he";
  readonly HINDI: "hi";
  readonly HUNGARIAN: "hu";
  readonly ICELANDIC: "is";
  readonly INDONESIAN: "id";
  readonly IRISH: "ga";
  readonly ITALIAN: "it";
  readonly KANNADA: "kn";
  readonly KYRGYZ: "ky";
  readonly LATVIAN: "lv";
  readonly LIGURIAN: "lij";
  readonly LITHUANIAN: "lt";
  readonly LUXEMBOURGISH: "lb";
  readonly MACEDONIAN: "mk";
  readonly MALAYALAM: "ml";
  readonly MARATHI: "mr";
  readonly MULTI_LANGUAGE: "xx";
  readonly NEPALI: "ne";
  readonly NORWEGIAN_BOKMAL: "nb";
  readonly PERSIAN: "fa";
  readonly POLISH: "pl";
  readonly PORTUGUESE: "pt";
  readonly ROMANIAN: "ro";
  readonly RUSSIAN: "ru";
  readonly SANSKRIT: "sa";
  readonly SERBIAN: "sr";
  readonly SETSWANA: "tn";
  readonly SINHALA: "si";
  readonly SLOVAK: "sk";
  readonly SLOVENIAN: "sl";
  readonly SPANISH: "es";
  readonly SWEDISH: "sv";
  readonly TAGALOG: "tl";
  readonly TAMIL: "ta";
  readonly TATAR: "tt";
  readonly TELUGU: "te";
  readonly TURKISH: "tr";
  readonly UKRAINIAN: "uk";
  readonly URDU: "ur";
  readonly YORUBA: "yo";
};
export type ClarifyTextLanguage =
  (typeof ClarifyTextLanguage)[keyof typeof ClarifyTextLanguage];
export interface ClarifyTextConfig {
  Language: ClarifyTextLanguage | undefined;
  Granularity: ClarifyTextGranularity | undefined;
}
export interface ClarifyShapConfig {
  ShapBaselineConfig: ClarifyShapBaselineConfig | undefined;
  NumberOfSamples?: number | undefined;
  UseLogit?: boolean | undefined;
  Seed?: number | undefined;
  TextConfig?: ClarifyTextConfig | undefined;
}
export interface ClarifyExplainerConfig {
  EnableExplanations?: string | undefined;
  InferenceConfig?: ClarifyInferenceConfig | undefined;
  ShapConfig: ClarifyShapConfig | undefined;
}
export interface ClusterEbsVolumeConfig {
  VolumeSizeInGB: number | undefined;
}
export type ClusterInstanceStorageConfig =
  | ClusterInstanceStorageConfig.EbsVolumeConfigMember
  | ClusterInstanceStorageConfig.$UnknownMember;
export declare namespace ClusterInstanceStorageConfig {
  interface EbsVolumeConfigMember {
    EbsVolumeConfig: ClusterEbsVolumeConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    EbsVolumeConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    EbsVolumeConfig: (value: ClusterEbsVolumeConfig) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(
    value: ClusterInstanceStorageConfig,
    visitor: Visitor<T>
  ) => T;
}
export declare const ClusterInstanceType: {
  readonly ML_C5N_18XLARGE: "ml.c5n.18xlarge";
  readonly ML_C5N_2XLARGE: "ml.c5n.2xlarge";
  readonly ML_C5N_4XLARGE: "ml.c5n.4xlarge";
  readonly ML_C5N_9XLARGE: "ml.c5n.9xlarge";
  readonly ML_C5N_LARGE: "ml.c5n.large";
  readonly ML_C5_12XLARGE: "ml.c5.12xlarge";
  readonly ML_C5_18XLARGE: "ml.c5.18xlarge";
  readonly ML_C5_24XLARGE: "ml.c5.24xlarge";
  readonly ML_C5_2XLARGE: "ml.c5.2xlarge";
  readonly ML_C5_4XLARGE: "ml.c5.4xlarge";
  readonly ML_C5_9XLARGE: "ml.c5.9xlarge";
  readonly ML_C5_LARGE: "ml.c5.large";
  readonly ML_C5_XLARGE: "ml.c5.xlarge";
  readonly ML_C6I_12XLARGE: "ml.c6i.12xlarge";
  readonly ML_C6I_16XLARGE: "ml.c6i.16xlarge";
  readonly ML_C6I_24XLARGE: "ml.c6i.24xlarge";
  readonly ML_C6I_2XLARGE: "ml.c6i.2xlarge";
  readonly ML_C6I_32XLARGE: "ml.c6i.32xlarge";
  readonly ML_C6I_4XLARGE: "ml.c6i.4xlarge";
  readonly ML_C6I_8XLARGE: "ml.c6i.8xlarge";
  readonly ML_C6I_LARGE: "ml.c6i.large";
  readonly ML_C6I_XLARGE: "ml.c6i.xlarge";
  readonly ML_G5_12XLARGE: "ml.g5.12xlarge";
  readonly ML_G5_16XLARGE: "ml.g5.16xlarge";
  readonly ML_G5_24XLARGE: "ml.g5.24xlarge";
  readonly ML_G5_2XLARGE: "ml.g5.2xlarge";
  readonly ML_G5_48XLARGE: "ml.g5.48xlarge";
  readonly ML_G5_4XLARGE: "ml.g5.4xlarge";
  readonly ML_G5_8XLARGE: "ml.g5.8xlarge";
  readonly ML_G5_XLARGE: "ml.g5.xlarge";
  readonly ML_G6E_12XLARGE: "ml.g6e.12xlarge";
  readonly ML_G6E_16XLARGE: "ml.g6e.16xlarge";
  readonly ML_G6E_24XLARGE: "ml.g6e.24xlarge";
  readonly ML_G6E_2XLARGE: "ml.g6e.2xlarge";
  readonly ML_G6E_48XLARGE: "ml.g6e.48xlarge";
  readonly ML_G6E_4XLARGE: "ml.g6e.4xlarge";
  readonly ML_G6E_8XLARGE: "ml.g6e.8xlarge";
  readonly ML_G6E_XLARGE: "ml.g6e.xlarge";
  readonly ML_G6_12XLARGE: "ml.g6.12xlarge";
  readonly ML_G6_16XLARGE: "ml.g6.16xlarge";
  readonly ML_G6_24XLARGE: "ml.g6.24xlarge";
  readonly ML_G6_2XLARGE: "ml.g6.2xlarge";
  readonly ML_G6_48XLARGE: "ml.g6.48xlarge";
  readonly ML_G6_4XLARGE: "ml.g6.4xlarge";
  readonly ML_G6_8XLARGE: "ml.g6.8xlarge";
  readonly ML_G6_XLARGE: "ml.g6.xlarge";
  readonly ML_GR6_4XLARGE: "ml.gr6.4xlarge";
  readonly ML_GR6_8XLARGE: "ml.gr6.8xlarge";
  readonly ML_I3EN_12XLARGE: "ml.i3en.12xlarge";
  readonly ML_I3EN_24XLARGE: "ml.i3en.24xlarge";
  readonly ML_I3EN_2XLARGE: "ml.i3en.2xlarge";
  readonly ML_I3EN_3XLARGE: "ml.i3en.3xlarge";
  readonly ML_I3EN_6XLARGE: "ml.i3en.6xlarge";
  readonly ML_I3EN_LARGE: "ml.i3en.large";
  readonly ML_I3EN_XLARGE: "ml.i3en.xlarge";
  readonly ML_M5_12XLARGE: "ml.m5.12xlarge";
  readonly ML_M5_16XLARGE: "ml.m5.16xlarge";
  readonly ML_M5_24XLARGE: "ml.m5.24xlarge";
  readonly ML_M5_2XLARGE: "ml.m5.2xlarge";
  readonly ML_M5_4XLARGE: "ml.m5.4xlarge";
  readonly ML_M5_8XLARGE: "ml.m5.8xlarge";
  readonly ML_M5_LARGE: "ml.m5.large";
  readonly ML_M5_XLARGE: "ml.m5.xlarge";
  readonly ML_M6I_12XLARGE: "ml.m6i.12xlarge";
  readonly ML_M6I_16XLARGE: "ml.m6i.16xlarge";
  readonly ML_M6I_24XLARGE: "ml.m6i.24xlarge";
  readonly ML_M6I_2XLARGE: "ml.m6i.2xlarge";
  readonly ML_M6I_32XLARGE: "ml.m6i.32xlarge";
  readonly ML_M6I_4XLARGE: "ml.m6i.4xlarge";
  readonly ML_M6I_8XLARGE: "ml.m6i.8xlarge";
  readonly ML_M6I_LARGE: "ml.m6i.large";
  readonly ML_M6I_XLARGE: "ml.m6i.xlarge";
  readonly ML_M7I_12XLARGE: "ml.m7i.12xlarge";
  readonly ML_M7I_16XLARGE: "ml.m7i.16xlarge";
  readonly ML_M7I_24XLARGE: "ml.m7i.24xlarge";
  readonly ML_M7I_2XLARGE: "ml.m7i.2xlarge";
  readonly ML_M7I_48XLARGE: "ml.m7i.48xlarge";
  readonly ML_M7I_4XLARGE: "ml.m7i.4xlarge";
  readonly ML_M7I_8XLARGE: "ml.m7i.8xlarge";
  readonly ML_M7I_LARGE: "ml.m7i.large";
  readonly ML_M7I_XLARGE: "ml.m7i.xlarge";
  readonly ML_P4DE_24XLARGE: "ml.p4de.24xlarge";
  readonly ML_P4D_24XLARGE: "ml.p4d.24xlarge";
  readonly ML_P5EN_48XLARGE: "ml.p5en.48xlarge";
  readonly ML_P5E_48XLARGE: "ml.p5e.48xlarge";
  readonly ML_P5_48XLARGE: "ml.p5.48xlarge";
  readonly ML_R6I_12XLARGE: "ml.r6i.12xlarge";
  readonly ML_R6I_16XLARGE: "ml.r6i.16xlarge";
  readonly ML_R6I_24XLARGE: "ml.r6i.24xlarge";
  readonly ML_R6I_2XLARGE: "ml.r6i.2xlarge";
  readonly ML_R6I_32XLARGE: "ml.r6i.32xlarge";
  readonly ML_R6I_4XLARGE: "ml.r6i.4xlarge";
  readonly ML_R6I_8XLARGE: "ml.r6i.8xlarge";
  readonly ML_R6I_LARGE: "ml.r6i.large";
  readonly ML_R6I_XLARGE: "ml.r6i.xlarge";
  readonly ML_R7I_12XLARGE: "ml.r7i.12xlarge";
  readonly ML_R7I_16XLARGE: "ml.r7i.16xlarge";
  readonly ML_R7I_24XLARGE: "ml.r7i.24xlarge";
  readonly ML_R7I_2XLARGE: "ml.r7i.2xlarge";
  readonly ML_R7I_48XLARGE: "ml.r7i.48xlarge";
  readonly ML_R7I_4XLARGE: "ml.r7i.4xlarge";
  readonly ML_R7I_8XLARGE: "ml.r7i.8xlarge";
  readonly ML_R7I_LARGE: "ml.r7i.large";
  readonly ML_R7I_XLARGE: "ml.r7i.xlarge";
  readonly ML_T3_2XLARGE: "ml.t3.2xlarge";
  readonly ML_T3_LARGE: "ml.t3.large";
  readonly ML_T3_MEDIUM: "ml.t3.medium";
  readonly ML_T3_XLARGE: "ml.t3.xlarge";
  readonly ML_TRN1N_32XLARGE: "ml.trn1n.32xlarge";
  readonly ML_TRN1_32XLARGE: "ml.trn1.32xlarge";
  readonly ML_TRN2_48XLARGE: "ml.trn2.48xlarge";
};
export type ClusterInstanceType =
  (typeof ClusterInstanceType)[keyof typeof ClusterInstanceType];
export interface ClusterLifeCycleConfig {
  SourceS3Uri: string | undefined;
  OnCreate: string | undefined;
}
export declare const DeepHealthCheckType: {
  readonly INSTANCE_CONNECTIVITY: "InstanceConnectivity";
  readonly INSTANCE_STRESS: "InstanceStress";
};
export type DeepHealthCheckType =
  (typeof DeepHealthCheckType)[keyof typeof DeepHealthCheckType];
export interface RollingDeploymentPolicy {
  MaximumBatchSize: CapacitySizeConfig | undefined;
  RollbackMaximumBatchSize?: CapacitySizeConfig | undefined;
}
export interface DeploymentConfiguration {
  RollingUpdatePolicy?: RollingDeploymentPolicy | undefined;
  WaitIntervalInSeconds?: number | undefined;
  AutoRollbackConfiguration?: AlarmDetails[] | undefined;
}
export interface ScheduledUpdateConfig {
  ScheduleExpression: string | undefined;
  DeploymentConfig?: DeploymentConfiguration | undefined;
}
export declare const InstanceGroupStatus: {
  readonly CREATING: "Creating";
  readonly DEGRADED: "Degraded";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly INSERVICE: "InService";
  readonly SYSTEMUPDATING: "SystemUpdating";
  readonly UPDATING: "Updating";
};
export type InstanceGroupStatus =
  (typeof InstanceGroupStatus)[keyof typeof InstanceGroupStatus];
export interface ClusterInstanceGroupDetails {
  CurrentCount?: number | undefined;
  TargetCount?: number | undefined;
  InstanceGroupName?: string | undefined;
  InstanceType?: ClusterInstanceType | undefined;
  LifeCycleConfig?: ClusterLifeCycleConfig | undefined;
  ExecutionRole?: string | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
  Status?: InstanceGroupStatus | undefined;
  TrainingPlanArn?: string | undefined;
  TrainingPlanStatus?: string | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
}
export interface ClusterInstanceGroupSpecification {
  InstanceCount: number | undefined;
  InstanceGroupName: string | undefined;
  InstanceType: ClusterInstanceType | undefined;
  LifeCycleConfig: ClusterLifeCycleConfig | undefined;
  ExecutionRole: string | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  OnStartDeepHealthChecks?: DeepHealthCheckType[] | undefined;
  TrainingPlanArn?: string | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ScheduledUpdateConfig?: ScheduledUpdateConfig | undefined;
}
export interface ClusterInstancePlacement {
  AvailabilityZone?: string | undefined;
  AvailabilityZoneId?: string | undefined;
}
export declare const ClusterInstanceStatus: {
  readonly DEEP_HEALTH_CHECK_IN_PROGRESS: "DeepHealthCheckInProgress";
  readonly FAILURE: "Failure";
  readonly PENDING: "Pending";
  readonly RUNNING: "Running";
  readonly SHUTTING_DOWN: "ShuttingDown";
  readonly SYSTEM_UPDATING: "SystemUpdating";
};
export type ClusterInstanceStatus =
  (typeof ClusterInstanceStatus)[keyof typeof ClusterInstanceStatus];
export interface ClusterInstanceStatusDetails {
  Status: ClusterInstanceStatus | undefined;
  Message?: string | undefined;
}
export interface ClusterNodeDetails {
  InstanceGroupName?: string | undefined;
  InstanceId?: string | undefined;
  InstanceStatus?: ClusterInstanceStatusDetails | undefined;
  InstanceType?: ClusterInstanceType | undefined;
  LaunchTime?: Date | undefined;
  LastSoftwareUpdateTime?: Date | undefined;
  LifeCycleConfig?: ClusterLifeCycleConfig | undefined;
  OverrideVpcConfig?: VpcConfig | undefined;
  ThreadsPerCore?: number | undefined;
  InstanceStorageConfigs?: ClusterInstanceStorageConfig[] | undefined;
  PrivatePrimaryIp?: string | undefined;
  PrivatePrimaryIpv6?: string | undefined;
  PrivateDnsHostname?: string | undefined;
  Placement?: ClusterInstancePlacement | undefined;
}
export declare const ClusterNodeRecovery: {
  readonly AUTOMATIC: "Automatic";
  readonly NONE: "None";
};
export type ClusterNodeRecovery =
  (typeof ClusterNodeRecovery)[keyof typeof ClusterNodeRecovery];
export interface ClusterNodeSummary {
  InstanceGroupName: string | undefined;
  InstanceId: string | undefined;
  InstanceType: ClusterInstanceType | undefined;
  LaunchTime: Date | undefined;
  LastSoftwareUpdateTime?: Date | undefined;
  InstanceStatus: ClusterInstanceStatusDetails | undefined;
}
export interface ClusterOrchestratorEksConfig {
  ClusterArn: string | undefined;
}
export interface ClusterOrchestrator {
  Eks: ClusterOrchestratorEksConfig | undefined;
}
export declare const SchedulerResourceStatus: {
  readonly CREATED: "Created";
  readonly CREATE_FAILED: "CreateFailed";
  readonly CREATE_ROLLBACK_FAILED: "CreateRollbackFailed";
  readonly CREATING: "Creating";
  readonly DELETED: "Deleted";
  readonly DELETE_FAILED: "DeleteFailed";
  readonly DELETE_ROLLBACK_FAILED: "DeleteRollbackFailed";
  readonly DELETING: "Deleting";
  readonly UPDATED: "Updated";
  readonly UPDATE_FAILED: "UpdateFailed";
  readonly UPDATE_ROLLBACK_FAILED: "UpdateRollbackFailed";
  readonly UPDATING: "Updating";
};
export type SchedulerResourceStatus =
  (typeof SchedulerResourceStatus)[keyof typeof SchedulerResourceStatus];
export interface ClusterSchedulerConfigSummary {
  ClusterSchedulerConfigArn: string | undefined;
  ClusterSchedulerConfigId: string | undefined;
  ClusterSchedulerConfigVersion?: number | undefined;
  Name: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
  Status: SchedulerResourceStatus | undefined;
  ClusterArn?: string | undefined;
}
export declare const ClusterSortBy: {
  readonly CREATION_TIME: "CREATION_TIME";
  readonly NAME: "NAME";
};
export type ClusterSortBy = (typeof ClusterSortBy)[keyof typeof ClusterSortBy];
export declare const ClusterStatus: {
  readonly CREATING: "Creating";
  readonly DELETING: "Deleting";
  readonly FAILED: "Failed";
  readonly INSERVICE: "InService";
  readonly ROLLINGBACK: "RollingBack";
  readonly SYSTEMUPDATING: "SystemUpdating";
  readonly UPDATING: "Updating";
};
export type ClusterStatus = (typeof ClusterStatus)[keyof typeof ClusterStatus];
export interface ClusterSummary {
  ClusterArn: string | undefined;
  ClusterName: string | undefined;
  CreationTime: Date | undefined;
  ClusterStatus: ClusterStatus | undefined;
  TrainingPlanArns?: string[] | undefined;
}
export interface CustomImage {
  ImageName: string | undefined;
  ImageVersionNumber?: number | undefined;
  AppImageConfigName: string | undefined;
}
export interface CodeEditorAppSettings {
  DefaultResourceSpec?: ResourceSpec | undefined;
  CustomImages?: CustomImage[] | undefined;
  LifecycleConfigArns?: string[] | undefined;
  AppLifecycleManagement?: AppLifecycleManagement | undefined;
  BuiltInLifecycleConfigArn?: string | undefined;
}
export interface CodeRepository {
  RepositoryUrl: string | undefined;
}
export declare const CodeRepositorySortBy: {
  readonly CREATION_TIME: "CreationTime";
  readonly LAST_MODIFIED_TIME: "LastModifiedTime";
  readonly NAME: "Name";
};
export type CodeRepositorySortBy =
  (typeof CodeRepositorySortBy)[keyof typeof CodeRepositorySortBy];
export declare const CodeRepositorySortOrder: {
  readonly ASCENDING: "Ascending";
  readonly DESCENDING: "Descending";
};
export type CodeRepositorySortOrder =
  (typeof CodeRepositorySortOrder)[keyof typeof CodeRepositorySortOrder];
export interface GitConfig {
  RepositoryUrl: string | undefined;
  Branch?: string | undefined;
  SecretArn?: string | undefined;
}
export interface CodeRepositorySummary {
  CodeRepositoryName: string | undefined;
  CodeRepositoryArn: string | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime: Date | undefined;
  GitConfig?: GitConfig | undefined;
}
export interface CognitoConfig {
  UserPool: string | undefined;
  ClientId: string | undefined;
}
export interface CognitoMemberDefinition {
  UserPool: string | undefined;
  UserGroup: string | undefined;
  ClientId: string | undefined;
}
export interface VectorConfig {
  Dimension: number | undefined;
}
export type CollectionConfig =
  | CollectionConfig.VectorConfigMember
  | CollectionConfig.$UnknownMember;
export declare namespace CollectionConfig {
  interface VectorConfigMember {
    VectorConfig: VectorConfig;
    $unknown?: never;
  }
  interface $UnknownMember {
    VectorConfig?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    VectorConfig: (value: VectorConfig) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: CollectionConfig, visitor: Visitor<T>) => T;
}
export interface CollectionConfiguration {
  CollectionName?: string | undefined;
  CollectionParameters?: Record<string, string> | undefined;
}
export declare const CollectionType: {
  readonly LIST: "List";
  readonly SET: "Set";
  readonly VECTOR: "Vector";
};
export type CollectionType =
  (typeof CollectionType)[keyof typeof CollectionType];
export declare const CompilationJobStatus: {
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
  readonly INPROGRESS: "INPROGRESS";
  readonly STARTING: "STARTING";
  readonly STOPPED: "STOPPED";
  readonly STOPPING: "STOPPING";
};
export type CompilationJobStatus =
  (typeof CompilationJobStatus)[keyof typeof CompilationJobStatus];
export declare const TargetDevice: {
  readonly AISAGE: "aisage";
  readonly AMBA_CV2: "amba_cv2";
  readonly AMBA_CV22: "amba_cv22";
  readonly AMBA_CV25: "amba_cv25";
  readonly COREML: "coreml";
  readonly DEEPLENS: "deeplens";
  readonly IMX8MPLUS: "imx8mplus";
  readonly IMX8QM: "imx8qm";
  readonly JACINTO_TDA4VM: "jacinto_tda4vm";
  readonly JETSON_NANO: "jetson_nano";
  readonly JETSON_TX1: "jetson_tx1";
  readonly JETSON_TX2: "jetson_tx2";
  readonly JETSON_XAVIER: "jetson_xavier";
  readonly LAMBDA: "lambda";
  readonly ML_C4: "ml_c4";
  readonly ML_C5: "ml_c5";
  readonly ML_C6G: "ml_c6g";
  readonly ML_EIA2: "ml_eia2";
  readonly ML_G4DN: "ml_g4dn";
  readonly ML_INF1: "ml_inf1";
  readonly ML_INF2: "ml_inf2";
  readonly ML_M4: "ml_m4";
  readonly ML_M5: "ml_m5";
  readonly ML_M6G: "ml_m6g";
  readonly ML_P2: "ml_p2";
  readonly ML_P3: "ml_p3";
  readonly ML_TRN1: "ml_trn1";
  readonly QCS603: "qcs603";
  readonly QCS605: "qcs605";
  readonly RASP3B: "rasp3b";
  readonly RASP4B: "rasp4b";
  readonly RK3288: "rk3288";
  readonly RK3399: "rk3399";
  readonly SBE_C: "sbe_c";
  readonly SITARA_AM57X: "sitara_am57x";
  readonly X86_WIN32: "x86_win32";
  readonly X86_WIN64: "x86_win64";
};
export type TargetDevice = (typeof TargetDevice)[keyof typeof TargetDevice];
export declare const TargetPlatformAccelerator: {
  readonly INTEL_GRAPHICS: "INTEL_GRAPHICS";
  readonly MALI: "MALI";
  readonly NNA: "NNA";
  readonly NVIDIA: "NVIDIA";
};
export type TargetPlatformAccelerator =
  (typeof TargetPlatformAccelerator)[keyof typeof TargetPlatformAccelerator];
export declare const TargetPlatformArch: {
  readonly ARM64: "ARM64";
  readonly ARM_EABI: "ARM_EABI";
  readonly ARM_EABIHF: "ARM_EABIHF";
  readonly X86: "X86";
  readonly X86_64: "X86_64";
};
export type TargetPlatformArch =
  (typeof TargetPlatformArch)[keyof typeof TargetPlatformArch];
export declare const TargetPlatformOs: {
  readonly ANDROID: "ANDROID";
  readonly LINUX: "LINUX";
};
export type TargetPlatformOs =
  (typeof TargetPlatformOs)[keyof typeof TargetPlatformOs];
export interface CompilationJobSummary {
  CompilationJobName: string | undefined;
  CompilationJobArn: string | undefined;
  CreationTime: Date | undefined;
  CompilationStartTime?: Date | undefined;
  CompilationEndTime?: Date | undefined;
  CompilationTargetDevice?: TargetDevice | undefined;
  CompilationTargetPlatformOs?: TargetPlatformOs | undefined;
  CompilationTargetPlatformArch?: TargetPlatformArch | undefined;
  CompilationTargetPlatformAccelerator?: TargetPlatformAccelerator | undefined;
  LastModifiedTime?: Date | undefined;
  CompilationJobStatus: CompilationJobStatus | undefined;
}
export declare const CompleteOnConvergence: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type CompleteOnConvergence =
  (typeof CompleteOnConvergence)[keyof typeof CompleteOnConvergence];
export interface ComputeQuotaResourceConfig {
  InstanceType: ClusterInstanceType | undefined;
  Count: number | undefined;
}
export declare const PreemptTeamTasks: {
  readonly LOWERPRIORITY: "LowerPriority";
  readonly NEVER: "Never";
};
export type PreemptTeamTasks =
  (typeof PreemptTeamTasks)[keyof typeof PreemptTeamTasks];
export declare const ResourceSharingStrategy: {
  readonly DONTLEND: "DontLend";
  readonly LEND: "Lend";
  readonly LENDANDBORROW: "LendAndBorrow";
};
export type ResourceSharingStrategy =
  (typeof ResourceSharingStrategy)[keyof typeof ResourceSharingStrategy];
export interface ResourceSharingConfig {
  Strategy: ResourceSharingStrategy | undefined;
  BorrowLimit?: number | undefined;
}
export interface ComputeQuotaConfig {
  ComputeQuotaResources?: ComputeQuotaResourceConfig[] | undefined;
  ResourceSharingConfig?: ResourceSharingConfig | undefined;
  PreemptTeamTasks?: PreemptTeamTasks | undefined;
}
export interface ComputeQuotaTarget {
  TeamName: string | undefined;
  FairShareWeight?: number | undefined;
}
export interface ComputeQuotaSummary {
  ComputeQuotaArn: string | undefined;
  ComputeQuotaId: string | undefined;
  Name: string | undefined;
  ComputeQuotaVersion?: number | undefined;
  Status: SchedulerResourceStatus | undefined;
  ClusterArn?: string | undefined;
  ComputeQuotaConfig?: ComputeQuotaConfig | undefined;
  ComputeQuotaTarget: ComputeQuotaTarget | undefined;
  ActivationState?: ActivationState | undefined;
  CreationTime: Date | undefined;
  LastModifiedTime?: Date | undefined;
}
export declare const ConditionOutcome: {
  readonly FALSE: "False";
  readonly TRUE: "True";
};
export type ConditionOutcome =
  (typeof ConditionOutcome)[keyof typeof ConditionOutcome];
export interface ConditionStepMetadata {
  Outcome?: ConditionOutcome | undefined;
}
export declare class ConflictException extends __BaseException {
  readonly name: "ConflictException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(opts: __ExceptionOptionType<ConflictException, __BaseException>);
}
export declare const RepositoryAccessMode: {
  readonly PLATFORM: "Platform";
  readonly VPC: "Vpc";
};
export type RepositoryAccessMode =
  (typeof RepositoryAccessMode)[keyof typeof RepositoryAccessMode];
export interface RepositoryAuthConfig {
  RepositoryCredentialsProviderArn: string | undefined;
}
export interface ImageConfig {
  RepositoryAccessMode: RepositoryAccessMode | undefined;
  RepositoryAuthConfig?: RepositoryAuthConfig | undefined;
}
export declare const ContainerMode: {
  readonly MULTI_MODEL: "MultiModel";
  readonly SINGLE_MODEL: "SingleModel";
};
export type ContainerMode = (typeof ContainerMode)[keyof typeof ContainerMode];
export declare const ModelCacheSetting: {
  readonly DISABLED: "Disabled";
  readonly ENABLED: "Enabled";
};
export type ModelCacheSetting =
  (typeof ModelCacheSetting)[keyof typeof ModelCacheSetting];
export interface MultiModelConfig {
  ModelCacheSetting?: ModelCacheSetting | undefined;
}
