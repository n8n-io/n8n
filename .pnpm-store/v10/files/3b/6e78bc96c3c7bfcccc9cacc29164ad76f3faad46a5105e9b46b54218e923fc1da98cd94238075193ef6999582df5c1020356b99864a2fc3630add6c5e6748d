import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketNotificationConfigurationRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketNotificationConfigurationCommand}.
 */
export interface PutBucketNotificationConfigurationCommandInput extends PutBucketNotificationConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketNotificationConfigurationCommand}.
 */
export interface PutBucketNotificationConfigurationCommandOutput extends __MetadataBearer {
}
declare const PutBucketNotificationConfigurationCommand_base: {
    new (input: PutBucketNotificationConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketNotificationConfigurationCommandInput, PutBucketNotificationConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketNotificationConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketNotificationConfigurationCommandInput, PutBucketNotificationConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Enables notifications of specified events for a bucket. For more information about event
 *          notifications, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Configuring Event
 *          Notifications</a>.</p>
 *          <p>Using this API, you can replace an existing notification configuration. The
 *          configuration is an XML file that defines the event types that you want Amazon S3 to publish and
 *          the destination where you want Amazon S3 to publish an event notification when it detects an
 *          event of the specified type.</p>
 *          <p>By default, your bucket has no event notifications configured. That is, the notification
 *          configuration will be an empty <code>NotificationConfiguration</code>.</p>
 *          <p>
 *             <code><NotificationConfiguration></code>
 *          </p>
 *          <p>
 *             <code></NotificationConfiguration></code>
 *          </p>
 *          <p>This action replaces the existing notification configuration with the configuration you
 *          include in the request body.</p>
 *          <p>After Amazon S3 receives this request, it first verifies that any Amazon Simple Notification
 *          Service (Amazon SNS) or Amazon Simple Queue Service (Amazon SQS) destination exists, and
 *          that the bucket owner has permission to publish to it by sending a test notification. In
 *          the case of Lambda destinations, Amazon S3 verifies that the Lambda function permissions
 *          grant Amazon S3 permission to invoke the function from the Amazon S3 bucket. For more information,
 *          see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html">Configuring Notifications for Amazon S3 Events</a>.</p>
 *          <p>You can disable notifications by adding the empty NotificationConfiguration
 *          element.</p>
 *          <p>For more information about the number of event notification configurations that you can
 *          create per bucket, see <a href="https://docs.aws.amazon.com/general/latest/gr/s3.html#limits_s3">Amazon S3 service quotas</a> in <i>Amazon Web Services
 *             General Reference</i>.</p>
 *          <p>By default, only the bucket owner can configure notifications on a bucket. However,
 *          bucket owners can use a bucket policy to grant permission to other users to set this
 *          configuration with the required <code>s3:PutBucketNotification</code> permission.</p>
 *          <note>
 *             <p>The PUT notification is an atomic operation. For example, suppose your notification
 *             configuration includes SNS topic, SQS queue, and Lambda function configurations. When
 *             you send a PUT request with this configuration, Amazon S3 sends test messages to your SNS
 *             topic. If the message fails, the entire PUT action will fail, and Amazon S3 will not add the
 *             configuration to your bucket.</p>
 *          </note>
 *          <p>If the configuration in the request body includes only one
 *             <code>TopicConfiguration</code> specifying only the
 *             <code>s3:ReducedRedundancyLostObject</code> event type, the response will also include
 *          the <code>x-amz-sns-test-message-id</code> header containing the message ID of the test
 *          notification sent to the topic.</p>
 *          <p>The following action is related to
 *          <code>PutBucketNotificationConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketNotificationConfiguration.html">GetBucketNotificationConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketNotificationConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketNotificationConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketNotificationConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   NotificationConfiguration: { // NotificationConfiguration
 *     TopicConfigurations: [ // TopicConfigurationList
 *       { // TopicConfiguration
 *         Id: "STRING_VALUE",
 *         TopicArn: "STRING_VALUE", // required
 *         Events: [ // EventList // required
 *           "s3:ReducedRedundancyLostObject" || "s3:ObjectCreated:*" || "s3:ObjectCreated:Put" || "s3:ObjectCreated:Post" || "s3:ObjectCreated:Copy" || "s3:ObjectCreated:CompleteMultipartUpload" || "s3:ObjectRemoved:*" || "s3:ObjectRemoved:Delete" || "s3:ObjectRemoved:DeleteMarkerCreated" || "s3:ObjectRestore:*" || "s3:ObjectRestore:Post" || "s3:ObjectRestore:Completed" || "s3:Replication:*" || "s3:Replication:OperationFailedReplication" || "s3:Replication:OperationNotTracked" || "s3:Replication:OperationMissedThreshold" || "s3:Replication:OperationReplicatedAfterThreshold" || "s3:ObjectRestore:Delete" || "s3:LifecycleTransition" || "s3:IntelligentTiering" || "s3:ObjectAcl:Put" || "s3:LifecycleExpiration:*" || "s3:LifecycleExpiration:Delete" || "s3:LifecycleExpiration:DeleteMarkerCreated" || "s3:ObjectTagging:*" || "s3:ObjectTagging:Put" || "s3:ObjectTagging:Delete",
 *         ],
 *         Filter: { // NotificationConfigurationFilter
 *           Key: { // S3KeyFilter
 *             FilterRules: [ // FilterRuleList
 *               { // FilterRule
 *                 Name: "prefix" || "suffix",
 *                 Value: "STRING_VALUE",
 *               },
 *             ],
 *           },
 *         },
 *       },
 *     ],
 *     QueueConfigurations: [ // QueueConfigurationList
 *       { // QueueConfiguration
 *         Id: "STRING_VALUE",
 *         QueueArn: "STRING_VALUE", // required
 *         Events: [ // required
 *           "s3:ReducedRedundancyLostObject" || "s3:ObjectCreated:*" || "s3:ObjectCreated:Put" || "s3:ObjectCreated:Post" || "s3:ObjectCreated:Copy" || "s3:ObjectCreated:CompleteMultipartUpload" || "s3:ObjectRemoved:*" || "s3:ObjectRemoved:Delete" || "s3:ObjectRemoved:DeleteMarkerCreated" || "s3:ObjectRestore:*" || "s3:ObjectRestore:Post" || "s3:ObjectRestore:Completed" || "s3:Replication:*" || "s3:Replication:OperationFailedReplication" || "s3:Replication:OperationNotTracked" || "s3:Replication:OperationMissedThreshold" || "s3:Replication:OperationReplicatedAfterThreshold" || "s3:ObjectRestore:Delete" || "s3:LifecycleTransition" || "s3:IntelligentTiering" || "s3:ObjectAcl:Put" || "s3:LifecycleExpiration:*" || "s3:LifecycleExpiration:Delete" || "s3:LifecycleExpiration:DeleteMarkerCreated" || "s3:ObjectTagging:*" || "s3:ObjectTagging:Put" || "s3:ObjectTagging:Delete",
 *         ],
 *         Filter: {
 *           Key: {
 *             FilterRules: [
 *               {
 *                 Name: "prefix" || "suffix",
 *                 Value: "STRING_VALUE",
 *               },
 *             ],
 *           },
 *         },
 *       },
 *     ],
 *     LambdaFunctionConfigurations: [ // LambdaFunctionConfigurationList
 *       { // LambdaFunctionConfiguration
 *         Id: "STRING_VALUE",
 *         LambdaFunctionArn: "STRING_VALUE", // required
 *         Events: [ // required
 *           "s3:ReducedRedundancyLostObject" || "s3:ObjectCreated:*" || "s3:ObjectCreated:Put" || "s3:ObjectCreated:Post" || "s3:ObjectCreated:Copy" || "s3:ObjectCreated:CompleteMultipartUpload" || "s3:ObjectRemoved:*" || "s3:ObjectRemoved:Delete" || "s3:ObjectRemoved:DeleteMarkerCreated" || "s3:ObjectRestore:*" || "s3:ObjectRestore:Post" || "s3:ObjectRestore:Completed" || "s3:Replication:*" || "s3:Replication:OperationFailedReplication" || "s3:Replication:OperationNotTracked" || "s3:Replication:OperationMissedThreshold" || "s3:Replication:OperationReplicatedAfterThreshold" || "s3:ObjectRestore:Delete" || "s3:LifecycleTransition" || "s3:IntelligentTiering" || "s3:ObjectAcl:Put" || "s3:LifecycleExpiration:*" || "s3:LifecycleExpiration:Delete" || "s3:LifecycleExpiration:DeleteMarkerCreated" || "s3:ObjectTagging:*" || "s3:ObjectTagging:Put" || "s3:ObjectTagging:Delete",
 *         ],
 *         Filter: {
 *           Key: {
 *             FilterRules: [
 *               {
 *                 Name: "prefix" || "suffix",
 *                 Value: "STRING_VALUE",
 *               },
 *             ],
 *           },
 *         },
 *       },
 *     ],
 *     EventBridgeConfiguration: {},
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   SkipDestinationValidation: true || false,
 * };
 * const command = new PutBucketNotificationConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketNotificationConfigurationCommandInput - {@link PutBucketNotificationConfigurationCommandInput}
 * @returns {@link PutBucketNotificationConfigurationCommandOutput}
 * @see {@link PutBucketNotificationConfigurationCommandInput} for command's `input` shape.
 * @see {@link PutBucketNotificationConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example Set notification configuration for a bucket
 * ```javascript
 * // The following example sets notification configuration on a bucket to publish the object created events to an SNS topic.
 * const input = {
 *   Bucket: "examplebucket",
 *   NotificationConfiguration: {
 *     TopicConfigurations: [
 *       {
 *         Events: [
 *           "s3:ObjectCreated:*"
 *         ],
 *         TopicArn: "arn:aws:sns:us-west-2:123456789012:s3-notification-topic"
 *       }
 *     ]
 *   }
 * };
 * const command = new PutBucketNotificationConfigurationCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutBucketNotificationConfigurationCommand extends PutBucketNotificationConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketNotificationConfigurationRequest;
            output: {};
        };
        sdk: {
            input: PutBucketNotificationConfigurationCommandInput;
            output: PutBucketNotificationConfigurationCommandOutput;
        };
    };
}
