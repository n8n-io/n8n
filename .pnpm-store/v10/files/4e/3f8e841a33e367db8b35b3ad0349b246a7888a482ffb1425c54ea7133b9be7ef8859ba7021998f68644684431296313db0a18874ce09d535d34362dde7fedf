import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SecretsManagerServiceException as __BaseException } from "./SecretsManagerServiceException";
export interface ReplicaRegionType {
  Region?: string | undefined;
  KmsKeyId?: string | undefined;
}
export interface APIErrorType {
  SecretId?: string | undefined;
  ErrorCode?: string | undefined;
  Message?: string | undefined;
}
export declare const FilterNameStringType: {
  readonly all: "all";
  readonly description: "description";
  readonly name: "name";
  readonly owning_service: "owning-service";
  readonly primary_region: "primary-region";
  readonly tag_key: "tag-key";
  readonly tag_value: "tag-value";
};
export type FilterNameStringType =
  (typeof FilterNameStringType)[keyof typeof FilterNameStringType];
export interface Filter {
  Key?: FilterNameStringType | undefined;
  Values?: string[] | undefined;
}
export interface BatchGetSecretValueRequest {
  SecretIdList?: string[] | undefined;
  Filters?: Filter[] | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface SecretValueEntry {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
  SecretBinary?: Uint8Array | undefined;
  SecretString?: string | undefined;
  VersionStages?: string[] | undefined;
  CreatedDate?: Date | undefined;
}
export interface BatchGetSecretValueResponse {
  SecretValues?: SecretValueEntry[] | undefined;
  NextToken?: string | undefined;
  Errors?: APIErrorType[] | undefined;
}
export declare class DecryptionFailure extends __BaseException {
  readonly name: "DecryptionFailure";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(opts: __ExceptionOptionType<DecryptionFailure, __BaseException>);
}
export declare class InternalServiceError extends __BaseException {
  readonly name: "InternalServiceError";
  readonly $fault: "server";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InternalServiceError, __BaseException>
  );
}
export declare class InvalidNextTokenException extends __BaseException {
  readonly name: "InvalidNextTokenException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidNextTokenException, __BaseException>
  );
}
export declare class InvalidParameterException extends __BaseException {
  readonly name: "InvalidParameterException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidParameterException, __BaseException>
  );
}
export declare class InvalidRequestException extends __BaseException {
  readonly name: "InvalidRequestException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidRequestException, __BaseException>
  );
}
export declare class ResourceNotFoundException extends __BaseException {
  readonly name: "ResourceNotFoundException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>
  );
}
export interface CancelRotateSecretRequest {
  SecretId: string | undefined;
}
export interface CancelRotateSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
}
export interface Tag {
  Key?: string | undefined;
  Value?: string | undefined;
}
export interface CreateSecretRequest {
  Name: string | undefined;
  ClientRequestToken?: string | undefined;
  Description?: string | undefined;
  KmsKeyId?: string | undefined;
  SecretBinary?: Uint8Array | undefined;
  SecretString?: string | undefined;
  Tags?: Tag[] | undefined;
  AddReplicaRegions?: ReplicaRegionType[] | undefined;
  ForceOverwriteReplicaSecret?: boolean | undefined;
}
export declare const StatusType: {
  readonly Failed: "Failed";
  readonly InProgress: "InProgress";
  readonly InSync: "InSync";
};
export type StatusType = (typeof StatusType)[keyof typeof StatusType];
export interface ReplicationStatusType {
  Region?: string | undefined;
  KmsKeyId?: string | undefined;
  Status?: StatusType | undefined;
  StatusMessage?: string | undefined;
  LastAccessedDate?: Date | undefined;
}
export interface CreateSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
  ReplicationStatus?: ReplicationStatusType[] | undefined;
}
export declare class EncryptionFailure extends __BaseException {
  readonly name: "EncryptionFailure";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(opts: __ExceptionOptionType<EncryptionFailure, __BaseException>);
}
export declare class LimitExceededException extends __BaseException {
  readonly name: "LimitExceededException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<LimitExceededException, __BaseException>
  );
}
export declare class MalformedPolicyDocumentException extends __BaseException {
  readonly name: "MalformedPolicyDocumentException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<
      MalformedPolicyDocumentException,
      __BaseException
    >
  );
}
export declare class PreconditionNotMetException extends __BaseException {
  readonly name: "PreconditionNotMetException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<PreconditionNotMetException, __BaseException>
  );
}
export declare class ResourceExistsException extends __BaseException {
  readonly name: "ResourceExistsException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ResourceExistsException, __BaseException>
  );
}
export interface DeleteResourcePolicyRequest {
  SecretId: string | undefined;
}
export interface DeleteResourcePolicyResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
}
export interface DeleteSecretRequest {
  SecretId: string | undefined;
  RecoveryWindowInDays?: number | undefined;
  ForceDeleteWithoutRecovery?: boolean | undefined;
}
export interface DeleteSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  DeletionDate?: Date | undefined;
}
export interface DescribeSecretRequest {
  SecretId: string | undefined;
}
export interface RotationRulesType {
  AutomaticallyAfterDays?: number | undefined;
  Duration?: string | undefined;
  ScheduleExpression?: string | undefined;
}
export interface DescribeSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  KmsKeyId?: string | undefined;
  RotationEnabled?: boolean | undefined;
  RotationLambdaARN?: string | undefined;
  RotationRules?: RotationRulesType | undefined;
  LastRotatedDate?: Date | undefined;
  LastChangedDate?: Date | undefined;
  LastAccessedDate?: Date | undefined;
  DeletedDate?: Date | undefined;
  NextRotationDate?: Date | undefined;
  Tags?: Tag[] | undefined;
  VersionIdsToStages?: Record<string, string[]> | undefined;
  OwningService?: string | undefined;
  CreatedDate?: Date | undefined;
  PrimaryRegion?: string | undefined;
  ReplicationStatus?: ReplicationStatusType[] | undefined;
}
export interface GetRandomPasswordRequest {
  PasswordLength?: number | undefined;
  ExcludeCharacters?: string | undefined;
  ExcludeNumbers?: boolean | undefined;
  ExcludePunctuation?: boolean | undefined;
  ExcludeUppercase?: boolean | undefined;
  ExcludeLowercase?: boolean | undefined;
  IncludeSpace?: boolean | undefined;
  RequireEachIncludedType?: boolean | undefined;
}
export interface GetRandomPasswordResponse {
  RandomPassword?: string | undefined;
}
export interface GetResourcePolicyRequest {
  SecretId: string | undefined;
}
export interface GetResourcePolicyResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  ResourcePolicy?: string | undefined;
}
export interface GetSecretValueRequest {
  SecretId: string | undefined;
  VersionId?: string | undefined;
  VersionStage?: string | undefined;
}
export interface GetSecretValueResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
  SecretBinary?: Uint8Array | undefined;
  SecretString?: string | undefined;
  VersionStages?: string[] | undefined;
  CreatedDate?: Date | undefined;
}
export declare const SortOrderType: {
  readonly asc: "asc";
  readonly desc: "desc";
};
export type SortOrderType = (typeof SortOrderType)[keyof typeof SortOrderType];
export interface ListSecretsRequest {
  IncludePlannedDeletion?: boolean | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  Filters?: Filter[] | undefined;
  SortOrder?: SortOrderType | undefined;
}
export interface SecretListEntry {
  ARN?: string | undefined;
  Name?: string | undefined;
  Description?: string | undefined;
  KmsKeyId?: string | undefined;
  RotationEnabled?: boolean | undefined;
  RotationLambdaARN?: string | undefined;
  RotationRules?: RotationRulesType | undefined;
  LastRotatedDate?: Date | undefined;
  LastChangedDate?: Date | undefined;
  LastAccessedDate?: Date | undefined;
  DeletedDate?: Date | undefined;
  NextRotationDate?: Date | undefined;
  Tags?: Tag[] | undefined;
  SecretVersionsToStages?: Record<string, string[]> | undefined;
  OwningService?: string | undefined;
  CreatedDate?: Date | undefined;
  PrimaryRegion?: string | undefined;
}
export interface ListSecretsResponse {
  SecretList?: SecretListEntry[] | undefined;
  NextToken?: string | undefined;
}
export interface ListSecretVersionIdsRequest {
  SecretId: string | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
  IncludeDeprecated?: boolean | undefined;
}
export interface SecretVersionsListEntry {
  VersionId?: string | undefined;
  VersionStages?: string[] | undefined;
  LastAccessedDate?: Date | undefined;
  CreatedDate?: Date | undefined;
  KmsKeyIds?: string[] | undefined;
}
export interface ListSecretVersionIdsResponse {
  Versions?: SecretVersionsListEntry[] | undefined;
  NextToken?: string | undefined;
  ARN?: string | undefined;
  Name?: string | undefined;
}
export declare class PublicPolicyException extends __BaseException {
  readonly name: "PublicPolicyException";
  readonly $fault: "client";
  Message?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<PublicPolicyException, __BaseException>
  );
}
export interface PutResourcePolicyRequest {
  SecretId: string | undefined;
  ResourcePolicy: string | undefined;
  BlockPublicPolicy?: boolean | undefined;
}
export interface PutResourcePolicyResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
}
export interface PutSecretValueRequest {
  SecretId: string | undefined;
  ClientRequestToken?: string | undefined;
  SecretBinary?: Uint8Array | undefined;
  SecretString?: string | undefined;
  VersionStages?: string[] | undefined;
  RotationToken?: string | undefined;
}
export interface PutSecretValueResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
  VersionStages?: string[] | undefined;
}
export interface RemoveRegionsFromReplicationRequest {
  SecretId: string | undefined;
  RemoveReplicaRegions: string[] | undefined;
}
export interface RemoveRegionsFromReplicationResponse {
  ARN?: string | undefined;
  ReplicationStatus?: ReplicationStatusType[] | undefined;
}
export interface ReplicateSecretToRegionsRequest {
  SecretId: string | undefined;
  AddReplicaRegions: ReplicaRegionType[] | undefined;
  ForceOverwriteReplicaSecret?: boolean | undefined;
}
export interface ReplicateSecretToRegionsResponse {
  ARN?: string | undefined;
  ReplicationStatus?: ReplicationStatusType[] | undefined;
}
export interface RestoreSecretRequest {
  SecretId: string | undefined;
}
export interface RestoreSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
}
export interface RotateSecretRequest {
  SecretId: string | undefined;
  ClientRequestToken?: string | undefined;
  RotationLambdaARN?: string | undefined;
  RotationRules?: RotationRulesType | undefined;
  RotateImmediately?: boolean | undefined;
}
export interface RotateSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
}
export interface StopReplicationToReplicaRequest {
  SecretId: string | undefined;
}
export interface StopReplicationToReplicaResponse {
  ARN?: string | undefined;
}
export interface TagResourceRequest {
  SecretId: string | undefined;
  Tags: Tag[] | undefined;
}
export interface UntagResourceRequest {
  SecretId: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UpdateSecretRequest {
  SecretId: string | undefined;
  ClientRequestToken?: string | undefined;
  Description?: string | undefined;
  KmsKeyId?: string | undefined;
  SecretBinary?: Uint8Array | undefined;
  SecretString?: string | undefined;
}
export interface UpdateSecretResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
  VersionId?: string | undefined;
}
export interface UpdateSecretVersionStageRequest {
  SecretId: string | undefined;
  VersionStage: string | undefined;
  RemoveFromVersionId?: string | undefined;
  MoveToVersionId?: string | undefined;
}
export interface UpdateSecretVersionStageResponse {
  ARN?: string | undefined;
  Name?: string | undefined;
}
export interface ValidateResourcePolicyRequest {
  SecretId?: string | undefined;
  ResourcePolicy: string | undefined;
}
export interface ValidationErrorsEntry {
  CheckName?: string | undefined;
  ErrorMessage?: string | undefined;
}
export interface ValidateResourcePolicyResponse {
  PolicyValidationPassed?: boolean | undefined;
  ValidationErrors?: ValidationErrorsEntry[] | undefined;
}
export declare const SecretValueEntryFilterSensitiveLog: (
  obj: SecretValueEntry
) => any;
export declare const BatchGetSecretValueResponseFilterSensitiveLog: (
  obj: BatchGetSecretValueResponse
) => any;
export declare const CreateSecretRequestFilterSensitiveLog: (
  obj: CreateSecretRequest
) => any;
export declare const GetRandomPasswordResponseFilterSensitiveLog: (
  obj: GetRandomPasswordResponse
) => any;
export declare const GetSecretValueResponseFilterSensitiveLog: (
  obj: GetSecretValueResponse
) => any;
export declare const PutSecretValueRequestFilterSensitiveLog: (
  obj: PutSecretValueRequest
) => any;
export declare const UpdateSecretRequestFilterSensitiveLog: (
  obj: UpdateSecretRequest
) => any;
