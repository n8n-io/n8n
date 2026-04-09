import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { BatchDeleteDocumentRequest, BatchDeleteDocumentResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link BatchDeleteDocumentCommand}.
 */
export interface BatchDeleteDocumentCommandInput extends BatchDeleteDocumentRequest {
}
/**
 * @public
 *
 * The output of {@link BatchDeleteDocumentCommand}.
 */
export interface BatchDeleteDocumentCommandOutput extends BatchDeleteDocumentResponse, __MetadataBearer {
}
declare const BatchDeleteDocumentCommand_base: {
    new (input: BatchDeleteDocumentCommandInput): import("@smithy/smithy-client").CommandImpl<BatchDeleteDocumentCommandInput, BatchDeleteDocumentCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: BatchDeleteDocumentCommandInput): import("@smithy/smithy-client").CommandImpl<BatchDeleteDocumentCommandInput, BatchDeleteDocumentCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Removes one or more documents from an index. The documents must have been added with
 *             the <code>BatchPutDocument</code> API.</p>
 *          <p>The documents are deleted asynchronously. You can see the progress of the deletion by
 *             using Amazon Web Services
 *             CloudWatch. Any error messages related to the processing of the batch are sent to
 *             your Amazon Web Services
 *             CloudWatch log. You can also use the <code>BatchGetDocumentStatus</code> API to
 *             monitor the progress of deleting your documents.</p>
 *          <p>Deleting documents from an index using <code>BatchDeleteDocument</code> could take up
 *             to an hour or more, depending on the number of documents you want to delete.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, BatchDeleteDocumentCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, BatchDeleteDocumentCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // BatchDeleteDocumentRequest
 *   IndexId: "STRING_VALUE", // required
 *   DocumentIdList: [ // DocumentIdList // required
 *     "STRING_VALUE",
 *   ],
 *   DataSourceSyncJobMetricTarget: { // DataSourceSyncJobMetricTarget
 *     DataSourceId: "STRING_VALUE", // required
 *     DataSourceSyncJobId: "STRING_VALUE",
 *   },
 * };
 * const command = new BatchDeleteDocumentCommand(input);
 * const response = await client.send(command);
 * // { // BatchDeleteDocumentResponse
 * //   FailedDocuments: [ // BatchDeleteDocumentResponseFailedDocuments
 * //     { // BatchDeleteDocumentResponseFailedDocument
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
 * @param BatchDeleteDocumentCommandInput - {@link BatchDeleteDocumentCommandInput}
 * @returns {@link BatchDeleteDocumentCommandOutput}
 * @see {@link BatchDeleteDocumentCommandInput} for command's `input` shape.
 * @see {@link BatchDeleteDocumentCommandOutput} for command's `response` shape.
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
export declare class BatchDeleteDocumentCommand extends BatchDeleteDocumentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: BatchDeleteDocumentRequest;
            output: BatchDeleteDocumentResponse;
        };
        sdk: {
            input: BatchDeleteDocumentCommandInput;
            output: BatchDeleteDocumentCommandOutput;
        };
    };
}
