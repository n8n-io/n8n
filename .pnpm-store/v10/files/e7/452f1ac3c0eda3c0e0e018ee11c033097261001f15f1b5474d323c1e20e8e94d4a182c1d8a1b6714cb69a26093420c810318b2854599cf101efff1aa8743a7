import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteObjectOutput, DeleteObjectRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteObjectCommand}.
 */
export interface DeleteObjectCommandInput extends DeleteObjectRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteObjectCommand}.
 */
export interface DeleteObjectCommandOutput extends DeleteObjectOutput, __MetadataBearer {
}
declare const DeleteObjectCommand_base: {
    new (input: DeleteObjectCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteObjectCommandInput, DeleteObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteObjectCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteObjectCommandInput, DeleteObjectCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Removes an object from a bucket. The behavior depends on the bucket's versioning state: </p>
 *          <ul>
 *             <li>
 *                <p>If bucket versioning is not enabled, the operation permanently deletes the object.</p>
 *             </li>
 *             <li>
 *                <p>If bucket versioning is enabled, the operation inserts a delete marker, which becomes the current version of the object. To permanently delete an object in a versioned bucket, you must include the object’s <code>versionId</code> in the request. For more information about versioning-enabled buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html">Deleting object versions from a versioning-enabled bucket</a>.</p>
 *             </li>
 *             <li>
 *                <p>If bucket versioning is suspended, the operation removes the object that has a null <code>versionId</code>, if there is one, and inserts a delete marker that becomes the current version of the object. If there isn't an object with a null <code>versionId</code>, and all versions of the object have a <code>versionId</code>, Amazon S3 does not remove the object and only inserts a delete marker. To permanently delete an object that has a <code>versionId</code>, you must include the object’s <code>versionId</code> in the request. For more information about versioning-suspended buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectsfromVersioningSuspendedBuckets.html">Deleting objects from versioning-suspended buckets</a>.</p>
 *             </li>
 *          </ul>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> - S3 Versioning isn't enabled and supported for directory buckets. For this API operation, only the <code>null</code> value of the version ID is supported by directory buckets. You can only specify <code>null</code>
 *                to the <code>versionId</code> query parameter in the request.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> - For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                      </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <p>To remove a specific version, you must use the <code>versionId</code> query parameter. Using this
 *          query parameter permanently deletes the version. If the object deleted is a delete marker, Amazon S3
 *          sets the response header <code>x-amz-delete-marker</code> to true. </p>
 *          <p>If the object you want to delete is in a bucket where the bucket versioning
 *          configuration is MFA Delete enabled, you must include the <code>x-amz-mfa</code> request
 *          header in the DELETE <code>versionId</code> request. Requests that include
 *          <code>x-amz-mfa</code> must use HTTPS. For more information about MFA Delete, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMFADelete.html">Using MFA Delete</a> in the <i>Amazon S3
 *                User Guide</i>. To see sample
 *          requests that use versioning, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectDELETE.html#ExampleVersionObjectDelete">Sample
 *             Request</a>. </p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> - MFA delete is not supported by directory buckets.</p>
 *          </note>
 *          <p>You can delete objects by explicitly calling DELETE Object or calling
 *          (<a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycle.html">PutBucketLifecycle</a>) to enable Amazon S3 to remove them for you. If you want to block
 *          users or accounts from removing or deleting objects from your bucket, you must deny them
 *          the <code>s3:DeleteObject</code>, <code>s3:DeleteObjectVersion</code>, and
 *          <code>s3:PutLifeCycleConfiguration</code> actions. </p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> - S3 Lifecycle is not supported by directory buckets.</p>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - The following permissions are required in your policies when your
 *                         <code>DeleteObjects</code> request includes specific headers.</p>
 *                      <ul>
 *                         <li>
 *                            <p>
 *                               <b>
 *                                  <code>s3:DeleteObject</code>
 *                               </b> - To delete an object from a bucket, you must always have the <code>s3:DeleteObject</code> permission.</p>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <b>
 *                                  <code>s3:DeleteObjectVersion</code>
 *                               </b> - To delete a specific version of an object from a versioning-enabled bucket, you must have the <code>s3:DeleteObjectVersion</code> permission.</p>
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
 *          <p>The following action is related to <code>DeleteObject</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html">PutObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteObjectRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   MFA: "STRING_VALUE",
 *   VersionId: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   BypassGovernanceRetention: true || false,
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   IfMatch: "STRING_VALUE",
 *   IfMatchLastModifiedTime: new Date("TIMESTAMP"),
 *   IfMatchSize: Number("long"),
 * };
 * const command = new DeleteObjectCommand(input);
 * const response = await client.send(command);
 * // { // DeleteObjectOutput
 * //   DeleteMarker: true || false,
 * //   VersionId: "STRING_VALUE",
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param DeleteObjectCommandInput - {@link DeleteObjectCommandInput}
 * @returns {@link DeleteObjectCommandOutput}
 * @see {@link DeleteObjectCommandInput} for command's `input` shape.
 * @see {@link DeleteObjectCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete an object (from a non-versioned bucket)
 * ```javascript
 * // The following example deletes an object from a non-versioned bucket.
 * const input = {
 *   Bucket: "ExampleBucket",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new DeleteObjectCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @example To delete an object
 * ```javascript
 * // The following example deletes an object from an S3 bucket.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "objectkey.jpg"
 * };
 * const command = new DeleteObjectCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* empty *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteObjectCommand extends DeleteObjectCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteObjectRequest;
            output: DeleteObjectOutput;
        };
        sdk: {
            input: DeleteObjectCommandInput;
            output: DeleteObjectCommandOutput;
        };
    };
}
