import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetBucketAclOutput, GetBucketAclRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetBucketAclCommand}.
 */
export interface GetBucketAclCommandInput extends GetBucketAclRequest {
}
/**
 * @public
 *
 * The output of {@link GetBucketAclCommand}.
 */
export interface GetBucketAclCommandOutput extends GetBucketAclOutput, __MetadataBearer {
}
declare const GetBucketAclCommand_base: {
    new (input: GetBucketAclCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketAclCommandInput, GetBucketAclCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetBucketAclCommandInput): import("@smithy/smithy-client").CommandImpl<GetBucketAclCommandInput, GetBucketAclCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>This implementation of the <code>GET</code> action uses the <code>acl</code> subresource
 *          to return the access control list (ACL) of a bucket. To use <code>GET</code> to return the
 *          ACL of the bucket, you must have the <code>READ_ACP</code> access to the bucket. If
 *             <code>READ_ACP</code> permission is granted to the anonymous user, you can return the
 *          ACL of the bucket without using an authorization header.</p>
 *          <p>When you use this API operation with an access point, provide the alias of the access point in place of the bucket name.</p>
 *          <p>When you use this API operation with an Object Lambda access point, provide the alias of the Object Lambda access point in place of the bucket name.
 * If the Object Lambda access point alias in a request is not valid, the error code <code>InvalidAccessPointAliasError</code> is returned.
 * For more information about <code>InvalidAccessPointAliasError</code>, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#ErrorCodeList">List of
 *             Error Codes</a>.</p>
 *          <note>
 *             <p>If your bucket uses the bucket owner enforced setting for S3 Object Ownership,
 *             requests to read ACLs are still supported and return the
 *                <code>bucket-owner-full-control</code> ACL with the owner being the account that
 *             created the bucket. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html"> Controlling object
 *                ownership and disabling ACLs</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <p>The following operations are related to <code>GetBucketAcl</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjects.html">ListObjects</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetBucketAclCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetBucketAclCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetBucketAclRequest
 *   Bucket: "STRING_VALUE", // required
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetBucketAclCommand(input);
 * const response = await client.send(command);
 * // { // GetBucketAclOutput
 * //   Owner: { // Owner
 * //     DisplayName: "STRING_VALUE",
 * //     ID: "STRING_VALUE",
 * //   },
 * //   Grants: [ // Grants
 * //     { // Grant
 * //       Grantee: { // Grantee
 * //         DisplayName: "STRING_VALUE",
 * //         EmailAddress: "STRING_VALUE",
 * //         ID: "STRING_VALUE",
 * //         URI: "STRING_VALUE",
 * //         Type: "CanonicalUser" || "AmazonCustomerByEmail" || "Group", // required
 * //       },
 * //       Permission: "FULL_CONTROL" || "WRITE" || "WRITE_ACP" || "READ" || "READ_ACP",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param GetBucketAclCommandInput - {@link GetBucketAclCommandInput}
 * @returns {@link GetBucketAclCommandOutput}
 * @see {@link GetBucketAclCommandInput} for command's `input` shape.
 * @see {@link GetBucketAclCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class GetBucketAclCommand extends GetBucketAclCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetBucketAclRequest;
            output: GetBucketAclOutput;
        };
        sdk: {
            input: GetBucketAclCommandInput;
            output: GetBucketAclCommandOutput;
        };
    };
}
