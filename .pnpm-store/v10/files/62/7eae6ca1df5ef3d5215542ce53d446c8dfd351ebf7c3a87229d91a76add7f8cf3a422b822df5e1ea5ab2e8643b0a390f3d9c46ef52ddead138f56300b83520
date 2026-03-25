import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketVersioningRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketVersioningCommand}.
 */
export interface PutBucketVersioningCommandInput extends PutBucketVersioningRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketVersioningCommand}.
 */
export interface PutBucketVersioningCommandOutput extends __MetadataBearer {
}
declare const PutBucketVersioningCommand_base: {
    new (input: PutBucketVersioningCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketVersioningCommandInput, PutBucketVersioningCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketVersioningCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketVersioningCommandInput, PutBucketVersioningCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <note>
 *             <p>When you enable versioning on a bucket for the first time, it might take a short
 *             amount of time for the change to be fully propagated. While this change is propagating,
 *             you might encounter intermittent <code>HTTP 404 NoSuchKey</code> errors for requests to
 *             objects created or updated after enabling versioning. We recommend that you wait for 15
 *             minutes after enabling versioning before issuing write operations (<code>PUT</code> or
 *             <code>DELETE</code>) on objects in the bucket. </p>
 *          </note>
 *          <p>Sets the versioning state of an existing bucket.</p>
 *          <p>You can set the versioning state with one of the following values:</p>
 *          <p>
 *             <b>Enabled</b>—Enables versioning for the objects in the
 *          bucket. All objects added to the bucket receive a unique version ID.</p>
 *          <p>
 *             <b>Suspended</b>—Disables versioning for the objects in the
 *          bucket. All objects added to the bucket receive the version ID null.</p>
 *          <p>If the versioning state has never been set on a bucket, it has no versioning state; a
 *             <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketVersioning.html">GetBucketVersioning</a> request does not return a versioning state value.</p>
 *          <p>In order to enable MFA Delete, you must be the bucket owner. If you are the bucket owner
 *          and want to enable MFA Delete in the bucket versioning configuration, you must include the
 *             <code>x-amz-mfa request</code> header and the <code>Status</code> and the
 *             <code>MfaDelete</code> request elements in a request to set the versioning state of the
 *          bucket.</p>
 *          <important>
 *             <p>If you have an object expiration lifecycle configuration in your non-versioned bucket
 *             and you want to maintain the same permanent delete behavior when you enable versioning,
 *             you must add a noncurrent expiration policy. The noncurrent expiration lifecycle
 *             configuration will manage the deletes of the noncurrent object versions in the
 *             version-enabled bucket. (A version-enabled bucket maintains one current and zero or more
 *             noncurrent object versions.) For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html#lifecycle-and-other-bucket-config">Lifecycle and Versioning</a>.</p>
 *          </important>
 *          <p>The following operations are related to <code>PutBucketVersioning</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html">CreateBucket</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html">DeleteBucket</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketVersioning.html">GetBucketVersioning</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketVersioningCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketVersioningCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketVersioningRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   MFA: "STRING_VALUE",
 *   VersioningConfiguration: { // VersioningConfiguration
 *     MFADelete: "Enabled" || "Disabled",
 *     Status: "Enabled" || "Suspended",
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketVersioningCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketVersioningCommandInput - {@link PutBucketVersioningCommandInput}
 * @returns {@link PutBucketVersioningCommandOutput}
 * @see {@link PutBucketVersioningCommandInput} for command's `input` shape.
 * @see {@link PutBucketVersioningCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example Set versioning configuration on a bucket
 * ```javascript
 * // The following example sets versioning configuration on bucket. The configuration enables versioning on the bucket.
 * const input = {
 *   Bucket: "examplebucket",
 *   VersioningConfiguration: {
 *     MFADelete: "Disabled",
 *     Status: "Enabled"
 *   }
 * };
 * const command = new PutBucketVersioningCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutBucketVersioningCommand extends PutBucketVersioningCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketVersioningRequest;
            output: {};
        };
        sdk: {
            input: PutBucketVersioningCommandInput;
            output: PutBucketVersioningCommandOutput;
        };
    };
}
