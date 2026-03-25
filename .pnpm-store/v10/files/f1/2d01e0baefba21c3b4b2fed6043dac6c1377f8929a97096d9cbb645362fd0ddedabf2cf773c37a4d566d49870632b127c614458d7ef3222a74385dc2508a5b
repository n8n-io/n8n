import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { SelectObjectContentOutput, SelectObjectContentRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SelectObjectContentCommand}.
 */
export interface SelectObjectContentCommandInput extends SelectObjectContentRequest {
}
/**
 * @public
 *
 * The output of {@link SelectObjectContentCommand}.
 */
export interface SelectObjectContentCommandOutput extends SelectObjectContentOutput, __MetadataBearer {
}
declare const SelectObjectContentCommand_base: {
    new (input: SelectObjectContentCommandInput): import("@smithy/smithy-client").CommandImpl<SelectObjectContentCommandInput, SelectObjectContentCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SelectObjectContentCommandInput): import("@smithy/smithy-client").CommandImpl<SelectObjectContentCommandInput, SelectObjectContentCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>This action filters the contents of an Amazon S3 object based on a simple structured query
 *          language (SQL) statement. In the request, along with the SQL expression, you must also
 *          specify a data serialization format (JSON, CSV, or Apache Parquet) of the object. Amazon S3 uses
 *          this format to parse object data into records, and returns only records that match the
 *          specified SQL expression. You must also specify the data serialization format for the
 *          response.</p>
 *          <p>This functionality is not supported for Amazon S3 on Outposts.</p>
 *          <p>For more information about Amazon S3 Select, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/selecting-content-from-objects.html">Selecting Content from
 *             Objects</a> and <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-glacier-select-sql-reference-select.html">SELECT
 *             Command</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <p></p>
 *          <dl>
 *             <dt>Permissions</dt>
 *             <dd>
 *                <p>You must have the <code>s3:GetObject</code> permission for this operation. Amazon S3
 *                   Select does not support anonymous access. For more information about permissions,
 *                   see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html">Specifying Permissions in
 *                      a Policy</a> in the <i>Amazon S3 User Guide</i>.</p>
 *             </dd>
 *             <dt>Object Data Formats</dt>
 *             <dd>
 *                <p>You can use Amazon S3 Select to query objects that have the following format
 *                   properties:</p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <i>CSV, JSON, and Parquet</i> - Objects must be in CSV,
 *                         JSON, or Parquet format.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>UTF-8</i> - UTF-8 is the only encoding type Amazon S3 Select
 *                         supports.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>GZIP or BZIP2</i> - CSV and JSON files can be compressed
 *                         using GZIP or BZIP2. GZIP and BZIP2 are the only compression formats that
 *                         Amazon S3 Select supports for CSV and JSON files. Amazon S3 Select supports columnar
 *                         compression for Parquet using GZIP or Snappy. Amazon S3 Select does not support
 *                         whole-object compression for Parquet objects.</p>
 *                   </li>
 *                   <li>
 *                      <p>
 *                         <i>Server-side encryption</i> - Amazon S3 Select supports
 *                         querying objects that are protected with server-side encryption.</p>
 *                      <p>For objects that are encrypted with customer-provided encryption keys
 *                         (SSE-C), you must use HTTPS, and you must use the headers that are
 *                         documented in the <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>. For more
 *                         information about SSE-C, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/ServerSideEncryptionCustomerKeys.html">Server-Side Encryption (Using Customer-Provided Encryption Keys)</a>
 *                         in the <i>Amazon S3 User Guide</i>.</p>
 *                      <p>For objects that are encrypted with Amazon S3 managed keys (SSE-S3) and
 *                         Amazon Web Services KMS keys (SSE-KMS), server-side encryption is handled transparently,
 *                         so you don't need to specify anything. For more information about
 *                         server-side encryption, including SSE-S3 and SSE-KMS, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/serv-side-encryption.html">Protecting Data Using Server-Side Encryption</a> in the
 *                            <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Working with the Response Body</dt>
 *             <dd>
 *                <p>Given the response size is unknown, Amazon S3 Select streams the response as a
 *                   series of messages and includes a <code>Transfer-Encoding</code> header with
 *                      <code>chunked</code> as its value in the response. For more information, see
 *                      <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTSelectObjectAppendix.html">Appendix:
 *                      SelectObjectContent
 *                   Response</a>.</p>
 *             </dd>
 *             <dt>GetObject Support</dt>
 *             <dd>
 *                <p>The <code>SelectObjectContent</code> action does not support the following
 *                      <code>GetObject</code> functionality. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>.</p>
 *                <ul>
 *                   <li>
 *                      <p>
 *                         <code>Range</code>: Although you can specify a scan range for an Amazon S3 Select
 *                         request (see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_SelectObjectContent.html#AmazonS3-SelectObjectContent-request-ScanRange">SelectObjectContentRequest - ScanRange</a> in the request
 *                         parameters), you cannot specify the range of bytes of an object to return.
 *                      </p>
 *                   </li>
 *                   <li>
 *                      <p>The <code>GLACIER</code>, <code>DEEP_ARCHIVE</code>, and
 *                            <code>REDUCED_REDUNDANCY</code> storage classes, or the
 *                            <code>ARCHIVE_ACCESS</code> and <code>DEEP_ARCHIVE_ACCESS</code> access
 *                         tiers of the <code>INTELLIGENT_TIERING</code> storage class: You cannot
 *                         query objects in the <code>GLACIER</code>, <code>DEEP_ARCHIVE</code>, or
 *                            <code>REDUCED_REDUNDANCY</code> storage classes, nor objects in the
 *                            <code>ARCHIVE_ACCESS</code> or <code>DEEP_ARCHIVE_ACCESS</code> access
 *                         tiers of the <code>INTELLIGENT_TIERING</code> storage class. For more
 *                         information about storage classes, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html">Using Amazon S3
 *                            storage classes</a> in the
 *                         <i>Amazon S3 User Guide</i>.</p>
 *                   </li>
 *                </ul>
 *             </dd>
 *             <dt>Special Errors</dt>
 *             <dd>
 *                <p>For a list of special errors for this operation, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/ErrorResponses.html#SelectObjectContentErrorCodeList">List of SELECT Object Content Error Codes</a>
 *                </p>
 *             </dd>
 *          </dl>
 *          <p>The following operations are related to <code>SelectObjectContent</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html">GetObject</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketLifecycleConfiguration.html">GetBucketLifecycleConfiguration</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html">PutBucketLifecycleConfiguration</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, SelectObjectContentCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, SelectObjectContentCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // SelectObjectContentRequest
 *   Bucket: "STRING_VALUE", // required
 *   Key: "STRING_VALUE", // required
 *   SSECustomerAlgorithm: "STRING_VALUE",
 *   SSECustomerKey: "STRING_VALUE",
 *   SSECustomerKeyMD5: "STRING_VALUE",
 *   Expression: "STRING_VALUE", // required
 *   ExpressionType: "SQL", // required
 *   RequestProgress: { // RequestProgress
 *     Enabled: true || false,
 *   },
 *   InputSerialization: { // InputSerialization
 *     CSV: { // CSVInput
 *       FileHeaderInfo: "USE" || "IGNORE" || "NONE",
 *       Comments: "STRING_VALUE",
 *       QuoteEscapeCharacter: "STRING_VALUE",
 *       RecordDelimiter: "STRING_VALUE",
 *       FieldDelimiter: "STRING_VALUE",
 *       QuoteCharacter: "STRING_VALUE",
 *       AllowQuotedRecordDelimiter: true || false,
 *     },
 *     CompressionType: "NONE" || "GZIP" || "BZIP2",
 *     JSON: { // JSONInput
 *       Type: "DOCUMENT" || "LINES",
 *     },
 *     Parquet: {},
 *   },
 *   OutputSerialization: { // OutputSerialization
 *     CSV: { // CSVOutput
 *       QuoteFields: "ALWAYS" || "ASNEEDED",
 *       QuoteEscapeCharacter: "STRING_VALUE",
 *       RecordDelimiter: "STRING_VALUE",
 *       FieldDelimiter: "STRING_VALUE",
 *       QuoteCharacter: "STRING_VALUE",
 *     },
 *     JSON: { // JSONOutput
 *       RecordDelimiter: "STRING_VALUE",
 *     },
 *   },
 *   ScanRange: { // ScanRange
 *     Start: Number("long"),
 *     End: Number("long"),
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new SelectObjectContentCommand(input);
 * const response = await client.send(command);
 * // { // SelectObjectContentOutput
 * //   Payload: { // SelectObjectContentEventStream Union: only one key present
 * //     Records: { // RecordsEvent
 * //       Payload: new Uint8Array(),
 * //     },
 * //     Stats: { // StatsEvent
 * //       Details: { // Stats
 * //         BytesScanned: Number("long"),
 * //         BytesProcessed: Number("long"),
 * //         BytesReturned: Number("long"),
 * //       },
 * //     },
 * //     Progress: { // ProgressEvent
 * //       Details: { // Progress
 * //         BytesScanned: Number("long"),
 * //         BytesProcessed: Number("long"),
 * //         BytesReturned: Number("long"),
 * //       },
 * //     },
 * //     Cont: {},
 * //     End: {},
 * //   },
 * // };
 *
 * ```
 *
 * @param SelectObjectContentCommandInput - {@link SelectObjectContentCommandInput}
 * @returns {@link SelectObjectContentCommandOutput}
 * @see {@link SelectObjectContentCommandInput} for command's `input` shape.
 * @see {@link SelectObjectContentCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @public
 */
export declare class SelectObjectContentCommand extends SelectObjectContentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SelectObjectContentRequest;
            output: SelectObjectContentOutput;
        };
        sdk: {
            input: SelectObjectContentCommandInput;
            output: SelectObjectContentCommandOutput;
        };
    };
}
