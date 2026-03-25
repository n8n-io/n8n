import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListObjectVersionsOutput, ListObjectVersionsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListObjectVersionsCommand}.
 */
export interface ListObjectVersionsCommandInput extends ListObjectVersionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListObjectVersionsCommand}.
 */
export interface ListObjectVersionsCommandOutput extends ListObjectVersionsOutput, __MetadataBearer {
}
declare const ListObjectVersionsCommand_base: {
    new (input: ListObjectVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListObjectVersionsCommandInput, ListObjectVersionsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListObjectVersionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListObjectVersionsCommandInput, ListObjectVersionsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns metadata about all versions of the objects in a bucket. You can also use request
 *          parameters as selection criteria to return metadata about a subset of all the object
 *          versions.</p>
 *          <important>
 *             <p> To use this operation, you must have permission to perform the
 *                <code>s3:ListBucketVersions</code> action. Be aware of the name difference. </p>
 *          </important>
 *          <note>
 *             <p> A <code>200 OK</code> response can contain valid or invalid XML. Make sure to design
 *             your application to parse the contents of the response and handle it
 *             appropriately.</p>
 *          </note>
 *          <p>To use this operation, you must have READ access to the bucket.</p>
 *          <p>The following operations are related to <code>ListObjectVersions</code>:</p>
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
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html">DeleteObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, ListObjectVersionsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListObjectVersionsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListObjectVersionsRequest
 *   Bucket: "STRING_VALUE", // required
 *   Delimiter: "STRING_VALUE",
 *   EncodingType: "url",
 *   KeyMarker: "STRING_VALUE",
 *   MaxKeys: Number("int"),
 *   Prefix: "STRING_VALUE",
 *   VersionIdMarker: "STRING_VALUE",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   RequestPayer: "requester",
 *   OptionalObjectAttributes: [ // OptionalObjectAttributesList
 *     "RestoreStatus",
 *   ],
 * };
 * const command = new ListObjectVersionsCommand(input);
 * const response = await client.send(command);
 * // { // ListObjectVersionsOutput
 * //   IsTruncated: true || false,
 * //   KeyMarker: "STRING_VALUE",
 * //   VersionIdMarker: "STRING_VALUE",
 * //   NextKeyMarker: "STRING_VALUE",
 * //   NextVersionIdMarker: "STRING_VALUE",
 * //   Versions: [ // ObjectVersionList
 * //     { // ObjectVersion
 * //       ETag: "STRING_VALUE",
 * //       ChecksumAlgorithm: [ // ChecksumAlgorithmList
 * //         "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * //       ],
 * //       ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //       Size: Number("long"),
 * //       StorageClass: "STANDARD",
 * //       Key: "STRING_VALUE",
 * //       VersionId: "STRING_VALUE",
 * //       IsLatest: true || false,
 * //       LastModified: new Date("TIMESTAMP"),
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
 * //   DeleteMarkers: [ // DeleteMarkers
 * //     { // DeleteMarkerEntry
 * //       Owner: {
 * //         DisplayName: "STRING_VALUE",
 * //         ID: "STRING_VALUE",
 * //       },
 * //       Key: "STRING_VALUE",
 * //       VersionId: "STRING_VALUE",
 * //       IsLatest: true || false,
 * //       LastModified: new Date("TIMESTAMP"),
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
 * @param ListObjectVersionsCommandInput - {@link ListObjectVersionsCommandInput}
 * @returns {@link ListObjectVersionsCommandOutput}
 * @see {@link ListObjectVersionsCommandInput} for command's `input` shape.
 * @see {@link ListObjectVersionsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To list object versions
 * ```javascript
 * // The following example returns versions of an object with specific key name prefix.
 * const input = {
 *   Bucket: "examplebucket",
 *   Prefix: "HappyFace.jpg"
 * };
 * const command = new ListObjectVersionsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Versions: [
 *     {
 *       ETag: `"6805f2cfc46c0f04559748bb039d69ae"`,
 *       IsLatest: true,
 *       Key: "HappyFace.jpg",
 *       LastModified: "2016-12-15T01:19:41.000Z",
 *       Owner: {
 *         DisplayName: "owner-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Size: 3191,
 *       StorageClass: "STANDARD",
 *       VersionId: "null"
 *     },
 *     {
 *       ETag: `"6805f2cfc46c0f04559748bb039d69ae"`,
 *       IsLatest: false,
 *       Key: "HappyFace.jpg",
 *       LastModified: "2016-12-13T00:58:26.000Z",
 *       Owner: {
 *         DisplayName: "owner-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Size: 3191,
 *       StorageClass: "STANDARD",
 *       VersionId: "PHtexPGjH2y.zBgT8LmB7wwLI2mpbz.k"
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListObjectVersionsCommand extends ListObjectVersionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListObjectVersionsRequest;
            output: ListObjectVersionsOutput;
        };
        sdk: {
            input: ListObjectVersionsCommandInput;
            output: ListObjectVersionsCommandOutput;
        };
    };
}
