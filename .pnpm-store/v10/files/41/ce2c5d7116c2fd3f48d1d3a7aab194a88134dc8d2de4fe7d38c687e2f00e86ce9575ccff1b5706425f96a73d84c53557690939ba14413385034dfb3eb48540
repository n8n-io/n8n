import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer, StreamingBlobPayloadInputTypes } from "@smithy/types";
import { UploadPartOutput, UploadPartRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UploadPartCommand}.
 */
export interface UploadPartCommandInput extends Omit<UploadPartRequest, "Body"> {
    Body?: StreamingBlobPayloadInputTypes;
}
/**
 * @public
 *
 * The output of {@link UploadPartCommand}.
 */
export interface UploadPartCommandOutput extends UploadPartOutput, __MetadataBearer {
}
declare const UploadPartCommand_base: {
    new (input: UploadPartCommandInput): import("@smithy/smithy-client").CommandImpl<UploadPartCommandInput, UploadPartCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UploadPartCommandInput): import("@smithy/smithy-client").CommandImpl<UploadPartCommandInput, UploadPartCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Uploads a part in a multipart upload.</p>
 *          <note>
 *             <p>In this operation, you provide new data as a part of an object in your request.
 *             However, you have an option to specify your existing Amazon S3 object as a data source for
 *             the part you are uploading. To upload a part from an existing object, you use the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a> operation. </p>
 *          </note>
 *          <p>You must initiate a multipart upload (see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateMultipartUpload.html">CreateMultipartUpload</a>)
 *          before you can upload any part. In response to your initiate request, Amazon S3 returns an
 *          upload ID, a unique identifier that you must include in your upload part request.</p>
 *          <p>Part numbers can be any number from 1 to 10,000, inclusive. A part number uniquely
 *          identifies a part and also defines its position within the object being created. If you
 *          upload a new part using the same part number that was used with a previous part, the
 *          previously uploaded part is overwritten.</p>
 *          <p>For information about maximum and minimum part sizes and other multipart upload
 *          specifications, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html">Multipart upload limits</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>After you initiate multipart upload and upload one or more parts, you must either
 *             complete or abort multipart upload in order to stop getting charged for storage of the
 *             uploaded parts. Only after you either complete or abort multipart upload, Amazon S3 frees up
 *             the parts storage and stops charging you for the parts storage.</p>
 *          </note>
 *          <p>For more information on multipart uploads, go to <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html">Multipart Upload Overview</a> in the
 *             <i>Amazon S3 User Guide </i>.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> -
 *             For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - To
 *                         perform a multipart upload with encryption using an Key Management Service key, the
 *                         requester must have permission to the <code>kms:Decrypt</code> and
 *                            <code>kms:GenerateDataKey</code> actions on the key. The requester must
 *                         also have permissions for the <code>kms:GenerateDataKey</code> action for
 *                         the <code>CreateMultipartUpload</code> API. Then, the requester needs
 *                         permissions for the <code>kms:Decrypt</code> action on the
 *                            <code>UploadPart</code> and <code>UploadPartCopy</code> APIs.</p>
 *                      <p>These permissions are required because Amazon S3 must decrypt and read data
 *                         from the encrypted file parts before it completes the multipart upload. For
 *                         more information about KMS permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html">Protecting data
 *                            using server-side encryption with KMS</a> in the
 *                            <i>Amazon S3 User Guide</i>. For information about the
 *                         permissions required to use the multipart upload API, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuAndPermissions.html">Multipart upload and permissions</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html#mpuAndPermissions">Multipart upload API and permissions</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> - To grant access to this API operation on a directory bucket, we recommend that you use the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">
 *                            <code>CreateSession</code>
 *                         </a> API operation for session-based authorization. Specifically, you grant the <code>s3express:CreateSession</code> permission to the directory bucket in a bucket policy or an IAM identity-based policy. Then, you make the <code>CreateSession</code> API call on the bucket to obtain a session token. With the session token in your request header, you can make API requests to this operation. After the session token expires, you make another <code>CreateSession</code> API call to generate a new session token for use.
 * Amazon Web Services CLI or SDKs create session and refresh the session token automatically to avoid service interruptions when a session expires. For more information about authorization, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">
 *                            <code>CreateSession</code>
 *                         </a>.</p>
 *                      <p>If the object is encrypted with SSE-KMS, you must also have the
 *                            <code>kms:GenerateDataKey</code> and <code>kms:Decrypt</code> permissions
 *                         in IAM identity-based policies and KMS key policies for the KMS
 *                         key.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Data integrity</dt>
 *             <dd>
 *                <p>
 *                   <b>General purpose bucket</b> - To ensure that data
 *                   is not corrupted traversing the network, specify the <code>Content-MD5</code>
 *                   header in the upload part request. Amazon S3 checks the part data against the provided
 *                   MD5 value. If they do not match, Amazon S3 returns an error. If the upload request is
 *                   signed with Signature Version 4, then Amazon Web Services S3 uses the
 *                      <code>x-amz-content-sha256</code> header as a checksum instead of
 *                      <code>Content-MD5</code>. For more information see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-auth-using-authorization-header.html">Authenticating Requests: Using the Authorization Header (Amazon Web Services Signature
 *                      Version 4)</a>. </p>
 *                <note>
 *                   <p>
 *                      <b>Directory buckets</b> - MD5 is not supported by directory buckets. You can use checksum algorithms to check object integrity.</p>
 *                </note>
 *             </dd>
 *             <dt>Encryption</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket</b> - Server-side
 *                         encryption is for data encryption at rest. Amazon S3 encrypts your data as it
 *                         writes it to disks in its data centers and decrypts it when you access it.
 *                         You have mutually exclusive options to protect data using server-side
 *                         encryption in Amazon S3, depending on how you choose to manage the encryption
 *                         keys. Specifically, the encryption key options are Amazon S3 managed keys
 *                         (SSE-S3), Amazon Web Services KMS keys (SSE-KMS), and Customer-Provided Keys (SSE-C).
 *                         Amazon S3 encrypts data with server-side encryption using Amazon S3 managed keys
 *                         (SSE-S3) by default. You can optionally tell Amazon S3 to encrypt data at rest
 *                         using server-side encryption with other key options. The option you use
 *                         depends on whether you want to use KMS keys (SSE-KMS) or provide your own
 *                         encryption key (SSE-C).</p>
 *                      <p>Server-side encryption is supported by the S3 Multipart Upload
 *                         operations. Unless you are using a customer-provided encryption key (SSE-C),
 *                         you don't need to specify the encryption parameters in each UploadPart
 *                         request. Instead, you only need to specify the server-side encryption
 *                         parameters in the initial Initiate Multipart request. For more information,
 *                         see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateMultipartUpload.html">CreateMultipartUpload</a>.</p>
 *                      <p>If you request server-side encryption using a customer-provided
 *                         encryption key (SSE-C) in your initiate multipart upload request, you must
 *                         provide identical encryption information in each part upload using the
 *                         following request headers.</p>
 *                      <ul>
 *                         <li>
 *                            <p>x-amz-server-side-encryption-customer-algorithm</p>
 *                         </li>
 *                         <li>
 *                            <p>x-amz-server-side-encryption-customer-key</p>
 *                         </li>
 *                         <li>
 *                            <p>x-amz-server-side-encryption-customer-key-MD5</p>
 *                         </li>
 *                      </ul>
 *                      <p> For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingServerSideEncryption.html">Using
 *                            Server-Side Encryption</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory buckets </b> -
 *                         For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>).</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Special errors</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>Error Code: <code>NoSuchUpload</code>
 *                      </p>
 *                      <ul>
 *                         <li>
 *                            <p>Description: The specified multipart upload does not exist. The
 *                               upload ID might be invalid, or the multipart upload might have been
 *                               aborted or completed.</p>
 *                         </li>
 *                         <li>
 *                            <p>HTTP Status Code: 404 Not Found </p>
 *                         </li>
 *                         <li>
 *                            <p>SOAP Fault Code Prefix: Client</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>UploadPart</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateMultipartUpload.html">CreateMultipartUpload</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CompleteMultipartUpload.html">CompleteMultipartUpload</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_AbortMultipartUpload.html">AbortMultipartUpload</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListParts.html">ListParts</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListMultipartUploads.html">ListMultipartUploads</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, UploadPartCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // UploadPartRequest
 *   Body: "MULTIPLE_TYPES_ACCEPTED", // see \@smithy/types -> StreamingBlobPayloadInputTypes
 *   Bucket: "STRING_VALUE", // required
 *   ContentLength: Number("long"),
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   ChecksumCRC32: "STRING_VALUE",
 *   ChecksumCRC32C: "STRING_VALUE",
 *   ChecksumCRC64NVME: "STRING_VALUE",
 *   ChecksumSHA1: "STRING_VALUE",
 *   ChecksumSHA256: "STRING_VALUE",
 *   Key: "STRING_VALUE", // required
 *   PartNumber: Number("int"), // required
 *   UploadId: "STRING_VALUE", // required
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new UploadPartCommand(input);
 * const response = await client.send(command);
 * // { // UploadPartOutput
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   ETag: "STRING_VALUE",
 * //   ChecksumCRC32: "STRING_VALUE",
 * //   ChecksumCRC32C: "STRING_VALUE",
 * //   ChecksumCRC64NVME: "STRING_VALUE",
 * //   ChecksumSHA1: "STRING_VALUE",
 * //   ChecksumSHA256: "STRING_VALUE",
 * //   SSECustomerAlgorithm: "STRING_VALUE",
 * //   SSECustomerKeyMD5: "STRING_VALUE",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param UploadPartCommandInput - {@link UploadPartCommandInput}
 * @returns {@link UploadPartCommandOutput}
 * @see {@link UploadPartCommandInput} for command's `input` shape.
 * @see {@link UploadPartCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To upload a part
 * ```javascript
 * // The following example uploads part 1 of a multipart upload. The example specifies a file name for the part data. The Upload ID is same that is returned by the initiate multipart upload.
 * const input = {
 *   Body: "fileToUpload",
 *   Bucket: "examplebucket",
 *   Key: "examplelargeobject",
 *   PartNumber: 1,
 *   UploadId: "xadcOB_7YPBOJuoFiQ9cz4P3Pe6FIZwO4f7wN93uHsNBEw97pl5eNwzExg0LAT2dUN91cOmrEQHDsP3WA60CEg--"
 * };
 * const command = new UploadPartCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ETag: `"d8c2eafd90c266e19ab9dcacc479f8af"`
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class UploadPartCommand extends UploadPartCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UploadPartRequest;
            output: UploadPartOutput;
        };
        sdk: {
            input: UploadPartCommandInput;
            output: UploadPartCommandOutput;
        };
    };
}
