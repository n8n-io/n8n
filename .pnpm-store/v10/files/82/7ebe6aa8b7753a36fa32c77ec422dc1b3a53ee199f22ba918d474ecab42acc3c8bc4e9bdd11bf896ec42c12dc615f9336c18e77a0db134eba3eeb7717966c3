import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { CreateFaqRequest, CreateFaqResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateFaqCommand}.
 */
export interface CreateFaqCommandInput extends CreateFaqRequest {
}
/**
 * @public
 *
 * The output of {@link CreateFaqCommand}.
 */
export interface CreateFaqCommandOutput extends CreateFaqResponse, __MetadataBearer {
}
declare const CreateFaqCommand_base: {
    new (input: CreateFaqCommandInput): import("@smithy/smithy-client").CommandImpl<CreateFaqCommandInput, CreateFaqCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateFaqCommandInput): import("@smithy/smithy-client").CommandImpl<CreateFaqCommandInput, CreateFaqCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a set of frequently ask questions (FAQs) using a specified FAQ file stored
 *             in an Amazon S3 bucket.</p>
 *          <p>Adding FAQs to an index is an asynchronous operation.</p>
 *          <p>For an example of adding an FAQ to an index using Python and Java SDKs, see <a href="https://docs.aws.amazon.com/kendra/latest/dg/in-creating-faq.html#using-faq-file">Using your FAQ file</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, CreateFaqCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, CreateFaqCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // CreateFaqRequest
 *   IndexId: "STRING_VALUE", // required
 *   Name: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   S3Path: { // S3Path
 *     Bucket: "STRING_VALUE", // required
 *     Key: "STRING_VALUE", // required
 *   },
 *   RoleArn: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   FileFormat: "CSV" || "CSV_WITH_HEADER" || "JSON",
 *   ClientToken: "STRING_VALUE",
 *   LanguageCode: "STRING_VALUE",
 * };
 * const command = new CreateFaqCommand(input);
 * const response = await client.send(command);
 * // { // CreateFaqResponse
 * //   Id: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateFaqCommandInput - {@link CreateFaqCommandInput}
 * @returns {@link CreateFaqCommandOutput}
 * @see {@link CreateFaqCommandInput} for command's `input` shape.
 * @see {@link CreateFaqCommandOutput} for command's `response` shape.
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
export declare class CreateFaqCommand extends CreateFaqCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateFaqRequest;
            output: CreateFaqResponse;
        };
        sdk: {
            input: CreateFaqCommandInput;
            output: CreateFaqCommandOutput;
        };
    };
}
