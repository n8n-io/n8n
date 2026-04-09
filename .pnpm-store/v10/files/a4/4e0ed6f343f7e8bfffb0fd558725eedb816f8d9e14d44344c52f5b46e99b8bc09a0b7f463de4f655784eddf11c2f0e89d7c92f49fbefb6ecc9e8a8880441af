import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteCompilationJobRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteCompilationJobCommand}.
 */
export interface DeleteCompilationJobCommandInput extends DeleteCompilationJobRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteCompilationJobCommand}.
 */
export interface DeleteCompilationJobCommandOutput extends __MetadataBearer {
}
declare const DeleteCompilationJobCommand_base: {
    new (input: DeleteCompilationJobCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteCompilationJobCommandInput, DeleteCompilationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteCompilationJobCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteCompilationJobCommandInput, DeleteCompilationJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the specified compilation job. This action deletes only the compilation job resource in Amazon SageMaker AI. It doesn't delete other resources that are related to that job, such as the model artifacts that the job creates, the compilation logs in CloudWatch, the compiled model, or the IAM role.</p> <p>You can delete a compilation job only if its current status is <code>COMPLETED</code>, <code>FAILED</code>, or <code>STOPPED</code>. If the job status is <code>STARTING</code> or <code>INPROGRESS</code>, stop the job, and then delete it after its status becomes <code>STOPPED</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteCompilationJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteCompilationJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteCompilationJobRequest
 *   CompilationJobName: "STRING_VALUE", // required
 * };
 * const command = new DeleteCompilationJobCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteCompilationJobCommandInput - {@link DeleteCompilationJobCommandInput}
 * @returns {@link DeleteCompilationJobCommandOutput}
 * @see {@link DeleteCompilationJobCommandInput} for command's `input` shape.
 * @see {@link DeleteCompilationJobCommandOutput} for command's `response` shape.
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
export declare class DeleteCompilationJobCommand extends DeleteCompilationJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteCompilationJobRequest;
            output: {};
        };
        sdk: {
            input: DeleteCompilationJobCommandInput;
            output: DeleteCompilationJobCommandOutput;
        };
    };
}
