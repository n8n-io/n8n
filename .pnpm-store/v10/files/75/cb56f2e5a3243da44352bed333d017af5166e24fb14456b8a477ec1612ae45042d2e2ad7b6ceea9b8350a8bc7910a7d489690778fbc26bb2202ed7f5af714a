import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CompleteMultipartUploadOutput, CompleteMultipartUploadRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CompleteMultipartUploadCommand}.
 */
export interface CompleteMultipartUploadCommandInput extends CompleteMultipartUploadRequest {
}
/**
 * @public
 *
 * The output of {@link CompleteMultipartUploadCommand}.
 */
export interface CompleteMultipartUploadCommandOutput extends CompleteMultipartUploadOutput, __MetadataBearer {
}
declare const CompleteMultipartUploadCommand_base: {
    new (input: CompleteMultipartUploadCommandInput): import("@smithy/smithy-client").CommandImpl<CompleteMultipartUploadCommandInput, CompleteMultipartUploadCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CompleteMultipartUploadCommandInput): import("@smithy/smithy-client").CommandImpl<CompleteMultipartUploadCommandInput, CompleteMultipartUploadCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Completes a multipart upload by assembling previously uploaded parts.</p>
 *          <p>You first initiate the multipart upload and then upload all parts using the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a>
 *          operation or the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPartCopy.html">UploadPartCopy</a> operation.
 *          After successfully uploading all relevant parts of an upload, you call this
 *             <code>CompleteMultipartUpload</code> operation to complete the upload. Upon receiving
 *          this request, Amazon S3 concatenates all the parts in ascending order by part number to create a
 *          new object. In the CompleteMultipartUpload request, you must provide the parts list and
 *          ensure that the parts list is complete. The CompleteMultipartUpload API operation
 *          concatenates the parts that you provide in the list. For each part in the list, you must
 *          provide the <code>PartNumber</code> value and the <code>ETag</code> value that are returned
 *          after that part was uploaded.</p>
 *          <p>The processing of a CompleteMultipartUpload request could take several minutes to
 *          finalize. After Amazon S3 begins processing the request, it sends an HTTP response header that
 *          specifies a <code>200 OK</code> response. While processing is in progress, Amazon S3
 *          periodically sends white space characters to keep the connection from timing out. A request
 *          could fail after the initial <code>200 OK</code> response has been sent. This means that a
 *             <code>200 OK</code> response can contain either a success or an error. The error
 *          response might be embedded in the <code>200 OK</code> response. If you call this API
 *          operation directly, make sure to design your application to parse the contents of the
 *          response and handle it appropriately. If you use Amazon Web Services SDKs, SDKs handle this condition.
 *          The SDKs detect the embedded error and apply error handling per your configuration settings
 *          (including automatically retrying the request as appropriate). If the condition persists,
 *          the SDKs throw an exception (or, for the SDKs that don't use exceptions, they return an
 *          error). </p>
 *          <p>Note that if <code>CompleteMultipartUpload</code> fails, applications should be prepared
 *          to retry any failed requests (including 500 error responses). For more information, see
 *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ErrorBestPractices.html">Amazon S3 Error
 *             Best Practices</a>.</p>
 *          <important>
 *             <p>You can't use <code>Content-Type: application/x-www-form-urlencoded</code> for the
 *             CompleteMultipartUpload requests. Also, if you don't provide a <code>Content-Type</code>
 *             header, <code>CompleteMultipartUpload</code> can still return a <code>200 OK</code>
 *             response.</p>
 *          </important>
 *          <p>For more information about multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/uploadobjusingmpu.html">Uploading Objects Using Multipart
 *             Upload</a> in the <i>Amazon S3 User Guide</i>.</p>
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
 *                         <b>General purpose bucket permissions</b> - For
 *                         information about permissions required to use the multipart upload API, see
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuAndPermissions.html">Multipart Upload and
 *                            Permissions</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                      <p>If you provide an <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_Checksum.html">additional checksum
 *                            value</a> in your <code>MultipartUpload</code> requests and the
 *                         object is encrypted with Key Management Service, you must have permission to use the
 *                            <code>kms:Decrypt</code> action for the
 *                            <code>CompleteMultipartUpload</code> request to succeed.</p>
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
 *             <dt>Special errors</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>Error Code: <code>EntityTooSmall</code>
 *                      </p>
 *                      <ul>
 *                         <li>
 *                            <p>Description: Your proposed upload is smaller than the minimum
 *                               allowed object size. Each part must be at least 5 MB in size, except
 *                               the last part.</p>
 *                         </li>
 *                         <li>
 *                            <p>HTTP Status Code: 400 Bad Request</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>Error Code: <code>InvalidPart</code>
 *                      </p>
 *                      <ul>
 *                         <li>
 *                            <p>Description: One or more of the specified parts could not be found.
 *                               The part might not have been uploaded, or the specified ETag might not
 *                               have matched the uploaded part's ETag.</p>
 *                         </li>
 *                         <li>
 *                            <p>HTTP Status Code: 400 Bad Request</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>Error Code: <code>InvalidPartOrder</code>
 *                      </p>
 *                      <ul>
 *                         <li>
 *                            <p>Description: The list of parts was not in ascending order. The
 *                               parts list must be specified in order by part number.</p>
 *                         </li>
 *                         <li>
 *                            <p>HTTP Status Code: 400 Bad Request</p>
 *                         </li>
 *                      </ul>
 *                   </li>
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
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>CompleteMultipartUpload</code>:</p>
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
 * import { S3Client, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, CompleteMultipartUploadCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // CompleteMultipartUploadRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   MultipartUpload: { // CompletedMultipartUpload
 *     Parts: [ // CompletedPartList
 *       { // CompletedPart
 *         ETag: "STRING_VALUE",
 *         ChecksumCRC32: "STRING_VALUE",
 *         ChecksumCRC32C: "STRING_VALUE",
 *         ChecksumCRC64NVME: "STRING_VALUE",
 *         ChecksumSHA1: "STRING_VALUE",
 *         ChecksumSHA256: "STRING_VALUE",
 *         PartNumber: Number("int"),
 *       },
 *     ],
 *   },
 *   UploadId: "STRING_VALUE", // required
 *   ChecksumCRC32: "STRING_VALUE",
 *   ChecksumCRC32C: "STRING_VALUE",
 *   ChecksumCRC64NVME: "STRING_VALUE",
 *   ChecksumSHA1: "STRING_VALUE",
 *   ChecksumSHA256: "STRING_VALUE",
 *   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 *   MpuObjectSize: Number("long"),
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   IfMatch: "STRING_VALUE",
 *   IfNoneMatch: "STRING_VALUE",
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 * };
 * const command = new CompleteMultipartUploadCommand(input);
 * const response = await client.send(command);
 * // { // CompleteMultipartUploadOutput
 * //   Location: "STRING_VALUE",
 * //   Bucket: "STRING_VALUE",
 * //   Key: "STRING_VALUE",
 * //   Expiration: "STRING_VALUE",
 * //   ETag: "STRING_VALUE",
 * //   ChecksumCRC32: "STRING_VALUE",
 * //   ChecksumCRC32C: "STRING_VALUE",
 * //   ChecksumCRC64NVME: "STRING_VALUE",
 * //   ChecksumSHA1: "STRING_VALUE",
 * //   ChecksumSHA256: "STRING_VALUE",
 * //   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //   ServerSideEncryption: "AES256" || "aws:kms" || "aws:kms:dsse",
 * //   VersionId: "STRING_VALUE",
 * //   SSEKMSKeyId: "STRING_VALUE",
 * //   BucketKeyEnabled: true || false,
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param CompleteMultipartUploadCommandInput - {@link CompleteMultipartUploadCommandInput}
 * @returns {@link CompleteMultipartUploadCommandOutput}
 * @see {@link CompleteMultipartUploadCommandInput} for command's `input` shape.
 * @see {@link CompleteMultipartUploadCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To complete multipart upload
 * ```javascript
 * // The following example completes a multipart upload.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "bigobject",
 *   MultipartUpload: {
 *     Parts: [
 *       {
 *         ETag: `"d8c2eafd90c266e19ab9dcacc479f8af"`,
 *         PartNumber: 1
 *       },
 *       {
 *         ETag: `"d8c2eafd90c266e19ab9dcacc479f8af"`,
 *         PartNumber: 2
 *       }
 *     ]
 *   },
 *   UploadId: "7YPBOJuoFiQ9cz4P3Pe6FIZwO4f7wN93uHsNBEw97pl5eNwzExg0LAT2dUN91cOmrEQHDsP3WA60CEg--"
 * };
 * const command = new CompleteMultipartUploadCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Bucket: "acexamplebucket",
 *   ETag: `"4d9031c7644d8081c2829f4ea23c55f7-2"`,
 *   Key: "bigobject",
 *   Location: "https://examplebucket.s3.<Region>.amazonaws.com/bigobject"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class CompleteMultipartUploadCommand extends CompleteMultipartUploadCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CompleteMultipartUploadRequest;
            output: CompleteMultipartUploadOutput;
        };
        sdk: {
            input: CompleteMultipartUploadCommandInput;
            output: CompleteMultipartUploadCommandOutput;
        };
    };
}
