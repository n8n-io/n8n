import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DeleteObjectsOutput, DeleteObjectsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteObjectsCommand}.
 */
export interface DeleteObjectsCommandInput extends DeleteObjectsRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteObjectsCommand}.
 */
export interface DeleteObjectsCommandOutput extends DeleteObjectsOutput, __MetadataBearer {
}
declare const DeleteObjectsCommand_base: {
    new (input: DeleteObjectsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteObjectsCommandInput, DeleteObjectsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteObjectsCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteObjectsCommandInput, DeleteObjectsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>This operation enables you to delete multiple objects from a bucket using a single HTTP
 *          request. If you know the object keys that you want to delete, then this operation provides
 *          a suitable alternative to sending individual delete requests, reducing per-request
 *          overhead.</p>
 *          <p>The request can contain a list of up to 1,000 keys that you want to delete. In the XML, you
 *          provide the object key names, and optionally, version IDs if you want to delete a specific
 *          version of the object from a versioning-enabled bucket. For each key, Amazon S3 performs a
 *          delete operation and returns the result of that delete, success or failure, in the response.
 *          If the object specified in the request isn't found, Amazon S3 confirms the deletion by returning the result as deleted.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   S3 Versioning isn't enabled and supported for directory buckets.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> -
 *                   For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                      </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *                </li>
 *             </ul>
 *          </note>
 *          <p>The operation supports two modes for the response: verbose and quiet. By default, the
 *          operation uses verbose mode in which the response includes the result of deletion of each
 *          key in your request. In quiet mode the response includes only keys where the delete
 *          operation encountered an error. For a successful deletion in a quiet mode, the operation
 *          does not return any information about the delete in the response body.</p>
 *          <p>When performing this action on an MFA Delete enabled bucket, that attempts to delete any
 *          versioned objects, you must include an MFA token. If you do not provide one, the entire
 *          request will fail, even if there are non-versioned objects you are trying to delete. If you
 *          provide an invalid token, whether there are versioned keys in the request or not, the
 *          entire Multi-Object Delete request will fail. For information about MFA Delete, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/Versioning.html#MultiFactorAuthenticationDelete">MFA
 *             Delete</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> -
 *             MFA delete is not supported by directory buckets.</p>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - The
 *                         following permissions are required in your policies when your
 *                            <code>DeleteObjects</code> request includes specific headers.</p>
 *                      <ul>
 *                         <li>
 *                            <p>
 *                               <b>
 *                                  <code>s3:DeleteObject</code>
 *                               </b>
 *                               - To delete an object from a bucket, you must always specify
 *                               the <code>s3:DeleteObject</code> permission.</p>
 *                         </li>
 *                         <li>
 *                            <p>
 *                               <b>
 *                                  <code>s3:DeleteObjectVersion</code>
 *                               </b> - To delete a specific version of an object from a
 *                               versioning-enabled bucket, you must specify the
 *                                  <code>s3:DeleteObjectVersion</code> permission.</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket permissions</b> - To grant access to this API operation on a directory bucket, we recommend that you use the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">
 *                            <code>CreateSession</code>
 *                         </a> API operation for session-based authorization. Specifically, you grant the <code>s3express:CreateSession</code> permission to the directory bucket in a bucket policy or an IAM identity-based policy. Then, you make the <code>CreateSession</code> API call on the bucket to obtain a session token. With the session token in your request header, you can make API requests to this operation. After the session token expires, you make another <code>CreateSession</code> API call to generate a new session token for use.
 * Amazon Web Services CLI or SDKs create session and refresh the session token automatically to avoid service interruptions when a session expires. For more information about authorization, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateSession.html">
 *                            <code>CreateSession</code>
 *                         </a>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Content-MD5 request header</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket</b> - The Content-MD5
 *                         request header is required for all Multi-Object Delete requests. Amazon S3 uses
 *                         the header value to ensure that your request body has not been altered in
 *                         transit.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket</b> - The
 *                         Content-MD5 request header or a additional checksum request header
 *                         (including <code>x-amz-checksum-crc32</code>,
 *                            <code>x-amz-checksum-crc32c</code>, <code>x-amz-checksum-sha1</code>, or
 *                            <code>x-amz-checksum-sha256</code>) is required for all Multi-Object
 *                         Delete requests.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>HTTP Host header syntax</dt>
 *             <dd>
 *                <p>
 *                   <b>Directory buckets </b> - The HTTP Host header syntax is <code>
 *                      <i>Bucket-name</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com</code>.</p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>DeleteObjects</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateMultipartUpload.html">CreateMultipartUpload</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html">UploadPart</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CompleteMultipartUpload.html">CompleteMultipartUpload</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListParts.html">ListParts</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_AbortMultipartUpload.html">AbortMultipartUpload</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, DeleteObjectsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // DeleteObjectsRequest
 *   Bucket: "STRING_VALUE", // required
 *   Delete: { // Delete
 *     Objects: [ // ObjectIdentifierList // required
 *       { // ObjectIdentifier
 *         Key: "STRING_VALUE", // required
 *         VersionId: "STRING_VALUE",
 *         ETag: "STRING_VALUE",
 *         LastModifiedTime: new Date("TIMESTAMP"),
 *         Size: Number("long"),
 *       },
 *     ],
 *     Quiet: true || false,
 *   },
 *   MFA: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   BypassGovernanceRetention: true || false,
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * };
 * const command = new DeleteObjectsCommand(input);
 * const response = await client.send(command);
 * // { // DeleteObjectsOutput
 * //   Deleted: [ // DeletedObjects
 * //     { // DeletedObject
 * //       Key: "STRING_VALUE",
 * //       VersionId: "STRING_VALUE",
 * //       DeleteMarker: true || false,
 * //       DeleteMarkerVersionId: "STRING_VALUE",
 * //     },
 * //   ],
 * //   RequestCharged: "requester",
 * //   Errors: [ // Errors
 * //     { // Error
 * //       Key: "STRING_VALUE",
 * //       VersionId: "STRING_VALUE",
 * //       Code: "STRING_VALUE",
 * //       Message: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param DeleteObjectsCommandInput - {@link DeleteObjectsCommandInput}
 * @returns {@link DeleteObjectsCommandOutput}
 * @see {@link DeleteObjectsCommandInput} for command's `input` shape.
 * @see {@link DeleteObjectsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To delete multiple object versions from a versioned bucket
 * ```javascript
 * // The following example deletes objects from a bucket. The request specifies object versions. S3 deletes specific object versions and returns the key and versions of deleted objects in the response.
 * const input = {
 *   Bucket: "examplebucket",
 *   Delete: {
 *     Objects: [
 *       {
 *         Key: "HappyFace.jpg",
 *         VersionId: "2LWg7lQLnY41.maGB5Z6SWW.dcq0vx7b"
 *       },
 *       {
 *         Key: "HappyFace.jpg",
 *         VersionId: "yoz3HB.ZhCS_tKVEmIOr7qYyyAaZSKVd"
 *       }
 *     ],
 *     Quiet: false
 *   }
 * };
 * const command = new DeleteObjectsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Deleted: [
 *     {
 *       Key: "HappyFace.jpg",
 *       VersionId: "yoz3HB.ZhCS_tKVEmIOr7qYyyAaZSKVd"
 *     },
 *     {
 *       Key: "HappyFace.jpg",
 *       VersionId: "2LWg7lQLnY41.maGB5Z6SWW.dcq0vx7b"
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @example To delete multiple objects from a versioned bucket
 * ```javascript
 * // The following example deletes objects from a bucket. The bucket is versioned, and the request does not specify the object version to delete. In this case, all versions remain in the bucket and S3 adds a delete marker.
 * const input = {
 *   Bucket: "examplebucket",
 *   Delete: {
 *     Objects: [
 *       {
 *         Key: "objectkey1"
 *       },
 *       {
 *         Key: "objectkey2"
 *       }
 *     ],
 *     Quiet: false
 *   }
 * };
 * const command = new DeleteObjectsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Deleted: [
 *     {
 *       DeleteMarker: true,
 *       DeleteMarkerVersionId: "A._w1z6EFiCF5uhtQMDal9JDkID9tQ7F",
 *       Key: "objectkey1"
 *     },
 *     {
 *       DeleteMarker: true,
 *       DeleteMarkerVersionId: "iOd_ORxhkKe_e8G8_oSGxt2PjsCZKlkt",
 *       Key: "objectkey2"
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class DeleteObjectsCommand extends DeleteObjectsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteObjectsRequest;
            output: DeleteObjectsOutput;
        };
        sdk: {
            input: DeleteObjectsCommandInput;
            output: DeleteObjectsCommandOutput;
        };
    };
}
