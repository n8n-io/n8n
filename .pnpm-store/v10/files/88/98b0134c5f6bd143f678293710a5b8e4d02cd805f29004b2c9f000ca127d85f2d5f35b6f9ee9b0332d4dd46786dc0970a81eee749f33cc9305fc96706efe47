import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { StreamingBlobTypes } from "@smithy/types";
import { S3ServiceException as __BaseException } from "./S3ServiceException";
export interface AbortIncompleteMultipartUpload {
  DaysAfterInitiation?: number | undefined;
}
export declare const RequestCharged: {
  readonly requester: "requester";
};
export type RequestCharged =
  (typeof RequestCharged)[keyof typeof RequestCharged];
export interface AbortMultipartUploadOutput {
  RequestCharged?: RequestCharged | undefined;
}
export declare const RequestPayer: {
  readonly requester: "requester";
};
export type RequestPayer = (typeof RequestPayer)[keyof typeof RequestPayer];
export interface AbortMultipartUploadRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  UploadId: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  IfMatchInitiatedTime?: Date | undefined;
}
export declare class NoSuchUpload extends __BaseException {
  readonly name: "NoSuchUpload";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NoSuchUpload, __BaseException>);
}
export declare const BucketAccelerateStatus: {
  readonly Enabled: "Enabled";
  readonly Suspended: "Suspended";
};
export type BucketAccelerateStatus =
  (typeof BucketAccelerateStatus)[keyof typeof BucketAccelerateStatus];
export interface AccelerateConfiguration {
  Status?: BucketAccelerateStatus | undefined;
}
export declare const Type: {
  readonly AmazonCustomerByEmail: "AmazonCustomerByEmail";
  readonly CanonicalUser: "CanonicalUser";
  readonly Group: "Group";
};
export type Type = (typeof Type)[keyof typeof Type];
export interface Grantee {
  DisplayName?: string | undefined;
  EmailAddress?: string | undefined;
  ID?: string | undefined;
  URI?: string | undefined;
  Type: Type | undefined;
}
export declare const Permission: {
  readonly FULL_CONTROL: "FULL_CONTROL";
  readonly READ: "READ";
  readonly READ_ACP: "READ_ACP";
  readonly WRITE: "WRITE";
  readonly WRITE_ACP: "WRITE_ACP";
};
export type Permission = (typeof Permission)[keyof typeof Permission];
export interface Grant {
  Grantee?: Grantee | undefined;
  Permission?: Permission | undefined;
}
export interface Owner {
  DisplayName?: string | undefined;
  ID?: string | undefined;
}
export interface AccessControlPolicy {
  Grants?: Grant[] | undefined;
  Owner?: Owner | undefined;
}
export declare const OwnerOverride: {
  readonly Destination: "Destination";
};
export type OwnerOverride = (typeof OwnerOverride)[keyof typeof OwnerOverride];
export interface AccessControlTranslation {
  Owner: OwnerOverride | undefined;
}
export declare const ChecksumType: {
  readonly COMPOSITE: "COMPOSITE";
  readonly FULL_OBJECT: "FULL_OBJECT";
};
export type ChecksumType = (typeof ChecksumType)[keyof typeof ChecksumType];
export declare const ServerSideEncryption: {
  readonly AES256: "AES256";
  readonly aws_kms: "aws:kms";
  readonly aws_kms_dsse: "aws:kms:dsse";
};
export type ServerSideEncryption =
  (typeof ServerSideEncryption)[keyof typeof ServerSideEncryption];
export interface CompleteMultipartUploadOutput {
  Location?: string | undefined;
  Bucket?: string | undefined;
  Key?: string | undefined;
  Expiration?: string | undefined;
  ETag?: string | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  ChecksumType?: ChecksumType | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  VersionId?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface CompletedPart {
  ETag?: string | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  PartNumber?: number | undefined;
}
export interface CompletedMultipartUpload {
  Parts?: CompletedPart[] | undefined;
}
export interface CompleteMultipartUploadRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  MultipartUpload?: CompletedMultipartUpload | undefined;
  UploadId: string | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  ChecksumType?: ChecksumType | undefined;
  MpuObjectSize?: number | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  IfMatch?: string | undefined;
  IfNoneMatch?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
}
export interface CopyObjectResult {
  ETag?: string | undefined;
  LastModified?: Date | undefined;
  ChecksumType?: ChecksumType | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
}
export interface CopyObjectOutput {
  CopyObjectResult?: CopyObjectResult | undefined;
  Expiration?: string | undefined;
  CopySourceVersionId?: string | undefined;
  VersionId?: string | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export declare const ObjectCannedACL: {
  readonly authenticated_read: "authenticated-read";
  readonly aws_exec_read: "aws-exec-read";
  readonly bucket_owner_full_control: "bucket-owner-full-control";
  readonly bucket_owner_read: "bucket-owner-read";
  readonly private: "private";
  readonly public_read: "public-read";
  readonly public_read_write: "public-read-write";
};
export type ObjectCannedACL =
  (typeof ObjectCannedACL)[keyof typeof ObjectCannedACL];
export declare const ChecksumAlgorithm: {
  readonly CRC32: "CRC32";
  readonly CRC32C: "CRC32C";
  readonly CRC64NVME: "CRC64NVME";
  readonly SHA1: "SHA1";
  readonly SHA256: "SHA256";
};
export type ChecksumAlgorithm =
  (typeof ChecksumAlgorithm)[keyof typeof ChecksumAlgorithm];
export declare const MetadataDirective: {
  readonly COPY: "COPY";
  readonly REPLACE: "REPLACE";
};
export type MetadataDirective =
  (typeof MetadataDirective)[keyof typeof MetadataDirective];
export declare const ObjectLockLegalHoldStatus: {
  readonly OFF: "OFF";
  readonly ON: "ON";
};
export type ObjectLockLegalHoldStatus =
  (typeof ObjectLockLegalHoldStatus)[keyof typeof ObjectLockLegalHoldStatus];
export declare const ObjectLockMode: {
  readonly COMPLIANCE: "COMPLIANCE";
  readonly GOVERNANCE: "GOVERNANCE";
};
export type ObjectLockMode =
  (typeof ObjectLockMode)[keyof typeof ObjectLockMode];
export declare const StorageClass: {
  readonly DEEP_ARCHIVE: "DEEP_ARCHIVE";
  readonly EXPRESS_ONEZONE: "EXPRESS_ONEZONE";
  readonly GLACIER: "GLACIER";
  readonly GLACIER_IR: "GLACIER_IR";
  readonly INTELLIGENT_TIERING: "INTELLIGENT_TIERING";
  readonly ONEZONE_IA: "ONEZONE_IA";
  readonly OUTPOSTS: "OUTPOSTS";
  readonly REDUCED_REDUNDANCY: "REDUCED_REDUNDANCY";
  readonly SNOW: "SNOW";
  readonly STANDARD: "STANDARD";
  readonly STANDARD_IA: "STANDARD_IA";
};
export type StorageClass = (typeof StorageClass)[keyof typeof StorageClass];
export declare const TaggingDirective: {
  readonly COPY: "COPY";
  readonly REPLACE: "REPLACE";
};
export type TaggingDirective =
  (typeof TaggingDirective)[keyof typeof TaggingDirective];
export interface CopyObjectRequest {
  ACL?: ObjectCannedACL | undefined;
  Bucket: string | undefined;
  CacheControl?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ContentDisposition?: string | undefined;
  ContentEncoding?: string | undefined;
  ContentLanguage?: string | undefined;
  ContentType?: string | undefined;
  CopySource: string | undefined;
  CopySourceIfMatch?: string | undefined;
  CopySourceIfModifiedSince?: Date | undefined;
  CopySourceIfNoneMatch?: string | undefined;
  CopySourceIfUnmodifiedSince?: Date | undefined;
  Expires?: Date | undefined;
  GrantFullControl?: string | undefined;
  GrantRead?: string | undefined;
  GrantReadACP?: string | undefined;
  GrantWriteACP?: string | undefined;
  Key: string | undefined;
  Metadata?: Record<string, string> | undefined;
  MetadataDirective?: MetadataDirective | undefined;
  TaggingDirective?: TaggingDirective | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  StorageClass?: StorageClass | undefined;
  WebsiteRedirectLocation?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  CopySourceSSECustomerAlgorithm?: string | undefined;
  CopySourceSSECustomerKey?: string | undefined;
  CopySourceSSECustomerKeyMD5?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  Tagging?: string | undefined;
  ObjectLockMode?: ObjectLockMode | undefined;
  ObjectLockRetainUntilDate?: Date | undefined;
  ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
  ExpectedBucketOwner?: string | undefined;
  ExpectedSourceBucketOwner?: string | undefined;
}
export declare class ObjectNotInActiveTierError extends __BaseException {
  readonly name: "ObjectNotInActiveTierError";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ObjectNotInActiveTierError, __BaseException>
  );
}
export declare class BucketAlreadyExists extends __BaseException {
  readonly name: "BucketAlreadyExists";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<BucketAlreadyExists, __BaseException>
  );
}
export declare class BucketAlreadyOwnedByYou extends __BaseException {
  readonly name: "BucketAlreadyOwnedByYou";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<BucketAlreadyOwnedByYou, __BaseException>
  );
}
export interface CreateBucketOutput {
  Location?: string | undefined;
}
export declare const BucketCannedACL: {
  readonly authenticated_read: "authenticated-read";
  readonly private: "private";
  readonly public_read: "public-read";
  readonly public_read_write: "public-read-write";
};
export type BucketCannedACL =
  (typeof BucketCannedACL)[keyof typeof BucketCannedACL];
