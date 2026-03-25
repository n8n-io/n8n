import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListMultipartUploadsOutput, ListMultipartUploadsRequest } from "../models/models_0";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListMultipartUploadsCommand}.
 */
export interface ListMultipartUploadsCommandInput extends ListMultipartUploadsRequest {
}
/**
 * @public
 *
 * The output of {@link ListMultipartUploadsCommand}.
 */
export interface ListMultipartUploadsCommandOutput extends ListMultipartUploadsOutput, __MetadataBearer {
}
declare const ListMultipartUploadsCommand_base: {
    new (input: ListMultipartUploadsCommandInput): import("@smithy/smithy-client").CommandImpl<ListMultipartUploadsCommandInput, ListMultipartUploadsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListMultipartUploadsCommandInput): import("@smithy/smithy-client").CommandImpl<ListMultipartUploadsCommandInput, ListMultipartUploadsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>This operation lists in-progress multipart uploads in a bucket. An in-progress multipart
 *          upload is a multipart upload that has been initiated by the
 *             <code>CreateMultipartUpload</code> request, but has not yet been completed or
 *          aborted.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> - If multipart uploads in
 *             a directory bucket are in progress, you can't delete the bucket until all the
 *             in-progress multipart uploads are aborted or completed. To delete these in-progress
 *             multipart uploads, use the <code>ListMultipartUploads</code> operation to list the
 *             in-progress multipart uploads in the bucket and use the
 *                <code>AbortMultipartUpload</code> operation to abort all the in-progress multipart
 *             uploads. </p>
 *          </note>
 *          <p>The <code>ListMultipartUploads</code> operation returns a maximum of 1,000 multipart
 *          uploads in the response. The limit of 1,000 multipart uploads is also the default value.
 *          You can further limit the number of uploads in a response by specifying the
 *             <code>max-uploads</code> request parameter. If there are more than 1,000 multipart
 *          uploads that satisfy your <code>ListMultipartUploads</code> request, the response returns
 *          an <code>IsTruncated</code> element with the value of <code>true</code>, a
 *             <code>NextKeyMarker</code> element, and a <code>NextUploadIdMarker</code> element. To
 *          list the remaining multipart uploads, you need to make subsequent
 *             <code>ListMultipartUploads</code> requests. In these requests, include two query
 *          parameters: <code>key-marker</code> and <code>upload-id-marker</code>. Set the value of
 *             <code>key-marker</code> to the <code>NextKeyMarker</code> value from the previous
 *          response. Similarly, set the value of <code>upload-id-marker</code> to the
 *             <code>NextUploadIdMarker</code> value from the previous response.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> - The
 *                <code>upload-id-marker</code> element and the <code>NextUploadIdMarker</code> element
 *             aren't supported by directory buckets. To list the additional multipart uploads, you
 *             only need to set the value of <code>key-marker</code> to the <code>NextKeyMarker</code>
 *             value from the previous response. </p>
 *          </note>
 *          <p>For more information about multipart uploads, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/uploadobjusingmpu.html">Uploading Objects Using Multipart
 *             Upload</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <note>
 *             <p>
 *                <b>Directory buckets</b> -
 *             For directory buckets, you must make requests for this API operation to the Zonal endpoint. These endpoints support virtual-hosted-style requests in the format <code>https://<i>amzn-s3-demo-bucket</i>.s3express-<i>zone-id</i>.<i>region-code</i>.amazonaws.com/<i>key-name</i>
 *                </code>. Path-style requests are not supported. For more information about endpoints in Availability Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/endpoint-directory-buckets-AZ.html">Regional and Zonal endpoints for directory buckets in Availability Zones</a> in the
 *     <i>Amazon S3 User Guide</i>. For more information about endpoints in Local Zones, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-lzs-for-directory-buckets.html">Concepts for directory buckets in Local Zones</a> in the
 *     <i>Amazon S3 User Guide</i>.</p>
 *          </note>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket permissions</b> - For
 *                         information about permissions required to use the multipart upload API, see
 *                            <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuAndPermissions.html">Multipart Upload and
 *                            Permissions</a> in the <i>Amazon S3 User Guide</i>.</p>
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
 *             <dt>Sorting of multipart uploads in response</dt>
 *             <dd>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <b>General purpose bucket</b> - In the
 *                            <code>ListMultipartUploads</code> response, the multipart uploads are
 *                         sorted based on two criteria:</p>
 *                      <ul>
 *                         <li>
 *                            <p>Key-based sorting - Multipart uploads are initially sorted
 *                               in ascending order based on their object keys.</p>
 *                         </li>
 *                         <li>
 *                            <p>Time-based sorting - For uploads that share the same object
 *                               key, they are further sorted in ascending order based on the upload
 *                               initiation time. Among uploads with the same key, the one that was
 *                               initiated first will appear before the ones that were initiated
 *                               later.</p>
 *                         </li>
 *                      </ul>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <b>Directory bucket</b> - In the
 *                            <code>ListMultipartUploads</code> response, the multipart uploads aren't
 *                         sorted lexicographically based on the object keys.
 *
 *                      </p>
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
 *          <p>The following operations are related to <code>ListMultipartUploads</code>:</p>
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
 * import { S3Client, ListMultipartUploadsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, ListMultipartUploadsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // ListMultipartUploadsRequest
 *   Bucket: "STRING_VALUE", // required
 *   Delimiter: "STRING_VALUE",
 *   EncodingType: "url",
 *   KeyMarker: "STRING_VALUE",
 *   MaxUploads: Number("int"),
 *   Prefix: "STRING_VALUE",
 *   UploadIdMarker: "STRING_VALUE",
 *   ExpectedBucketOwner: "STRING_VALUE",
 *   RequestPayer: "requester",
 * };
 * const command = new ListMultipartUploadsCommand(input);
 * const response = await client.send(command);
 * // { // ListMultipartUploadsOutput
 * //   Bucket: "STRING_VALUE",
 * //   KeyMarker: "STRING_VALUE",
 * //   UploadIdMarker: "STRING_VALUE",
 * //   NextKeyMarker: "STRING_VALUE",
 * //   Prefix: "STRING_VALUE",
 * //   Delimiter: "STRING_VALUE",
 * //   NextUploadIdMarker: "STRING_VALUE",
 * //   MaxUploads: Number("int"),
 * //   IsTruncated: true || false,
 * //   Uploads: [ // MultipartUploadList
 * //     { // MultipartUpload
 * //       UploadId: "STRING_VALUE",
 * //       Key: "STRING_VALUE",
 * //       Initiated: new Date("TIMESTAMP"),
 * //       StorageClass: "STANDARD" || "REDUCED_REDUNDANCY" || "STANDARD_IA" || "ONEZONE_IA" || "INTELLIGENT_TIERING" || "GLACIER" || "DEEP_ARCHIVE" || "OUTPOSTS" || "GLACIER_IR" || "SNOW" || "EXPRESS_ONEZONE",
 * //       Owner: { // Owner
 * //         DisplayName: "STRING_VALUE",
 * //         ID: "STRING_VALUE",
 * //       },
 * //       Initiator: { // Initiator
 * //         ID: "STRING_VALUE",
 * //         DisplayName: "STRING_VALUE",
 * //       },
 * //       ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 * //       ChecksumType: "COMPOSITE" || "FULL_OBJECT",
 * //     },
 * //   ],
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
 * @param ListMultipartUploadsCommandInput - {@link ListMultipartUploadsCommandInput}
 * @returns {@link ListMultipartUploadsCommandOutput}
 * @see {@link ListMultipartUploadsCommandInput} for command's `input` shape.
 * @see {@link ListMultipartUploadsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example List next set of multipart uploads when previous result is truncated
 * ```javascript
 * // The following example specifies the upload-id-marker and key-marker from previous truncated response to retrieve next setup of multipart uploads.
 * const input = {
 *   Bucket: "examplebucket",
 *   KeyMarker: "nextkeyfrompreviousresponse",
 *   MaxUploads: 2,
 *   UploadIdMarker: "valuefrompreviousresponse"
 * };
 * const command = new ListMultipartUploadsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Bucket: "acl1",
 *   IsTruncated: true,
 *   KeyMarker: "",
 *   MaxUploads: 2,
 *   NextKeyMarker: "someobjectkey",
 *   NextUploadIdMarker: "examplelo91lv1iwvWpvCiJWugw2xXLPAD7Z8cJyX9.WiIRgNrdG6Ldsn.9FtS63TCl1Uf5faTB.1U5Ckcbmdw--",
 *   UploadIdMarker: "",
 *   Uploads: [
 *     {
 *       Initiated: "2014-05-01T05:40:58.000Z",
 *       Initiator: {
 *         DisplayName: "ownder-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Key: "JavaFile",
 *       Owner: {
 *         DisplayName: "mohanataws",
 *         ID: "852b113e7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       StorageClass: "STANDARD",
 *       UploadId: "gZ30jIqlUa.CInXklLQtSMJITdUnoZ1Y5GACB5UckOtspm5zbDMCkPF_qkfZzMiFZ6dksmcnqxJyIBvQMG9X9Q--"
 *     },
 *     {
 *       Initiated: "2014-05-01T05:41:27.000Z",
 *       Initiator: {
 *         DisplayName: "ownder-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Key: "JavaFile",
 *       Owner: {
 *         DisplayName: "ownder-display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       StorageClass: "STANDARD",
 *       UploadId: "b7tZSqIlo91lv1iwvWpvCiJWugw2xXLPAD7Z8cJyX9.WiIRgNrdG6Ldsn.9FtS63TCl1Uf5faTB.1U5Ckcbmdw--"
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @example To list in-progress multipart uploads on a bucket
 * ```javascript
 * // The following example lists in-progress multipart uploads on a specific bucket.
 * const input = {
 *   Bucket: "examplebucket"
 * };
 * const command = new ListMultipartUploadsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Uploads: [
 *     {
 *       Initiated: "2014-05-01T05:40:58.000Z",
 *       Initiator: {
 *         DisplayName: "display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Key: "JavaFile",
 *       Owner: {
 *         DisplayName: "display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       StorageClass: "STANDARD",
 *       UploadId: "examplelUa.CInXklLQtSMJITdUnoZ1Y5GACB5UckOtspm5zbDMCkPF_qkfZzMiFZ6dksmcnqxJyIBvQMG9X9Q--"
 *     },
 *     {
 *       Initiated: "2014-05-01T05:41:27.000Z",
 *       Initiator: {
 *         DisplayName: "display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       Key: "JavaFile",
 *       Owner: {
 *         DisplayName: "display-name",
 *         ID: "examplee7a2f25102679df27bb0ae12b3f85be6f290b936c4393484be31bebcc"
 *       },
 *       StorageClass: "STANDARD",
 *       UploadId: "examplelo91lv1iwvWpvCiJWugw2xXLPAD7Z8cJyX9.WiIRgNrdG6Ldsn.9FtS63TCl1Uf5faTB.1U5Ckcbmdw--"
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListMultipartUploadsCommand extends ListMultipartUploadsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListMultipartUploadsRequest;
            output: ListMultipartUploadsOutput;
        };
        sdk: {
            input: ListMultipartUploadsCommandInput;
            output: ListMultipartUploadsCommandOutput;
        };
    };
}
