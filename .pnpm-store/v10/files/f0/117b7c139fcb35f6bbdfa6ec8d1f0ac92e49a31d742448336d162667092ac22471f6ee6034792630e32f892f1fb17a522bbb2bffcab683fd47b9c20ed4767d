import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DeleteDataSourceRequest } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteDataSourceCommand}.
 */
export interface DeleteDataSourceCommandInput extends DeleteDataSourceRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteDataSourceCommand}.
 */
export interface DeleteDataSourceCommandOutput extends __MetadataBearer {
}
declare const DeleteDataSourceCommand_base: {
    new (input: DeleteDataSourceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDataSourceCommandInput, DeleteDataSourceCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteDataSourceCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDataSourceCommandInput, DeleteDataSourceCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an Amazon Kendra data source connector. An exception is not thrown if the
 *       data source is already being deleted. While the data source is being deleted, the
 *         <code>Status</code> field returned by a call to the <code>DescribeDataSource</code> API is
 *       set to <code>DELETING</code>. For more information, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/delete-data-source.html">Deleting Data Sources</a>.</p>
 *          <p>Deleting an entire data source or re-syncing your index after deleting specific documents
 *       from a data source could take up to an hour or more, depending on the number of documents you
 *       want to delete.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DeleteDataSourceCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DeleteDataSourceCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DeleteDataSourceRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 * };
 * const command = new DeleteDataSourceCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteDataSourceCommandInput - {@link DeleteDataSourceCommandInput}
 * @returns {@link DeleteDataSourceCommandOutput}
 * @see {@link DeleteDataSourceCommandInput} for command's `input` shape.
 * @see {@link DeleteDataSourceCommandOutput} for command's `response` shape.
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
export declare class DeleteDataSourceCommand extends DeleteDataSourceCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteDataSourceRequest;
            output: {};
        };
        sdk: {
            input: DeleteDataSourceCommandInput;
            output: DeleteDataSourceCommandOutput;
        };
    };
}
