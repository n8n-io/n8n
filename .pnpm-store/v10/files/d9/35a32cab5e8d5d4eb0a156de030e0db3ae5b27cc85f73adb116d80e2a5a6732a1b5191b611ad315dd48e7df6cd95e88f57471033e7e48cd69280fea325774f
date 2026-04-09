import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StartSessionRequest, StartSessionResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StartSessionCommand}.
 */
export interface StartSessionCommandInput extends StartSessionRequest {
}
/**
 * @public
 *
 * The output of {@link StartSessionCommand}.
 */
export interface StartSessionCommandOutput extends StartSessionResponse, __MetadataBearer {
}
declare const StartSessionCommand_base: {
    new (input: StartSessionCommandInput): import("@smithy/smithy-client").CommandImpl<StartSessionCommandInput, StartSessionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StartSessionCommandInput): import("@smithy/smithy-client").CommandImpl<StartSessionCommandInput, StartSessionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Initiates a remote connection session between a local integrated development environments (IDEs) and a remote SageMaker space.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StartSessionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StartSessionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StartSessionRequest
 *   ResourceIdentifier: "STRING_VALUE", // required
 * };
 * const command = new StartSessionCommand(input);
 * const response = await client.send(command);
 * // { // StartSessionResponse
 * //   SessionId: "STRING_VALUE",
 * //   StreamUrl: "STRING_VALUE",
 * //   TokenValue: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param StartSessionCommandInput - {@link StartSessionCommandInput}
 * @returns {@link StartSessionCommandOutput}
 * @see {@link StartSessionCommandInput} for command's `input` shape.
 * @see {@link StartSessionCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class StartSessionCommand extends StartSessionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StartSessionRequest;
            output: StartSessionResponse;
        };
        sdk: {
            input: StartSessionCommandInput;
            output: StartSessionCommandOutput;
        };
    };
}