export declare const DataRedundancy: {
  readonly SingleAvailabilityZone: "SingleAvailabilityZone";
  readonly SingleLocalZone: "SingleLocalZone";
};
export type DataRedundancy =
  (typeof DataRedundancy)[keyof typeof DataRedundancy];
export declare const BucketType: {
  readonly Directory: "Directory";
};
export type BucketType = (typeof BucketType)[keyof typeof BucketType];
export interface BucketInfo {
  DataRedundancy?: DataRedundancy | undefined;
  Type?: BucketType | undefined;
}
export declare const LocationType: {
  readonly AvailabilityZone: "AvailabilityZone";
  readonly LocalZone: "LocalZone";
};
export type LocationType = (typeof LocationType)[keyof typeof LocationType];
export interface LocationInfo {
  Type?: LocationType | undefined;
  Name?: string | undefined;
}
export declare const BucketLocationConstraint: {
  readonly EU: "EU";
  readonly af_south_1: "af-south-1";
  readonly ap_east_1: "ap-east-1";
  readonly ap_northeast_1: "ap-northeast-1";
  readonly ap_northeast_2: "ap-northeast-2";
  readonly ap_northeast_3: "ap-northeast-3";
  readonly ap_south_1: "ap-south-1";
  readonly ap_south_2: "ap-south-2";
  readonly ap_southeast_1: "ap-southeast-1";
  readonly ap_southeast_2: "ap-southeast-2";
  readonly ap_southeast_3: "ap-southeast-3";
  readonly ap_southeast_4: "ap-southeast-4";
  readonly ap_southeast_5: "ap-southeast-5";
  readonly ca_central_1: "ca-central-1";
  readonly cn_north_1: "cn-north-1";
  readonly cn_northwest_1: "cn-northwest-1";
  readonly eu_central_1: "eu-central-1";
  readonly eu_central_2: "eu-central-2";
  readonly eu_north_1: "eu-north-1";
  readonly eu_south_1: "eu-south-1";
  readonly eu_south_2: "eu-south-2";
  readonly eu_west_1: "eu-west-1";
  readonly eu_west_2: "eu-west-2";
  readonly eu_west_3: "eu-west-3";
  readonly il_central_1: "il-central-1";
  readonly me_central_1: "me-central-1";
  readonly me_south_1: "me-south-1";
  readonly sa_east_1: "sa-east-1";
  readonly us_east_2: "us-east-2";
  readonly us_gov_east_1: "us-gov-east-1";
  readonly us_gov_west_1: "us-gov-west-1";
  readonly us_west_1: "us-west-1";
  readonly us_west_2: "us-west-2";
};
export type BucketLocationConstraint =
  (typeof BucketLocationConstraint)[keyof typeof BucketLocationConstraint];
export interface CreateBucketConfiguration {
  LocationConstraint?: BucketLocationConstraint | undefined;
  Location?: LocationInfo | undefined;
  Bucket?: BucketInfo | undefined;
}
export declare const ObjectOwnership: {
  readonly BucketOwnerEnforced: "BucketOwnerEnforced";
  readonly BucketOwnerPreferred: "BucketOwnerPreferred";
  readonly ObjectWriter: "ObjectWriter";
};
export type ObjectOwnership =
  (typeof ObjectOwnership)[keyof typeof ObjectOwnership];
export interface CreateBucketRequest {
  ACL?: BucketCannedACL | undefined;
  Bucket: string | undefined;
  CreateBucketConfiguration?: CreateBucketConfiguration | undefined;
  GrantFullControl?: string | undefined;
  GrantRead?: string | undefined;
  GrantReadACP?: string | undefined;
  GrantWrite?: string | undefined;
  GrantWriteACP?: string | undefined;
  ObjectLockEnabledForBucket?: boolean | undefined;
  ObjectOwnership?: ObjectOwnership | undefined;
}
export interface S3TablesDestination {
  TableBucketArn: string | undefined;
  TableName: string | undefined;
}
export interface MetadataTableConfiguration {
  S3TablesDestination: S3TablesDestination | undefined;
}
export interface CreateBucketMetadataTableConfigurationRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  MetadataTableConfiguration: MetadataTableConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface CreateMultipartUploadOutput {
  AbortDate?: Date | undefined;
  AbortRuleId?: string | undefined;
  Bucket?: string | undefined;
  Key?: string | undefined;
  UploadId?: string | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  RequestCharged?: RequestCharged | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ChecksumType?: ChecksumType | undefined;
}
export interface CreateMultipartUploadRequest {
  ACL?: ObjectCannedACL | undefined;
  Bucket: string | undefined;
  CacheControl?: string | undefined;
  ContentDisposition?: string | undefined;
  ContentEncoding?: string | undefined;
  ContentLanguage?: string | undefined;
  ContentType?: string | undefined;
  Expires?: Date | undefined;
  GrantFullControl?: string | undefined;
  GrantRead?: string | undefined;
  GrantReadACP?: string | undefined;
  GrantWriteACP?: string | undefined;
  Key: string | undefined;
  Metadata?: Record<string, string> | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  StorageClass?: StorageClass | undefined;
  WebsiteRedirectLocation?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  RequestPayer?: RequestPayer | undefined;
  Tagging?: string | undefined;
  ObjectLockMode?: ObjectLockMode | undefined;
  ObjectLockRetainUntilDate?: Date | undefined;
  ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
  ExpectedBucketOwner?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ChecksumType?: ChecksumType | undefined;
}
export interface SessionCredentials {
  AccessKeyId: string | undefined;
  SecretAccessKey: string | undefined;
  SessionToken: string | undefined;
  Expiration: Date | undefined;
}
export interface CreateSessionOutput {
  ServerSideEncryption?: ServerSideEncryption | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  Credentials: SessionCredentials | undefined;
}
export declare const SessionMode: {
  readonly ReadOnly: "ReadOnly";
  readonly ReadWrite: "ReadWrite";
};
export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];
export interface CreateSessionRequest {
  SessionMode?: SessionMode | undefined;
  Bucket: string | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
}
export declare class NoSuchBucket extends __BaseException {
  readonly name: "NoSuchBucket";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NoSuchBucket, __BaseException>);
}
export interface DeleteBucketRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketAnalyticsConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketCorsRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketEncryptionRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketIntelligentTieringConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
}
export interface DeleteBucketInventoryConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketLifecycleRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketMetadataTableConfigurationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketMetricsConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketOwnershipControlsRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketPolicyRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketReplicationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketTaggingRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteBucketWebsiteRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeleteObjectOutput {
  DeleteMarker?: boolean | undefined;
  VersionId?: string | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface DeleteObjectRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  MFA?: string | undefined;
  VersionId?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  BypassGovernanceRetention?: boolean | undefined;
  ExpectedBucketOwner?: string | undefined;
  IfMatch?: string | undefined;
  IfMatchLastModifiedTime?: Date | undefined;
  IfMatchSize?: number | undefined;
}
export interface DeletedObject {
  Key?: string | undefined;
  VersionId?: string | undefined;
  DeleteMarker?: boolean | undefined;
  DeleteMarkerVersionId?: string | undefined;
}
export interface _Error {
  Key?: string | undefined;
  VersionId?: string | undefined;
  Code?: string | undefined;
  Message?: string | undefined;
}
export interface DeleteObjectsOutput {
  Deleted?: DeletedObject[] | undefined;
  RequestCharged?: RequestCharged | undefined;
  Errors?: _Error[] | undefined;
}
export interface ObjectIdentifier {
  Key: string | undefined;
  VersionId?: string | undefined;
  ETag?: string | undefined;
  LastModifiedTime?: Date | undefined;
  Size?: number | undefined;
}
export interface Delete {
  Objects: ObjectIdentifier[] | undefined;
  Quiet?: boolean | undefined;
}
export interface DeleteObjectsRequest {
  Bucket: string | undefined;
  Delete: Delete | undefined;
  MFA?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  BypassGovernanceRetention?: boolean | undefined;
  ExpectedBucketOwner?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
}
export interface DeleteObjectTaggingOutput {
  VersionId?: string | undefined;
}
export interface DeleteObjectTaggingRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface DeletePublicAccessBlockRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface GetBucketAccelerateConfigurationOutput {
  Status?: BucketAccelerateStatus | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface GetBucketAccelerateConfigurationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
}
export interface GetBucketAclOutput {
  Owner?: Owner | undefined;
  Grants?: Grant[] | undefined;
}
export interface GetBucketAclRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export interface AnalyticsAndOperator {
  Prefix?: string | undefined;
  Tags?: Tag[] | undefined;
}
export type AnalyticsFilter =
  | AnalyticsFilter.AndMember
  | AnalyticsFilter.PrefixMember
  | AnalyticsFilter.TagMember
  | AnalyticsFilter.$UnknownMember;
