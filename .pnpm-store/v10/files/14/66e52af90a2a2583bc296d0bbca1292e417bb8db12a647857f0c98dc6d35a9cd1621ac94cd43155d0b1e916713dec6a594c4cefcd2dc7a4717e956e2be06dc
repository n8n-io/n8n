import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketCorsRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketCorsCommand}.
 */
export interface PutBucketCorsCommandInput extends PutBucketCorsRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketCorsCommand}.
 */
export interface PutBucketCorsCommandOutput extends __MetadataBearer {
}
declare const PutBucketCorsCommand_base: {
    new (input: PutBucketCorsCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketCorsCommandInput, PutBucketCorsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketCorsCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketCorsCommandInput, PutBucketCorsCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Sets the <code>cors</code> configuration for your bucket. If the configuration exists,
 *          Amazon S3 replaces it.</p>
 *          <p>To use this operation, you must be allowed to perform the <code>s3:PutBucketCORS</code>
 *          action. By default, the bucket owner has this permission and can grant it to others.</p>
 *          <p>You set this configuration on a bucket so that the bucket can service cross-origin
 *          requests. For example, you might want to enable a request whose origin is
 *             <code>http://www.example.com</code> to access your Amazon S3 bucket at
 *             <code>my.example.bucket.com</code> by using the browser's <code>XMLHttpRequest</code>
 *          capability.</p>
 *          <p>To enable cross-origin resource sharing (CORS) on a bucket, you add the
 *             <code>cors</code> subresource to the bucket. The <code>cors</code> subresource is an XML
 *          document in which you configure rules that identify origins and the HTTP methods that can
 *          be executed on your bucket. The document is limited to 64 KB in size. </p>
 *          <p>When Amazon S3 receives a cross-origin request (or a pre-flight OPTIONS request) against a
 *          bucket, it evaluates the <code>cors</code> configuration on the bucket and uses the first
 *             <code>CORSRule</code> rule that matches the incoming browser request to enable a
 *          cross-origin request. For a rule to match, the following conditions must be met:</p>
 *          <ul>
 *             <li>
 *                <p>The request's <code>Origin</code> header must match <code>AllowedOrigin</code>
 *                elements.</p>
 *             </li>
 *             <li>
 *                <p>The request method (for example, GET, PUT, HEAD, and so on) or the
 *                   <code>Access-Control-Request-Method</code> header in case of a pre-flight
 *                   <code>OPTIONS</code> request must be one of the <code>AllowedMethod</code>
 *                elements. </p>
 *             </li>
 *             <li>
 *                <p>Every header specified in the <code>Access-Control-Request-Headers</code> request
 *                header of a pre-flight request must match an <code>AllowedHeader</code> element.
 *             </p>
 *             </li>
 *          </ul>
 *          <p> For more information about CORS, go to <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html">Enabling Cross-Origin Resource Sharing</a> in
 *          the <i>Amazon S3 User Guide</i>.</p>
 *          <p>The following operations are related to <code>PutBucketCors</code>:</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetBucketCors.html">GetBucketCors</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucketCors.html">DeleteBucketCors</a>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <a href="https://docs.aws.amazon.com/AmazonS3/latest/API/RESTOPTIONSobject.html">RESTOPTIONSobject</a>
 *                </p>
 *             </li>
 *          </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketCorsRequest
 *   Bucket: "STRING_VALUE", // required
 *   CORSConfiguration: { // CORSConfiguration
 *     CORSRules: [ // CORSRules // required
 *       { // CORSRule
 *         ID: "STRING_VALUE",
 *         AllowedHeaders: [ // AllowedHeaders
 *           "STRING_VALUE",
 *         ],
 *         AllowedMethods: [ // AllowedMethods // required
 *           "STRING_VALUE",
 *         ],
 *         AllowedOrigins: [ // AllowedOrigins // required
 *           "STRING_VALUE",
 *         ],
 *         ExposeHeaders: [ // ExposeHeaders
 *           "STRING_VALUE",
 *         ],
 *         MaxAgeSeconds: Number("int"),
 *       },
 *     ],
 *   },
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketCorsCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketCorsCommandInput - {@link PutBucketCorsCommandInput}
 * @returns {@link PutBucketCorsCommandOutput}
 * @see {@link PutBucketCorsCommandInput} for command's `input` shape.
 * @see {@link PutBucketCorsCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example To set cors configuration on a bucket.
 * ```javascript
 * // The following example enables PUT, POST, and DELETE requests from www.example.com, and enables GET requests from any domain.
 * const input = {
 *   Bucket: "",
 *   CORSConfiguration: {
 *     CORSRules: [
 *       {
 *         AllowedHeaders: [
 *           "*"
 *         ],
 *         AllowedMethods: [
 *           "PUT",
 *           "POST",
 *           "DELETE"
 *         ],
 *         AllowedOrigins: [
 *           "http://www.example.com"
 *         ],
 *         ExposeHeaders: [
 *           "x-amz-server-side-encryption"
 *         ],
 *         MaxAgeSeconds: 3000
 *       },
 *       {
 *         AllowedHeaders: [
 *           "Authorization"
 *         ],
 *         AllowedMethods: [
 *           "GET"
 *         ],
 *         AllowedOrigins: [
 *           "*"
 *         ],
 *         MaxAgeSeconds: 3000
 *       }
 *     ]
 *   },
 *   ContentMD5: ""
 * };
 * const command = new PutBucketCorsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutBucketCorsCommand extends PutBucketCorsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketCorsRequest;
            output: {};
        };
        sdk: {
            input: PutBucketCorsCommandInput;
            output: PutBucketCorsCommandOutput;
        };
    };
}
