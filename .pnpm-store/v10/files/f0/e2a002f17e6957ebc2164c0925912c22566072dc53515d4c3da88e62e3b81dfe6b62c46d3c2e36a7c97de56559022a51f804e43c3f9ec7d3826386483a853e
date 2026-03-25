import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateMultipartUploadOutput, CreateMultipartUploadRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateMultipartUploadCommand}.
 */
export interface CreateMultipartUploadCommandInput extends CreateMultipartUploadRequest {
}
/**
 * @public
 *
 * The output of {@link CreateMultipartUploadCommand}.
 */
export interface CreateMultipartUploadCommandOutput extends CreateMultipartUploadOutput, __MetadataBearer {
}
declare const CreateMultipartUploadCommand_base: {
    new (input: CreateMultipartUploadCommandInput): import("@smithy/smithy-client").CommandImpl<CreateMultipartUploadCommandInput, CreateMultipartUploadCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateMultipartUploadCommandInput): import("@smithy/smithy-client").CommandImpl<CreateMultipartUploadCommandInput, CreateMultipartUploadCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>This action initiates a multipart upload and returns an upload ID. This upload ID is
 *          used to associate all of the parts in the specific multipart upload. You specify this
 *          upload ID in each of your subsequent upload part requests (see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a>). You also include this
 *          upload ID in the final request to either complete or abort the multipart upload request.
 *          For more information about multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html">Multipart Upload Overview</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>After you initiate a multipart upload and upload one or more parts, to stop being
 *             charged for storing the uploaded parts, you must either complete or abort the multipart
 *             upload. Amazon S3 frees up the space used to store the parts and stops charging you for
 *             storing them only after you either complete or abort a multipart upload. </p>
 *          </note>
 *          <p>If you have configured a lifecycle rule to abort incomplete multipart uploads, the
 *          created multipart upload must be completed within the number of days specified in the
 *          bucket lifecycle configuration. Otherwise, the incomplete multipart upload becomes eligible
 *          for an abort action and Amazon S3 aborts the multipart upload. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html#mpu-abort-incomplete-mpu-lifecycle-config">Aborting Incomplete Multipart Uploads Using a Bucket Lifecycle
 *          Configuration</a>.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets </b> -
 *                   S3 Lifecycle is not supported by directory buckets.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets </b> -
 *                   For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                      </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <dl>
 *             <dt>Request signing</dt>
 *             <dd>
 *                <p>For request signing, multipart upload is just a series of regular requests. You
 *                   initiate a multipart upload, send one or more requests to upload parts, and then
 *                   complete the multipart upload process. You sign each request individually. There
 *                   is nothing special about signing multipart upload requests. For more information
 *                   about signing, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html">Authenticating
 *                      Requests (Amazon Web Services Signature Version 4)</a> in the
 *                      <i>Amazon S3 User Guide</i>.</p>
 *             </dd>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - To
 *                         perform a multipart upload with encryption using an Key Management Service (KMS)
 *                         KMS key, the requester must have permission to the
 *                            <code>kms:Decrypt</code> and <code>kms:GenerateDataKey</code> actions on
 *                         the key. The requester must also have permissions for the
 *                            <code>kms:GenerateDataKey</code> action for the
 *                            <code>CreateMultipartUpload</code> API. Then, the requester needs
 *                         permissions for the <code>kms:Decrypt</code> action on the
 *                            <code>UploadPart</code> and <code>UploadPartCopy</code> APIs. These
 *                         permissions are required because Amazon S3 must decrypt and read data from the
 *                         encrypted file parts before it completes the multipart upload. For more
 *                         information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html#mpuAndPermissions">Multipart upload API and permissions</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html">Protecting data
 *                            using server-side encryption with Amazon Web Services KMS</a> in the
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
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Encryption</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose buckets</b> - Server-side
 *                         encryption is for data encryption at rest. Amazon S3 encrypts your data as it
 *                         writes it to disks in its data centers and decrypts it when you access it.
 *                         Amazon S3 automatically encrypts all new objects that are uploaded to an S3
 *                         bucket. When doing a multipart upload, if you don't specify encryption
 *                         information in your request, the encryption setting of the uploaded parts is
 *                         set to the default encryption configuration of the destination bucket. By
 *                         default, all buckets have a base level of encryption configuration that uses
 *                         server-side encryption with Amazon S3 managed keys (SSE-S3). If the destination
 *                         bucket has a default encryption configuration that uses server-side
 *                         encryption with an Key Management Service (KMS) key (SSE-KMS), or a customer-provided
 *                         encryption key (SSE-C), Amazon S3 uses the corresponding KMS key, or a
 *                         customer-provided key to encrypt the uploaded parts. When you perform a
 *                         CreateMultipartUpload operation, if you want to use a different type of
 *                         encryption setting for the uploaded parts, you can request that Amazon S3
 *                         encrypts the object with a different encryption key (such as an Amazon S3 managed
 *                         key, a KMS key, or a customer-provided key). When the encryption setting
 *                         in your request is different from the default encryption configuration of
 *                         the destination bucket, the encryption setting in your request takes
 *                         precedence. If you choose to provide your own encryption key, the request
 *                         headers you provide in <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a> and
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>
 *                         requests must match the headers you used in the
 *                            <code>CreateMultipartUpload</code> request.</p>
 *                      <ul>
 *                         <li>
 *                            <p>Use KMS keys (SSE-KMS) that include the Amazon Web Services managed key
 *                                  (<code>aws/s3</code>) and KMS customer managed keys stored in Key Management Service
 *                               (KMS) – If you want Amazon Web Services to manage the keys used to encrypt data,
 *                               specify the following headers in the request.</p>
 *                            <ul>
 *                               <li>
 *                                  <p>
 *                                     <code>x-amz-server-side-encryption</code>
 *                                  </p>
 *                               </li>
 *                               <li>
 *                                  <p>
 *                                     <code>x-amz-server-side-encryption-aws-kms-key-id</code>
 *                                  </p>
 *                               </li>
 *                               <li>
 *                                  <p>
 *                                     <code>x-amz-server-side-encryption-context</code>
 *                                  </p>
 *                               </li>
 *                            </ul>
 *                            <note>
 *                               <ul>
 *                                  <li>
 *                                     <p>If you specify
 *                                           <code>x-amz-server-side-encryption:aws:kms</code>, but
 *                                        don't provide
 *                                           <code>x-amz-server-side-encryption-aws-kms-key-id</code>,
 *                                        Amazon S3 uses the Amazon Web Services managed key (<code>aws/s3</code> key) in
 *                                        KMS to protect the data.</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>To perform a multipart upload with encryption by using an
 *                                        Amazon Web Services KMS key, the requester must have permission to the
 *                                           <code>kms:Decrypt</code> and
 *                                           <code>kms:GenerateDataKey*</code> actions on the key.
 *                                        These permissions are required because Amazon S3 must decrypt and
 *                                        read data from the encrypted file parts before it completes
 *                                        the multipart upload. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html#mpuAndPermissions">Multipart upload API and permissions</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html">Protecting data using server-side encryption with Amazon Web Services
 *                                           KMS</a> in the
 *                                        <i>Amazon S3 User Guide</i>.</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>If your Identity and Access Management (IAM) user or role is in the same
 *                                        Amazon Web Services account as the KMS key, then you must have these
 *                                        permissions on the key policy. If your IAM user or role is
 *                                        in a different account from the key, then you must have the
 *                                        permissions on both the key policy and your IAM user or
 *                                        role.</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>All <code>GET</code> and <code>PUT</code> requests for an
 *                                        object protected by KMS fail if you don't make them by
 *                                        using Secure Sockets Layer (SSL), Transport Layer Security
 *                                        (TLS), or Signature Version 4. For information about
 *                                        configuring any of the officially supported Amazon Web Services SDKs and
 *                                        Amazon Web Services CLI, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingAWSSDK.html#specify-signature-version">Specifying the Signature Version in
 *                                           Request Authentication</a> in the
 *                                           <i>Amazon S3 User Guide</i>.</p>
 *                                  </li>
 *                               </ul>
 *                            </note>
 *                            <p>For more information about server-side encryption with KMS keys
 *                               (SSE-KMS), see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html">Protecting
 *                                  Data Using Server-Side Encryption with KMS keys</a> in the
 *                                  <i>Amazon S3 User Guide</i>.</p>
 *                         </li>
 *                         <li>
 *                            <p>Use customer-provided encryption keys (SSE-C) – If you want to
 *                               manage your own encryption keys, provide all the following headers in
 *                               the request.</p>
 *                            <ul>
 *                               <li>
 *                                  <p>
 *                                     <code>x-amz-server-side-encryption-customer-algorithm</code>
 *                                  </p>
 *                               </li>
 *                               <li>
 *                                  <p>
 *                                     <code>x-amz-server-side-encryption-customer-key</code>
 *                                  </p>
 *                               </li>
 *                               <li>
 *                                  <p>
 *                                     <code>x-amz-server-side-encryption-customer-key-MD5</code>
 *                                  </p>
 *                               </li>
 *                            </ul>
 *                            <p>For more information about server-side encryption with
 *                               customer-provided encryption keys (SSE-C), see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html"> Protecting data using server-side encryption with
 *                                  customer-provided encryption keys (SSE-C)</a> in the
 *                                  <i>Amazon S3 User Guide</i>.</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory buckets</b> -
 *                         For directory buckets, there are only two supported options for server-side encryption: server-side encryption with Amazon S3 managed keys (SSE-S3) (<code>AES256</code>) and server-side encryption with KMS keys (SSE-KMS) (<code>aws:kms</code>). We recommend that the bucket's default encryption uses the desired encryption configuration and you don't override the bucket default encryption in your
 *             <code>CreateSession</code> requests or <code>PUT</code> object requests. Then, new objects
 *  are automatically encrypted with the desired encryption settings. For more
 *          information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-serv-side-encryption.html">Protecting data with server-side encryption</a> in the <i>Amazon S3 User Guide</i>. For more information about the encryption overriding behaviors in directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-specifying-kms-encryption.html">Specifying server-side encryption with KMS for new object uploads</a>.</p>
 *                      <p>In the Zonal endpoint API calls (except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>) using the REST API, the encryption request headers must match the encryption settings that are specified in the <code>CreateSession</code> request.
 *                             You can't override the values of the encryption settings (<code>x-amz-server-side-encryption</code>, <code>x-amz-server-side-encryption-aws-kms-key-id</code>, <code>x-amz-server-side-encryption-context</code>, and <code>x-amz-server-side-encryption-bucket-key-enabled</code>) that are specified in the <code>CreateSession</code> request.
 *                             You don't need to explicitly specify these encryption settings values in Zonal endpoint API calls, and
 *                             Amazon S3 will use the encryption settings values from the <code>CreateSession</code> request to protect new objects in the directory bucket.
 *                            </p>
 *                      <note>
 *                         <p>When you use the CLI or the Amazon Web Services SDKs, for <code>CreateSession</code>, the session token refreshes automatically to avoid service interruptions when a session expires. The CLI or the Amazon Web Services SDKs use the bucket's default encryption configuration for the
 *                             <code>CreateSession</code> request. It's not supported to override the encryption settings values in the <code>CreateSession</code> request.
 *                             So in the Zonal endpoint API calls (except <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a>),
 *           the encryption request headers must match the default encryption configuration of the directory bucket.
 *
 * </p>
 *                      </note>
 *                      <note>
 *                         <p>For directory buckets, when you perform a
 *                               <code>CreateMultipartUpload</code> operation and an
 *                               <code>UploadPartCopy</code> operation, the request headers you provide
 *                            in the <code>CreateMultipartUpload</code> request must match the default
 *                            encryption configuration of the destination bucket. </p>
 *                      </note>
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
 *          <p>The following operations are related to <code>CreateMultipartUpload</code>:</p>
 *          <ul>
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
 * import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, CreateMultipartUploadCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // CreateMultipartUploadRequest
 *   ACL: "private" || "public-read" || "public-read-write" || "authenticated-read" || "aws-exec-read" || "bucket-owner-read" || "bucket-owner-full-control",
 *   Bucket: "STRING_VALUE", // required
 *   CacheControl: "STRING_VALUE",
 *   ContentDisposition: "STRING_VALUE",
 *   ContentEncoding: "STRING_VALUE",
 *   ContentLanguage: "STRING_VALUE",
 *   ContentType: "STRING_VALUE",
 *   Expires: new Date("TIMESTAMP"),
 *   GrantFullControl: "STRING_VALUE",
 *   GrantRead: "STRING_VALUE",
 *   GrantReadACP: "STRING_VALUE",
 *   GrantWriteACP: "STRING_VALUE",
 *   Key: "STRING_VALUE", // required
 *   Metadata: { // Metadata
 *     "<keys>": "STRING_VALUE",
 *   },
 *   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 *   StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "GLACIER" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 *   WebsiteRedirectLocation: "STRING_VALUE",
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 *   SSEKMSKeyId: "STRING_VALUE",
 *   SSEKMSEncryptionContext: "STRING_VALUE",
 *   BucketKeyEnabled: true || false,
 *   RequestPayer: "requester",
 *   Tagging: "STRING_VALUE",
 *   ObjectLockMode: "GOVERNANCE" || "COMPLIANCE",
 *   ObjectLockRetainUntilDate: new Date("TIMESTAMP"),
 *   ObjectLockLegalHoldStatus: "ON" || "OFF",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * };
 * const command = new CreateMultipartUploadCommand(input);
 * const response = await client.send(command);
 * // { // CreateMultipartUploadOutput
 * //   AbortDate: new Date("TIMESTAMP"),
 * //   AbortRuleId: "STRING_VALUE",
 * //   Bucket: "STRING_VALUE",
 * //   Key: "STRING_VALUE",
 * //   UploadId: "STRING_VALUE",
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   SSECustomerAlgorithm: "STRING_VALUE",
 * //   SSECustomerKeyMD5: "STRING_VALUE",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   SSEKMSEncryptionContext: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   RequestCharged: "requester",
 * //   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * //   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * // };
 *
 * ```
 *
 * @param CreateMultipartUploadCommandInput - {@link CreateMultipartUploadCommandInput}
 * @returns {@link CreateMultipartUploadCommandOutput}
 * @see {@link CreateMultipartUploadCommandInput} for command's `input` shape.
 * @see {@link CreateMultipartUploadCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To initiate a multipart upload
 * ```javascript
 * // The following example initiates a multipart upload.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "largeobject"
 * };
 * const command = new CreateMultipartUploadCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Bucket: "examplebucket",
 *   Key: "largeobject",
 *   UploadId: "ibZBv_75gd9r8lH_gqXatLdxMVpAlj6ZQjEs.OwyF3953YdwbcQnMA2BLGn8Lx12fQNICtMw5KyteFeHw.Sjng--"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class CreateMultipartUploadCommand extends CreateMultipartUploadCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateMultipartUploadRequest;
            output: CreateMultipartUploadOutput;
        };
        sdk: {
            input: CreateMultipartUploadCommandInput;
            output: CreateMultipartUploadCommandOutput;
        };
    };
}
