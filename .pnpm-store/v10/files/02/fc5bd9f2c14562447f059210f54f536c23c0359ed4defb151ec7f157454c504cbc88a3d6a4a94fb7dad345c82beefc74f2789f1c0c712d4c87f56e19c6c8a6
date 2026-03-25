import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketInventoryConfigurationRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketInventoryConfigurationCommand}.
 */
export interface PutBucketInventoryConfigurationCommandInput extends PutBucketInventoryConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketInventoryConfigurationCommand}.
 */
export interface PutBucketInventoryConfigurationCommandOutput extends __MetadataBearer {
}
declare const PutBucketInventoryConfigurationCommand_base: {
    new (input: PutBucketInventoryConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketInventoryConfigurationCommandInput, PutBucketInventoryConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketInventoryConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketInventoryConfigurationCommandInput, PutBucketInventoryConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>This implementation of the <code>PUT</code> action adds an inventory configuration
 *          (identified by the inventory ID) to the bucket. You can have up to 1,000 inventory
 *          configurations per bucket. </p>
 *          <p>Amazon S3 inventory generates inventories of the objects in the bucket on a daily or weekly
 *          basis, and the results are published to a flat file. The bucket that is inventoried is
 *          called the <i>source</i> bucket, and the bucket where the inventory flat file
 *          is stored is called the <i>destination</i> bucket. The
 *             <i>destination</i> bucket must be in the same Amazon Web Services Region as the
 *             <i>source</i> bucket. </p>
 *          <p>When you configure an inventory for a <i>source</i> bucket, you specify
 *          the <i>destination</i> bucket where you want the inventory to be stored, and
 *          whether to generate the inventory daily or weekly. You can also configure what object
 *          metadata to include and whether to inventory all object versions or only current versions.
 *          For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-inventory.html">Amazon S3 Inventory</a> in the
 *          Amazon S3 User Guide.</p>
 *          <important>
 *             <p>You must create a bucket policy on the <i>destination</i> bucket to
 *             grant permissions to Amazon S3 to write objects to the bucket in the defined location. For an
 *             example policy, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html#example-bucket-policies-use-case-9"> Granting Permissions for Amazon S3 Inventory and Storage Class Analysis</a>.</p>
 *          </important>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>To use this operation, you must have permission to perform the
 *                      <code>s3:PutInventoryConfiguration</code> action. The bucket owner has this
 *                   permission by default and can grant this permission to others. </p>
 *                <p>The <code>s3:PutInventoryConfiguration</code> permission allows a user to
 *                   create an <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory.html">S3 Inventory</a>
 *                   report that includes all object metadata fields available and to specify the
 *                   destination bucket to store the inventory. A user with read access to objects in
 *                   the destination bucket can also access all object metadata fields that are
 *                   available in the inventory report. </p>
 *                <p>To restrict access to an inventory report, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html#example-bucket-policies-use-case-10">Restricting access to an Amazon S3 Inventory report</a> in the
 *                      <i>Amazon S3 User Guide</i>. For more information about the metadata
 *                   fields available in S3 Inventory, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory.html#storage-inventory-contents">Amazon S3 Inventory lists</a> in the <i>Amazon S3 User Guide</i>. For
 *                   more information about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions related to bucket subresource operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Identity and access management in Amazon S3</a> in the
 *                      <i>Amazon S3 User Guide</i>.</p>
 *             </dd>
 *          </dl>
 *          <p>
 *             <code>PutBucketInventoryConfiguration</code> has the following special errors:</p>
 *          <dl>
 *             <dt>HTTP 400 Bad Request Error</dt>
 *             <dd>
 *                <p>
 *                   <i>Code:</i> InvalidArgument</p>
 *                <p>
 *                   <i>Cause:</i> Invalid Argument</p>
 *             </dd>
 *             <dt>HTTP 400 Bad Request Error</dt>
 *             <dd>
 *                <p>
 *                   <i>Code:</i> TooManyConfigurations</p>
 *                <p>
 *                   <i>Cause:</i> You are attempting to create a new configuration
 *                   but have already reached the 1,000-configuration limit. </p>
 *             </dd>
 *             <dt>HTTP 403 Forbidden Error</dt>
 *             <dd>
 *                <p>
 *                   <i>Cause:</i> You are not the owner of the specified bucket, or
 *                   you do not have the <code>s3:PutInventoryConfiguration</code> bucket permission to
 *                   set the configuration on the bucket. </p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to
 *          <code>PutBucketInventoryConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketInventoryConfiguration.html">GetBucketInventoryConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketInventoryConfiguration.html">DeleteBucketInventoryConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBucketInventoryConfigurations.html">ListBucketInventoryConfigurations</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketInventoryConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketInventoryConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketInventoryConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 *   InventoryConfiguration: { // InventoryConfiguration
 *     Destination: { // InventoryDestination
 *       S3BucketDestination: { // InventoryS3BucketDestination
 *         AccountId: "STRING_VALUE",
 *         Bucket: "STRING_VALUE", // required
 *         Format: "CSV" || "ORC" || "Parquet", // required
 *         Prefix: "STRING_VALUE",
 *         Encryption: { // InventoryEncryption
 *           SSES3: {},
 *           SSEKMS: { // SSEKMS
 *             KeyId: "STRING_VALUE", // required
 *           },
 *         },
 *       },
 *     },
 *     IsEnabled: true || false, // required
 *     Filter: { // InventoryFilter
 *       Prefix: "STRING_VALUE", // required
 *     },
 *     Id: "STRING_VALUE", // required
 *     IncludedObjectVersions: "All" || "Current", // required
 *     OptionalFields: [ // InventoryOptionalFields
 *       "Size" || "LastModifiedDate" || "StorageClass" || "ETag" || "IsMultipartUploaded" || "ReplicationStatus" || "EncryptionStatus" || "ObjectLockRetainUntilDate" || "ObjectLockMode" || "ObjectLockLegalHoldStatus" || "IntelligentTieringAccessTier" || "BucketKeyStatus" || "ChecksumAlgorithm" || "ObjectAccessControlList" || "ObjectOwner",
 *     ],
 *     Schedule: { // InventorySchedule
 *       Frequency: "Daily" || "Weekly", // required
 *     },
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketInventoryConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketInventoryConfigurationCommandInput - {@link PutBucketInventoryConfigurationCommandInput}
 * @returns {@link PutBucketInventoryConfigurationCommandOutput}
 * @see {@link PutBucketInventoryConfigurationCommandInput} for command's `input` shape.
 * @see {@link PutBucketInventoryConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class PutBucketInventoryConfigurationCommand extends PutBucketInventoryConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketInventoryConfigurationRequest;
            output: {};
        };
        sdk: {
            input: PutBucketInventoryConfigurationCommandInput;
            output: PutBucketInventoryConfigurationCommandOutput;
        };
    };
}
