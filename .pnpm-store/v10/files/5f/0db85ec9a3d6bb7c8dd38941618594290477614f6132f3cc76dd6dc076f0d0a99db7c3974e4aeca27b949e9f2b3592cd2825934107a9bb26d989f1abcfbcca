import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer, StreamingBlobPayloadOutputTypes } from "@smithy/types";
import { GetObjectOutput, GetObjectRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetObjectCommand}.
 */
export interface GetObjectCommandInput extends GetObjectRequest {
}
/**
 * @public
 *
 * The output of {@link GetObjectCommand}.
 */
export interface GetObjectCommandOutput extends Omit<GetObjectOutput, "Body">, __MetadataBearer {
    Body?: StreamingBlobPayloadOutputTypes;
}
declare const GetObjectCommand_base: {
    new (input: GetObjectCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectCommandInput, GetObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetObjectCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectCommandInput, GetObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves an object from Amazon S3.</p>
 *          <p>In the <code>GetObject</code> request, specify the full key name for the object.</p>
 *          <p>
 *             <b>General purpose buckets</b> - Both the virtual-hosted-style
 *          requests and the path-style requests are supported. For a virtual hosted-style request
 *          example, if you have the object <code>photos/2006/February/sample.jpg</code>, specify the
 *          object key name as <code>/photos/2006/February/sample.jpg</code>. For a path-style request
 *          example, if you have the object <code>photos/2006/February/sample.jpg</code> in the bucket
 *          named <code>examplebucket</code>, specify the object key name as
 *             <code>/examplebucket/photos/2006/February/sample.jpg</code>. For more information about
 *          request types, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/VirtualHosting.html#VirtualHostingSpecifyBucket">HTTP Host
 *             Header Bucket Specification</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <p>
 *             <b>Directory buckets</b> -
 *          Only virtual-hosted-style requests are supported. For a virtual hosted-style request example, if you have the object <code>photos/2006/February/sample.jpg</code> in the bucket named <code>amzn-s3-demo-bucket--usw2-az1--x-s3</code>, specify the object key name as <code>/photos/2006/February/sample.jpg</code>. Also, when you make requests to this API operation, your requests are sent to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *             </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - You
 *                         must have the required permissions in a policy. To use
 *                            <code>GetObject</code>, you must have the <code>READ</code> access to the
 *                         object (or version). If you grant <code>READ</code> access to the anonymous
 *                         user, the <code>GetObject</code> operation returns the object without using
 *                         an authorization header. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html">Specifying permissions in a policy</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                      <p>If you include a <code>versionId</code> in your request header, you must
 *                         have the <code>s3:GetObjectVersion</code> permission to access a specific
 *                         version of an object. The <code>s3:GetObject</code> permission is not
 *                         required in this scenario.</p>
 *                      <p>If you request the current version of an object without a specific
 *                            <code>versionId</code> in the request header, only the
 *                            <code>s3:GetObject</code> permission is required. The
 *                            <code>s3:GetObjectVersion</code> permission is not required in this
 *                         scenario. </p>
 *                      <p>If the object that you request doesn’t exist, the error that Amazon S3 returns
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
 *                               returns an HTTP status code <code>403 Access Denied</code>
 *                               error.</p>
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
 *                      <p>If
 *                         the
 *                         object is encrypted using SSE-KMS, you must also have the
 *                            <code>kms:GenerateDataKey</code> and <code>kms:Decrypt</code> permissions
 *                         in IAM identity-based policies and KMS key policies for the KMS
 *                         key.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Storage classes</dt>
 *             <dd>
 *                <p>If the object you are retrieving is stored in the S3 Glacier Flexible Retrieval
 *                   storage class, the S3 Glacier Deep Archive storage class, the
 *                   S3 Intelligent-Tiering Archive Access tier, or the S3 Intelligent-Tiering Deep Archive Access tier,
 *                   before you can retrieve the object you must first restore a copy using <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html">RestoreObject</a>. Otherwise, this operation returns an
 *                      <code>InvalidObjectState</code> error. For information about restoring archived
 *                   objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/restoring-objects.html">Restoring Archived
 *                      Objects</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                <p>
 *                   <b>Directory buckets </b> -
 *                   Directory buckets only support <code>EXPRESS_ONEZONE</code> (the S3 Express One Zone storage class) in Availability Zones and <code>ONEZONE_IA</code> (the S3 One Zone-Infrequent Access storage class) in Dedicated Local Zones.
 * Unsupported storage class values won't write a destination object and will respond with the HTTP status code <code>400 Bad Request</code>.</p>
 *             </dd>
 *             <dt>Encryption</dt>
 *             <dd>
 *                <p>Encryption request headers, like <code>x-amz-server-side-encryption</code>,
 *                   should not be sent for the <code>GetObject</code> requests, if your object uses
 *                   server-side encryption with Amazon S3 managed encryption keys (SSE-S3), server-side
 *                   encryption with Key Management Service (KMS) keys (SSE-KMS), or dual-layer server-side
 *                   encryption with Amazon Web Services KMS keys (DSSE-KMS). If you include the header in your
 *                      <code>GetObject</code> requests for the object that uses these types of keys,
 *                   you’ll get an HTTP <code>400 Bad Request</code> error.</p>
 *                <p>
 *                   <b>Directory buckets</b> -
 *                   For directory buckets, there are only two supported options for server-side encryption: SSE-S3 and SSE-KMS. SSE-C isn't supported. For more
 *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>.</p>
 *             </dd>
 *             <dt>Overriding response header values through the request</dt>
 *             <dd>
 *                <p>There are times when you want to override certain response header values of a
 *                      <code>GetObject</code> response. For example, you might override the
 *                      <code>Content-Disposition</code> response header value through your
 *                      <code>GetObject</code> request.</p>
 *                <p>You can override values for a set of response headers. These modified response
 *                   header values are included only in a successful response, that is, when the HTTP
 *                   status code <code>200 OK</code> is returned. The headers you can override using
 *                   the following query parameters in the request are a subset of the headers that
 *                   Amazon S3 accepts when you create an object. </p>
 *                <p>The response headers that you can override for the <code>GetObject</code>
 *                   response are <code>Cache-Control</code>, <code>Content-Disposition</code>,
 *                      <code>Content-Encoding</code>, <code>Content-Language</code>,
 *                      <code>Content-Type</code>, and <code>Expires</code>.</p>
 *                <p>To override values for a set of response headers in the <code>GetObject</code>
 *                   response, you can use the following query parameters in the request.</p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <code>response-cache-control</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>response-content-disposition</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>response-content-encoding</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>response-content-language</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>response-content-type</code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <code>response-expires</code>
 *                      </p>
 *                   </li>
 *                </ul>
 *                <note>
 *                   <p>When you use these parameters, you must sign the request by using either an
 *                      Authorization header or a presigned URL. These parameters cannot be used with
 *                      an unsigned (anonymous) request.</p>
 *                </note>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>GetObject</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html">ListBuckets</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAcl.html">GetObjectAcl</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetObjectRequest
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
 * const command = new GetObjectCommand(input);
 * const response = await client.send(command);
 * // consume or destroy the stream to free the socket.
 * const bytes = await response.Body.transformToByteArray();
 * // const str = await response.Body.transformToString();
 * // response.Body.destroy(); // only applicable to Node.js Readable streams.
 *
 * // { // GetObjectOutput
 * //   Body: "<SdkStream>", // see \@smithy/types -> StreamingBlobPayloadOutputTypes
 * //   DeleteMarker: true || false,
 * //   AcceptRanges: "STRING_VALUE",
 * //   Expiration: "STRING_VALUE",
 * //   Restore: "STRING_VALUE",
 * //   LastModified: new Date("TIMESTAMP"),
 * //   ContentLength: Number("long"),
 * //   ETag: "STRING_VALUE",
 * //   ChecksumCRC32: "STRING_VALUE",
 * //   ChecksumCRC32C: "STRING_VALUE",
 * //   ChecksumCRC64NVME: "STRING_VALUE",
 * //   ChecksumSHA1: "STRING_VALUE",
 * //   ChecksumSHA256: "STRING_VALUE",
 * //   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //   MissingMeta: Number("int"),
 * //   VersionId: "STRING_VALUE",
 * //   CacheControl: "STRING_VALUE",
 * //   ContentDisposition: "STRING_VALUE",
 * //   ContentEncoding: "STRING_VALUE",
 * //   ContentLanguage: "STRING_VALUE",
 * //   ContentRange: "STRING_VALUE",
 * //   ContentType: "STRING_VALUE",
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
 * //   TagCount: Number("int"),
 * //   ObjectLockMode: "GOVERNANCE" || "COMPLIANCE",
 * //   ObjectLockRetainUntilDate: new Date("TIMESTAMP"),
 * //   ObjectLockLegalHoldStatus: "ON" || "OFF",
 * // };
 *
 * ```
 *
 * @param GetObjectCommandInput - {@link GetObjectCommandInput}
 * @returns {@link GetObjectCommandOutput}
 * @see {@link GetObjectCommandInput} for command's `input` shape.
 * @see {@link GetObjectCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link InvalidObjectState} (client fault)
 *  <p>Object is archived and inaccessible until restored.</p>
 *          <p>If the object you are retrieving is stored in the S3 Glacier Flexible Retrieval storage
 *          class, the S3 Glacier Deep Archive storage class, the S3 Intelligent-Tiering Archive Access
 *          tier, or the S3 Intelligent-Tiering Deep Archive Access tier, before you can retrieve the object you
 *          must first restore a copy using <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_RestoreObject.html">RestoreObject</a>. Otherwise, this
 *          operation returns an <code>InvalidObjectState</code> error. For information about restoring
 *          archived objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/restoring-objects.html">Restoring Archived Objects</a> in
 *          the <i>Amazon S3 User Guide</i>.</p>
 *
 * @throws {@link NoSuchKey} (client fault)
 *  <p>The specified key does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To retrieve a byte range of an object
 * ```javascript
 * // The following example retrieves an object for an S3 bucket. The request specifies the range header to retrieve a specific byte range.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "SampleFile.txt",
 *   Range: "bytes=0-9"
 * };
 * const command = new GetObjectCommand(input);
 * const response = await client.send(command);
 * // consume or destroy the stream to free the socket.
 * const bytes = await response.Body.transformToByteArray();
 * // const str = await response.Body.transformToString();
 * // response.Body.destroy(); // only applicable to Node.js Readable streams.
 *
 * /* response is
 * {
 *   AcceptRanges: "bytes",
 *   ContentLength: 10,
 *   ContentRange: "bytes 0-9/43",
 *   ContentType: "text/plain",
 *   ETag: `"0d94420ffd0bc68cd3d152506b97a9cc"`,
 *   LastModified: "2014-10-09T22:57:28.000Z",
 *   Metadata:   { /* empty *\/ },
 *   VersionId: "null"
 * }
 * *\/
 * ```
 *
 * @example To retrieve an object
 * ```javascript
 * // The following example retrieves an object for an S3 bucket.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new GetObjectCommand(input);
 * const response = await client.send(command);
 * // consume or destroy the stream to free the socket.
 * const bytes = await response.Body.transformToByteArray();
 * // const str = await response.Body.transformToString();
 * // response.Body.destroy(); // only applicable to Node.js Readable streams.
 *
 * /* response is
 * {
 *   AcceptRanges: "bytes",
 *   ContentLength: 3191,
 *   ContentType: "image/jpeg",
 *   ETag: `"6805f2cfc46c0f04559748bb039d69ae"`,
 *   LastModified: "2016-12-15T01:19:41.000Z",
 *   Metadata:   { /* empty *\/ },
 *   TagCount: 2,
 *   VersionId: "null"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetObjectCommand extends GetObjectCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetObjectRequest;
            output: GetObjectOutput;
        };
        sdk: {
            input: GetObjectCommandInput;
            output: GetObjectCommandOutput;
        };
    };
}
