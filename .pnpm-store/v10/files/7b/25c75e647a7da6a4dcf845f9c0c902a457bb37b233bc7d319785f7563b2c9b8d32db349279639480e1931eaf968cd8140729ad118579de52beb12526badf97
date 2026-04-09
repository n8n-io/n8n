import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DeleteAccessControlConfigurationRequest, DeleteAccessControlConfigurationResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteAccessControlConfigurationCommand}.
 */
export interface DeleteAccessControlConfigurationCommandInput extends DeleteAccessControlConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteAccessControlConfigurationCommand}.
 */
export interface DeleteAccessControlConfigurationCommandOutput extends DeleteAccessControlConfigurationResponse, __MetadataBearer {
}
declare const DeleteAccessControlConfigurationCommand_base: {
    new (input: DeleteAccessControlConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAccessControlConfigurationCommandInput, DeleteAccessControlConfigurationCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteAccessControlConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteAccessControlConfigurationCommandInput, DeleteAccessControlConfigurationCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an access control configuration that you created for your documents in an
 *             index. This includes user and group access information for your documents. This is
 *             useful for user context filtering, where search results are filtered based on the user
 *             or their group access to documents.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DeleteAccessControlConfigurationCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DeleteAccessControlConfigurationCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DeleteAccessControlConfigurationRequest
 *   IndexId: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 * };
 * const command = new DeleteAccessControlConfigurationCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteAccessControlConfigurationCommandInput - {@link DeleteAccessControlConfigurationCommandInput}
 * @returns {@link DeleteAccessControlConfigurationCommandOutput}
 * @see {@link DeleteAccessControlConfigurationCommandInput} for command's `input` shape.
 * @see {@link DeleteAccessControlConfigurationCommandOutput} for command's `response` shape.
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
export declare class DeleteAccessControlConfigurationCommand extends DeleteAccessControlConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteAccessControlConfigurationRequest;
            output: {};
        };
        sdk: {
            input: DeleteAccessControlConfigurationCommandInput;
            output: DeleteAccessControlConfigurationCommandOutput;
        };
    };
}
