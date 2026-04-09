import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteComputeQuotaRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteComputeQuotaCommand}.
 */
export interface DeleteComputeQuotaCommandInput extends DeleteComputeQuotaRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteComputeQuotaCommand}.
 */
export interface DeleteComputeQuotaCommandOutput extends __MetadataBearer {
}
declare const DeleteComputeQuotaCommand_base: {
    new (input: DeleteComputeQuotaCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteComputeQuotaCommandInput, DeleteComputeQuotaCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteComputeQuotaCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteComputeQuotaCommandInput, DeleteComputeQuotaCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the compute allocation from the cluster.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteComputeQuotaCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteComputeQuotaCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteComputeQuotaRequest
 *   ComputeQuotaId: "STRING_VALUE", // required
 * };
 * const command = new DeleteComputeQuotaCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteComputeQuotaCommandInput - {@link DeleteComputeQuotaCommandInput}
 * @returns {@link DeleteComputeQuotaCommandOutput}
 * @see {@link DeleteComputeQuotaCommandInput} for command's `input` shape.
 * @see {@link DeleteComputeQuotaCommandOutput} for command's `response` shape.
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
export declare class DeleteComputeQuotaCommand extends DeleteComputeQuotaCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteComputeQuotaRequest;
            output: {};
        };
        sdk: {
            input: DeleteComputeQuotaCommandInput;
            output: DeleteComputeQuotaCommandOutput;
        };
    };
}