export declare namespace AnalyticsFilter {
  interface PrefixMember {
    Prefix: string;
    Tag?: never;
    And?: never;
    $unknown?: never;
  }
  interface TagMember {
    Prefix?: never;
    Tag: Tag;
    And?: never;
    $unknown?: never;
  }
  interface AndMember {
    Prefix?: never;
    Tag?: never;
    And: AnalyticsAndOperator;
    $unknown?: never;
  }
  interface $UnknownMember {
    Prefix?: never;
    Tag?: never;
    And?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    Prefix: (value: string) => T;
    Tag: (value: Tag) => T;
    And: (value: AnalyticsAndOperator) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: AnalyticsFilter, visitor: Visitor<T>) => T;
}
export declare const AnalyticsS3ExportFileFormat: {
  readonly CSV: "CSV";
};
export type AnalyticsS3ExportFileFormat =
  (typeof AnalyticsS3ExportFileFormat)[keyof typeof AnalyticsS3ExportFileFormat];
export interface AnalyticsS3BucketDestination {
  Format: AnalyticsS3ExportFileFormat | undefined;
  BucketAccountId?: string | undefined;
  Bucket: string | undefined;
  Prefix?: string | undefined;
}
export interface AnalyticsExportDestination {
  S3BucketDestination: AnalyticsS3BucketDestination | undefined;
}
export declare const StorageClassAnalysisSchemaVersion: {
  readonly V_1: "V_1";
};
export type StorageClassAnalysisSchemaVersion =
  (typeof StorageClassAnalysisSchemaVersion)[keyof typeof StorageClassAnalysisSchemaVersion];
export interface StorageClassAnalysisDataExport {
  OutputSchemaVersion: StorageClassAnalysisSchemaVersion | undefined;
  Destination: AnalyticsExportDestination | undefined;
}
export interface StorageClassAnalysis {
  DataExport?: StorageClassAnalysisDataExport | undefined;
}
export interface AnalyticsConfiguration {
  Id: string | undefined;
  Filter?: AnalyticsFilter | undefined;
  StorageClassAnalysis: StorageClassAnalysis | undefined;
}
export interface GetBucketAnalyticsConfigurationOutput {
  AnalyticsConfiguration?: AnalyticsConfiguration | undefined;
}
export interface GetBucketAnalyticsConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface CORSRule {
  ID?: string | undefined;
  AllowedHeaders?: string[] | undefined;
  AllowedMethods: string[] | undefined;
  AllowedOrigins: string[] | undefined;
  ExposeHeaders?: string[] | undefined;
  MaxAgeSeconds?: number | undefined;
}
export interface GetBucketCorsOutput {
  CORSRules?: CORSRule[] | undefined;
}
export interface GetBucketCorsRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ServerSideEncryptionByDefault {
  SSEAlgorithm: ServerSideEncryption | undefined;
  KMSMasterKeyID?: string | undefined;
}
export interface ServerSideEncryptionRule {
  ApplyServerSideEncryptionByDefault?:
    | ServerSideEncryptionByDefault
    | undefined;
  BucketKeyEnabled?: boolean | undefined;
}
export interface ServerSideEncryptionConfiguration {
  Rules: ServerSideEncryptionRule[] | undefined;
}
export interface GetBucketEncryptionOutput {
  ServerSideEncryptionConfiguration?:
    | ServerSideEncryptionConfiguration
    | undefined;
}
export interface GetBucketEncryptionRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface IntelligentTieringAndOperator {
  Prefix?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface IntelligentTieringFilter {
  Prefix?: string | undefined;
  Tag?: Tag | undefined;
  And?: IntelligentTieringAndOperator | undefined;
}
export declare const IntelligentTieringStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type IntelligentTieringStatus =
  (typeof IntelligentTieringStatus)[keyof typeof IntelligentTieringStatus];
export declare const IntelligentTieringAccessTier: {
  readonly ARCHIVE_ACCESS: "ARCHIVE_ACCESS";
  readonly DEEP_ARCHIVE_ACCESS: "DEEP_ARCHIVE_ACCESS";
};
export type IntelligentTieringAccessTier =
  (typeof IntelligentTieringAccessTier)[keyof typeof IntelligentTieringAccessTier];
export interface Tiering {
  Days: number | undefined;
  AccessTier: IntelligentTieringAccessTier | undefined;
}
export interface IntelligentTieringConfiguration {
  Id: string | undefined;
  Filter?: IntelligentTieringFilter | undefined;
  Status: IntelligentTieringStatus | undefined;
  Tierings: Tiering[] | undefined;
}
export interface GetBucketIntelligentTieringConfigurationOutput {
  IntelligentTieringConfiguration?: IntelligentTieringConfiguration | undefined;
}
export interface GetBucketIntelligentTieringConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
}
export interface SSEKMS {
  KeyId: string | undefined;
}
export interface SSES3 {}
export interface InventoryEncryption {
  SSES3?: SSES3 | undefined;
  SSEKMS?: SSEKMS | undefined;
}
export declare const InventoryFormat: {
  readonly CSV: "CSV";
  readonly ORC: "ORC";
  readonly Parquet: "Parquet";
};
export type InventoryFormat =
  (typeof InventoryFormat)[keyof typeof InventoryFormat];
export interface InventoryS3BucketDestination {
  AccountId?: string | undefined;
  Bucket: string | undefined;
  Format: InventoryFormat | undefined;
  Prefix?: string | undefined;
  Encryption?: InventoryEncryption | undefined;
}
export interface InventoryDestination {
  S3BucketDestination: InventoryS3BucketDestination | undefined;
}
export interface InventoryFilter {
  Prefix: string | undefined;
}
export declare const InventoryIncludedObjectVersions: {
  readonly All: "All";
  readonly Current: "Current";
};
export type InventoryIncludedObjectVersions =
  (typeof InventoryIncludedObjectVersions)[keyof typeof InventoryIncludedObjectVersions];
export declare const InventoryOptionalField: {
  readonly BucketKeyStatus: "BucketKeyStatus";
  readonly ChecksumAlgorithm: "ChecksumAlgorithm";
  readonly ETag: "ETag";
  readonly EncryptionStatus: "EncryptionStatus";
  readonly IntelligentTieringAccessTier: "IntelligentTieringAccessTier";
  readonly IsMultipartUploaded: "IsMultipartUploaded";
  readonly LastModifiedDate: "LastModifiedDate";
  readonly ObjectAccessControlList: "ObjectAccessControlList";
  readonly ObjectLockLegalHoldStatus: "ObjectLockLegalHoldStatus";
  readonly ObjectLockMode: "ObjectLockMode";
  readonly ObjectLockRetainUntilDate: "ObjectLockRetainUntilDate";
  readonly ObjectOwner: "ObjectOwner";
  readonly ReplicationStatus: "ReplicationStatus";
  readonly Size: "Size";
  readonly StorageClass: "StorageClass";
};
export type InventoryOptionalField =
  (typeof InventoryOptionalField)[keyof typeof InventoryOptionalField];
