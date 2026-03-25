import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketNotificationConfigurationRequest, NotificationConfiguration } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketNotificationConfigurationCommand}.
 */
export interface GetBucketNotificationConfigurationCommandInput extends GetBucketNotificationConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketNotificationConfigurationCommand}.
 */
export interface GetBucketNotificationConfigurationCommandOutput extends NotificationConfiguration, __MetadataBearer {
}
declare const GetBucketNotificationConfigurationCommand_base: {
    new (input: GetBucketNotificationConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketNotificationConfigurationCommandInput, GetBucketNotificationConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketNotificationConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketNotificationConfigurationCommandInput, GetBucketNotificationConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns the notification configuration of a bucket.</p>
 *          <p>If notifications are not enabled on the bucket, the action returns an empty
 *             <code>NotificationConfiguration</code> element.</p>
 *          <p>By default, you must be the bucket owner to read the notification configuration of a
 *          bucket. However, the bucket owner can use a bucket policy to grant permission to other
 *          users to read this configuration with the <code>s3:GetBucketNotification</code>
 *          permission.</p>
 *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
 *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
 * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
 * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
 *             Error Codes</a>.</p>
 *          <p>For more information about setting and reading the notification configuration on a
 *          bucket, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Setting Up Notification of Bucket Events</a>. For more information about bucket
 *          policies, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-iam-policies.html">Using Bucket Policies</a>.</p>
 *          <p>The following action is related to <code>GetBucketNotification</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketNotification.html">PutBucketNotification</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetBucketNotificationConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketNotificationConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketNotificationConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketNotificationConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // NotificationConfiguration
 * //   TopicConfigurations: [ // TopicConfigurationList
 * //     { // TopicConfiguration
 * //       Id: "STRING_VALUE",
 * //       TopicArn: "STRING_VALUE", // required
 * //       Events: [ // EventList // required
 * //         "s3:ReducedRedundancyLostObject" || "s3:ObjectCreated:*" || "s3:ObjectCreated:Put" || "s3:ObjectCreated:Post" || "s3:ObjectCreated:Copy" || "s3:ObjectCreated:CompleteMultipartUpload" || "s3:ObjectRemoved:*" || "s3:ObjectRemoved:Delete" || "s3:ObjectRemoved:DeleteMarkerCreated" || "s3:ObjectRestore:*" || "s3:ObjectRestore:Post" || "s3:ObjectRestore:Completed" || "s3:Replication:*" || "s3:Replication:OperationFailedReplication" || "s3:Replication:OperationNotTracked" || "s3:Replication:OperationMissedThreshold" || "s3:Replication:OperationReplicatedAfterThreshold" || "s3:ObjectRestore:Delete" || "s3:LifecycleTransition" || "s3:IntelligentTiering" || "s3:ObjectAcl:Put" || "s3:LifecycleExpiration:*" || "s3:LifecycleExpiration:Delete" || "s3:LifecycleExpiration:DeleteMarkerCreated" || "s3:ObjectTagging:*" || "s3:ObjectTagging:Put" || "s3:ObjectTagging:Delete",
 * //       ],
 * //       Filter: { // NotificationConfigurationFilter
 * //         Key: { // S3KeyFilter
 * //           FilterRules: [ // FilterRuleList
 * //             { // FilterRule
 * //               Name: "prefix" || "suffix",
 * //               Value: "STRING_VALUE",
 * //             },
 * //           ],
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   QueueConfigurations: [ // QueueConfigurationList
 * //     { // QueueConfiguration
 * //       Id: "STRING_VALUE",
 * //       QueueArn: "STRING_VALUE", // required
 * //       Events: [ // required
 * //         "s3:ReducedRedundancyLostObject" || "s3:ObjectCreated:*" || "s3:ObjectCreated:Put" || "s3:ObjectCreated:Post" || "s3:ObjectCreated:Copy" || "s3:ObjectCreated:CompleteMultipartUpload" || "s3:ObjectRemoved:*" || "s3:ObjectRemoved:Delete" || "s3:ObjectRemoved:DeleteMarkerCreated" || "s3:ObjectRestore:*" || "s3:ObjectRestore:Post" || "s3:ObjectRestore:Completed" || "s3:Replication:*" || "s3:Replication:OperationFailedReplication" || "s3:Replication:OperationNotTracked" || "s3:Replication:OperationMissedThreshold" || "s3:Replication:OperationReplicatedAfterThreshold" || "s3:ObjectRestore:Delete" || "s3:LifecycleTransition" || "s3:IntelligentTiering" || "s3:ObjectAcl:Put" || "s3:LifecycleExpiration:*" || "s3:LifecycleExpiration:Delete" || "s3:LifecycleExpiration:DeleteMarkerCreated" || "s3:ObjectTagging:*" || "s3:ObjectTagging:Put" || "s3:ObjectTagging:Delete",
 * //       ],
 * //       Filter: {
 * //         Key: {
 * //           FilterRules: [
 * //             {
 * //               Name: "prefix" || "suffix",
 * //               Value: "STRING_VALUE",
 * //             },
 * //           ],
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   LambdaFunctionConfigurations: [ // LambdaFunctionConfigurationList
 * //     { // LambdaFunctionConfiguration
 * //       Id: "STRING_VALUE",
 * //       LambdaFunctionArn: "STRING_VALUE", // required
 * //       Events: [ // required
 * //         "s3:ReducedRedundancyLostObject" || "s3:ObjectCreated:*" || "s3:ObjectCreated:Put" || "s3:ObjectCreated:Post" || "s3:ObjectCreated:Copy" || "s3:ObjectCreated:CompleteMultipartUpload" || "s3:ObjectRemoved:*" || "s3:ObjectRemoved:Delete" || "s3:ObjectRemoved:DeleteMarkerCreated" || "s3:ObjectRestore:*" || "s3:ObjectRestore:Post" || "s3:ObjectRestore:Completed" || "s3:Replication:*" || "s3:Replication:OperationFailedReplication" || "s3:Replication:OperationNotTracked" || "s3:Replication:OperationMissedThreshold" || "s3:Replication:OperationReplicatedAfterThreshold" || "s3:ObjectRestore:Delete" || "s3:LifecycleTransition" || "s3:IntelligentTiering" || "s3:ObjectAcl:Put" || "s3:LifecycleExpiration:*" || "s3:LifecycleExpiration:Delete" || "s3:LifecycleExpiration:DeleteMarkerCreated" || "s3:ObjectTagging:*" || "s3:ObjectTagging:Put" || "s3:ObjectTagging:Delete",
 * //       ],
 * //       Filter: {
 * //         Key: {
 * //           FilterRules: [
 * //             {
 * //               Name: "prefix" || "suffix",
 * //               Value: "STRING_VALUE",
 * //             },
 * //           ],
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   EventBridgeConfiguration: {},
 * // };
 *
 * ```
 *
 * @param GetBucketNotificationConfigurationCommandInput - {@link GetBucketNotificationConfigurationCommandInput}
 * @returns {@link GetBucketNotificationConfigurationCommandOutput}
 * @see {@link GetBucketNotificationConfigurationCommandInput} for command's `input` shape.
 * @see {@link GetBucketNotificationConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetBucketNotificationConfigurationCommand extends GetBucketNotificationConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketNotificationConfigurationRequest;
            output: NotificationConfiguration;
        };
        sdk: {
            input: GetBucketNotificationConfigurationCommandInput;
            output: GetBucketNotificationConfigurationCommandOutput;
        };
    };
}
