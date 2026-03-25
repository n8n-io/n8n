import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer, StreamingBlobPayloadOutputTypes } from "@smithy/types";
import { GetObjectTorrentOutput, GetObjectTorrentRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetObjectTorrentCommand}.
 */
export interface GetObjectTorrentCommandInput extends GetObjectTorrentRequest {
}
/**
 * @public
 *
 * The output of {@link GetObjectTorrentCommand}.
 */
export interface GetObjectTorrentCommandOutput extends Omit<GetObjectTorrentOutput, "Body">, __MetadataBearer {
    Body?: StreamingBlobPayloadOutputTypes;
}
declare const GetObjectTorrentCommand_base: {
    new (input: GetObjectTorrentCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectTorrentCommandInput, GetObjectTorrentCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetObjectTorrentCommandInput): import("@smithy/smithy-client").CommandImpl<GetObjectTorrentCommandInput, GetObjectTorrentCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Returns torrent files from a bucket. BitTorrent can save you bandwidth when you're
 *          distributing large files.</p>
 *          <note>
 *             <p>You can get torrent only for objects that are less than 5 GB in size, and that are
 *             not encrypted using server-side encryption with a customer-provided encryption
 *             key.</p>
 *          </note>
 *          <p>To use GET, you must have READ access to the object.</p>
 *          <p>This functionality is not supported for Amazon S3 on Outposts.</p>
 *          <p>The following action is related to <code>GetObjectTorrent</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, GetObjectTorrentCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, GetObjectTorrentCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // GetObjectTorrentRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   RequestPayer: "requester",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new GetObjectTorrentCommand(input);
 * const response = await client.send(command);
 * // consume or destroy the stream to free the socket.
 * const bytes = await response.Body.transformToByteArray();
 * // const str = await response.Body.transformToString();
 * // response.Body.destroy(); // only applicable to Node.js Readable streams.
 *
 * // { // GetObjectTorrentOutput
 * //   Body: "<SdkStream>", // see \@smithy/types -> StreamingBlobPayloadOutputTypes
 * //   RequestCharged: "requester",
 * // };
 *
 * ```
 *
 * @param GetObjectTorrentCommandInput - {@link GetObjectTorrentCommandInput}
 * @returns {@link GetObjectTorrentCommandOutput}
 * @see {@link GetObjectTorrentCommandInput} for command's `input` shape.
 * @see {@link GetObjectTorrentCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To retrieve torrent files for an object
 * ```javascript
 * // The following example retrieves torrent files of an object.
 * const input = {
 *   Bucket: "examplebucket",
 *   Key: "HappyFace.jpg"
 * };
 * const command = new GetObjectTorrentCommand(input);
 * const response = await client.send(command);
 * // consume or destroy the stream to free the socket.
 * const bytes = await response.Body.transformToByteArray();
 * // const str = await response.Body.transformToString();
 * // response.Body.destroy(); // only applicable to Node.js Readable streams.
 *
 * /* response is
 * { /* empty *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetObjectTorrentCommand extends GetObjectTorrentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetObjectTorrentRequest;
            output: GetObjectTorrentOutput;
        };
        sdk: {
            input: GetObjectTorrentCommandInput;
            output: GetObjectTorrentCommandOutput;
        };
    };
}
