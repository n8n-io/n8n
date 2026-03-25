import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { StreamingBlobTypes } from "@smithy/types";
import {
  AccessControlPolicy,
  BucketVersioningStatus,
  ChecksumAlgorithm,
  ChecksumType,
  CORSRule,
  ErrorDocument,
  Grant,
  IndexDocument,
  IntelligentTieringConfiguration,
  InventoryConfiguration,
  LifecycleRule,
  LoggingEnabled,
  MetricsConfiguration,
  NotificationConfiguration,
  ObjectCannedACL,
  ObjectLockConfiguration,
  ObjectLockLegalHold,
  ObjectLockLegalHoldStatus,
  ObjectLockMode,
  ObjectLockRetention,
  OwnershipControls,
  Payer,
  PublicAccessBlockConfiguration,
  RedirectAllRequestsTo,
  ReplicationConfiguration,
  ReplicationStatus,
  RequestCharged,
  RequestPayer,
  RoutingRule,
  ServerSideEncryption,
  ServerSideEncryptionConfiguration,
  StorageClass,
  Tag,
  TransitionDefaultMinimumObjectSize,
} from "./models_0";
import { S3ServiceException as __BaseException } from "./S3ServiceException";
export interface CORSConfiguration {
  CORSRules: CORSRule[] | undefined;
}
export interface PutBucketCorsRequest {
  Bucket: string | undefined;
  CORSConfiguration: CORSConfiguration | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketEncryptionRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ServerSideEncryptionConfiguration:
    | ServerSideEncryptionConfiguration
    | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketIntelligentTieringConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  IntelligentTieringConfiguration: IntelligentTieringConfiguration | undefined;
}
export interface PutBucketInventoryConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  InventoryConfiguration: InventoryConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketLifecycleConfigurationOutput {
  TransitionDefaultMinimumObjectSize?:
    | TransitionDefaultMinimumObjectSize
    | undefined;
}
export interface BucketLifecycleConfiguration {
  Rules: LifecycleRule[] | undefined;
}
export interface PutBucketLifecycleConfigurationRequest {
  Bucket: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  LifecycleConfiguration?: BucketLifecycleConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
  TransitionDefaultMinimumObjectSize?:
    | TransitionDefaultMinimumObjectSize
    | undefined;
}
export interface BucketLoggingStatus {
  LoggingEnabled?: LoggingEnabled | undefined;
}
export interface PutBucketLoggingRequest {
  Bucket: string | undefined;
  BucketLoggingStatus: BucketLoggingStatus | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketMetricsConfigurationRequest {
  Bucket: string | undefined;
  Id: string | undefined;
  MetricsConfiguration: MetricsConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketNotificationConfigurationRequest {
  Bucket: string | undefined;
  NotificationConfiguration: NotificationConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
  SkipDestinationValidation?: boolean | undefined;
}
export interface PutBucketOwnershipControlsRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
  OwnershipControls: OwnershipControls | undefined;
}
export interface PutBucketPolicyRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ConfirmRemoveSelfBucketAccess?: boolean | undefined;
  Policy: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutBucketReplicationRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ReplicationConfiguration: ReplicationConfiguration | undefined;
  Token?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface RequestPaymentConfiguration {
  Payer: Payer | undefined;
}
export interface PutBucketRequestPaymentRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  RequestPaymentConfiguration: RequestPaymentConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface Tagging {
  TagSet: Tag[] | undefined;
}
export interface PutBucketTaggingRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  Tagging: Tagging | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare const MFADelete: {
  readonly Disabled: "Disabled";
  readonly Enabled: "Enabled";
};
export type MFADelete = (typeof MFADelete)[keyof typeof MFADelete];
export interface VersioningConfiguration {
  MFADelete?: MFADelete | undefined;
  Status?: BucketVersioningStatus | undefined;
}
export interface PutBucketVersioningRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  MFA?: string | undefined;
  VersioningConfiguration: VersioningConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface WebsiteConfiguration {
  ErrorDocument?: ErrorDocument | undefined;
  IndexDocument?: IndexDocument | undefined;
  RedirectAllRequestsTo?: RedirectAllRequestsTo | undefined;
  RoutingRules?: RoutingRule[] | undefined;
}
export interface PutBucketWebsiteRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  WebsiteConfiguration: WebsiteConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare class EncryptionTypeMismatch extends __BaseException {
  readonly name: "EncryptionTypeMismatch";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<EncryptionTypeMismatch, __BaseException>
  );
}
export declare class InvalidRequest extends __BaseException {
  readonly name: "InvalidRequest";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<InvalidRequest, __BaseException>);
}
export declare class InvalidWriteOffset extends __BaseException {
  readonly name: "InvalidWriteOffset";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<InvalidWriteOffset, __BaseException>);
}
export interface PutObjectOutput {
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
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  SSEKMSEncryptionContext?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  Size?: number | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface PutObjectRequest {
  ACL?: ObjectCannedACL | undefined;
  Body?: StreamingBlobTypes | undefined;
  Bucket: string | undefined;
  CacheControl?: string | undefined;
  ContentDisposition?: string | undefined;
  ContentEncoding?: string | undefined;
  ContentLanguage?: string | undefined;
  ContentLength?: number | undefined;
  ContentMD5?: string | undefined;
  ContentType?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  Expires?: Date | undefined;
  IfMatch?: string | undefined;
  IfNoneMatch?: string | undefined;
  GrantFullControl?: string | undefined;
  GrantRead?: string | undefined;
  GrantReadACP?: string | undefined;
  GrantWriteACP?: string | undefined;
  Key: string | undefined;
  WriteOffsetBytes?: number | undefined;
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
}
export declare class TooManyParts extends __BaseException {
  readonly name: "TooManyParts";
  readonly $fault: "client";
  constructor(opts: __ExceptionOptionType<TooManyParts, __BaseException>);
}
export interface PutObjectAclOutput {
  RequestCharged?: RequestCharged | undefined;
}
export interface PutObjectAclRequest {
  ACL?: ObjectCannedACL | undefined;
  AccessControlPolicy?: AccessControlPolicy | undefined;
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  GrantFullControl?: string | undefined;
  GrantRead?: string | undefined;
  GrantReadACP?: string | undefined;
  GrantWrite?: string | undefined;
  GrantWriteACP?: string | undefined;
  Key: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  VersionId?: string | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutObjectLegalHoldOutput {
  RequestCharged?: RequestCharged | undefined;
}
export interface PutObjectLegalHoldRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  LegalHold?: ObjectLockLegalHold | undefined;
  RequestPayer?: RequestPayer | undefined;
  VersionId?: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutObjectLockConfigurationOutput {
  RequestCharged?: RequestCharged | undefined;
}
export interface PutObjectLockConfigurationRequest {
  Bucket: string | undefined;
  ObjectLockConfiguration?: ObjectLockConfiguration | undefined;
  RequestPayer?: RequestPayer | undefined;
  Token?: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutObjectRetentionOutput {
  RequestCharged?: RequestCharged | undefined;
}
export interface PutObjectRetentionRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  Retention?: ObjectLockRetention | undefined;
  RequestPayer?: RequestPayer | undefined;
  VersionId?: string | undefined;
  BypassGovernanceRetention?: boolean | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface PutObjectTaggingOutput {
  VersionId?: string | undefined;
}
export interface PutObjectTaggingRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  Tagging: Tagging | undefined;
  ExpectedBucketOwner?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
}
export interface PutPublicAccessBlockRequest {
  Bucket: string | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  PublicAccessBlockConfiguration: PublicAccessBlockConfiguration | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export declare class ObjectAlreadyInActiveTierError extends __BaseException {
  readonly name: "ObjectAlreadyInActiveTierError";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ObjectAlreadyInActiveTierError, __BaseException>
  );
}
export interface RestoreObjectOutput {
  RequestCharged?: RequestCharged | undefined;
  RestoreOutputPath?: string | undefined;
}
export declare const Tier: {
  readonly Bulk: "Bulk";
  readonly Expedited: "Expedited";
  readonly Standard: "Standard";
};
export type Tier = (typeof Tier)[keyof typeof Tier];
export interface GlacierJobParameters {
  Tier: Tier | undefined;
}
export interface Encryption {
  EncryptionType: ServerSideEncryption | undefined;
  KMSKeyId?: string | undefined;
  KMSContext?: string | undefined;
}
export interface MetadataEntry {
  Name?: string | undefined;
  Value?: string | undefined;
}
export interface S3Location {
  BucketName: string | undefined;
  Prefix: string | undefined;
  Encryption?: Encryption | undefined;
  CannedACL?: ObjectCannedACL | undefined;
  AccessControlList?: Grant[] | undefined;
  Tagging?: Tagging | undefined;
  UserMetadata?: MetadataEntry[] | undefined;
  StorageClass?: StorageClass | undefined;
}
export interface OutputLocation {
  S3?: S3Location | undefined;
}
export declare const ExpressionType: {
  readonly SQL: "SQL";
};
export type ExpressionType =
  (typeof ExpressionType)[keyof typeof ExpressionType];
export declare const CompressionType: {
  readonly BZIP2: "BZIP2";
  readonly GZIP: "GZIP";
  readonly NONE: "NONE";
};
export type CompressionType =
  (typeof CompressionType)[keyof typeof CompressionType];
export declare const FileHeaderInfo: {
  readonly IGNORE: "IGNORE";
  readonly NONE: "NONE";
  readonly USE: "USE";
};
export type FileHeaderInfo =
  (typeof FileHeaderInfo)[keyof typeof FileHeaderInfo];
export interface CSVInput {
  FileHeaderInfo?: FileHeaderInfo | undefined;
  Comments?: string | undefined;
  QuoteEscapeCharacter?: string | undefined;
  RecordDelimiter?: string | undefined;
  FieldDelimiter?: string | undefined;
  QuoteCharacter?: string | undefined;
  AllowQuotedRecordDelimiter?: boolean | undefined;
}
export declare const JSONType: {
  readonly DOCUMENT: "DOCUMENT";
  readonly LINES: "LINES";
};
export type JSONType = (typeof JSONType)[keyof typeof JSONType];
export interface JSONInput {
  Type?: JSONType | undefined;
}
export interface ParquetInput {}
export interface InputSerialization {
  CSV?: CSVInput | undefined;
  CompressionType?: CompressionType | undefined;
  JSON?: JSONInput | undefined;
  Parquet?: ParquetInput | undefined;
}
export declare const QuoteFields: {
  readonly ALWAYS: "ALWAYS";
  readonly ASNEEDED: "ASNEEDED";
};
export type QuoteFields = (typeof QuoteFields)[keyof typeof QuoteFields];
export interface CSVOutput {
  QuoteFields?: QuoteFields | undefined;
  QuoteEscapeCharacter?: string | undefined;
  RecordDelimiter?: string | undefined;
  FieldDelimiter?: string | undefined;
  QuoteCharacter?: string | undefined;
}
export interface JSONOutput {
  RecordDelimiter?: string | undefined;
}
export interface OutputSerialization {
  CSV?: CSVOutput | undefined;
  JSON?: JSONOutput | undefined;
}
export interface SelectParameters {
  InputSerialization: InputSerialization | undefined;
  ExpressionType: ExpressionType | undefined;
  Expression: string | undefined;
  OutputSerialization: OutputSerialization | undefined;
}
export declare const RestoreRequestType: {
  readonly SELECT: "SELECT";
};
export type RestoreRequestType =
  (typeof RestoreRequestType)[keyof typeof RestoreRequestType];
export interface RestoreRequest {
  Days?: number | undefined;
  GlacierJobParameters?: GlacierJobParameters | undefined;
  Type?: RestoreRequestType | undefined;
  Tier?: Tier | undefined;
  Description?: string | undefined;
  SelectParameters?: SelectParameters | undefined;
  OutputLocation?: OutputLocation | undefined;
}
export interface RestoreObjectRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  VersionId?: string | undefined;
  RestoreRequest?: RestoreRequest | undefined;
  RequestPayer?: RequestPayer | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface ContinuationEvent {}
export interface EndEvent {}
export interface Progress {
  BytesScanned?: number | undefined;
  BytesProcessed?: number | undefined;
  BytesReturned?: number | undefined;
}
export interface ProgressEvent {
  Details?: Progress | undefined;
}
export interface RecordsEvent {
  Payload?: Uint8Array | undefined;
}
export interface Stats {
  BytesScanned?: number | undefined;
  BytesProcessed?: number | undefined;
  BytesReturned?: number | undefined;
}
export interface StatsEvent {
  Details?: Stats | undefined;
}
export type SelectObjectContentEventStream =
  | SelectObjectContentEventStream.ContMember
  | SelectObjectContentEventStream.EndMember
  | SelectObjectContentEventStream.ProgressMember
  | SelectObjectContentEventStream.RecordsMember
  | SelectObjectContentEventStream.StatsMember
  | SelectObjectContentEventStream.$UnknownMember;
export declare namespace SelectObjectContentEventStream {
  interface RecordsMember {
    Records: RecordsEvent;
    Stats?: never;
    Progress?: never;
    Cont?: never;
    End?: never;
    $unknown?: never;
  }
  interface StatsMember {
    Records?: never;
    Stats: StatsEvent;
    Progress?: never;
    Cont?: never;
    End?: never;
    $unknown?: never;
  }
  interface ProgressMember {
    Records?: never;
    Stats?: never;
    Progress: ProgressEvent;
    Cont?: never;
    End?: never;
    $unknown?: never;
  }
  interface ContMember {
    Records?: never;
    Stats?: never;
    Progress?: never;
    Cont: ContinuationEvent;
    End?: never;
    $unknown?: never;
  }
  interface EndMember {
    Records?: never;
    Stats?: never;
    Progress?: never;
    Cont?: never;
    End: EndEvent;
    $unknown?: never;
  }
  interface $UnknownMember {
    Records?: never;
    Stats?: never;
    Progress?: never;
    Cont?: never;
    End?: never;
    $unknown: [string, any];
  }
  interface Visitor<T> {
    Records: (value: RecordsEvent) => T;
    Stats: (value: StatsEvent) => T;
    Progress: (value: ProgressEvent) => T;
    Cont: (value: ContinuationEvent) => T;
    End: (value: EndEvent) => T;
    _: (name: string, value: any) => T;
  }
  const visit: <T>(
    value: SelectObjectContentEventStream,
    visitor: Visitor<T>
  ) => T;
}
export interface SelectObjectContentOutput {
  Payload?: AsyncIterable<SelectObjectContentEventStream> | undefined;
}
export interface RequestProgress {
  Enabled?: boolean | undefined;
}
export interface ScanRange {
  Start?: number | undefined;
  End?: number | undefined;
}
export interface SelectObjectContentRequest {
  Bucket: string | undefined;
  Key: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  Expression: string | undefined;
  ExpressionType: ExpressionType | undefined;
  RequestProgress?: RequestProgress | undefined;
  InputSerialization: InputSerialization | undefined;
  OutputSerialization: OutputSerialization | undefined;
  ScanRange?: ScanRange | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface UploadPartOutput {
  ServerSideEncryption?: ServerSideEncryption | undefined;
  ETag?: string | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface UploadPartRequest {
  Body?: StreamingBlobTypes | undefined;
  Bucket: string | undefined;
  ContentLength?: number | undefined;
  ContentMD5?: string | undefined;
  ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  Key: string | undefined;
  PartNumber: number | undefined;
  UploadId: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
}
export interface CopyPartResult {
  ETag?: string | undefined;
  LastModified?: Date | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
}
export interface UploadPartCopyOutput {
  CopySourceVersionId?: string | undefined;
  CopyPartResult?: CopyPartResult | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
  RequestCharged?: RequestCharged | undefined;
}
export interface UploadPartCopyRequest {
  Bucket: string | undefined;
  CopySource: string | undefined;
  CopySourceIfMatch?: string | undefined;
  CopySourceIfModifiedSince?: Date | undefined;
  CopySourceIfNoneMatch?: string | undefined;
  CopySourceIfUnmodifiedSince?: Date | undefined;
  CopySourceRange?: string | undefined;
  Key: string | undefined;
  PartNumber: number | undefined;
  UploadId: string | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSECustomerKey?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  CopySourceSSECustomerAlgorithm?: string | undefined;
  CopySourceSSECustomerKey?: string | undefined;
  CopySourceSSECustomerKeyMD5?: string | undefined;
  RequestPayer?: RequestPayer | undefined;
  ExpectedBucketOwner?: string | undefined;
  ExpectedSourceBucketOwner?: string | undefined;
}
export interface WriteGetObjectResponseRequest {
  RequestRoute: string | undefined;
  RequestToken: string | undefined;
  Body?: StreamingBlobTypes | undefined;
  StatusCode?: number | undefined;
  ErrorCode?: string | undefined;
  ErrorMessage?: string | undefined;
  AcceptRanges?: string | undefined;
  CacheControl?: string | undefined;
  ContentDisposition?: string | undefined;
  ContentEncoding?: string | undefined;
  ContentLanguage?: string | undefined;
  ContentLength?: number | undefined;
  ContentRange?: string | undefined;
  ContentType?: string | undefined;
  ChecksumCRC32?: string | undefined;
  ChecksumCRC32C?: string | undefined;
  ChecksumCRC64NVME?: string | undefined;
  ChecksumSHA1?: string | undefined;
  ChecksumSHA256?: string | undefined;
  DeleteMarker?: boolean | undefined;
  ETag?: string | undefined;
  Expires?: Date | undefined;
  Expiration?: string | undefined;
  LastModified?: Date | undefined;
  MissingMeta?: number | undefined;
  Metadata?: Record<string, string> | undefined;
  ObjectLockMode?: ObjectLockMode | undefined;
  ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
  ObjectLockRetainUntilDate?: Date | undefined;
  PartsCount?: number | undefined;
  ReplicationStatus?: ReplicationStatus | undefined;
  RequestCharged?: RequestCharged | undefined;
  Restore?: string | undefined;
  ServerSideEncryption?: ServerSideEncryption | undefined;
  SSECustomerAlgorithm?: string | undefined;
  SSEKMSKeyId?: string | undefined;
  SSECustomerKeyMD5?: string | undefined;
  StorageClass?: StorageClass | undefined;
  TagCount?: number | undefined;
  VersionId?: string | undefined;
  BucketKeyEnabled?: boolean | undefined;
}
export declare const PutBucketEncryptionRequestFilterSensitiveLog: (
  obj: PutBucketEncryptionRequest
) => any;
export declare const PutBucketInventoryConfigurationRequestFilterSensitiveLog: (
  obj: PutBucketInventoryConfigurationRequest
) => any;
export declare const PutObjectOutputFilterSensitiveLog: (
  obj: PutObjectOutput
) => any;
export declare const PutObjectRequestFilterSensitiveLog: (
  obj: PutObjectRequest
) => any;
export declare const EncryptionFilterSensitiveLog: (obj: Encryption) => any;
export declare const S3LocationFilterSensitiveLog: (obj: S3Location) => any;
export declare const OutputLocationFilterSensitiveLog: (
  obj: OutputLocation
) => any;
export declare const RestoreRequestFilterSensitiveLog: (
  obj: RestoreRequest
) => any;
export declare const RestoreObjectRequestFilterSensitiveLog: (
  obj: RestoreObjectRequest
) => any;
export declare const SelectObjectContentEventStreamFilterSensitiveLog: (
  obj: SelectObjectContentEventStream
) => any;
export declare const SelectObjectContentOutputFilterSensitiveLog: (
  obj: SelectObjectContentOutput
) => any;
export declare const SelectObjectContentRequestFilterSensitiveLog: (
  obj: SelectObjectContentRequest
) => any;
export declare const UploadPartOutputFilterSensitiveLog: (
  obj: UploadPartOutput
) => any;
export declare const UploadPartRequestFilterSensitiveLog: (
  obj: UploadPartRequest
) => any;
export declare const UploadPartCopyOutputFilterSensitiveLog: (
  obj: UploadPartCopyOutput
) => any;
export declare const UploadPartCopyRequestFilterSensitiveLog: (
  obj: UploadPartCopyRequest
) => any;
export declare const WriteGetObjectResponseRequestFilterSensitiveLog: (
  obj: WriteGetObjectResponseRequest
) => any;
