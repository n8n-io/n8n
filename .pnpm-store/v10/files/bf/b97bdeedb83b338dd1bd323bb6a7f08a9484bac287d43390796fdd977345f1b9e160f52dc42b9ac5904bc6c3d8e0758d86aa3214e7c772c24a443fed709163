import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketReplicationOutput, GetBucketReplicationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketReplicationCommand}.
 */
export interface GetBucketReplicationCommandInput extends GetBucketReplicationRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketReplicationCommand}.
 */
export interface GetBucketReplicationCommandOutput extends GetBucketReplicationOutput, __MetadataBearer {
}
declare const GetBucketReplicationCommand_base: {
    new (input: GetBucketReplicationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketReplicationCommandInput, GetBucketReplicationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketReplicationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketReplicationCommandInput, GetBucketReplicationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns the replication configuration of a bucket.</p>
 *          <note>
 *             <p> It can take a while to propagate the put or delete a replication configuration to
 *             all Amazon S3 systems. Therefore, a get request soon after put or delete can return a wrong
 *             result. </p>
 *          </note>
 *          <p> For information about replication configuration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/replication.html">Replication</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 *          <p>This action requires permissions for the <code>s3:GetReplicationConfiguration</code>
 *          action. For more information about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-iam-policies.html">Using Bucket Policies and User
 *             Policies</a>.</p>
 *          <p>If you include the <code>Filter</code> element in a replication configuration, you must
 *          also include the <code>DeleteMarkerReplication</code> and <code>Priority</code> elements.
 *          The response also returns those elements.</p>
 *          <p>For information about <code>GetBucketReplication</code> errors, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ReplicationErrorCodeList">List of
 *             replication-related error codes</a>
 *          </p>
 *          <p>The following operations are related to <code>GetBucketReplication</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketReplication.html">PutBucketReplication</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketReplication.html">DeleteBucketReplication</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetBucketReplicationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketReplicationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketReplicationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketReplicationCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketReplicationOutput
 * //   ReplicationConfiguration: { // ReplicationConfiguration
 * //     Role: "STRING_VALUE", // required
 * //     Rules: [ // ReplicationRules // required
 * //       { // ReplicationRule
 * //         ID: "STRING_VALUE",
 * //         Priority: Number("int"),
 * //         Prefix: "STRING_VALUE",
 * //         Filter: { // ReplicationRuleFilter
 * //           Prefix: "STRING_VALUE",
 * //           Tag: { // Tag
 * //             Key: "STRING_VALUE", // required
 * //             Value: "STRING_VALUE", // required
 * //           },
 * //           And: { // ReplicationRuleAndOperator
 * //             Prefix: "STRING_VALUE",
 * //             Tags: [ // TagSet
 * //               {
 * //                 Key: "STRING_VALUE", // required
 * //                 Value: "STRING_VALUE", // required
 * //               },
 * //             ],
 * //           },
 * //         },
 * //         Status: "Enabled" || "Disabled", // required
 * //         SourceSelectionCriteria: { // SourceSelectionCriteria
 * //           SseKmsEncryptedObjects: { // SseKmsEncryptedObjects
 * //             Status: "Enabled" || "Disabled", // required
 * //           },
 * //           ReplicaModifications: { // ReplicaModifications
 * //             Status: "Enabled" || "Disabled", // required
 * //           },
 * //         },
 * //         ExistingObjectReplication: { // ExistingObjectReplication
 * //           Status: "Enabled" || "Disabled", // required
 * //         },
 * //         Destination: { // Destination
 * //           Bucket: "STRING_VALUE", // required
 * //           Account: "STRING_VALUE",
 * //           StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "GLACIER" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 * //           AccessControlTranslation: { // AccessControlTranslation
 * //             Owner: "Destination", // required
 * //           },
 * //           EncryptionConfiguration: { // EncryptionConfiguration
 * //             ReplicaKmsKeyID: "STRING_VALUE",
 * //           },
 * //           ReplicationTime: { // ReplicationTime
 * //             Status: "Enabled" || "Disabled", // required
 * //             Time: { // ReplicationTimeValue
 * //               Minutes: Number("int"),
 * //             },
 * //           },
 * //           Metrics: { // Metrics
 * //             Status: "Enabled" || "Disabled", // required
 * //             EventThreshold: {
 * //               Minutes: Number("int"),
 * //             },
 * //           },
 * //         },
 * //         DeleteMarkerReplication: { // DeleteMarkerReplication
 * //           Status: "Enabled" || "Disabled",
 * //         },
 * //       },
 * //     ],
 * //   },
 * // };
 *
 * ```
 *
 * @param GetBucketReplicationCommandInput - {@link GetBucketReplicationCommandInput}
 * @returns {@link GetBucketReplicationCommandOutput}
 * @see {@link GetBucketReplicationCommandInput} for command's `input` shape.
 * @see {@link GetBucketReplicationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To get replication configuration set on a bucket
 * ```javascript
 * // The following example returns replication configuration set on a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new GetBucketReplicationCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ReplicationConfiguration: {
 *     Role: "arn:aws:iam::acct-id:role/example-role",
 *     Rules: [
 *       {
 *         Destination: {
 *           Bucket: "arn:aws:s3:::destination-bucket"
 *         },
 *         ID: "MWIwNTkwZmItMTE3MS00ZTc3LWJkZDEtNzRmODQwYzc1OTQy",
 *         Prefix: "Tax",
 *         Status: "Enabled"
 *       }
 *     ]
 *   }
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetBucketReplicationCommand extends GetBucketReplicationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketReplicationRequest;
            output: GetBucketReplicationOutput;
        };
        sdk: {
            input: GetBucketReplicationCommandInput;
            output: GetBucketReplicationCommandOutput;
        };
    };
}
