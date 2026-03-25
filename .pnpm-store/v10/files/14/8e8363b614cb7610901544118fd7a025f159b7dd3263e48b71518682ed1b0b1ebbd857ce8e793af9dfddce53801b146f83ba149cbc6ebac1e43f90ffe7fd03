import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { HeadObjectOutput, HeadObjectRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link HeadObjectCommand}.
 */
export interface HeadObjectCommandInput extends HeadObjectRequest {
}
/**
 * @public
 *
 * The output of {@link HeadObjectCommand}.
 */
export interface HeadObjectCommandOutput extends HeadObjectOutput, __MetadataBearer {
}
declare const HeadObjectCommand_base: {
    new (input: HeadObjectCommandInput): import("@smithy/smithy-client").CommandImpl<HeadObjectCommandInput, HeadObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: HeadObjectCommandInput): import("@smithy/smithy-client").CommandImpl<HeadObjectCommandInput, HeadObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>The <code>HEAD</code> operation retrieves metadata from an object without returning the
 *          object itself. This operation is useful if you're interested only in an object's
 *          metadata.</p>
 *          <note>
 *             <p>A <code>HEAD</code> request has the same options as a <code>GET</code> operation on
 *             an object. The response is identical to the <code>GET</code> response except that there
 *             is no response body. Because of this, if the <code>HEAD</code> request generates an
 *             error, it returns a generic code, such as <code>400 Bad Request</code>, <code>403
 *                Forbidden</code>, <code>404 Not Found</code>, <code>405 Method Not Allowed</code>,
 *                <code>412 Precondition Failed</code>, or <code>304 Not Modified</code>. It's not
 *             possible to retrieve the exact exception of these error codes.</p>
 *          </note>
 *          <p>Request headers are limited to 8 KB in size. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonRequestHeaders.html">Common
 *             Request Headers</a>.</p>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p></p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - To
 *                         use <code>HEAD</code>, you must have the <code>s3:GetObject</code>
 *                         permission. You need the relevant read object (or version) permission for
 *                         this operation. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/list_amazons3.html">Actions, resources, and
 *                            condition keys for Amazon S3</a> in the <i>Amazon S3 User
 *                            Guide</i>. For more information about the permissions to S3 API
 *                         operations by S3 resource types, see <a href="/AmazonS3/latest/userguide/using-with-s3-policy-actions.html">Required permissions for Amazon S3 API operations</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                      <p>If the object you request doesn't exist, the error that Amazon S3 returns
 *                         depends on whether you also have the <code>s3:ListBucket</code>
 *                         permission.</p>
 *                      <ul>
 *                         <li>
 *                            <p>If you have the <code>s3:ListBucket</code> permission on the
 *                               bucket, Amazon S3 returns an HTTP status code <code>404 Not Found</code>
 *                               error.</p>
 *                         </li>
 *                         <li>
 *                            <p>If you don’t have the <code>s3:ListBucket</code> permission, Amazon S3
 *                               returns an HTTP status code <code>403 Forbidden</code> error.</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> - To grant access to this API operation on a directory bucket, we recommend that you use the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">
 *                            <code>CreateSession</code>
 *                         </a> API operation for session-based authorization. Specifically, you grant the <code>s3express:CreateSession</code> permission to the directory bucket in a bucket policy or an IAM identity-based policy. Then, you make the <code>CreateSession</code> API call on the bucket to obtain a session token. With the session token in your request header, you can make API requests to this operation. After the session token expires, you make another <code>CreateSession</code> API call to generate a new session token for use.
 * Amazon Web Services CLI or SDKs create session and refresh the session token automatically to avoid service interruptions when a session expires. For more information about authorization, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">
 *                            <code>CreateSession</code>
 *                         </a>.</p>
 *                      <p>If you enable <code>x-amz-checksum-mode</code> in the request and the
 *                         object is encrypted with Amazon Web Services Key Management Service (Amazon Web Services KMS), you must
 *                         also have the <code>kms:GenerateDataKey</code> and <code>kms:Decrypt</code>
 *                         permissions in IAM identity-based policies and KMS key policies for the
 *                         KMS key to retrieve the checksum of the object.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Encryption</dt>
 *             <dd>
 *                <note>
 *                   <p>Encryption request headers, like <code>x-amz-server-side-encryption</code>,
 *                      should not be sent for <code>HEAD</code> requests if your object uses
 *                      server-side encryption with Key Management Service (KMS) keys (SSE-KMS), dual-layer
 *                      server-side encryption with Amazon Web Services KMS keys (DSSE-KMS), or server-side
 *                      encryption with Amazon S3 managed encryption keys (SSE-S3). The
 *                         <code>x-amz-server-side-encryption</code> header is used when you
 *                         <code>PUT</code> an object to S3 and want to specify the encryption method.
 *                      If you include this header in a <code>HEAD</code> request for an object that
 *                      uses these types of keys, you’ll get an HTTP <code>400 Bad Request</code>
 *                      error. It's because the encryption method can't be changed when you retrieve
 *                      the object.</p>
 *                </note>
 *                <p>If you encrypt an object by using server-side encryption with customer-provided
 *                   encryption keys (SSE-C) when you store the object in Amazon S3, then when you retrieve
 *                   the metadata from the object, you must use the following headers to provide the
 *                   encryption key for the server to be able to retrieve the object's metadata. The
 *                   headers are: </p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <code>x-amz-server-side-encryption-customer-algorithm</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>x-amz-server-side-encryption-customer-key</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>x-amz-server-side-encryption-customer-key-MD5</code>
 *                      </p>
 *                   </li>
 *                </ul>
 *                <p>For more information about SSE-C, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Server-Side
 *                      Encryption (Using Customer-Provided Encryption Keys)</a> in the
 *                      <i>Amazon S3 User Guide</i>.</p>
 *                <note>
 *                   <p>
 *                      <b>Directory bucket </b> -
 *                      For directory buckets, there are only two supported options for server-side encryption: SSE-S3 and SSE-KMS. SSE-C isn't supported. For more
 *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>. </p>
 *                </note>
 *             </dd>
 *             <dt>Versioning</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>If the current version of the object is a delete marker, Amazon S3 behaves as
 *                         if the object was deleted and includes <code>x-amz-delete-marker:
 *                            true</code> in the response.</p>
 *                   </li>
 *                   <li>
 *                      <p>If the specified version is a delete marker, the response returns a
 *                            <code>405 Method Not Allowed</code> error and the <code>Last-Modified:
 *                            timestamp</code> response header.</p>
 *                   </li>
 *                </ul>
 *                <note>
 *                   <ul>
 *                      <li>
 *                         <p>
 *                            <b>Directory buckets</b> -
 *                            Delete marker is not supported for directory buckets.</p>
 *                      </li>
 *                      <li>
 *                         <p>
 *                            <b>Directory buckets</b> -
 *                            S3 Versioning isn't enabled and supported for directory buckets. For this API operation, only the <code>null</code> value of the version ID is supported by directory buckets. You can only specify <code>null</code>
 *                            to the <code>versionId</code> query parameter in the request.</p>
 *                      </li>
 *                   </ul>
 *                </note>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *                <note>
 *                   <p>For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                      </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </note>
 *             </dd>
 *          </dl>
 *          <p>The following actions are related to <code>HeadObject</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAttributes.html">GetObjectAttributes</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // HeadObjectRequest
 *   Bucket: "STRING_VALUE", // required
 *   IfMatch: "STRING_VALUE",
 *   IfModifiedSince: new Date("TIMESTAMP"),
 *   IfNoneMatch: "STRING_VALUE",
 *   IfUnmodifiedSince: new Date("TIMESTAMP"),
 *   Key: "STRING_VALUE", // required
 *   Range: "STRING_VALUE",
 *   ResponseCacheControl: "STRING_VALUE",
 *   ResponseContentDisposition: "STRING_VALUE",
 *   ResponseContentEncoding: "STRING_VALUE",
 *   ResponseContentLanguage: "STRING_VALUE",
 *   ResponseContentType: "STRING_VALUE",
 *   ResponseExpires: new Date("TIMESTAMP"),
 *   VersionId: "STRING_VALUE",
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   PartNumber: Number("int"),
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   ChecksumMode: "ENABLED",
 * };
 * const command = new HeadObjectCommand(input);
 * const response = await client.send(command);
 * // { // HeadObjectOutput
 * //   DeleteMarker: true || false,
 * //   AcceptRanges: "STRING_VALUE",
 * //   Expiration: "STRING_VALUE",
 * //   Restore: "STRING_VALUE",
 * //   ArchiveStatus: "ARCHIVE_ACCESS" || "DEEP_ARCHIVE_ACCESS",
 * //   LastModified: new Date("TIMESTAMP"),
 * //   ContentLength: Number("long"),
 * //   ChecksumCRC32: "STRING_VALUE",
 * //   ChecksumCRC32C: "STRING_VALUE",
 * //   ChecksumCRC64NVME: "STRING_VALUE",
 * //   ChecksumSHA1: "STRING_VALUE",
 * //   ChecksumSHA256: "STRING_VALUE",
 * //   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //   ETag: "STRING_VALUE",
 * //   MissingMeta: Number("int"),
 * //   VersionId: "STRING_VALUE",
 * //   CacheControl: "STRING_VALUE",
 * //   ContentDisposition: "STRING_VALUE",
 * //   ContentEncoding: "STRING_VALUE",
 * //   ContentLanguage: "STRING_VALUE",
 * //   ContentType: "STRING_VALUE",
 * //   ContentRange: "STRING_VALUE",
 * //   Expires: new Date("TIMESTAMP"),
 * //   ExpiresString: "STRING_VALUE",
 * //   WebsiteRedirectLocation: "STRING_VALUE",
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   Metadata: { // Metadata
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   SSECustomerAlgorithm: "STRING_VALUE",
 * //   SSECustomerKeyMD5: "STRING_VALUE",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "GLACIER" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 * //   RequestCharged: "requester",
 * //   ReplicationStatus: "COMPLETE" || "PENDING" || "FAILED" || "REPLICA" || "COMPLETED",
 * //   PartsCount: Number("int"),
 * //   ObjectLockMode: "GOVERNANCE" || "COMPLIANCE",
 * //   ObjectLockRetainUntilDate: new Date("TIMESTAMP"),
 * //   ObjectLockLegalHoldStatus: "ON" || "OFF",
 * // };
 *
 * ```
 *
 * @param HeadObjectCommandInput - {@link HeadObjectCommandInput}
 * @returns {@link HeadObjectCommandOutput}
 * @see {@link HeadObjectCommandInput} for command's `input` shape.
 * @see {@link HeadObjectCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NotFound} (client fault)
 *  <p>The specified content does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To retrieve metadata of an object without returning the object itself
 * ```javascript
 * // The following example retrieves an object metadata.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new HeadObjectCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   AcceptRanges: "bytes",
 *   ContentLength: 3191,
 *   ContentType: "image/jpeg",
 *   ETag: `"6805f2cfc46c0f04559748bb039d69ae"`,
 *   LastModified: "2016-12-15T01:19:41.000Z",
 *   Metadata:   { /* empty *\/ },
 *   VersionId: "null"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class HeadObjectCommand extends HeadObjectCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: HeadObjectRequest;
            output: HeadObjectOutput;
        };
        sdk: {
            input: HeadObjectCommandInput;
            output: HeadObjectCommandOutput;
        };
    };
}
