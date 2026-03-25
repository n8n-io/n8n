import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { AbortMultipartUploadOutput, AbortMultipartUploadRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link AbortMultipartUploadCommand}.
 */
export interface AbortMultipartUploadCommandInput extends AbortMultipartUploadRequest {
}
/**
 * @public
 *
 * The output of {@link AbortMultipartUploadCommand}.
 */
export interface AbortMultipartUploadCommandOutput extends AbortMultipartUploadOutput, __MetadataBearer {
}
declare const AbortMultipartUploadCommand_base: {
    new (input: AbortMultipartUploadCommandInput): import("@smithy/smithy-client").CommandImpl<AbortMultipartUploadCommandInput, AbortMultipartUploadCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: AbortMultipartUploadCommandInput): import("@smithy/smithy-client").CommandImpl<AbortMultipartUploadCommandInput, AbortMultipartUploadCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>This operation aborts a multipart upload. After a multipart upload is aborted, no
 *          additional parts can be uploaded using that upload ID. The storage consumed by any
 *          previously uploaded parts will be freed. However, if any part uploads are currently in
 *          progress, those part uploads might or might not succeed. As a result, it might be necessary
 *          to abort a given multipart upload multiple times in order to completely free all storage
 *          consumed by all parts. </p>
 *          <p>To verify that all parts have been removed and prevent getting charged for the part
 *          storage, you should call the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListParts.html">ListParts</a> API operation and ensure
 *          that the parts list is empty.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> - If multipart
 *                   uploads in a directory bucket are in progress, you can't delete the bucket until
 *                   all the in-progress multipart uploads are aborted or completed. To delete these
 *                   in-progress multipart uploads, use the <code>ListMultipartUploads</code> operation
 *                   to list the in-progress multipart uploads in the bucket and use the
 *                      <code>AbortMultipartUpload</code> operation to abort all the in-progress
 *                   multipart uploads. </p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                      </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - For
 *                         information about permissions required to use the multipart upload, see
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuAndPermissions.html">Multipart Upload and
 *                            Permissions</a> in the <i>Amazon S3 User Guide</i>.</p>
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
 *          <p>The following operations are related to <code>AbortMultipartUpload</code>:</p>
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
 * import { S3Client, AbortMultipartUploadCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, AbortMultipartUploadCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // AbortMultipartUploadRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   UploadId: "STRING_VALUE", // required
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   IfMatchInitiatedTime: new Date("TIMESTAMP"),
 * };
 * const command = new AbortMultipartUploadCommand(input);
 * const response = await client.send(command);
 * // { // AbortMultipartUploadOutput
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param AbortMultipartUploadCommandInput - {@link AbortMultipartUploadCommandInput}
 * @returns {@link AbortMultipartUploadCommandOutput}
 * @see {@link AbortMultipartUploadCommandInput} for command's `input` shape.
 * @see {@link AbortMultipartUploadCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NoSuchUpload} (client fault)
 *  <p>The specified multipart upload does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To abort a multipart upload
 * ```javascript
 * // The following example aborts a multipart upload.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "bigobject",
 *   UploadId: "xadcOB_7YPBOJuoFiQ9cz4P3Pe6FIZwO4f7wN93uHsNBEw97pl5eNwzExg0LAT2dUN91cOmrEQHDsP3WA60CEg--"
 * };
 * const command = new AbortMultipartUploadCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* empty *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class AbortMultipartUploadCommand extends AbortMultipartUploadCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: AbortMultipartUploadRequest;
            output: AbortMultipartUploadOutput;
        };
        sdk: {
            input: AbortMultipartUploadCommandInput;
            output: AbortMultipartUploadCommandOutput;
        };
    };
}
