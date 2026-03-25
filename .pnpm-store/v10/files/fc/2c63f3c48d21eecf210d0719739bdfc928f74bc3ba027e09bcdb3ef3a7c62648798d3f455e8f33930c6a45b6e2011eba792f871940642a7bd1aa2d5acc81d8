import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketLifecycleConfigurationOutput, GetBucketLifecycleConfigurationRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketLifecycleConfigurationCommand}.
 */
export interface GetBucketLifecycleConfigurationCommandInput extends GetBucketLifecycleConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketLifecycleConfigurationCommand}.
 */
export interface GetBucketLifecycleConfigurationCommandOutput extends GetBucketLifecycleConfigurationOutput, __MetadataBearer {
}
declare const GetBucketLifecycleConfigurationCommand_base: {
    new (input: GetBucketLifecycleConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketLifecycleConfigurationCommandInput, GetBucketLifecycleConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketLifecycleConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketLifecycleConfigurationCommandInput, GetBucketLifecycleConfigurationCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns the lifecycle configuration information set on the bucket. For information about
 *          lifecycle configuration, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html">Object Lifecycle
 *          Management</a>.</p>
 *          <p>Bucket lifecycle configuration now supports specifying a lifecycle rule using an object
 *          key name prefix, one or more object tags, object size, or any combination of these.
 *          Accordingly, this section describes the latest API, which is compatible with the new
 *          functionality. The previous version of the API supported filtering based only on an object
 *          key name prefix, which is supported for general purpose buckets for backward compatibility.
 *          For the related API description, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLifecycle.html">GetBucketLifecycle</a>.</p>
 *          <note>
 *             <p>Lifecyle configurations for directory buckets only support expiring objects and
 *             cancelling multipart uploads. Expiring of versioned objects, transitions and tag filters
 *             are not supported.</p>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - By
 *                         default, all Amazon S3 resources are private, including buckets, objects, and
 *                         related subresources (for example, lifecycle configuration and website
 *                         configuration). Only the resource owner (that is, the Amazon Web Services account that
 *                         created it) can access the resource. The resource owner can optionally grant
 *                         access permissions to others by writing an access policy. For this
 *                         operation, a user must have the <code>s3:GetLifecycleConfiguration</code>
 *                         permission.</p>
 *                      <p>For more information about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing Access
 *                            Permissions to Your Amazon S3 Resources</a>.</p>
 *                   </li>
 *                </ul>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         You must have the <code>s3express:GetLifecycleConfiguration</code>
 *                         permission in an IAM identity-based policy to use this operation.
 *                         Cross-account access to this API operation isn't supported. The resource
 *                         owner can optionally grant access permissions to others by creating a role
 *                         or user for them as long as they are within the same account as the owner
 *                         and resource.</p>
 *                      <p>For more information about directory bucket policies and permissions, see
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam.html">Authorizing Regional endpoint APIs with IAM</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                      <note>
 *                         <p>
 *                            <b>Directory buckets </b> - For directory buckets, you must make requests for this API operation to the Regional endpoint. These endpoints support path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
 *                            </code>. Virtual-hosted-style requests aren't supported.
 * For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                      </note>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host
 *                   header syntax is
 *                      <code>s3express-control.<i>region</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>
 *             <code>GetBucketLifecycleConfiguration</code> has the following special error:</p>
 *          <ul>
 *             <li>
 *                <p>Error code: <code>NoSuchLifecycleConfiguration</code>
 *                </p>
 *                <ul>
 *                   <li>
 *                      <p>Description: The lifecycle configuration does not exist.</p>
 *                   </li>
 *                   <li>
 *                      <p>HTTP Status Code: 404 Not Found</p>
 *                   </li>
 *                   <li>
 *                      <p>SOAP Fault Code Prefix: Client</p>
 *                   </li>
 *                </ul>
 *             </li>
 *          </ul>
 *          <p>The following operations are related to
 *          <code>GetBucketLifecycleConfiguration</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLifecycle.html">GetBucketLifecycle</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycle.html">PutBucketLifecycle</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketLifecycle.html">DeleteBucketLifecycle</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketLifecycleConfigurationCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketLifecycleConfigurationRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketLifecycleConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketLifecycleConfigurationOutput
 * //   Rules: [ // LifecycleRules
 * //     { // LifecycleRule
 * //       Expiration: { // LifecycleExpiration
 * //         Date: new Date("TIMESTAMP"),
 * //         Days: Number("int"),
 * //         ExpiredObjectDeleteMarker: true || false,
 * //       },
 * //       ID: "STRING_VALUE",
 * //       Prefix: "STRING_VALUE",
 * //       Filter: { // LifecycleRuleFilter
 * //         Prefix: "STRING_VALUE",
 * //         Tag: { // Tag
 * //           Key: "STRING_VALUE", // required
 * //           Value: "STRING_VALUE", // required
 * //         },
 * //         ObjectSizeGreaterThan: Number("long"),
 * //         ObjectSizeLessThan: Number("long"),
 * //         And: { // LifecycleRuleAndOperator
 * //           Prefix: "STRING_VALUE",
 * //           Tags: [ // TagSet
 * //             {
 * //               Key: "STRING_VALUE", // required
 * //               Value: "STRING_VALUE", // required
 * //             },
 * //           ],
 * //           ObjectSizeGreaterThan: Number("long"),
 * //           ObjectSizeLessThan: Number("long"),
 * //         },
 * //       },
 * //       Status: "Enabled" || "Disabled", // required
 * //       Transitions: [ // TransitionList
 * //         { // Transition
 * //           Date: new Date("TIMESTAMP"),
 * //           Days: Number("int"),
 * //           StorageClass: "GLACIER" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "DEEP_ARCHIVE" || "GLACIER_IR",
 * //         },
 * //       ],
 * //       NoncurrentVersionTransitions: [ // NoncurrentVersionTransitionList
 * //         { // NoncurrentVersionTransition
 * //           NoncurrentDays: Number("int"),
 * //           StorageClass: "GLACIER" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "DEEP_ARCHIVE" || "GLACIER_IR",
 * //           NewerNoncurrentVersions: Number("int"),
 * //         },
 * //       ],
 * //       NoncurrentVersionExpiration: { // NoncurrentVersionExpiration
 * //         NoncurrentDays: Number("int"),
 * //         NewerNoncurrentVersions: Number("int"),
 * //       },
 * //       AbortIncompleteMultipartUpload: { // AbortIncompleteMultipartUpload
 * //         DaysAfterInitiation: Number("int"),
 * //       },
 * //     },
 * //   ],
 * //   TransitionDefaultMinimumObjectSize: "varies_by_storage_class" || "all_storage_classes_128K",
 * // };
 *
 * ```
 *
 * @param GetBucketLifecycleConfigurationCommandInput - {@link GetBucketLifecycleConfigurationCommandInput}
 * @returns {@link GetBucketLifecycleConfigurationCommandOutput}
 * @see {@link GetBucketLifecycleConfigurationCommandInput} for command's `input` shape.
 * @see {@link GetBucketLifecycleConfigurationCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To get lifecycle configuration on a bucket
 * ```javascript
 * // The following example retrieves lifecycle configuration on set on a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new GetBucketLifecycleConfigurationCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Rules: [
 *     {
 *       ID: "Rule for TaxDocs/",
 *       Prefix: "TaxDocs",
 *       Status: "Enabled",
 *       Transitions: [
 *         {
 *           Days: 365,
 *           StorageClass: "STANDARD_IA"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetBucketLifecycleConfigurationCommand extends GetBucketLifecycleConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketLifecycleConfigurationRequest;
            output: GetBucketLifecycleConfigurationOutput;
        };
        sdk: {
            input: GetBucketLifecycleConfigurationCommandInput;
            output: GetBucketLifecycleConfigurationCommandOutput;
        };
    };
}
