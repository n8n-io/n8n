import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UploadPartCopyOutput, UploadPartCopyRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UploadPartCopyCommand}.
 */
export interface UploadPartCopyCommandInput extends UploadPartCopyRequest {
}
/**
 * @public
 *
 * The output of {@link UploadPartCopyCommand}.
 */
export interface UploadPartCopyCommandOutput extends UploadPartCopyOutput, __MetadataBearer {
}
declare const UploadPartCopyCommand_base: {
    new (input: UploadPartCopyCommandInput): import("@smithy/smithy-client").CommandImpl<UploadPartCopyCommandInput, UploadPartCopyCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UploadPartCopyCommandInput): import("@smithy/smithy-client").CommandImpl<UploadPartCopyCommandInput, UploadPartCopyCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Uploads a part by copying data from an existing object as data source. To specify the
 *          data source, you add the request header <code>x-amz-copy-source</code> in your request. To
 *          specify a byte range, you add the request header <code>x-amz-copy-source-range</code> in
 *          your request. </p>
 *          <p>For information about maximum and minimum part sizes and other multipart upload
 *          specifications, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html">Multipart upload limits</a> in the <i>Amazon S3 User Guide</i>. </p>
 *          <note>
 *             <p>Instead of copying data from an existing object as part data, you might use the
 *                <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a> action to upload new data as a part of an object in your
 *             request.</p>
 *          </note>
 *          <p>You must initiate a multipart upload before you can upload any part. In response to your
 *          initiate request, Amazon S3 returns the upload ID, a unique identifier that you must include in
 *          your upload part request.</p>
 *          <p>For conceptual information about multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/uploadobjusingmpu.html">Uploading Objects Using Multipart
 *             Upload</a> in the <i>Amazon S3 User Guide</i>. For information about
 *          copying objects using a single atomic action vs. a multipart upload, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ObjectOperations.html">Operations on
 *             Objects</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> -
 *             For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <dl>
 *             <dt>Authentication and authorization</dt>
 *             <dd>
 *                <p>All <code>UploadPartCopy</code> requests must be authenticated and signed by
 *                   using IAM credentials (access key ID and secret access key for the IAM
 *                   identities). All headers with the <code>x-amz-</code> prefix, including
 *                      <code>x-amz-copy-source</code>, must be signed. For more information, see
 *                      <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html">REST Authentication</a>.</p>
 *                <p>
 *                   <b>Directory buckets</b> - You must use IAM
 *                   credentials to authenticate and authorize your access to the
 *                      <code>UploadPartCopy</code> API operation, instead of using the temporary
 *                   security credentials through the <code>CreateSession</code> API operation.</p>
 *                <p>Amazon Web Services CLI or SDKs handles authentication and authorization on your
 *                   behalf.</p>
 *             </dd>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>You must have <code>READ</code> access to the source object and
 *                      <code>WRITE</code> access to the destination bucket.</p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - You
 *                         must have the permissions in a policy based on the bucket types of your
 *                         source bucket and destination bucket in an <code>UploadPartCopy</code>
 *                         operation.</p>
 *                      <ul>
 *                         <li>
 *                            <p>If the source object is in a general purpose bucket, you must have the
 *                                  <b>
 *                                  <code>s3:GetObject</code>
 *                               </b>
 *                               permission to read the source object that is being copied. </p>
 *                         </li>
 *                         <li>
 *                            <p>If the destination bucket is a general purpose bucket, you must have the
 *                                  <b>
 *                                  <code>s3:PutObject</code>
 *                               </b>
 *                               permission to write the object copy to the destination bucket. </p>
 *                         </li>
 *                         <li>
 *                            <p>To perform a multipart upload with encryption using an Key Management Service
 *                               key, the requester must have permission to the
 *                                  <code>kms:Decrypt</code> and <code>kms:GenerateDataKey</code>
 *                               actions on the key. The requester must also have permissions for the
 *                                  <code>kms:GenerateDataKey</code> action for the
 *                                  <code>CreateMultipartUpload</code> API. Then, the requester needs
 *                               permissions for the <code>kms:Decrypt</code> action on the
 *                                  <code>UploadPart</code> and <code>UploadPartCopy</code> APIs. These
 *                               permissions are required because Amazon S3 must decrypt and read data from
 *                               the encrypted file parts before it completes the multipart upload. For
 *                               more information about KMS permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html">Protecting
 *                                  data using server-side encryption with KMS</a> in the
 *                                  <i>Amazon S3 User Guide</i>. For information about the
 *                               permissions required to use the multipart upload API, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuAndPermissions.html">Multipart upload
 *                                  and permissions</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html#mpuAndPermissions">Multipart upload API and permissions</a> in the
 *                                  <i>Amazon S3 User Guide</i>.</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         You must have permissions in a bucket policy or an IAM identity-based policy based on the
 *                         source and destination bucket types in an <code>UploadPartCopy</code>
 *                         operation.</p>
 *                      <ul>
 *                         <li>
 *                            <p>If the source object that you want to copy is in a
 *                               directory bucket, you must have the <b>
 *                                  <code>s3express:CreateSession</code>
 *                               </b> permission in
 *                               the <code>Action</code> element of a policy to read the object. By
 *                               default, the session is in the <code>ReadWrite</code> mode. If you
 *                               want to restrict the access, you can explicitly set the
 *                                  <code>s3express:SessionMode</code> condition key to
 *                                  <code>ReadOnly</code> on the copy source bucket.</p>
 *                         </li>
 *                         <li>
 *                            <p>If the copy destination is a directory bucket, you must have the
 *                                  <b>
 *                                  <code>s3express:CreateSession</code>
 *                               </b> permission in the
 *                                  <code>Action</code> element of a policy to write the object to the
 *                               destination. The <code>s3express:SessionMode</code> condition key
 *                               cannot be set to <code>ReadOnly</code> on the copy destination.
 *                            </p>
 *                         </li>
 *                      </ul>
 *                      <p>If the object is encrypted with SSE-KMS, you must also have the
 *                            <code>kms:GenerateDataKey</code> and <code>kms:Decrypt</code> permissions
 *                         in IAM identity-based policies and KMS key policies for the KMS
 *                         key.</p>
 *                      <p>For example policies, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-example-bucket-policies.html">Example bucket policies for S3 Express One Zone</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam-identity-policies.html">Amazon Web Services Identity and Access Management (IAM) identity-based policies for
 *                            S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Encryption</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose buckets </b> -
 *                          For information about using
 *                         server-side encryption with customer-provided encryption keys with the
 *                            <code>UploadPartCopy</code> operation, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a>. </p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory buckets </b> -
 *                         For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>). For more
 *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                      <note>
 *                         <p>For directory buckets, when you perform a
 *                               <code>CreateMultipartUpload</code> operation and an
 *                               <code>UploadPartCopy</code> operation, the request headers you provide
 *                            in the <code>CreateMultipartUpload</code> request must match the default
 *                            encryption configuration of the destination bucket. </p>
 *                      </note>
 *                      <p>S3 Bucket Keys aren't supported, when you copy SSE-KMS encrypted objects from general purpose buckets
 * to directory buckets, from directory buckets to general purpose buckets, or between directory buckets, through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>. In this case, Amazon S3 makes a call to KMS every time a copy request is made for a KMS-encrypted object.</p>
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
 *                            <p>HTTP Status Code: 404 Not Found</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>Error Code: <code>InvalidRequest</code>
 *                      </p>
 *                      <ul>
 *                         <li>
 *                            <p>Description: The specified copy source is not supported as a
 *                               byte-range copy source.</p>
 *                         </li>
 *                         <li>
 *                            <p>HTTP Status Code: 400 Bad Request</p>
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
 *          <p>The following operations are related to <code>UploadPartCopy</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateMultipartUpload.html">CreateMultipartUpload</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a>
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
 * import { S3Client, UploadPartCopyCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, UploadPartCopyCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // UploadPartCopyRequest
 *   Bucket: "STRING_VALUE", // required
 *   CopySource: "STRING_VALUE", // required
 *   CopySourceIfMatch: "STRING_VALUE",
 *   CopySourceIfModifiedSince: new Date("TIMESTAMP"),
 *   CopySourceIfNoneMatch: "STRING_VALUE",
 *   CopySourceIfUnmodifiedSince: new Date("TIMESTAMP"),
 *   CopySourceRange: "STRING_VALUE",
 *   Key: "STRING_VALUE", // required
 *   PartNumber: Number("int"), // required
 *   UploadId: "STRING_VALUE", // required
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 *   CopySourceSSECustomerAlgorithm: "STRING_VALUE",
 *   CopySourceSSECustomerKey: "STRING_VALUE",
 *   CopySourceSSECustomerKeyMD5: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   ExpectedSourceBucketOwner: "STRING_VALUE",
 * };
 * const command = new UploadPartCopyCommand(input);
 * const response = await client.send(command);
 * // { // UploadPartCopyOutput
 * //   CopySourceVersionId: "STRING_VALUE",
 * //   CopyPartResult: { // CopyPartResult
 * //     ETag: "STRING_VALUE",
 * //     LastModified: new Date("TIMESTAMP"),
 * //     ChecksumCRC32: "STRING_VALUE",
 * //     ChecksumCRC32C: "STRING_VALUE",
 * //     ChecksumCRC64NVME: "STRING_VALUE",
 * //     ChecksumSHA1: "STRING_VALUE",
 * //     ChecksumSHA256: "STRING_VALUE",
 * //   },
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   SSECustomerAlgorithm: "STRING_VALUE",
 * //   SSECustomerKeyMD5: "STRING_VALUE",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param UploadPartCopyCommandInput - {@link UploadPartCopyCommandInput}
 * @returns {@link UploadPartCopyCommandOutput}
 * @see {@link UploadPartCopyCommandInput} for command's `input` shape.
 * @see {@link UploadPartCopyCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To upload a part by copying byte range from an existing object as data source
 * ```javascript
 * // The following example uploads a part of a multipart upload by copying a specified byte range from an existing object as data source.
 * const input = {
 *   Bucket: "examplebucket",
 *   CopySource: "/bucketname/sourceobjectkey",
 *   CopySourceRange: "bytes=1-100000",
 *   Key: "examplelargeobject",
 *   PartNumber: 2,
 *   UploadId: "exampleuoh_10OhKhT7YukE9bjzTPRiuaCotmZM_pFngJFir9OZNrSr5cWa3cq3LZSUsfjI4FI7PkP91We7Nrw--"
 * };
 * const command = new UploadPartCopyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   CopyPartResult: {
 *     ETag: `"65d16d19e65a7508a51f043180edcc36"`,
 *     LastModified: "2016-12-29T21:44:28.000Z"
 *   }
 * }
 * *\/
 * ```
 *
 * @example To upload a part by copying data from an existing object as data source
 * ```javascript
 * // The following example uploads a part of a multipart upload by copying data from an existing object as data source.
 * const input = {
 *   Bucket: "examplebucket",
 *   CopySource: "/bucketname/sourceobjectkey",
 *   Key: "examplelargeobject",
 *   PartNumber: 1,
 *   UploadId: "exampleuoh_10OhKhT7YukE9bjzTPRiuaCotmZM_pFngJFir9OZNrSr5cWa3cq3LZSUsfjI4FI7PkP91We7Nrw--"
 * };
 * const command = new UploadPartCopyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   CopyPartResult: {
 *     ETag: `"b0c6f0e7e054ab8fa2536a2677f8734d"`,
 *     LastModified: "2016-12-29T21:24:43.000Z"
 *   }
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class UploadPartCopyCommand extends UploadPartCopyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UploadPartCopyRequest;
            output: UploadPartCopyOutput;
        };
        sdk: {
            input: UploadPartCopyCommandInput;
            output: UploadPartCopyCommandOutput;
        };
    };
}
