import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListObjectsV2Output, ListObjectsV2Request } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListObjectsV2Command}.
 */
export interface ListObjectsV2CommandInput extends ListObjectsV2Request {
}
/**
 * @public
 *
 * The output of {@link ListObjectsV2Command}.
 */
export interface ListObjectsV2CommandOutput extends ListObjectsV2Output, __MetadataBearer {
}
declare const ListObjectsV2Command_base: {
    new (input: ListObjectsV2CommandInput): import("@smithy/smithy-client").CommandImpl<ListObjectsV2CommandInput, ListObjectsV2CommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListObjectsV2CommandInput): import("@smithy/smithy-client").CommandImpl<ListObjectsV2CommandInput, ListObjectsV2CommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns some or all (up to 1,000) of the objects in a bucket with each request. You can
 *          use the request parameters as selection criteria to return a subset of the objects in a
 *          bucket. A <code>200 OK</code> response can contain valid or invalid XML. Make sure to
 *          design your application to parse the contents of the response and handle it appropriately.
 *          For more information about listing objects, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/ListingKeysUsingAPIs.html">Listing object keys
 *             programmatically</a> in the <i>Amazon S3 User Guide</i>. To get a list of
 *          your buckets, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html">ListBuckets</a>.</p>
 *          <note>
 *             <ul>
 *                <li>
 *                   <p>
 *                      <b>General purpose bucket</b> - For general purpose buckets,
 *                      <code>ListObjectsV2</code> doesn't return prefixes that are related only to
 *                   in-progress multipart uploads.</p>
 *                </li>
 *                <li>
 *                   <p>
 *                      <b>Directory buckets</b> - For
 *                   directory buckets, <code>ListObjectsV2</code> response includes the prefixes that
 *                   are related only to in-progress multipart uploads. </p>
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
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - To
 *                         use this operation, you must have READ access to the bucket. You must have
 *                         permission to perform the <code>s3:ListBucket</code> action. The bucket
 *                         owner has this permission by default and can grant this permission to
 *                         others. For more information about permissions, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html#using-with-s3-actions-related-to-bucket-subresources">Permissions Related to Bucket Subresource Operations</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-access-control.html">Managing Access
 *                            Permissions to Your Amazon S3 Resources</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
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
 *             <dt>Sorting order of returned objects</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket</b> - For
 *                         general purpose buckets, <code>ListObjectsV2</code> returns objects in
 *                         lexicographical order based on their key names.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket</b> - For
 *                         directory buckets, <code>ListObjectsV2</code> does not return objects in
 *                         lexicographical order.</p>
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
 *          <important>
 *             <p>This section describes the latest revision of this action. We recommend that you use
 *             this revised API operation for application development. For backward compatibility, Amazon S3
 *             continues to support the prior version of this API operation, <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjects.html">ListObjects</a>.</p>
 *          </important>
 *          <p>The following operations are related to <code>ListObjectsV2</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html">PutObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html">CreateBucket</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListObjectsV2Request
 *   Bucket: "STRING_VALUE", // required
 *   Delimiter: "STRING_VALUE",
 *   EncodingType: "url",
 *   MaxKeys: Number("int"),
 *   Prefix: "STRING_VALUE",
 *   ContinuationToken: "STRING_VALUE",
 *   FetchOwner: true || false,
 *   StartAfter: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   OptionalObjectAttributes: [ // OptionalObjectAttributesList
 *     "RestoreStatus",
 *   ],
 * };
 * const command = new ListObjectsV2Command(input);
 * const response = await client.send(command);
 * // { // ListObjectsV2Output
 * //   IsTruncated: true || false,
 * //   Contents: [ // ObjectList
 * //     { // Object
 * //       Key: "STRING_VALUE",
 * //       LastModified: new Date("TIMESTAMP"),
 * //       ETag: "STRING_VALUE",
 * //       ChecksumAlgorithm: [ // ChecksumAlgorithmList
 * //         "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * //       ],
 * //       ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //       Size: Number("long"),
 * //       StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "GLACIER" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 * //       Owner: { // Owner
 * //         DisplayName: "STRING_VALUE",
 * //         ID: "STRING_VALUE",
 * //       },
 * //       RestoreStatus: { // RestoreStatus
 * //         IsRestoreInProgress: true || false,
 * //         RestoreExpiryDate: new Date("TIMESTAMP"),
 * //       },
 * //     },
 * //   ],
 * //   Name: "STRING_VALUE",
 * //   Prefix: "STRING_VALUE",
 * //   Delimiter: "STRING_VALUE",
 * //   MaxKeys: Number("int"),
 * //   CommonPrefixes: [ // CommonPrefixList
 * //     { // CommonPrefix
 * //       Prefix: "STRING_VALUE",
 * //     },
 * //   ],
 * //   EncodingType: "url",
 * //   KeyCount: Number("int"),
 * //   ContinuationToken: "STRING_VALUE",
 * //   NextContinuationToken: "STRING_VALUE",
 * //   StartAfter: "STRING_VALUE",
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param ListObjectsV2CommandInput - {@link ListObjectsV2CommandInput}
 * @returns {@link ListObjectsV2CommandOutput}
 * @see {@link ListObjectsV2CommandInput} for command's `input` shape.
 * @see {@link ListObjectsV2CommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NoSuchBucket} (client fault)
 *  <p>The specified bucket does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To get object list
 * ```javascript
 * // The following example retrieves object list. The request specifies max keys to limit response to include only 2 object keys.
 * const input = {
 *   Bucket: "DOC-EXAMPLE-BUCKET",
 *   MaxKeys: 2
 * };
 * const command = new ListObjectsV2Command(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Contents: [
 *     {
 *       ETag: `"70ee1738b6b21e2c8a43f3a5ab0eee71"`,
 *       Key: "happyface.jpg",
 *       LastModified: "2014-11-21T19:40:05.000Z",
 *       Size: 11,
 *       StorageClass: "STANDARD"
 *     },
 *     {
 *       ETag: `"becf17f89c30367a9a44495d62ed521a-1"`,
 *       Key: "test.jpg",
 *       LastModified: "2014-05-02T04:51:50.000Z",
 *       Size: 4192256,
 *       StorageClass: "STANDARD"
 *     }
 *   ],
 *   IsTruncated: true,
 *   KeyCount: 2,
 *   MaxKeys: 2,
 *   Name: "DOC-EXAMPLE-BUCKET",
 *   NextContinuationToken: "1w41l63U0xa8q7smH50vCxyTQqdxo69O3EmK28Bi5PcROI4wI/EyIJg==",
 *   Prefix: ""
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListObjectsV2Command extends ListObjectsV2Command_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListObjectsV2Request;
            output: ListObjectsV2Output;
        };
        sdk: {
            input: ListObjectsV2CommandInput;
            output: ListObjectsV2CommandOutput;
        };
    };
}
