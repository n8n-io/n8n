import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { CreateAccessControlConfigurationRequest, CreateAccessControlConfigurationResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateAccessControlConfigurationCommand}.
 */
export interface CreateAccessControlConfigurationCommandInput extends CreateAccessControlConfigurationRequest {
}
/**
 * @public
 *
 * The output of {@link CreateAccessControlConfigurationCommand}.
 */
export interface CreateAccessControlConfigurationCommandOutput extends CreateAccessControlConfigurationResponse, __MetadataBearer {
}
declare const CreateAccessControlConfigurationCommand_base: {
    new (input: CreateAccessControlConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAccessControlConfigurationCommandInput, CreateAccessControlConfigurationCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateAccessControlConfigurationCommandInput): import("@smithy/smithy-client").CommandImpl<CreateAccessControlConfigurationCommandInput, CreateAccessControlConfigurationCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an access configuration for your documents. This includes user and group
 *             access information for your documents. This is useful for user context filtering, where
 *             search results are filtered based on the user or their group access to documents.</p>
 *          <p>You can use this to re-configure your existing document level access control without
 *             indexing all of your documents again. For example, your index contains top-secret
 *             company documents that only certain employees or users should access. One of these users
 *             leaves the company or switches to a team that should be blocked from accessing
 *             top-secret documents. The user still has access to top-secret documents because the user
 *             had access when your documents were previously indexed. You can create a specific access
 *             control configuration for the user with deny access. You can later update the access
 *             control configuration to allow access if the user returns to the company and re-joins
 *             the 'top-secret' team. You can re-configure access control for your documents as
 *             circumstances change.</p>
 *          <p>To apply your access control configuration to certain documents, you call the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_BatchPutDocument.html">BatchPutDocument</a> API with the <code>AccessControlConfigurationId</code>
 *             included in the <a href="https://docs.aws.amazon.com/kendra/latest/dg/API_Document.html">Document</a> object. If you use an S3 bucket as a data source, you update the
 *                 <code>.metadata.json</code> with the <code>AccessControlConfigurationId</code> and
 *             synchronize your data source. Amazon Kendra currently only supports access control
 *             configuration for S3 data sources and documents indexed using the
 *                 <code>BatchPutDocument</code> API.</p>
 *          <important>
 *             <p>You can't configure access control using
 *                     <code>CreateAccessControlConfiguration</code> for an Amazon Kendra Gen AI Enterprise
 *                 Edition index. Amazon Kendra will return a <code>ValidationException</code> error for a
 *                     <code>Gen_AI_ENTERPRISE_EDITION</code> index.</p>
 *          </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, CreateAccessControlConfigurationCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, CreateAccessControlConfigurationCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // CreateAccessControlConfigurationRequest
 *   IndexId: "STRING_VALUE", // required
 *   Name: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   AccessControlList: [ // PrincipalList
 *     { // Principal
 *       Name: "STRING_VALUE", // required
 *       Type: "USER" || "GROUP", // required
 *       Access: "ALLOW" || "DENY", // required
 *       DataSourceId: "STRING_VALUE",
 *     },
 *   ],
 *   HierarchicalAccessControlList: [ // HierarchicalPrincipalList
 *     { // HierarchicalPrincipal
 *       PrincipalList: [ // required
 *         {
 *           Name: "STRING_VALUE", // required
 *           Type: "USER" || "GROUP", // required
 *           Access: "ALLOW" || "DENY", // required
 *           DataSourceId: "STRING_VALUE",
 *         },
 *       ],
 *     },
 *   ],
 *   ClientToken: "STRING_VALUE",
 * };
 * const command = new CreateAccessControlConfigurationCommand(input);
 * const response = await client.send(command);
 * // { // CreateAccessControlConfigurationResponse
 * //   Id: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateAccessControlConfigurationCommandInput - {@link CreateAccessControlConfigurationCommandInput}
 * @returns {@link CreateAccessControlConfigurationCommandOutput}
 * @see {@link CreateAccessControlConfigurationCommandInput} for command's `input` shape.
 * @see {@link CreateAccessControlConfigurationCommandOutput} for command's `response` shape.
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
export declare class CreateAccessControlConfigurationCommand extends CreateAccessControlConfigurationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateAccessControlConfigurationRequest;
            output: CreateAccessControlConfigurationResponse;
        };
        sdk: {
            input: CreateAccessControlConfigurationCommandInput;
            output: CreateAccessControlConfigurationCommandOutput;
        };
    };
}
