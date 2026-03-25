import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetObjectTaggingOutput, GetObjectTaggingRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetObjectTaggingCommand}.
 */
export interface GetObjectTaggingCommandInput extends GetObjectTaggingRequest {
}
/**
 * @public
 *
 * The output of {@link GetObjectTaggingCommand}.
 */
export interface GetObjectTaggingCommandOutput extends GetObjectTaggingOutput, __MetadataBearer {
}
declare const GetObjectTaggingCommand_base: {
    new (input: GetObjectTaggingCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectTaggingCommandInput, GetObjectTaggingCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetObjectTaggingCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectTaggingCommandInput, GetObjectTaggingCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns the tag-set of an object. You send the GET request against the tagging
 *          subresource associated with the object.</p>
 *          <p>To use this operation, you must have permission to perform the
 *             <code>s3:GetObjectTagging</code> action. By default, the GET action returns information
 *          about current version of an object. For a versioned bucket, you can have multiple versions
 *          of an object in your bucket. To retrieve tags of any other version, use the versionId query
 *          parameter. You also need permission for the <code>s3:GetObjectVersionTagging</code>
 *          action.</p>
 *          <p> By default, the bucket owner has this permission and can grant this permission to
 *          others.</p>
 *          <p> For information about the Amazon S3 object tagging feature, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/object-tagging.html">Object Tagging</a>.</p>
 *          <p>The following actions are related to <code>GetObjectTagging</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjectTagging.html">DeleteObjectTagging</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAttributes.html">GetObjectAttributes</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObjectTagging.html">PutObjectTagging</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetObjectTaggingCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetObjectTaggingCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetObjectTaggingRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   VersionId: "STRING_VALUE",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   RequestPayer: "requester",
 * };
 * const command = new GetObjectTaggingCommand(input);
 * const response = await client.send(command);
 * // { // GetObjectTaggingOutput
 * //   VersionId: "STRING_VALUE",
 * //   TagSet: [ // TagSet // required
 * //     { // Tag
 * //       Key: "STRING_VALUE", // required
 * //       Value: "STRING_VALUE", // required
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetObjectTaggingCommandInput - {@link GetObjectTaggingCommandInput}
 * @returns {@link GetObjectTaggingCommandOutput}
 * @see {@link GetObjectTaggingCommandInput} for command's `input` shape.
 * @see {@link GetObjectTaggingCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To retrieve tag set of a specific object version
 * ```javascript
 * // The following example retrieves tag set of an object. The request specifies object version.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "exampleobject",
 *   VersionId: "ydlaNkwWm0SfKJR.T1b1fIdPRbldTYRI"
 * };
 * const command = new GetObjectTaggingCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   TagSet: [
 *     {
 *       Key: "Key1",
 *       Value: "Value1"
 *     }
 *   ],
 *   VersionId: "ydlaNkwWm0SfKJR.T1b1fIdPRbldTYRI"
 * }
 * *\/
 * ```
 *
 * @example To retrieve tag set of an object
 * ```javascript
 * // The following example retrieves tag set of an object.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new GetObjectTaggingCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   TagSet: [
 *     {
 *       Key: "Key4",
 *       Value: "Value4"
 *     },
 *     {
 *       Key: "Key3",
 *       Value: "Value3"
 *     }
 *   ],
 *   VersionId: "null"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetObjectTaggingCommand extends GetObjectTaggingCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetObjectTaggingRequest;
            output: GetObjectTaggingOutput;
        };
        sdk: {
            input: GetObjectTaggingCommandInput;
            output: GetObjectTaggingCommandOutput;
        };
    };
}
