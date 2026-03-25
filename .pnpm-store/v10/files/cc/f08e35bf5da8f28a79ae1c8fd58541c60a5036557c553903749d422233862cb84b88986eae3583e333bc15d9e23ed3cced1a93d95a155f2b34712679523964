import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListObjectsOutput, ListObjectsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListObjectsCommand}.
 */
export interface ListObjectsCommandInput extends ListObjectsRequest {
}
/**
 * @public
 *
 * The output of {@link ListObjectsCommand}.
 */
export interface ListObjectsCommandOutput extends ListObjectsOutput, __MetadataBearer {
}
declare const ListObjectsCommand_base: {
    new (input: ListObjectsCommandInput): import("@smithy/smithy-client").CommandImpl<ListObjectsCommandInput, ListObjectsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListObjectsCommandInput): import("@smithy/smithy-client").CommandImpl<ListObjectsCommandInput, ListObjectsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns some or all (up to 1,000) of the objects in a bucket. You can use the request
 *          parameters as selection criteria to return a subset of the objects in a bucket. A 200 OK
 *          response can contain valid or invalid XML. Be sure to design your application to parse the
 *          contents of the response and handle it appropriately.</p>
 *          <important>
 *             <p>This action has been revised. We recommend that you use the newer version, <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html">ListObjectsV2</a>, when developing applications. For backward compatibility,
 *             Amazon S3 continues to support <code>ListObjects</code>.</p>
 *          </important>
 *          <p>The following operations are related to <code>ListObjects</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html">ListObjectsV2</a>
 *                </p>
 *             </li>
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
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html">ListBuckets</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListObjectsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListObjectsRequest
 *   Bucket: "STRING_VALUE", // required
 *   Delimiter: "STRING_VALUE",
 *   EncodingType: "url",
 *   Marker: "STRING_VALUE",
 *   MaxKeys: Number("int"),
 *   Prefix: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   OptionalObjectAttributes: [ // OptionalObjectAttributesList
 *     "RestoreStatus",
 *   ],
 * };
 * const command = new ListObjectsCommand(input);
 * const response = await client.send(command);
 * // { // ListObjectsOutput
 * //   IsTruncated: true || false,
 * //   Marker: "STRING_VALUE",
 * //   NextMarker: "STRING_VALUE",
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
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param ListObjectsCommandInput - {@link ListObjectsCommandInput}
 * @returns {@link ListObjectsCommandOutput}
 * @see {@link ListObjectsCommandInput} for command's `input` shape.
 * @see {@link ListObjectsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link NoSuchBucket} (client fault)
 *  <p>The specified bucket does not exist.</p>
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To list objects in a bucket
 * ```javascript
 * // The following example list two objects in a bucket.
 * const input = {
 *   Bucket: "examplebucket",
 *   MaxKeys: 2
 * };
 * const command = new ListObjectsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Contents: [
 *     {
 *       ETag: `"70ee1738b6b21e2c8a43f3a5ab0eee71"`,
 *       Key: "example1.jpg",
 *       LastModified: "2014-11-21T19:40:05.000Z",
 *       Owner: {
 *         DisplayName: "myname",
 *         ID: "12345example25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Size: 11,
 *       StorageClass: "STANDARD"
 *     },
 *     {
 *       ETag: `"9c8af9a76df052144598c115ef33e511"`,
 *       Key: "example2.jpg",
 *       LastModified: "2013-11-15T01:10:49.000Z",
 *       Owner: {
 *         DisplayName: "myname",
 *         ID: "12345example25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Size: 713193,
 *       StorageClass: "STANDARD"
 *     }
 *   ],
 *   NextMarker: "eyJNYXJrZXIiOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQiOiAyfQ=="
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListObjectsCommand extends ListObjectsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListObjectsRequest;
            output: ListObjectsOutput;
        };
        sdk: {
            input: ListObjectsCommandInput;
            output: ListObjectsCommandOutput;
        };
    };
}
