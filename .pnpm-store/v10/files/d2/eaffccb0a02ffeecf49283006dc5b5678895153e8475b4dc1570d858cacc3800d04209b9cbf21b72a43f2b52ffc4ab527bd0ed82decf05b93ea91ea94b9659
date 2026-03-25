import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { TestRenderEmailTemplateRequest, TestRenderEmailTemplateResponse } from "../models/models_1";
import { ServiceInputTypes, ServiceOutputTypes, SESv2ClientResolvedConfig } from "../SESv2Client";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link TestRenderEmailTemplateCommand}.
 */
export interface TestRenderEmailTemplateCommandInput extends TestRenderEmailTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link TestRenderEmailTemplateCommand}.
 */
export interface TestRenderEmailTemplateCommandOutput extends TestRenderEmailTemplateResponse, __MetadataBearer {
}
declare const TestRenderEmailTemplateCommand_base: {
    new (input: TestRenderEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<TestRenderEmailTemplateCommandInput, TestRenderEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: TestRenderEmailTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<TestRenderEmailTemplateCommandInput, TestRenderEmailTemplateCommandOutput, SESv2ClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a preview of the MIME content of an email when provided with a template and a
 *             set of replacement data.</p>
 *          <p>You can execute this operation no more than once per second.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SESv2Client, TestRenderEmailTemplateCommand } from "@aws-sdk/client-sesv2"; // ES Modules import
 * // const { SESv2Client, TestRenderEmailTemplateCommand } = require("@aws-sdk/client-sesv2"); // CommonJS import
 * // import type { SESv2ClientConfig } from "@aws-sdk/client-sesv2";
 * const config = {}; // type is SESv2ClientConfig
 * const client = new SESv2Client(config);
 * const input = { // TestRenderEmailTemplateRequest
 *   TemplateName: "STRING_VALUE", // required
 *   TemplateData: "STRING_VALUE", // required
 * };
 * const command = new TestRenderEmailTemplateCommand(input);
 * const response = await client.send(command);
 * // { // TestRenderEmailTemplateResponse
 * //   RenderedTemplate: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param TestRenderEmailTemplateCommandInput - {@link TestRenderEmailTemplateCommandInput}
 * @returns {@link TestRenderEmailTemplateCommandOutput}
 * @see {@link TestRenderEmailTemplateCommandInput} for command's `input` shape.
 * @see {@link TestRenderEmailTemplateCommandOutput} for command's `response` shape.
 * @see {@link SESv2ClientResolvedConfig | config} for SESv2Client's `config` shape.
 *
 * @throws {@link BadRequestException} (client fault)
 *  <p>The input you provided is invalid.</p>
 *
 * @throws {@link NotFoundException} (client fault)
 *  <p>The resource you attempted to access doesn't exist.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Too many requests have been made to the operation.</p>
 *
 * @throws {@link SESv2ServiceException}
 * <p>Base exception class for all service exceptions from SESv2 service.</p>
 *
 *
 * @public
 */
export declare class TestRenderEmailTemplateCommand extends TestRenderEmailTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: TestRenderEmailTemplateRequest;
            output: TestRenderEmailTemplateResponse;
        };
        sdk: {
            input: TestRenderEmailTemplateCommandInput;
            output: TestRenderEmailTemplateCommandOutput;
        };
    };
}
