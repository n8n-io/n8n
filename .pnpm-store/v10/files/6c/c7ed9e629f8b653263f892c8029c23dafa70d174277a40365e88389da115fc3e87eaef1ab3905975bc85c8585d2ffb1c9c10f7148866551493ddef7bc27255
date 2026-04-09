import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { BatchPutDocumentRequest, BatchPutDocumentResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link BatchPutDocumentCommand}.
 */
export interface BatchPutDocumentCommandInput extends BatchPutDocumentRequest {
}
/**
 * @public
 *
 * The output of {@link BatchPutDocumentCommand}.
 */
export interface BatchPutDocumentCommandOutput extends BatchPutDocumentResponse, __MetadataBearer {
}
declare const BatchPutDocumentCommand_base: {
    new (input: BatchPutDocumentCommandInput): import("@smithy/smithy-client").CommandImpl<BatchPutDocumentCommandInput, BatchPutDocumentCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: BatchPutDocumentCommandInput): import("@smithy/smithy-client").CommandImpl<BatchPutDocumentCommandInput, BatchPutDocumentCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Adds one or more documents to an index.</p>
 *          <p>The <code>BatchPutDocument</code> API enables you to ingest inline documents or a set
 *             of documents stored in an Amazon S3 bucket. Use this API to ingest your text and
 *             unstructured text into an index, add custom attributes to the documents, and to attach
 *             an access control list to the documents added to the index.</p>
 *          <p>The documents are indexed asynchronously. You can see the progress of the batch using
 *                 Amazon Web Services
 *             CloudWatch. Any error messages related to processing the batch are sent to your
 *                 Amazon Web Services
 *             CloudWatch log. You can also use the <code>BatchGetDocumentStatus</code> API to
 *             monitor the progress of indexing your documents.</p>
 *          <p>For an example of ingesting inline documents using Python and Java SDKs, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-adding-binary-doc.html">Adding files
 *                 directly to an index</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, BatchPutDocumentCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, BatchPutDocumentCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // BatchPutDocumentRequest
 *   IndexId: "STRING_VALUE", // required
 *   RoleArn: "STRING_VALUE",
 *   Documents: [ // DocumentList // required
 *     { // Document
 *       Id: "STRING_VALUE", // required
 *       Title: "STRING_VALUE",
 *       Blob: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *       S3Path: { // S3Path
 *         Bucket: "STRING_VALUE", // required
 *         Key: "STRING_VALUE", // required
 *       },
 *       Attributes: [ // DocumentAttributeList
 *         { // DocumentAttribute
 *           Key: "STRING_VALUE", // required
 *           Value: { // DocumentAttributeValue
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [ // DocumentAttributeStringListValue
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *       ],
 *       AccessControlList: [ // PrincipalList
 *         { // Principal
 *           Name: "STRING_VALUE", // required
 *           Type: "USER" || "GROUP", // required
 *           Access: "ALLOW" || "DENY", // required
 *           DataSourceId: "STRING_VALUE",
 *         },
 *       ],
 *       HierarchicalAccessControlList: [ // HierarchicalPrincipalList
 *         { // HierarchicalPrincipal
 *           PrincipalList: [ // required
 *             {
 *               Name: "STRING_VALUE", // required
 *               Type: "USER" || "GROUP", // required
 *               Access: "ALLOW" || "DENY", // required
 *               DataSourceId: "STRING_VALUE",
 *             },
 *           ],
 *         },
 *       ],
 *       ContentType: "PDF" || "HTML" || "MS_WORD" || "PLAIN_TEXT" || "PPT" || "RTF" || "XML" || "XSLT" || "MS_EXCEL" || "CSV" || "JSON" || "MD",
 *       AccessControlConfigurationId: "STRING_VALUE",
 *     },
 *   ],
 *   CustomDocumentEnrichmentConfiguration: { // CustomDocumentEnrichmentConfiguration
 *     InlineConfigurations: [ // InlineCustomDocumentEnrichmentConfigurationList
 *       { // InlineCustomDocumentEnrichmentConfiguration
 *         Condition: { // DocumentAttributeCondition
 *           ConditionDocumentAttributeKey: "STRING_VALUE", // required
 *           Operator: "GreaterThan" || "GreaterThanOrEquals" || "LessThan" || "LessThanOrEquals" || "Equals" || "NotEquals" || "Contains" || "NotContains" || "Exists" || "NotExists" || "BeginsWith", // required
 *           ConditionOnValue: {
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         Target: { // DocumentAttributeTarget
 *           TargetDocumentAttributeKey: "STRING_VALUE",
 *           TargetDocumentAttributeValueDeletion: true || false,
 *           TargetDocumentAttributeValue: {
 *             StringValue: "STRING_VALUE",
 *             StringListValue: [
 *               "STRING_VALUE",
 *             ],
 *             LongValue: Number("long"),
 *             DateValue: new Date("TIMESTAMP"),
 *           },
 *         },
 *         DocumentContentDeletion: true || false,
 *       },
 *     ],
 *     PreExtractionHookConfiguration: { // HookConfiguration
 *       InvocationCondition: {
 *         ConditionDocumentAttributeKey: "STRING_VALUE", // required
 *         Operator: "GreaterThan" || "GreaterThanOrEquals" || "LessThan" || "LessThanOrEquals" || "Equals" || "NotEquals" || "Contains" || "NotContains" || "Exists" || "NotExists" || "BeginsWith", // required
 *         ConditionOnValue: {
 *           StringValue: "STRING_VALUE",
 *           StringListValue: [
 *             "STRING_VALUE",
 *           ],
 *           LongValue: Number("long"),
 *           DateValue: new Date("TIMESTAMP"),
 *         },
 *       },
 *       LambdaArn: "STRING_VALUE", // required
 *       S3Bucket: "STRING_VALUE", // required
 *     },
 *     PostExtractionHookConfiguration: {
 *       InvocationCondition: {
 *         ConditionDocumentAttributeKey: "STRING_VALUE", // required
 *         Operator: "GreaterThan" || "GreaterThanOrEquals" || "LessThan" || "LessThanOrEquals" || "Equals" || "NotEquals" || "Contains" || "NotContains" || "Exists" || "NotExists" || "BeginsWith", // required
 *         ConditionOnValue: {
 *           StringValue: "STRING_VALUE",
 *           StringListValue: [
 *             "STRING_VALUE",
 *           ],
 *           LongValue: Number("long"),
 *           DateValue: new Date("TIMESTAMP"),
 *         },
 *       },
 *       LambdaArn: "STRING_VALUE", // required
 *       S3Bucket: "STRING_VALUE", // required
 *     },
 *     RoleArn: "STRING_VALUE",
 *   },
 * };
 * const command = new BatchPutDocumentCommand(input);
 * const response = await client.send(command);
 * // { // BatchPutDocumentResponse
 * //   FailedDocuments: [ // BatchPutDocumentResponseFailedDocuments
 * //     { // BatchPutDocumentResponseFailedDocument
 * //       Id: "STRING_VALUE",
 * //       DataSourceId: "STRING_VALUE",
 * //       ErrorCode: "InternalError" || "InvalidRequest",
 * //       ErrorMessage: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param BatchPutDocumentCommandInput - {@link BatchPutDocumentCommandInput}
 * @returns {@link BatchPutDocumentCommandOutput}
 * @see {@link BatchPutDocumentCommandInput} for command's `input` shape.
 * @see {@link BatchPutDocumentCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>A conflict occurred with the request. Please fix any inconsistences with your
 *             resources and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ServiceQuotaExceededException} (client fault)
 *  <p>You have exceeded the set limits for your Amazon Kendra service. Please see
 *             <a href="https://docs.aws.amazon.com/kendra/latest/dg/quotas.html">Quotas</a> for
 *             more information, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> to inquire about
 *             an increase of limits.</p>
 *
 * @throws {@link ThrottlingException} (client fault)
 *  <p>The request was denied due to request throttling. Please reduce the number of requests
 *             and try again.</p>
 *
 * @throws {@link ValidationException} (client fault)
 *  <p>The input fails to satisfy the constraints set by the Amazon Kendra service.
 *             Please provide the correct input and try again.</p>
 *
 * @throws {@link KendraServiceException}
 * <p>Base exception class for all service exceptions from Kendra service.</p>
 *
 *
 * @public
 */
export declare class BatchPutDocumentCommand extends BatchPutDocumentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: BatchPutDocumentRequest;
            output: BatchPutDocumentResponse;
        };
        sdk: {
            input: BatchPutDocumentCommandInput;
            output: BatchPutDocumentCommandOutput;
        };
    };
}