export declare const InventoryFrequency: {
  readonly Daily: "Daily";
  readonly Weekly: "Weekly";
};
export type InventoryFrequency =
  (typeof InventoryFrequency)[keyof typeof InventoryFrequency];
export interface InventorySchedule {
  Frequency: InventoryFrequency | undefined;
}
export interface InventoryConfiguration {
  Destination: InventoryDestination | undefined;
  IsEnabled: boolean | undefined;
  Filter?: InventoryFilter | undefined;
  Id: string | undefined;
  IncludedObjectVersions: InventoryIncludedObjectVersions | undefined;
  OptionalFields?: InventoryOptionalField[] | undefined;
  Schedule: InventorySchedule | undefined;
}
export interface GetBucketInventoryConfigurationOutput {
  InventoryConfiguration?: InventoryConfiguration | undefined;
}
export interface GetBucketInventoryConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface LifecycleExpiration {
  Date?: Date | undefined;
  Days?: number | undefined;
  ExpiredObjectDeleteMarker?: boolean | undefined;
}
export interface LifecycleRuleAndOperator {
  Prefix?: string | undefined;
  Tags?: Tag[] | undefined;
  ObjectSizeGreaterThan?: number | undefined;
  ObjectSizeLessThan?: number | undefined;
}
export interface LifecycleRuleFilter {
  Prefix?: string | undefined;
  Tag?: Tag | undefined;
  ObjectSizeGreaterThan?: number | undefined;
  ObjectSizeLessThan?: number | undefined;
  And?: LifecycleRuleAndOperator | undefined;
}
export interface NoncurrentVersionExpiration {
  NoncurrentDays?: number | undefined;
  NewerNoncurrentVersions?: number | undefined;
}
export declare const TransitionStorageClass: {
  readonly DEEP_ARCHIVE: "DEEP_ARCHIVE";
  readonly GLACIER: "GLACIER";
  readonly GLACIER_IR: "GLACIER_IR";
  readonly INTELLIGENT_TIERING: "INTELLIGENT_TIERING";
  readonly ONEZONE_IA: "ONEZONE_IA";
  readonly STANDARD_IA: "STANDARD_IA";
};
export type TransitionStorageClass =
  (typeof TransitionStorageClass)[keyof typeof TransitionStorageClass];
export interface NoncurrentVersionTransition {
  NoncurrentDays?: number | undefined;
  StorageClass?: TransitionStorageClass | undefined;
  NewerNoncurrentVersions?: number | undefined;
}
export declare const ExpirationStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type ExpirationStatus =
  (typeof ExpirationStatus)[keyof typeof ExpirationStatus];
export interface Transition {
  Date?: Date | undefined;
  Days?: number | undefined;
  StorageClass?: TransitionStorageClass | undefined;
}
export interface LifecycleRule {
  Expiration?: LifecycleExpiration | undefined;
  ID?: string | undefined;
  Prefix?: string | undefined;
  Filter?: LifecycleRuleFilter | undefined;
  Status: ExpirationStatus | undefined;
  Transitions?: Transition[] | undefined;
  NoncurrentVersionTransitions?: NoncurrentVersionTransition[] | undefined;
  NoncurrentVersionExpiration?: NoncurrentVersionExpiration | undefined;
  AbortIncompleteMultipartUpload?: AbortIncompleteMultipartUpload | undefined;
}
export declare const TransitionDefaultMinimumObjectSize: {
  readonly all_storage_classes_128K: "all_storage_classes_128K";
  readonly varies_by_storage_class: "varies_by_storage_class";
};
export type TransitionDefaultMinimumObjectSize =
  (typeof TransitionDefaultMinimumObjectSize)[keyof typeof TransitionDefaultMinimumObjectSize];
export interface GetBucketLifecycleConfigurationOutput {
  Rules?: LifecycleRule[] | undefined;
  TransitionDefaultMinimumObjectSize?:
    | TransitionDefaultMinimumObjectSize
    | undefined;
}
export interface GetBucketLifecycleConfigurationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface GetBucketLocationOutput {
  LocationConstraint?: BucketLocationConstraint | undefined;
}
export interface GetBucketLocationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const BucketLogsPermission: {
  readonly FULL_CONTROL: "FULL_CONTROL";
  readonly READ: "READ";
  readonly WRITE: "WRITE";
};
export type BucketLogsPermission =
  (typeof BucketLogsPermission)[keyof typeof BucketLogsPermission];
export interface TargetGrant {
  Grantee?: Grantee | undefined;
  Permission?: BucketLogsPermission | undefined;
}
export declare const PartitionDateSource: {
  readonly DeliveryTime: "DeliveryTime";
  readonly EventTime: "EventTime";
};
export type PartitionDateSource =
  (typeof PartitionDateSource)[keyof typeof PartitionDateSource];
export interface PartitionedPrefix {
  PartitionDateSource?: PartitionDateSource | undefined;
}
export interface SimplePrefix {}
export interface TargetObjectKeyFormat {
  SimplePrefix?: SimplePrefix | undefined;
  PartitionedPrefix?: PartitionedPrefix | undefined;
}
export interface LoggingEnabled {
  TargetBucket: string | undefined;
  TargetGrants?: TargetGrant[] | undefined;
  TargetPrefix: string | undefined;
  TargetObjectKeyFormat?: TargetObjectKeyFormat | undefined;
}
export interface GetBucketLoggingOutput {
  LoggingEnabled?: LoggingEnabled | undefined;
}
export interface GetBucketLoggingRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ErrorDetails {
  ErrorCode?: string | undefined;
  ErrorMessage?: string | undefined;
}
export interface S3TablesDestinationResult {
  TableBucketArn: string | undefined;
  TableName: string | undefined;
  TableArn: string | undefined;
  TableNamespace: string | undefined;
}
export interface MetadataTableConfigurationResult {
  S3TablesDestinationResult: S3TablesDestinationResult | undefined;
}
export interface GetBucketMetadataTableConfigurationResult {
  MetadataTableConfigurationResult:
    | MetadataTableConfigurationResult
    | undefined;
  Status: string | undefined;
  Error?: ErrorDetails | undefined;
}
export interface GetBucketMetadataTableConfigurationOutput {
  GetBucketMetadataTableConfigurationResult?:
    | GetBucketMetadataTableConfigurationResult
    | undefined;
}
export interface GetBucketMetadataTableConfigurationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface MetricsAndOperator {
  Prefix?: string | undefined;
  Tags?: Tag[] | undefined;
  AccessPointArn?: string | undefined;
}
export type MetricsFilter =
  | MetricsFilter.AccessPointArnMember
  | MetricsFilter.AndMember
  | MetricsFilter.PrefixMember
  | MetricsFilter.TagMember
  | MetricsFilter.$UnknownMember;
