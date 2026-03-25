import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutBucketWebsiteRequest } from "../models/models_1";
import { S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../S3Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutBucketWebsiteCommand}.
 */
export interface PutBucketWebsiteCommandInput extends PutBucketWebsiteRequest {
}
/**
 * @public
 *
 * The output of {@link PutBucketWebsiteCommand}.
 */
export interface PutBucketWebsiteCommandOutput extends __MetadataBearer {
}
declare const PutBucketWebsiteCommand_base: {
    new (input: PutBucketWebsiteCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketWebsiteCommandInput, PutBucketWebsiteCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutBucketWebsiteCommandInput): import("@smithy/smithy-client").CommandImpl<PutBucketWebsiteCommandInput, PutBucketWebsiteCommandOutput, S3ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <note>
 *             <p>This operation is not supported for directory buckets.</p>
 *          </note>
 *          <p>Sets the configuration of the website that is specified in the <code>website</code>
 *          subresource. To configure a bucket as a website, you can add this subresource on the bucket
 *          with website configuration information such as the file name of the index document and any
 *          redirect rules. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html">Hosting Websites on Amazon S3</a>.</p>
 *          <p>This PUT action requires the <code>S3:PutBucketWebsite</code> permission. By default,
 *          only the bucket owner can configure the website attached to a bucket; however, bucket
 *          owners can allow other users to set the website configuration by writing a bucket policy
 *          that grants them the <code>S3:PutBucketWebsite</code> permission.</p>
 *          <p>To redirect all website requests sent to the bucket's website endpoint, you add a
 *          website configuration with the following elements. Because all requests are sent to another
 *          website, you don't need to provide index document name for the bucket.</p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <code>WebsiteConfiguration</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>RedirectAllRequestsTo</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>HostName</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>Protocol</code>
 *                </p>
 *             </li>
 *          </ul>
 *          <p>If you want granular control over redirects, you can use the following elements to add
 *          routing rules that describe conditions for redirecting requests and information about the
 *          redirect destination. In this case, the website configuration must provide an index
 *          document for the bucket, because some requests might not be redirected. </p>
 *          <ul>
 *             <li>
 *                <p>
 *                   <code>WebsiteConfiguration</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>IndexDocument</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>Suffix</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>ErrorDocument</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>Key</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>RoutingRules</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>RoutingRule</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>Condition</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>HttpErrorCodeReturnedEquals</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>KeyPrefixEquals</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>Redirect</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>Protocol</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>HostName</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>ReplaceKeyPrefixWith</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>ReplaceKeyWith</code>
 *                </p>
 *             </li>
 *             <li>
 *                <p>
 *                   <code>HttpRedirectCode</code>
 *                </p>
 *             </li>
 *          </ul>
 *          <p>Amazon S3 has a limitation of 50 routing rules per website configuration. If you require more
 *          than 50 routing rules, you can use object redirect. For more information, see <a href="https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html">Configuring an
 *             Object Redirect</a> in the <i>Amazon S3 User Guide</i>.</p>
 *          <p>The maximum request length is limited to 128 KB.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { S3Client, PutBucketWebsiteCommand } from "@aws-sdk/client-s3"; // ES Modules import
 * // const { S3Client, PutBucketWebsiteCommand } = require("@aws-sdk/client-s3"); // CommonJS import
 * const client = new S3Client(config);
 * const input = { // PutBucketWebsiteRequest
 *   Bucket: "STRING_VALUE", // required
 *   ContentMD5: "STRING_VALUE",
 *   ChecksumAlgorithm: "CRC32" || "CRC32C" || "SHA1" || "SHA256" || "CRC64NVME",
 *   WebsiteConfiguration: { // WebsiteConfiguration
 *     ErrorDocument: { // ErrorDocument
 *       Key: "STRING_VALUE", // required
 *     },
 *     IndexDocument: { // IndexDocument
 *       Suffix: "STRING_VALUE", // required
 *     },
 *     RedirectAllRequestsTo: { // RedirectAllRequestsTo
 *       HostName: "STRING_VALUE", // required
 *       Protocol: "http" || "https",
 *     },
 *     RoutingRules: [ // RoutingRules
 *       { // RoutingRule
 *         Condition: { // Condition
 *           HttpErrorCodeReturnedEquals: "STRING_VALUE",
 *           KeyPrefixEquals: "STRING_VALUE",
 *         },
 *         Redirect: { // Redirect
 *           HostName: "STRING_VALUE",
 *           HttpRedirectCode: "STRING_VALUE",
 *           Protocol: "http" || "https",
 *           ReplaceKeyPrefixWith: "STRING_VALUE",
 *           ReplaceKeyWith: "STRING_VALUE",
 *         },
 *       },
 *     ],
 *   },
 *   ExpectedBucketOwner: "STRING_VALUE",
 * };
 * const command = new PutBucketWebsiteCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param PutBucketWebsiteCommandInput - {@link PutBucketWebsiteCommandInput}
 * @returns {@link PutBucketWebsiteCommandOutput}
 * @see {@link PutBucketWebsiteCommandInput} for command's `input` shape.
 * @see {@link PutBucketWebsiteCommandOutput} for command's `response` shape.
 * @see {@link S3ClientResolvedConfig | config} for S3Client's `config` shape.
 *
 * @throws {@link S3ServiceException}
 * <p>Base exception class for all service exceptions from S3 service.</p>
 *
 *
 * @example Set website configuration on a bucket
 * ```javascript
 * // The following example adds website configuration to a bucket.
 * const input = {
 *   Bucket: "examplebucket",
 *   ContentMD5: "",
 *   WebsiteConfiguration: {
 *     ErrorDocument: {
 *       Key: "error.html"
 *     },
 *     IndexDocument: {
 *       Suffix: "index.html"
 *     }
 *   }
 * };
 * const command = new PutBucketWebsiteCommand(input);
 * const response = await client.send(command);
 * /* response is
 * { /* metadata only *\/ }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutBucketWebsiteCommand extends PutBucketWebsiteCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutBucketWebsiteRequest;
            output: {};
        };
        sdk: {
            input: PutBucketWebsiteCommandInput;
            output: PutBucketWebsiteCommandOutput;
        };
    };
}
