import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { UpdateThesaurusRequest } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateThesaurusCommand}.
 */
export interface UpdateThesaurusCommandInput extends UpdateThesaurusRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateThesaurusCommand}.
 */
export interface UpdateThesaurusCommandOutput extends __MetadataBearer {
}
declare const UpdateThesaurusCommand_base: {
    new (input: UpdateThesaurusCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateThesaurusCommandInput, UpdateThesaurusCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateThesaurusCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateThesaurusCommandInput, UpdateThesaurusCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a thesaurus for an index.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, UpdateThesaurusCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, UpdateThesaurusCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // UpdateThesaurusRequest
 *   Id: "STRING_VALUE", // required
 *   Name: "STRING_VALUE",
 *   IndexId: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   RoleArn: "STRING_VALUE",
 *   SourceS3Path: { // S3Path
 *     Bucket: "STRING_VALUE", // required
 *     Key: "STRING_VALUE", // required
 *   },
 * };
 * const command = new UpdateThesaurusCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UpdateThesaurusCommandInput - {@link UpdateThesaurusCommandInput}
 * @returns {@link UpdateThesaurusCommandOutput}
 * @see {@link UpdateThesaurusCommandInput} for command's `input` shape.
 * @see {@link UpdateThesaurusCommandOutput} for command's `response` shape.
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
export declare class UpdateThesaurusCommand extends UpdateThesaurusCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateThesaurusRequest;
            output: {};
        };
        sdk: {
            input: UpdateThesaurusCommandInput;
            output: UpdateThesaurusCommandOutput;
        };
    };
}
