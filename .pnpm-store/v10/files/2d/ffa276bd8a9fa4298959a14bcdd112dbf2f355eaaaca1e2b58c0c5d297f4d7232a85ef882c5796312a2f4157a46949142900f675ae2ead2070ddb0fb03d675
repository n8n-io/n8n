import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListPartsOutput, ListPartsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListPartsCommand}.
 */
export interface ListPartsCommandInput extends ListPartsRequest {
}
/**
 * @public
 *
 * The output of {@link ListPartsCommand}.
 */
export interface ListPartsCommandOutput extends ListPartsOutput, __MetadataBearer {
}
declare const ListPartsCommand_base: {
    new (input: ListPartsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPartsCommandInput, ListPartsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListPartsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPartsCommandInput, ListPartsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the parts that have been uploaded for a specific multipart upload.</p>
 *          <p>To use this operation, you must provide the <code>upload ID</code> in the request. You
 *          obtain this uploadID by sending the initiate multipart upload request through <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateMultipartUpload.html">CreateMultipartUpload</a>.</p>
 *          <p>The <code>ListParts</code> request returns a maximum of 1,000 uploaded parts. The limit
 *          of 1,000 parts is also the default value. You can restrict the number of parts in a
 *          response by specifying the <code>max-parts</code> request parameter. If your multipart
 *          upload consists of more than 1,000 parts, the response returns an <code>IsTruncated</code>
 *          field with the value of <code>true</code>, and a <code>NextPartNumberMarker</code> element.
 *          To list remaining uploaded parts, in subsequent <code>ListParts</code> requests, include
 *          the <code>part-number-marker</code> query string parameter and set its value to the
 *             <code>NextPartNumberMarker</code> field value from the previous response.</p>
 *          <p>For more information on multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/uploadobjusingmpu.html">Uploading Objects Using Multipart
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
 *                      <p>If the upload was created using server-side encryption with Key Management Service
 *                         (KMS) keys (SSE-KMS) or dual-layer server-side encryption with
 *                         Amazon Web Services KMS keys (DSSE-KMS), you must have permission to the
 *                            <code>kms:Decrypt</code> action for the <code>ListParts</code> request to
 *                         succeed.</p>
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
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>ListParts</code>:</p>
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
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAttributes.html">GetObjectAttributes</a>
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
 * import { S3Client, ListPartsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListPartsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListPartsRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   MaxParts: Number("int"),
 *   PartNumberMarker: "STRING_VALUE",
 *   UploadId: "STRING_VALUE", // required
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 * };
 * const command = new ListPartsCommand(input);
 * const response = await client.send(command);
 * // { // ListPartsOutput
 * //   AbortDate: new Date("TIMESTAMP"),
 * //   AbortRuleId: "STRING_VALUE",
 * //   Bucket: "STRING_VALUE",
 * //   Key: "STRING_VALUE",
 * //   UploadId: "STRING_VALUE",
 * //   PartNumberMarker: "STRING_VALUE",
 * //   NextPartNumberMarker: "STRING_VALUE",
 * //   MaxParts: Number("int"),
 * //   IsTruncated: true || false,
 * //   Parts: [ // Parts
 * //     { // Part
 * //       PartNumber: Number("int"),
 * //       LastModified: new Date("TIMESTAMP"),
 * //       ETag: "STRING_VALUE",
 * //       Size: Number("long"),
 * //       ChecksumCRC32: "STRING_VALUE",
 * //       ChecksumCRC32C: "STRING_VALUE",
 * //       ChecksumCRC64NVME: "STRING_VALUE",
 * //       ChecksumSHA1: "STRING_VALUE",
 * //       ChecksumSHA256: "STRING_VALUE",
 * //     },
 * //   ],
 * //   Initiator: { // Initiator
 * //     ID: "STRING_VALUE",
 * //     DisplayName: "STRING_VALUE",
 * //   },
 * //   Owner: { // Owner
 * //     DisplayName: "STRING_VALUE",
 * //     ID: "STRING_VALUE",
 * //   },
 * //   StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "GLACIER" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 * //   RequestCharged: "requester",
 * //   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * //   ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * // };
 *
 * ```
 *
 * @param ListPartsCommandInput - {@link ListPartsCommandInput}
 * @returns {@link ListPartsCommandOutput}
 * @see {@link ListPartsCommandInput} for command's `input` shape.
 * @see {@link ListPartsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To list parts of a multipart upload.
 * ```javascript
 * // The following example lists parts uploaded for a specific multipart upload.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "bigobject",
 *   UploadId: "example7YPBOJuoFiQ9cz4P3Pe6FIZwO4f7wN93uHsNBEw97pl5eNwzExg0LAT2dUN91cOmrEQHDsP3WA60CEg--"
 * };
 * const command = new ListPartsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Initiator: {
 *     DisplayName: "owner-display-name",
 *     ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *   },
 *   Owner: {
 *     DisplayName: "owner-display-name",
 *     ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *   },
 *   Parts: [
 *     {
 *       ETag: `"d8c2eafd90c266e19ab9dcacc479f8af"`,
 *       LastModified: "2016-12-16T00:11:42.000Z",
 *       PartNumber: 1,
 *       Size: 26246026
 *     },
 *     {
 *       ETag: `"d8c2eafd90c266e19ab9dcacc479f8af"`,
 *       LastModified: "2016-12-16T00:15:01.000Z",
 *       PartNumber: 2,
 *       Size: 26246026
 *     }
 *   ],
 *   StorageClass: "STANDARD"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListPartsCommand extends ListPartsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListPartsRequest;
            output: ListPartsOutput;
        };
        sdk: {
            input: ListPartsCommandInput;
            output: ListPartsCommandOutput;
        };
    };
}
