import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateBucketOutput, CreateBucketRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateBucketCommand}.
 */
export interface CreateBucketCommandInput extends CreateBucketRequest {
}
/**
 * @public
 *
 * The output of {@link CreateBucketCommand}.
 */
export interface CreateBucketCommandOutput extends CreateBucketOutput, __MetadataBearer {
}
declare const CreateBucketCommand_base: {
    new (input: CreateBucketCommandInput): import("@smithy/smithy-client").CommandImpl<CreateBucketCommandInput, CreateBucketCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateBucketCommandInput): import("@smithy/smithy-client").CommandImpl<CreateBucketCommandInput, CreateBucketCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This action creates an Amazon S3 bucket. To create an Amazon S3 on Outposts bucket, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_control_CreateBucket.html">
 *                   <code>CreateBucket</code>
 *                </a>.</p>
 *          </note>
 *          <p>Creates a new S3 bucket. To create a bucket, you must set up Amazon S3 and have a valid Amazon Web Services
 *          Access Key ID to authenticate requests. Anonymous requests are never allowed to create
 *          buckets. By creating the bucket, you become the bucket owner.</p>
 *          <p>There are two types of buckets: general purpose buckets and directory buckets. For more
 *          information about these bucket types, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-buckets-s3.html">Creating, configuring, and
 *             working with Amazon S3 buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>General purpose buckets</b> - If you send your
 *                      <code>CreateBucket</code> request to the <code>s3.amazonaws.com</code> global
 *                   endpoint, the request goes to the <code>us-east-1</code> Region. So the signature
 *                   calculations in Signature Version 4 must use <code>us-east-1</code> as the Region,
 *                   even if the location constraint in the request specifies another Region where the
 *                   bucket is to be created. If you create a bucket in a Region other than US East (N.
 *                   Virginia), your application must be able to handle 307 redirect. For more
 *                   information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/VirtualHosting.html">Virtual hosting of
 *                      buckets</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets </b> - For directory buckets, you must make requests for this API operation to the Regional endpoint. These endpoints support path-style requests in the format <code>https://s3express-control.<i>region-code</i>.amazonaws.com/<i>bucket-name</i>
 *                      </code>. Virtual-hosted-style requests aren't supported.
 * For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - In
 *                         addition to the <code>s3:CreateBucket</code> permission, the following
 *                         permissions are required in a policy when your <code>CreateBucket</code>
 *                         request includes specific headers: </p>
 *                      <ul>
 *                         <li>
 *                            <p>
 *                               <b>Access control lists (ACLs)</b>
 *                               - In your <code>CreateBucket</code> request, if you specify an
 *                               access control list (ACL) and set it to <code>public-read</code>,
 *                                  <code>public-read-write</code>, <code>authenticated-read</code>, or
 *                               if you explicitly specify any other custom ACLs, both
 *                                  <code>s3:CreateBucket</code> and <code>s3:PutBucketAcl</code>
 *                               permissions are required. In your <code>CreateBucket</code> request,
 *                               if you set the ACL to <code>private</code>, or if you don't specify
 *                               any ACLs, only the <code>s3:CreateBucket</code> permission is
 *                               required. </p>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <b>Object Lock</b> - In your
 *                                  <code>CreateBucket</code> request, if you set
 *                                  <code>x-amz-bucket-object-lock-enabled</code> to true, the
 *                                  <code>s3:PutBucketObjectLockConfiguration</code> and
 *                                  <code>s3:PutBucketVersioning</code> permissions are
 *                               required.</p>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <b>S3 Object Ownership</b> - If
 *                               your <code>CreateBucket</code> request includes the
 *                                  <code>x-amz-object-ownership</code> header, then the
 *                                  <code>s3:PutBucketOwnershipControls</code> permission is
 *                               required.</p>
 *                            <important>
 *                               <p> To set an ACL on a bucket as part of a
 *                                     <code>CreateBucket</code> request, you must explicitly set S3
 *                                  Object Ownership for the bucket to a different value than the
 *                                  default, <code>BucketOwnerEnforced</code>. Additionally, if your
 *                                  desired bucket ACL grants public access, you must first create the
 *                                  bucket (without the bucket ACL) and then explicitly disable Block
 *                                  Public Access on the bucket before using <code>PutBucketAcl</code>
 *                                  to set the ACL. If you try to create a bucket with a public ACL,
 *                                  the request will fail. </p>
 *                               <p> For the majority of modern use cases in S3, we recommend that
 *                                  you keep all Block Public Access settings enabled and keep ACLs
 *                                  disabled. If you would like to share data with users outside of
 *                                  your account, you can use bucket policies as needed. For more
 *                                  information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html">Controlling ownership of objects and disabling ACLs for your
 *                                     bucket </a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html">Blocking public access to your Amazon S3 storage </a> in
 *                                  the <i>Amazon S3 User Guide</i>. </p>
 *                            </important>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <b>S3 Block Public Access</b> - If
 *                               your specific use case requires granting public access to your S3
 *                               resources, you can disable Block Public Access. Specifically, you can
 *                               create a new bucket with Block Public Access enabled, then separately
 *                               call the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeletePublicAccessBlock.html">
 *                                  <code>DeletePublicAccessBlock</code>
 *                               </a> API. To use this operation, you must have the
 *                                  <code>s3:PutBucketPublicAccessBlock</code> permission. For more
 *                               information about S3 Block Public Access, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html">Blocking public access to your Amazon S3 storage </a> in the
 *                                  <i>Amazon S3 User Guide</i>. </p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> -
 *                         You must have the <code>s3express:CreateBucket</code> permission in
 *                         an IAM identity-based policy instead of a bucket policy. Cross-account access to this API operation isn't supported. This operation can only be performed by the Amazon Web Services account that owns the resource.
 *                         For more information about directory bucket policies and permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-security-iam.html">Amazon Web Services Identity and Access Management (IAM) for S3 Express One Zone</a> in the <i>Amazon S3 User Guide</i>.</p>
 *                      <important>
 *                         <p>The permissions for ACLs, Object Lock, S3 Object Ownership, and S3
 *                            Block Public Access are not supported for directory buckets. For
 *                            directory buckets, all Block Public Access settings are enabled at the
 *                            bucket level and S3 Object Ownership is set to Bucket owner enforced
 *                            (ACLs disabled). These settings can't be modified. </p>
 *                         <p>For more information about permissions for creating and working with
 *                            directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-buckets-overview.html">Directory buckets</a> in the
 *                               <i>Amazon S3 User Guide</i>. For more information about
 *                            supported S3 features for directory buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-one-zone.html#s3-express-features">Features of S3 Express One Zone</a> in the
 *                               <i>Amazon S3 User Guide</i>.</p>
 *                      </important>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>s3express-control.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>CreateBucket</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html">PutObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html">DeleteBucket</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // CreateBucketRequest
 *   ACL: "private" || "public-read" || "public-read-write" || "authenticated-read",
 *   Bucket: "STRING_VALUE", // required
 *   CreateBucketConfiguration: { // CreateBucketConfiguration
 *     LocationConstraint: "af-south-1" || "ap-east-1" || "ap-northeast-1" || "ap-northeast-2" || "ap-northeast-3" || "ap-south-1" || "ap-south-2" || "ap-southeast-1" || "ap-southeast-2" || "ap-southeast-3" || "ap-southeast-4" || "ap-southeast-5" || "ca-central-1" || "cn-north-1" || "cn-northwest-1" || "EU" || "eu-central-1" || "eu-central-2" || "eu-north-1" || "eu-south-1" || "eu-south-2" || "eu-west-1" || "eu-west-2" || "eu-west-3" || "il-central-1" || "me-central-1" || "me-south-1" || "sa-east-1" || "us-east-2" || "us-gov-east-1" || "us-gov-west-1" || "us-west-1" || "us-west-2",
 *     Location: { // LocationInfo
 *       Type: "AvailabilityZone" || "LocalZone",
 *       Name: "STRING_VALUE",
 *     },
 *     Bucket: { // BucketInfo
 *       DataRedundancy: "SingleAvailabilityZone" || "SingleLocalZone",
 *       Type: "Directory",
 *     },
 *   },
 *   GrantFullControl: "STRING_VALUE",
 *   GrantRead: "STRING_VALUE",
 *   GrantReadACP: "STRING_VALUE",
 *   GrantWrite: "STRING_VALUE",
 *   GrantWriteACP: "STRING_VALUE",
 *   ObjectLockEnabledForBucket: true || false,
 *   ObjectOwnership: "BucketOwnerPreferred" || "ObjectWriter" || "BucketOwnerEnforced",
 * };
 * const command = new CreateBucketCommand(input);
 * const response = await client.send(command);
 * // { // CreateBucketOutput
 * //   Location: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateBucketCommandInput - {@link CreateBucketCommandInput}
 * @returns {@link CreateBucketCommandOutput}
 * @see {@link CreateBucketCommandInput} for command's `input` shape.
 * @see {@link CreateBucketCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link BucketAlreadyExists} (client fault)
 *  <p>The requested bucket name is not available. The bucket namespace is shared by all users
 *          of the system. Select a different name and try again.</p>
 *
 * @throws {@link BucketAlreadyOwnedByYou} (client fault)
 *  <p>The bucket you tried to create already exists, and you own it. Amazon S3 returns this error
 *          in all Amazon Web Services Regions except in the North Virginia Region. For legacy compatibility, if you
 *          re-create an existing bucket that you already own in the North Virginia Region, Amazon S3
 *          returns 200 OK and resets the bucket access control lists (ACLs).</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To create a bucket in a specific region
 * ```javascript
 * // The following example creates a bucket. The request specifies an AWS region where to create the bucket.
 * const input = {
 *   Bucket: "examplebucket",
 *   CreateBucketConfiguration: {
 *     LocationConstraint: "eu-west-1"
 *   }
 * };
 * const command = new CreateBucketCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Location: "http://examplebucket.<Region>.s3.amazonaws.com/"
 * }
 * *\/
 * ```
 *
 * @example To create a bucket
 * ```javascript
 * // The following example creates a bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new CreateBucketCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Location: "/examplebucket"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class CreateBucketCommand extends CreateBucketCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateBucketRequest;
            output: CreateBucketOutput;
        };
        sdk: {
            input: CreateBucketCommandInput;
            output: CreateBucketCommandOutput;
        };
    };
}
