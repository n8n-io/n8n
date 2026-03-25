import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateHumanTaskUiRequest, CreateHumanTaskUiResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateHumanTaskUiCommand}.
 */
export interface CreateHumanTaskUiCommandInput extends CreateHumanTaskUiRequest {
}
/**
 * @public
 *
 * The output of {@link CreateHumanTaskUiCommand}.
 */
export interface CreateHumanTaskUiCommandOutput extends CreateHumanTaskUiResponse, __MetadataBearer {
}
declare const CreateHumanTaskUiCommand_base: {
    new (input: CreateHumanTaskUiCommandInput): import("@smithy/smithy-client").CommandImpl<CreateHumanTaskUiCommandInput, CreateHumanTaskUiCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateHumanTaskUiCommandInput): import("@smithy/smithy-client").CommandImpl<CreateHumanTaskUiCommandInput, CreateHumanTaskUiCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Defines the settings you will use for the human review workflow user interface. Reviewers will see a three-panel interface with an instruction area, the item to review, and an input area.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateHumanTaskUiCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateHumanTaskUiCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateHumanTaskUiRequest
 *   HumanTaskUiName: "STRING_VALUE", // required
 *   UiTemplate: { // UiTemplate
 *     Content: "STRING_VALUE", // required
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateHumanTaskUiCommand(input);
 * const response = await client.send(command);
 * // { // CreateHumanTaskUiResponse
 * //   HumanTaskUiArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateHumanTaskUiCommandInput - {@link CreateHumanTaskUiCommandInput}
 * @returns {@link CreateHumanTaskUiCommandOutput}
 * @see {@link CreateHumanTaskUiCommandInput} for command's `input` shape.
 * @see {@link CreateHumanTaskUiCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class CreateHumanTaskUiCommand extends CreateHumanTaskUiCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateHumanTaskUiRequest;
            output: CreateHumanTaskUiResponse;
        };
        sdk: {
            input: CreateHumanTaskUiCommandInput;
            output: CreateHumanTaskUiCommandOutput;
        };
    };
}
