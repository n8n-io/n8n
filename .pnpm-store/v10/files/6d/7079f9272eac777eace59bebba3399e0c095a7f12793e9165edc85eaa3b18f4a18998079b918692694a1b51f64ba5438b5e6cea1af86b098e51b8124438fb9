import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeAccessControlConfigurationRequest, DescribeAccessControlConfigurationResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeAccessControlConfigurationCommand}.
 */
export interface DescribeAccessControlConfigurationCommandInput extends DescribeAccessControlConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeAccessControlConfigurationCommand}.
 */
export interface DescribeAccessControlConfigurationCommandOutput extends DescribeAccessControlConfigurationResponse, __MetadataBearer {
}
declare const DescribeAccessControlConfigurationCommand_base: {
    new (input: DescribeAccessControlConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAccessControlConfigurationCommandInput, DescribeAccessControlConfigurationCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeAccessControlConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeAccessControlConfigurationCommandInput, DescribeAccessControlConfigurationCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about an access control configuration that you created for your
 *             documents in an index. This includes user and group access information for your
 *             documents. This is useful for user context filtering, where search results are filtered
 *             based on the user or their group access to documents.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeAccessControlConfigurationCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeAccessControlConfigurationCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeAccessControlConfigurationRequest
 *   IndexId: "STRING_VALUE", // required
 *   Id: "STRING_VALUE", // required
 * };
 * const command = new DescribeAccessControlConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // DescribeAccessControlConfigurationResponse
 * //   Name: "STRING_VALUE", // required
 * //   Description: "STRING_VALUE",
 * //   ErrorMessage: "STRING_VALUE",
 * //   AccessControlList: [ // PrincipalList
 * //     { // Principal
 * //       Name: "STRING_VALUE", // required
 * //       Type: "USER" || "GROUP", // required
 * //       Access: "ALLOW" || "DENY", // required
 * //       DataSourceId: "STRING_VALUE",
 * //     },
 * //   ],
 * //   HierarchicalAccessControlList: [ // HierarchicalPrincipalList
 * //     { // HierarchicalPrincipal
 * //       PrincipalList: [ // required
 * //         {
 * //           Name: "STRING_VALUE", // required
 * //           Type: "USER" || "GROUP", // required
 * //           Access: "ALLOW" || "DENY", // required
 * //           DataSourceId: "STRING_VALUE",
 * //         },
 * //       ],
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param DescribeAccessControlConfigurationCommandInput - {@link DescribeAccessControlConfigurationCommandInput}
 * @returns {@link DescribeAccessControlConfigurationCommandOutput}
 * @see {@link DescribeAccessControlConfigurationCommandInput} for command's `input` shape.
 * @see {@link DescribeAccessControlConfigurationCommandOutput} for command's `response` shape.
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
export declare class DescribeAccessControlConfigurationCommand extends DescribeAccessControlConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeAccessControlConfigurationRequest;
            output: DescribeAccessControlConfigurationResponse;
        };
        sdk: {
            input: DescribeAccessControlConfigurationCommandInput;
            output: DescribeAccessControlConfigurationCommandOutput;
        };
    };
}
