import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { CreateIndexRequest, CreateIndexResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateIndexCommand}.
 */
export interface CreateIndexCommandInput extends CreateIndexRequest {
}
/**
 * @public
 *
 * The output of {@link CreateIndexCommand}.
 */
export interface CreateIndexCommandOutput extends CreateIndexResponse, __MetadataBearer {
}
declare const CreateIndexCommand_base: {
    new (input: CreateIndexCommandInput): import("@smithy/smithy-client").CommandImpl<CreateIndexCommandInput, CreateIndexCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateIndexCommandInput): import("@smithy/smithy-client").CommandImpl<CreateIndexCommandInput, CreateIndexCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an Amazon Kendra index. Index creation is an asynchronous API. To determine
 *       if index creation has completed, check the <code>Status</code> field returned from a call to
 *         <code>DescribeIndex</code>. The <code>Status</code> field is set to <code>ACTIVE</code> when
 *       the index is ready to use.</p>
 *          <p>Once the index is active, you can index your documents using the
 *         <code>BatchPutDocument</code> API or using one of the supported <a href="https://docs.aws.amazon.com/kendra/latest/dg/data-sources.html">data sources</a>.</p>
 *          <p>For an example of creating an index and data source using the Python SDK, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/gs-python.html">Getting started with Python
 *         SDK</a>. For an example of creating an index and data source using the Java SDK, see
 *         <a href="https://docs.aws.amazon.com/kendra/latest/dg/gs-java.html">Getting started with Java
 *         SDK</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, CreateIndexCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, CreateIndexCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // CreateIndexRequest
 *   Name: "STRING_VALUE", // required
 *   Edition: "DEVELOPER_EDITION" || "ENTERPRISE_EDITION" || "GEN_AI_ENTERPRISE_EDITION",
 *   RoleArn: "STRING_VALUE", // required
 *   ServerSideEncryptionConfiguration: { // ServerSideEncryptionConfiguration
 *     KmsKeyId: "STRING_VALUE",
 *   },
 *   Description: "STRING_VALUE",
 *   ClientToken: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   UserTokenConfigurations: [ // UserTokenConfigurationList
 *     { // UserTokenConfiguration
 *       JwtTokenTypeConfiguration: { // JwtTokenTypeConfiguration
 *         KeyLocation: "URL" || "SECRET_MANAGER", // required
 *         URL: "STRING_VALUE",
 *         SecretManagerArn: "STRING_VALUE",
 *         UserNameAttributeField: "STRING_VALUE",
 *         GroupAttributeField: "STRING_VALUE",
 *         Issuer: "STRING_VALUE",
 *         ClaimRegex: "STRING_VALUE",
 *       },
 *       JsonTokenTypeConfiguration: { // JsonTokenTypeConfiguration
 *         UserNameAttributeField: "STRING_VALUE", // required
 *         GroupAttributeField: "STRING_VALUE", // required
 *       },
 *     },
 *   ],
 *   UserContextPolicy: "ATTRIBUTE_FILTER" || "USER_TOKEN",
 *   UserGroupResolutionConfiguration: { // UserGroupResolutionConfiguration
 *     UserGroupResolutionMode: "AWS_SSO" || "NONE", // required
 *   },
 * };
 * const command = new CreateIndexCommand(input);
 * const response = await client.send(command);
 * // { // CreateIndexResponse
 * //   Id: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateIndexCommandInput - {@link CreateIndexCommandInput}
 * @returns {@link CreateIndexCommandOutput}
 * @see {@link CreateIndexCommandInput} for command's `input` shape.
 * @see {@link CreateIndexCommandOutput} for command's `response` shape.
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
 * @throws {@link ResourceAlreadyExistException} (client fault)
 *  <p>The resource you want to use already exists. Please check you have provided the
 *             correct resource and try again.</p>
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
export declare class CreateIndexCommand extends CreateIndexCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateIndexRequest;
            output: CreateIndexResponse;
        };
        sdk: {
            input: CreateIndexCommandInput;
            output: CreateIndexCommandOutput;
        };
    };
}
