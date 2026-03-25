import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { RenderUiTemplateRequest, RenderUiTemplateResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RenderUiTemplateCommand}.
 */
export interface RenderUiTemplateCommandInput extends RenderUiTemplateRequest {
}
/**
 * @public
 *
 * The output of {@link RenderUiTemplateCommand}.
 */
export interface RenderUiTemplateCommandOutput extends RenderUiTemplateResponse, __MetadataBearer {
}
declare const RenderUiTemplateCommand_base: {
    new (input: RenderUiTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<RenderUiTemplateCommandInput, RenderUiTemplateCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RenderUiTemplateCommandInput): import("@smithy/smithy-client").CommandImpl<RenderUiTemplateCommandInput, RenderUiTemplateCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Renders the UI template so that you can preview the worker's experience. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, RenderUiTemplateCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, RenderUiTemplateCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // RenderUiTemplateRequest
 *   UiTemplate: { // UiTemplate
 *     Content: "STRING_VALUE", // required
 *   },
 *   Task: { // RenderableTask
 *     Input: "STRING_VALUE", // required
 *   },
 *   RoleArn: "STRING_VALUE", // required
 *   HumanTaskUiArn: "STRING_VALUE",
 * };
 * const command = new RenderUiTemplateCommand(input);
 * const response = await client.send(command);
 * // { // RenderUiTemplateResponse
 * //   RenderedContent: "STRING_VALUE", // required
 * //   Errors: [ // RenderingErrorList // required
 * //     { // RenderingError
 * //       Code: "STRING_VALUE", // required
 * //       Message: "STRING_VALUE", // required
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param RenderUiTemplateCommandInput - {@link RenderUiTemplateCommandInput}
 * @returns {@link RenderUiTemplateCommandOutput}
 * @see {@link RenderUiTemplateCommandInput} for command's `input` shape.
 * @see {@link RenderUiTemplateCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceNotFound} (client fault)
 *  <p>Resource being access is not found.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class RenderUiTemplateCommand extends RenderUiTemplateCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RenderUiTemplateRequest;
            output: RenderUiTemplateResponse;
        };
        sdk: {
            input: RenderUiTemplateCommandInput;
            output: RenderUiTemplateCommandOutput;
        };
    };
}
