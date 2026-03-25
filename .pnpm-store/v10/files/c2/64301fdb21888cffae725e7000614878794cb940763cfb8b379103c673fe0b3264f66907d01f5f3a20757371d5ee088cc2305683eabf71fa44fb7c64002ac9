import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { StreamingBlobTypes } from "@smithy/types";
import { S3ServiceException as __BaseException } from "./S3ServiceException";
/**
 * <p>Specifies the days since the initiation of an incomplete multipart upload that Amazon S3 will
 *          wait before permanently removing all parts of the upload. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html#mpu-abort-incomplete-mpu-lifecycle-config">
 *             Aborting Incomplete Multipart Uploads Using a Bucket Lifecycle Configuration</a> in
 *          the <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface AbortIncompleteMultipartUpload {
    /**
     * <p>Specifies the number of days after which Amazon S3 aborts an incomplete multipart
     *          upload.</p>
     * @public
     */
    DaysAfterInitiation?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RequestCharged: {
    readonly requester: "requester";
};
/**
 * @public
 */
export type RequestCharged = (typeof RequestCharged)[keyof typeof RequestCharged];
/**
 * @public
 */
export interface AbortMultipartUploadOutput {
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 * @enum
 */
export declare const RequestPayer: {
    readonly requester: "requester";
};
/**
 * @public
 */
export type RequestPayer = (typeof RequestPayer)[keyof typeof RequestPayer];
/**
 * @public
 */
export interface AbortMultipartUploadRequest {
    /**
     * <p>The bucket name to which the upload was taking place. </p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Key of the object for which the multipart upload was initiated.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Upload ID that identifies the multipart upload.</p>
     * @public
     */
    UploadId: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>If present, this header aborts an in progress multipart upload only if it was initiated on the provided timestamp.
     *          If the initiated timestamp of the multipart upload does not match the provided value, the operation returns a <code>412 Precondition Failed</code> error.
     *          If the initiated timestamp matches or if the multipart upload doesn’t exist, the operation returns a <code>204 Success (No Content)</code> response.
     *       </p>
     *          <note>
     *             <p>This functionality is only supported for directory buckets.</p>
     *          </note>
     * @public
     */
    IfMatchInitiatedTime?: Date | undefined;
}
/**
 * <p>The specified multipart upload does not exist.</p>
 * @public
 */
export declare class NoSuchUpload extends __BaseException {
    readonly name: "NoSuchUpload";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NoSuchUpload, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const BucketAccelerateStatus: {
    readonly Enabled: "Enabled";
    readonly Suspended: "Suspended";
};
/**
 * @public
 */
export type BucketAccelerateStatus = (typeof BucketAccelerateStatus)[keyof typeof BucketAccelerateStatus];
/**
 * <p>Configures the transfer acceleration state for an Amazon S3 bucket. For more information, see
 *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/transfer-acceleration.html">Amazon S3
 *             Transfer Acceleration</a> in the <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface AccelerateConfiguration {
    /**
     * <p>Specifies the transfer acceleration status of the bucket.</p>
     * @public
     */
    Status?: BucketAccelerateStatus | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Type: {
    readonly AmazonCustomerByEmail: "AmazonCustomerByEmail";
    readonly CanonicalUser: "CanonicalUser";
    readonly Group: "Group";
};
/**
 * @public
 */
export type Type = (typeof Type)[keyof typeof Type];
/**
 * <p>Container for the person being granted permissions.</p>
 * @public
 */
export interface Grantee {
    /**
     * <p>Screen name of the grantee.</p>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>Email address of the grantee.</p>
     *          <note>
     *             <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
     *             <ul>
     *                <li>
     *                   <p>US East (N. Virginia)</p>
     *                </li>
     *                <li>
     *                   <p>US West (N. California)</p>
     *                </li>
     *                <li>
     *                   <p> US West (Oregon)</p>
     *                </li>
     *                <li>
     *                   <p> Asia Pacific (Singapore)</p>
     *                </li>
     *                <li>
     *                   <p>Asia Pacific (Sydney)</p>
     *                </li>
     *                <li>
     *                   <p>Asia Pacific (Tokyo)</p>
     *                </li>
     *                <li>
     *                   <p>Europe (Ireland)</p>
     *                </li>
     *                <li>
     *                   <p>South America (São Paulo)</p>
     *                </li>
     *             </ul>
     *             <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
     *          </note>
     * @public
     */
    EmailAddress?: string | undefined;
    /**
     * <p>The canonical user ID of the grantee.</p>
     * @public
     */
    ID?: string | undefined;
    /**
     * <p>URI of the grantee group.</p>
     * @public
     */
    URI?: string | undefined;
    /**
     * <p>Type of grantee</p>
     * @public
     */
    Type: Type | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Permission: {
    readonly FULL_CONTROL: "FULL_CONTROL";
    readonly READ: "READ";
    readonly READ_ACP: "READ_ACP";
    readonly WRITE: "WRITE";
    readonly WRITE_ACP: "WRITE_ACP";
};
/**
 * @public
 */
export type Permission = (typeof Permission)[keyof typeof Permission];
/**
 * <p>Container for grant information.</p>
 * @public
 */
export interface Grant {
    /**
     * <p>The person being granted permissions.</p>
     * @public
     */
    Grantee?: Grantee | undefined;
    /**
     * <p>Specifies the permission given to the grantee.</p>
     * @public
     */
    Permission?: Permission | undefined;
}
/**
 * <p>Container for the owner's display name and ID.</p>
 * @public
 */
export interface Owner {
    /**
     * <p>Container for the display name of the owner. This value is only supported in the
     *          following Amazon Web Services Regions:</p>
     *          <ul>
     *             <li>
     *                <p>US East (N. Virginia)</p>
     *             </li>
     *             <li>
     *                <p>US West (N. California)</p>
     *             </li>
     *             <li>
     *                <p>US West (Oregon)</p>
     *             </li>
     *             <li>
     *                <p>Asia Pacific (Singapore)</p>
     *             </li>
     *             <li>
     *                <p>Asia Pacific (Sydney)</p>
     *             </li>
     *             <li>
     *                <p>Asia Pacific (Tokyo)</p>
     *             </li>
     *             <li>
     *                <p>Europe (Ireland)</p>
     *             </li>
     *             <li>
     *                <p>South America (São Paulo)</p>
     *             </li>
     *          </ul>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DisplayName?: string | undefined;
    /**
     * <p>Container for the ID of the owner.</p>
     * @public
     */
    ID?: string | undefined;
}
/**
 * <p>Contains the elements that set the ACL permissions for an object per grantee.</p>
 * @public
 */
export interface AccessControlPolicy {
    /**
     * <p>A list of grants.</p>
     * @public
     */
    Grants?: Grant[] | undefined;
    /**
     * <p>Container for the bucket owner's display name and ID.</p>
     * @public
     */
    Owner?: Owner | undefined;
}
/**
 * @public
 * @enum
 */
export declare const OwnerOverride: {
    readonly Destination: "Destination";
};
/**
 * @public
 */
export type OwnerOverride = (typeof OwnerOverride)[keyof typeof OwnerOverride];
/**
 * <p>A container for information about access control for replicas.</p>
 * @public
 */
export interface AccessControlTranslation {
    /**
     * <p>Specifies the replica ownership. For default and valid values, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTreplication.html">PUT bucket
     *             replication</a> in the <i>Amazon S3 API Reference</i>.</p>
     * @public
     */
    Owner: OwnerOverride | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ChecksumType: {
    readonly COMPOSITE: "COMPOSITE";
    readonly FULL_OBJECT: "FULL_OBJECT";
};
/**
 * @public
 */
export type ChecksumType = (typeof ChecksumType)[keyof typeof ChecksumType];
/**
 * @public
 * @enum
 */
export declare const ServerSideEncryption: {
    readonly AES256: "AES256";
    readonly aws_kms: "aws:kms";
    readonly aws_kms_dsse: "aws:kms:dsse";
};
/**
 * @public
 */
export type ServerSideEncryption = (typeof ServerSideEncryption)[keyof typeof ServerSideEncryption];
/**
 * @public
 */
export interface CompleteMultipartUploadOutput {
    /**
     * <p>The URI that identifies the newly created object.</p>
     * @public
     */
    Location?: string | undefined;
    /**
     * <p>The name of the bucket that contains the newly created object. Does not return the access point
     *          ARN or access point alias if used.</p>
     *          <note>
     *             <p>Access points are not supported by directory buckets.</p>
     *          </note>
     * @public
     */
    Bucket?: string | undefined;
    /**
     * <p>The object key of the newly created object.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>If the object expiration is configured, this will contain the expiration date
     *             (<code>expiry-date</code>) and rule ID (<code>rule-id</code>). The value of
     *             <code>rule-id</code> is URL-encoded.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    Expiration?: string | undefined;
    /**
     * <p>Entity tag that identifies the newly created object's data. Objects with different
     *          object data will have different entity tags. The entity tag is an opaque string. The entity
     *          tag may or may not be an MD5 digest of the object data. If the entity tag is not an MD5
     *          digest of the object data, it will contain one or more nonhexadecimal characters and/or
     *          will consist of less than 32 or more than 32 hexadecimal digits. For more information about
     *          how the entity tag is calculated, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object
     *             integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32 checksum</code> of the object. This checksum is only be present if the checksum was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the object. This checksum is only present if the checksum was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>This header can be used as a data integrity check to verify that the data received is
     *          the same data that was originally sent. This header specifies the Base64 encoded, 64-bit
     *             <code>CRC64NVME</code> checksum of the object. The <code>CRC64NVME</code> checksum is
     *          always a full object checksum. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>. </p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. When you use the API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
    /**
     * <p>The checksum type, which determines how part-level checksums are combined to create an
     *          object-level checksum for multipart objects. You can use this header as a data integrity
     *          check to verify that the checksum type that is received is the same checksum type that was
     *          specified during the <code>CreateMultipartUpload</code> request. For more information, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p>The server-side encryption algorithm used when storing this object in Amazon S3 (for example,
     *             <code>AES256</code>, <code>aws:kms</code>).</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>Version ID of the newly created object, in case the bucket has versioning turned
     *          on.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>If present, indicates the ID of the KMS key that was used for object encryption.</p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>Indicates whether the multipart upload uses an S3 Bucket Key for server-side encryption
     *          with Key Management Service (KMS) keys (SSE-KMS).</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * <p>Details of the parts that were uploaded.</p>
 * @public
 */
export interface CompletedPart {
    /**
     * <p>Entity tag returned when the part was uploaded.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC32</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC32C</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC64NVME</code> checksum algorithm to the uploaded object). For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>SHA1</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>SHA256</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
    /**
     * <p>Part number that identifies the part. This is a positive integer between 1 and
     *          10,000.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>General purpose buckets</b> - In
     *                      <code>CompleteMultipartUpload</code>, when a additional checksum (including
     *                      <code>x-amz-checksum-crc32</code>, <code>x-amz-checksum-crc32c</code>,
     *                      <code>x-amz-checksum-sha1</code>, or <code>x-amz-checksum-sha256</code>) is
     *                   applied to each part, the <code>PartNumber</code> must start at 1 and the part
     *                   numbers must be consecutive. Otherwise, Amazon S3 generates an HTTP <code>400 Bad
     *                      Request</code> status code and an <code>InvalidPartOrder</code> error
     *                   code.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> - In
     *                      <code>CompleteMultipartUpload</code>, the <code>PartNumber</code> must start at
     *                   1 and the part numbers must be consecutive.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    PartNumber?: number | undefined;
}
/**
 * <p>The container for the completed multipart upload details.</p>
 * @public
 */
export interface CompletedMultipartUpload {
    /**
     * <p>Array of CompletedPart data types.</p>
     *          <p>If you do not supply a valid <code>Part</code> with your request, the service sends back
     *          an HTTP 400 response.</p>
     * @public
     */
    Parts?: CompletedPart[] | undefined;
}
/**
 * @public
 */
export interface CompleteMultipartUploadRequest {
    /**
     * <p>Name of the bucket to which the multipart upload was initiated.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Object key for which the multipart upload was initiated.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The container for the multipart upload request information.</p>
     * @public
     */
    MultipartUpload?: CompletedMultipartUpload | undefined;
    /**
     * <p>ID for the initiated multipart upload.</p>
     * @public
     */
    UploadId: string | undefined;
    /**
     * <p>This header can be used as a data integrity check to verify that the data received is the same data that was originally sent.
     *     This header specifies the Base64 encoded, 32-bit <code>CRC32</code> checksum of the object. For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>This header can be used as a data integrity check to verify that the data received is the same data that was originally sent.
     *     This header specifies the Base64 encoded, 32-bit <code>CRC32C</code> checksum of the object. For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>This header can be used as a data integrity check to verify that the data received is
     *          the same data that was originally sent. This header specifies the Base64 encoded, 64-bit
     *             <code>CRC64NVME</code> checksum of the object. The <code>CRC64NVME</code> checksum is
     *          always a full object checksum. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>This header can be used as a data integrity check to verify that the data received is the same data that was originally sent.
     *     This header specifies the Base64 encoded, 160-bit <code>SHA1</code> digest of the object. For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>This header can be used as a data integrity check to verify that the data received is the same data that was originally sent.
     *     This header specifies the Base64 encoded, 256-bit <code>SHA256</code> digest of the object. For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
    /**
     * <p>This header specifies the checksum type of the object, which determines how part-level
     *          checksums are combined to create an object-level checksum for multipart objects. You can
     *          use this header as a data integrity check to verify that the checksum type that is received
     *          is the same checksum that was specified. If the checksum type doesn’t match the checksum
     *          type that was specified for the object during the <code>CreateMultipartUpload</code>
     *          request, it’ll result in a <code>BadDigest</code> error. For more information, see Checking
     *          object integrity in the Amazon S3 User Guide. </p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p> The expected total object size of the multipart upload request. If there’s a mismatch
     *          between the specified object size value and the actual object size value, it results in an
     *             <code>HTTP 400 InvalidRequest</code> error. </p>
     * @public
     */
    MpuObjectSize?: number | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Uploads the object only if the ETag (entity tag) value provided during the WRITE
     *          operation matches the ETag of the object in S3. If the ETag values do not match, the
     *          operation returns a <code>412 Precondition Failed</code> error.</p>
     *          <p>If a conflicting operation occurs during the upload S3 returns a <code>409
     *             ConditionalRequestConflict</code> response. On a 409 failure you should fetch the object's ETag, re-initiate the
     *          multipart upload with <code>CreateMultipartUpload</code>, and re-upload each part.</p>
     *          <p>Expects the ETag value as a string.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>, or <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-requests.html">Conditional requests</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    IfMatch?: string | undefined;
    /**
     * <p>Uploads the object only if the object key name does not already exist in the bucket
     *          specified. Otherwise, Amazon S3 returns a <code>412 Precondition Failed</code> error.</p>
     *          <p>If a conflicting operation occurs during the upload S3 returns a <code>409
     *             ConditionalRequestConflict</code> response. On a 409 failure you should re-initiate the
     *          multipart upload with <code>CreateMultipartUpload</code> and re-upload each part.</p>
     *          <p>Expects the '*' (asterisk) character.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>, or <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-requests.html">Conditional requests</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    IfNoneMatch?: string | undefined;
    /**
     * <p>The server-side encryption (SSE) algorithm used to encrypt the object. This parameter is
     *          required only when the object was created using a checksum algorithm or if your bucket
     *          policy requires the use of SSE-C. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html#ssec-require-condition-key">Protecting data using SSE-C keys</a> in the <i>Amazon S3 User
     *          Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>The server-side encryption (SSE) customer managed key. This parameter is needed only when the object was created using a checksum algorithm.
     *     For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Protecting data using SSE-C keys</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>The MD5 server-side encryption (SSE) customer managed key. This parameter is needed only when the object was created using a checksum
     *     algorithm. For more information,
     *     see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Protecting data using SSE-C keys</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
}
/**
 * <p>Container for all response elements.</p>
 * @public
 */
export interface CopyObjectResult {
    /**
     * <p>Returns the ETag of the new object. The ETag reflects only changes to the contents of an
     *          object, not its metadata.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>Creation date of the object.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>The checksum type that is used to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32</code> checksum of the object. This checksum is only present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the object. This will only be present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the object. This checksum is present
     *          if the object being copied was uploaded with the <code>CRC64NVME</code> checksum algorithm, or if the object was uploaded without a
     *          checksum (and Amazon S3 added the default checksum, <code>CRC64NVME</code>, to the uploaded object). For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
}
/**
 * @public
 */
export interface CopyObjectOutput {
    /**
     * <p>Container for all response elements.</p>
     * @public
     */
    CopyObjectResult?: CopyObjectResult | undefined;
    /**
     * <p>If the object expiration is configured, the response includes this header.</p>
     *          <note>
     *             <p>Object expiration information is not returned in directory buckets and this header returns the value "<code>NotImplemented</code>" in all responses for directory buckets.</p>
     *          </note>
     * @public
     */
    Expiration?: string | undefined;
    /**
     * <p>Version ID of the source object that was copied.</p>
     *          <note>
     *             <p>This functionality is not supported when the source object is in a directory bucket.</p>
     *          </note>
     * @public
     */
    CopySourceVersionId?: string | undefined;
    /**
     * <p>Version ID of the newly created copy.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>The server-side encryption algorithm used when you store this object in Amazon S3 (for
     *          example, <code>AES256</code>, <code>aws:kms</code>, <code>aws:kms:dsse</code>).</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to confirm the encryption algorithm that's used.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to provide the round-trip message integrity verification
     *          of the customer-provided encryption key.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>If present, indicates the ID of the KMS key that was used for object encryption.</p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>If present, indicates the Amazon Web Services KMS Encryption Context to use for object encryption. The
     *          value of this header is a Base64 encoded UTF-8 string holding JSON with the encryption
     *          context key-value pairs.</p>
     * @public
     */
    SSEKMSEncryptionContext?: string | undefined;
    /**
     * <p>Indicates whether the copied object uses an S3 Bucket Key for server-side encryption
     *          with Key Management Service (KMS) keys (SSE-KMS).</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ObjectCannedACL: {
    readonly authenticated_read: "authenticated-read";
    readonly aws_exec_read: "aws-exec-read";
    readonly bucket_owner_full_control: "bucket-owner-full-control";
    readonly bucket_owner_read: "bucket-owner-read";
    readonly private: "private";
    readonly public_read: "public-read";
    readonly public_read_write: "public-read-write";
};
/**
 * @public
 */
export type ObjectCannedACL = (typeof ObjectCannedACL)[keyof typeof ObjectCannedACL];
/**
 * @public
 * @enum
 */
export declare const ChecksumAlgorithm: {
    readonly CRC32: "CRC32";
    readonly CRC32C: "CRC32C";
    readonly CRC64NVME: "CRC64NVME";
    readonly SHA1: "SHA1";
    readonly SHA256: "SHA256";
};
/**
 * @public
 */
export type ChecksumAlgorithm = (typeof ChecksumAlgorithm)[keyof typeof ChecksumAlgorithm];
/**
 * @public
 * @enum
 */
export declare const MetadataDirective: {
    readonly COPY: "COPY";
    readonly REPLACE: "REPLACE";
};
/**
 * @public
 */
export type MetadataDirective = (typeof MetadataDirective)[keyof typeof MetadataDirective];
/**
 * @public
 * @enum
 */
export declare const ObjectLockLegalHoldStatus: {
    readonly OFF: "OFF";
    readonly ON: "ON";
};
/**
 * @public
 */
export type ObjectLockLegalHoldStatus = (typeof ObjectLockLegalHoldStatus)[keyof typeof ObjectLockLegalHoldStatus];
/**
 * @public
 * @enum
 */
export declare const ObjectLockMode: {
    readonly COMPLIANCE: "COMPLIANCE";
    readonly GOVERNANCE: "GOVERNANCE";
};
/**
 * @public
 */
export type ObjectLockMode = (typeof ObjectLockMode)[keyof typeof ObjectLockMode];
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type StorageClass = (typeof StorageClass)[keyof typeof StorageClass];
/**
 * @public
 * @enum
 */
export declare const TaggingDirective: {
    readonly COPY: "COPY";
    readonly REPLACE: "REPLACE";
};
/**
 * @public
 */
export type TaggingDirective = (typeof TaggingDirective)[keyof typeof TaggingDirective];
/**
 * @public
 */
export interface CopyObjectRequest {
    /**
     * <p>The canned access control list (ACL) to apply to the object.</p>
     *          <p>When you copy an object, the ACL metadata is not preserved and is set to
     *             <code>private</code> by default. Only the owner has full access control. To override the
     *          default ACL setting, specify a new ACL when you generate a copy request. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/S3_ACLs_UsingACLs.html">Using ACLs</a>. </p>
     *          <p>If the destination bucket that you're copying objects to uses the bucket owner enforced
     *          setting for S3 Object Ownership, ACLs are disabled and no longer affect permissions.
     *          Buckets that use this setting only accept <code>PUT</code> requests that don't specify an
     *          ACL or <code>PUT</code> requests that specify bucket owner full control ACLs, such as the
     *             <code>bucket-owner-full-control</code> canned ACL or an equivalent form of this ACL
     *          expressed in the XML format. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html">Controlling ownership of
     *             objects and disabling ACLs</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>If your destination bucket uses the bucket owner enforced setting for Object
     *                   Ownership, all objects written to the bucket by any account will be owned by the
     *                   bucket owner.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    ACL?: ObjectCannedACL | undefined;
    /**
     * <p>The name of the destination bucket.</p>
     *          <p>
     *             <b>Directory buckets</b> - When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Copying objects across different Amazon Web Services Regions isn't supported when the source or destination bucket is in Amazon Web Services Local Zones. The source and destination buckets must have the same parent Amazon Web Services Region. Otherwise,
     *       you get an HTTP <code>400 Bad Request</code> error with the error code <code>InvalidRequest</code>.</p>
     *          </note>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must use the Outpost bucket access point ARN or the access point alias for the destination bucket.
     *
     *          You can only copy objects within the same Outpost bucket. It's not supported to copy objects across different Amazon Web Services Outposts, between buckets on the same Outposts, or between Outposts buckets and any other bucket types.
     *          For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>S3 on Outposts guide</i>.
     *          When you use this action with S3 on Outposts through the REST API, you must direct requests to the S3 on Outposts hostname, in the format
     *          <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. The hostname isn't required when you use the Amazon Web Services CLI or SDKs.
     *       </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Specifies the caching behavior along the request/reply chain.</p>
     * @public
     */
    CacheControl?: string | undefined;
    /**
     * <p>Indicates the algorithm that you want Amazon S3 to use to create the checksum for the object. For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in
     *     the <i>Amazon S3 User Guide</i>.</p>
     *          <p>When you copy an object, if the source object has a checksum, that checksum value will
     *          be copied to the new object by default. If the <code>CopyObject</code> request does not
     *          include this <code>x-amz-checksum-algorithm</code> header, the checksum algorithm will be
     *          copied from the source object to the destination object (if it's present on the source
     *          object). You can optionally specify a different checksum algorithm to use with the
     *             <code>x-amz-checksum-algorithm</code> header. Unrecognized or unsupported values will
     *          respond with the HTTP status code <code>400 Bad Request</code>.</p>
     *          <note>
     *             <p>For directory buckets, when you use Amazon Web Services SDKs, <code>CRC32</code> is the default checksum algorithm that's used for performance.</p>
     *          </note>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p>Specifies presentational information for the object. Indicates whether an object should
     *          be displayed in a web browser or downloaded as a file. It allows specifying the desired
     *          filename for the downloaded file.</p>
     * @public
     */
    ContentDisposition?: string | undefined;
    /**
     * <p>Specifies what content encodings have been applied to the object and thus what decoding
     *          mechanisms must be applied to obtain the media-type referenced by the Content-Type header
     *          field.</p>
     *          <note>
     *             <p>For directory buckets, only the <code>aws-chunked</code> value is supported in this header field.</p>
     *          </note>
     * @public
     */
    ContentEncoding?: string | undefined;
    /**
     * <p>The language the content is in.</p>
     * @public
     */
    ContentLanguage?: string | undefined;
    /**
     * <p>A standard MIME type that describes the format of the object data.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>Specifies the source object for the copy operation. The source object can be up to 5 GB.
     *          If the source object is an object that was uploaded by using a multipart upload, the object
     *          copy will be a single part object after the source object is copied to the destination
     *          bucket.</p>
     *          <p>You specify the value of the copy source in one of two formats, depending on whether you
     *          want to access the source object through an <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points.html">access point</a>:</p>
     *          <ul>
     *             <li>
     *                <p>For objects not accessed through an access point, specify the name of the source bucket
     *                and the key of the source object, separated by a slash (/). For example, to copy the
     *                object <code>reports/january.pdf</code> from the general purpose bucket
     *                   <code>awsexamplebucket</code>, use
     *                   <code>awsexamplebucket/reports/january.pdf</code>. The value must be URL-encoded.
     *                To copy the object <code>reports/january.pdf</code> from the directory bucket
     *                   <code>awsexamplebucket--use1-az5--x-s3</code>, use
     *                   <code>awsexamplebucket--use1-az5--x-s3/reports/january.pdf</code>. The value must
     *                be URL-encoded.</p>
     *             </li>
     *             <li>
     *                <p>For objects accessed through access points, specify the Amazon Resource Name (ARN) of the object as accessed through the access point, in the format <code>arn:aws:s3:<Region>:<account-id>:accesspoint/<access-point-name>/object/<key></code>. For example, to copy the object <code>reports/january.pdf</code> through access point <code>my-access-point</code> owned by account <code>123456789012</code> in Region <code>us-west-2</code>, use the URL encoding of <code>arn:aws:s3:us-west-2:123456789012:accesspoint/my-access-point/object/reports/january.pdf</code>. The value must be URL encoded.</p>
     *                <note>
     *                   <ul>
     *                      <li>
     *                         <p>Amazon S3 supports copy operations using Access points only when the source and destination buckets are in the same Amazon Web Services Region.</p>
     *                      </li>
     *                      <li>
     *                         <p>Access points are not supported by directory buckets.</p>
     *                      </li>
     *                   </ul>
     *                </note>
     *                <p>Alternatively, for objects accessed through Amazon S3 on Outposts, specify the ARN of the object as accessed in the format <code>arn:aws:s3-outposts:<Region>:<account-id>:outpost/<outpost-id>/object/<key></code>. For example, to copy the object <code>reports/january.pdf</code> through outpost <code>my-outpost</code> owned by account <code>123456789012</code> in Region <code>us-west-2</code>, use the URL encoding of <code>arn:aws:s3-outposts:us-west-2:123456789012:outpost/my-outpost/object/reports/january.pdf</code>. The value must be URL-encoded.  </p>
     *             </li>
     *          </ul>
     *          <p>If your source bucket versioning is enabled, the <code>x-amz-copy-source</code> header
     *          by default identifies the current version of an object to copy. If the current version is a
     *          delete marker, Amazon S3 behaves as if the object was deleted. To copy a different version, use
     *          the <code>versionId</code> query parameter. Specifically, append
     *             <code>?versionId=<version-id></code> to the value (for example,
     *             <code>awsexamplebucket/reports/january.pdf?versionId=QUpfdndhfd8438MNFDN93jdnJFkdmqnh893</code>).
     *          If you don't specify a version ID, Amazon S3 copies the latest version of the source
     *          object.</p>
     *          <p>If you enable versioning on the destination bucket, Amazon S3 generates a unique version ID
     *          for the copied object. This version ID is different from the version ID of the source
     *          object. Amazon S3 returns the version ID of the copied object in the
     *             <code>x-amz-version-id</code> response header in the response.</p>
     *          <p>If you do not enable versioning or suspend it on the destination bucket, the version ID
     *          that Amazon S3 generates in the <code>x-amz-version-id</code> response header is always
     *          null.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> -
     *             S3 Versioning isn't enabled and supported for directory buckets.</p>
     *          </note>
     * @public
     */
    CopySource: string | undefined;
    /**
     * <p>Copies the object if its entity tag (ETag) matches the specified tag.</p>
     *          <p> If both the <code>x-amz-copy-source-if-match</code> and
     *             <code>x-amz-copy-source-if-unmodified-since</code> headers are present in the request
     *          and evaluate as follows, Amazon S3 returns <code>200 OK</code> and copies the data:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-match</code> condition evaluates to true</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-unmodified-since</code> condition evaluates to
     *                false</p>
     *             </li>
     *          </ul>
     * @public
     */
    CopySourceIfMatch?: string | undefined;
    /**
     * <p>Copies the object if it has been modified since the specified time.</p>
     *          <p>If both the <code>x-amz-copy-source-if-none-match</code> and
     *             <code>x-amz-copy-source-if-modified-since</code> headers are present in the request and
     *          evaluate as follows, Amazon S3 returns the <code>412 Precondition Failed</code> response
     *          code:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-none-match</code> condition evaluates to false</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-modified-since</code> condition evaluates to
     *                true</p>
     *             </li>
     *          </ul>
     * @public
     */
    CopySourceIfModifiedSince?: Date | undefined;
    /**
     * <p>Copies the object if its entity tag (ETag) is different than the specified ETag.</p>
     *          <p>If both the <code>x-amz-copy-source-if-none-match</code> and
     *             <code>x-amz-copy-source-if-modified-since</code> headers are present in the request and
     *          evaluate as follows, Amazon S3 returns the <code>412 Precondition Failed</code> response
     *          code:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-none-match</code> condition evaluates to false</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-modified-since</code> condition evaluates to
     *                true</p>
     *             </li>
     *          </ul>
     * @public
     */
    CopySourceIfNoneMatch?: string | undefined;
    /**
     * <p>Copies the object if it hasn't been modified since the specified time.</p>
     *          <p> If both the <code>x-amz-copy-source-if-match</code> and
     *             <code>x-amz-copy-source-if-unmodified-since</code> headers are present in the request
     *          and evaluate as follows, Amazon S3 returns <code>200 OK</code> and copies the data:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-match</code> condition evaluates to true</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-copy-source-if-unmodified-since</code> condition evaluates to
     *                false</p>
     *             </li>
     *          </ul>
     * @public
     */
    CopySourceIfUnmodifiedSince?: Date | undefined;
    /**
     * <p>The date and time at which the object is no longer cacheable.</p>
     * @public
     */
    Expires?: Date | undefined;
    /**
     * <p>Gives the grantee READ, READ_ACP, and WRITE_ACP permissions on the object.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantFullControl?: string | undefined;
    /**
     * <p>Allows grantee to read the object data and its metadata.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantRead?: string | undefined;
    /**
     * <p>Allows grantee to read the object ACL.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantReadACP?: string | undefined;
    /**
     * <p>Allows grantee to write the ACL for the applicable object.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantWriteACP?: string | undefined;
    /**
     * <p>The key of the destination object.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>A map of metadata to store with the object in S3.</p>
     * @public
     */
    Metadata?: Record<string, string> | undefined;
    /**
     * <p>Specifies whether the metadata is copied from the source object or replaced with
     *          metadata that's provided in the request. When copying an object, you can preserve all
     *          metadata (the default) or specify new metadata. If this header isn’t specified,
     *             <code>COPY</code> is the default behavior. </p>
     *          <p>
     *             <b>General purpose bucket</b> - For general purpose buckets, when you
     *          grant permissions, you can use the <code>s3:x-amz-metadata-directive</code> condition key
     *          to enforce certain metadata behavior when objects are uploaded. For more information, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/amazon-s3-policy-keys.html">Amazon S3
     *             condition key examples</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>
     *                <code>x-amz-website-redirect-location</code> is unique to each object and is not
     *             copied when using the <code>x-amz-metadata-directive</code> header. To copy the value,
     *             you must specify <code>x-amz-website-redirect-location</code> in the request
     *             header.</p>
     *          </note>
     * @public
     */
    MetadataDirective?: MetadataDirective | undefined;
    /**
     * <p>Specifies whether the object tag-set is copied from the source object or replaced with
     *          the tag-set that's provided in the request.</p>
     *          <p>The default value is <code>COPY</code>.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets in a <code>CopyObject</code> operation, only the empty tag-set is supported. Any requests that attempt to write non-empty tags into directory buckets will receive a <code>501 Not Implemented</code> status code.
     * When the destination bucket is a directory bucket, you will receive a <code>501 Not Implemented</code> response in any of the following situations:</p>
     *             <ul>
     *                <li>
     *                   <p>When you attempt to <code>COPY</code> the tag-set from an S3 source object that has non-empty tags.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a source object and set a non-empty value to <code>x-amz-tagging</code>.</p>
     *                </li>
     *                <li>
     *                   <p>When you don't set the <code>x-amz-tagging-directive</code> header and the source object has non-empty tags. This is because the default value of <code>x-amz-tagging-directive</code> is <code>COPY</code>.</p>
     *                </li>
     *             </ul>
     *             <p>Because only the empty tag-set is supported for directory buckets in a <code>CopyObject</code> operation, the following situations are allowed:</p>
     *             <ul>
     *                <li>
     *                   <p>When you attempt to <code>COPY</code> the tag-set from a directory bucket source object that has no tags to a general purpose bucket. It copies an empty tag-set to the destination object.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a directory bucket source object and set the <code>x-amz-tagging</code> value of the directory bucket destination object to empty.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a general purpose bucket source object that has non-empty tags and set the <code>x-amz-tagging</code> value of the directory bucket destination object to empty.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a directory bucket source object and don't set the <code>x-amz-tagging</code> value of the directory bucket destination object. This is because the default value of <code>x-amz-tagging</code> is the empty value.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    TaggingDirective?: TaggingDirective | undefined;
    /**
     * <p>The server-side encryption algorithm used when storing this object in Amazon S3. Unrecognized
     *          or unsupported values won’t write a destination object and will receive a <code>400 Bad
     *             Request</code> response. </p>
     *          <p>Amazon S3 automatically encrypts all new objects that are copied to an S3 bucket. When
     *          copying an object, if you don't specify encryption information in your copy request, the
     *          encryption setting of the target object is set to the default encryption configuration of
     *          the destination bucket. By default, all buckets have a base level of encryption
     *          configuration that uses server-side encryption with Amazon S3 managed keys (SSE-S3). If the
     *          destination bucket has a different default encryption configuration, Amazon S3 uses the
     *          corresponding encryption key to encrypt the target object copy.</p>
     *          <p>With server-side encryption, Amazon S3 encrypts your data as it writes your data to disks in
     *          its data centers and decrypts the data when you access it. For more information about
     *          server-side encryption, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/serv-side-encryption.html">Using Server-Side Encryption</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>General purpose buckets </b>
     *          </p>
     *          <ul>
     *             <li>
     *                <p>For general purpose buckets, there are the following supported options for server-side
     *                encryption: server-side encryption with Key Management Service (KMS) keys (SSE-KMS), dual-layer
     *                server-side encryption with Amazon Web Services KMS keys (DSSE-KMS), and server-side encryption
     *                with customer-provided encryption keys (SSE-C). Amazon S3 uses the corresponding
     *                KMS key, or a customer-provided key to encrypt the target object copy.</p>
     *             </li>
     *             <li>
     *                <p>When you perform a <code>CopyObject</code> operation, if you want to use a
     *                different type of encryption setting for the target object, you can specify
     *                appropriate encryption-related headers to encrypt the target object with an Amazon S3
     *                managed key, a KMS key, or a customer-provided key. If the encryption setting in
     *                your request is different from the default encryption configuration of the
     *                destination bucket, the encryption setting in your request takes precedence. </p>
     *             </li>
     *          </ul>
     *          <p>
     *             <b>Directory buckets </b>
     *          </p>
     *          <ul>
     *             <li>
     *                <p>For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>). We recommend that the bucket's default encryption uses the desired encryption configuration and you don't override the bucket default encryption in your
     *             <code>CreateSession</code> requests or <code>PUT</code> object requests. Then, new objects
     *  are automatically encrypted with the desired encryption settings. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>. For more information about the encryption overriding behaviors in directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-specifying-kms-encryption.html">Specifying server-side encryption with KMS for new object uploads</a>.</p>
     *             </li>
     *             <li>
     *                <p>To encrypt new object copies to a directory bucket with SSE-KMS, we recommend you
     *                specify SSE-KMS as the directory bucket's default encryption configuration with
     *                a KMS key (specifically, a <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a>).
     *                The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported. Your SSE-KMS
     *                configuration can only support 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> per
     *                directory bucket for the lifetime of the bucket. After you specify a customer managed key for
     *                SSE-KMS, you can't override the customer managed key for the bucket's SSE-KMS
     *                configuration. Then, when you perform a <code>CopyObject</code> operation and want to
     *                specify server-side encryption settings for new object copies with SSE-KMS in the
     *                encryption-related request headers, you must ensure the encryption key is the same
     *                customer managed key that you specified for the directory bucket's default encryption
     *                configuration.
     *                </p>
     *             </li>
     *          </ul>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>If the <code>x-amz-storage-class</code> header is not used, the copied object will be
     *          stored in the <code>STANDARD</code> Storage Class by default. The <code>STANDARD</code>
     *          storage class provides high durability and high availability. Depending on performance
     *          needs, you can specify a different Storage Class. </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets </b> -
     *                   Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.
     * Unsupported storage class values won't write a destination object and will respond with the HTTP status code <code>400 Bad Request</code>.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Amazon S3 on Outposts </b> - S3 on Outposts only
     *                   uses the <code>OUTPOSTS</code> Storage Class.</p>
     *                </li>
     *             </ul>
     *          </note>
     *          <p>You can use the <code>CopyObject</code> action to change the storage class of an object
     *          that is already stored in Amazon S3 by using the <code>x-amz-storage-class</code> header. For
     *          more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html">Storage Classes</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <p>Before using an object as a source object for the copy operation, you must restore a
     *          copy of it if it meets any of the following conditions:</p>
     *          <ul>
     *             <li>
     *                <p>The storage class of the source object is <code>GLACIER</code> or
     *                   <code>DEEP_ARCHIVE</code>.</p>
     *             </li>
     *             <li>
     *                <p>The storage class of the source object is <code>INTELLIGENT_TIERING</code> and
     *                it's <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html#intel-tiering-tier-definition">S3 Intelligent-Tiering access tier</a> is <code>Archive Access</code> or
     *                   <code>Deep Archive Access</code>.</p>
     *             </li>
     *          </ul>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html">RestoreObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/CopyingObjectsExamples.html">Copying
     *             Objects</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>If the destination bucket is configured as a website, redirects requests for this object
     *          copy to another object in the same bucket or to an external URL. Amazon S3 stores the value of
     *          this header in the object metadata. This value is unique to each object and is not copied
     *          when using the <code>x-amz-metadata-directive</code> header. Instead, you may opt to
     *          provide this header in combination with the <code>x-amz-metadata-directive</code>
     *          header.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    WebsiteRedirectLocation?: string | undefined;
    /**
     * <p>Specifies the algorithm to use when encrypting the object (for example,
     *             <code>AES256</code>).</p>
     *          <p>When you perform a <code>CopyObject</code> operation, if you want to use a different
     *          type of encryption setting for the target object, you can specify appropriate
     *          encryption-related headers to encrypt the target object with an Amazon S3 managed key, a
     *          KMS key, or a customer-provided key. If the encryption setting in your request is
     *          different from the default encryption configuration of the destination bucket, the
     *          encryption setting in your request takes precedence. </p>
     *          <note>
     *             <p>This functionality is not supported when the destination bucket is a directory bucket.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>Specifies the customer-provided encryption key for Amazon S3 to use in encrypting data. This
     *          value is used to store the object and then it is discarded. Amazon S3 does not store the
     *          encryption key. The key must be appropriate for use with the algorithm specified in the
     *             <code>x-amz-server-side-encryption-customer-algorithm</code> header.</p>
     *          <note>
     *             <p>This functionality is not supported when the destination bucket is a directory bucket.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>Specifies the 128-bit MD5 digest of the encryption key according to RFC 1321. Amazon S3 uses
     *          this header for a message integrity check to ensure that the encryption key was transmitted
     *          without error.</p>
     *          <note>
     *             <p>This functionality is not supported when the destination bucket is a directory bucket.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>Specifies the KMS key ID (Key ID, Key ARN, or Key Alias) to use for object encryption.
     *          All GET and PUT requests for an object protected by KMS will fail if they're not made via
     *          SSL or using SigV4. For information about configuring any of the officially supported Amazon Web Services
     *          SDKs and Amazon Web Services CLI, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingAWSSDK.html#specify-signature-version">Specifying the
     *             Signature Version in Request Authentication</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          To encrypt data using SSE-KMS, it's recommended to specify the
     * <code>x-amz-server-side-encryption</code> header to <code>aws:kms</code>. Then, the <code>x-amz-server-side-encryption-aws-kms-key-id</code> header implicitly uses
     * the bucket's default KMS customer managed key ID. If you want to explicitly set the <code>
     *          x-amz-server-side-encryption-aws-kms-key-id</code> header, it must match the bucket's default customer managed key (using key ID or ARN, not alias). Your SSE-KMS configuration can only support 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> per directory bucket's lifetime.
     * The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported.
     *
     *  Incorrect key specification results in an HTTP <code>400 Bad Request</code> error. </p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>Specifies the Amazon Web Services KMS Encryption Context as an additional encryption context to use
     *          for the destination object encryption. The value of this header is a base64-encoded UTF-8 string holding JSON with the encryption context key-value pairs.</p>
     *          <p>
     *             <b>General purpose buckets</b> - This value must be explicitly
     *          added to specify encryption context for <code>CopyObject</code> requests if you want an
     *          additional encryption context for your destination object. The additional encryption
     *          context of the source object won't be copied to the destination object. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html#encryption-context">Encryption
     *             context</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Directory buckets</b> - You can optionally provide an explicit encryption context value. The value must match the default encryption context - the bucket Amazon Resource Name (ARN). An additional encryption context value is not supported. </p>
     * @public
     */
    SSEKMSEncryptionContext?: string | undefined;
    /**
     * <p>Specifies whether Amazon S3 should use an S3 Bucket Key for object encryption with
     *          server-side encryption using Key Management Service (KMS) keys (SSE-KMS). If a target object uses
     *          SSE-KMS, you can enable an S3 Bucket Key for the object.</p>
     *          <p>Setting this header to <code>true</code> causes Amazon S3 to use an S3 Bucket Key for object
     *          encryption with SSE-KMS. Specifying this header with a COPY action doesn’t affect
     *          bucket-level settings for S3 Bucket Key.</p>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-key.html">Amazon S3 Bucket Keys</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> -
     *             S3 Bucket Keys aren't supported, when you copy SSE-KMS encrypted objects from general purpose buckets
     * to directory buckets, from directory buckets to general purpose buckets, or between directory buckets, through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>. In this case, Amazon S3 makes a call to KMS every time a copy request is made for a KMS-encrypted object.</p>
     *          </note>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>Specifies the algorithm to use when decrypting the source object (for example,
     *             <code>AES256</code>).</p>
     *          <p>If the source object for the copy is stored in Amazon S3 using SSE-C, you must provide the
     *          necessary encryption information in your request so that Amazon S3 can decrypt the object for
     *          copying.</p>
     *          <note>
     *             <p>This functionality is not supported when the source object is in a directory bucket.</p>
     *          </note>
     * @public
     */
    CopySourceSSECustomerAlgorithm?: string | undefined;
    /**
     * <p>Specifies the customer-provided encryption key for Amazon S3 to use to decrypt the source
     *          object. The encryption key provided in this header must be the same one that was used when
     *          the source object was created.</p>
     *          <p>If the source object for the copy is stored in Amazon S3 using SSE-C, you must provide the
     *          necessary encryption information in your request so that Amazon S3 can decrypt the object for
     *          copying.</p>
     *          <note>
     *             <p>This functionality is not supported when the source object is in a directory bucket.</p>
     *          </note>
     * @public
     */
    CopySourceSSECustomerKey?: string | undefined;
    /**
     * <p>Specifies the 128-bit MD5 digest of the encryption key according to RFC 1321. Amazon S3 uses
     *          this header for a message integrity check to ensure that the encryption key was transmitted
     *          without error.</p>
     *          <p>If the source object for the copy is stored in Amazon S3 using SSE-C, you must provide the
     *          necessary encryption information in your request so that Amazon S3 can decrypt the object for
     *          copying.</p>
     *          <note>
     *             <p>This functionality is not supported when the source object is in a directory bucket.</p>
     *          </note>
     * @public
     */
    CopySourceSSECustomerKeyMD5?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The tag-set for the object copy in the destination bucket. This value must be used in
     *          conjunction with the <code>x-amz-tagging-directive</code> if you choose
     *             <code>REPLACE</code> for the <code>x-amz-tagging-directive</code>. If you choose
     *             <code>COPY</code> for the <code>x-amz-tagging-directive</code>, you don't need to set
     *          the <code>x-amz-tagging</code> header, because the tag-set will be copied from the source
     *          object directly. The tag-set must be encoded as URL Query parameters.</p>
     *          <p>The default value is the empty value.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets in a <code>CopyObject</code> operation, only the empty tag-set is supported. Any requests that attempt to write non-empty tags into directory buckets will receive a <code>501 Not Implemented</code> status code.
     * When the destination bucket is a directory bucket, you will receive a <code>501 Not Implemented</code> response in any of the following situations:</p>
     *             <ul>
     *                <li>
     *                   <p>When you attempt to <code>COPY</code> the tag-set from an S3 source object that has non-empty tags.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a source object and set a non-empty value to <code>x-amz-tagging</code>.</p>
     *                </li>
     *                <li>
     *                   <p>When you don't set the <code>x-amz-tagging-directive</code> header and the source object has non-empty tags. This is because the default value of <code>x-amz-tagging-directive</code> is <code>COPY</code>.</p>
     *                </li>
     *             </ul>
     *             <p>Because only the empty tag-set is supported for directory buckets in a <code>CopyObject</code> operation, the following situations are allowed:</p>
     *             <ul>
     *                <li>
     *                   <p>When you attempt to <code>COPY</code> the tag-set from a directory bucket source object that has no tags to a general purpose bucket. It copies an empty tag-set to the destination object.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a directory bucket source object and set the <code>x-amz-tagging</code> value of the directory bucket destination object to empty.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a general purpose bucket source object that has non-empty tags and set the <code>x-amz-tagging</code> value of the directory bucket destination object to empty.</p>
     *                </li>
     *                <li>
     *                   <p>When you attempt to <code>REPLACE</code> the tag-set of a directory bucket source object and don't set the <code>x-amz-tagging</code> value of the directory bucket destination object. This is because the default value of <code>x-amz-tagging</code> is the empty value.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    Tagging?: string | undefined;
    /**
     * <p>The Object Lock mode that you want to apply to the object copy.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockMode?: ObjectLockMode | undefined;
    /**
     * <p>The date and time when you want the Object Lock of the object copy to expire.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockRetainUntilDate?: Date | undefined;
    /**
     * <p>Specifies whether you want to apply a legal hold to the object copy.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
    /**
     * <p>The account ID of the expected destination bucket owner. If the account ID that you provide does not match the actual owner of the destination bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>The account ID of the expected source bucket owner. If the account ID that you provide does not match the actual owner of the source bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedSourceBucketOwner?: string | undefined;
}
/**
 * <p>The source object of the COPY action is not in the active tier and is only stored in
 *          Amazon S3 Glacier.</p>
 * @public
 */
export declare class ObjectNotInActiveTierError extends __BaseException {
    readonly name: "ObjectNotInActiveTierError";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ObjectNotInActiveTierError, __BaseException>);
}
/**
 * <p>The requested bucket name is not available. The bucket namespace is shared by all users
 *          of the system. Select a different name and try again.</p>
 * @public
 */
export declare class BucketAlreadyExists extends __BaseException {
    readonly name: "BucketAlreadyExists";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<BucketAlreadyExists, __BaseException>);
}
/**
 * <p>The bucket you tried to create already exists, and you own it. Amazon S3 returns this error
 *          in all Amazon Web Services Regions except in the North Virginia Region. For legacy compatibility, if you
 *          re-create an existing bucket that you already own in the North Virginia Region, Amazon S3
 *          returns 200 OK and resets the bucket access control lists (ACLs).</p>
 * @public
 */
export declare class BucketAlreadyOwnedByYou extends __BaseException {
    readonly name: "BucketAlreadyOwnedByYou";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<BucketAlreadyOwnedByYou, __BaseException>);
}
/**
 * @public
 */
export interface CreateBucketOutput {
    /**
     * <p>A forward slash followed by the name of the bucket.</p>
     * @public
     */
    Location?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const BucketCannedACL: {
    readonly authenticated_read: "authenticated-read";
    readonly private: "private";
    readonly public_read: "public-read";
    readonly public_read_write: "public-read-write";
};
/**
 * @public
 */
export type BucketCannedACL = (typeof BucketCannedACL)[keyof typeof BucketCannedACL];
/**
 * @public
 * @enum
 */
export declare const DataRedundancy: {
    readonly SingleAvailabilityZone: "SingleAvailabilityZone";
    readonly SingleLocalZone: "SingleLocalZone";
};
/**
 * @public
 */
export type DataRedundancy = (typeof DataRedundancy)[keyof typeof DataRedundancy];
/**
 * @public
 * @enum
 */
export declare const BucketType: {
    readonly Directory: "Directory";
};
/**
 * @public
 */
export type BucketType = (typeof BucketType)[keyof typeof BucketType];
/**
 * <p>Specifies the information about the bucket that will be created. For more information
 *          about directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-overview.html">Directory buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>This functionality is only supported by directory buckets.</p>
 *          </note>
 * @public
 */
export interface BucketInfo {
    /**
     * <p>The number of Zone (Availability Zone or Local Zone) that's used for redundancy for the bucket.</p>
     * @public
     */
    DataRedundancy?: DataRedundancy | undefined;
    /**
     * <p>The type of bucket.</p>
     * @public
     */
    Type?: BucketType | undefined;
}
/**
 * @public
 * @enum
 */
export declare const LocationType: {
    readonly AvailabilityZone: "AvailabilityZone";
    readonly LocalZone: "LocalZone";
};
/**
 * @public
 */
export type LocationType = (typeof LocationType)[keyof typeof LocationType];
/**
 * <p>Specifies the location where the bucket will be created.</p>
 *          <p>For directory buckets, the location type is Availability Zone or Local Zone. For more information about directory buckets, see
 *          <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-overview.html">Working with directory buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>This functionality is only supported by directory buckets.</p>
 *          </note>
 * @public
 */
export interface LocationInfo {
    /**
     * <p>The type of location where the bucket will be created.</p>
     * @public
     */
    Type?: LocationType | undefined;
    /**
     * <p>The name of the location where the bucket will be created.</p>
     *          <p>For directory buckets, the name of the location is the Zone ID of the Availability Zone (AZ) or Local Zone (LZ) where the bucket will be created. An example AZ ID value is <code>usw2-az1</code>.</p>
     * @public
     */
    Name?: string | undefined;
}
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type BucketLocationConstraint = (typeof BucketLocationConstraint)[keyof typeof BucketLocationConstraint];
/**
 * <p>The configuration information for the bucket.</p>
 * @public
 */
export interface CreateBucketConfiguration {
    /**
     * <p>Specifies the Region where the bucket will be created. You might choose a Region to
     *          optimize latency, minimize costs, or address regulatory requirements. For example, if you
     *          reside in Europe, you will probably find it advantageous to create buckets in the Europe
     *          (Ireland) Region.</p>
     *          <p>If you don't specify a Region, the bucket is created in the US East (N. Virginia) Region
     *          (us-east-1) by default. Configurations using the value <code>EU</code> will create a bucket in <code>eu-west-1</code>.</p>
     *          <p>For a list of the valid values for all of the Amazon Web Services Regions, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and
     *             Endpoints</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    LocationConstraint?: BucketLocationConstraint | undefined;
    /**
     * <p>Specifies the location where the bucket will be created.</p>
     *          <p>
     *             <b>Directory buckets </b> - The location type is Availability Zone or Local Zone.
     *          To use the Local Zone location type, your account must be  enabled for Dedicated Local Zones. Otherwise, you get an HTTP <code>403 Forbidden</code> error with the
     *          error code <code>AccessDenied</code>. To learn more, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/opt-in-directory-bucket-lz.html">Enable accounts for Dedicated Local Zones</a> in the <i>Amazon S3 User Guide</i>.
     *       </p>
     *          <note>
     *             <p>This functionality is only supported by directory buckets.</p>
     *          </note>
     * @public
     */
    Location?: LocationInfo | undefined;
    /**
     * <p>Specifies the information about the bucket that will be created.</p>
     *          <note>
     *             <p>This functionality is only supported by directory buckets.</p>
     *          </note>
     * @public
     */
    Bucket?: BucketInfo | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ObjectOwnership: {
    readonly BucketOwnerEnforced: "BucketOwnerEnforced";
    readonly BucketOwnerPreferred: "BucketOwnerPreferred";
    readonly ObjectWriter: "ObjectWriter";
};
/**
 * @public
 */
export type ObjectOwnership = (typeof ObjectOwnership)[keyof typeof ObjectOwnership];
/**
 * @public
 */
export interface CreateBucketRequest {
    /**
     * <p>The canned ACL to apply to the bucket.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ACL?: BucketCannedACL | undefined;
    /**
     * <p>The name of the bucket to create.</p>
     *          <p>
     *             <b>General purpose buckets</b> - For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html">Bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Directory buckets </b> - When you use this operation with a directory bucket, you must use path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
     *             </code>. Virtual-hosted-style requests aren't supported. Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must also follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>DOC-EXAMPLE-BUCKET</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming rules</a> in the <i>Amazon S3 User Guide</i>
     *          </p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The configuration information for the bucket.</p>
     * @public
     */
    CreateBucketConfiguration?: CreateBucketConfiguration | undefined;
    /**
     * <p>Allows grantee the read, write, read ACP, and write ACP permissions on the
     *          bucket.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    GrantFullControl?: string | undefined;
    /**
     * <p>Allows grantee to list the objects in the bucket.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    GrantRead?: string | undefined;
    /**
     * <p>Allows grantee to read the bucket ACL.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    GrantReadACP?: string | undefined;
    /**
     * <p>Allows grantee to create new objects in the bucket.</p>
     *          <p>For the bucket and object owners of existing objects, also allows deletions and
     *          overwrites of those objects.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    GrantWrite?: string | undefined;
    /**
     * <p>Allows grantee to write the ACL for the applicable bucket.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    GrantWriteACP?: string | undefined;
    /**
     * <p>Specifies whether you want S3 Object Lock to be enabled for the new bucket.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockEnabledForBucket?: boolean | undefined;
    /**
     * <p>The container element for object ownership for a bucket's ownership controls.</p>
     *          <p>
     *             <code>BucketOwnerPreferred</code> - Objects uploaded to the bucket change ownership to
     *          the bucket owner if the objects are uploaded with the
     *             <code>bucket-owner-full-control</code> canned ACL.</p>
     *          <p>
     *             <code>ObjectWriter</code> - The uploading account will own the object if the object is
     *          uploaded with the <code>bucket-owner-full-control</code> canned ACL.</p>
     *          <p>
     *             <code>BucketOwnerEnforced</code> - Access control lists (ACLs) are disabled and no
     *          longer affect permissions. The bucket owner automatically owns and has full control over
     *          every object in the bucket. The bucket only accepts PUT requests that don't specify an ACL
     *          or specify bucket owner full control ACLs (such as the predefined
     *             <code>bucket-owner-full-control</code> canned ACL or a custom ACL in XML format that
     *          grants the same permissions).</p>
     *          <p>By default, <code>ObjectOwnership</code> is set to <code>BucketOwnerEnforced</code> and
     *          ACLs are disabled. We recommend keeping ACLs disabled, except in uncommon use cases where
     *          you must control access for each object individually. For more information about S3 Object
     *          Ownership, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html">Controlling ownership of
     *             objects and disabling ACLs for your bucket</a> in the
     *             <i>Amazon S3 User Guide</i>. </p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets. Directory buckets use the bucket owner enforced setting for S3 Object Ownership.</p>
     *          </note>
     * @public
     */
    ObjectOwnership?: ObjectOwnership | undefined;
}
/**
 * <p>
 *          The destination information for the metadata table configuration. The destination table bucket
 *          must be in the same Region and Amazon Web Services account as the general purpose bucket. The specified metadata
 *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
 *          table bucket.
 *       </p>
 * @public
 */
export interface S3TablesDestination {
    /**
     * <p>
     *          The Amazon Resource Name (ARN) for the table bucket that's specified as the
     *          destination in the metadata table configuration. The destination table bucket
     *          must be in the same Region and Amazon Web Services account as the general purpose bucket.
     *       </p>
     * @public
     */
    TableBucketArn: string | undefined;
    /**
     * <p>
     *          The name for the metadata table in your metadata table configuration. The specified metadata
     *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
     *          table bucket.
     *       </p>
     * @public
     */
    TableName: string | undefined;
}
/**
 * <p>
 *          The metadata table configuration for a general purpose bucket.
 *       </p>
 * @public
 */
export interface MetadataTableConfiguration {
    /**
     * <p>
     *          The destination information for the metadata table configuration. The destination table bucket
     *          must be in the same Region and Amazon Web Services account as the general purpose bucket. The specified metadata
     *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
     *          table bucket.
     *       </p>
     * @public
     */
    S3TablesDestination: S3TablesDestination | undefined;
}
/**
 * @public
 */
export interface CreateBucketMetadataTableConfigurationRequest {
    /**
     * <p>
     *          The general purpose bucket that you want to create the metadata table configuration in.
     *       </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>
     *          The <code>Content-MD5</code> header for the metadata table configuration.
     *       </p>
     * @public
     */
    ContentMD5?: string | undefined;
    /**
     * <p>
     *          The checksum algorithm to use with your metadata table configuration.
     *       </p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p>
     *          The contents of your metadata table configuration.
     *       </p>
     * @public
     */
    MetadataTableConfiguration: MetadataTableConfiguration | undefined;
    /**
     * <p>
     *          The expected owner of the general purpose bucket that contains your metadata table configuration.
     *       </p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface CreateMultipartUploadOutput {
    /**
     * <p>If the bucket has a lifecycle rule configured with an action to abort incomplete
     *          multipart uploads and the prefix in the lifecycle rule matches the object name in the
     *          request, the response includes this header. The header indicates when the initiated
     *          multipart upload becomes eligible for an abort operation. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html#mpu-abort-incomplete-mpu-lifecycle-config">
     *             Aborting Incomplete Multipart Uploads Using a Bucket Lifecycle Configuration</a> in
     *          the <i>Amazon S3 User Guide</i>.</p>
     *          <p>The response also includes the <code>x-amz-abort-rule-id</code> header that provides the
     *          ID of the lifecycle configuration rule that defines the abort action.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    AbortDate?: Date | undefined;
    /**
     * <p>This header is returned along with the <code>x-amz-abort-date</code> header. It
     *          identifies the applicable lifecycle configuration rule that defines the action to abort
     *          incomplete multipart uploads.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    AbortRuleId?: string | undefined;
    /**
     * <p>The name of the bucket to which the multipart upload was initiated. Does not return the
     *          access point ARN or access point alias if used.</p>
     *          <note>
     *             <p>Access points are not supported by directory buckets.</p>
     *          </note>
     * @public
     */
    Bucket?: string | undefined;
    /**
     * <p>Object key for which the multipart upload was initiated.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>ID for the initiated multipart upload.</p>
     * @public
     */
    UploadId?: string | undefined;
    /**
     * <p>The server-side encryption algorithm used when you store this object in Amazon S3 (for
     *          example, <code>AES256</code>, <code>aws:kms</code>).</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to confirm the encryption algorithm that's used.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to provide the round-trip message integrity verification
     *          of the customer-provided encryption key.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>If present, indicates the ID of the KMS key that was used for object encryption.</p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>If present, indicates the Amazon Web Services KMS Encryption Context to use for object encryption. The value of
     *          this header is a Base64 encoded string of a UTF-8 encoded JSON, which contains the encryption context as key-value pairs.</p>
     * @public
     */
    SSEKMSEncryptionContext?: string | undefined;
    /**
     * <p>Indicates whether the multipart upload uses an S3 Bucket Key for server-side encryption
     *          with Key Management Service (KMS) keys (SSE-KMS).</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
    /**
     * <p>The algorithm that was used to create a checksum of the object.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p> Indicates the checksum type that you want Amazon S3 to use to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
}
/**
 * @public
 */
export interface CreateMultipartUploadRequest {
    /**
     * <p>The canned ACL to apply to the object. Amazon S3 supports a set of predefined ACLs, known as
     *             <i>canned ACLs</i>. Each canned ACL has a predefined set of grantees and
     *          permissions. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#CannedACL">Canned ACL</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <p>By default, all objects are private. Only the owner has full access control. When
     *          uploading an object, you can grant access permissions to individual Amazon Web Services accounts or to
     *          predefined groups defined by Amazon S3. These permissions are then added to the access control
     *          list (ACL) on the new object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/S3_ACLs_UsingACLs.html">Using ACLs</a>. One way to grant
     *          the permissions using the request headers is to specify a canned ACL with the
     *             <code>x-amz-acl</code> request header.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    ACL?: ObjectCannedACL | undefined;
    /**
     * <p>The name of the bucket where the multipart upload is initiated and where the object is
     *          uploaded.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Specifies caching behavior along the request/reply chain.</p>
     * @public
     */
    CacheControl?: string | undefined;
    /**
     * <p>Specifies presentational information for the object.</p>
     * @public
     */
    ContentDisposition?: string | undefined;
    /**
     * <p>Specifies what content encodings have been applied to the object and thus what decoding
     *          mechanisms must be applied to obtain the media-type referenced by the Content-Type header
     *          field.</p>
     *          <note>
     *             <p>For directory buckets, only the <code>aws-chunked</code> value is supported in this header field.</p>
     *          </note>
     * @public
     */
    ContentEncoding?: string | undefined;
    /**
     * <p>The language that the content is in.</p>
     * @public
     */
    ContentLanguage?: string | undefined;
    /**
     * <p>A standard MIME type describing the format of the object data.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>The date and time at which the object is no longer cacheable.</p>
     * @public
     */
    Expires?: Date | undefined;
    /**
     * <p>Specify access permissions explicitly to give the grantee READ, READ_ACP, and WRITE_ACP
     *          permissions on the object.</p>
     *          <p>By default, all objects are private. Only the owner has full access control. When
     *          uploading an object, you can use this header to explicitly grant access permissions to
     *          specific Amazon Web Services accounts or groups. This header maps to specific permissions that Amazon S3
     *          supports in an ACL. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html">Access Control List (ACL) Overview</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>You specify each grantee as a type=value pair, where the type is one of the
     *          following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>id</code> – if the value specified is the canonical user ID of an
     *                Amazon Web Services account</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>uri</code> – if you are granting permissions to a predefined group</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>emailAddress</code> – if the value specified is the email address of an
     *                Amazon Web Services account</p>
     *                <note>
     *                   <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
     *                   <ul>
     *                      <li>
     *                         <p>US East (N. Virginia)</p>
     *                      </li>
     *                      <li>
     *                         <p>US West (N. California)</p>
     *                      </li>
     *                      <li>
     *                         <p> US West (Oregon)</p>
     *                      </li>
     *                      <li>
     *                         <p> Asia Pacific (Singapore)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Sydney)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Tokyo)</p>
     *                      </li>
     *                      <li>
     *                         <p>Europe (Ireland)</p>
     *                      </li>
     *                      <li>
     *                         <p>South America (São Paulo)</p>
     *                      </li>
     *                   </ul>
     *                   <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
     *                </note>
     *             </li>
     *          </ul>
     *          <p>For example, the following <code>x-amz-grant-read</code> header grants the Amazon Web Services accounts identified by account IDs permissions to read object data and its metadata:</p>
     *          <p>
     *             <code>x-amz-grant-read: id="11112222333", id="444455556666" </code>
     *          </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantFullControl?: string | undefined;
    /**
     * <p>Specify access permissions explicitly to allow grantee to read the object data and its
     *          metadata.</p>
     *          <p>By default, all objects are private. Only the owner has full access control. When
     *          uploading an object, you can use this header to explicitly grant access permissions to
     *          specific Amazon Web Services accounts or groups. This header maps to specific permissions that Amazon S3
     *          supports in an ACL. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html">Access Control List (ACL) Overview</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>You specify each grantee as a type=value pair, where the type is one of the
     *          following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>id</code> – if the value specified is the canonical user ID of an
     *                Amazon Web Services account</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>uri</code> – if you are granting permissions to a predefined group</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>emailAddress</code> – if the value specified is the email address of an
     *                Amazon Web Services account</p>
     *                <note>
     *                   <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
     *                   <ul>
     *                      <li>
     *                         <p>US East (N. Virginia)</p>
     *                      </li>
     *                      <li>
     *                         <p>US West (N. California)</p>
     *                      </li>
     *                      <li>
     *                         <p> US West (Oregon)</p>
     *                      </li>
     *                      <li>
     *                         <p> Asia Pacific (Singapore)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Sydney)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Tokyo)</p>
     *                      </li>
     *                      <li>
     *                         <p>Europe (Ireland)</p>
     *                      </li>
     *                      <li>
     *                         <p>South America (São Paulo)</p>
     *                      </li>
     *                   </ul>
     *                   <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
     *                </note>
     *             </li>
     *          </ul>
     *          <p>For example, the following <code>x-amz-grant-read</code> header grants the Amazon Web Services accounts identified by account IDs permissions to read object data and its metadata:</p>
     *          <p>
     *             <code>x-amz-grant-read: id="11112222333", id="444455556666" </code>
     *          </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantRead?: string | undefined;
    /**
     * <p>Specify access permissions explicitly to allows grantee to read the object ACL.</p>
     *          <p>By default, all objects are private. Only the owner has full access control. When
     *          uploading an object, you can use this header to explicitly grant access permissions to
     *          specific Amazon Web Services accounts or groups. This header maps to specific permissions that Amazon S3
     *          supports in an ACL. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html">Access Control List (ACL) Overview</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>You specify each grantee as a type=value pair, where the type is one of the
     *          following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>id</code> – if the value specified is the canonical user ID of an
     *                Amazon Web Services account</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>uri</code> – if you are granting permissions to a predefined group</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>emailAddress</code> – if the value specified is the email address of an
     *                Amazon Web Services account</p>
     *                <note>
     *                   <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
     *                   <ul>
     *                      <li>
     *                         <p>US East (N. Virginia)</p>
     *                      </li>
     *                      <li>
     *                         <p>US West (N. California)</p>
     *                      </li>
     *                      <li>
     *                         <p> US West (Oregon)</p>
     *                      </li>
     *                      <li>
     *                         <p> Asia Pacific (Singapore)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Sydney)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Tokyo)</p>
     *                      </li>
     *                      <li>
     *                         <p>Europe (Ireland)</p>
     *                      </li>
     *                      <li>
     *                         <p>South America (São Paulo)</p>
     *                      </li>
     *                   </ul>
     *                   <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
     *                </note>
     *             </li>
     *          </ul>
     *          <p>For example, the following <code>x-amz-grant-read</code> header grants the Amazon Web Services accounts identified by account IDs permissions to read object data and its metadata:</p>
     *          <p>
     *             <code>x-amz-grant-read: id="11112222333", id="444455556666" </code>
     *          </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantReadACP?: string | undefined;
    /**
     * <p>Specify access permissions explicitly to allows grantee to allow grantee to write the
     *          ACL for the applicable object.</p>
     *          <p>By default, all objects are private. Only the owner has full access control. When
     *          uploading an object, you can use this header to explicitly grant access permissions to
     *          specific Amazon Web Services accounts or groups. This header maps to specific permissions that Amazon S3
     *          supports in an ACL. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html">Access Control List (ACL) Overview</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>You specify each grantee as a type=value pair, where the type is one of the
     *          following:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>id</code> – if the value specified is the canonical user ID of an
     *                Amazon Web Services account</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>uri</code> – if you are granting permissions to a predefined group</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>emailAddress</code> – if the value specified is the email address of an
     *                Amazon Web Services account</p>
     *                <note>
     *                   <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
     *                   <ul>
     *                      <li>
     *                         <p>US East (N. Virginia)</p>
     *                      </li>
     *                      <li>
     *                         <p>US West (N. California)</p>
     *                      </li>
     *                      <li>
     *                         <p> US West (Oregon)</p>
     *                      </li>
     *                      <li>
     *                         <p> Asia Pacific (Singapore)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Sydney)</p>
     *                      </li>
     *                      <li>
     *                         <p>Asia Pacific (Tokyo)</p>
     *                      </li>
     *                      <li>
     *                         <p>Europe (Ireland)</p>
     *                      </li>
     *                      <li>
     *                         <p>South America (São Paulo)</p>
     *                      </li>
     *                   </ul>
     *                   <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
     *                </note>
     *             </li>
     *          </ul>
     *          <p>For example, the following <code>x-amz-grant-read</code> header grants the Amazon Web Services accounts identified by account IDs permissions to read object data and its metadata:</p>
     *          <p>
     *             <code>x-amz-grant-read: id="11112222333", id="444455556666" </code>
     *          </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>This functionality is not supported for directory buckets.</p>
     *                </li>
     *                <li>
     *                   <p>This functionality is not supported for Amazon S3 on Outposts.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    GrantWriteACP?: string | undefined;
    /**
     * <p>Object key for which the multipart upload is to be initiated.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>A map of metadata to store with the object in S3.</p>
     * @public
     */
    Metadata?: Record<string, string> | undefined;
    /**
     * <p>The server-side encryption algorithm used when you store this object in Amazon S3 (for
     *          example, <code>AES256</code>, <code>aws:kms</code>).</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <b>Directory buckets </b> -
     *                For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>). We recommend that the bucket's default encryption uses the desired encryption configuration and you don't override the bucket default encryption in your
     *             <code>CreateSession</code> requests or <code>PUT</code> object requests. Then, new objects
     *  are automatically encrypted with the desired encryption settings. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>. For more information about the encryption overriding behaviors in directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-specifying-kms-encryption.html">Specifying server-side encryption with KMS for new object uploads</a>. </p>
     *                <p>In the Zonal endpoint API calls (except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>) using the REST API, the encryption request headers must match the encryption settings that are specified in the <code>CreateSession</code> request.
     *                             You can't override the values of the encryption settings (<code>x-amz-server-side-encryption</code>, <code>x-amz-server-side-encryption-aws-kms-key-id</code>, <code>x-amz-server-side-encryption-context</code>, and <code>x-amz-server-side-encryption-bucket-key-enabled</code>) that are specified in the <code>CreateSession</code> request.
     *                             You don't need to explicitly specify these encryption settings values in Zonal endpoint API calls, and
     *                             Amazon S3 will use the encryption settings values from the <code>CreateSession</code> request to protect new objects in the directory bucket.
     *                            </p>
     *                <note>
     *                   <p>When you use the CLI or the Amazon Web Services SDKs, for <code>CreateSession</code>, the session token refreshes automatically to avoid service interruptions when a session expires. The CLI or the Amazon Web Services SDKs use the bucket's default encryption configuration for the
     *                             <code>CreateSession</code> request. It's not supported to override the encryption settings values in the <code>CreateSession</code> request.
     *                             So in the Zonal endpoint API calls (except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>),
     *           the encryption request headers must match the default encryption configuration of the directory bucket.
     *
     * </p>
     *                </note>
     *             </li>
     *          </ul>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>By default, Amazon S3 uses the STANDARD Storage Class to store newly created objects. The
     *          STANDARD storage class provides high durability and high availability. Depending on
     *          performance needs, you can specify a different Storage Class. For more information, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html">Storage
     *             Classes</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *                </li>
     *                <li>
     *                   <p>Amazon S3 on Outposts only uses the OUTPOSTS Storage Class.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>If the bucket is configured as a website, redirects requests for this object to another
     *          object in the same bucket or to an external URL. Amazon S3 stores the value of this header in
     *          the object metadata.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    WebsiteRedirectLocation?: string | undefined;
    /**
     * <p>Specifies the algorithm to use when encrypting the object (for example, AES256).</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>Specifies the customer-provided encryption key for Amazon S3 to use in encrypting data. This
     *          value is used to store the object and then it is discarded; Amazon S3 does not store the
     *          encryption key. The key must be appropriate for use with the algorithm specified in the
     *             <code>x-amz-server-side-encryption-customer-algorithm</code> header.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>Specifies the 128-bit MD5 digest of the customer-provided encryption key according to
     *          RFC 1321. Amazon S3 uses this header for a message integrity check to ensure that the encryption
     *          key was transmitted without error.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>Specifies the KMS key ID (Key ID, Key ARN, or Key Alias) to use for object encryption. If the KMS key doesn't exist in the same
     *          account that's issuing the command, you must use the full Key ARN not the Key ID.</p>
     *          <p>
     *             <b>General purpose buckets</b> - If you specify <code>x-amz-server-side-encryption</code> with <code>aws:kms</code> or <code>aws:kms:dsse</code>, this header specifies the ID (Key ID, Key ARN, or Key Alias) of the KMS
     *          key to use. If you specify
     *          <code>x-amz-server-side-encryption:aws:kms</code> or
     *          <code>x-amz-server-side-encryption:aws:kms:dsse</code>, but do not provide <code>x-amz-server-side-encryption-aws-kms-key-id</code>, Amazon S3 uses the Amazon Web Services managed key
     *          (<code>aws/s3</code>) to protect the data.</p>
     *          <p>
     *             <b>Directory buckets</b> - To encrypt data using SSE-KMS, it's recommended to specify the
     * <code>x-amz-server-side-encryption</code> header to <code>aws:kms</code>. Then, the <code>x-amz-server-side-encryption-aws-kms-key-id</code> header implicitly uses
     * the bucket's default KMS customer managed key ID. If you want to explicitly set the <code>
     *          x-amz-server-side-encryption-aws-kms-key-id</code> header, it must match the bucket's default customer managed key (using key ID or ARN, not alias). Your SSE-KMS configuration can only support 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> per directory bucket's lifetime.
     * The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported.
     *
     *  Incorrect key specification results in an HTTP <code>400 Bad Request</code> error. </p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>Specifies the Amazon Web Services KMS Encryption Context to use for object encryption. The value of
     *          this header is a Base64 encoded string of a UTF-8 encoded JSON, which contains the encryption context as key-value pairs.</p>
     *          <p>
     *             <b>Directory buckets</b> - You can optionally provide an explicit encryption context value. The value must match the default encryption context - the bucket Amazon Resource Name (ARN). An additional encryption context value is not supported. </p>
     * @public
     */
    SSEKMSEncryptionContext?: string | undefined;
    /**
     * <p>Specifies whether Amazon S3 should use an S3 Bucket Key for object encryption with
     *          server-side encryption using Key Management Service (KMS) keys (SSE-KMS).</p>
     *          <p>
     *             <b>General purpose buckets</b> - Setting this header to
     *             <code>true</code> causes Amazon S3 to use an S3 Bucket Key for object encryption with
     *          SSE-KMS. Also, specifying this header with a PUT action doesn't affect bucket-level settings for S3
     *          Bucket Key.</p>
     *          <p>
     *             <b>Directory buckets</b> - S3 Bucket Keys are always enabled for <code>GET</code> and <code>PUT</code> operations in a directory bucket and can’t be disabled. S3 Bucket Keys aren't supported, when you copy SSE-KMS encrypted objects from general purpose buckets
     * to directory buckets, from directory buckets to general purpose buckets, or between directory buckets, through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-objects-Batch-Ops">the Copy operation in Batch Operations</a>, or
     *                             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-import-job">the import jobs</a>. In this case, Amazon S3 makes a call to KMS every time a copy request is made for a KMS-encrypted object.</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The tag-set for the object. The tag-set must be encoded as URL Query parameters.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    Tagging?: string | undefined;
    /**
     * <p>Specifies the Object Lock mode that you want to apply to the uploaded object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockMode?: ObjectLockMode | undefined;
    /**
     * <p>Specifies the date and time when you want the Object Lock to expire.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockRetainUntilDate?: Date | undefined;
    /**
     * <p>Specifies whether you want to apply a legal hold to the uploaded object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Indicates the algorithm that you want Amazon S3 to use to create the checksum for the object. For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in
     *     the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p>Indicates the checksum type that you want Amazon S3 to use to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
}
/**
 * <p>The established temporary security credentials of the session.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> - These session
 *             credentials are only supported for the authentication and authorization of Zonal endpoint API operations
 *             on directory buckets.</p>
 *          </note>
 * @public
 */
export interface SessionCredentials {
    /**
     * <p>A unique identifier that's associated with a secret access key. The access key ID and
     *          the secret access key are used together to sign programmatic Amazon Web Services requests
     *          cryptographically. </p>
     * @public
     */
    AccessKeyId: string | undefined;
    /**
     * <p>A key that's used with the access key ID to cryptographically sign programmatic Amazon Web Services
     *          requests. Signing a request identifies the sender and prevents the request from being
     *          altered. </p>
     * @public
     */
    SecretAccessKey: string | undefined;
    /**
     * <p>A part of the temporary security credentials. The session token is used to validate the
     *          temporary security credentials.
     *
     *       </p>
     * @public
     */
    SessionToken: string | undefined;
    /**
     * <p>Temporary security credentials expire after a specified interval. After temporary
     *          credentials expire, any calls that you make with those credentials will fail. So you must
     *          generate a new set of temporary credentials. Temporary credentials cannot be extended or
     *          refreshed beyond the original specified interval.</p>
     * @public
     */
    Expiration: Date | undefined;
}
/**
 * @public
 */
export interface CreateSessionOutput {
    /**
     * <p>The server-side encryption algorithm used when you store objects in the directory bucket.</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>If you specify <code>x-amz-server-side-encryption</code> with <code>aws:kms</code>, this header indicates the ID of the KMS
     *          symmetric encryption customer managed key that was used for object encryption.</p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>If present, indicates the Amazon Web Services KMS Encryption Context to use for object encryption. The value of
     *          this header is a Base64 encoded string of a UTF-8 encoded JSON, which contains the encryption context as key-value pairs.
     *          This value is stored as object metadata and automatically gets
     *          passed on to Amazon Web Services KMS for future <code>GetObject</code>
     *          operations on this object.</p>
     * @public
     */
    SSEKMSEncryptionContext?: string | undefined;
    /**
     * <p>Indicates whether to use an S3 Bucket Key for server-side encryption
     *          with KMS keys (SSE-KMS).</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>The established temporary security credentials for the created session.</p>
     * @public
     */
    Credentials: SessionCredentials | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SessionMode: {
    readonly ReadOnly: "ReadOnly";
    readonly ReadWrite: "ReadWrite";
};
/**
 * @public
 */
export type SessionMode = (typeof SessionMode)[keyof typeof SessionMode];
/**
 * @public
 */
export interface CreateSessionRequest {
    /**
     * <p>Specifies the mode of the session that will be created, either <code>ReadWrite</code> or
     *             <code>ReadOnly</code>. By default, a <code>ReadWrite</code> session is created. A
     *             <code>ReadWrite</code> session is capable of executing all the Zonal endpoint API operations on a
     *          directory bucket. A <code>ReadOnly</code> session is constrained to execute the following
     *          Zonal endpoint API operations: <code>GetObject</code>, <code>HeadObject</code>, <code>ListObjectsV2</code>,
     *             <code>GetObjectAttributes</code>, <code>ListParts</code>, and
     *             <code>ListMultipartUploads</code>.</p>
     * @public
     */
    SessionMode?: SessionMode | undefined;
    /**
     * <p>The name of the bucket that you create a session for.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The server-side encryption algorithm to use when you store objects in the directory bucket.</p>
     *          <p>For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>). By default, Amazon S3 encrypts data with SSE-S3.
     *          For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>If you specify <code>x-amz-server-side-encryption</code> with <code>aws:kms</code>, you must specify the <code>
     *          x-amz-server-side-encryption-aws-kms-key-id</code> header with the ID (Key ID or Key ARN) of the KMS
     *          symmetric encryption customer managed key to use. Otherwise, you get an HTTP <code>400 Bad Request</code> error. Only use the key ID or key ARN. The key alias format of the KMS key isn't supported. Also, if the KMS key doesn't exist in the same
     *          account that't issuing the command, you must use the full Key ARN not the Key ID. </p>
     *          <p>Your SSE-KMS configuration can only support 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> per directory bucket's lifetime.
     * The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported.
     * </p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>Specifies the Amazon Web Services KMS Encryption Context as an additional encryption context to use for object encryption. The value of
     *          this header is a Base64 encoded string of a UTF-8 encoded JSON, which contains the encryption context as key-value pairs.
     *          This value is stored as object metadata and automatically gets passed on
     *          to Amazon Web Services KMS for future <code>GetObject</code> operations on
     *          this object.</p>
     *          <p>
     *             <b>General purpose buckets</b> - This value must be explicitly added during <code>CopyObject</code> operations if you want an additional encryption context for your object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html#encryption-context">Encryption context</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Directory buckets</b> - You can optionally provide an explicit encryption context value. The value must match the default encryption context - the bucket Amazon Resource Name (ARN). An additional encryption context value is not supported. </p>
     * @public
     */
    SSEKMSEncryptionContext?: string | undefined;
    /**
     * <p>Specifies whether Amazon S3 should use an S3 Bucket Key for object encryption with
     *          server-side encryption using KMS keys (SSE-KMS).</p>
     *          <p>S3 Bucket Keys are always enabled for <code>GET</code> and <code>PUT</code> operations in a directory bucket and can’t be disabled. S3 Bucket Keys aren't supported, when you copy SSE-KMS encrypted objects from general purpose buckets
     * to directory buckets, from directory buckets to general purpose buckets, or between directory buckets, through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-objects-Batch-Ops">the Copy operation in Batch Operations</a>, or
     *                             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-import-job">the import jobs</a>. In this case, Amazon S3 makes a call to KMS every time a copy request is made for a KMS-encrypted object.</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
}
/**
 * <p>The specified bucket does not exist.</p>
 * @public
 */
export declare class NoSuchBucket extends __BaseException {
    readonly name: "NoSuchBucket";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NoSuchBucket, __BaseException>);
}
/**
 * @public
 */
export interface DeleteBucketRequest {
    /**
     * <p>Specifies the bucket being deleted.</p>
     *          <p>
     *             <b>Directory buckets </b> - When you use this operation with a directory bucket, you must use path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
     *             </code>. Virtual-hosted-style requests aren't supported. Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must also follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>DOC-EXAMPLE-BUCKET</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming rules</a> in the <i>Amazon S3 User Guide</i>
     *          </p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>For directory buckets, this header is not supported in this API operation. If you specify this header, the request fails with the HTTP status code
     * <code>501 Not Implemented</code>.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketAnalyticsConfigurationRequest {
    /**
     * <p>The name of the bucket from which an analytics configuration is deleted.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID that identifies the analytics configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketCorsRequest {
    /**
     * <p>Specifies the bucket whose <code>cors</code> configuration is being deleted.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketEncryptionRequest {
    /**
     * <p>The name of the bucket containing the server-side encryption configuration to
     *          delete.</p>
     *          <p>
     *             <b>Directory buckets </b> - When you use this operation with a directory bucket, you must use path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
     *             </code>. Virtual-hosted-style requests aren't supported. Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must also follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>DOC-EXAMPLE-BUCKET</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming rules</a> in the <i>Amazon S3 User Guide</i>
     *          </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>For directory buckets, this header is not supported in this API operation. If you specify this header, the request fails with the HTTP status code
     * <code>501 Not Implemented</code>.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketIntelligentTieringConfigurationRequest {
    /**
     * <p>The name of the Amazon S3 bucket whose configuration you want to modify or retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID used to identify the S3 Intelligent-Tiering configuration.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketInventoryConfigurationRequest {
    /**
     * <p>The name of the bucket containing the inventory configuration to delete.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID used to identify the inventory configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketLifecycleRequest {
    /**
     * <p>The bucket name of the lifecycle to delete.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketMetadataTableConfigurationRequest {
    /**
     * <p>
     *          The general purpose bucket that you want to remove the metadata table configuration from.
     *       </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>
     *          The expected bucket owner of the general purpose bucket that you want to remove the
     *          metadata table configuration from.
     *       </p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketMetricsConfigurationRequest {
    /**
     * <p>The name of the bucket containing the metrics configuration to delete.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID used to identify the metrics configuration. The ID has a 64 character limit and
     *          can only contain letters, numbers, periods, dashes, and underscores.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketOwnershipControlsRequest {
    /**
     * <p>The Amazon S3 bucket whose <code>OwnershipControls</code> you want to delete. </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketPolicyRequest {
    /**
     * <p>The bucket name.</p>
     *          <p>
     *             <b>Directory buckets </b> - When you use this operation with a directory bucket, you must use path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
     *             </code>. Virtual-hosted-style requests aren't supported. Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must also follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>DOC-EXAMPLE-BUCKET</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming rules</a> in the <i>Amazon S3 User Guide</i>
     *          </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>For directory buckets, this header is not supported in this API operation. If you specify this header, the request fails with the HTTP status code
     * <code>501 Not Implemented</code>.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketReplicationRequest {
    /**
     * <p> The bucket name. </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketTaggingRequest {
    /**
     * <p>The bucket that has the tag set to be removed.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteBucketWebsiteRequest {
    /**
     * <p>The bucket name for which you want to remove the website configuration. </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeleteObjectOutput {
    /**
     * <p>Indicates whether the specified object version that was permanently deleted was (true)
     *          or was not (false) a delete marker before deletion. In a simple DELETE, this header
     *          indicates whether (true) or not (false) the current version of the object is a delete
     *          marker. To learn more about delete markers, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html">Working with delete markers</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DeleteMarker?: boolean | undefined;
    /**
     * <p>Returns the version ID of the delete marker created as a result of the DELETE
     *          operation.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface DeleteObjectRequest {
    /**
     * <p>The bucket name of the bucket containing the object. </p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Key name of the object to delete.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The concatenation of the authentication device's serial number, a space, and the value
     *          that is displayed on your authentication device. Required to permanently delete a versioned
     *          object if versioning is configured with MFA delete enabled.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    MFA?: string | undefined;
    /**
     * <p>Version ID used to reference a specific version of the object.</p>
     *          <note>
     *             <p>For directory buckets in this API operation, only the <code>null</code> value of the version ID is supported.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>Indicates whether S3 Object Lock should bypass Governance-mode restrictions to process
     *          this operation. To use this header, you must have the
     *             <code>s3:BypassGovernanceRetention</code> permission.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    BypassGovernanceRetention?: boolean | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>The <code>If-Match</code> header field makes the request method conditional on ETags. If the ETag value does not match, the operation returns
     *          a <code>412 Precondition Failed</code> error. If the ETag matches or if the object doesn't exist, the operation will return a <code>204 Success (No
     *          Content) response</code>.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     *          <note>
     *             <p>This functionality is only supported for directory buckets.</p>
     *          </note>
     * @public
     */
    IfMatch?: string | undefined;
    /**
     * <p>If present, the object is deleted only if its modification times matches the provided
     *             <code>Timestamp</code>. If the <code>Timestamp</code> values do not match, the operation
     *          returns a <code>412 Precondition Failed</code> error. If the <code>Timestamp</code> matches
     *          or if the object doesn’t exist, the operation returns a <code>204 Success (No
     *             Content)</code> response.</p>
     *          <note>
     *             <p>This functionality is only supported for directory buckets.</p>
     *          </note>
     * @public
     */
    IfMatchLastModifiedTime?: Date | undefined;
    /**
     * <p>If present, the object is deleted only if its size matches the provided size in bytes. If the <code>Size</code> value does not match, the operation returns a <code>412 Precondition Failed</code> error. If the <code>Size</code> matches or if the object doesn’t exist,
     *          the operation returns a <code>204 Success (No Content)</code> response.</p>
     *          <note>
     *             <p>This functionality is only supported for directory buckets.</p>
     *          </note>
     *          <important>
     *             <p>You can use the <code>If-Match</code>, <code>x-amz-if-match-last-modified-time</code> and <code>x-amz-if-match-size</code>
     *          conditional headers in conjunction with each-other or individually.</p>
     *          </important>
     * @public
     */
    IfMatchSize?: number | undefined;
}
/**
 * <p>Information about the deleted object.</p>
 * @public
 */
export interface DeletedObject {
    /**
     * <p>The name of the deleted object.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>The version ID of the deleted object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Indicates whether the specified object version that was permanently deleted was (true)
     *          or was not (false) a delete marker before deletion. In a simple DELETE, this header
     *          indicates whether (true) or not (false) the current version of the object is a delete
     *          marker. To learn more about delete markers, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html">Working with delete markers</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DeleteMarker?: boolean | undefined;
    /**
     * <p>The version ID of the delete marker created as a result of the DELETE operation. If you
     *          delete a specific object version, the value returned by this header is the version ID of
     *          the object version deleted.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DeleteMarkerVersionId?: string | undefined;
}
/**
 * <p>Container for all error elements.</p>
 * @public
 */
export interface _Error {
    /**
     * <p>The error key.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>The version ID of the error.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>The error code is a string that uniquely identifies an error condition. It is meant to
     *          be read and understood by programs that detect and handle errors by type. The following is
     *          a list of Amazon S3 error codes. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html">Error responses</a>.</p>
     *          <ul>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> AccessDenied </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Access Denied</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> AccountProblem</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> There is a problem with your Amazon Web Services account
     *                      that prevents the action from completing successfully. Contact Amazon Web Services Support
     *                      for further assistance.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> AllAccessDisabled</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> All access to this Amazon S3 resource has been
     *                      disabled. Contact Amazon Web Services Support for further assistance.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> AmbiguousGrantByEmailAddress</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The email address you provided is
     *                      associated with more than one account.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> AuthorizationHeaderMalformed</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The authorization header you provided is
     *                      invalid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> BadDigest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The Content-MD5 you specified did not
     *                      match what we received.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> BucketAlreadyExists</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The requested bucket name is not
     *                      available. The bucket namespace is shared by all users of the system. Please
     *                      select a different name and try again.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 409 Conflict</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> BucketAlreadyOwnedByYou</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The bucket you tried to create already
     *                      exists, and you own it. Amazon S3 returns this error in all Amazon Web Services Regions except in
     *                      the North Virginia Region. For legacy compatibility, if you re-create an
     *                      existing bucket that you already own in the North Virginia Region, Amazon S3 returns
     *                      200 OK and resets the bucket access control lists (ACLs).</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> 409 Conflict (in all Regions except the North
     *                      Virginia Region) </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> BucketNotEmpty</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The bucket you tried to delete is not
     *                      empty.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 409 Conflict</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> CredentialsNotSupported</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> This request does not support
     *                      credentials.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> CrossLocationLoggingProhibited</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Cross-location logging not allowed.
     *                      Buckets in one geographic location cannot log information to a bucket in
     *                      another location.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> EntityTooSmall</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your proposed upload is smaller than the
     *                      minimum allowed object size.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> EntityTooLarge</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your proposed upload exceeds the maximum
     *                      allowed object size.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> ExpiredToken</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The provided token has expired.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> IllegalVersioningConfigurationException </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Indicates that the versioning
     *                      configuration specified in the request is invalid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> IncompleteBody</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> You did not provide the number of bytes
     *                      specified by the Content-Length HTTP header</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> IncorrectNumberOfFilesInPostRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> POST requires exactly one file upload per
     *                      request.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InlineDataTooLarge</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Inline data exceeds the maximum allowed
     *                      size.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InternalError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> We encountered an internal error. Please
     *                      try again.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 500 Internal Server Error</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Server</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidAccessKeyId</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The Amazon Web Services access key ID you provided does
     *                      not exist in our records.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidAddressingHeader</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> You must specify the Anonymous
     *                      role.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> N/A</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidArgument</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Invalid Argument</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidBucketName</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified bucket is not valid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidBucketState</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The request is not valid with the current
     *                      state of the bucket.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 409 Conflict</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidDigest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The Content-MD5 you specified is not
     *                      valid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidEncryptionAlgorithmError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The encryption request you specified is
     *                      not valid. The valid value is AES256.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidLocationConstraint</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified location constraint is not
     *                      valid. For more information about Regions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingBucket.html#access-bucket-intro">How to Select
     *                         a Region for Your Buckets</a>. </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidObjectState</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The action is not valid for the current
     *                      state of the object.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidPart</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> One or more of the specified parts could
     *                      not be found. The part might not have been uploaded, or the specified entity
     *                      tag might not have matched the part's entity tag.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidPartOrder</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The list of parts was not in ascending
     *                      order. Parts list must be specified in order by part number.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidPayer</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> All access to this object has been
     *                      disabled. Please contact Amazon Web Services Support for further assistance.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidPolicyDocument</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The content of the form does not meet the
     *                      conditions specified in the policy document.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRange</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The requested range cannot be
     *                      satisfied.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 416 Requested Range Not
     *                      Satisfiable</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Please use
     *                      <code>AWS4-HMAC-SHA256</code>.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> SOAP requests must be made over an HTTPS
     *                      connection.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Acceleration is not
     *                      supported for buckets with non-DNS compliant names.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Acceleration is not
     *                      supported for buckets with periods (.) in their names.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Accelerate endpoint only
     *                      supports virtual style requests.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Accelerate is not configured
     *                      on this bucket.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Accelerate is disabled on
     *                      this bucket.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Acceleration is not
     *                      supported on this bucket. Contact Amazon Web Services Support for more information.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Amazon S3 Transfer Acceleration cannot be
     *                      enabled on this bucket. Contact Amazon Web Services Support for more information.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> N/A</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidSecurity</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The provided security credentials are not
     *                      valid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidSOAPRequest</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The SOAP request body is invalid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidStorageClass</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The storage class you specified is not
     *                      valid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidTargetBucketForLogging</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The target bucket for logging does not
     *                      exist, is not owned by you, or does not have the appropriate grants for the
     *                      log-delivery group. </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidToken</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The provided token is malformed or
     *                      otherwise invalid.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> InvalidURI</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Couldn't parse the specified URI.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> KeyTooLongError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your key is too long.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MalformedACLError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The XML you provided was not well-formed
     *                      or did not validate against our published schema.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MalformedPOSTRequest </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The body of your POST request is not
     *                      well-formed multipart/form-data.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MalformedXML</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> This happens when the user sends malformed
     *                      XML (XML that doesn't conform to the published XSD) for the configuration. The
     *                      error message is, "The XML you provided was not well-formed or did not validate
     *                      against our published schema." </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MaxMessageLengthExceeded</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your request was too big.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MaxPostPreDataLengthExceededError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your POST request fields preceding the
     *                      upload file were too large.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MetadataTooLarge</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your metadata headers exceed the maximum
     *                      allowed metadata size.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MethodNotAllowed</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified method is not allowed
     *                      against this resource.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 405 Method Not Allowed</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MissingAttachment</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> A SOAP attachment was expected, but none
     *                      were found.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> N/A</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MissingContentLength</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> You must provide the Content-Length HTTP
     *                      header.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 411 Length Required</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MissingRequestBodyError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> This happens when the user sends an empty
     *                      XML document as a request. The error message is, "Request body is empty."
     *                   </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MissingSecurityElement</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The SOAP 1.1 request is missing a security
     *                      element.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> MissingSecurityHeader</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your request is missing a required
     *                      header.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoLoggingStatusForKey</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> There is no such thing as a logging status
     *                      subresource for a key.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoSuchBucket</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified bucket does not
     *                      exist.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 404 Not Found</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoSuchBucketPolicy</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified bucket does not have a
     *                      bucket policy.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 404 Not Found</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoSuchKey</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified key does not exist.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 404 Not Found</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoSuchLifecycleConfiguration</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The lifecycle configuration does not
     *                      exist. </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 404 Not Found</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoSuchUpload</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The specified multipart upload does not
     *                      exist. The upload ID might be invalid, or the multipart upload might have been
     *                      aborted or completed.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 404 Not Found</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NoSuchVersion </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Indicates that the version ID specified in
     *                      the request does not match an existing version.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 404 Not Found</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NotImplemented</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> A header you provided implies
     *                      functionality that is not implemented.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 501 Not Implemented</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Server</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> NotSignedUp</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your account is not signed up for the Amazon S3
     *                      service. You must sign up before you can use Amazon S3. You can sign up at the
     *                      following URL: <a href="http://aws.amazon.com/s3">Amazon S3</a>
     *                      </p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> OperationAborted</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> A conflicting conditional action is
     *                      currently in progress against this resource. Try again.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 409 Conflict</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> PermanentRedirect</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The bucket you are attempting to access
     *                      must be addressed using the specified endpoint. Send all future requests to
     *                      this endpoint.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 301 Moved Permanently</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> PreconditionFailed</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> At least one of the preconditions you
     *                      specified did not hold.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 412 Precondition Failed</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> Redirect</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Temporary redirect.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 307 Moved Temporarily</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> RestoreAlreadyInProgress</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Object restore is already in
     *                      progress.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 409 Conflict</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> RequestIsNotMultiPartContent</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Bucket POST must be of the enclosure-type
     *                      multipart/form-data.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> RequestTimeout</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Your socket connection to the server was
     *                      not read from or written to within the timeout period.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> RequestTimeTooSkewed</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The difference between the request time
     *                      and the server's time is too large.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> RequestTorrentOfBucketError</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Requesting the torrent file of a bucket is
     *                      not permitted.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> SignatureDoesNotMatch</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The request signature we calculated does
     *                      not match the signature you provided. Check your Amazon Web Services secret access key and
     *                      signing method. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html">REST
     *                         Authentication</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/SOAPAuthentication.html">SOAP
     *                         Authentication</a> for details.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 403 Forbidden</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> ServiceUnavailable</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Service is unable to handle
     *                      request.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 503 Service Unavailable</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Server</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> SlowDown</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> Reduce your request rate.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 503 Slow Down</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Server</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> TemporaryRedirect</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> You are being redirected to the bucket
     *                      while DNS updates.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 307 Moved Temporarily</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> TokenRefreshRequired</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The provided token must be
     *                      refreshed.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> TooManyBuckets</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> You have attempted to create more buckets
     *                      than allowed.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> UnexpectedContent</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> This request does not support
     *                      content.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> UnresolvableGrantByEmailAddress</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The email address you provided does not
     *                      match any account on record.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *             <li>
     *                <ul>
     *                   <li>
     *                      <p>
     *                         <i>Code:</i> UserKeyMustBeSpecified</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>Description:</i> The bucket POST must contain the specified
     *                      field name. If it is specified, check the order of the fields.</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>HTTP Status Code:</i> 400 Bad Request</p>
     *                   </li>
     *                   <li>
     *                      <p>
     *                         <i>SOAP Fault Code Prefix:</i> Client</p>
     *                   </li>
     *                </ul>
     *             </li>
     *          </ul>
     *          <p></p>
     * @public
     */
    Code?: string | undefined;
    /**
     * <p>The error message contains a generic description of the error condition in English. It
     *          is intended for a human audience. Simple programs display the message directly to the end
     *          user if they encounter an error condition they don't know how or don't care to handle.
     *          Sophisticated programs with more exhaustive error handling and proper internationalization
     *          are more likely to ignore the error message.</p>
     * @public
     */
    Message?: string | undefined;
}
/**
 * @public
 */
export interface DeleteObjectsOutput {
    /**
     * <p>Container element for a successful delete. It identifies the object that was
     *          successfully deleted.</p>
     * @public
     */
    Deleted?: DeletedObject[] | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
    /**
     * <p>Container for a failed delete action that describes the object that Amazon S3 attempted to
     *          delete and the error it encountered.</p>
     * @public
     */
    Errors?: _Error[] | undefined;
}
/**
 * <p>Object Identifier is unique value to identify objects.</p>
 * @public
 */
export interface ObjectIdentifier {
    /**
     * <p>Key name of the object.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Version ID for the specific version of the object to delete.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>An entity tag (ETag) is an identifier assigned by a web server to a specific version of a resource found at a URL.
     *          This header field makes the request method conditional on <code>ETags</code>. </p>
     *          <note>
     *             <p>Entity tags (ETags) for S3 Express One Zone are random alphanumeric strings unique to the object. </p>
     *          </note>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>If present, the objects are deleted only if its modification times matches the provided <code>Timestamp</code>.
     *       </p>
     *          <note>
     *             <p>This functionality is only supported for directory buckets.</p>
     *          </note>
     * @public
     */
    LastModifiedTime?: Date | undefined;
    /**
     * <p>If present, the objects are deleted only if its size matches the provided size in bytes. </p>
     *          <note>
     *             <p>This functionality is only supported for directory buckets.</p>
     *          </note>
     * @public
     */
    Size?: number | undefined;
}
/**
 * <p>Container for the objects to delete.</p>
 * @public
 */
export interface Delete {
    /**
     * <p>The object to delete.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets,
     *             an object that's composed entirely of whitespace characters is not supported by the
     *                <code>DeleteObjects</code> API operation. The request will receive a <code>400 Bad
     *                Request</code> error and none of the objects in the request will be deleted.</p>
     *          </note>
     * @public
     */
    Objects: ObjectIdentifier[] | undefined;
    /**
     * <p>Element to enable quiet mode for the request. When you add this element, you must set
     *          its value to <code>true</code>.</p>
     * @public
     */
    Quiet?: boolean | undefined;
}
/**
 * @public
 */
export interface DeleteObjectsRequest {
    /**
     * <p>The bucket name containing the objects to delete. </p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Container for the request.</p>
     * @public
     */
    Delete: Delete | undefined;
    /**
     * <p>The concatenation of the authentication device's serial number, a space, and the value
     *          that is displayed on your authentication device. Required to permanently delete a versioned
     *          object if versioning is configured with MFA delete enabled.</p>
     *          <p>When performing the <code>DeleteObjects</code> operation on an MFA delete enabled
     *          bucket, which attempts to delete the specified versioned objects, you must include an MFA
     *          token. If you don't provide an MFA token, the entire request will fail, even if there are
     *          non-versioned objects that you are trying to delete. If you provide an invalid token,
     *          whether there are versioned object keys in the request or not, the entire Multi-Object
     *          Delete request will fail. For information about MFA Delete, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/Versioning.html#MultiFactorAuthenticationDelete"> MFA
     *             Delete</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    MFA?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>Specifies whether you want to delete this object even if it has a Governance-type Object
     *          Lock in place. To use this header, you must have the
     *             <code>s3:BypassGovernanceRetention</code> permission.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    BypassGovernanceRetention?: boolean | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Indicates the algorithm used to create the checksum for the object when you use the SDK. This header will not provide any
     *     additional functionality if you don't use the SDK. When you send this header, there must be a corresponding <code>x-amz-checksum-<i>algorithm</i>
     *             </code> or
     *     <code>x-amz-trailer</code> header sent. Otherwise, Amazon S3 fails the request with the HTTP status code <code>400 Bad Request</code>.</p>
     *          <p>For the <code>x-amz-checksum-<i>algorithm</i>
     *             </code> header, replace <code>
     *                <i>algorithm</i>
     *             </code> with the supported algorithm from the following list: </p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CRC32</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>CRC32C</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>CRC64NVME</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SHA1</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>SHA256</code>
     *                </p>
     *             </li>
     *          </ul>
     *          <p>For more
     *     information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in
     *     the <i>Amazon S3 User Guide</i>.</p>
     *          <p>If the individual checksum value you provide through <code>x-amz-checksum-<i>algorithm</i>
     *             </code> doesn't match the checksum algorithm you set through <code>x-amz-sdk-checksum-algorithm</code>, Amazon S3 fails the request with a <code>BadDigest</code> error.</p>
     *          <p>If you provide an individual checksum, Amazon S3 ignores any provided
     *             <code>ChecksumAlgorithm</code> parameter.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
}
/**
 * @public
 */
export interface DeleteObjectTaggingOutput {
    /**
     * <p>The versionId of the object the tag-set was removed from.</p>
     * @public
     */
    VersionId?: string | undefined;
}
/**
 * @public
 */
export interface DeleteObjectTaggingRequest {
    /**
     * <p>The bucket name containing the objects from which to remove the tags. </p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The key that identifies the object in the bucket from which to remove all tags.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The versionId of the object that the tag-set will be removed from.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface DeletePublicAccessBlockRequest {
    /**
     * <p>The Amazon S3 bucket whose <code>PublicAccessBlock</code> configuration you want to delete.
     *       </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface GetBucketAccelerateConfigurationOutput {
    /**
     * <p>The accelerate configuration of the bucket.</p>
     * @public
     */
    Status?: BucketAccelerateStatus | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface GetBucketAccelerateConfigurationRequest {
    /**
     * <p>The name of the bucket for which the accelerate configuration is retrieved.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
}
/**
 * @public
 */
export interface GetBucketAclOutput {
    /**
     * <p>Container for the bucket owner's display name and ID.</p>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>A list of grants.</p>
     * @public
     */
    Grants?: Grant[] | undefined;
}
/**
 * @public
 */
export interface GetBucketAclRequest {
    /**
     * <p>Specifies the S3 bucket whose ACL is being requested.</p>
     *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
     *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
     * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
     * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
     *             Error Codes</a>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>A container of a key value name pair.</p>
 * @public
 */
export interface Tag {
    /**
     * <p>Name of the object key.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Value of the tag.</p>
     * @public
     */
    Value: string | undefined;
}
/**
 * <p>A conjunction (logical AND) of predicates, which is used in evaluating a metrics filter.
 *          The operator must have at least two predicates in any combination, and an object must match
 *          all of the predicates for the filter to apply.</p>
 * @public
 */
export interface AnalyticsAndOperator {
    /**
     * <p>The prefix to use when evaluating an AND predicate: The prefix that an object must have
     *          to be included in the metrics results.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>The list of tags to use when evaluating an AND predicate.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>The filter used to describe a set of objects for analyses. A filter must have exactly
 *          one prefix, one tag, or one conjunction (AnalyticsAndOperator). If no filter is provided,
 *          all objects will be considered in any analysis.</p>
 * @public
 */
export type AnalyticsFilter = AnalyticsFilter.AndMember | AnalyticsFilter.PrefixMember | AnalyticsFilter.TagMember | AnalyticsFilter.$UnknownMember;
/**
 * @public
 */
export declare namespace AnalyticsFilter {
    /**
     * <p>The prefix to use when evaluating an analytics filter.</p>
     * @public
     */
    interface PrefixMember {
        Prefix: string;
        Tag?: never;
        And?: never;
        $unknown?: never;
    }
    /**
     * <p>The tag to use when evaluating an analytics filter.</p>
     * @public
     */
    interface TagMember {
        Prefix?: never;
        Tag: Tag;
        And?: never;
        $unknown?: never;
    }
    /**
     * <p>A conjunction (logical AND) of predicates, which is used in evaluating an analytics
     *          filter. The operator must have at least two predicates.</p>
     * @public
     */
    interface AndMember {
        Prefix?: never;
        Tag?: never;
        And: AnalyticsAndOperator;
        $unknown?: never;
    }
    /**
     * @public
     */
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
/**
 * @public
 * @enum
 */
export declare const AnalyticsS3ExportFileFormat: {
    readonly CSV: "CSV";
};
/**
 * @public
 */
export type AnalyticsS3ExportFileFormat = (typeof AnalyticsS3ExportFileFormat)[keyof typeof AnalyticsS3ExportFileFormat];
/**
 * <p>Contains information about where to publish the analytics results.</p>
 * @public
 */
export interface AnalyticsS3BucketDestination {
    /**
     * <p>Specifies the file format used when exporting data to Amazon S3.</p>
     * @public
     */
    Format: AnalyticsS3ExportFileFormat | undefined;
    /**
     * <p>The account ID that owns the destination S3 bucket. If no account ID is provided, the
     *          owner is not validated before exporting data.</p>
     *          <note>
     *             <p> Although this value is optional, we strongly recommend that you set it to help
     *             prevent problems if the destination bucket ownership changes. </p>
     *          </note>
     * @public
     */
    BucketAccountId?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the bucket to which data is exported.</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The prefix to use when exporting data. The prefix is prepended to all results.</p>
     * @public
     */
    Prefix?: string | undefined;
}
/**
 * <p>Where to publish the analytics results.</p>
 * @public
 */
export interface AnalyticsExportDestination {
    /**
     * <p>A destination signifying output to an S3 bucket.</p>
     * @public
     */
    S3BucketDestination: AnalyticsS3BucketDestination | undefined;
}
/**
 * @public
 * @enum
 */
export declare const StorageClassAnalysisSchemaVersion: {
    readonly V_1: "V_1";
};
/**
 * @public
 */
export type StorageClassAnalysisSchemaVersion = (typeof StorageClassAnalysisSchemaVersion)[keyof typeof StorageClassAnalysisSchemaVersion];
/**
 * <p>Container for data related to the storage class analysis for an Amazon S3 bucket for
 *          export.</p>
 * @public
 */
export interface StorageClassAnalysisDataExport {
    /**
     * <p>The version of the output schema to use when exporting data. Must be
     *          <code>V_1</code>.</p>
     * @public
     */
    OutputSchemaVersion: StorageClassAnalysisSchemaVersion | undefined;
    /**
     * <p>The place to store the data for an analysis.</p>
     * @public
     */
    Destination: AnalyticsExportDestination | undefined;
}
/**
 * <p>Specifies data related to access patterns to be collected and made available to analyze
 *          the tradeoffs between different storage classes for an Amazon S3 bucket.</p>
 * @public
 */
export interface StorageClassAnalysis {
    /**
     * <p>Specifies how data related to the storage class analysis for an Amazon S3 bucket should be
     *          exported.</p>
     * @public
     */
    DataExport?: StorageClassAnalysisDataExport | undefined;
}
/**
 * <p>Specifies the configuration and any analyses for the analytics filter of an Amazon S3
 *          bucket.</p>
 * @public
 */
export interface AnalyticsConfiguration {
    /**
     * <p>The ID that identifies the analytics configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The filter used to describe a set of objects for analyses. A filter must have exactly
     *          one prefix, one tag, or one conjunction (AnalyticsAndOperator). If no filter is provided,
     *          all objects will be considered in any analysis.</p>
     * @public
     */
    Filter?: AnalyticsFilter | undefined;
    /**
     * <p> Contains data related to access patterns to be collected and made available to analyze
     *          the tradeoffs between different storage classes. </p>
     * @public
     */
    StorageClassAnalysis: StorageClassAnalysis | undefined;
}
/**
 * @public
 */
export interface GetBucketAnalyticsConfigurationOutput {
    /**
     * <p>The configuration and any analyses for the analytics filter.</p>
     * @public
     */
    AnalyticsConfiguration?: AnalyticsConfiguration | undefined;
}
/**
 * @public
 */
export interface GetBucketAnalyticsConfigurationRequest {
    /**
     * <p>The name of the bucket from which an analytics configuration is retrieved.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID that identifies the analytics configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>Specifies a cross-origin access rule for an Amazon S3 bucket.</p>
 * @public
 */
export interface CORSRule {
    /**
     * <p>Unique identifier for the rule. The value cannot be longer than 255 characters.</p>
     * @public
     */
    ID?: string | undefined;
    /**
     * <p>Headers that are specified in the <code>Access-Control-Request-Headers</code> header.
     *          These headers are allowed in a preflight OPTIONS request. In response to any preflight
     *          OPTIONS request, Amazon S3 returns any requested headers that are allowed.</p>
     * @public
     */
    AllowedHeaders?: string[] | undefined;
    /**
     * <p>An HTTP method that you allow the origin to execute. Valid values are <code>GET</code>,
     *             <code>PUT</code>, <code>HEAD</code>, <code>POST</code>, and <code>DELETE</code>.</p>
     * @public
     */
    AllowedMethods: string[] | undefined;
    /**
     * <p>One or more origins you want customers to be able to access the bucket from.</p>
     * @public
     */
    AllowedOrigins: string[] | undefined;
    /**
     * <p>One or more headers in the response that you want customers to be able to access from
     *          their applications (for example, from a JavaScript <code>XMLHttpRequest</code>
     *          object).</p>
     * @public
     */
    ExposeHeaders?: string[] | undefined;
    /**
     * <p>The time in seconds that your browser is to cache the preflight response for the
     *          specified resource.</p>
     * @public
     */
    MaxAgeSeconds?: number | undefined;
}
/**
 * @public
 */
export interface GetBucketCorsOutput {
    /**
     * <p>A set of origins and methods (cross-origin access that you want to allow). You can add
     *          up to 100 rules to the configuration.</p>
     * @public
     */
    CORSRules?: CORSRule[] | undefined;
}
/**
 * @public
 */
export interface GetBucketCorsRequest {
    /**
     * <p>The bucket name for which to get the cors configuration.</p>
     *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
     *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
     * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
     * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
     *             Error Codes</a>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>Describes the default server-side encryption to apply to new objects in the bucket. If a
 *          PUT Object request doesn't specify any server-side encryption, this default encryption will
 *          be applied. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTencryption.html">PutBucketEncryption</a>.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>General purpose buckets</b> - If you don't specify
 *                   a customer managed key at configuration, Amazon S3 automatically creates an Amazon Web Services KMS key
 *                      (<code>aws/s3</code>) in your Amazon Web Services account the first time that you add an
 *                   object encrypted with SSE-KMS to a bucket. By default, Amazon S3 uses this KMS key
 *                   for SSE-KMS. </p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   Your SSE-KMS configuration can only support 1 <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">customer managed key</a> per directory bucket's lifetime.
 * The <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk">Amazon Web Services managed key</a> (<code>aws/s3</code>) isn't supported.
 * </p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   For directory buckets, there are only two supported options for server-side encryption: SSE-S3 and SSE-KMS.</p>
 *                </li>
 *             </ul>
 *          </note>
 * @public
 */
export interface ServerSideEncryptionByDefault {
    /**
     * <p>Server-side encryption algorithm to use for the default encryption.</p>
     *          <note>
     *             <p>For directory buckets, there are only two supported values for server-side encryption: <code>AES256</code> and <code>aws:kms</code>.</p>
     *          </note>
     * @public
     */
    SSEAlgorithm: ServerSideEncryption | undefined;
    /**
     * <p>Amazon Web Services Key Management Service (KMS) customer managed key ID to use for the default
     *          encryption. </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>General purpose buckets</b> - This parameter is
     *                   allowed if and only if <code>SSEAlgorithm</code> is set to <code>aws:kms</code> or
     *                      <code>aws:kms:dsse</code>.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> - This parameter is
     *                   allowed if and only if <code>SSEAlgorithm</code> is set to
     *                   <code>aws:kms</code>.</p>
     *                </li>
     *             </ul>
     *          </note>
     *          <p>You can specify the key ID, key alias, or the Amazon Resource Name (ARN) of the KMS
     *          key.</p>
     *          <ul>
     *             <li>
     *                <p>Key ID: <code>1234abcd-12ab-34cd-56ef-1234567890ab</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>Key ARN:
     *                   <code>arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>Key Alias: <code>alias/alias-name</code>
     *                </p>
     *             </li>
     *          </ul>
     *          <p>If you are using encryption with cross-account or Amazon Web Services service operations, you must use
     *          a fully qualified KMS key ARN. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html#bucket-encryption-update-bucket-policy">Using encryption for cross-account operations</a>.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>General purpose buckets</b> - If you're specifying
     *                   a customer managed KMS key, we recommend using a fully qualified KMS key ARN.
     *                   If you use a KMS key alias instead, then KMS resolves the key within the
     *                   requester’s account. This behavior can result in data that's encrypted with a
     *                   KMS key that belongs to the requester, and not the bucket owner. Also, if you
     *                   use a key ID, you can run into a LogDestination undeliverable error when creating
     *                   a VPC flow log. </p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> -
     *                   When you specify an <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">KMS customer managed key</a> for encryption in your directory bucket, only use the key ID or key ARN. The key alias format of the KMS key isn't supported.</p>
     *                </li>
     *             </ul>
     *          </note>
     *          <important>
     *             <p>Amazon S3 only supports symmetric encryption KMS keys. For more information, see <a href="https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html">Asymmetric keys in Amazon Web Services KMS</a> in the <i>Amazon Web Services Key Management Service
     *                Developer Guide</i>.</p>
     *          </important>
     * @public
     */
    KMSMasterKeyID?: string | undefined;
}
/**
 * <p>Specifies the default server-side encryption configuration.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>General purpose buckets</b> - If you're specifying
 *                   a customer managed KMS key, we recommend using a fully qualified KMS key ARN.
 *                   If you use a KMS key alias instead, then KMS resolves the key within the
 *                   requester’s account. This behavior can result in data that's encrypted with a
 *                   KMS key that belongs to the requester, and not the bucket owner.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   When you specify an <a href="https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk">KMS customer managed key</a> for encryption in your directory bucket, only use the key ID or key ARN. The key alias format of the KMS key isn't supported.</p>
 *                </li>
 *             </ul>
 *          </note>
 * @public
 */
export interface ServerSideEncryptionRule {
    /**
     * <p>Specifies the default server-side encryption to apply to new objects in the bucket. If a
     *          PUT Object request doesn't specify any server-side encryption, this default encryption will
     *          be applied.</p>
     * @public
     */
    ApplyServerSideEncryptionByDefault?: ServerSideEncryptionByDefault | undefined;
    /**
     * <p>Specifies whether Amazon S3 should use an S3 Bucket Key with server-side encryption using KMS
     *          (SSE-KMS) for new objects in the bucket. Existing objects are not affected. Setting the
     *             <code>BucketKeyEnabled</code> element to <code>true</code> causes Amazon S3 to use an S3
     *          Bucket Key. </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>General purpose buckets</b> - By default, S3
     *                   Bucket Key is not enabled. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-key.html">Amazon S3 Bucket Keys</a> in the
     *                      <i>Amazon S3 User Guide</i>.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> -
     *                   S3 Bucket Keys are always enabled for <code>GET</code> and <code>PUT</code> operations in a directory bucket and can’t be disabled. S3 Bucket Keys aren't supported, when you copy SSE-KMS encrypted objects from general purpose buckets
     * to directory buckets, from directory buckets to general purpose buckets, or between directory buckets, through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>, <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-objects-Batch-Ops">the Copy operation in Batch Operations</a>, or
     *                             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-import-job">the import jobs</a>. In this case, Amazon S3 makes a call to KMS every time a copy request is made for a KMS-encrypted object.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
}
/**
 * <p>Specifies the default server-side-encryption configuration.</p>
 * @public
 */
export interface ServerSideEncryptionConfiguration {
    /**
     * <p>Container for information about a particular server-side encryption configuration
     *          rule.</p>
     * @public
     */
    Rules: ServerSideEncryptionRule[] | undefined;
}
/**
 * @public
 */
export interface GetBucketEncryptionOutput {
    /**
     * <p>Specifies the default server-side-encryption configuration.</p>
     * @public
     */
    ServerSideEncryptionConfiguration?: ServerSideEncryptionConfiguration | undefined;
}
/**
 * @public
 */
export interface GetBucketEncryptionRequest {
    /**
     * <p>The name of the bucket from which the server-side encryption configuration is
     *          retrieved.</p>
     *          <p>
     *             <b>Directory buckets </b> - When you use this operation with a directory bucket, you must use path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
     *             </code>. Virtual-hosted-style requests aren't supported. Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must also follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>DOC-EXAMPLE-BUCKET</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming rules</a> in the <i>Amazon S3 User Guide</i>
     *          </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>For directory buckets, this header is not supported in this API operation. If you specify this header, the request fails with the HTTP status code
     * <code>501 Not Implemented</code>.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>A container for specifying S3 Intelligent-Tiering filters. The filters determine the
 *          subset of objects to which the rule applies.</p>
 * @public
 */
export interface IntelligentTieringAndOperator {
    /**
     * <p>An object key name prefix that identifies the subset of objects to which the
     *          configuration applies.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>All of these tags must exist in the object's tag set in order for the configuration to
     *          apply.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>The <code>Filter</code> is used to identify objects that the S3 Intelligent-Tiering
 *          configuration applies to.</p>
 * @public
 */
export interface IntelligentTieringFilter {
    /**
     * <p>An object key name prefix that identifies the subset of objects to which the rule
     *          applies.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>A container of a key value name pair.</p>
     * @public
     */
    Tag?: Tag | undefined;
    /**
     * <p>A conjunction (logical AND) of predicates, which is used in evaluating a metrics filter.
     *          The operator must have at least two predicates, and an object must match all of the
     *          predicates in order for the filter to apply.</p>
     * @public
     */
    And?: IntelligentTieringAndOperator | undefined;
}
/**
 * @public
 * @enum
 */
export declare const IntelligentTieringStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type IntelligentTieringStatus = (typeof IntelligentTieringStatus)[keyof typeof IntelligentTieringStatus];
/**
 * @public
 * @enum
 */
export declare const IntelligentTieringAccessTier: {
    readonly ARCHIVE_ACCESS: "ARCHIVE_ACCESS";
    readonly DEEP_ARCHIVE_ACCESS: "DEEP_ARCHIVE_ACCESS";
};
/**
 * @public
 */
export type IntelligentTieringAccessTier = (typeof IntelligentTieringAccessTier)[keyof typeof IntelligentTieringAccessTier];
/**
 * <p>The S3 Intelligent-Tiering storage class is designed to optimize storage costs by
 *          automatically moving data to the most cost-effective storage access tier, without
 *          additional operational overhead.</p>
 * @public
 */
export interface Tiering {
    /**
     * <p>The number of consecutive days of no access after which an object will be eligible to be
     *          transitioned to the corresponding tier. The minimum number of days specified for
     *          Archive Access tier must be at least 90 days and Deep Archive Access tier must be at least
     *          180 days. The maximum can be up to 2 years (730 days).</p>
     * @public
     */
    Days: number | undefined;
    /**
     * <p>S3 Intelligent-Tiering access tier. See <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html#sc-dynamic-data-access">Storage class
     *             for automatically optimizing frequently and infrequently accessed objects</a> for a
     *          list of access tiers in the S3 Intelligent-Tiering storage class.</p>
     * @public
     */
    AccessTier: IntelligentTieringAccessTier | undefined;
}
/**
 * <p>Specifies the S3 Intelligent-Tiering configuration for an Amazon S3 bucket.</p>
 *          <p>For information about the S3 Intelligent-Tiering storage class, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html#sc-dynamic-data-access">Storage class
 *             for automatically optimizing frequently and infrequently accessed
 *          objects</a>.</p>
 * @public
 */
export interface IntelligentTieringConfiguration {
    /**
     * <p>The ID used to identify the S3 Intelligent-Tiering configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>Specifies a bucket filter. The configuration only includes objects that meet the
     *          filter's criteria.</p>
     * @public
     */
    Filter?: IntelligentTieringFilter | undefined;
    /**
     * <p>Specifies the status of the configuration.</p>
     * @public
     */
    Status: IntelligentTieringStatus | undefined;
    /**
     * <p>Specifies the S3 Intelligent-Tiering storage class tier of the configuration.</p>
     * @public
     */
    Tierings: Tiering[] | undefined;
}
/**
 * @public
 */
export interface GetBucketIntelligentTieringConfigurationOutput {
    /**
     * <p>Container for S3 Intelligent-Tiering configuration.</p>
     * @public
     */
    IntelligentTieringConfiguration?: IntelligentTieringConfiguration | undefined;
}
/**
 * @public
 */
export interface GetBucketIntelligentTieringConfigurationRequest {
    /**
     * <p>The name of the Amazon S3 bucket whose configuration you want to modify or retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID used to identify the S3 Intelligent-Tiering configuration.</p>
     * @public
     */
    Id: string | undefined;
}
/**
 * <p>Specifies the use of SSE-KMS to encrypt delivered inventory reports.</p>
 * @public
 */
export interface SSEKMS {
    /**
     * <p>Specifies the ID of the Key Management Service (KMS) symmetric encryption customer managed key to use for
     *          encrypting inventory reports.</p>
     * @public
     */
    KeyId: string | undefined;
}
/**
 * <p>Specifies the use of SSE-S3 to encrypt delivered inventory reports.</p>
 * @public
 */
export interface SSES3 {
}
/**
 * <p>Contains the type of server-side encryption used to encrypt the inventory
 *          results.</p>
 * @public
 */
export interface InventoryEncryption {
    /**
     * <p>Specifies the use of SSE-S3 to encrypt delivered inventory reports.</p>
     * @public
     */
    SSES3?: SSES3 | undefined;
    /**
     * <p>Specifies the use of SSE-KMS to encrypt delivered inventory reports.</p>
     * @public
     */
    SSEKMS?: SSEKMS | undefined;
}
/**
 * @public
 * @enum
 */
export declare const InventoryFormat: {
    readonly CSV: "CSV";
    readonly ORC: "ORC";
    readonly Parquet: "Parquet";
};
/**
 * @public
 */
export type InventoryFormat = (typeof InventoryFormat)[keyof typeof InventoryFormat];
/**
 * <p>Contains the bucket name, file format, bucket owner (optional), and prefix (optional)
 *          where inventory results are published.</p>
 * @public
 */
export interface InventoryS3BucketDestination {
    /**
     * <p>The account ID that owns the destination S3 bucket. If no account ID is provided, the
     *          owner is not validated before exporting data. </p>
     *          <note>
     *             <p> Although this value is optional, we strongly recommend that you set it to help
     *             prevent problems if the destination bucket ownership changes. </p>
     *          </note>
     * @public
     */
    AccountId?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the bucket where inventory results will be
     *          published.</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Specifies the output format of the inventory results.</p>
     * @public
     */
    Format: InventoryFormat | undefined;
    /**
     * <p>The prefix that is prepended to all inventory results.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Contains the type of server-side encryption used to encrypt the inventory
     *          results.</p>
     * @public
     */
    Encryption?: InventoryEncryption | undefined;
}
/**
 * <p>Specifies the inventory configuration for an Amazon S3 bucket.</p>
 * @public
 */
export interface InventoryDestination {
    /**
     * <p>Contains the bucket name, file format, bucket owner (optional), and prefix (optional)
     *          where inventory results are published.</p>
     * @public
     */
    S3BucketDestination: InventoryS3BucketDestination | undefined;
}
/**
 * <p>Specifies an inventory filter. The inventory only includes objects that meet the
 *          filter's criteria.</p>
 * @public
 */
export interface InventoryFilter {
    /**
     * <p>The prefix that an object must have to be included in the inventory results.</p>
     * @public
     */
    Prefix: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const InventoryIncludedObjectVersions: {
    readonly All: "All";
    readonly Current: "Current";
};
/**
 * @public
 */
export type InventoryIncludedObjectVersions = (typeof InventoryIncludedObjectVersions)[keyof typeof InventoryIncludedObjectVersions];
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type InventoryOptionalField = (typeof InventoryOptionalField)[keyof typeof InventoryOptionalField];
/**
 * @public
 * @enum
 */
export declare const InventoryFrequency: {
    readonly Daily: "Daily";
    readonly Weekly: "Weekly";
};
/**
 * @public
 */
export type InventoryFrequency = (typeof InventoryFrequency)[keyof typeof InventoryFrequency];
/**
 * <p>Specifies the schedule for generating inventory results.</p>
 * @public
 */
export interface InventorySchedule {
    /**
     * <p>Specifies how frequently inventory results are produced.</p>
     * @public
     */
    Frequency: InventoryFrequency | undefined;
}
/**
 * <p>Specifies the inventory configuration for an Amazon S3 bucket. For more information, see
 *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETInventoryConfig.html">GET Bucket inventory</a> in the <i>Amazon S3 API Reference</i>. </p>
 * @public
 */
export interface InventoryConfiguration {
    /**
     * <p>Contains information about where to publish the inventory results.</p>
     * @public
     */
    Destination: InventoryDestination | undefined;
    /**
     * <p>Specifies whether the inventory is enabled or disabled. If set to <code>True</code>, an
     *          inventory list is generated. If set to <code>False</code>, no inventory list is
     *          generated.</p>
     * @public
     */
    IsEnabled: boolean | undefined;
    /**
     * <p>Specifies an inventory filter. The inventory only includes objects that meet the
     *          filter's criteria.</p>
     * @public
     */
    Filter?: InventoryFilter | undefined;
    /**
     * <p>The ID used to identify the inventory configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>Object versions to include in the inventory list. If set to <code>All</code>, the list
     *          includes all the object versions, which adds the version-related fields
     *             <code>VersionId</code>, <code>IsLatest</code>, and <code>DeleteMarker</code> to the
     *          list. If set to <code>Current</code>, the list does not contain these version-related
     *          fields.</p>
     * @public
     */
    IncludedObjectVersions: InventoryIncludedObjectVersions | undefined;
    /**
     * <p>Contains the optional fields that are included in the inventory results.</p>
     * @public
     */
    OptionalFields?: InventoryOptionalField[] | undefined;
    /**
     * <p>Specifies the schedule for generating inventory results.</p>
     * @public
     */
    Schedule: InventorySchedule | undefined;
}
/**
 * @public
 */
export interface GetBucketInventoryConfigurationOutput {
    /**
     * <p>Specifies the inventory configuration.</p>
     * @public
     */
    InventoryConfiguration?: InventoryConfiguration | undefined;
}
/**
 * @public
 */
export interface GetBucketInventoryConfigurationRequest {
    /**
     * <p>The name of the bucket containing the inventory configuration to retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID used to identify the inventory configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>Container for the expiration for the lifecycle of the object.</p>
 *          <p>For more information see, <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html">Managing your storage
 *             lifecycle</a> in the <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface LifecycleExpiration {
    /**
     * <p>Indicates at what date the object is to be moved or deleted. The date value must conform
     *          to the ISO 8601 format. The time is always midnight UTC.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    Date?: Date | undefined;
    /**
     * <p>Indicates the lifetime, in days, of the objects that are subject to the rule. The value
     *          must be a non-zero positive integer.</p>
     * @public
     */
    Days?: number | undefined;
    /**
     * <p>Indicates whether Amazon S3 will remove a delete marker with no noncurrent versions. If set
     *          to true, the delete marker will be expired; if set to false the policy takes no action.
     *          This cannot be specified with Days or Date in a Lifecycle Expiration Policy.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    ExpiredObjectDeleteMarker?: boolean | undefined;
}
/**
 * <p>This is used in a Lifecycle Rule Filter to apply a logical AND to two or more
 *          predicates. The Lifecycle Rule will apply to any object matching all of the predicates
 *          configured inside the And operator.</p>
 * @public
 */
export interface LifecycleRuleAndOperator {
    /**
     * <p>Prefix identifying one or more objects to which the rule applies.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>All of these tags must exist in the object's tag set in order for the rule to
     *          apply.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>Minimum object size to which the rule applies.</p>
     * @public
     */
    ObjectSizeGreaterThan?: number | undefined;
    /**
     * <p>Maximum object size to which the rule applies.</p>
     * @public
     */
    ObjectSizeLessThan?: number | undefined;
}
/**
 * <p>The <code>Filter</code> is used to identify objects that a Lifecycle Rule applies to. A
 *             <code>Filter</code> can have exactly one of <code>Prefix</code>, <code>Tag</code>,
 *             <code>ObjectSizeGreaterThan</code>, <code>ObjectSizeLessThan</code>, or <code>And</code>
 *          specified. If the <code>Filter</code> element is left empty, the Lifecycle Rule applies to
 *          all objects in the bucket.</p>
 * @public
 */
export interface LifecycleRuleFilter {
    /**
     * <p>Prefix identifying one or more objects to which the rule applies.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>This tag must exist in the object's tag set in order for the rule to apply.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    Tag?: Tag | undefined;
    /**
     * <p>Minimum object size to which the rule applies.</p>
     * @public
     */
    ObjectSizeGreaterThan?: number | undefined;
    /**
     * <p>Maximum object size to which the rule applies.</p>
     * @public
     */
    ObjectSizeLessThan?: number | undefined;
    /**
     * <p>This is used in a Lifecycle Rule Filter to apply a logical AND to two or more
     *          predicates. The Lifecycle Rule will apply to any object matching all of the predicates
     *          configured inside the And operator.</p>
     * @public
     */
    And?: LifecycleRuleAndOperator | undefined;
}
/**
 * <p>Specifies when noncurrent object versions expire. Upon expiration, Amazon S3 permanently
 *          deletes the noncurrent object versions. You set this lifecycle configuration action on a
 *          bucket that has versioning enabled (or suspended) to request that Amazon S3 delete noncurrent
 *          object versions at a specific period in the object's lifetime.</p>
 *          <note>
 *             <p>This parameter applies to general purpose buckets only. It is not supported for
 *             directory bucket lifecycle configurations.</p>
 *          </note>
 * @public
 */
export interface NoncurrentVersionExpiration {
    /**
     * <p>Specifies the number of days an object is noncurrent before Amazon S3 can perform the
     *          associated action. The value must be a non-zero positive integer. For information about the
     *          noncurrent days calculations, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#non-current-days-calculations">How
     *             Amazon S3 Calculates When an Object Became Noncurrent</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    NoncurrentDays?: number | undefined;
    /**
     * <p>Specifies how many noncurrent versions Amazon S3 will retain. You can specify up to 100
     *          noncurrent versions to retain. Amazon S3 will permanently delete any additional noncurrent
     *          versions beyond the specified number to retain. For more information about noncurrent
     *          versions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html">Lifecycle configuration
     *             elements</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    NewerNoncurrentVersions?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const TransitionStorageClass: {
    readonly DEEP_ARCHIVE: "DEEP_ARCHIVE";
    readonly GLACIER: "GLACIER";
    readonly GLACIER_IR: "GLACIER_IR";
    readonly INTELLIGENT_TIERING: "INTELLIGENT_TIERING";
    readonly ONEZONE_IA: "ONEZONE_IA";
    readonly STANDARD_IA: "STANDARD_IA";
};
/**
 * @public
 */
export type TransitionStorageClass = (typeof TransitionStorageClass)[keyof typeof TransitionStorageClass];
/**
 * <p>Container for the transition rule that describes when noncurrent objects transition to
 *          the <code>STANDARD_IA</code>, <code>ONEZONE_IA</code>, <code>INTELLIGENT_TIERING</code>,
 *             <code>GLACIER_IR</code>, <code>GLACIER</code>, or <code>DEEP_ARCHIVE</code> storage
 *          class. If your bucket is versioning-enabled (or versioning is suspended), you can set this
 *          action to request that Amazon S3 transition noncurrent object versions to the
 *             <code>STANDARD_IA</code>, <code>ONEZONE_IA</code>, <code>INTELLIGENT_TIERING</code>,
 *             <code>GLACIER_IR</code>, <code>GLACIER</code>, or <code>DEEP_ARCHIVE</code> storage
 *          class at a specific period in the object's lifetime.</p>
 * @public
 */
export interface NoncurrentVersionTransition {
    /**
     * <p>Specifies the number of days an object is noncurrent before Amazon S3 can perform the
     *          associated action. For information about the noncurrent days calculations, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#non-current-days-calculations">How
     *             Amazon S3 Calculates How Long an Object Has Been Noncurrent</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    NoncurrentDays?: number | undefined;
    /**
     * <p>The class of storage used to store the object.</p>
     * @public
     */
    StorageClass?: TransitionStorageClass | undefined;
    /**
     * <p>Specifies how many noncurrent versions Amazon S3 will retain in the same storage class before
     *          transitioning objects. You can specify up to 100 noncurrent versions to retain. Amazon S3 will
     *          transition any additional noncurrent versions beyond the specified number to retain. For
     *          more information about noncurrent versions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html">Lifecycle configuration
     *             elements</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    NewerNoncurrentVersions?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ExpirationStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type ExpirationStatus = (typeof ExpirationStatus)[keyof typeof ExpirationStatus];
/**
 * <p>Specifies when an object transitions to a specified storage class. For more information
 *          about Amazon S3 lifecycle configuration rules, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/lifecycle-transition-general-considerations.html">Transitioning
 *             Objects Using Amazon S3 Lifecycle</a> in the <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface Transition {
    /**
     * <p>Indicates when objects are transitioned to the specified storage class. The date value
     *          must be in ISO 8601 format. The time is always midnight UTC.</p>
     * @public
     */
    Date?: Date | undefined;
    /**
     * <p>Indicates the number of days after creation when objects are transitioned to the
     *          specified storage class. If the specified storage class is <code>INTELLIGENT_TIERING</code>,
     *          <code>GLACIER_IR</code>, <code>GLACIER</code>, or <code>DEEP_ARCHIVE</code>, valid values are
     *          <code>0</code> or positive integers. If the specified storage class is <code>STANDARD_IA</code>
     *          or <code>ONEZONE_IA</code>, valid values are positive integers greater than <code>30</code>. Be
     *          aware that some storage classes have a minimum storage duration and that you're charged for
     *          transitioning objects before their minimum storage duration. For more information, see
     *          <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html#lifecycle-configuration-constraints">
     *             Constraints and considerations for transitions</a> in the
     *          <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Days?: number | undefined;
    /**
     * <p>The storage class to which you want the object to transition.</p>
     * @public
     */
    StorageClass?: TransitionStorageClass | undefined;
}
/**
 * <p>A lifecycle rule for individual objects in an Amazon S3 bucket.</p>
 *          <p>For more information see, <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html">Managing your storage
 *             lifecycle</a> in the <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface LifecycleRule {
    /**
     * <p>Specifies the expiration for the lifecycle of the object in the form of date, days and,
     *          whether the object has a delete marker.</p>
     * @public
     */
    Expiration?: LifecycleExpiration | undefined;
    /**
     * <p>Unique identifier for the rule. The value cannot be longer than 255 characters.</p>
     * @public
     */
    ID?: string | undefined;
    /**
     * <p>Prefix identifying one or more objects to which the rule applies. This is
     *          no longer used; use <code>Filter</code> instead.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     *
     * @deprecated
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>The <code>Filter</code> is used to identify objects that a Lifecycle Rule applies to. A
     *             <code>Filter</code> must have exactly one of <code>Prefix</code>, <code>Tag</code>, or
     *             <code>And</code> specified. <code>Filter</code> is required if the
     *             <code>LifecycleRule</code> does not contain a <code>Prefix</code> element.</p>
     *          <note>
     *             <p>
     *                <code>Tag</code> filters are not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    Filter?: LifecycleRuleFilter | undefined;
    /**
     * <p>If 'Enabled', the rule is currently being applied. If 'Disabled', the rule is not
     *          currently being applied.</p>
     * @public
     */
    Status: ExpirationStatus | undefined;
    /**
     * <p>Specifies when an Amazon S3 object transitions to a specified storage class.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    Transitions?: Transition[] | undefined;
    /**
     * <p>Specifies the transition rule for the lifecycle rule that describes when noncurrent
     *          objects transition to a specific storage class. If your bucket is versioning-enabled (or
     *          versioning is suspended), you can set this action to request that Amazon S3 transition
     *          noncurrent object versions to a specific storage class at a set period in the object's
     *          lifetime.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    NoncurrentVersionTransitions?: NoncurrentVersionTransition[] | undefined;
    /**
     * <p>Specifies when noncurrent object versions expire. Upon expiration, Amazon S3 permanently
     *          deletes the noncurrent object versions. You set this lifecycle configuration action on a
     *          bucket that has versioning enabled (or suspended) to request that Amazon S3 delete noncurrent
     *          object versions at a specific period in the object's lifetime.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    NoncurrentVersionExpiration?: NoncurrentVersionExpiration | undefined;
    /**
     * <p>Specifies the days since the initiation of an incomplete multipart upload that Amazon S3 will
     *          wait before permanently removing all parts of the upload. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html#mpu-abort-incomplete-mpu-lifecycle-config">
     *             Aborting Incomplete Multipart Uploads Using a Bucket Lifecycle Configuration</a> in
     *          the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    AbortIncompleteMultipartUpload?: AbortIncompleteMultipartUpload | undefined;
}
/**
 * @public
 * @enum
 */
export declare const TransitionDefaultMinimumObjectSize: {
    readonly all_storage_classes_128K: "all_storage_classes_128K";
    readonly varies_by_storage_class: "varies_by_storage_class";
};
/**
 * @public
 */
export type TransitionDefaultMinimumObjectSize = (typeof TransitionDefaultMinimumObjectSize)[keyof typeof TransitionDefaultMinimumObjectSize];
/**
 * @public
 */
export interface GetBucketLifecycleConfigurationOutput {
    /**
     * <p>Container for a lifecycle rule.</p>
     * @public
     */
    Rules?: LifecycleRule[] | undefined;
    /**
     * <p>Indicates which default minimum object size behavior is applied to the lifecycle
     *          configuration.</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It isn't supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>all_storage_classes_128K</code> - Objects smaller than 128 KB will not transition to any storage class by default.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>varies_by_storage_class</code> - Objects smaller than 128 KB will
     *                transition to Glacier Flexible Retrieval or Glacier Deep Archive storage classes. By
     *                default, all other storage classes will prevent transitions smaller than 128 KB.
     *             </p>
     *             </li>
     *          </ul>
     *          <p>To customize the minimum object size for any transition you can add a filter that
     *          specifies a custom <code>ObjectSizeGreaterThan</code> or <code>ObjectSizeLessThan</code> in
     *          the body of your transition rule. Custom filters always take precedence over the default
     *          transition behavior.</p>
     * @public
     */
    TransitionDefaultMinimumObjectSize?: TransitionDefaultMinimumObjectSize | undefined;
}
/**
 * @public
 */
export interface GetBucketLifecycleConfigurationRequest {
    /**
     * <p>The name of the bucket for which to get the lifecycle information.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>This parameter applies to general purpose buckets only. It is not supported for
     *             directory bucket lifecycle configurations.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface GetBucketLocationOutput {
    /**
     * <p>Specifies the Region where the bucket resides. For a list of all the Amazon S3 supported
     *          location constraints by Region, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a>.</p>
     *          <p>Buckets in Region <code>us-east-1</code> have a LocationConstraint of
     *          <code>null</code>. Buckets with a LocationConstraint of <code>EU</code> reside in <code>eu-west-1</code>.</p>
     * @public
     */
    LocationConstraint?: BucketLocationConstraint | undefined;
}
/**
 * @public
 */
export interface GetBucketLocationRequest {
    /**
     * <p>The name of the bucket for which to get the location.</p>
     *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
     *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
     * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
     * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
     *             Error Codes</a>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const BucketLogsPermission: {
    readonly FULL_CONTROL: "FULL_CONTROL";
    readonly READ: "READ";
    readonly WRITE: "WRITE";
};
/**
 * @public
 */
export type BucketLogsPermission = (typeof BucketLogsPermission)[keyof typeof BucketLogsPermission];
/**
 * <p>Container for granting information.</p>
 *          <p>Buckets that use the bucket owner enforced setting for Object Ownership don't support
 *          target grants. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html#grant-log-delivery-permissions-general">Permissions server access log delivery</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface TargetGrant {
    /**
     * <p>Container for the person being granted permissions.</p>
     * @public
     */
    Grantee?: Grantee | undefined;
    /**
     * <p>Logging permissions assigned to the grantee for the bucket.</p>
     * @public
     */
    Permission?: BucketLogsPermission | undefined;
}
/**
 * @public
 * @enum
 */
export declare const PartitionDateSource: {
    readonly DeliveryTime: "DeliveryTime";
    readonly EventTime: "EventTime";
};
/**
 * @public
 */
export type PartitionDateSource = (typeof PartitionDateSource)[keyof typeof PartitionDateSource];
/**
 * <p>Amazon S3 keys for log objects are partitioned in the following format:</p>
 *          <p>
 *             <code>[DestinationPrefix][SourceAccountId]/[SourceRegion]/[SourceBucket]/[YYYY]/[MM]/[DD]/[YYYY]-[MM]-[DD]-[hh]-[mm]-[ss]-[UniqueString]</code>
 *          </p>
 *          <p>PartitionedPrefix defaults to EventTime delivery when server access logs are
 *          delivered.</p>
 * @public
 */
export interface PartitionedPrefix {
    /**
     * <p>Specifies the partition date source for the partitioned prefix.
     *             <code>PartitionDateSource</code> can be <code>EventTime</code> or
     *             <code>DeliveryTime</code>.</p>
     *          <p>For <code>DeliveryTime</code>, the time in the log file names corresponds to the
     *          delivery time for the log files. </p>
     *          <p> For <code>EventTime</code>, The logs delivered are for a specific day only. The year,
     *          month, and day correspond to the day on which the event occurred, and the hour, minutes and
     *          seconds are set to 00 in the key.</p>
     * @public
     */
    PartitionDateSource?: PartitionDateSource | undefined;
}
/**
 * <p>To use simple format for S3 keys for log objects, set SimplePrefix to an empty
 *          object.</p>
 *          <p>
 *             <code>[DestinationPrefix][YYYY]-[MM]-[DD]-[hh]-[mm]-[ss]-[UniqueString]</code>
 *          </p>
 * @public
 */
export interface SimplePrefix {
}
/**
 * <p>Amazon S3 key format for log objects. Only one format, PartitionedPrefix or
 *          SimplePrefix, is allowed.</p>
 * @public
 */
export interface TargetObjectKeyFormat {
    /**
     * <p>To use the simple format for S3 keys for log objects. To specify SimplePrefix format,
     *          set SimplePrefix to \{\}.</p>
     * @public
     */
    SimplePrefix?: SimplePrefix | undefined;
    /**
     * <p>Partitioned S3 key for log objects.</p>
     * @public
     */
    PartitionedPrefix?: PartitionedPrefix | undefined;
}
/**
 * <p>Describes where logs are stored and the prefix that Amazon S3 assigns to all log object keys
 *          for a bucket. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTlogging.html">PUT Bucket logging</a> in the
 *             <i>Amazon S3 API Reference</i>.</p>
 * @public
 */
export interface LoggingEnabled {
    /**
     * <p>Specifies the bucket where you want Amazon S3 to store server access logs. You can have your
     *          logs delivered to any bucket that you own, including the same bucket that is being logged.
     *          You can also configure multiple buckets to deliver their logs to the same target bucket. In
     *          this case, you should choose a different <code>TargetPrefix</code> for each source bucket
     *          so that the delivered log files can be distinguished by key.</p>
     * @public
     */
    TargetBucket: string | undefined;
    /**
     * <p>Container for granting information.</p>
     *          <p>Buckets that use the bucket owner enforced setting for Object Ownership don't support
     *          target grants. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html#grant-log-delivery-permissions-general">Permissions for server access log delivery</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    TargetGrants?: TargetGrant[] | undefined;
    /**
     * <p>A prefix for all log object keys. If you store log files from multiple Amazon S3 buckets in a
     *          single bucket, you can use a prefix to distinguish which log files came from which
     *          bucket.</p>
     * @public
     */
    TargetPrefix: string | undefined;
    /**
     * <p>Amazon S3 key format for log objects.</p>
     * @public
     */
    TargetObjectKeyFormat?: TargetObjectKeyFormat | undefined;
}
/**
 * @public
 */
export interface GetBucketLoggingOutput {
    /**
     * <p>Describes where logs are stored and the prefix that Amazon S3 assigns to all log object keys
     *          for a bucket. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTlogging.html">PUT Bucket logging</a> in the
     *             <i>Amazon S3 API Reference</i>.</p>
     * @public
     */
    LoggingEnabled?: LoggingEnabled | undefined;
}
/**
 * @public
 */
export interface GetBucketLoggingRequest {
    /**
     * <p>The bucket name for which to get the logging information.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>
 *          If the <code>CreateBucketMetadataTableConfiguration</code> request succeeds, but S3 Metadata was
 *          unable to create the table, this structure contains the error code and error message.
 *       </p>
 * @public
 */
export interface ErrorDetails {
    /**
     * <p>
     *          If the <code>CreateBucketMetadataTableConfiguration</code> request succeeds, but S3 Metadata was
     *          unable to create the table, this structure contains the error code. The possible error codes and
     *          error messages are as follows:
     *       </p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>AccessDeniedCreatingResources</code> - You don't have sufficient permissions to
     *                create the required resources. Make sure that you have <code>s3tables:CreateNamespace</code>,
     *                <code>s3tables:CreateTable</code>, <code>s3tables:GetTable</code> and
     *                <code>s3tables:PutTablePolicy</code> permissions, and then try again. To create a new metadata
     *                table, you must delete the metadata configuration for this bucket, and then create a new
     *                metadata configuration.
     *             </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AccessDeniedWritingToTable</code> - Unable to write to the metadata table because of
     *                missing resource permissions. To fix the resource policy, Amazon S3 needs to create a new
     *                metadata table. To create a new metadata table, you must delete the metadata configuration for
     *                this bucket, and then create a new metadata configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DestinationTableNotFound</code> - The destination table doesn't exist. To create a
     *                new metadata table, you must delete the metadata configuration for this bucket, and then
     *                create a new metadata configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ServerInternalError</code> - An internal error has occurred. To create a new metadata
     *                table, you must delete the metadata configuration for this bucket, and then create a new
     *                metadata configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TableAlreadyExists</code> - The table that you specified already exists in the table
     *                bucket's namespace. Specify a different table name. To create a new metadata table, you must
     *                delete the metadata configuration for this bucket, and then create a new metadata
     *                configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TableBucketNotFound</code> - The table bucket that you specified doesn't exist in
     *                this Amazon Web Services Region and account. Create or choose a different table bucket. To create a new
     *                metadata table, you must delete the metadata configuration for this bucket, and then create
     *                a new metadata configuration.</p>
     *             </li>
     *          </ul>
     * @public
     */
    ErrorCode?: string | undefined;
    /**
     * <p>
     *          If the <code>CreateBucketMetadataTableConfiguration</code> request succeeds, but S3 Metadata was
     *          unable to create the table, this structure contains the error message. The possible error codes and
     *          error messages are as follows:
     *       </p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>AccessDeniedCreatingResources</code> - You don't have sufficient permissions to
     *                create the required resources. Make sure that you have <code>s3tables:CreateNamespace</code>,
     *                <code>s3tables:CreateTable</code>, <code>s3tables:GetTable</code> and
     *                <code>s3tables:PutTablePolicy</code> permissions, and then try again. To create a new metadata
     *                table, you must delete the metadata configuration for this bucket, and then create a new
     *                metadata configuration.
     *             </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>AccessDeniedWritingToTable</code> - Unable to write to the metadata table because of
     *                missing resource permissions. To fix the resource policy, Amazon S3 needs to create a new
     *                metadata table. To create a new metadata table, you must delete the metadata configuration for
     *                this bucket, and then create a new metadata configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>DestinationTableNotFound</code> - The destination table doesn't exist. To create a
     *                new metadata table, you must delete the metadata configuration for this bucket, and then
     *                create a new metadata configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ServerInternalError</code> - An internal error has occurred. To create a new metadata
     *                table, you must delete the metadata configuration for this bucket, and then create a new
     *                metadata configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TableAlreadyExists</code> - The table that you specified already exists in the table
     *                bucket's namespace. Specify a different table name. To create a new metadata table, you must
     *                delete the metadata configuration for this bucket, and then create a new metadata
     *                configuration.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>TableBucketNotFound</code> - The table bucket that you specified doesn't exist in
     *                this Amazon Web Services Region and account. Create or choose a different table bucket. To create a new
     *                metadata table, you must delete the metadata configuration for this bucket, and then create
     *                a new metadata configuration.</p>
     *             </li>
     *          </ul>
     * @public
     */
    ErrorMessage?: string | undefined;
}
/**
 * <p>
 *          The destination information for the metadata table configuration. The destination table bucket
 *          must be in the same Region and Amazon Web Services account as the general purpose bucket. The specified metadata
 *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
 *          table bucket.
 *       </p>
 * @public
 */
export interface S3TablesDestinationResult {
    /**
     * <p>
     *          The Amazon Resource Name (ARN) for the table bucket that's specified as the
     *          destination in the metadata table configuration. The destination table bucket
     *          must be in the same Region and Amazon Web Services account as the general purpose bucket.
     *       </p>
     * @public
     */
    TableBucketArn: string | undefined;
    /**
     * <p>
     *          The name for the metadata table in your metadata table configuration. The specified metadata
     *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
     *          table bucket.
     *       </p>
     * @public
     */
    TableName: string | undefined;
    /**
     * <p>
     *          The Amazon Resource Name (ARN) for the metadata table in the metadata table configuration. The
     *          specified metadata table name must be unique within the <code>aws_s3_metadata</code> namespace
     *          in the destination table bucket.
     *       </p>
     * @public
     */
    TableArn: string | undefined;
    /**
     * <p>
     *          The table bucket namespace for the metadata table in your metadata table configuration. This value
     *          is always <code>aws_s3_metadata</code>.
     *       </p>
     * @public
     */
    TableNamespace: string | undefined;
}
/**
 * <p>
 *          The metadata table configuration for a general purpose bucket. The destination table bucket
 *          must be in the same Region and Amazon Web Services account as the general purpose bucket. The specified metadata
 *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
 *          table bucket.
 *       </p>
 * @public
 */
export interface MetadataTableConfigurationResult {
    /**
     * <p>
     *          The destination information for the metadata table configuration. The destination table bucket
     *          must be in the same Region and Amazon Web Services account as the general purpose bucket. The specified metadata
     *          table name must be unique within the <code>aws_s3_metadata</code> namespace in the destination
     *          table bucket.
     *       </p>
     * @public
     */
    S3TablesDestinationResult: S3TablesDestinationResult | undefined;
}
/**
 * <p>
 *          The metadata table configuration for a general purpose bucket.
 *       </p>
 * @public
 */
export interface GetBucketMetadataTableConfigurationResult {
    /**
     * <p>
     *          The metadata table configuration for a general purpose bucket.
     *       </p>
     * @public
     */
    MetadataTableConfigurationResult: MetadataTableConfigurationResult | undefined;
    /**
     * <p>
     *          The status of the metadata table. The status values are:
     *       </p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>CREATING</code> - The metadata table is in the process of being created in the
     *                specified table bucket.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>ACTIVE</code> - The metadata table has been created successfully and records
     *                are being delivered to the table.
     *             </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>FAILED</code> - Amazon S3 is unable to create the metadata table, or Amazon S3 is unable to deliver
     *                records. See <code>ErrorDetails</code> for details.</p>
     *             </li>
     *          </ul>
     * @public
     */
    Status: string | undefined;
    /**
     * <p>
     *          If the <code>CreateBucketMetadataTableConfiguration</code> request succeeds, but S3 Metadata was
     *          unable to create the table, this structure contains the error code and error message.
     *       </p>
     * @public
     */
    Error?: ErrorDetails | undefined;
}
/**
 * @public
 */
export interface GetBucketMetadataTableConfigurationOutput {
    /**
     * <p>
     *          The metadata table configuration for the general purpose bucket.
     *       </p>
     * @public
     */
    GetBucketMetadataTableConfigurationResult?: GetBucketMetadataTableConfigurationResult | undefined;
}
/**
 * @public
 */
export interface GetBucketMetadataTableConfigurationRequest {
    /**
     * <p>
     *          The general purpose bucket that contains the metadata table configuration that you want to retrieve.
     *       </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>
     *          The expected owner of the general purpose bucket that you want to retrieve the metadata table configuration from.
     *       </p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>A conjunction (logical AND) of predicates, which is used in evaluating a metrics filter.
 *          The operator must have at least two predicates, and an object must match all of the
 *          predicates in order for the filter to apply.</p>
 * @public
 */
export interface MetricsAndOperator {
    /**
     * <p>The prefix used when evaluating an AND predicate.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>The list of tags used when evaluating an AND predicate.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
    /**
     * <p>The access point ARN used when evaluating an <code>AND</code> predicate.</p>
     * @public
     */
    AccessPointArn?: string | undefined;
}
/**
 * <p>Specifies a metrics configuration filter. The metrics configuration only includes
 *          objects that meet the filter's criteria. A filter must be a prefix, an object tag, an
 *          access point ARN, or a conjunction (MetricsAndOperator). For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketMetricsConfiguration.html">PutBucketMetricsConfiguration</a>.</p>
 * @public
 */
export type MetricsFilter = MetricsFilter.AccessPointArnMember | MetricsFilter.AndMember | MetricsFilter.PrefixMember | MetricsFilter.TagMember | MetricsFilter.$UnknownMember;
/**
 * @public
 */
export declare namespace MetricsFilter {
    /**
     * <p>The prefix used when evaluating a metrics filter.</p>
     * @public
     */
    interface PrefixMember {
        Prefix: string;
        Tag?: never;
        AccessPointArn?: never;
        And?: never;
        $unknown?: never;
    }
    /**
     * <p>The tag used when evaluating a metrics filter.</p>
     * @public
     */
    interface TagMember {
        Prefix?: never;
        Tag: Tag;
        AccessPointArn?: never;
        And?: never;
        $unknown?: never;
    }
    /**
     * <p>The access point ARN used when evaluating a metrics filter.</p>
     * @public
     */
    interface AccessPointArnMember {
        Prefix?: never;
        Tag?: never;
        AccessPointArn: string;
        And?: never;
        $unknown?: never;
    }
    /**
     * <p>A conjunction (logical AND) of predicates, which is used in evaluating a metrics filter.
     *          The operator must have at least two predicates, and an object must match all of the
     *          predicates in order for the filter to apply.</p>
     * @public
     */
    interface AndMember {
        Prefix?: never;
        Tag?: never;
        AccessPointArn?: never;
        And: MetricsAndOperator;
        $unknown?: never;
    }
    /**
     * @public
     */
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
/**
 * <p>Specifies a metrics configuration for the CloudWatch request metrics (specified by the
 *          metrics configuration ID) from an Amazon S3 bucket. If you're updating an existing metrics
 *          configuration, note that this is a full replacement of the existing metrics configuration.
 *          If you don't include the elements you want to keep, they are erased. For more information,
 *          see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTMetricConfiguration.html">PutBucketMetricsConfiguration</a>.</p>
 * @public
 */
export interface MetricsConfiguration {
    /**
     * <p>The ID used to identify the metrics configuration. The ID has a 64 character limit and
     *          can only contain letters, numbers, periods, dashes, and underscores.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>Specifies a metrics configuration filter. The metrics configuration will only include
     *          objects that meet the filter's criteria. A filter must be a prefix, an object tag, an
     *          access point ARN, or a conjunction (MetricsAndOperator).</p>
     * @public
     */
    Filter?: MetricsFilter | undefined;
}
/**
 * @public
 */
export interface GetBucketMetricsConfigurationOutput {
    /**
     * <p>Specifies the metrics configuration.</p>
     * @public
     */
    MetricsConfiguration?: MetricsConfiguration | undefined;
}
/**
 * @public
 */
export interface GetBucketMetricsConfigurationRequest {
    /**
     * <p>The name of the bucket containing the metrics configuration to retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID used to identify the metrics configuration. The ID has a 64 character limit and
     *          can only contain letters, numbers, periods, dashes, and underscores.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface GetBucketNotificationConfigurationRequest {
    /**
     * <p>The name of the bucket for which to get the notification configuration.</p>
     *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
     *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
     * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
     * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
     *             Error Codes</a>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>A container for specifying the configuration for Amazon EventBridge.</p>
 * @public
 */
export interface EventBridgeConfiguration {
}
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type Event = (typeof Event)[keyof typeof Event];
/**
 * @public
 * @enum
 */
export declare const FilterRuleName: {
    readonly prefix: "prefix";
    readonly suffix: "suffix";
};
/**
 * @public
 */
export type FilterRuleName = (typeof FilterRuleName)[keyof typeof FilterRuleName];
/**
 * <p>Specifies the Amazon S3 object key name to filter on. An object key name is the name assigned
 *          to an object in your Amazon S3 bucket. You specify whether to filter on the suffix or prefix of
 *          the object key name. A prefix is a specific string of characters at the beginning of an
 *          object key name, which you can use to organize objects. For example, you can start the key
 *          names of related objects with a prefix, such as <code>2023-</code> or
 *             <code>engineering/</code>. Then, you can use <code>FilterRule</code> to find objects in
 *          a bucket with key names that have the same prefix. A suffix is similar to a prefix, but it
 *          is at the end of the object key name instead of at the beginning.</p>
 * @public
 */
export interface FilterRule {
    /**
     * <p>The object key name prefix or suffix identifying one or more objects to which the
     *          filtering rule applies. The maximum length is 1,024 characters. Overlapping prefixes and
     *          suffixes are not supported. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Configuring Event Notifications</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Name?: FilterRuleName | undefined;
    /**
     * <p>The value that the filter searches for in object key names.</p>
     * @public
     */
    Value?: string | undefined;
}
/**
 * <p>A container for object key name prefix and suffix filtering rules.</p>
 * @public
 */
export interface S3KeyFilter {
    /**
     * <p>A list of containers for the key-value pair that defines the criteria for the filter
     *          rule.</p>
     * @public
     */
    FilterRules?: FilterRule[] | undefined;
}
/**
 * <p>Specifies object key name filtering rules. For information about key name filtering, see
 *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html">Configuring event
 *             notifications using object key name filtering</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface NotificationConfigurationFilter {
    /**
     * <p>A container for object key name prefix and suffix filtering rules.</p>
     * @public
     */
    Key?: S3KeyFilter | undefined;
}
/**
 * <p>A container for specifying the configuration for Lambda notifications.</p>
 * @public
 */
export interface LambdaFunctionConfiguration {
    /**
     * <p>An optional unique identifier for configurations in a notification configuration. If you
     *          don't provide one, Amazon S3 will assign an ID.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Lambda function that Amazon S3 invokes when the
     *          specified event type occurs.</p>
     * @public
     */
    LambdaFunctionArn: string | undefined;
    /**
     * <p>The Amazon S3 bucket event for which to invoke the Lambda function. For more information,
     *          see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Supported
     *             Event Types</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Events: Event[] | undefined;
    /**
     * <p>Specifies object key name filtering rules. For information about key name filtering, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html">Configuring event
     *             notifications using object key name filtering</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Filter?: NotificationConfigurationFilter | undefined;
}
/**
 * <p>Specifies the configuration for publishing messages to an Amazon Simple Queue Service
 *          (Amazon SQS) queue when Amazon S3 detects specified events.</p>
 * @public
 */
export interface QueueConfiguration {
    /**
     * <p>An optional unique identifier for configurations in a notification configuration. If you
     *          don't provide one, Amazon S3 will assign an ID.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon SQS queue to which Amazon S3 publishes a message
     *          when it detects events of the specified type.</p>
     * @public
     */
    QueueArn: string | undefined;
    /**
     * <p>A collection of bucket events for which to send notifications</p>
     * @public
     */
    Events: Event[] | undefined;
    /**
     * <p>Specifies object key name filtering rules. For information about key name filtering, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html">Configuring event
     *             notifications using object key name filtering</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Filter?: NotificationConfigurationFilter | undefined;
}
/**
 * <p>A container for specifying the configuration for publication of messages to an Amazon
 *          Simple Notification Service (Amazon SNS) topic when Amazon S3 detects specified events.</p>
 * @public
 */
export interface TopicConfiguration {
    /**
     * <p>An optional unique identifier for configurations in a notification configuration. If you
     *          don't provide one, Amazon S3 will assign an ID.</p>
     * @public
     */
    Id?: string | undefined;
    /**
     * <p>The Amazon Resource Name (ARN) of the Amazon SNS topic to which Amazon S3 publishes a message
     *          when it detects events of the specified type.</p>
     * @public
     */
    TopicArn: string | undefined;
    /**
     * <p>The Amazon S3 bucket event about which to send notifications. For more information, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Supported
     *             Event Types</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Events: Event[] | undefined;
    /**
     * <p>Specifies object key name filtering rules. For information about key name filtering, see
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html">Configuring event
     *             notifications using object key name filtering</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Filter?: NotificationConfigurationFilter | undefined;
}
/**
 * <p>A container for specifying the notification configuration of the bucket. If this element
 *          is empty, notifications are turned off for the bucket.</p>
 * @public
 */
export interface NotificationConfiguration {
    /**
     * <p>The topic to which notifications are sent and the events for which notifications are
     *          generated.</p>
     * @public
     */
    TopicConfigurations?: TopicConfiguration[] | undefined;
    /**
     * <p>The Amazon Simple Queue Service queues to publish messages to and the events for which
     *          to publish messages.</p>
     * @public
     */
    QueueConfigurations?: QueueConfiguration[] | undefined;
    /**
     * <p>Describes the Lambda functions to invoke and the events for which to invoke
     *          them.</p>
     * @public
     */
    LambdaFunctionConfigurations?: LambdaFunctionConfiguration[] | undefined;
    /**
     * <p>Enables delivery of events to Amazon EventBridge.</p>
     * @public
     */
    EventBridgeConfiguration?: EventBridgeConfiguration | undefined;
}
/**
 * <p>The container element for an ownership control rule.</p>
 * @public
 */
export interface OwnershipControlsRule {
    /**
     * <p>The container element for object ownership for a bucket's ownership controls.</p>
     *          <p>
     *             <code>BucketOwnerPreferred</code> - Objects uploaded to the bucket change ownership to
     *          the bucket owner if the objects are uploaded with the
     *             <code>bucket-owner-full-control</code> canned ACL.</p>
     *          <p>
     *             <code>ObjectWriter</code> - The uploading account will own the object if the object is
     *          uploaded with the <code>bucket-owner-full-control</code> canned ACL.</p>
     *          <p>
     *             <code>BucketOwnerEnforced</code> - Access control lists (ACLs) are disabled and no
     *          longer affect permissions. The bucket owner automatically owns and has full control over
     *          every object in the bucket. The bucket only accepts PUT requests that don't specify an ACL
     *          or specify bucket owner full control ACLs (such as the predefined
     *             <code>bucket-owner-full-control</code> canned ACL or a custom ACL in XML format that
     *          grants the same permissions).</p>
     *          <p>By default, <code>ObjectOwnership</code> is set to <code>BucketOwnerEnforced</code> and
     *          ACLs are disabled. We recommend keeping ACLs disabled, except in uncommon use cases where
     *          you must control access for each object individually. For more information about S3 Object
     *          Ownership, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html">Controlling ownership of
     *             objects and disabling ACLs for your bucket</a> in the
     *             <i>Amazon S3 User Guide</i>. </p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets. Directory buckets use the bucket owner enforced setting for S3 Object Ownership.</p>
     *          </note>
     * @public
     */
    ObjectOwnership: ObjectOwnership | undefined;
}
/**
 * <p>The container element for a bucket's ownership controls.</p>
 * @public
 */
export interface OwnershipControls {
    /**
     * <p>The container element for an ownership control rule.</p>
     * @public
     */
    Rules: OwnershipControlsRule[] | undefined;
}
/**
 * @public
 */
export interface GetBucketOwnershipControlsOutput {
    /**
     * <p>The <code>OwnershipControls</code> (BucketOwnerEnforced, BucketOwnerPreferred, or
     *          ObjectWriter) currently in effect for this Amazon S3 bucket.</p>
     * @public
     */
    OwnershipControls?: OwnershipControls | undefined;
}
/**
 * @public
 */
export interface GetBucketOwnershipControlsRequest {
    /**
     * <p>The name of the Amazon S3 bucket whose <code>OwnershipControls</code> you want to retrieve.
     *       </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface GetBucketPolicyOutput {
    /**
     * <p>The bucket policy as a JSON document.</p>
     * @public
     */
    Policy?: string | undefined;
}
/**
 * @public
 */
export interface GetBucketPolicyRequest {
    /**
     * <p>The bucket name to get the bucket policy for.</p>
     *          <p>
     *             <b>Directory buckets </b> - When you use this operation with a directory bucket, you must use path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
     *             </code>. Virtual-hosted-style requests aren't supported. Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must also follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>DOC-EXAMPLE-BUCKET</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming rules</a> in the <i>Amazon S3 User Guide</i>
     *          </p>
     *          <p>
     *             <b>Access points</b> - When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
     *          <p>
     *             <b>Object Lambda access points</b> - When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
     * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
     * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
     *             Error Codes</a>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     *          <note>
     *             <p>For directory buckets, this header is not supported in this API operation. If you specify this header, the request fails with the HTTP status code
     * <code>501 Not Implemented</code>.</p>
     *          </note>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>The container element for a bucket's policy status.</p>
 * @public
 */
export interface PolicyStatus {
    /**
     * <p>The policy status for this bucket. <code>TRUE</code> indicates that this bucket is
     *          public. <code>FALSE</code> indicates that the bucket is not public.</p>
     * @public
     */
    IsPublic?: boolean | undefined;
}
/**
 * @public
 */
export interface GetBucketPolicyStatusOutput {
    /**
     * <p>The policy status for the specified bucket.</p>
     * @public
     */
    PolicyStatus?: PolicyStatus | undefined;
}
/**
 * @public
 */
export interface GetBucketPolicyStatusRequest {
    /**
     * <p>The name of the Amazon S3 bucket whose policy status you want to retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const DeleteMarkerReplicationStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type DeleteMarkerReplicationStatus = (typeof DeleteMarkerReplicationStatus)[keyof typeof DeleteMarkerReplicationStatus];
/**
 * <p>Specifies whether Amazon S3 replicates delete markers. If you specify a <code>Filter</code>
 *          in your replication configuration, you must also include a
 *             <code>DeleteMarkerReplication</code> element. If your <code>Filter</code> includes a
 *             <code>Tag</code> element, the <code>DeleteMarkerReplication</code>
 *             <code>Status</code> must be set to Disabled, because Amazon S3 does not support replicating
 *          delete markers for tag-based rules. For an example configuration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-add-config.html#replication-config-min-rule-config">Basic Rule Configuration</a>. </p>
 *          <p>For more information about delete marker replication, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/delete-marker-replication.html">Basic Rule
 *             Configuration</a>. </p>
 *          <note>
 *             <p>If you are using an earlier version of the replication configuration, Amazon S3 handles
 *             replication of delete markers differently. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-add-config.html#replication-backward-compat-considerations">Backward Compatibility</a>.</p>
 *          </note>
 * @public
 */
export interface DeleteMarkerReplication {
    /**
     * <p>Indicates whether to replicate delete markers.</p>
     *          <note>
     *             <p>Indicates whether to replicate delete markers.</p>
     *          </note>
     * @public
     */
    Status?: DeleteMarkerReplicationStatus | undefined;
}
/**
 * <p>Specifies encryption-related information for an Amazon S3 bucket that is a destination for
 *          replicated objects.</p>
 *          <note>
 *             <p>If you're specifying a customer managed KMS key, we recommend using a fully
 *             qualified KMS key ARN. If you use a KMS key alias instead, then KMS resolves the
 *             key within the requester’s account. This behavior can result in data that's encrypted
 *             with a KMS key that belongs to the requester, and not the bucket owner.</p>
 *          </note>
 * @public
 */
export interface EncryptionConfiguration {
    /**
     * <p>Specifies the ID (Key ARN or Alias ARN) of the customer managed Amazon Web Services KMS key stored in
     *          Amazon Web Services Key Management Service (KMS) for the destination bucket. Amazon S3 uses this key to
     *          encrypt replica objects. Amazon S3 only supports symmetric encryption KMS keys. For more
     *          information, see <a href="https://docs.aws.amazon.com/kms/latest/developerguide/symmetric-asymmetric.html">Asymmetric keys in Amazon Web Services
     *             KMS</a> in the <i>Amazon Web Services Key Management Service Developer
     *          Guide</i>.</p>
     * @public
     */
    ReplicaKmsKeyID?: string | undefined;
}
/**
 * <p> A container specifying the time value for S3 Replication Time Control (S3 RTC) and replication metrics
 *             <code>EventThreshold</code>. </p>
 * @public
 */
export interface ReplicationTimeValue {
    /**
     * <p> Contains an integer specifying time in minutes. </p>
     *          <p> Valid value: 15</p>
     * @public
     */
    Minutes?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MetricsStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type MetricsStatus = (typeof MetricsStatus)[keyof typeof MetricsStatus];
/**
 * <p> A container specifying replication metrics-related settings enabling replication
 *          metrics and events.</p>
 * @public
 */
export interface Metrics {
    /**
     * <p> Specifies whether the replication metrics are enabled. </p>
     * @public
     */
    Status: MetricsStatus | undefined;
    /**
     * <p> A container specifying the time threshold for emitting the
     *             <code>s3:Replication:OperationMissedThreshold</code> event. </p>
     * @public
     */
    EventThreshold?: ReplicationTimeValue | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReplicationTimeStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type ReplicationTimeStatus = (typeof ReplicationTimeStatus)[keyof typeof ReplicationTimeStatus];
/**
 * <p> A container specifying S3 Replication Time Control (S3 RTC) related information, including whether S3 RTC is
 *          enabled and the time when all objects and operations on objects must be replicated. Must be
 *          specified together with a <code>Metrics</code> block. </p>
 * @public
 */
export interface ReplicationTime {
    /**
     * <p> Specifies whether the replication time is enabled. </p>
     * @public
     */
    Status: ReplicationTimeStatus | undefined;
    /**
     * <p> A container specifying the time by which replication should be complete for all objects
     *          and operations on objects. </p>
     * @public
     */
    Time: ReplicationTimeValue | undefined;
}
/**
 * <p>Specifies information about where to publish analysis or configuration results for an
 *          Amazon S3 bucket and S3 Replication Time Control (S3 RTC).</p>
 * @public
 */
export interface Destination {
    /**
     * <p> The Amazon Resource Name (ARN) of the bucket where you want Amazon S3 to store the
     *          results.</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Destination bucket owner account ID. In a cross-account scenario, if you direct Amazon S3 to
     *          change replica ownership to the Amazon Web Services account that owns the destination bucket by
     *          specifying the <code>AccessControlTranslation</code> property, this is the account ID of
     *          the destination bucket owner. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-change-owner.html">Replication Additional
     *             Configuration: Changing the Replica Owner</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Account?: string | undefined;
    /**
     * <p> The storage class to use when replicating objects, such as S3 Standard or reduced
     *          redundancy. By default, Amazon S3 uses the storage class of the source object to create the
     *          object replica. </p>
     *          <p>For valid values, see the <code>StorageClass</code> element of the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTreplication.html">PUT Bucket
     *             replication</a> action in the <i>Amazon S3 API Reference</i>.</p>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>Specify this only in a cross-account scenario (where source and destination bucket
     *          owners are not the same), and you want to change replica ownership to the Amazon Web Services account
     *          that owns the destination bucket. If this is not specified in the replication
     *          configuration, the replicas are owned by same Amazon Web Services account that owns the source
     *          object.</p>
     * @public
     */
    AccessControlTranslation?: AccessControlTranslation | undefined;
    /**
     * <p>A container that provides information about encryption. If
     *             <code>SourceSelectionCriteria</code> is specified, you must specify this element.</p>
     * @public
     */
    EncryptionConfiguration?: EncryptionConfiguration | undefined;
    /**
     * <p> A container specifying S3 Replication Time Control (S3 RTC), including whether S3 RTC is enabled and the time
     *          when all objects and operations on objects must be replicated. Must be specified together
     *          with a <code>Metrics</code> block. </p>
     * @public
     */
    ReplicationTime?: ReplicationTime | undefined;
    /**
     * <p> A container specifying replication metrics-related settings enabling replication
     *          metrics and events. </p>
     * @public
     */
    Metrics?: Metrics | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ExistingObjectReplicationStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type ExistingObjectReplicationStatus = (typeof ExistingObjectReplicationStatus)[keyof typeof ExistingObjectReplicationStatus];
/**
 * <p>Optional configuration to replicate existing source bucket objects. </p>
 *          <note>
 *             <p>This parameter is no longer supported. To replicate existing objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-batch-replication-batch.html">Replicating existing objects with S3 Batch Replication</a> in the
 *                <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 * @public
 */
export interface ExistingObjectReplication {
    /**
     * <p>Specifies whether Amazon S3 replicates existing source bucket objects. </p>
     * @public
     */
    Status: ExistingObjectReplicationStatus | undefined;
}
/**
 * <p>A container for specifying rule filters. The filters determine the subset of objects to
 *          which the rule applies. This element is required only if you specify more than one filter. </p>
 *          <p>For example:</p>
 *          <ul>
 *             <li>
 *                <p>If you specify both a <code>Prefix</code> and a <code>Tag</code> filter, wrap
 *                these filters in an <code>And</code> tag. </p>
 *             </li>
 *             <li>
 *                <p>If you specify a filter based on multiple tags, wrap the <code>Tag</code> elements
 *                in an <code>And</code> tag.</p>
 *             </li>
 *          </ul>
 * @public
 */
export interface ReplicationRuleAndOperator {
    /**
     * <p>An object key name prefix that identifies the subset of objects to which the rule
     *          applies.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>An array of tags containing key and value pairs.</p>
     * @public
     */
    Tags?: Tag[] | undefined;
}
/**
 * <p>A filter that identifies the subset of objects to which the replication rule applies. A
 *             <code>Filter</code> must specify exactly one <code>Prefix</code>, <code>Tag</code>, or
 *          an <code>And</code> child element.</p>
 * @public
 */
export interface ReplicationRuleFilter {
    /**
     * <p>An object key name prefix that identifies the subset of objects to which the rule
     *          applies.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>A container for specifying a tag key and value. </p>
     *          <p>The rule applies only to objects that have the tag in their tag set.</p>
     * @public
     */
    Tag?: Tag | undefined;
    /**
     * <p>A container for specifying rule filters. The filters determine the subset of objects to
     *          which the rule applies. This element is required only if you specify more than one filter.
     *          For example: </p>
     *          <ul>
     *             <li>
     *                <p>If you specify both a <code>Prefix</code> and a <code>Tag</code> filter, wrap
     *                these filters in an <code>And</code> tag.</p>
     *             </li>
     *             <li>
     *                <p>If you specify a filter based on multiple tags, wrap the <code>Tag</code> elements
     *                in an <code>And</code> tag.</p>
     *             </li>
     *          </ul>
     * @public
     */
    And?: ReplicationRuleAndOperator | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReplicaModificationsStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type ReplicaModificationsStatus = (typeof ReplicaModificationsStatus)[keyof typeof ReplicaModificationsStatus];
/**
 * <p>A filter that you can specify for selection for modifications on replicas. Amazon S3 doesn't
 *          replicate replica modifications by default. In the latest version of replication
 *          configuration (when <code>Filter</code> is specified), you can specify this element and set
 *          the status to <code>Enabled</code> to replicate modifications on replicas. </p>
 *          <note>
 *             <p> If you don't specify the <code>Filter</code> element, Amazon S3 assumes that the
 *             replication configuration is the earlier version, V1. In the earlier version, this
 *             element is not allowed.</p>
 *          </note>
 * @public
 */
export interface ReplicaModifications {
    /**
     * <p>Specifies whether Amazon S3 replicates modifications on replicas.</p>
     * @public
     */
    Status: ReplicaModificationsStatus | undefined;
}
/**
 * @public
 * @enum
 */
export declare const SseKmsEncryptedObjectsStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type SseKmsEncryptedObjectsStatus = (typeof SseKmsEncryptedObjectsStatus)[keyof typeof SseKmsEncryptedObjectsStatus];
/**
 * <p>A container for filter information for the selection of S3 objects encrypted with Amazon Web Services
 *          KMS.</p>
 * @public
 */
export interface SseKmsEncryptedObjects {
    /**
     * <p>Specifies whether Amazon S3 replicates objects created with server-side encryption using an
     *          Amazon Web Services KMS key stored in Amazon Web Services Key Management Service.</p>
     * @public
     */
    Status: SseKmsEncryptedObjectsStatus | undefined;
}
/**
 * <p>A container that describes additional filters for identifying the source objects that
 *          you want to replicate. You can choose to enable or disable the replication of these
 *          objects. Currently, Amazon S3 supports only the filter that you can specify for objects created
 *          with server-side encryption using a customer managed key stored in Amazon Web Services Key Management Service
 *          (SSE-KMS).</p>
 * @public
 */
export interface SourceSelectionCriteria {
    /**
     * <p> A container for filter information for the selection of Amazon S3 objects encrypted with
     *          Amazon Web Services KMS. If you include <code>SourceSelectionCriteria</code> in the replication
     *          configuration, this element is required. </p>
     * @public
     */
    SseKmsEncryptedObjects?: SseKmsEncryptedObjects | undefined;
    /**
     * <p>A filter that you can specify for selections for modifications on replicas. Amazon S3 doesn't
     *          replicate replica modifications by default. In the latest version of replication
     *          configuration (when <code>Filter</code> is specified), you can specify this element and set
     *          the status to <code>Enabled</code> to replicate modifications on replicas. </p>
     *          <note>
     *             <p> If you don't specify the <code>Filter</code> element, Amazon S3 assumes that the
     *             replication configuration is the earlier version, V1. In the earlier version, this
     *             element is not allowed</p>
     *          </note>
     * @public
     */
    ReplicaModifications?: ReplicaModifications | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReplicationRuleStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type ReplicationRuleStatus = (typeof ReplicationRuleStatus)[keyof typeof ReplicationRuleStatus];
/**
 * <p>Specifies which Amazon S3 objects to replicate and where to store the replicas.</p>
 * @public
 */
export interface ReplicationRule {
    /**
     * <p>A unique identifier for the rule. The maximum value is 255 characters.</p>
     * @public
     */
    ID?: string | undefined;
    /**
     * <p>The priority indicates which rule has precedence whenever two or more replication rules
     *          conflict. Amazon S3 will attempt to replicate objects according to all replication rules.
     *          However, if there are two or more rules with the same destination bucket, then objects will
     *          be replicated according to the rule with the highest priority. The higher the number, the
     *          higher the priority. </p>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication.html">Replication</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Priority?: number | undefined;
    /**
     * <p>An object key name prefix that identifies the object or objects to which the rule
     *          applies. The maximum prefix length is 1,024 characters. To include all objects in a bucket,
     *          specify an empty string. </p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     *
     * @deprecated
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>A filter that identifies the subset of objects to which the replication rule applies. A
     *             <code>Filter</code> must specify exactly one <code>Prefix</code>, <code>Tag</code>, or
     *          an <code>And</code> child element.</p>
     * @public
     */
    Filter?: ReplicationRuleFilter | undefined;
    /**
     * <p>Specifies whether the rule is enabled.</p>
     * @public
     */
    Status: ReplicationRuleStatus | undefined;
    /**
     * <p>A container that describes additional filters for identifying the source objects that
     *          you want to replicate. You can choose to enable or disable the replication of these
     *          objects. Currently, Amazon S3 supports only the filter that you can specify for objects created
     *          with server-side encryption using a customer managed key stored in Amazon Web Services Key Management Service
     *          (SSE-KMS).</p>
     * @public
     */
    SourceSelectionCriteria?: SourceSelectionCriteria | undefined;
    /**
     * <p>Optional configuration to replicate existing source bucket objects. </p>
     *          <note>
     *             <p>This parameter is no longer supported. To replicate existing objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-batch-replication-batch.html">Replicating existing objects with S3 Batch Replication</a> in the
     *                <i>Amazon S3 User Guide</i>.</p>
     *          </note>
     * @public
     */
    ExistingObjectReplication?: ExistingObjectReplication | undefined;
    /**
     * <p>A container for information about the replication destination and its configurations
     *          including enabling the S3 Replication Time Control (S3 RTC).</p>
     * @public
     */
    Destination: Destination | undefined;
    /**
     * <p>Specifies whether Amazon S3 replicates delete markers. If you specify a <code>Filter</code>
     *          in your replication configuration, you must also include a
     *             <code>DeleteMarkerReplication</code> element. If your <code>Filter</code> includes a
     *             <code>Tag</code> element, the <code>DeleteMarkerReplication</code>
     *             <code>Status</code> must be set to Disabled, because Amazon S3 does not support replicating
     *          delete markers for tag-based rules. For an example configuration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-add-config.html#replication-config-min-rule-config">Basic Rule Configuration</a>. </p>
     *          <p>For more information about delete marker replication, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/delete-marker-replication.html">Basic Rule
     *             Configuration</a>. </p>
     *          <note>
     *             <p>If you are using an earlier version of the replication configuration, Amazon S3 handles
     *             replication of delete markers differently. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-add-config.html#replication-backward-compat-considerations">Backward Compatibility</a>.</p>
     *          </note>
     * @public
     */
    DeleteMarkerReplication?: DeleteMarkerReplication | undefined;
}
/**
 * <p>A container for replication rules. You can add up to 1,000 rules. The maximum size of a
 *          replication configuration is 2 MB.</p>
 * @public
 */
export interface ReplicationConfiguration {
    /**
     * <p>The Amazon Resource Name (ARN) of the Identity and Access Management (IAM) role that Amazon S3 assumes when
     *          replicating objects. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-how-setup.html">How to Set Up Replication</a>
     *          in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    Role: string | undefined;
    /**
     * <p>A container for one or more replication rules. A replication configuration must have at
     *          least one rule and can contain a maximum of 1,000 rules. </p>
     * @public
     */
    Rules: ReplicationRule[] | undefined;
}
/**
 * @public
 */
export interface GetBucketReplicationOutput {
    /**
     * <p>A container for replication rules. You can add up to 1,000 rules. The maximum size of a
     *          replication configuration is 2 MB.</p>
     * @public
     */
    ReplicationConfiguration?: ReplicationConfiguration | undefined;
}
/**
 * @public
 */
export interface GetBucketReplicationRequest {
    /**
     * <p>The bucket name for which to get the replication information.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Payer: {
    readonly BucketOwner: "BucketOwner";
    readonly Requester: "Requester";
};
/**
 * @public
 */
export type Payer = (typeof Payer)[keyof typeof Payer];
/**
 * @public
 */
export interface GetBucketRequestPaymentOutput {
    /**
     * <p>Specifies who pays for the download and request fees.</p>
     * @public
     */
    Payer?: Payer | undefined;
}
/**
 * @public
 */
export interface GetBucketRequestPaymentRequest {
    /**
     * <p>The name of the bucket for which to get the payment request configuration</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface GetBucketTaggingOutput {
    /**
     * <p>Contains the tag set.</p>
     * @public
     */
    TagSet: Tag[] | undefined;
}
/**
 * @public
 */
export interface GetBucketTaggingRequest {
    /**
     * <p>The name of the bucket for which to get the tagging information.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const MFADeleteStatus: {
    readonly Disabled: "Disabled";
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type MFADeleteStatus = (typeof MFADeleteStatus)[keyof typeof MFADeleteStatus];
/**
 * @public
 * @enum
 */
export declare const BucketVersioningStatus: {
    readonly Enabled: "Enabled";
    readonly Suspended: "Suspended";
};
/**
 * @public
 */
export type BucketVersioningStatus = (typeof BucketVersioningStatus)[keyof typeof BucketVersioningStatus];
/**
 * @public
 */
export interface GetBucketVersioningOutput {
    /**
     * <p>The versioning state of the bucket.</p>
     * @public
     */
    Status?: BucketVersioningStatus | undefined;
    /**
     * <p>Specifies whether MFA delete is enabled in the bucket versioning configuration. This
     *          element is only returned if the bucket has been configured with MFA delete. If the bucket
     *          has never been so configured, this element is not returned.</p>
     * @public
     */
    MFADelete?: MFADeleteStatus | undefined;
}
/**
 * @public
 */
export interface GetBucketVersioningRequest {
    /**
     * <p>The name of the bucket for which to get the versioning information.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>The error information.</p>
 * @public
 */
export interface ErrorDocument {
    /**
     * <p>The object key name to use when a 4XX class error occurs.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    Key: string | undefined;
}
/**
 * <p>Container for the <code>Suffix</code> element.</p>
 * @public
 */
export interface IndexDocument {
    /**
     * <p>A suffix that is appended to a request that is for a directory on the website endpoint.
     *          (For example, if the suffix is <code>index.html</code> and you make a request to
     *             <code>samplebucket/images/</code>, the data that is returned will be for the object with
     *          the key name <code>images/index.html</code>.) The suffix must not be empty and must not
     *          include a slash character.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    Suffix: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const Protocol: {
    readonly http: "http";
    readonly https: "https";
};
/**
 * @public
 */
export type Protocol = (typeof Protocol)[keyof typeof Protocol];
/**
 * <p>Specifies the redirect behavior of all requests to a website endpoint of an Amazon S3
 *          bucket.</p>
 * @public
 */
export interface RedirectAllRequestsTo {
    /**
     * <p>Name of the host where requests are redirected.</p>
     * @public
     */
    HostName: string | undefined;
    /**
     * <p>Protocol to use when redirecting requests. The default is the protocol that is used in
     *          the original request.</p>
     * @public
     */
    Protocol?: Protocol | undefined;
}
/**
 * <p>A container for describing a condition that must be met for the specified redirect to
 *          apply. For example, 1. If request is for pages in the <code>/docs</code> folder, redirect
 *          to the <code>/documents</code> folder. 2. If request results in HTTP error 4xx, redirect
 *          request to another host where you might process the error.</p>
 * @public
 */
export interface Condition {
    /**
     * <p>The HTTP error code when the redirect is applied. In the event of an error, if the error
     *          code equals this value, then the specified redirect is applied. Required when parent
     *          element <code>Condition</code> is specified and sibling <code>KeyPrefixEquals</code> is not
     *          specified. If both are specified, then both must be true for the redirect to be
     *          applied.</p>
     * @public
     */
    HttpErrorCodeReturnedEquals?: string | undefined;
    /**
     * <p>The object key name prefix when the redirect is applied. For example, to redirect
     *          requests for <code>ExamplePage.html</code>, the key prefix will be
     *             <code>ExamplePage.html</code>. To redirect request for all pages with the prefix
     *             <code>docs/</code>, the key prefix will be <code>/docs</code>, which identifies all
     *          objects in the <code>docs/</code> folder. Required when the parent element
     *             <code>Condition</code> is specified and sibling <code>HttpErrorCodeReturnedEquals</code>
     *          is not specified. If both conditions are specified, both must be true for the redirect to
     *          be applied.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    KeyPrefixEquals?: string | undefined;
}
/**
 * <p>Specifies how requests are redirected. In the event of an error, you can specify a
 *          different error code to return.</p>
 * @public
 */
export interface Redirect {
    /**
     * <p>The host name to use in the redirect request.</p>
     * @public
     */
    HostName?: string | undefined;
    /**
     * <p>The HTTP redirect code to use on the response. Not required if one of the siblings is
     *          present.</p>
     * @public
     */
    HttpRedirectCode?: string | undefined;
    /**
     * <p>Protocol to use when redirecting requests. The default is the protocol that is used in
     *          the original request.</p>
     * @public
     */
    Protocol?: Protocol | undefined;
    /**
     * <p>The object key prefix to use in the redirect request. For example, to redirect requests
     *          for all pages with prefix <code>docs/</code> (objects in the <code>docs/</code> folder) to
     *             <code>documents/</code>, you can set a condition block with <code>KeyPrefixEquals</code>
     *          set to <code>docs/</code> and in the Redirect set <code>ReplaceKeyPrefixWith</code> to
     *             <code>/documents</code>. Not required if one of the siblings is present. Can be present
     *          only if <code>ReplaceKeyWith</code> is not provided.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    ReplaceKeyPrefixWith?: string | undefined;
    /**
     * <p>The specific object key to use in the redirect request. For example, redirect request to
     *             <code>error.html</code>. Not required if one of the siblings is present. Can be present
     *          only if <code>ReplaceKeyPrefixWith</code> is not provided.</p>
     *          <important>
     *             <p>Replacement must be made for object keys containing special characters (such as carriage returns) when using
     *          XML requests. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints">
     *             XML related object key constraints</a>.</p>
     *          </important>
     * @public
     */
    ReplaceKeyWith?: string | undefined;
}
/**
 * <p>Specifies the redirect behavior and when a redirect is applied. For more information
 *          about routing rules, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html#advanced-conditional-redirects">Configuring advanced conditional redirects</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export interface RoutingRule {
    /**
     * <p>A container for describing a condition that must be met for the specified redirect to
     *          apply. For example, 1. If request is for pages in the <code>/docs</code> folder, redirect
     *          to the <code>/documents</code> folder. 2. If request results in HTTP error 4xx, redirect
     *          request to another host where you might process the error.</p>
     * @public
     */
    Condition?: Condition | undefined;
    /**
     * <p>Container for redirect information. You can redirect requests to another host, to
     *          another page, or with another protocol. In the event of an error, you can specify a
     *          different error code to return.</p>
     * @public
     */
    Redirect: Redirect | undefined;
}
/**
 * @public
 */
export interface GetBucketWebsiteOutput {
    /**
     * <p>Specifies the redirect behavior of all requests to a website endpoint of an Amazon S3
     *          bucket.</p>
     * @public
     */
    RedirectAllRequestsTo?: RedirectAllRequestsTo | undefined;
    /**
     * <p>The name of the index document for the website (for example
     *          <code>index.html</code>).</p>
     * @public
     */
    IndexDocument?: IndexDocument | undefined;
    /**
     * <p>The object key name of the website error document to use for 4XX class errors.</p>
     * @public
     */
    ErrorDocument?: ErrorDocument | undefined;
    /**
     * <p>Rules that define when a redirect is applied and the redirect behavior.</p>
     * @public
     */
    RoutingRules?: RoutingRule[] | undefined;
}
/**
 * @public
 */
export interface GetBucketWebsiteRequest {
    /**
     * <p>The bucket name for which to get the website configuration.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ReplicationStatus: {
    readonly COMPLETE: "COMPLETE";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "FAILED";
    readonly PENDING: "PENDING";
    readonly REPLICA: "REPLICA";
};
/**
 * @public
 */
export type ReplicationStatus = (typeof ReplicationStatus)[keyof typeof ReplicationStatus];
/**
 * @public
 */
export interface GetObjectOutput {
    /**
     * <p>Object data.</p>
     * @public
     */
    Body?: StreamingBlobTypes | undefined;
    /**
     * <p>Indicates whether the object retrieved was (true) or was not (false) a Delete Marker. If
     *          false, this response header does not appear in the response.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>If the current version of the object is a delete marker, Amazon S3 behaves as if the
     *                   object was deleted and includes <code>x-amz-delete-marker: true</code> in the
     *                   response.</p>
     *                </li>
     *                <li>
     *                   <p>If the specified version in the request is a delete marker, the response
     *                   returns a <code>405 Method Not Allowed</code> error and the <code>Last-Modified:
     *                      timestamp</code> response header.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    DeleteMarker?: boolean | undefined;
    /**
     * <p>Indicates that a range of bytes was specified in the request.</p>
     * @public
     */
    AcceptRanges?: string | undefined;
    /**
     * <p>If the object expiration is configured (see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html">
     *                <code>PutBucketLifecycleConfiguration</code>
     *             </a>), the response includes this
     *          header. It includes the <code>expiry-date</code> and <code>rule-id</code> key-value pairs
     *          providing object expiration information. The value of the <code>rule-id</code> is
     *          URL-encoded.</p>
     *          <note>
     *             <p>Object expiration information is not returned in directory buckets and this header returns the value "<code>NotImplemented</code>" in all responses for directory buckets.</p>
     *          </note>
     * @public
     */
    Expiration?: string | undefined;
    /**
     * <p>Provides information about object restoration action and expiration time of the restored
     *          object copy.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    Restore?: string | undefined;
    /**
     * <p>Date and time when the object was last modified.</p>
     *          <p>
     *             <b>General purpose buckets </b> - When you specify a
     *             <code>versionId</code> of the object in your request, if the specified version in the
     *          request is a delete marker, the response returns a <code>405 Method Not Allowed</code>
     *          error and the <code>Last-Modified: timestamp</code> response header.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>Size of the body in bytes.</p>
     * @public
     */
    ContentLength?: number | undefined;
    /**
     * <p>An entity tag (ETag) is an opaque identifier assigned by a web server to a specific
     *          version of a resource found at a URL.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32</code> checksum of the object. This checksum is only present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the object. This will only be present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the object. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
    /**
     * <p>The checksum type, which determines how part-level checksums are combined to create an
     *          object-level checksum for multipart objects. You can use this header response to verify
     *          that the checksum type that is received is the same checksum type that was specified in the
     *             <code>CreateMultipartUpload</code> request. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p>This is set to the number of metadata entries not returned in the headers that are
     *          prefixed with <code>x-amz-meta-</code>. This can happen if you create metadata using an API
     *          like SOAP that supports more flexible metadata than the REST API. For example, using SOAP,
     *          you can create metadata whose values are not legal HTTP headers.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    MissingMeta?: number | undefined;
    /**
     * <p>Version ID of the object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Specifies caching behavior along the request/reply chain.</p>
     * @public
     */
    CacheControl?: string | undefined;
    /**
     * <p>Specifies presentational information for the object.</p>
     * @public
     */
    ContentDisposition?: string | undefined;
    /**
     * <p>Indicates what content encodings have been applied to the object and thus what decoding
     *          mechanisms must be applied to obtain the media-type referenced by the Content-Type header
     *          field.</p>
     * @public
     */
    ContentEncoding?: string | undefined;
    /**
     * <p>The language the content is in.</p>
     * @public
     */
    ContentLanguage?: string | undefined;
    /**
     * <p>The portion of the object returned in the response.</p>
     * @public
     */
    ContentRange?: string | undefined;
    /**
     * <p>A standard MIME type describing the format of the object data.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * Deprecated in favor of ExpiresString.
     *
     * @deprecated
     * @public
     */
    Expires?: Date | undefined;
    /**
     * <p>The date and time at which the object is no longer cacheable.</p>
     * @public
     */
    ExpiresString?: string | undefined;
    /**
     * <p>If the bucket is configured as a website, redirects requests for this object to another
     *          object in the same bucket or to an external URL. Amazon S3 stores the value of this header in
     *          the object metadata.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    WebsiteRedirectLocation?: string | undefined;
    /**
     * <p>The server-side encryption algorithm used when you store this object in Amazon S3.</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>A map of metadata to store with the object in S3.</p>
     * @public
     */
    Metadata?: Record<string, string> | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to confirm the encryption algorithm that's used.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to provide the round-trip message integrity verification
     *          of the customer-provided encryption key.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>If present, indicates the ID of the KMS key that was used for object encryption.</p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>Indicates whether the object uses an S3 Bucket Key for server-side encryption with
     *          Key Management Service (KMS) keys (SSE-KMS).</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>Provides storage class information of the object. Amazon S3 returns this header for all
     *          objects except for S3 Standard storage class objects.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets </b> -
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
    /**
     * <p>Amazon S3 can return this if your request involves a bucket that is either a source or
     *          destination in a replication rule.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ReplicationStatus?: ReplicationStatus | undefined;
    /**
     * <p>The count of parts this object has. This value is only returned if you specify
     *             <code>partNumber</code> in your request and the object was uploaded as a multipart
     *          upload.</p>
     * @public
     */
    PartsCount?: number | undefined;
    /**
     * <p>The number of tags, if any, on the object, when you have the relevant permission to read
     *          object tags.</p>
     *          <p>You can use <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectTagging.html">GetObjectTagging</a> to retrieve
     *          the tag set associated with an object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    TagCount?: number | undefined;
    /**
     * <p>The Object Lock mode that's currently in place for this object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockMode?: ObjectLockMode | undefined;
    /**
     * <p>The date and time when this object's Object Lock will expire.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockRetainUntilDate?: Date | undefined;
    /**
     * <p>Indicates whether this object has an active legal hold. This field is only returned if
     *          you have permission to view an object's legal hold status. </p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ChecksumMode: {
    readonly ENABLED: "ENABLED";
};
/**
 * @public
 */
export type ChecksumMode = (typeof ChecksumMode)[keyof typeof ChecksumMode];
/**
 * @public
 */
export interface GetObjectRequest {
    /**
     * <p>The bucket name containing the object. </p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Object Lambda access points</b> - When you use this action with an Object Lambda access point, you must direct requests to the Object Lambda access point hostname. The Object Lambda access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-object-lambda.<i>Region</i>.amazonaws.com.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Return the object only if its entity tag (ETag) is the same as the one specified in this
     *          header; otherwise, return a <code>412 Precondition Failed</code> error.</p>
     *          <p>If both of the <code>If-Match</code> and <code>If-Unmodified-Since</code> headers are
     *          present in the request as follows: <code>If-Match</code> condition evaluates to
     *             <code>true</code>, and; <code>If-Unmodified-Since</code> condition evaluates to
     *             <code>false</code>; then, S3 returns <code>200 OK</code> and the data requested. </p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfMatch?: string | undefined;
    /**
     * <p>Return the object only if it has been modified since the specified time; otherwise,
     *          return a <code>304 Not Modified</code> error.</p>
     *          <p>If both of the <code>If-None-Match</code> and <code>If-Modified-Since</code> headers are
     *          present in the request as follows:<code> If-None-Match</code> condition evaluates to
     *             <code>false</code>, and; <code>If-Modified-Since</code> condition evaluates to
     *             <code>true</code>; then, S3 returns <code>304 Not Modified</code> status code.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfModifiedSince?: Date | undefined;
    /**
     * <p>Return the object only if its entity tag (ETag) is different from the one specified in
     *          this header; otherwise, return a <code>304 Not Modified</code> error.</p>
     *          <p>If both of the <code>If-None-Match</code> and <code>If-Modified-Since</code> headers are
     *          present in the request as follows:<code> If-None-Match</code> condition evaluates to
     *             <code>false</code>, and; <code>If-Modified-Since</code> condition evaluates to
     *             <code>true</code>; then, S3 returns <code>304 Not Modified</code> HTTP status
     *          code.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfNoneMatch?: string | undefined;
    /**
     * <p>Return the object only if it has not been modified since the specified time; otherwise,
     *          return a <code>412 Precondition Failed</code> error.</p>
     *          <p>If both of the <code>If-Match</code> and <code>If-Unmodified-Since</code> headers are
     *          present in the request as follows: <code>If-Match</code> condition evaluates to
     *             <code>true</code>, and; <code>If-Unmodified-Since</code> condition evaluates to
     *             <code>false</code>; then, S3 returns <code>200 OK</code> and the data requested. </p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfUnmodifiedSince?: Date | undefined;
    /**
     * <p>Key of the object to get.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Downloads the specified byte range of an object. For more information about the HTTP
     *          Range header, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-range">https://www.rfc-editor.org/rfc/rfc9110.html#name-range</a>.</p>
     *          <note>
     *             <p>Amazon S3 doesn't support retrieving multiple ranges of data per <code>GET</code>
     *             request.</p>
     *          </note>
     * @public
     */
    Range?: string | undefined;
    /**
     * <p>Sets the <code>Cache-Control</code> header of the response.</p>
     * @public
     */
    ResponseCacheControl?: string | undefined;
    /**
     * <p>Sets the <code>Content-Disposition</code> header of the response.</p>
     * @public
     */
    ResponseContentDisposition?: string | undefined;
    /**
     * <p>Sets the <code>Content-Encoding</code> header of the response.</p>
     * @public
     */
    ResponseContentEncoding?: string | undefined;
    /**
     * <p>Sets the <code>Content-Language</code> header of the response.</p>
     * @public
     */
    ResponseContentLanguage?: string | undefined;
    /**
     * <p>Sets the <code>Content-Type</code> header of the response.</p>
     * @public
     */
    ResponseContentType?: string | undefined;
    /**
     * <p>Sets the <code>Expires</code> header of the response.</p>
     * @public
     */
    ResponseExpires?: Date | undefined;
    /**
     * <p>Version ID used to reference a specific version of the object.</p>
     *          <p>By default, the <code>GetObject</code> operation returns the current version of an
     *          object. To return a different version, use the <code>versionId</code> subresource.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>If you include a <code>versionId</code> in your request header, you must have
     *                   the <code>s3:GetObjectVersion</code> permission to access a specific version of an
     *                   object. The <code>s3:GetObject</code> permission is not required in this
     *                   scenario.</p>
     *                </li>
     *                <li>
     *                   <p>If you request the current version of an object without a specific
     *                      <code>versionId</code> in the request header, only the
     *                      <code>s3:GetObject</code> permission is required. The
     *                      <code>s3:GetObjectVersion</code> permission is not required in this
     *                   scenario.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> -
     *                   S3 Versioning isn't enabled and supported for directory buckets. For this API operation, only the <code>null</code> value of the version ID is supported by directory buckets. You can only specify <code>null</code> to the
     *                      <code>versionId</code> query parameter in the request.</p>
     *                </li>
     *             </ul>
     *          </note>
     *          <p>For more information about versioning, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html">PutBucketVersioning</a>.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Specifies the algorithm to use when decrypting the object (for example,
     *             <code>AES256</code>).</p>
     *          <p>If you encrypt an object by using server-side encryption with customer-provided
     *          encryption keys (SSE-C) when you store the object in Amazon S3, then when you GET the object,
     *          you must use the following headers:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-algorithm</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-key</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-key-MD5</code>
     *                </p>
     *             </li>
     *          </ul>
     *          <p>For more information about SSE-C, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Server-Side Encryption
     *             (Using Customer-Provided Encryption Keys)</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>Specifies the customer-provided encryption key that you originally provided for Amazon S3 to
     *          encrypt the data before storing it. This value is used to decrypt the object when
     *          recovering it and must match the one used when storing the data. The key must be
     *          appropriate for use with the algorithm specified in the
     *             <code>x-amz-server-side-encryption-customer-algorithm</code> header.</p>
     *          <p>If you encrypt an object by using server-side encryption with customer-provided
     *          encryption keys (SSE-C) when you store the object in Amazon S3, then when you GET the object,
     *          you must use the following headers:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-algorithm</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-key</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-key-MD5</code>
     *                </p>
     *             </li>
     *          </ul>
     *          <p>For more information about SSE-C, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Server-Side Encryption
     *             (Using Customer-Provided Encryption Keys)</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>Specifies the 128-bit MD5 digest of the customer-provided encryption key according to
     *          RFC 1321. Amazon S3 uses this header for a message integrity check to ensure that the encryption
     *          key was transmitted without error.</p>
     *          <p>If you encrypt an object by using server-side encryption with customer-provided
     *          encryption keys (SSE-C) when you store the object in Amazon S3, then when you GET the object,
     *          you must use the following headers:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-algorithm</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-key</code>
     *                </p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>x-amz-server-side-encryption-customer-key-MD5</code>
     *                </p>
     *             </li>
     *          </ul>
     *          <p>For more information about SSE-C, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Server-Side Encryption
     *             (Using Customer-Provided Encryption Keys)</a> in the
     *             <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>Part number of the object being read. This is a positive integer between 1 and 10,000.
     *          Effectively performs a 'ranged' GET request for the part specified. Useful for downloading
     *          just a part of an object.</p>
     * @public
     */
    PartNumber?: number | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>To retrieve the checksum, this mode must be enabled.</p>
     * @public
     */
    ChecksumMode?: ChecksumMode | undefined;
}
/**
 * <p>Object is archived and inaccessible until restored.</p>
 *          <p>If the object you are retrieving is stored in the S3 Glacier Flexible Retrieval storage
 *          class, the S3 Glacier Deep Archive storage class, the S3 Intelligent-Tiering Archive Access
 *          tier, or the S3 Intelligent-Tiering Deep Archive Access tier, before you can retrieve the object you
 *          must first restore a copy using <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html">RestoreObject</a>. Otherwise, this
 *          operation returns an <code>InvalidObjectState</code> error. For information about restoring
 *          archived objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/restoring-objects.html">Restoring Archived Objects</a> in
 *          the <i>Amazon S3 User Guide</i>.</p>
 * @public
 */
export declare class InvalidObjectState extends __BaseException {
    readonly name: "InvalidObjectState";
    readonly $fault: "client";
    StorageClass?: StorageClass | undefined;
    AccessTier?: IntelligentTieringAccessTier | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidObjectState, __BaseException>);
}
/**
 * <p>The specified key does not exist.</p>
 * @public
 */
export declare class NoSuchKey extends __BaseException {
    readonly name: "NoSuchKey";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NoSuchKey, __BaseException>);
}
/**
 * @public
 */
export interface GetObjectAclOutput {
    /**
     * <p> Container for the bucket owner's display name and ID.</p>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>A list of grants.</p>
     * @public
     */
    Grants?: Grant[] | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface GetObjectAclRequest {
    /**
     * <p>The bucket name that contains the object for which to get the ACL information. </p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The key of the object for which to get the ACL information.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Version ID used to reference a specific version of the object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>Contains all the possible checksum or digest values for an object.</p>
 * @public
 */
export interface Checksum {
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32 checksum</code> of the object. This checksum is only be present if the checksum was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the object. This checksum is only present if the checksum was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the object. This checksum is present
     *          if the object was uploaded with the <code>CRC64NVME</code> checksum algorithm, or if the object was uploaded without a
     *          checksum (and Amazon S3 added the default checksum, <code>CRC64NVME</code>, to the uploaded object). For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. When you use the API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
    /**
     * <p>The checksum type that is used to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
}
/**
 * <p>A container for elements related to an individual part.</p>
 * @public
 */
export interface ObjectPart {
    /**
     * <p>The part number identifying the part. This value is a positive integer between 1 and
     *          10,000.</p>
     * @public
     */
    PartNumber?: number | undefined;
    /**
     * <p>The size of the uploaded part in bytes.</p>
     * @public
     */
    Size?: number | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC32</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC32C</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC64NVME</code> checksum algorithm, or if the object was uploaded without a
     *          checksum (and Amazon S3 added the default checksum, <code>CRC64NVME</code>, to the uploaded object). For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>SHA1</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>SHA256</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
}
/**
 * <p>A collection of parts associated with a multipart upload.</p>
 * @public
 */
export interface GetObjectAttributesParts {
    /**
     * <p>The total number of parts.</p>
     * @public
     */
    TotalPartsCount?: number | undefined;
    /**
     * <p>The marker for the current part.</p>
     * @public
     */
    PartNumberMarker?: string | undefined;
    /**
     * <p>When a list is truncated, this element specifies the last part in the list, as well as
     *          the value to use for the <code>PartNumberMarker</code> request parameter in a subsequent
     *          request.</p>
     * @public
     */
    NextPartNumberMarker?: string | undefined;
    /**
     * <p>The maximum number of parts allowed in the response.</p>
     * @public
     */
    MaxParts?: number | undefined;
    /**
     * <p>Indicates whether the returned list of parts is truncated. A value of <code>true</code>
     *          indicates that the list was truncated. A list can be truncated if the number of parts
     *          exceeds the limit returned in the <code>MaxParts</code> element.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>A container for elements related to a particular part. A response can contain zero or
     *          more <code>Parts</code> elements.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>General purpose buckets</b> - For
     *                      <code>GetObjectAttributes</code>, if a additional checksum (including
     *                      <code>x-amz-checksum-crc32</code>, <code>x-amz-checksum-crc32c</code>,
     *                      <code>x-amz-checksum-sha1</code>, or <code>x-amz-checksum-sha256</code>) isn't
     *                   applied to the object specified in the request, the response doesn't return
     *                      <code>Part</code>.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> - For
     *                      <code>GetObjectAttributes</code>, no matter whether a additional checksum is
     *                   applied to the object specified in the request, the response returns
     *                      <code>Part</code>.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    Parts?: ObjectPart[] | undefined;
}
/**
 * @public
 */
export interface GetObjectAttributesOutput {
    /**
     * <p>Specifies whether the object retrieved was (<code>true</code>) or was not
     *             (<code>false</code>) a delete marker. If <code>false</code>, this response header does
     *          not appear in the response. To learn more about delete markers, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html">Working with delete markers</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DeleteMarker?: boolean | undefined;
    /**
     * <p>Date and time when the object was last modified.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>The version ID of the object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
    /**
     * <p>An ETag is an opaque identifier assigned by a web server to a specific version of a
     *          resource found at a URL.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The checksum or digest of the object.</p>
     * @public
     */
    Checksum?: Checksum | undefined;
    /**
     * <p>A collection of parts associated with a multipart upload.</p>
     * @public
     */
    ObjectParts?: GetObjectAttributesParts | undefined;
    /**
     * <p>Provides the storage class information of the object. Amazon S3 returns this header for all
     *          objects except for S3 Standard storage class objects.</p>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html">Storage Classes</a>.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> -
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>The size of the object in bytes.</p>
     * @public
     */
    ObjectSize?: number | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ObjectAttributes: {
    readonly CHECKSUM: "Checksum";
    readonly ETAG: "ETag";
    readonly OBJECT_PARTS: "ObjectParts";
    readonly OBJECT_SIZE: "ObjectSize";
    readonly STORAGE_CLASS: "StorageClass";
};
/**
 * @public
 */
export type ObjectAttributes = (typeof ObjectAttributes)[keyof typeof ObjectAttributes];
/**
 * @public
 */
export interface GetObjectAttributesRequest {
    /**
     * <p>The name of the bucket that contains the object.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The object key.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The version ID used to reference a specific version of the object.</p>
     *          <note>
     *             <p>S3 Versioning isn't enabled and supported for directory buckets. For this API operation, only the <code>null</code> value of the version ID is supported by directory buckets. You can only specify <code>null</code> to the
     *                <code>versionId</code> query parameter in the request.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Sets the maximum number of parts to return.</p>
     * @public
     */
    MaxParts?: number | undefined;
    /**
     * <p>Specifies the part after which listing should begin. Only parts with higher part numbers
     *          will be listed.</p>
     * @public
     */
    PartNumberMarker?: string | undefined;
    /**
     * <p>Specifies the algorithm to use when encrypting the object (for example, AES256).</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>Specifies the customer-provided encryption key for Amazon S3 to use in encrypting data. This
     *          value is used to store the object and then it is discarded; Amazon S3 does not store the
     *          encryption key. The key must be appropriate for use with the algorithm specified in the
     *             <code>x-amz-server-side-encryption-customer-algorithm</code> header.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>Specifies the 128-bit MD5 digest of the encryption key according to RFC 1321. Amazon S3 uses
     *          this header for a message integrity check to ensure that the encryption key was transmitted
     *          without error.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Specifies the fields at the root level that you want returned in the response. Fields
     *          that you do not specify are not returned.</p>
     * @public
     */
    ObjectAttributes: ObjectAttributes[] | undefined;
}
/**
 * <p>A legal hold configuration for an object.</p>
 * @public
 */
export interface ObjectLockLegalHold {
    /**
     * <p>Indicates whether the specified object has a legal hold in place.</p>
     * @public
     */
    Status?: ObjectLockLegalHoldStatus | undefined;
}
/**
 * @public
 */
export interface GetObjectLegalHoldOutput {
    /**
     * <p>The current legal hold status for the specified object.</p>
     * @public
     */
    LegalHold?: ObjectLockLegalHold | undefined;
}
/**
 * @public
 */
export interface GetObjectLegalHoldRequest {
    /**
     * <p>The bucket name containing the object whose legal hold status you want to retrieve. </p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The key name for the object whose legal hold status you want to retrieve.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The version ID of the object whose legal hold status you want to retrieve.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ObjectLockEnabled: {
    readonly Enabled: "Enabled";
};
/**
 * @public
 */
export type ObjectLockEnabled = (typeof ObjectLockEnabled)[keyof typeof ObjectLockEnabled];
/**
 * @public
 * @enum
 */
export declare const ObjectLockRetentionMode: {
    readonly COMPLIANCE: "COMPLIANCE";
    readonly GOVERNANCE: "GOVERNANCE";
};
/**
 * @public
 */
export type ObjectLockRetentionMode = (typeof ObjectLockRetentionMode)[keyof typeof ObjectLockRetentionMode];
/**
 * <p>The container element for optionally specifying the default Object Lock retention
 *          settings for new objects placed in the specified bucket.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>The <code>DefaultRetention</code> settings require both a mode and a
 *                   period.</p>
 *                </li>
 *                <li>
 *                   <p>The <code>DefaultRetention</code> period can be either <code>Days</code> or
 *                      <code>Years</code> but you must select one. You cannot specify
 *                      <code>Days</code> and <code>Years</code> at the same time.</p>
 *                </li>
 *             </ul>
 *          </note>
 * @public
 */
export interface DefaultRetention {
    /**
     * <p>The default Object Lock retention mode you want to apply to new objects placed in the
     *          specified bucket. Must be used with either <code>Days</code> or <code>Years</code>.</p>
     * @public
     */
    Mode?: ObjectLockRetentionMode | undefined;
    /**
     * <p>The number of days that you want to specify for the default retention period. Must be
     *          used with <code>Mode</code>.</p>
     * @public
     */
    Days?: number | undefined;
    /**
     * <p>The number of years that you want to specify for the default retention period. Must be
     *          used with <code>Mode</code>.</p>
     * @public
     */
    Years?: number | undefined;
}
/**
 * <p>The container element for an Object Lock rule.</p>
 * @public
 */
export interface ObjectLockRule {
    /**
     * <p>The default Object Lock retention mode and period that you want to apply to new objects
     *          placed in the specified bucket. Bucket settings require both a mode and a period. The
     *          period can be either <code>Days</code> or <code>Years</code> but you must select one. You
     *          cannot specify <code>Days</code> and <code>Years</code> at the same time.</p>
     * @public
     */
    DefaultRetention?: DefaultRetention | undefined;
}
/**
 * <p>The container element for Object Lock configuration parameters.</p>
 * @public
 */
export interface ObjectLockConfiguration {
    /**
     * <p>Indicates whether this bucket has an Object Lock configuration enabled. Enable
     *             <code>ObjectLockEnabled</code> when you apply <code>ObjectLockConfiguration</code> to a
     *          bucket. </p>
     * @public
     */
    ObjectLockEnabled?: ObjectLockEnabled | undefined;
    /**
     * <p>Specifies the Object Lock rule for the specified object. Enable the this rule when you
     *          apply <code>ObjectLockConfiguration</code> to a bucket. Bucket settings require both a mode
     *          and a period. The period can be either <code>Days</code> or <code>Years</code> but you must
     *          select one. You cannot specify <code>Days</code> and <code>Years</code> at the same
     *          time.</p>
     * @public
     */
    Rule?: ObjectLockRule | undefined;
}
/**
 * @public
 */
export interface GetObjectLockConfigurationOutput {
    /**
     * <p>The specified bucket's Object Lock configuration.</p>
     * @public
     */
    ObjectLockConfiguration?: ObjectLockConfiguration | undefined;
}
/**
 * @public
 */
export interface GetObjectLockConfigurationRequest {
    /**
     * <p>The bucket whose Object Lock configuration you want to retrieve.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>A Retention configuration for an object.</p>
 * @public
 */
export interface ObjectLockRetention {
    /**
     * <p>Indicates the Retention mode for the specified object.</p>
     * @public
     */
    Mode?: ObjectLockRetentionMode | undefined;
    /**
     * <p>The date on which this Object Lock Retention will expire.</p>
     * @public
     */
    RetainUntilDate?: Date | undefined;
}
/**
 * @public
 */
export interface GetObjectRetentionOutput {
    /**
     * <p>The container element for an object's retention settings.</p>
     * @public
     */
    Retention?: ObjectLockRetention | undefined;
}
/**
 * @public
 */
export interface GetObjectRetentionRequest {
    /**
     * <p>The bucket name containing the object whose retention settings you want to retrieve. </p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The key name for the object whose retention settings you want to retrieve.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The version ID for the object whose retention settings you want to retrieve.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface GetObjectTaggingOutput {
    /**
     * <p>The versionId of the object for which you got the tagging information.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Contains the tag set.</p>
     * @public
     */
    TagSet: Tag[] | undefined;
}
/**
 * @public
 */
export interface GetObjectTaggingRequest {
    /**
     * <p>The bucket name containing the object for which to get the tagging information. </p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Object key for which to get the tagging information.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>The versionId of the object for which to get the tagging information.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
}
/**
 * @public
 */
export interface GetObjectTorrentOutput {
    /**
     * <p>A Bencoded dictionary as defined by the BitTorrent specification</p>
     * @public
     */
    Body?: StreamingBlobTypes | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface GetObjectTorrentRequest {
    /**
     * <p>The name of the bucket containing the object for which to get the torrent files.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The object key for which to get the information.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>The PublicAccessBlock configuration that you want to apply to this Amazon S3 bucket. You can
 *          enable the configuration options in any combination. For more information about when Amazon S3
 *          considers a bucket or object public, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status">The Meaning of "Public"</a> in the <i>Amazon S3 User Guide</i>. </p>
 * @public
 */
export interface PublicAccessBlockConfiguration {
    /**
     * <p>Specifies whether Amazon S3 should block public access control lists (ACLs) for this bucket
     *          and objects in this bucket. Setting this element to <code>TRUE</code> causes the following
     *          behavior:</p>
     *          <ul>
     *             <li>
     *                <p>PUT Bucket ACL and PUT Object ACL calls fail if the specified ACL is
     *                public.</p>
     *             </li>
     *             <li>
     *                <p>PUT Object calls fail if the request includes a public ACL.</p>
     *             </li>
     *             <li>
     *                <p>PUT Bucket calls fail if the request includes a public ACL.</p>
     *             </li>
     *          </ul>
     *          <p>Enabling this setting doesn't affect existing policies or ACLs.</p>
     * @public
     */
    BlockPublicAcls?: boolean | undefined;
    /**
     * <p>Specifies whether Amazon S3 should ignore public ACLs for this bucket and objects in this
     *          bucket. Setting this element to <code>TRUE</code> causes Amazon S3 to ignore all public ACLs on
     *          this bucket and objects in this bucket.</p>
     *          <p>Enabling this setting doesn't affect the persistence of any existing ACLs and doesn't
     *          prevent new public ACLs from being set.</p>
     * @public
     */
    IgnorePublicAcls?: boolean | undefined;
    /**
     * <p>Specifies whether Amazon S3 should block public bucket policies for this bucket. Setting this
     *          element to <code>TRUE</code> causes Amazon S3 to reject calls to PUT Bucket policy if the
     *          specified bucket policy allows public access. </p>
     *          <p>Enabling this setting doesn't affect existing bucket policies.</p>
     * @public
     */
    BlockPublicPolicy?: boolean | undefined;
    /**
     * <p>Specifies whether Amazon S3 should restrict public bucket policies for this bucket. Setting
     *          this element to <code>TRUE</code> restricts access to this bucket to only Amazon Web Services service principals and authorized users within this account if the bucket has
     *          a public policy.</p>
     *          <p>Enabling this setting doesn't affect previously stored bucket policies, except that
     *          public and cross-account access within any public bucket policy, including non-public
     *          delegation to specific accounts, is blocked.</p>
     * @public
     */
    RestrictPublicBuckets?: boolean | undefined;
}
/**
 * @public
 */
export interface GetPublicAccessBlockOutput {
    /**
     * <p>The <code>PublicAccessBlock</code> configuration currently in effect for this Amazon S3
     *          bucket.</p>
     * @public
     */
    PublicAccessBlockConfiguration?: PublicAccessBlockConfiguration | undefined;
}
/**
 * @public
 */
export interface GetPublicAccessBlockRequest {
    /**
     * <p>The name of the Amazon S3 bucket whose <code>PublicAccessBlock</code> configuration you want
     *          to retrieve. </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface HeadBucketOutput {
    /**
     * <p>The type of location where the bucket is created.</p>
     *          <note>
     *             <p>This functionality is only supported by directory buckets.</p>
     *          </note>
     * @public
     */
    BucketLocationType?: LocationType | undefined;
    /**
     * <p>The name of the location where the bucket will be created.</p>
     *          <p>For directory buckets, the Zone ID of the Availability Zone or the Local Zone where the bucket is created. An example Zone ID value for an Availability Zone is <code>usw2-az1</code>.</p>
     *          <note>
     *             <p>This functionality is only supported by directory buckets.</p>
     *          </note>
     * @public
     */
    BucketLocationName?: string | undefined;
    /**
     * <p>The Region that the bucket is located.</p>
     * @public
     */
    BucketRegion?: string | undefined;
    /**
     * <p>Indicates whether the bucket name used in the request is an access point alias.</p>
     *          <note>
     *             <p>For directory buckets, the value of this field is <code>false</code>.</p>
     *          </note>
     * @public
     */
    AccessPointAlias?: boolean | undefined;
}
/**
 * @public
 */
export interface HeadBucketRequest {
    /**
     * <p>The bucket name.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Object Lambda access points</b> - When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
     * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
     * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
     *             Error Codes</a>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p>The specified content does not exist.</p>
 * @public
 */
export declare class NotFound extends __BaseException {
    readonly name: "NotFound";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<NotFound, __BaseException>);
}
/**
 * @public
 * @enum
 */
export declare const ArchiveStatus: {
    readonly ARCHIVE_ACCESS: "ARCHIVE_ACCESS";
    readonly DEEP_ARCHIVE_ACCESS: "DEEP_ARCHIVE_ACCESS";
};
/**
 * @public
 */
export type ArchiveStatus = (typeof ArchiveStatus)[keyof typeof ArchiveStatus];
/**
 * @public
 */
export interface HeadObjectOutput {
    /**
     * <p>Specifies whether the object retrieved was (true) or was not (false) a Delete Marker. If
     *          false, this response header does not appear in the response.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DeleteMarker?: boolean | undefined;
    /**
     * <p>Indicates that a range of bytes was specified.</p>
     * @public
     */
    AcceptRanges?: string | undefined;
    /**
     * <p>If the object expiration is configured (see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html">
     *                <code>PutBucketLifecycleConfiguration</code>
     *             </a>), the response includes this
     *          header. It includes the <code>expiry-date</code> and <code>rule-id</code> key-value pairs
     *          providing object expiration information. The value of the <code>rule-id</code> is
     *          URL-encoded.</p>
     *          <note>
     *             <p>Object expiration information is not returned in directory buckets and this header returns the value "<code>NotImplemented</code>" in all responses for directory buckets.</p>
     *          </note>
     * @public
     */
    Expiration?: string | undefined;
    /**
     * <p>If the object is an archived object (an object whose storage class is GLACIER), the
     *          response includes this header if either the archive restoration is in progress (see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html">RestoreObject</a> or an archive copy is already restored.</p>
     *          <p> If an archive copy is already restored, the header value indicates when Amazon S3 is
     *          scheduled to delete the object copy. For example:</p>
     *          <p>
     *             <code>x-amz-restore: ongoing-request="false", expiry-date="Fri, 21 Dec 2012 00:00:00
     *             GMT"</code>
     *          </p>
     *          <p>If the object restoration is in progress, the header returns the value
     *             <code>ongoing-request="true"</code>.</p>
     *          <p>For more information about archiving objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html#lifecycle-transition-general-considerations">Transitioning Objects: General Considerations</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    Restore?: string | undefined;
    /**
     * <p>The archive state of the head object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ArchiveStatus?: ArchiveStatus | undefined;
    /**
     * <p>Date and time when the object was last modified.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>Size of the body in bytes.</p>
     * @public
     */
    ContentLength?: number | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32 checksum</code> of the object. This checksum is only be present if the checksum was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the object. This checksum is only present if the checksum was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the object. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. When you use the API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> digest of the object. This will only be present if the object was uploaded
     *     with the object. When you use an API operation on an object that was uploaded using multipart uploads, this value may not be a direct checksum value of the full object. Instead, it's a calculation based on the checksum values of each individual part. For more information about how checksums are calculated
     *     with multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html#large-object-checksums">
     *     Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
    /**
     * <p>The checksum type, which determines how part-level checksums are combined to create an
     *          object-level checksum for multipart objects. You can use this header response to verify
     *          that the checksum type that is received is the same checksum type that was specified in
     *          <code>CreateMultipartUpload</code> request. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p>An entity tag (ETag) is an opaque identifier assigned by a web server to a specific
     *          version of a resource found at a URL.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>This is set to the number of metadata entries not returned in <code>x-amz-meta</code>
     *          headers. This can happen if you create metadata using an API like SOAP that supports more
     *          flexible metadata than the REST API. For example, using SOAP, you can create metadata whose
     *          values are not legal HTTP headers.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    MissingMeta?: number | undefined;
    /**
     * <p>Version ID of the object.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Specifies caching behavior along the request/reply chain.</p>
     * @public
     */
    CacheControl?: string | undefined;
    /**
     * <p>Specifies presentational information for the object.</p>
     * @public
     */
    ContentDisposition?: string | undefined;
    /**
     * <p>Indicates what content encodings have been applied to the object and thus what decoding
     *          mechanisms must be applied to obtain the media-type referenced by the Content-Type header
     *          field.</p>
     * @public
     */
    ContentEncoding?: string | undefined;
    /**
     * <p>The language the content is in.</p>
     * @public
     */
    ContentLanguage?: string | undefined;
    /**
     * <p>A standard MIME type describing the format of the object data.</p>
     * @public
     */
    ContentType?: string | undefined;
    /**
     * <p>The portion of the object returned in the response for a <code>GET</code> request.</p>
     * @public
     */
    ContentRange?: string | undefined;
    /**
     * Deprecated in favor of ExpiresString.
     *
     * @deprecated
     * @public
     */
    Expires?: Date | undefined;
    /**
     * <p>The date and time at which the object is no longer cacheable.</p>
     * @public
     */
    ExpiresString?: string | undefined;
    /**
     * <p>If the bucket is configured as a website, redirects requests for this object to another
     *          object in the same bucket or to an external URL. Amazon S3 stores the value of this header in
     *          the object metadata.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    WebsiteRedirectLocation?: string | undefined;
    /**
     * <p>The server-side encryption algorithm used when you store this object in Amazon S3 (for
     *          example, <code>AES256</code>, <code>aws:kms</code>, <code>aws:kms:dsse</code>).</p>
     * @public
     */
    ServerSideEncryption?: ServerSideEncryption | undefined;
    /**
     * <p>A map of metadata to store with the object in S3.</p>
     * @public
     */
    Metadata?: Record<string, string> | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to confirm the encryption algorithm that's used.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>If server-side encryption with a customer-provided encryption key was requested, the
     *          response will include this header to provide the round-trip message integrity verification
     *          of the customer-provided encryption key.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>If present, indicates the ID of the KMS key that was used for object encryption.</p>
     * @public
     */
    SSEKMSKeyId?: string | undefined;
    /**
     * <p>Indicates whether the object uses an S3 Bucket Key for server-side encryption with
     *          Key Management Service (KMS) keys (SSE-KMS).</p>
     * @public
     */
    BucketKeyEnabled?: boolean | undefined;
    /**
     * <p>Provides storage class information of the object. Amazon S3 returns this header for all
     *          objects except for S3 Standard storage class objects.</p>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html">Storage Classes</a>.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets </b> -
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
    /**
     * <p>Amazon S3 can return this header if your request involves a bucket that is either a source or
     *          a destination in a replication rule.</p>
     *          <p>In replication, you have a source bucket on which you configure replication and
     *          destination bucket or buckets where Amazon S3 stores object replicas. When you request an object
     *             (<code>GetObject</code>) or object metadata (<code>HeadObject</code>) from these
     *          buckets, Amazon S3 will return the <code>x-amz-replication-status</code> header in the response
     *          as follows:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <b>If requesting an object from the source bucket</b>,
     *                Amazon S3 will return the <code>x-amz-replication-status</code> header if the object in
     *                your request is eligible for replication.</p>
     *                <p> For example, suppose that in your replication configuration, you specify object
     *                prefix <code>TaxDocs</code> requesting Amazon S3 to replicate objects with key prefix
     *                   <code>TaxDocs</code>. Any objects you upload with this key name prefix, for
     *                example <code>TaxDocs/document1.pdf</code>, are eligible for replication. For any
     *                object request with this key name prefix, Amazon S3 will return the
     *                   <code>x-amz-replication-status</code> header with value PENDING, COMPLETED or
     *                FAILED indicating object replication status.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <b>If requesting an object from a destination
     *                bucket</b>, Amazon S3 will return the <code>x-amz-replication-status</code> header
     *                with value REPLICA if the object in your request is a replica that Amazon S3 created and
     *                there is no replica modification replication in progress.</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <b>When replicating objects to multiple destination
     *                   buckets</b>, the <code>x-amz-replication-status</code> header acts
     *                differently. The header of the source object will only return a value of COMPLETED
     *                when replication is successful to all destinations. The header will remain at value
     *                PENDING until replication has completed for all destinations. If one or more
     *                destinations fails replication the header will return FAILED. </p>
     *             </li>
     *          </ul>
     *          <p>For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Replication</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ReplicationStatus?: ReplicationStatus | undefined;
    /**
     * <p>The count of parts this object has. This value is only returned if you specify
     *             <code>partNumber</code> in your request and the object was uploaded as a multipart
     *          upload.</p>
     * @public
     */
    PartsCount?: number | undefined;
    /**
     * <p>The Object Lock mode, if any, that's in effect for this object. This header is only
     *          returned if the requester has the <code>s3:GetObjectRetention</code> permission. For more
     *          information about S3 Object Lock, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lock.html">Object Lock</a>. </p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockMode?: ObjectLockMode | undefined;
    /**
     * <p>The date and time when the Object Lock retention period expires. This header is only
     *          returned if the requester has the <code>s3:GetObjectRetention</code> permission.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockRetainUntilDate?: Date | undefined;
    /**
     * <p>Specifies whether a legal hold is in effect for this object. This header is only
     *          returned if the requester has the <code>s3:GetObjectLegalHold</code> permission. This
     *          header is not returned if the specified version of this object has never had a legal hold
     *          applied. For more information about S3 Object Lock, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lock.html">Object Lock</a>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    ObjectLockLegalHoldStatus?: ObjectLockLegalHoldStatus | undefined;
}
/**
 * @public
 */
export interface HeadObjectRequest {
    /**
     * <p>The name of the bucket that contains the object.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Return the object only if its entity tag (ETag) is the same as the one specified;
     *          otherwise, return a 412 (precondition failed) error.</p>
     *          <p>If both of the <code>If-Match</code> and <code>If-Unmodified-Since</code> headers are
     *          present in the request as follows:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>If-Match</code> condition evaluates to <code>true</code>, and;</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>If-Unmodified-Since</code> condition evaluates to <code>false</code>;</p>
     *             </li>
     *          </ul>
     *          <p>Then Amazon S3 returns <code>200 OK</code> and the data requested.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfMatch?: string | undefined;
    /**
     * <p>Return the object only if it has been modified since the specified time; otherwise,
     *          return a 304 (not modified) error.</p>
     *          <p>If both of the <code>If-None-Match</code> and <code>If-Modified-Since</code> headers are
     *          present in the request as follows:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>If-None-Match</code> condition evaluates to <code>false</code>, and;</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>If-Modified-Since</code> condition evaluates to <code>true</code>;</p>
     *             </li>
     *          </ul>
     *          <p>Then Amazon S3 returns the <code>304 Not Modified</code> response code.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfModifiedSince?: Date | undefined;
    /**
     * <p>Return the object only if its entity tag (ETag) is different from the one specified;
     *          otherwise, return a 304 (not modified) error.</p>
     *          <p>If both of the <code>If-None-Match</code> and <code>If-Modified-Since</code> headers are
     *          present in the request as follows:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>If-None-Match</code> condition evaluates to <code>false</code>, and;</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>If-Modified-Since</code> condition evaluates to <code>true</code>;</p>
     *             </li>
     *          </ul>
     *          <p>Then Amazon S3 returns the <code>304 Not Modified</code> response code.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfNoneMatch?: string | undefined;
    /**
     * <p>Return the object only if it has not been modified since the specified time; otherwise,
     *          return a 412 (precondition failed) error.</p>
     *          <p>If both of the <code>If-Match</code> and <code>If-Unmodified-Since</code> headers are
     *          present in the request as follows:</p>
     *          <ul>
     *             <li>
     *                <p>
     *                   <code>If-Match</code> condition evaluates to <code>true</code>, and;</p>
     *             </li>
     *             <li>
     *                <p>
     *                   <code>If-Unmodified-Since</code> condition evaluates to <code>false</code>;</p>
     *             </li>
     *          </ul>
     *          <p>Then Amazon S3 returns <code>200 OK</code> and the data requested.</p>
     *          <p>For more information about conditional requests, see <a href="https://tools.ietf.org/html/rfc7232">RFC 7232</a>.</p>
     * @public
     */
    IfUnmodifiedSince?: Date | undefined;
    /**
     * <p>The object key.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>HeadObject returns only the metadata for an object. If the Range is satisfiable, only
     *          the <code>ContentLength</code> is affected in the response. If the Range is not
     *          satisfiable, S3 returns a <code>416 - Requested Range Not Satisfiable</code> error.</p>
     * @public
     */
    Range?: string | undefined;
    /**
     * <p>Sets the <code>Cache-Control</code> header of the response.</p>
     * @public
     */
    ResponseCacheControl?: string | undefined;
    /**
     * <p>Sets the <code>Content-Disposition</code> header of the response.</p>
     * @public
     */
    ResponseContentDisposition?: string | undefined;
    /**
     * <p>Sets the <code>Content-Encoding</code> header of the response.</p>
     * @public
     */
    ResponseContentEncoding?: string | undefined;
    /**
     * <p>Sets the <code>Content-Language</code> header of the response.</p>
     * @public
     */
    ResponseContentLanguage?: string | undefined;
    /**
     * <p>Sets the <code>Content-Type</code> header of the response.</p>
     * @public
     */
    ResponseContentType?: string | undefined;
    /**
     * <p>Sets the <code>Expires</code> header of the response.</p>
     * @public
     */
    ResponseExpires?: Date | undefined;
    /**
     * <p>Version ID used to reference a specific version of the object.</p>
     *          <note>
     *             <p>For directory buckets in this API operation, only the <code>null</code> value of the version ID is supported.</p>
     *          </note>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Specifies the algorithm to use when encrypting the object (for example, AES256).</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>Specifies the customer-provided encryption key for Amazon S3 to use in encrypting data. This
     *          value is used to store the object and then it is discarded; Amazon S3 does not store the
     *          encryption key. The key must be appropriate for use with the algorithm specified in the
     *             <code>x-amz-server-side-encryption-customer-algorithm</code> header.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>Specifies the 128-bit MD5 digest of the encryption key according to RFC 1321. Amazon S3 uses
     *          this header for a message integrity check to ensure that the encryption key was transmitted
     *          without error.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>Part number of the object being read. This is a positive integer between 1 and 10,000.
     *          Effectively performs a 'ranged' HEAD request for the part specified. Useful querying about
     *          the size of the part and the number of parts in this object.</p>
     * @public
     */
    PartNumber?: number | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>To retrieve the checksum, this parameter must be enabled.</p>
     *          <p>
     *             <b>General purpose buckets</b> -
     *          If you enable checksum mode and the object is uploaded with a
     *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_Checksum.html">checksum</a>
     *          and encrypted with an Key Management Service (KMS) key, you must have permission to use the
     *             <code>kms:Decrypt</code> action to retrieve the checksum.</p>
     *          <p>
     *             <b>Directory buckets</b> - If you enable
     *             <code>ChecksumMode</code> and the object is encrypted with Amazon Web Services Key Management Service
     *          (Amazon Web Services KMS), you must also have the <code>kms:GenerateDataKey</code> and
     *             <code>kms:Decrypt</code> permissions in IAM identity-based policies and KMS key
     *          policies for the KMS key to retrieve the checksum of the object.</p>
     * @public
     */
    ChecksumMode?: ChecksumMode | undefined;
}
/**
 * @public
 */
export interface ListBucketAnalyticsConfigurationsOutput {
    /**
     * <p>Indicates whether the returned list of analytics configurations is complete. A value of
     *          true indicates that the list is not complete and the NextContinuationToken will be provided
     *          for a subsequent request.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>The marker that is used as a starting point for this analytics configuration list
     *          response. This value is present if it was sent in the request.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>
     *             <code>NextContinuationToken</code> is sent when <code>isTruncated</code> is true, which
     *          indicates that there are more analytics configurations to list. The next request must
     *          include this <code>NextContinuationToken</code>. The token is obfuscated and is not a
     *          usable value.</p>
     * @public
     */
    NextContinuationToken?: string | undefined;
    /**
     * <p>The list of analytics configurations for a bucket.</p>
     * @public
     */
    AnalyticsConfigurationList?: AnalyticsConfiguration[] | undefined;
}
/**
 * @public
 */
export interface ListBucketAnalyticsConfigurationsRequest {
    /**
     * <p>The name of the bucket from which analytics configurations are retrieved.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The <code>ContinuationToken</code> that represents a placeholder from where this request
     *          should begin.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface ListBucketIntelligentTieringConfigurationsOutput {
    /**
     * <p>Indicates whether the returned list of analytics configurations is complete. A value of
     *             <code>true</code> indicates that the list is not complete and the
     *             <code>NextContinuationToken</code> will be provided for a subsequent request.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>The <code>ContinuationToken</code> that represents a placeholder from where this request
     *          should begin.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The marker used to continue this inventory configuration listing. Use the
     *             <code>NextContinuationToken</code> from this response to continue the listing in a
     *          subsequent request. The continuation token is an opaque value that Amazon S3 understands.</p>
     * @public
     */
    NextContinuationToken?: string | undefined;
    /**
     * <p>The list of S3 Intelligent-Tiering configurations for a bucket.</p>
     * @public
     */
    IntelligentTieringConfigurationList?: IntelligentTieringConfiguration[] | undefined;
}
/**
 * @public
 */
export interface ListBucketIntelligentTieringConfigurationsRequest {
    /**
     * <p>The name of the Amazon S3 bucket whose configuration you want to modify or retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The <code>ContinuationToken</code> that represents a placeholder from where this request
     *          should begin.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
}
/**
 * @public
 */
export interface ListBucketInventoryConfigurationsOutput {
    /**
     * <p>If sent in the request, the marker that is used as a starting point for this inventory
     *          configuration list response.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The list of inventory configurations for a bucket.</p>
     * @public
     */
    InventoryConfigurationList?: InventoryConfiguration[] | undefined;
    /**
     * <p>Tells whether the returned list of inventory configurations is complete. A value of true
     *          indicates that the list is not complete and the NextContinuationToken is provided for a
     *          subsequent request.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>The marker used to continue this inventory configuration listing. Use the
     *             <code>NextContinuationToken</code> from this response to continue the listing in a
     *          subsequent request. The continuation token is an opaque value that Amazon S3 understands.</p>
     * @public
     */
    NextContinuationToken?: string | undefined;
}
/**
 * @public
 */
export interface ListBucketInventoryConfigurationsRequest {
    /**
     * <p>The name of the bucket containing the inventory configurations to retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The marker used to continue an inventory configuration listing that has been truncated.
     *          Use the <code>NextContinuationToken</code> from a previously truncated list response to
     *          continue the listing. The continuation token is an opaque value that Amazon S3
     *          understands.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface ListBucketMetricsConfigurationsOutput {
    /**
     * <p>Indicates whether the returned list of metrics configurations is complete. A value of
     *          true indicates that the list is not complete and the NextContinuationToken will be provided
     *          for a subsequent request.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>The marker that is used as a starting point for this metrics configuration list
     *          response. This value is present if it was sent in the request.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The marker used to continue a metrics configuration listing that has been truncated. Use
     *          the <code>NextContinuationToken</code> from a previously truncated list response to
     *          continue the listing. The continuation token is an opaque value that Amazon S3
     *          understands.</p>
     * @public
     */
    NextContinuationToken?: string | undefined;
    /**
     * <p>The list of metrics configurations for a bucket.</p>
     * @public
     */
    MetricsConfigurationList?: MetricsConfiguration[] | undefined;
}
/**
 * @public
 */
export interface ListBucketMetricsConfigurationsRequest {
    /**
     * <p>The name of the bucket containing the metrics configurations to retrieve.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The marker that is used to continue a metrics configuration listing that has been
     *          truncated. Use the <code>NextContinuationToken</code> from a previously truncated list
     *          response to continue the listing. The continuation token is an opaque value that Amazon S3
     *          understands.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * <p> In terms of implementation, a Bucket is a resource. </p>
 * @public
 */
export interface Bucket {
    /**
     * <p>The name of the bucket.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>Date the bucket was created. This date can change when making changes to your bucket,
     *          such as editing its bucket policy.</p>
     * @public
     */
    CreationDate?: Date | undefined;
    /**
     * <p>
     *             <code>BucketRegion</code> indicates the Amazon Web Services region where the bucket is located. If the
     *          request contains at least one valid parameter, it is included in the response.</p>
     * @public
     */
    BucketRegion?: string | undefined;
}
/**
 * @public
 */
export interface ListBucketsOutput {
    /**
     * <p>The list of buckets owned by the requester.</p>
     * @public
     */
    Buckets?: Bucket[] | undefined;
    /**
     * <p>The owner of the buckets listed.</p>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>
     *             <code>ContinuationToken</code> is included in the response when there are more buckets
     *          that can be listed with pagination. The next <code>ListBuckets</code> request to Amazon S3 can
     *          be continued with this <code>ContinuationToken</code>. <code>ContinuationToken</code> is
     *          obfuscated and is not a real bucket.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>If <code>Prefix</code> was sent with the request, it is included in the response.</p>
     *          <p>All bucket names in the response begin with the specified bucket name prefix.</p>
     * @public
     */
    Prefix?: string | undefined;
}
/**
 * @public
 */
export interface ListBucketsRequest {
    /**
     * <p>Maximum number of buckets to be returned in response. When the number is more than the
     *          count of buckets that are owned by an Amazon Web Services account, return all the buckets in
     *          response.</p>
     * @public
     */
    MaxBuckets?: number | undefined;
    /**
     * <p>
     *             <code>ContinuationToken</code> indicates to Amazon S3 that the list is being continued on
     *          this bucket with a token. <code>ContinuationToken</code> is obfuscated and is not a real
     *          key. You can use this <code>ContinuationToken</code> for pagination of the list results. </p>
     *          <p>Length Constraints: Minimum length of 0. Maximum length of 1024.</p>
     *          <p>Required: No.</p>
     *          <note>
     *             <p>If you specify the <code>bucket-region</code>, <code>prefix</code>, or <code>continuation-token</code>
     *             query parameters without using <code>max-buckets</code> to set the maximum number of buckets returned in the response,
     *             Amazon S3 applies a default page size of 10,000 and provides a continuation token if there are more buckets.</p>
     *          </note>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>Limits the response to bucket names that begin with the specified bucket name
     *          prefix.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Limits the response to buckets that are located in the specified Amazon Web Services Region. The Amazon Web Services
     *          Region must be expressed according to the Amazon Web Services Region code, such as <code>us-west-2</code>
     *          for the US West (Oregon) Region. For a list of the valid values for all of the Amazon Web Services
     *          Regions, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a>.</p>
     *          <note>
     *             <p>Requests made to a Regional endpoint that is different from the
     *                <code>bucket-region</code> parameter are not supported. For example, if you want to
     *             limit the response to your buckets in Region <code>us-west-2</code>, the request must be
     *             made to an endpoint in Region <code>us-west-2</code>.</p>
     *          </note>
     * @public
     */
    BucketRegion?: string | undefined;
}
/**
 * @public
 */
export interface ListDirectoryBucketsOutput {
    /**
     * <p>The list of buckets owned by the requester. </p>
     * @public
     */
    Buckets?: Bucket[] | undefined;
    /**
     * <p>If <code>ContinuationToken</code> was sent with the request, it is included in the
     *          response. You can use the returned <code>ContinuationToken</code> for pagination of the
     *          list response.</p>
     * @public
     */
    ContinuationToken?: string | undefined;
}
/**
 * @public
 */
export interface ListDirectoryBucketsRequest {
    /**
     * <p>
     *             <code>ContinuationToken</code> indicates to Amazon S3 that the list is being continued on
     *          buckets in this account with a token. <code>ContinuationToken</code> is obfuscated and is
     *          not a real bucket name. You can use this <code>ContinuationToken</code> for the pagination
     *          of the list results. </p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>Maximum number of buckets to be returned in response. When the number is more than the
     *          count of buckets that are owned by an Amazon Web Services account, return all the buckets in
     *          response.</p>
     * @public
     */
    MaxDirectoryBuckets?: number | undefined;
}
/**
 * <p>Container for all (if there are any) keys between Prefix and the next occurrence of the
 *          string specified by a delimiter. CommonPrefixes lists keys that act like subdirectories in
 *          the directory specified by Prefix. For example, if the prefix is notes/ and the delimiter
 *          is a slash (/) as in notes/summer/july, the common prefix is notes/summer/. </p>
 * @public
 */
export interface CommonPrefix {
    /**
     * <p>Container for the specified common prefix.</p>
     * @public
     */
    Prefix?: string | undefined;
}
/**
 * @public
 * @enum
 */
export declare const EncodingType: {
    readonly url: "url";
};
/**
 * @public
 */
export type EncodingType = (typeof EncodingType)[keyof typeof EncodingType];
/**
 * <p>Container element that identifies who initiated the multipart upload. </p>
 * @public
 */
export interface Initiator {
    /**
     * <p>If the principal is an Amazon Web Services account, it provides the Canonical User ID. If the
     *          principal is an IAM User, it provides a user ARN value.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - If the principal is an
     *             Amazon Web Services account, it provides the Amazon Web Services account ID. If the principal is an IAM User, it
     *             provides a user ARN value.</p>
     *          </note>
     * @public
     */
    ID?: string | undefined;
    /**
     * <p>Name of the Principal.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    DisplayName?: string | undefined;
}
/**
 * <p>Container for the <code>MultipartUpload</code> for the Amazon S3 object.</p>
 * @public
 */
export interface MultipartUpload {
    /**
     * <p>Upload ID that identifies the multipart upload.</p>
     * @public
     */
    UploadId?: string | undefined;
    /**
     * <p>Key of the object for which the multipart upload was initiated.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>Date and time at which the multipart upload was initiated.</p>
     * @public
     */
    Initiated?: Date | undefined;
    /**
     * <p>The class of storage used to store the object.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> -
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>Specifies the owner of the object that is part of the multipart upload. </p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - The bucket owner is
     *             returned as the object owner for all the objects.</p>
     *          </note>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>Identifies who initiated the multipart upload.</p>
     * @public
     */
    Initiator?: Initiator | undefined;
    /**
     * <p>The algorithm that was used to create a checksum of the object.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p>The checksum type that is used to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
}
/**
 * @public
 */
export interface ListMultipartUploadsOutput {
    /**
     * <p>The name of the bucket to which the multipart upload was initiated. Does not return the
     *          access point ARN or access point alias if used.</p>
     * @public
     */
    Bucket?: string | undefined;
    /**
     * <p>The key at or after which the listing began.</p>
     * @public
     */
    KeyMarker?: string | undefined;
    /**
     * <p>Together with key-marker, specifies the multipart upload after which listing should
     *          begin. If key-marker is not specified, the upload-id-marker parameter is ignored.
     *          Otherwise, any multipart uploads for a key equal to the key-marker might be included in the
     *          list only if they have an upload ID lexicographically greater than the specified
     *             <code>upload-id-marker</code>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    UploadIdMarker?: string | undefined;
    /**
     * <p>When a list is truncated, this element specifies the value that should be used for the
     *          key-marker request parameter in a subsequent request.</p>
     * @public
     */
    NextKeyMarker?: string | undefined;
    /**
     * <p>When a prefix is provided in the request, this field contains the specified prefix. The
     *          result contains only keys starting with the specified prefix.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, only prefixes that end in a delimiter (<code>/</code>) are supported.</p>
     *          </note>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Contains the delimiter you specified in the request. If you don't specify a delimiter in
     *          your request, this element is absent from the response.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, <code>/</code> is the only supported delimiter.</p>
     *          </note>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>When a list is truncated, this element specifies the value that should be used for the
     *             <code>upload-id-marker</code> request parameter in a subsequent request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    NextUploadIdMarker?: string | undefined;
    /**
     * <p>Maximum number of multipart uploads that could have been included in the
     *          response.</p>
     * @public
     */
    MaxUploads?: number | undefined;
    /**
     * <p>Indicates whether the returned list of multipart uploads is truncated. A value of true
     *          indicates that the list was truncated. The list can be truncated if the number of multipart
     *          uploads exceeds the limit allowed or specified by max uploads.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>Container for elements related to a particular multipart upload. A response can contain
     *          zero or more <code>Upload</code> elements.</p>
     * @public
     */
    Uploads?: MultipartUpload[] | undefined;
    /**
     * <p>If you specify a delimiter in the request, then the result returns each distinct key
     *          prefix containing the delimiter in a <code>CommonPrefixes</code> element. The distinct key
     *          prefixes are returned in the <code>Prefix</code> child element.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, only prefixes that end in a delimiter (<code>/</code>) are supported.</p>
     *          </note>
     * @public
     */
    CommonPrefixes?: CommonPrefix[] | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode object keys in the response.</p>
     *          <p>If you specify the <code>encoding-type</code> request parameter, Amazon S3 includes this
     *          element in the response, and returns encoded key name values in the following response
     *          elements:</p>
     *          <p>
     *             <code>Delimiter</code>, <code>KeyMarker</code>, <code>Prefix</code>,
     *             <code>NextKeyMarker</code>, <code>Key</code>.</p>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface ListMultipartUploadsRequest {
    /**
     * <p>The name of the bucket to which the multipart upload was initiated. </p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Character you use to group keys.</p>
     *          <p>All keys that contain the same string between the prefix, if specified, and the first
     *          occurrence of the delimiter after the prefix are grouped under a single result element,
     *             <code>CommonPrefixes</code>. If you don't specify the prefix parameter, then the
     *          substring starts at the beginning of the key. The keys that are grouped under
     *             <code>CommonPrefixes</code> result element are not returned elsewhere in the
     *          response.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, <code>/</code> is the only supported delimiter.</p>
     *          </note>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode the <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html">object keys</a> in the response.
     *          Responses are encoded only in UTF-8. An object key can contain any Unicode character.
     *          However, the XML 1.0 parser can't parse certain characters, such as characters with an
     *          ASCII value from 0 to 10. For characters that aren't supported in XML 1.0, you can add this
     *          parameter to request that Amazon S3 encode the keys in the response. For more information about
     *          characters to avoid in object key names, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-guidelines">Object key naming
     *             guidelines</a>.</p>
     *          <note>
     *             <p>When using the URL encoding type, non-ASCII characters that are used in an object's
     *             key name will be percent-encoded according to UTF-8 code values. For example, the object
     *                <code>test_file(3).png</code> will appear as
     *             <code>test_file%283%29.png</code>.</p>
     *          </note>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>Specifies the multipart upload after which listing should begin.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>General purpose buckets</b> - For
     *                   general purpose buckets, <code>key-marker</code> is an object key. Together with
     *                      <code>upload-id-marker</code>, this parameter specifies the multipart upload
     *                   after which listing should begin.</p>
     *                   <p>If <code>upload-id-marker</code> is not specified, only the keys
     *                   lexicographically greater than the specified <code>key-marker</code> will be
     *                   included in the list.</p>
     *                   <p>If <code>upload-id-marker</code> is specified, any multipart uploads for a key
     *                   equal to the <code>key-marker</code> might also be included, provided those
     *                   multipart uploads have upload IDs lexicographically greater than the specified
     *                      <code>upload-id-marker</code>.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> - For
     *                   directory buckets, <code>key-marker</code> is obfuscated and isn't a real object
     *                   key. The <code>upload-id-marker</code> parameter isn't supported by
     *                   directory buckets. To list the additional multipart uploads, you only need to set
     *                   the value of <code>key-marker</code> to the <code>NextKeyMarker</code> value from
     *                   the previous response. </p>
     *                   <p>In the <code>ListMultipartUploads</code> response, the multipart uploads aren't
     *                   sorted lexicographically based on the object keys.
     *
     *                </p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    KeyMarker?: string | undefined;
    /**
     * <p>Sets the maximum number of multipart uploads, from 1 to 1,000, to return in the response
     *          body. 1,000 is the maximum number of uploads that can be returned in a response.</p>
     * @public
     */
    MaxUploads?: number | undefined;
    /**
     * <p>Lists in-progress uploads only for those keys that begin with the specified prefix. You
     *          can use prefixes to separate a bucket into different grouping of keys. (You can think of
     *          using <code>prefix</code> to make groups in the same way that you'd use a folder in a file
     *          system.)</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, only prefixes that end in a delimiter (<code>/</code>) are supported.</p>
     *          </note>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Together with key-marker, specifies the multipart upload after which listing should
     *          begin. If key-marker is not specified, the upload-id-marker parameter is ignored.
     *          Otherwise, any multipart uploads for a key equal to the key-marker might be included in the
     *          list only if they have an upload ID lexicographically greater than the specified
     *             <code>upload-id-marker</code>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    UploadIdMarker?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
}
/**
 * <p>Specifies the restoration status of an object. Objects in certain storage classes must
 *          be restored before they can be retrieved. For more information about these storage classes
 *          and how to work with archived objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/archived-objects.html"> Working with archived
 *             objects</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>This functionality is not supported for directory buckets.
 *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
 *          </note>
 * @public
 */
export interface RestoreStatus {
    /**
     * <p>Specifies whether the object is currently being restored. If the object restoration is
     *          in progress, the header returns the value <code>TRUE</code>. For example:</p>
     *          <p>
     *             <code>x-amz-optional-object-attributes: IsRestoreInProgress="true"</code>
     *          </p>
     *          <p>If the object restoration has completed, the header returns the value
     *          <code>FALSE</code>. For example:</p>
     *          <p>
     *             <code>x-amz-optional-object-attributes: IsRestoreInProgress="false",
     *             RestoreExpiryDate="2012-12-21T00:00:00.000Z"</code>
     *          </p>
     *          <p>If the object hasn't been restored, there is no header response.</p>
     * @public
     */
    IsRestoreInProgress?: boolean | undefined;
    /**
     * <p>Indicates when the restored copy will expire. This value is populated only if the object
     *          has already been restored. For example:</p>
     *          <p>
     *             <code>x-amz-optional-object-attributes: IsRestoreInProgress="false",
     *             RestoreExpiryDate="2012-12-21T00:00:00.000Z"</code>
     *          </p>
     * @public
     */
    RestoreExpiryDate?: Date | undefined;
}
/**
 * @public
 * @enum
 */
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
/**
 * @public
 */
export type ObjectStorageClass = (typeof ObjectStorageClass)[keyof typeof ObjectStorageClass];
/**
 * <p>An object consists of data and its descriptive metadata.</p>
 * @public
 */
export interface _Object {
    /**
     * <p>The name that you assign to an object. You use the object key to retrieve the
     *          object.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>Creation date of the object.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>The entity tag is a hash of the object. The ETag reflects changes only to the contents
     *          of an object, not its metadata. The ETag may or may not be an MD5 digest of the object
     *          data. Whether or not it is depends on how the object was created and how it is encrypted as
     *          described below:</p>
     *          <ul>
     *             <li>
     *                <p>Objects created by the PUT Object, POST Object, or Copy operation, or through the
     *                Amazon Web Services Management Console, and are encrypted by SSE-S3 or plaintext, have ETags that
     *                are an MD5 digest of their object data.</p>
     *             </li>
     *             <li>
     *                <p>Objects created by the PUT Object, POST Object, or Copy operation, or through the
     *                Amazon Web Services Management Console, and are encrypted by SSE-C or SSE-KMS, have ETags that are
     *                not an MD5 digest of their object data.</p>
     *             </li>
     *             <li>
     *                <p>If an object is created by either the Multipart Upload or Part Copy operation, the
     *                ETag is not an MD5 digest, regardless of the method of encryption. If an object is
     *                larger than 16 MB, the Amazon Web Services Management Console will upload or copy that object as a
     *                Multipart Upload, and therefore the ETag will not be an MD5 digest.</p>
     *             </li>
     *          </ul>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - MD5 is not supported by directory buckets.</p>
     *          </note>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The algorithm that was used to create a checksum of the object.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm[] | undefined;
    /**
     * <p>The checksum type that is used to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p>Size in bytes of the object</p>
     * @public
     */
    Size?: number | undefined;
    /**
     * <p>The class of storage used to store the object.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> -
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    StorageClass?: ObjectStorageClass | undefined;
    /**
     * <p>The owner of the object</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - The bucket owner is
     *             returned as the object owner.</p>
     *          </note>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>Specifies the restoration status of an object. Objects in certain storage classes must
     *          be restored before they can be retrieved. For more information about these storage classes
     *          and how to work with archived objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/archived-objects.html"> Working with archived
     *             objects</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    RestoreStatus?: RestoreStatus | undefined;
}
/**
 * @public
 */
export interface ListObjectsOutput {
    /**
     * <p>A flag that indicates whether Amazon S3 returned all of the results that satisfied the search
     *          criteria.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>Indicates where in the bucket listing begins. Marker is included in the response if it
     *          was sent with the request.</p>
     * @public
     */
    Marker?: string | undefined;
    /**
     * <p>When the response is truncated (the <code>IsTruncated</code> element value in the
     *          response is <code>true</code>), you can use the key name in this field as the
     *             <code>marker</code> parameter in the subsequent request to get the next set of objects.
     *          Amazon S3 lists objects in alphabetical order. </p>
     *          <note>
     *             <p>This element is returned only if you have the <code>delimiter</code> request
     *             parameter specified. If the response does not include the <code>NextMarker</code>
     *             element and it is truncated, you can use the value of the last <code>Key</code> element
     *             in the response as the <code>marker</code> parameter in the subsequent request to get
     *             the next set of object keys.</p>
     *          </note>
     * @public
     */
    NextMarker?: string | undefined;
    /**
     * <p>Metadata about each object returned.</p>
     * @public
     */
    Contents?: _Object[] | undefined;
    /**
     * <p>The bucket name.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>Keys that begin with the indicated prefix.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Causes keys that contain the same string between the prefix and the first occurrence of
     *          the delimiter to be rolled up into a single result element in the
     *             <code>CommonPrefixes</code> collection. These rolled-up keys are not returned elsewhere
     *          in the response. Each rolled-up result counts as only one return against the
     *             <code>MaxKeys</code> value.</p>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>The maximum number of keys returned in the response body.</p>
     * @public
     */
    MaxKeys?: number | undefined;
    /**
     * <p>All of the keys (up to 1,000) rolled up in a common prefix count as a single return when
     *          calculating the number of returns. </p>
     *          <p>A response can contain <code>CommonPrefixes</code> only if you specify a
     *          delimiter.</p>
     *          <p>
     *             <code>CommonPrefixes</code> contains all (if there are any) keys between
     *             <code>Prefix</code> and the next occurrence of the string specified by the
     *          delimiter.</p>
     *          <p>
     *             <code>CommonPrefixes</code> lists keys that act like subdirectories in the directory
     *          specified by <code>Prefix</code>.</p>
     *          <p>For example, if the prefix is <code>notes/</code> and the delimiter is a slash
     *             (<code>/</code>), as in <code>notes/summer/july</code>, the common prefix is
     *             <code>notes/summer/</code>. All of the keys that roll up into a common prefix count as a
     *          single return when calculating the number of returns.</p>
     * @public
     */
    CommonPrefixes?: CommonPrefix[] | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode the <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html">object keys</a> in the response.
     *          Responses are encoded only in UTF-8. An object key can contain any Unicode character.
     *          However, the XML 1.0 parser can't parse certain characters, such as characters with an
     *          ASCII value from 0 to 10. For characters that aren't supported in XML 1.0, you can add this
     *          parameter to request that Amazon S3 encode the keys in the response. For more information about
     *          characters to avoid in object key names, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-guidelines">Object key naming
     *             guidelines</a>.</p>
     *          <note>
     *             <p>When using the URL encoding type, non-ASCII characters that are used in an object's
     *             key name will be percent-encoded according to UTF-8 code values. For example, the object
     *                <code>test_file(3).png</code> will appear as
     *             <code>test_file%283%29.png</code>.</p>
     *          </note>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 * @enum
 */
export declare const OptionalObjectAttributes: {
    readonly RESTORE_STATUS: "RestoreStatus";
};
/**
 * @public
 */
export type OptionalObjectAttributes = (typeof OptionalObjectAttributes)[keyof typeof OptionalObjectAttributes];
/**
 * @public
 */
export interface ListObjectsRequest {
    /**
     * <p>The name of the bucket containing the objects.</p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>A delimiter is a character that you use to group keys.</p>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode the <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html">object keys</a> in the response.
     *          Responses are encoded only in UTF-8. An object key can contain any Unicode character.
     *          However, the XML 1.0 parser can't parse certain characters, such as characters with an
     *          ASCII value from 0 to 10. For characters that aren't supported in XML 1.0, you can add this
     *          parameter to request that Amazon S3 encode the keys in the response. For more information about
     *          characters to avoid in object key names, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-guidelines">Object key naming
     *             guidelines</a>.</p>
     *          <note>
     *             <p>When using the URL encoding type, non-ASCII characters that are used in an object's
     *             key name will be percent-encoded according to UTF-8 code values. For example, the object
     *                <code>test_file(3).png</code> will appear as
     *             <code>test_file%283%29.png</code>.</p>
     *          </note>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>Marker is where you want Amazon S3 to start listing from. Amazon S3 starts listing after this
     *          specified key. Marker can be any key in the bucket.</p>
     * @public
     */
    Marker?: string | undefined;
    /**
     * <p>Sets the maximum number of keys returned in the response. By default, the action returns
     *          up to 1,000 key names. The response might contain fewer keys but will never contain more.
     *       </p>
     * @public
     */
    MaxKeys?: number | undefined;
    /**
     * <p>Limits the response to keys that begin with the specified prefix.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Confirms that the requester knows that she or he will be charged for the list objects
     *          request. Bucket owners need not specify this parameter in their requests.</p>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Specifies the optional fields that you want returned in the response. Fields that you do
     *          not specify are not returned.</p>
     * @public
     */
    OptionalObjectAttributes?: OptionalObjectAttributes[] | undefined;
}
/**
 * @public
 */
export interface ListObjectsV2Output {
    /**
     * <p>Set to <code>false</code> if all of the results were returned. Set to <code>true</code>
     *          if more keys are available to return. If the number of results exceeds that specified by
     *             <code>MaxKeys</code>, all of the results might not be returned.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>Metadata about each object returned.</p>
     * @public
     */
    Contents?: _Object[] | undefined;
    /**
     * <p>The bucket name.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>Keys that begin with the indicated prefix.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, only prefixes that end in a delimiter (<code>/</code>) are supported.</p>
     *          </note>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Causes keys that contain the same string between the <code>prefix</code> and the first
     *          occurrence of the delimiter to be rolled up into a single result element in the
     *             <code>CommonPrefixes</code> collection. These rolled-up keys are not returned elsewhere
     *          in the response. Each rolled-up result counts as only one return against the
     *             <code>MaxKeys</code> value.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, <code>/</code> is the only supported delimiter.</p>
     *          </note>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>Sets the maximum number of keys returned in the response. By default, the action returns
     *          up to 1,000 key names. The response might contain fewer keys but will never contain
     *          more.</p>
     * @public
     */
    MaxKeys?: number | undefined;
    /**
     * <p>All of the keys (up to 1,000) that share the same prefix are grouped together. When
     *          counting the total numbers of returns by this API operation, this group of keys is
     *          considered as one item.</p>
     *          <p>A response can contain <code>CommonPrefixes</code> only if you specify a
     *          delimiter.</p>
     *          <p>
     *             <code>CommonPrefixes</code> contains all (if there are any) keys between
     *             <code>Prefix</code> and the next occurrence of the string specified by a
     *          delimiter.</p>
     *          <p>
     *             <code>CommonPrefixes</code> lists keys that act like subdirectories in the directory
     *          specified by <code>Prefix</code>.</p>
     *          <p>For example, if the prefix is <code>notes/</code> and the delimiter is a slash
     *             (<code>/</code>) as in <code>notes/summer/july</code>, the common prefix is
     *             <code>notes/summer/</code>. All of the keys that roll up into a common prefix count as a
     *          single return when calculating the number of returns. </p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> - For directory buckets, only prefixes that end in a delimiter (<code>/</code>) are supported.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets </b> - When you query
     *                      <code>ListObjectsV2</code> with a delimiter during in-progress multipart
     *                   uploads, the <code>CommonPrefixes</code> response parameter contains the prefixes
     *                   that are associated with the in-progress multipart uploads. For more information
     *                   about multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html">Multipart Upload Overview</a> in
     *                   the <i>Amazon S3 User Guide</i>.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    CommonPrefixes?: CommonPrefix[] | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode object key names in the XML response.</p>
     *          <p>If you specify the <code>encoding-type</code> request parameter, Amazon S3 includes this
     *          element in the response, and returns encoded key name values in the following response
     *          elements:</p>
     *          <p>
     *             <code>Delimiter, Prefix, Key,</code> and <code>StartAfter</code>.</p>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>
     *             <code>KeyCount</code> is the number of keys returned with this request.
     *             <code>KeyCount</code> will always be less than or equal to the <code>MaxKeys</code>
     *          field. For example, if you ask for 50 keys, your result will include 50 keys or
     *          fewer.</p>
     * @public
     */
    KeyCount?: number | undefined;
    /**
     * <p> If <code>ContinuationToken</code> was sent with the request, it is included in the
     *          response. You can use the returned <code>ContinuationToken</code> for pagination of the
     *          list response. You can use this <code>ContinuationToken</code> for pagination of the list
     *          results. </p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>
     *             <code>NextContinuationToken</code> is sent when <code>isTruncated</code> is true, which
     *          means there are more keys in the bucket that can be listed. The next list requests to Amazon S3
     *          can be continued with this <code>NextContinuationToken</code>.
     *             <code>NextContinuationToken</code> is obfuscated and is not a real key</p>
     * @public
     */
    NextContinuationToken?: string | undefined;
    /**
     * <p>If StartAfter was sent with the request, it is included in the response.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    StartAfter?: string | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface ListObjectsV2Request {
    /**
     * <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>A delimiter is a character that you use to group keys.</p>
     *          <note>
     *             <ul>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets</b> - For directory buckets, <code>/</code> is the only supported delimiter.</p>
     *                </li>
     *                <li>
     *                   <p>
     *                      <b>Directory buckets </b> - When you query
     *                      <code>ListObjectsV2</code> with a delimiter during in-progress multipart
     *                   uploads, the <code>CommonPrefixes</code> response parameter contains the prefixes
     *                   that are associated with the in-progress multipart uploads. For more information
     *                   about multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html">Multipart Upload Overview</a> in
     *                   the <i>Amazon S3 User Guide</i>.</p>
     *                </li>
     *             </ul>
     *          </note>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode the <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html">object keys</a> in the response.
     *          Responses are encoded only in UTF-8. An object key can contain any Unicode character.
     *          However, the XML 1.0 parser can't parse certain characters, such as characters with an
     *          ASCII value from 0 to 10. For characters that aren't supported in XML 1.0, you can add this
     *          parameter to request that Amazon S3 encode the keys in the response. For more information about
     *          characters to avoid in object key names, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-guidelines">Object key naming
     *             guidelines</a>.</p>
     *          <note>
     *             <p>When using the URL encoding type, non-ASCII characters that are used in an object's
     *             key name will be percent-encoded according to UTF-8 code values. For example, the object
     *                <code>test_file(3).png</code> will appear as
     *             <code>test_file%283%29.png</code>.</p>
     *          </note>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>Sets the maximum number of keys returned in the response. By default, the action returns
     *          up to 1,000 key names. The response might contain fewer keys but will never contain
     *          more.</p>
     * @public
     */
    MaxKeys?: number | undefined;
    /**
     * <p>Limits the response to keys that begin with the specified prefix.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets, only prefixes that end in a delimiter (<code>/</code>) are supported.</p>
     *          </note>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>
     *             <code>ContinuationToken</code> indicates to Amazon S3 that the list is being continued on
     *          this bucket with a token. <code>ContinuationToken</code> is obfuscated and is not a real
     *          key. You can use this <code>ContinuationToken</code> for pagination of the list results.
     *       </p>
     * @public
     */
    ContinuationToken?: string | undefined;
    /**
     * <p>The owner field is not present in <code>ListObjectsV2</code> by default. If you want to
     *          return the owner field with each key in the result, then set the <code>FetchOwner</code>
     *          field to <code>true</code>.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - For directory buckets,
     *             the bucket owner is returned as the object owner for all objects.</p>
     *          </note>
     * @public
     */
    FetchOwner?: boolean | undefined;
    /**
     * <p>StartAfter is where you want Amazon S3 to start listing from. Amazon S3 starts listing after this
     *          specified key. StartAfter can be any key in the bucket.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    StartAfter?: string | undefined;
    /**
     * <p>Confirms that the requester knows that she or he will be charged for the list objects
     *          request in V2 style. Bucket owners need not specify this parameter in their
     *          requests.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Specifies the optional fields that you want returned in the response. Fields that you do
     *          not specify are not returned.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    OptionalObjectAttributes?: OptionalObjectAttributes[] | undefined;
}
/**
 * <p>Information about the delete marker.</p>
 * @public
 */
export interface DeleteMarkerEntry {
    /**
     * <p>The account that created the delete marker. </p>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>The object key.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>Version ID of an object.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Specifies whether the object is (true) or is not (false) the latest version of an
     *          object. </p>
     * @public
     */
    IsLatest?: boolean | undefined;
    /**
     * <p>Date and time when the object was last modified.</p>
     * @public
     */
    LastModified?: Date | undefined;
}
/**
 * @public
 * @enum
 */
export declare const ObjectVersionStorageClass: {
    readonly STANDARD: "STANDARD";
};
/**
 * @public
 */
export type ObjectVersionStorageClass = (typeof ObjectVersionStorageClass)[keyof typeof ObjectVersionStorageClass];
/**
 * <p>The version of an object.</p>
 * @public
 */
export interface ObjectVersion {
    /**
     * <p>The entity tag is an MD5 hash of that version of the object.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>The algorithm that was used to create a checksum of the object.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm[] | undefined;
    /**
     * <p>The checksum type that is used to calculate the object’s
     *          checksum value. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
    /**
     * <p>Size in bytes of the object.</p>
     * @public
     */
    Size?: number | undefined;
    /**
     * <p>The class of storage used to store the object.</p>
     * @public
     */
    StorageClass?: ObjectVersionStorageClass | undefined;
    /**
     * <p>The object key.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>Version ID of an object.</p>
     * @public
     */
    VersionId?: string | undefined;
    /**
     * <p>Specifies whether the object is (true) or is not (false) the latest version of an
     *          object.</p>
     * @public
     */
    IsLatest?: boolean | undefined;
    /**
     * <p>Date and time when the object was last modified.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>Specifies the owner of the object.</p>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>Specifies the restoration status of an object. Objects in certain storage classes must
     *          be restored before they can be retrieved. For more information about these storage classes
     *          and how to work with archived objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/archived-objects.html"> Working with archived
     *             objects</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    RestoreStatus?: RestoreStatus | undefined;
}
/**
 * @public
 */
export interface ListObjectVersionsOutput {
    /**
     * <p>A flag that indicates whether Amazon S3 returned all of the results that satisfied the search
     *          criteria. If your results were truncated, you can make a follow-up paginated request by
     *          using the <code>NextKeyMarker</code> and <code>NextVersionIdMarker</code> response
     *          parameters as a starting place in another request to return the rest of the results.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>Marks the last key returned in a truncated response.</p>
     * @public
     */
    KeyMarker?: string | undefined;
    /**
     * <p>Marks the last version of the key returned in a truncated response.</p>
     * @public
     */
    VersionIdMarker?: string | undefined;
    /**
     * <p>When the number of responses exceeds the value of <code>MaxKeys</code>,
     *             <code>NextKeyMarker</code> specifies the first key not returned that satisfies the
     *          search criteria. Use this value for the key-marker request parameter in a subsequent
     *          request.</p>
     * @public
     */
    NextKeyMarker?: string | undefined;
    /**
     * <p>When the number of responses exceeds the value of <code>MaxKeys</code>,
     *             <code>NextVersionIdMarker</code> specifies the first object version not returned that
     *          satisfies the search criteria. Use this value for the <code>version-id-marker</code>
     *          request parameter in a subsequent request.</p>
     * @public
     */
    NextVersionIdMarker?: string | undefined;
    /**
     * <p>Container for version information.</p>
     * @public
     */
    Versions?: ObjectVersion[] | undefined;
    /**
     * <p>Container for an object that is a delete marker. To learn more about delete markers, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html">Working with delete markers</a>.</p>
     * @public
     */
    DeleteMarkers?: DeleteMarkerEntry[] | undefined;
    /**
     * <p>The bucket name.</p>
     * @public
     */
    Name?: string | undefined;
    /**
     * <p>Selects objects that start with the value supplied by this parameter.</p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>The delimiter grouping the included keys. A delimiter is a character that you specify to
     *          group keys. All keys that contain the same string between the prefix and the first
     *          occurrence of the delimiter are grouped under a single result element in
     *             <code>CommonPrefixes</code>. These groups are counted as one result against the
     *             <code>max-keys</code> limitation. These keys are not returned elsewhere in the
     *          response.</p>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>Specifies the maximum number of objects to return.</p>
     * @public
     */
    MaxKeys?: number | undefined;
    /**
     * <p>All of the keys rolled up into a common prefix count as a single return when calculating
     *          the number of returns.</p>
     * @public
     */
    CommonPrefixes?: CommonPrefix[] | undefined;
    /**
     * <p> Encoding type used by Amazon S3 to encode object key names in the XML response.</p>
     *          <p>If you specify the <code>encoding-type</code> request parameter, Amazon S3 includes this
     *          element in the response, and returns encoded key name values in the following response
     *          elements:</p>
     *          <p>
     *             <code>KeyMarker, NextKeyMarker, Prefix, Key</code>, and <code>Delimiter</code>.</p>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
}
/**
 * @public
 */
export interface ListObjectVersionsRequest {
    /**
     * <p>The bucket name that contains the objects. </p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>A delimiter is a character that you specify to group keys. All keys that contain the
     *          same string between the <code>prefix</code> and the first occurrence of the delimiter are
     *          grouped under a single result element in <code>CommonPrefixes</code>. These groups are
     *          counted as one result against the <code>max-keys</code> limitation. These keys are not
     *          returned elsewhere in the response.</p>
     * @public
     */
    Delimiter?: string | undefined;
    /**
     * <p>Encoding type used by Amazon S3 to encode the <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html">object keys</a> in the response.
     *          Responses are encoded only in UTF-8. An object key can contain any Unicode character.
     *          However, the XML 1.0 parser can't parse certain characters, such as characters with an
     *          ASCII value from 0 to 10. For characters that aren't supported in XML 1.0, you can add this
     *          parameter to request that Amazon S3 encode the keys in the response. For more information about
     *          characters to avoid in object key names, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-guidelines">Object key naming
     *             guidelines</a>.</p>
     *          <note>
     *             <p>When using the URL encoding type, non-ASCII characters that are used in an object's
     *             key name will be percent-encoded according to UTF-8 code values. For example, the object
     *                <code>test_file(3).png</code> will appear as
     *             <code>test_file%283%29.png</code>.</p>
     *          </note>
     * @public
     */
    EncodingType?: EncodingType | undefined;
    /**
     * <p>Specifies the key to start with when listing objects in a bucket.</p>
     * @public
     */
    KeyMarker?: string | undefined;
    /**
     * <p>Sets the maximum number of keys returned in the response. By default, the action returns
     *          up to 1,000 key names. The response might contain fewer keys but will never contain more.
     *          If additional keys satisfy the search criteria, but were not returned because
     *             <code>max-keys</code> was exceeded, the response contains
     *             <code><isTruncated>true</isTruncated></code>. To return the additional keys,
     *          see <code>key-marker</code> and <code>version-id-marker</code>.</p>
     * @public
     */
    MaxKeys?: number | undefined;
    /**
     * <p>Use this parameter to select only those keys that begin with the specified prefix. You
     *          can use prefixes to separate a bucket into different groupings of keys. (You can think of
     *          using <code>prefix</code> to make groups in the same way that you'd use a folder in a file
     *          system.) You can use <code>prefix</code> with <code>delimiter</code> to roll up numerous
     *          objects into a single result under <code>CommonPrefixes</code>. </p>
     * @public
     */
    Prefix?: string | undefined;
    /**
     * <p>Specifies the object version you want to start listing from.</p>
     * @public
     */
    VersionIdMarker?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>Specifies the optional fields that you want returned in the response. Fields that you do
     *          not specify are not returned.</p>
     * @public
     */
    OptionalObjectAttributes?: OptionalObjectAttributes[] | undefined;
}
/**
 * <p>Container for elements related to a part.</p>
 * @public
 */
export interface Part {
    /**
     * <p>Part number identifying the part. This is a positive integer between 1 and
     *          10,000.</p>
     * @public
     */
    PartNumber?: number | undefined;
    /**
     * <p>Date and time at which the part was uploaded.</p>
     * @public
     */
    LastModified?: Date | undefined;
    /**
     * <p>Entity tag returned when the part was uploaded.</p>
     * @public
     */
    ETag?: string | undefined;
    /**
     * <p>Size in bytes of the uploaded part data.</p>
     * @public
     */
    Size?: number | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32</code> checksum of the part. This checksum is present
     *          if the object was uploaded with the <code>CRC32</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32?: string | undefined;
    /**
     * <p>The Base64 encoded, 32-bit <code>CRC32C</code> checksum of the part. This checksum is present
     *          if the object was uploaded with the <code>CRC32C</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC32C?: string | undefined;
    /**
     * <p>The Base64 encoded, 64-bit <code>CRC64NVME</code> checksum of the part. This checksum is present
     *          if the multipart upload request was created with the <code>CRC64NVME</code> checksum algorithm, or if the object was uploaded without a
     *          checksum (and Amazon S3 added the default checksum, <code>CRC64NVME</code>, to the uploaded object). For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumCRC64NVME?: string | undefined;
    /**
     * <p>The Base64 encoded, 160-bit <code>SHA1</code> checksum of the part. This checksum is present
     *          if the object was uploaded with the <code>SHA1</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA1?: string | undefined;
    /**
     * <p>The Base64 encoded, 256-bit <code>SHA256</code> checksum of the part. This checksum is present
     *          if the object was uploaded with the <code>SHA256</code> checksum algorithm. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in the <i>Amazon S3 User Guide</i>.</p>
     * @public
     */
    ChecksumSHA256?: string | undefined;
}
/**
 * @public
 */
export interface ListPartsOutput {
    /**
     * <p>If the bucket has a lifecycle rule configured with an action to abort incomplete
     *          multipart uploads and the prefix in the lifecycle rule matches the object name in the
     *          request, then the response includes this header indicating when the initiated multipart
     *          upload will become eligible for abort operation. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html#mpu-abort-incomplete-mpu-lifecycle-config">Aborting Incomplete Multipart Uploads Using a Bucket Lifecycle
     *          Configuration</a>.</p>
     *          <p>The response will also include the <code>x-amz-abort-rule-id</code> header that will
     *          provide the ID of the lifecycle configuration rule that defines this action.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    AbortDate?: Date | undefined;
    /**
     * <p>This header is returned along with the <code>x-amz-abort-date</code> header. It
     *          identifies applicable lifecycle configuration rule that defines the action to abort
     *          incomplete multipart uploads.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    AbortRuleId?: string | undefined;
    /**
     * <p>The name of the bucket to which the multipart upload was initiated. Does not return the
     *          access point ARN or access point alias if used.</p>
     * @public
     */
    Bucket?: string | undefined;
    /**
     * <p>Object key for which the multipart upload was initiated.</p>
     * @public
     */
    Key?: string | undefined;
    /**
     * <p>Upload ID identifying the multipart upload whose parts are being listed.</p>
     * @public
     */
    UploadId?: string | undefined;
    /**
     * <p>Specifies the part after which listing should begin. Only parts with higher part numbers
     *          will be listed.</p>
     * @public
     */
    PartNumberMarker?: string | undefined;
    /**
     * <p>When a list is truncated, this element specifies the last part in the list, as well as
     *          the value to use for the <code>part-number-marker</code> request parameter in a subsequent
     *          request.</p>
     * @public
     */
    NextPartNumberMarker?: string | undefined;
    /**
     * <p>Maximum number of parts that were allowed in the response.</p>
     * @public
     */
    MaxParts?: number | undefined;
    /**
     * <p> Indicates whether the returned list of parts is truncated. A true value indicates that
     *          the list was truncated. A list can be truncated if the number of parts exceeds the limit
     *          returned in the MaxParts element.</p>
     * @public
     */
    IsTruncated?: boolean | undefined;
    /**
     * <p>Container for elements related to a particular part. A response can contain zero or more
     *             <code>Part</code> elements.</p>
     * @public
     */
    Parts?: Part[] | undefined;
    /**
     * <p>Container element that identifies who initiated the multipart upload. If the initiator
     *          is an Amazon Web Services account, this element provides the same information as the <code>Owner</code>
     *          element. If the initiator is an IAM User, this element provides the user ARN and display
     *          name.</p>
     * @public
     */
    Initiator?: Initiator | undefined;
    /**
     * <p>Container element that identifies the object owner, after the object is created. If
     *          multipart upload is initiated by an IAM user, this element provides the parent account ID
     *          and display name.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> - The bucket owner is
     *             returned as the object owner for all the parts.</p>
     *          </note>
     * @public
     */
    Owner?: Owner | undefined;
    /**
     * <p>The class of storage used to store the uploaded object.</p>
     *          <note>
     *             <p>
     *                <b>Directory buckets</b> -
     *             Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.</p>
     *          </note>
     * @public
     */
    StorageClass?: StorageClass | undefined;
    /**
     * <p>If present, indicates that the requester was successfully charged for the
     *          request.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestCharged?: RequestCharged | undefined;
    /**
     * <p>The algorithm that was used to create a checksum of the object.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p>The checksum type, which determines how part-level checksums are combined to create an
     *          object-level checksum for multipart objects. You can use this header response to verify
     *          that the checksum type that is received is the same checksum type that was specified in
     *          <code>CreateMultipartUpload</code> request. For more
     *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity
     *             in the Amazon S3 User Guide</a>.</p>
     * @public
     */
    ChecksumType?: ChecksumType | undefined;
}
/**
 * @public
 */
export interface ListPartsRequest {
    /**
     * <p>The name of the bucket to which the parts are being uploaded. </p>
     *          <p>
     *             <b>Directory buckets</b> -
     *          When you use this operation with a directory bucket, you must use virtual-hosted-style requests in the format <code>
     *                <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>. Path-style requests are not supported.  Directory bucket names must be unique in the chosen Zone (Availability Zone or Local Zone). Bucket names must follow the format <code>
     *                <i>bucket-base-name</i>--<i>zone-id</i>--x-s3</code> (for example, <code>
     *                <i>amzn-s3-demo-bucket</i>--<i>usw2-az1</i>--x-s3</code>). For information about bucket naming
     *          restrictions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html">Directory bucket naming
     *             rules</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <p>
     *             <b>Access points</b> - When you use this action with an access point for general purpose buckets, you must provide the alias of the access point in place of the bucket name or specify the access point ARN. When you use this action with an access point for directory buckets, you must provide the access point name in place of the bucket name. When using the access point ARN, you must direct requests to the access point hostname. The access point hostname takes the form <i>AccessPointName</i>-<i>AccountId</i>.s3-accesspoint.<i>Region</i>.amazonaws.com. When using this action with an access point through the Amazon Web Services SDKs, you provide the access point ARN in place of the bucket name. For more information about access point ARNs, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-access-points.html">Using access points</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>Object Lambda access points are not supported by directory buckets.</p>
     *          </note>
     *          <p>
     *             <b>S3 on Outposts</b> - When you use this action with S3 on Outposts, you must direct requests to the S3 on Outposts hostname. The S3 on Outposts hostname takes the
     *                      form <code>
     *                <i>AccessPointName</i>-<i>AccountId</i>.<i>outpostID</i>.s3-outposts.<i>Region</i>.amazonaws.com</code>. When you use this action with S3 on Outposts, the destination bucket must be the Outposts access point ARN or the access point alias. For more information about S3 on Outposts, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/S3onOutposts.html">What is S3 on Outposts?</a> in the <i>Amazon S3 User Guide</i>.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Object key for which the multipart upload was initiated.</p>
     * @public
     */
    Key: string | undefined;
    /**
     * <p>Sets the maximum number of parts to return.</p>
     * @public
     */
    MaxParts?: number | undefined;
    /**
     * <p>Specifies the part after which listing should begin. Only parts with higher part numbers
     *          will be listed.</p>
     * @public
     */
    PartNumberMarker?: string | undefined;
    /**
     * <p>Upload ID identifying the multipart upload whose parts are being listed.</p>
     * @public
     */
    UploadId: string | undefined;
    /**
     * <p>Confirms that the requester knows that they will be charged for the request. Bucket
     *          owners need not specify this parameter in their requests. If either the source or
     *          destination S3 bucket has Requester Pays enabled, the requester will pay for corresponding
     *          charges to copy the object. For information about downloading objects from Requester Pays
     *          buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectsinRequesterPaysBuckets.html">Downloading Objects in
     *             Requester Pays Buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    RequestPayer?: RequestPayer | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>The server-side encryption (SSE) algorithm used to encrypt the object. This parameter is needed only when the object was created
     *     using a checksum algorithm. For more information,
     *     see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Protecting data using SSE-C keys</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerAlgorithm?: string | undefined;
    /**
     * <p>The server-side encryption (SSE) customer managed key. This parameter is needed only when the object was created using a checksum algorithm.
     *     For more information, see
     *     <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Protecting data using SSE-C keys</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKey?: string | undefined;
    /**
     * <p>The MD5 server-side encryption (SSE) customer managed key. This parameter is needed only when the object was created using a checksum
     *     algorithm. For more information,
     *     see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Protecting data using SSE-C keys</a> in the
     *     <i>Amazon S3 User Guide</i>.</p>
     *          <note>
     *             <p>This functionality is not supported for directory buckets.</p>
     *          </note>
     * @public
     */
    SSECustomerKeyMD5?: string | undefined;
}
/**
 * @public
 */
export interface PutBucketAccelerateConfigurationRequest {
    /**
     * <p>The name of the bucket for which the accelerate configuration is set.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>Container for setting the transfer acceleration state.</p>
     * @public
     */
    AccelerateConfiguration: AccelerateConfiguration | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
    /**
     * <p>Indicates the algorithm used to create the checksum for the request when you use the SDK. This header will not provide any
     *     additional functionality if you don't use the SDK. When you send this header, there must be a corresponding <code>x-amz-checksum</code> or
     *     <code>x-amz-trailer</code> header sent. Otherwise, Amazon S3 fails the request with the HTTP status code <code>400 Bad Request</code>. For more
     *     information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in
     *     the <i>Amazon S3 User Guide</i>.</p>
     *          <p>If you provide an individual checksum, Amazon S3 ignores any provided
     *             <code>ChecksumAlgorithm</code> parameter.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
}
/**
 * @public
 */
export interface PutBucketAclRequest {
    /**
     * <p>The canned ACL to apply to the bucket.</p>
     * @public
     */
    ACL?: BucketCannedACL | undefined;
    /**
     * <p>Contains the elements that set the ACL permissions for an object per grantee.</p>
     * @public
     */
    AccessControlPolicy?: AccessControlPolicy | undefined;
    /**
     * <p>The bucket to which to apply the ACL.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The Base64 encoded 128-bit <code>MD5</code> digest of the data. This header must be used as a message
     *          integrity check to verify that the request body was not corrupted in transit. For more
     *          information, go to <a href="http://www.ietf.org/rfc/rfc1864.txt">RFC
     *          1864.</a>
     *          </p>
     *          <p>For requests made using the Amazon Web Services Command Line Interface (CLI) or Amazon Web Services SDKs, this field is calculated automatically.</p>
     * @public
     */
    ContentMD5?: string | undefined;
    /**
     * <p>Indicates the algorithm used to create the checksum for the request when you use the SDK. This header will not provide any
     *     additional functionality if you don't use the SDK. When you send this header, there must be a corresponding <code>x-amz-checksum</code> or
     *     <code>x-amz-trailer</code> header sent. Otherwise, Amazon S3 fails the request with the HTTP status code <code>400 Bad Request</code>. For more
     *     information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/checking-object-integrity.html">Checking object integrity</a> in
     *     the <i>Amazon S3 User Guide</i>.</p>
     *          <p>If you provide an individual checksum, Amazon S3 ignores any provided
     *             <code>ChecksumAlgorithm</code> parameter.</p>
     * @public
     */
    ChecksumAlgorithm?: ChecksumAlgorithm | undefined;
    /**
     * <p>Allows grantee the read, write, read ACP, and write ACP permissions on the
     *          bucket.</p>
     * @public
     */
    GrantFullControl?: string | undefined;
    /**
     * <p>Allows grantee to list the objects in the bucket.</p>
     * @public
     */
    GrantRead?: string | undefined;
    /**
     * <p>Allows grantee to read the bucket ACL.</p>
     * @public
     */
    GrantReadACP?: string | undefined;
    /**
     * <p>Allows grantee to create new objects in the bucket.</p>
     *          <p>For the bucket and object owners of existing objects, also allows deletions and
     *          overwrites of those objects.</p>
     * @public
     */
    GrantWrite?: string | undefined;
    /**
     * <p>Allows grantee to write the ACL for the applicable bucket.</p>
     * @public
     */
    GrantWriteACP?: string | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @public
 */
export interface PutBucketAnalyticsConfigurationRequest {
    /**
     * <p>The name of the bucket to which an analytics configuration is stored.</p>
     * <p>Note: To supply the Multi-region Access Point (MRAP) to Bucket, you need to install the "@aws-sdk/signature-v4-crt" package to your project dependencies.
     * For more information, please go to https://github.com/aws/aws-sdk-js-v3#known-issues</p>
     * @public
     */
    Bucket: string | undefined;
    /**
     * <p>The ID that identifies the analytics configuration.</p>
     * @public
     */
    Id: string | undefined;
    /**
     * <p>The configuration and any analyses for the analytics filter.</p>
     * @public
     */
    AnalyticsConfiguration: AnalyticsConfiguration | undefined;
    /**
     * <p>The account ID of the expected bucket owner. If the account ID that you provide does not match the actual owner of the bucket, the request fails with the HTTP status code <code>403 Forbidden</code> (access denied).</p>
     * @public
     */
    ExpectedBucketOwner?: string | undefined;
}
/**
 * @internal
 */
export declare const CompleteMultipartUploadOutputFilterSensitiveLog: (obj: CompleteMultipartUploadOutput) => any;
/**
 * @internal
 */
export declare const CompleteMultipartUploadRequestFilterSensitiveLog: (obj: CompleteMultipartUploadRequest) => any;
/**
 * @internal
 */
export declare const CopyObjectOutputFilterSensitiveLog: (obj: CopyObjectOutput) => any;
/**
 * @internal
 */
export declare const CopyObjectRequestFilterSensitiveLog: (obj: CopyObjectRequest) => any;
/**
 * @internal
 */
export declare const CreateMultipartUploadOutputFilterSensitiveLog: (obj: CreateMultipartUploadOutput) => any;
/**
 * @internal
 */
export declare const CreateMultipartUploadRequestFilterSensitiveLog: (obj: CreateMultipartUploadRequest) => any;
/**
 * @internal
 */
export declare const SessionCredentialsFilterSensitiveLog: (obj: SessionCredentials) => any;
/**
 * @internal
 */
export declare const CreateSessionOutputFilterSensitiveLog: (obj: CreateSessionOutput) => any;
/**
 * @internal
 */
export declare const CreateSessionRequestFilterSensitiveLog: (obj: CreateSessionRequest) => any;
/**
 * @internal
 */
export declare const ServerSideEncryptionByDefaultFilterSensitiveLog: (obj: ServerSideEncryptionByDefault) => any;
/**
 * @internal
 */
export declare const ServerSideEncryptionRuleFilterSensitiveLog: (obj: ServerSideEncryptionRule) => any;
/**
 * @internal
 */
export declare const ServerSideEncryptionConfigurationFilterSensitiveLog: (obj: ServerSideEncryptionConfiguration) => any;
/**
 * @internal
 */
export declare const GetBucketEncryptionOutputFilterSensitiveLog: (obj: GetBucketEncryptionOutput) => any;
/**
 * @internal
 */
export declare const SSEKMSFilterSensitiveLog: (obj: SSEKMS) => any;
/**
 * @internal
 */
export declare const InventoryEncryptionFilterSensitiveLog: (obj: InventoryEncryption) => any;
/**
 * @internal
 */
export declare const InventoryS3BucketDestinationFilterSensitiveLog: (obj: InventoryS3BucketDestination) => any;
/**
 * @internal
 */
export declare const InventoryDestinationFilterSensitiveLog: (obj: InventoryDestination) => any;
/**
 * @internal
 */
export declare const InventoryConfigurationFilterSensitiveLog: (obj: InventoryConfiguration) => any;
/**
 * @internal
 */
export declare const GetBucketInventoryConfigurationOutputFilterSensitiveLog: (obj: GetBucketInventoryConfigurationOutput) => any;
/**
 * @internal
 */
export declare const GetObjectOutputFilterSensitiveLog: (obj: GetObjectOutput) => any;
/**
 * @internal
 */
export declare const GetObjectRequestFilterSensitiveLog: (obj: GetObjectRequest) => any;
/**
 * @internal
 */
export declare const GetObjectAttributesRequestFilterSensitiveLog: (obj: GetObjectAttributesRequest) => any;
/**
 * @internal
 */
export declare const GetObjectTorrentOutputFilterSensitiveLog: (obj: GetObjectTorrentOutput) => any;
/**
 * @internal
 */
export declare const HeadObjectOutputFilterSensitiveLog: (obj: HeadObjectOutput) => any;
/**
 * @internal
 */
export declare const HeadObjectRequestFilterSensitiveLog: (obj: HeadObjectRequest) => any;
/**
 * @internal
 */
export declare const ListBucketInventoryConfigurationsOutputFilterSensitiveLog: (obj: ListBucketInventoryConfigurationsOutput) => any;
/**
 * @internal
 */
export declare const ListPartsRequestFilterSensitiveLog: (obj: ListPartsRequest) => any;
