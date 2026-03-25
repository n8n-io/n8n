import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeHumanTaskUiRequest, DescribeHumanTaskUiResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeHumanTaskUiCommand}.
 */
export interface DescribeHumanTaskUiCommandInput extends DescribeHumanTaskUiRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeHumanTaskUiCommand}.
 */
export interface DescribeHumanTaskUiCommandOutput extends DescribeHumanTaskUiResponse, __MetadataBearer {
}
declare const DescribeHumanTaskUiCommand_base: {
    new (input: DescribeHumanTaskUiCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeHumanTaskUiCommandInput, DescribeHumanTaskUiCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeHumanTaskUiCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeHumanTaskUiCommandInput, DescribeHumanTaskUiCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about the requested human task user interface (worker task template).</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeHumanTaskUiCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeHumanTaskUiCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeHumanTaskUiRequest
 *   HumanTaskUiName: "STRING_VALUE", // required
 * };
 * const command = new DescribeHumanTaskUiCommand(input);
 * const response = await client.send(command);
 * // { // DescribeHumanTaskUiResponse
 * //   HumanTaskUiArn: "STRING_VALUE", // required
 * //   HumanTaskUiName: "STRING_VALUE", // required
 * //   HumanTaskUiStatus: "Active" || "Deleting",
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   UiTemplate: { // UiTemplateInfo
 * //     Url: "STRING_VALUE",
 * //     ContentSha256: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeHumanTaskUiCommandInput - {@link DescribeHumanTaskUiCommandInput}
 * @returns {@link DescribeHumanTaskUiCommandOutput}
 * @see {@link DescribeHumanTaskUiCommandInput} for command's `input` shape.
 * @see {@link DescribeHumanTaskUiCommandOutput} for command's `response` shape.
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
export declare class DescribeHumanTaskUiCommand extends DescribeHumanTaskUiCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeHumanTaskUiRequest;
            output: DescribeHumanTaskUiResponse;
        };
        sdk: {
            input: DescribeHumanTaskUiCommandInput;
            output: DescribeHumanTaskUiCommandOutput;
        };
    };
}
