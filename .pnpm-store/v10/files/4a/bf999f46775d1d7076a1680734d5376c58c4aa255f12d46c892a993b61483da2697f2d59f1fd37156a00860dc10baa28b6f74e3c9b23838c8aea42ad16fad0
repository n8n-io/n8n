import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutObjectAclOutput, PutObjectAclRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutObjectAclCommand}.
 */
export interface PutObjectAclCommandInput extends PutObjectAclRequest {
}
/**
 * @public
 *
 * The output of {@link PutObjectAclCommand}.
 */
export interface PutObjectAclCommandOutput extends PutObjectAclOutput, __MetadataBearer {
}
declare const PutObjectAclCommand_base: {
    new (input: PutObjectAclCommandInput): import("@smithy/smithy-client").CommandImpl<PutObjectAclCommandInput, PutObjectAclCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutObjectAclCommandInput): import("@smithy/smithy-client").CommandImpl<PutObjectAclCommandInput, PutObjectAclCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Uses the <code>acl</code> subresource to set the access control list (ACL) permissions
 *          for a new or existing object in an S3 bucket. You must have the <code>WRITE_ACP</code>
 *          permission to set the ACL of an object. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#permissions">What
 *             permissions can I grant?</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <p>This functionality is not supported for Amazon S3 on Outposts.</p>
 *          <p>Depending on your application needs, you can choose to set the ACL on an object using
 *          either the request body or the headers. For example, if you have an existing application
 *          that updates a bucket ACL using the request body, you can continue to use that approach.
 *          For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html">Access Control List (ACL) Overview</a>
 *          in the <i>Amazon S3 User Guide</i>.</p>
 *          <important>
 *             <p>If your bucket uses the bucket owner enforced setting for S3 Object Ownership, ACLs
 *             are disabled and no longer affect permissions. You must use policies to grant access to
 *             your bucket and the objects in it. Requests to set ACLs or update ACLs fail and return
 *             the <code>AccessControlListNotSupported</code> error code. Requests to read ACLs are
 *             still supported. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html">Controlling object
 *                ownership</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          </important>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>You can set access permissions using one of the following methods:</p>
 *                <ul>
 *                   <li>
 *                      <p>Specify a canned ACL with the <code>x-amz-acl</code> request header. Amazon S3
 *                         supports a set of predefined ACLs, known as canned ACLs. Each canned ACL has
 *                         a predefined set of grantees and permissions. Specify the canned ACL name as
 *                         the value of <code>x-amz-ac</code>l. If you use this header, you cannot use
 *                         other access control-specific headers in your request. For more information,
 *                         see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#CannedACL">Canned
 *                         ACL</a>.</p>
 *                   </li>
 *                   <li>
 *                      <p>Specify access permissions explicitly with the
 *                            <code>x-amz-grant-read</code>, <code>x-amz-grant-read-acp</code>,
 *                            <code>x-amz-grant-write-acp</code>, and
 *                            <code>x-amz-grant-full-control</code> headers. When using these headers,
 *                         you specify explicit access permissions and grantees (Amazon Web Services accounts or Amazon S3
 *                         groups) who will receive the permission. If you use these ACL-specific
 *                         headers, you cannot use <code>x-amz-acl</code> header to set a canned ACL.
 *                         These parameters map to the set of permissions that Amazon S3 supports in an ACL.
 *                         For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html">Access Control List (ACL)
 *                            Overview</a>.</p>
 *                      <p>You specify each grantee as a type=value pair, where the type is one of
 *                         the following:</p>
 *                      <ul>
 *                         <li>
 *                            <p>
 *                               <code>id</code> – if the value specified is the canonical user ID
 *                               of an Amazon Web Services account</p>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <code>uri</code> – if you are granting permissions to a predefined
 *                               group</p>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <code>emailAddress</code> – if the value specified is the email
 *                               address of an Amazon Web Services account</p>
 *                            <note>
 *                               <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
 *                               <ul>
 *                                  <li>
 *                                     <p>US East (N. Virginia)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>US West (N. California)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p> US West (Oregon)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p> Asia Pacific (Singapore)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>Asia Pacific (Sydney)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>Asia Pacific (Tokyo)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>Europe (Ireland)</p>
 *                                  </li>
 *                                  <li>
 *                                     <p>South America (São Paulo)</p>
 *                                  </li>
 *                               </ul>
 *                               <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
 *                            </note>
 *                         </li>
 *                      </ul>
 *                      <p>For example, the following <code>x-amz-grant-read</code> header grants
 *                         list objects permission to the two Amazon Web Services accounts identified by their email
 *                         addresses.</p>
 *                      <p>
 *                         <code>x-amz-grant-read: emailAddress="xyz@amazon.com",
 *                            emailAddress="abc@amazon.com" </code>
 *                      </p>
 *                   </li>
 *                </ul>
 *                <p>You can use either a canned ACL or specify access permissions explicitly. You
 *                   cannot do both.</p>
 *             </dd>
 *             <dt>Grantee Values</dt>
 *             <dd>
 *                <p>You can specify the person (grantee) to whom you're assigning access rights
 *                   (using request elements) in the following ways:</p>
 *                <ul>
 *                   <li>
 *                      <p>By the person's ID:</p>
 *                      <p>
 *                         <code><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 *                            xsi:type="CanonicalUser"><ID><>ID<></ID><DisplayName><>GranteesEmail<></DisplayName>
 *                            </Grantee></code>
 *                      </p>
 *                      <p>DisplayName is optional and ignored in the request.</p>
 *                   </li>
 *                   <li>
 *                      <p>By URI:</p>
 *                      <p>
 *                         <code><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 *                            xsi:type="Group"><URI><>http://acs.amazonaws.com/groups/global/AuthenticatedUsers<></URI></Grantee></code>
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>By Email address:</p>
 *                      <p>
 *                         <code><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 *                            xsi:type="AmazonCustomerByEmail"><EmailAddress><>Grantees@email.com<></EmailAddress>lt;/Grantee></code>
 *                      </p>
 *                      <p>The grantee is resolved to the CanonicalUser and, in a response to a GET
 *                         Object acl request, appears as the CanonicalUser.</p>
 *                      <note>
 *                         <p>Using email addresses to specify a grantee is only supported in the following Amazon Web Services Regions: </p>
 *                         <ul>
 *                            <li>
 *                               <p>US East (N. Virginia)</p>
 *                            </li>
 *                            <li>
 *                               <p>US West (N. California)</p>
 *                            </li>
 *                            <li>
 *                               <p> US West (Oregon)</p>
 *                            </li>
 *                            <li>
 *                               <p> Asia Pacific (Singapore)</p>
 *                            </li>
 *                            <li>
 *                               <p>Asia Pacific (Sydney)</p>
 *                            </li>
 *                            <li>
 *                               <p>Asia Pacific (Tokyo)</p>
 *                            </li>
 *                            <li>
 *                               <p>Europe (Ireland)</p>
 *                            </li>
 *                            <li>
 *                               <p>South America (São Paulo)</p>
 *                            </li>
 *                         </ul>
 *                         <p>For a list of all the Amazon S3 supported Regions and endpoints, see <a href="https://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region">Regions and Endpoints</a> in the Amazon Web Services General Reference.</p>
 *                      </note>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Versioning</dt>
 *             <dd>
 *                <p>The ACL of an object is set at the object version level. By default, PUT sets
 *                   the ACL of the current version of an object. To set the ACL of a different
 *                   version, use the <code>versionId</code> subresource.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>PutObjectAcl</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html">CopyObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutObjectAclCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutObjectAclCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutObjectAclRequest
 *   ACL: "private" || "public-read" || "public-read-write" || "authenticated-read" || "aws-exec-read" || "bucket-owner-read" || "bucket-owner-full-control",
 *   AccessControlPolicy: { // AccessControlPolicy
 *     Grants: [ // Grants
 *       { // Grant
 *         Grantee: { // Grantee
 *           DisplayName: "STRING_VALUE",
 *           EmailAddress: "STRING_VALUE",
 *           ID: "STRING_VALUE",
 *           URI: "STRING_VALUE",
 *           Type: "CanonicalUser" || "AmazonCustomerByEmail" || "Group", // required
 *         },
 *         Permission: "FULL_CONTROL" || "WRITE" || "WRITE_ACP" || "READ" || "READ_ACP",
 *       },
 *     ],
 *     Owner: { // Owner
 *       DisplayName: "STRING_VALUE",
 *       ID: "STRING_VALUE",
 *     },
 *   },
 *   Bucket: "STRING_VALUE", // required
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   GrantFullControl: "STRING_VALUE",
 *   GrantRead: "STRING_VALUE",
 *   GrantReadACP: "STRING_VALUE",
 *   GrantWrite: "STRING_VALUE",
 *   GrantWriteACP: "STRING_VALUE",
 *   Key: "STRING_VALUE", // required
 *   RequestPayer: "requester",
 *   VersionId: "STRING_VALUE",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutObjectAclCommand(input);
 * const response = await client.send(command);
 * // { // PutObjectAclOutput
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param PutObjectAclCommandInput - {@link PutObjectAclCommandInput}
 * @returns {@link PutObjectAclCommandOutput}
 * @see {@link PutObjectAclCommandInput} for command's `input` shape.
 * @see {@link PutObjectAclCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NoSuchKey} (client fault)
 *  <p>The specified key does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To grant permissions using object ACL
 * ```javascript
 * // The following example adds grants to an object ACL. The first permission grants user1 and user2 FULL_CONTROL and the AllUsers group READ permission.
 * const input = {
 *   AccessControlPolicy:   { /* empty *\/ },
 *   Bucket: "examplebucket",
 *   GrantFullControl: "emailaddress=user1@example.com,emailaddress=user2@example.com",
 *   GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new PutObjectAclCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* empty *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutObjectAclCommand extends PutObjectAclCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutObjectAclRequest;
            output: PutObjectAclOutput;
        };
        sdk: {
            input: PutObjectAclCommandInput;
            output: PutObjectAclCommandOutput;
        };
    };
}
