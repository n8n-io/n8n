import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteClusterSchedulerConfigRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteClusterSchedulerConfigCommand}.
 */
export interface DeleteClusterSchedulerConfigCommandInput extends DeleteClusterSchedulerConfigRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteClusterSchedulerConfigCommand}.
 */
export interface DeleteClusterSchedulerConfigCommandOutput extends __MetadataBearer {
}
declare const DeleteClusterSchedulerConfigCommand_base: {
    new (input: DeleteClusterSchedulerConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteClusterSchedulerConfigCommandInput, DeleteClusterSchedulerConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteClusterSchedulerConfigCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteClusterSchedulerConfigCommandInput, DeleteClusterSchedulerConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes the cluster policy of the cluster.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteClusterSchedulerConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteClusterSchedulerConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteClusterSchedulerConfigRequest
 *   ClusterSchedulerConfigId: "STRING_VALUE", // required
 * };
 * const command = new DeleteClusterSchedulerConfigCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteClusterSchedulerConfigCommandInput - {@link DeleteClusterSchedulerConfigCommandInput}
 * @returns {@link DeleteClusterSchedulerConfigCommandOutput}
 * @see {@link DeleteClusterSchedulerConfigCommandInput} for command's `input` shape.
 * @see {@link DeleteClusterSchedulerConfigCommandOutput} for command's `response` shape.
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
export declare class DeleteClusterSchedulerConfigCommand extends DeleteClusterSchedulerConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteClusterSchedulerConfigRequest;
            output: {};
        };
        sdk: {
            input: DeleteClusterSchedulerConfigCommandInput;
            output: DeleteClusterSchedulerConfigCommandOutput;
        };
    };
}
