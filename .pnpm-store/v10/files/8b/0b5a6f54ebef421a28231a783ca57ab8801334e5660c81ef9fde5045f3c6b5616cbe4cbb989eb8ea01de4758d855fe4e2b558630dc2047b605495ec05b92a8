import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../KendraClient";
import type { DescribeFaqRequest, DescribeFaqResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeFaqCommand}.
 */
export interface DescribeFaqCommandInput extends DescribeFaqRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeFaqCommand}.
 */
export interface DescribeFaqCommandOutput extends DescribeFaqResponse, __MetadataBearer {
}
declare const DescribeFaqCommand_base: {
    new (input: DescribeFaqCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeFaqCommandInput, DescribeFaqCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeFaqCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeFaqCommandInput, DescribeFaqCommandOutput, KendraClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets information about a FAQ.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { KendraClient, DescribeFaqCommand } from "@aws-sdk/client-kendra"; // ES Modules import
 * // const { KendraClient, DescribeFaqCommand } = require("@aws-sdk/client-kendra"); // CommonJS import
 * // import type { KendraClientConfig } from "@aws-sdk/client-kendra";
 * const config = {}; // type is KendraClientConfig
 * const client = new KendraClient(config);
 * const input = { // DescribeFaqRequest
 *   Id: "STRING_VALUE", // required
 *   IndexId: "STRING_VALUE", // required
 * };
 * const command = new DescribeFaqCommand(input);
 * const response = await client.send(command);
 * // { // DescribeFaqResponse
 * //   Id: "STRING_VALUE",
 * //   IndexId: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   Description: "STRING_VALUE",
 * //   CreatedAt: new Date("TIMESTAMP"),
 * //   UpdatedAt: new Date("TIMESTAMP"),
 * //   S3Path: { // S3Path
 * //     Bucket: "STRING_VALUE", // required
 * //     Key: "STRING_VALUE", // required
 * //   },
 * //   Status: "CREATING" || "UPDATING" || "ACTIVE" || "DELETING" || "FAILED",
 * //   RoleArn: "STRING_VALUE",
 * //   ErrorMessage: "STRING_VALUE",
 * //   FileFormat: "CSV" || "CSV_WITH_HEADER" || "JSON",
 * //   LanguageCode: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeFaqCommandInput - {@link DescribeFaqCommandInput}
 * @returns {@link DescribeFaqCommandOutput}
 * @see {@link DescribeFaqCommandInput} for command's `input` shape.
 * @see {@link DescribeFaqCommandOutput} for command's `response` shape.
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
export declare class DescribeFaqCommand extends DescribeFaqCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeFaqRequest;
            output: DescribeFaqResponse;
        };
        sdk: {
            input: DescribeFaqCommandInput;
            output: DescribeFaqCommandOutput;
        };
    };
}