export declare namespace MetricsFilter {
  interface PrefixMember {
    Prefix: string;
    Tag?: never;
    AccessPointArn?: never;
    And?: never;
    $unknown?: never;
  }
  interface TagMember {
    Prefix?: never;
    Tag: Tag;
    AccessPointArn?: never;
    And?: never;
    $unknown?: never;
  }
  interface AccessPointArnMember {
    Prefix?: never;
    Tag?: never;
    AccessPointArn: string;
    And?: never;
    $unknown?: never;
  }
  interface AndMember {
    Prefix?: never;
    Tag?: never;
    AccessPointArn?: never;
    And: MetricsAndOperator;
    $unknown?: never;
  }
  interface $UnknownMember {
    Prefix?: never;
    Tag?: never;
    AccessPointArn?: never;
    And?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    Prefix: (value: string) => T;
    Tag: (value: Tag) => T;
    AccessPointArn: (value: string) => T;
    And: (value: MetricsAndOperator) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(value: MetricsFilter, visitor: Visitor<T>) => T;
}
export interface MetricsConfiguration {
  Id: string | undefined;
  Filter?: MetricsFilter | undefined;
}
export interface GetBucketMetricsConfigurationOutput {
  MetricsConfiguration?: MetricsConfiguration | undefined;
}
export interface GetBucketMetricsConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface GetBucketNotificationConfigurationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface EventBridgeConfiguration {}
export declare const Event: {
  readonly s3_IntelligentTiering: "s3:IntelligentTiering";
  readonly s3_LifecycleExpiration_: "s3:LifecycleExpiration:*";
  readonly s3_LifecycleExpiration_Delete: "s3:LifecycleExpiration:Delete";
  readonly s3_LifecycleExpiration_DeleteMarkerCreated: "s3:LifecycleExpiration:DeleteMarkerCreated";
  readonly s3_LifecycleTransition: "s3:LifecycleTransition";
  readonly s3_ObjectAcl_Put: "s3:ObjectAcl:Put";
  readonly s3_ObjectCreated_: "s3:ObjectCreated:*";
  readonly s3_ObjectCreated_CompleteMultipartUpload: "s3:ObjectCreated:CompleteMultipartUpload";
  readonly s3_ObjectCreated_Copy: "s3:ObjectCreated:Copy";
  readonly s3_ObjectCreated_Post: "s3:ObjectCreated:Post";
  readonly s3_ObjectCreated_Put: "s3:ObjectCreated:Put";
  readonly s3_ObjectRemoved_: "s3:ObjectRemoved:*";
  readonly s3_ObjectRemoved_Delete: "s3:ObjectRemoved:Delete";
  readonly s3_ObjectRemoved_DeleteMarkerCreated: "s3:ObjectRemoved:DeleteMarkerCreated";
  readonly s3_ObjectRestore_: "s3:ObjectRestore:*";
  readonly s3_ObjectRestore_Completed: "s3:ObjectRestore:Completed";
  readonly s3_ObjectRestore_Delete: "s3:ObjectRestore:Delete";
  readonly s3_ObjectRestore_Post: "s3:ObjectRestore:Post";
  readonly s3_ObjectTagging_: "s3:ObjectTagging:*";
  readonly s3_ObjectTagging_Delete: "s3:ObjectTagging:Delete";
  readonly s3_ObjectTagging_Put: "s3:ObjectTagging:Put";
  readonly s3_ReducedRedundancyLostObject: "s3:ReducedRedundancyLostObject";
  readonly s3_Replication_: "s3:Replication:*";
  readonly s3_Replication_OperationFailedReplication: "s3:Replication:OperationFailedReplication";
  readonly s3_Replication_OperationMissedThreshold: "s3:Replication:OperationMissedThreshold";
  readonly s3_Replication_OperationNotTracked: "s3:Replication:OperationNotTracked";
  readonly s3_Replication_OperationReplicatedAfterThreshold: "s3:Replication:OperationReplicatedAfterThreshold";
};
export type Event = (typeof Event)[keyof typeof Event];
export declare const FilterRuleName: {
  readonly prefix: "prefix";
  readonly suffix: "suffix";
};
export type FilterRuleName =
  (typeof FilterRuleName)[keyof typeof FilterRuleName];
export interface FilterRule {
  Name?: FilterRuleName | undefined;
  Value?: string | undefined;
}
export interface S3KeyFilter {
  FilterRules?: FilterRule[] | undefined;
}
export interface NotificationConfigurationFilter {
  Key?: S3KeyFilter | undefined;
}
export interface LambdaFunctionConfiguration {
  Id?: string | undefined;
  LambdaFunctionArn: string | undefined;
  Events: Event[] | undefined;
  Filter?: NotificationConfigurationFilter | undefined;
}
export interface QueueConfiguration {
  Id?: string | undefined;
  QueueArn: string | undefined;
  Events: Event[] | undefined;
  Filter?: NotificationConfigurationFilter | undefined;
}
export interface TopicConfiguration {
  Id?: string | undefined;
  TopicArn: string | undefined;
  Events: Event[] | undefined;
  Filter?: NotificationConfigurationFilter | undefined;
}
export interface NotificationConfiguration {
  TopicConfigurations?: TopicConfiguration[] | undefined;
  QueueConfigurations?: QueueConfiguration[] | undefined;
  LambdaFunctionConfigurations?: LambdaFunctionConfiguration[] | undefined;
  EventBridgeConfiguration?: EventBridgeConfiguration | undefined;
}
export interface OwnershipControlsRule {
  ObjectOwnership: ObjectOwnership | undefined;
}
export interface OwnershipControls {
  Rules: OwnershipControlsRule[] | undefined;
}
export interface GetBucketOwnershipControlsOutput {
  OwnershipControls?: OwnershipControls | undefined;
}
export interface GetBucketOwnershipControlsRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface GetBucketPolicyOutput {
  Policy?: string | undefined;
}
export interface GetBucketPolicyRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PolicyStatus {
  IsPublic?: boolean | undefined;
}
export interface GetBucketPolicyStatusOutput {
  PolicyStatus?: PolicyStatus | undefined;
}
export interface GetBucketPolicyStatusRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const DeleteMarkerReplicationStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type DeleteMarkerReplicationStatus =
  (typeof DeleteMarkerReplicationStatus)[keyof typeof DeleteMarkerReplicationStatus];
export interface DeleteMarkerReplication {
  Status?: DeleteMarkerReplicationStatus | undefined;
}
export interface EncryptionConfiguration {
  ReplicaKmsKeyID?: string | undefined;
}
export interface ReplicationTimeValue {
  Minutes?: number | undefined;
}
export declare const MetricsStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type MetricsStatus = (typeof MetricsStatus)[keyof typeof MetricsStatus];
export interface Metrics {
  Status: MetricsStatus | undefined;
  EventThreshold?: ReplicationTimeValue | undefined;
}
export declare const ReplicationTimeStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type ReplicationTimeStatus =
  (typeof ReplicationTimeStatus)[keyof typeof ReplicationTimeStatus];
export interface ReplicationTime {
  Status: ReplicationTimeStatus | undefined;
  Time: ReplicationTimeValue | undefined;
}
export interface Destination {
  Bucket: string | undefined;
  Account?: string | undefined;
  StorageClass?: StorageClass | undefined;
  AccessControlTranslation?: AccessControlTranslation | undefined;
  EncryptionConfiguration?: EncryptionConfiguration | undefined;
  ReplicationTime?: ReplicationTime | undefined;
  Metrics?: Metrics | undefined;
}
export declare const ExistingObjectReplicationStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type ExistingObjectReplicationStatus =
  (typeof ExistingObjectReplicationStatus)[keyof typeof ExistingObjectReplicationStatus];
export interface ExistingObjectReplication {
  Status: ExistingObjectReplicationStatus | undefined;
}
export interface ReplicationRuleAndOperator {
  Prefix?: string | undefined;
  Tags?: Tag[] | undefined;
}
export interface ReplicationRuleFilter {
  Prefix?: string | undefined;
  Tag?: Tag | undefined;
  And?: ReplicationRuleAndOperator | undefined;
}
export declare const ReplicaModificationsStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type ReplicaModificationsStatus =
  (typeof ReplicaModificationsStatus)[keyof typeof ReplicaModificationsStatus];
export interface ReplicaModifications {
  Status: ReplicaModificationsStatus | undefined;
}
export declare const SseKmsEncryptedObjectsStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type SseKmsEncryptedObjectsStatus =
  (typeof SseKmsEncryptedObjectsStatus)[keyof typeof SseKmsEncryptedObjectsStatus];
export interface SseKmsEncryptedObjects {
  Status: SseKmsEncryptedObjectsStatus | undefined;
}
export interface SourceSelectionCriteria {
  SseKmsEncryptedObjects?: SseKmsEncryptedObjects | undefined;
  ReplicaModifications?: ReplicaModifications | undefined;
}
export declare const ReplicationRuleStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type ReplicationRuleStatus =
  (typeof ReplicationRuleStatus)[keyof typeof ReplicationRuleStatus];
export interface ReplicationRule {
  ID?: string | undefined;
  Priority?: number | undefined;
  Prefix?: string | undefined;
  Filter?: ReplicationRuleFilter | undefined;
  Status: ReplicationRuleStatus | undefined;
  SourceSelectionCriteria?: SourceSelectionCriteria | undefined;
  ExistingObjectReplication?: ExistingObjectReplication | undefined;
  Destination: Destination | undefined;
  DeleteMarkerReplication?: DeleteMarkerReplication | undefined;
}
export interface ReplicationConfiguration {
  Role: string | undefined;
  Rules: ReplicationRule[] | undefined;
}
export interface GetBucketReplicationOutput {
  ReplicationConfiguration?: ReplicationConfiguration | undefined;
}
export interface GetBucketReplicationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const Payer: {
  readonly BucketOwner: "BucketOwner";
  readonly Requester: "Requester";
};
export type Payer = (typeof Payer)[keyof typeof Payer];
export interface GetBucketRequestPaymentOutput {
  Payer?: Payer | undefined;
}
export interface GetBucketRequestPaymentRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface GetBucketTaggingOutput {
  TagSet: Tag[] | undefined;
}
export interface GetBucketTaggingRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const MFADeleteStatus: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type MFADeleteStatus =
  (typeof MFADeleteStatus)[keyof typeof MFADeleteStatus];
export declare const BucketVersioningStatus: {
  readonly Enabled: "Enabled";
  readonly Suspended: "Suspended";
};
export type BucketVersioningStatus =
  (typeof BucketVersioningStatus)[keyof typeof BucketVersioningStatus];
export interface GetBucketVersioningOutput {
  Status?: BucketVersioningStatus | undefined;
  MFADelete?: MFADeleteStatus | undefined;
}
export interface GetBucketVersioningRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ErrorDocument {
  Key: string | undefined;
}
export interface IndexDocument {
  Suffix: string | undefined;
}
export declare const Protocol: {
  readonly http: "http";
  readonly https: "https";
};
export type Protocol = (typeof Protocol)[keyof typeof Protocol];
export interface RedirectAllRequestsTo {
  HostName: string | undefined;
  Protocol?: Protocol | undefined;
}
export interface Condition {
  HttpErrorCodeReturnedEquals?: string | undefined;
  KeyPrefixEquals?: string | undefined;
}
export interface Redirect {
  HostName?: string | undefined;
  HttpRedirectCode?: string | undefined;
  Protocol?: Protocol | undefined;
  ReplaceKeyPrefixWith?: string | undefined;
  ReplaceKeyWith?: string | undefined;
}
export interface RoutingRule {
  Condition?: Condition | undefined;
  Redirect: Redirect | undefined;
}
export interface GetBucketWebsiteOutput {
  RedirectAllRequestsTo?: RedirectAllRequestsTo | undefined;
  IndexDocument?: IndexDocument | undefined;
  ErrorDocument?: ErrorDocument | undefined;
  RoutingRules?: RoutingRule[] | undefined;
}
export interface GetBucketWebsiteRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const ReplicationStatus: {
  readonly COMPLETE: "COMPLETE";
  readonly COMPLETED: "COMPLETED";
  readonly FAILED: "FAILED";
  readonly PENDING: "PENDING";
  readonly REPLICA: "REPLICA";
};
export type ReplicationStatus =
  (typeof ReplicationStatus)[keyof typeof ReplicationStatus];
export interface GetObjectOutput {
  Body?: StreamingBlobTypes | undefined;
  DeleteMarker?: boolean | undefined;
  AcceptRanges?: string | undefined;
  Expiration?: string | undefined;
  Restore?: string | undefined;
  LastModified?: Date | undefined;
  ContentLength?: number | undefined;
  ETag?: string | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  ChecksumType?: ChecksumType | undefined;
  MissingMeta?: number | undefined;
  VersionId?: string | undefined;
  CacheControl?: string | undefined;
  ContentDisposition?: string | undefined;
  ContentEncoding?: string | undefined;
  ContentLanguage?: string | undefined;
  ContentRange?: string | undefined;
  ContentType?: string | undefined;
  Expires?: Date | undefined;
  ExpiresString?: string | undefined;
  WebsiteRedirectLocation?: string | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  Metadata?: Record<string, string> | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  StorageClass?: StorageClass | undefined;
  RequestCharged?: RequestCharged | undefined;
  ReplicationStatus?: ReplicationStatus | undefined;
  PartsCount?: number | undefined;
  TagCount?: number | undefined;
  ObjectLockMode?: ObjectLockMode | undefined;
  ObjectLockRetainUntilDate?: Date | undefined;
  ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
}
export declare const ChecksumMode: {
  readonly ENABLED: "ENABLED";
};
export type ChecksumMode = (typeof ChecksumMode)[keyof typeof ChecksumMode];
export interface GetObjectRequest {
  Bucket: string | undefined;
  IfMatch?: string | undefined;
  IfModifiedSince?: Date | undefined;
  IfNoneMatch?: string | undefined;
  IfUnmodifiedSince?: Date | undefined;
  Key: string | undefined;
  Range?: string | undefined;
  ResponseCacheControl?: string | undefined;
  ResponseContentDisposition?: string | undefined;
  ResponseContentEncoding?: string | undefined;
  ResponseContentLanguage?: string | undefined;
  ResponseContentType?: string | undefined;
  ResponseExpires?: Date | undefined;
  VersionId?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  PartNumber?: number | undefined;
  ExpectedBucketOwner?: string | undefined;
  ChecksumMode?: ChecksumMode | undefined;
}
export declare class InvalidObjectState extends __BaseException {
  readonly name: "InvalidObjectState";
  readonly $fault: "client";
  StorageClass?: StorageClass | undefined;
  AccessTier?: IntelligentTieringAccessTier | undefined;
  constructor(opts: __ExceptionOptionType<InvalidObjectState, __BaseException>);
}
export declare class NoSuchKey extends __BaseException {
  readonly name: "NoSuchKey";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NoSuchKey, __BaseException>);
}
export interface GetObjectAclOutput {
  Owner?: Owner | undefined;
  Grants?: Grant[] | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface GetObjectAclRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface Checksum {
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  ChecksumType?: ChecksumType | undefined;
}
export interface ObjectPart {
  PartNumber?: number | undefined;
  Size?: number | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
}
export interface GetObjectAttributesParts {
  TotalPartsCount?: number | undefined;
  PartNumberMarker?: string | undefined;
  NextPartNumberMarker?: string | undefined;
  MaxParts?: number | undefined;
  IsTruncated?: boolean | undefined;
  Parts?: ObjectPart[] | undefined;
}
export interface GetObjectAttributesOutput {
  DeleteMarker?: boolean | undefined;
  LastModified?: Date | undefined;
  VersionId?: string | undefined;
  RequestCharged?: RequestCharged | undefined;
  ETag?: string | undefined;
  Checksum?: Checksum | undefined;
  ObjectParts?: GetObjectAttributesParts | undefined;
  StorageClass?: StorageClass | undefined;
  ObjectSize?: number | undefined;
}
export declare const ObjectAttributes: {
  readonly CHECKSUM: "Checksum";
  readonly ETAG: "ETag";
  readonly OBJECT_PARTS: "ObjectParts";
  readonly OBJECT_SIZE: "ObjectSize";
  readonly STORAGE_CLASS: "StorageClass";
};
export type ObjectAttributes =
  (typeof ObjectAttributes)[keyof typeof ObjectAttributes];
export interface GetObjectAttributesRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  MaxParts?: number | undefined;
  PartNumberMarker?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  ObjectAttributes: ObjectAttributes[] | undefined;
}
export interface ObjectLockLegalHold {
  Status?: ObjectLockLegalHoldStatus | undefined;
}
export interface GetObjectLegalHoldOutput {
  LegalHold?: ObjectLockLegalHold | undefined;
}
export interface GetObjectLegalHoldRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const ObjectLockEnabled: {
  readonly Enabled: "Enabled";
};
export type ObjectLockEnabled =
  (typeof ObjectLockEnabled)[keyof typeof ObjectLockEnabled];
