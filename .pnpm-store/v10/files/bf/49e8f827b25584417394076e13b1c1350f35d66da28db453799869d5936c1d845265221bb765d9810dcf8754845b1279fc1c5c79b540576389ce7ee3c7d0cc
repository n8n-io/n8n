import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetObjectAclOutput, GetObjectAclRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetObjectAclCommand}.
 */
export interface GetObjectAclCommandInput extends GetObjectAclRequest {
}
/**
 * @public
 *
 * The output of {@link GetObjectAclCommand}.
 */
export interface GetObjectAclCommandOutput extends GetObjectAclOutput, __MetadataBearer {
}
declare const GetObjectAclCommand_base: {
    new (input: GetObjectAclCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectAclCommandInput, GetObjectAclCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetObjectAclCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectAclCommandInput, GetObjectAclCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns the access control list (ACL) of an object. To use this operation, you must have
 *             <code>s3:GetObjectAcl</code> permissions or <code>READ_ACP</code> access to the object.
 *          For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/acl-overview.html#acl-access-policy-permission-mapping">Mapping of ACL permissions and access policy permissions</a> in the <i>Amazon S3
 *             User Guide</i>
 *          </p>
 *          <p>This functionality is not supported for Amazon S3 on Outposts.</p>
 *          <p>By default, GET returns ACL information about the current version of an object. To
 *          return ACL information about a different version, use the versionId subresource.</p>
 *          <note>
 *             <p>If your bucket uses the bucket owner enforced setting for S3 Object Ownership,
 *             requests to read ACLs are still supported and return the
 *                <code>bucket-owner-full-control</code> ACL with the owner being the account that
 *             created the bucket. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html"> Controlling object
 *                ownership and disabling ACLs</a> in the
 *             <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <p>The following operations are related to <code>GetObjectAcl</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObjectAttributes.html">GetObjectAttributes</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html">DeleteObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html">PutObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetObjectAclCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetObjectAclCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetObjectAclRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   VersionId: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetObjectAclCommand(input);
 * const response = await client.send(command);
 * // { // GetObjectAclOutput
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
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param GetObjectAclCommandInput - {@link GetObjectAclCommandInput}
 * @returns {@link GetObjectAclCommandOutput}
 * @see {@link GetObjectAclCommandInput} for command's `input` shape.
 * @see {@link GetObjectAclCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NoSuchKey} (client fault)
 *  <p>The specified key does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To retrieve object ACL
 * ```javascript
 * // The following example retrieves access control list (ACL) of an object.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new GetObjectAclCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Grants: [
 *     {
 *       Grantee: {
 *         DisplayName: "owner-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc",
 *         Type: "CanonicalUser"
 *       },
 *       Permission: "WRITE"
 *     },
 *     {
 *       Grantee: {
 *         DisplayName: "owner-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc",
 *         Type: "CanonicalUser"
 *       },
 *       Permission: "WRITE_ACP"
 *     },
 *     {
 *       Grantee: {
 *         DisplayName: "owner-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc",
 *         Type: "CanonicalUser"
 *       },
 *       Permission: "READ"
 *     },
 *     {
 *       Grantee: {
 *         DisplayName: "owner-display-name",
 *         ID: "852b113eexamplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc",
 *         Type: "CanonicalUser"
 *       },
 *       Permission: "READ_ACP"
 *     }
 *   ],
 *   Owner: {
 *     DisplayName: "owner-display-name",
 *     ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *   }
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetObjectAclCommand extends GetObjectAclCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetObjectAclRequest;
            output: GetObjectAclOutput;
        };
        sdk: {
            input: GetObjectAclCommandInput;
            output: GetObjectAclCommandOutput;
        };
    };
}
