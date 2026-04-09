import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { StartDataSourceSyncJobRequest, StartDataSourceSyncJobResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartDataSourceSyncJobCommand}.
 */
export interface StartDataSourceSyncJobCommandInput extends StartDataSourceSyncJobRequest {
}
/**
 * @public
 *
 * The output of {@link StartDataSourceSyncJobCommand}.
 */
export interface StartDataSourceSyncJobCommandOutput extends StartDataSourceSyncJobResponse, __MetadataBearer {
}
declare const StartDataSourceSyncJobCommand_base: {
    new (input: StartDataSourceSyncJobCommandInput): import("@smithy/smithy-client").CommandImpl<StartDataSourceSyncJobCommandInput, StartDataSourceSyncJobCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartDataSourceSyncJobCommandInput): import("@smithy/smithy-client").CommandImpl<StartDataSourceSyncJobCommandInput, StartDataSourceSyncJobCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Starts a synchronization job for a data source connector. If a synchronization job is
 *       already in progress, Amazon Kendra returns a <code>ResourceInUseException</code>
 *       exception.</p>
 *          <p>Re-syncing your data source with your index after modifying, adding, or deleting
 *       documents from your data source respository could take up to an hour or more, depending on
 *       the number of documents to sync.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, StartDataSourceSyncJobCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, StartDataSourceSyncJobCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // StartDataSourceSyncJobRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 * };
 * const command = new StartDataSourceSyncJobCommand(input);
 * const response = await client.send(command);
 * // { // StartDataSourceSyncJobResponse
 * //   ExecutionId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param StartDataSourceSyncJobCommandInput - {@link StartDataSourceSyncJobCommandInput}
 * @returns {@link StartDataSourceSyncJobCommandOutput}
 * @see {@link StartDataSourceSyncJobCommandInput} for command's `input` shape.
 * @see {@link StartDataSourceSyncJobCommandOutput} for command's `response` shape.
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
 * @throws {@link ResourceInUseException} (client fault)
 *  <p>The resource you want to use is currently in use. Please check you have provided the
 *             correct resource and try again.</p>
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
export declare class StartDataSourceSyncJobCommand extends StartDataSourceSyncJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartDataSourceSyncJobRequest;
            output: StartDataSourceSyncJobResponse;
        };
        sdk: {
            input: StartDataSourceSyncJobCommandInput;
            output: StartDataSourceSyncJobCommandOutput;
        };
    };
}