export declare const ObjectLockRetentionMode: {
  readonly COMPLIANCE: "COMPLIANCE";
  readonly GOVERNANCE: "GOVERNANCE";
};
export type ObjectLockRetentionMode =
  (typeof ObjectLockRetentionMode)[keyof typeof ObjectLockRetentionMode];
export interface DefaultRetention {
  Mode?: ObjectLockRetentionMode | undefined;
  Days?: number | undefined;
  Years?: number | undefined;
}
export interface ObjectLockRule {
  DefaultRetention?: DefaultRetention | undefined;
}
export interface ObjectLockConfiguration {
  ObjectLockEnabled?: ObjectLockEnabled | undefined;
  Rule?: ObjectLockRule | undefined;
}
export interface GetObjectLockConfigurationOutput {
  ObjectLockConfiguration?: ObjectLockConfiguration | undefined;
}
export interface GetObjectLockConfigurationRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ObjectLockRetention {
  Mode?: ObjectLockRetentionMode | undefined;
  RetainUntilDate?: Date | undefined;
}
export interface GetObjectRetentionOutput {
  Retention?: ObjectLockRetention | undefined;
}
export interface GetObjectRetentionRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface GetObjectTaggingOutput {
  VersionId?: string | undefined;
  TagSet: Tag[] | undefined;
}
export interface GetObjectTaggingRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
}
export interface GetObjectTorrentOutput {
  Body?: StreamingBlobTypes | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface GetObjectTorrentRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PublicAccessBlockConfiguration {
  BlockPublicAcls?: boolean | undefined;
  IgnorePublicAcls?: boolean | undefined;
  BlockPublicPolicy?: boolean | undefined;
  RestrictPublicBuckets?: boolean | undefined;
}
export interface GetPublicAccessBlockOutput {
  PublicAccessBlockConfiguration?: PublicAccessBlockConfiguration | undefined;
}
export interface GetPublicAccessBlockRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface HeadBucketOutput {
  BucketLocationType?: LocationType | undefined;
  BucketLocationName?: string | undefined;
  BucketRegion?: string | undefined;
  AccessPointAlias?: boolean | undefined;
}
export interface HeadBucketRequest {
  Bucket: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare class NotFound extends __BaseException {
  readonly name: "NotFound";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<NotFound, __BaseException>);
}
export declare const ArchiveStatus: {
  readonly ARCHIVE_ACCESS: "ARCHIVE_ACCESS";
  readonly DEEP_ARCHIVE_ACCESS: "DEEP_ARCHIVE_ACCESS";
};
export type ArchiveStatus = (typeof ArchiveStatus)[keyof typeof ArchiveStatus];
export interface HeadObjectOutput {
  DeleteMarker?: boolean | undefined;
  AcceptRanges?: string | undefined;
  Expiration?: string | undefined;
  Restore?: string | undefined;
  ArchiveStatus?: ArchiveStatus | undefined;
  LastModified?: Date | undefined;
  ContentLength?: number | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  ChecksumType?: ChecksumType | undefined;
  ETag?: string | undefined;
  MissingMeta?: number | undefined;
  VersionId?: string | undefined;
  CacheControl?: string | undefined;
  ContentDisposition?: string | undefined;
  ContentEncoding?: string | undefined;
  ContentLanguage?: string | undefined;
  ContentType?: string | undefined;
  ContentRange?: string | undefined;
  Expires?: Date | undefined;
  ExpiresString?: string | undefined;
  WebsiteRedirectLocation?: string | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  Metadata?: Record<string, string> | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  StorageClass?: StorageClass | undefined;
  RequestCharged?: RequestCharged | undefined;
  ReplicationStatus?: ReplicationStatus | undefined;
  PartsCount?: number | undefined;
  ObjectLockMode?: ObjectLockMode | undefined;
  ObjectLockRetainUntilDate?: Date | undefined;
  ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
}
export interface HeadObjectRequest {
  Bucket: string | undefined;
  IfMatch?: string | undefined;
  IfModifiedSince?: Date | undefined;
  IfNoneMatch?: string | undefined;
  IfUnmodifiedSince?: Date | undefined;
  Key: string | undefined;
  Range?: string | undefined;
  ResponseCacheControl?: string | undefined;
  ResponseContentDisposition?: string | undefined;
  ResponseContentEncoding?: string | undefined;
  ResponseContentLanguage?: string | undefined;
  ResponseContentType?: string | undefined;
  ResponseExpires?: Date | undefined;
  VersionId?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  PartNumber?: number | undefined;
  ExpectedBucketOwner?: string | undefined;
  ChecksumMode?: ChecksumMode | undefined;
}
export interface ListBucketAnalyticsConfigurationsOutput {
  IsTruncated?: boolean | undefined;
  ContinuationToken?: string | undefined;
  NextContinuationToken?: string | undefined;
  AnalyticsConfigurationList?: AnalyticsConfiguration[] | undefined;
}
export interface ListBucketAnalyticsConfigurationsRequest {
  Bucket: string | undefined;
  ContinuationToken?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ListBucketIntelligentTieringConfigurationsOutput {
  IsTruncated?: boolean | undefined;
  ContinuationToken?: string | undefined;
  NextContinuationToken?: string | undefined;
  IntelligentTieringConfigurationList?:
    | IntelligentTieringConfiguration[]
    | undefined;
}
export interface ListBucketIntelligentTieringConfigurationsRequest {
  Bucket: string | undefined;
  ContinuationToken?: string | undefined;
}
export interface ListBucketInventoryConfigurationsOutput {
  ContinuationToken?: string | undefined;
  InventoryConfigurationList?: InventoryConfiguration[] | undefined;
  IsTruncated?: boolean | undefined;
  NextContinuationToken?: string | undefined;
}
export interface ListBucketInventoryConfigurationsRequest {
  Bucket: string | undefined;
  ContinuationToken?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ListBucketMetricsConfigurationsOutput {
  IsTruncated?: boolean | undefined;
  ContinuationToken?: string | undefined;
  NextContinuationToken?: string | undefined;
  MetricsConfigurationList?: MetricsConfiguration[] | undefined;
}
export interface ListBucketMetricsConfigurationsRequest {
  Bucket: string | undefined;
  ContinuationToken?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface Bucket {
  Name?: string | undefined;
  CreationDate?: Date | undefined;
  BucketRegion?: string | undefined;
}
export interface ListBucketsOutput {
  Buckets?: Bucket[] | undefined;
  Owner?: Owner | undefined;
  ContinuationToken?: string | undefined;
  Prefix?: string | undefined;
}
export interface ListBucketsRequest {
  MaxBuckets?: number | undefined;
  ContinuationToken?: string | undefined;
  Prefix?: string | undefined;
  BucketRegion?: string | undefined;
}
export interface ListDirectoryBucketsOutput {
  Buckets?: Bucket[] | undefined;
  ContinuationToken?: string | undefined;
}
export interface ListDirectoryBucketsRequest {
  ContinuationToken?: string | undefined;
  MaxDirectoryBuckets?: number | undefined;
}
export interface CommonPrefix {
  Prefix?: string | undefined;
}
export declare const EncodingType: {
  readonly url: "url";
};
export type EncodingType = (typeof EncodingType)[keyof typeof EncodingType];
export interface Initiator {
  ID?: string | undefined;
  DisplayName?: string | undefined;
}
export interface MultipartUpload {
  UploadId?: string | undefined;
  Key?: string | undefined;
  Initiated?: Date | undefined;
  StorageClass?: StorageClass | undefined;
  Owner?: Owner | undefined;
  Initiator?: Initiator | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ChecksumType?: ChecksumType | undefined;
}
export interface ListMultipartUploadsOutput {
  Bucket?: string | undefined;
  KeyMarker?: string | undefined;
  UploadIdMarker?: string | undefined;
  NextKeyMarker?: string | undefined;
  Prefix?: string | undefined;
  Delimiter?: string | undefined;
  NextUploadIdMarker?: string | undefined;
  MaxUploads?: number | undefined;
  IsTruncated?: boolean | undefined;
  Uploads?: MultipartUpload[] | undefined;
  CommonPrefixes?: CommonPrefix[] | undefined;
  EncodingType?: EncodingType | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface ListMultipartUploadsRequest {
  Bucket: string | undefined;
  Delimiter?: string | undefined;
  EncodingType?: EncodingType | undefined;
  KeyMarker?: string | undefined;
  MaxUploads?: number | undefined;
  Prefix?: string | undefined;
  UploadIdMarker?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
}
export interface RestoreStatus {
  IsRestoreInProgress?: boolean | undefined;
  RestoreExpiryDate?: Date | undefined;
}
export declare const ObjectStorageClass: {
  readonly DEEP_ARCHIVE: "DEEP_ARCHIVE";
  readonly EXPRESS_ONEZONE: "EXPRESS_ONEZONE";
  readonly GLACIER: "GLACIER";
  readonly GLACIER_IR: "GLACIER_IR";
  readonly INTELLIGENT_TIERING: "INTELLIGENT_TIERING";
  readonly ONEZONE_IA: "ONEZONE_IA";
  readonly OUTPOSTS: "OUTPOSTS";
  readonly REDUCED_REDUNDANCY: "REDUCED_REDUNDANCY";
  readonly SNOW: "SNOW";
  readonly STANDARD: "STANDARD";
  readonly STANDARD_IA: "STANDARD_IA";
};
export type ObjectStorageClass =
  (typeof ObjectStorageClass)[keyof typeof ObjectStorageClass];
export interface _Object {
  Key?: string | undefined;
  LastModified?: Date | undefined;
  ETag?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm[] | undefined;
  ChecksumType?: ChecksumType | undefined;
  Size?: number | undefined;
  StorageClass?: ObjectStorageClass | undefined;
  Owner?: Owner | undefined;
  RestoreStatus?: RestoreStatus | undefined;
}
export interface ListObjectsOutput {
  IsTruncated?: boolean | undefined;
  Marker?: string | undefined;
  NextMarker?: string | undefined;
  Contents?: _Object[] | undefined;
  Name?: string | undefined;
  Prefix?: string | undefined;
  Delimiter?: string | undefined;
  MaxKeys?: number | undefined;
  CommonPrefixes?: CommonPrefix[] | undefined;
  EncodingType?: EncodingType | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export declare const OptionalObjectAttributes: {
  readonly RESTORE_STATUS: "RestoreStatus";
};
export type OptionalObjectAttributes =
  (typeof OptionalObjectAttributes)[keyof typeof OptionalObjectAttributes];
export interface ListObjectsRequest {
  Bucket: string | undefined;
  Delimiter?: string | undefined;
  EncodingType?: EncodingType | undefined;
  Marker?: string | undefined;
  MaxKeys?: number | undefined;
  Prefix?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  OptionalObjectAttributes?: OptionalObjectAttributes[] | undefined;
}
export interface ListObjectsV2Output {
  IsTruncated?: boolean | undefined;
  Contents?: _Object[] | undefined;
  Name?: string | undefined;
  Prefix?: string | undefined;
  Delimiter?: string | undefined;
  MaxKeys?: number | undefined;
  CommonPrefixes?: CommonPrefix[] | undefined;
  EncodingType?: EncodingType | undefined;
  KeyCount?: number | undefined;
  ContinuationToken?: string | undefined;
  NextContinuationToken?: string | undefined;
  StartAfter?: string | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface ListObjectsV2Request {
  Bucket: string | undefined;
  Delimiter?: string | undefined;
  EncodingType?: EncodingType | undefined;
  MaxKeys?: number | undefined;
  Prefix?: string | undefined;
  ContinuationToken?: string | undefined;
  FetchOwner?: boolean | undefined;
  StartAfter?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  OptionalObjectAttributes?: OptionalObjectAttributes[] | undefined;
}
export interface DeleteMarkerEntry {
  Owner?: Owner | undefined;
  Key?: string | undefined;
  VersionId?: string | undefined;
  IsLatest?: boolean | undefined;
  LastModified?: Date | undefined;
}
export declare const ObjectVersionStorageClass: {
  readonly STANDARD: "STANDARD";
};
export type ObjectVersionStorageClass =
  (typeof ObjectVersionStorageClass)[keyof typeof ObjectVersionStorageClass];
export interface ObjectVersion {
  ETag?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm[] | undefined;
  ChecksumType?: ChecksumType | undefined;
  Size?: number | undefined;
  StorageClass?: ObjectVersionStorageClass | undefined;
  Key?: string | undefined;
  VersionId?: string | undefined;
  IsLatest?: boolean | undefined;
  LastModified?: Date | undefined;
  Owner?: Owner | undefined;
  RestoreStatus?: RestoreStatus | undefined;
}
export interface ListObjectVersionsOutput {
  IsTruncated?: boolean | undefined;
  KeyMarker?: string | undefined;
  VersionIdMarker?: string | undefined;
  NextKeyMarker?: string | undefined;
  NextVersionIdMarker?: string | undefined;
  Versions?: ObjectVersion[] | undefined;
  DeleteMarkers?: DeleteMarkerEntry[] | undefined;
  Name?: string | undefined;
  Prefix?: string | undefined;
  Delimiter?: string | undefined;
  MaxKeys?: number | undefined;
  CommonPrefixes?: CommonPrefix[] | undefined;
  EncodingType?: EncodingType | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface ListObjectVersionsRequest {
  Bucket: string | undefined;
  Delimiter?: string | undefined;
  EncodingType?: EncodingType | undefined;
  KeyMarker?: string | undefined;
  MaxKeys?: number | undefined;
  Prefix?: string | undefined;
  VersionIdMarker?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  OptionalObjectAttributes?: OptionalObjectAttributes[] | undefined;
}
export interface Part {
  PartNumber?: number | undefined;
  LastModified?: Date | undefined;
  ETag?: string | undefined;
  Size?: number | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
}
export interface ListPartsOutput {
  AbortDate?: Date | undefined;
  AbortRuleId?: string | undefined;
  Bucket?: string | undefined;
  Key?: string | undefined;
  UploadId?: string | undefined;
  PartNumberMarker?: string | undefined;
  NextPartNumberMarker?: string | undefined;
  MaxParts?: number | undefined;
  IsTruncated?: boolean | undefined;
  Parts?: Part[] | undefined;
  Initiator?: Initiator | undefined;
  Owner?: Owner | undefined;
  StorageClass?: StorageClass | undefined;
  RequestCharged?: RequestCharged | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ChecksumType?: ChecksumType | undefined;
}
export interface ListPartsRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  MaxParts?: number | undefined;
  PartNumberMarker?: string | undefined;
  UploadId: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
}
export interface PutBucketAccelerateConfigurationRequest {
  Bucket: string | undefined;
  AccelerateConfiguration: AccelerateConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
}
export interface PutBucketAclRequest {
  ACL?: BucketCannedACL | undefined;
  AccessControlPolicy?: AccessControlPolicy | undefined;
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  GrantFullControl?: string | undefined;
  GrantRead?: string | undefined;
  GrantReadACP?: string | undefined;
  GrantWrite?: string | undefined;
  GrantWriteACP?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketAnalyticsConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  AnalyticsConfiguration: AnalyticsConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const CompleteMultipartUploadOutputFilterSensitiveLog: (
  obj: CompleteMultipartUploadOutput
) => any;
export declare const CompleteMultipartUploadRequestFilterSensitiveLog: (
  obj: CompleteMultipartUploadRequest
) => any;
export declare const CopyObjectOutputFilterSensitiveLog: (
  obj: CopyObjectOutput
) => any;
export declare const CopyObjectRequestFilterSensitiveLog: (
  obj: CopyObjectRequest
) => any;
export declare const CreateMultipartUploadOutputFilterSensitiveLog: (
  obj: CreateMultipartUploadOutput
) => any;
export declare const CreateMultipartUploadRequestFilterSensitiveLog: (
  obj: CreateMultipartUploadRequest
) => any;
export declare const SessionCredentialsFilterSensitiveLog: (
  obj: SessionCredentials
) => any;
export declare const CreateSessionOutputFilterSensitiveLog: (
  obj: CreateSessionOutput
) => any;
export declare const CreateSessionRequestFilterSensitiveLog: (
  obj: CreateSessionRequest
) => any;
export declare const ServerSideEncryptionByDefaultFilterSensitiveLog: (
  obj: ServerSideEncryptionByDefault
) => any;
export declare const ServerSideEncryptionRuleFilterSensitiveLog: (
  obj: ServerSideEncryptionRule
) => any;
export declare const ServerSideEncryptionConfigurationFilterSensitiveLog: (
  obj: ServerSideEncryptionConfiguration
) => any;
export declare const GetBucketEncryptionOutputFilterSensitiveLog: (
  obj: GetBucketEncryptionOutput
) => any;
export declare const SSEKMSFilterSensitiveLog: (obj: SSEKMS) => any;
export declare const InventoryEncryptionFilterSensitiveLog: (
  obj: InventoryEncryption
) => any;
export declare const InventoryS3BucketDestinationFilterSensitiveLog: (
  obj: InventoryS3BucketDestination
) => any;
export declare const InventoryDestinationFilterSensitiveLog: (
  obj: InventoryDestination
) => any;
export declare const InventoryConfigurationFilterSensitiveLog: (
  obj: InventoryConfiguration
) => any;
export declare const GetBucketInventoryConfigurationOutputFilterSensitiveLog: (
  obj: GetBucketInventoryConfigurationOutput
) => any;
export declare const GetObjectOutputFilterSensitiveLog: (
  obj: GetObjectOutput
) => any;
export declare const GetObjectRequestFilterSensitiveLog: (
  obj: GetObjectRequest
) => any;
export declare const GetObjectAttributesRequestFilterSensitiveLog: (
  obj: GetObjectAttributesRequest
) => any;
export declare const GetObjectTorrentOutputFilterSensitiveLog: (
  obj: GetObjectTorrentOutput
) => any;
export declare const HeadObjectOutputFilterSensitiveLog: (
  obj: HeadObjectOutput
) => any;
export declare const HeadObjectRequestFilterSensitiveLog: (
  obj: HeadObjectRequest
) => any;
export declare const ListBucketInventoryConfigurationsOutputFilterSensitiveLog: (
  obj: ListBucketInventoryConfigurationsOutput
) => any;
export declare const ListPartsRequestFilterSensitiveLog: (
  obj: ListPartsRequest
) => any;
