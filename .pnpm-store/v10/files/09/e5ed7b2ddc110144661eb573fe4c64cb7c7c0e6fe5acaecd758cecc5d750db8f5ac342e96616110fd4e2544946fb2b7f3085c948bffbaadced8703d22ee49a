import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { StopCompilationJobRequest } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopCompilationJobCommand}.
 */
export interface StopCompilationJobCommandInput extends StopCompilationJobRequest {
}
/**
 * @public
 *
 * The output of {@link StopCompilationJobCommand}.
 */
export interface StopCompilationJobCommandOutput extends __MetadataBearer {
}
declare const StopCompilationJobCommand_base: {
    new (input: StopCompilationJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopCompilationJobCommandInput, StopCompilationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopCompilationJobCommandInput): import("@smithy/smithy-client").CommandImpl<StopCompilationJobCommandInput, StopCompilationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Stops a model compilation job.</p> <p> To stop a job, Amazon SageMaker AI sends the algorithm the SIGTERM signal. This gracefully shuts the job down. If the job hasn't stopped, it sends the SIGKILL signal.</p> <p>When it receives a <code>StopCompilationJob</code> request, Amazon SageMaker AI changes the <code>CompilationJobStatus</code> of the job to <code>Stopping</code>. After Amazon SageMaker stops the job, it sets the <code>CompilationJobStatus</code> to <code>Stopped</code>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, StopCompilationJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, StopCompilationJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // StopCompilationJobRequest
 *   CompilationJobName: "STRING_VALUE", // required
 * };
 * const command = new StopCompilationJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param StopCompilationJobCommandInput - {@link StopCompilationJobCommandInput}
 * @returns {@link StopCompilationJobCommandOutput}
 * @see {@link StopCompilationJobCommandInput} for command's `input` shape.
 * @see {@link StopCompilationJobCommandOutput} for command's `response` shape.
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
export declare class StopCompilationJobCommand extends StopCompilationJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopCompilationJobRequest;
            output: {};
        };
        sdk: {
            input: StopCompilationJobCommandInput;
            output: StopCompilationJobCommandOutput;
        };
    };
}
