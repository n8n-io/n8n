import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { UpdateQuerySuggestionsConfigRequest } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateQuerySuggestionsConfigCommand}.
 */
export interface UpdateQuerySuggestionsConfigCommandInput extends UpdateQuerySuggestionsConfigRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateQuerySuggestionsConfigCommand}.
 */
export interface UpdateQuerySuggestionsConfigCommandOutput extends __MetadataBearer {
}
declare const UpdateQuerySuggestionsConfigCommand_base: {
    new (input: UpdateQuerySuggestionsConfigCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateQuerySuggestionsConfigCommandInput, UpdateQuerySuggestionsConfigCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateQuerySuggestionsConfigCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateQuerySuggestionsConfigCommandInput, UpdateQuerySuggestionsConfigCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the settings of query suggestions for an index.</p>
 *          <p>Amazon Kendra supports partial updates, so you only need to provide
 *             the fields you want to update.</p>
 *          <p>If an update is currently processing, you
 *             need to wait for the update to finish before making another update.</p>
 *          <p>Updates to query suggestions settings might not take effect right away.
 *             The time for your updated settings to take effect depends on the updates
 *             made and the number of search queries in your index.</p>
 *          <p>You can still enable/disable query suggestions at any time.</p>
 *          <p>
 *             <code>UpdateQuerySuggestionsConfig</code> is currently not supported in the
 *             Amazon Web Services GovCloud (US-West) region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, UpdateQuerySuggestionsConfigCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, UpdateQuerySuggestionsConfigCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // UpdateQuerySuggestionsConfigRequest
 *   IndexId: "STRING_VALUE", // required
 *   Mode: "ENABLED" || "LEARN_ONLY",
 *   QueryLogLookBackWindowInDays: Number("int"),
 *   IncludeQueriesWithoutUserInformation: true || false,
 *   MinimumNumberOfQueryingUsers: Number("int"),
 *   MinimumQueryCount: Number("int"),
 *   AttributeSuggestionsConfig: { // AttributeSuggestionsUpdateConfig
 *     SuggestableConfigList: [ // SuggestableConfigList
 *       { // SuggestableConfig
 *         AttributeName: "STRING_VALUE",
 *         Suggestable: true || false,
 *       },
 *     ],
 *     AttributeSuggestionsMode: "ACTIVE" || "INACTIVE",
 *   },
 * };
 * const command = new UpdateQuerySuggestionsConfigCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateQuerySuggestionsConfigCommandInput - {@link UpdateQuerySuggestionsConfigCommandInput}
 * @returns {@link UpdateQuerySuggestionsConfigCommandOutput}
 * @see {@link UpdateQuerySuggestionsConfigCommandInput} for command's `input` shape.
 * @see {@link UpdateQuerySuggestionsConfigCommandOutput} for command's `response` shape.
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
export declare class UpdateQuerySuggestionsConfigCommand extends UpdateQuerySuggestionsConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateQuerySuggestionsConfigRequest;
            output: {};
        };
        sdk: {
            input: UpdateQuerySuggestionsConfigCommandInput;
            output: UpdateQuerySuggestionsConfigCommandOutput;
        };
    };
}
