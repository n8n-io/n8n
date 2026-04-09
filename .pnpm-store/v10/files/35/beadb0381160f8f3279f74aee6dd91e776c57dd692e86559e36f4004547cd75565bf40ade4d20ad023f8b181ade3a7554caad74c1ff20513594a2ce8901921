import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { SubmitFeedbackRequest } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link SubmitFeedbackCommand}.
 */
export interface SubmitFeedbackCommandInput extends SubmitFeedbackRequest {
}
/**
 * @public
 *
 * The output of {@link SubmitFeedbackCommand}.
 */
export interface SubmitFeedbackCommandOutput extends __MetadataBearer {
}
declare const SubmitFeedbackCommand_base: {
    new (input: SubmitFeedbackCommandInput): import("@smithy/smithy-client").CommandImpl<SubmitFeedbackCommandInput, SubmitFeedbackCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: SubmitFeedbackCommandInput): import("@smithy/smithy-client").CommandImpl<SubmitFeedbackCommandInput, SubmitFeedbackCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Enables you to provide feedback to Amazon Kendra to improve the
 *             performance of your index.</p>
 *          <p>
 *             <code>SubmitFeedback</code> is currently not supported in the
 *             Amazon Web Services GovCloud (US-West) region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, SubmitFeedbackCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, SubmitFeedbackCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // SubmitFeedbackRequest
 *   IndexId: "STRING_VALUE", // required
 *   QueryId: "STRING_VALUE", // required
 *   ClickFeedbackItems: [ // ClickFeedbackList
 *     { // ClickFeedback
 *       ResultId: "STRING_VALUE", // required
 *       ClickTime: new Date("TIMESTAMP"), // required
 *     },
 *   ],
 *   RelevanceFeedbackItems: [ // RelevanceFeedbackList
 *     { // RelevanceFeedback
 *       ResultId: "STRING_VALUE", // required
 *       RelevanceValue: "RELEVANT" || "NOT_RELEVANT", // required
 *     },
 *   ],
 * };
 * const command = new SubmitFeedbackCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param SubmitFeedbackCommandInput - {@link SubmitFeedbackCommandInput}
 * @returns {@link SubmitFeedbackCommandOutput}
 * @see {@link SubmitFeedbackCommandInput} for command's `input` shape.
 * @see {@link SubmitFeedbackCommandOutput} for command's `response` shape.
 * @see {@link KendraClientResolvedConfig | config} for KendraClient's `config` shape.
 *
 * @throws {@link AccessDeniedException} (client fault)
 *  <p>You don't have sufficient access to perform this action. Please ensure you have the
 *             required permission policies and user accounts and try again.</p>
 *
 * @throws {@link InternalServerException} (server fault)
 *  <p>An issue occurred with the internal server used for your Amazon Kendra service.
 *             Please wait a few minutes and try again, or contact <a href="http://aws.amazon.com/contact-us/">Support</a> for help.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>The resource you want to use doesn’t exist. Please check you have provided the correct
 *             resource and try again.</p>
 *
 * @throws {@link ResourceUnavailableException} (client fault)
 *  <p>The resource you want to use isn't available. Please check you have provided the
 *             correct resource and try again.</p>
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
export declare class SubmitFeedbackCommand extends SubmitFeedbackCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: SubmitFeedbackRequest;
            output: {};
        };
        sdk: {
            input: SubmitFeedbackCommandInput;
            output: SubmitFeedbackCommandOutput;
        };
    };
}
