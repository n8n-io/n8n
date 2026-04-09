import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteClusterRequest, DeleteClusterResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteClusterCommand}.
 */
export interface DeleteClusterCommandInput extends DeleteClusterRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteClusterCommand}.
 */
export interface DeleteClusterCommandOutput extends DeleteClusterResponse, __MetadataBearer {
}
declare const DeleteClusterCommand_base: {
    new (input: DeleteClusterCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteClusterCommandInput, DeleteClusterCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteClusterCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteClusterCommandInput, DeleteClusterCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Delete a SageMaker HyperPod cluster.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteClusterCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteClusterCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteClusterRequest
 *   ClusterName: "STRING_VALUE", // required
 * };
 * const command = new DeleteClusterCommand(input);
 * const response = await client.send(command);
 * // { // DeleteClusterResponse
 * //   ClusterArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param DeleteClusterCommandInput - {@link DeleteClusterCommandInput}
 * @returns {@link DeleteClusterCommandOutput}
 * @see {@link DeleteClusterCommandInput} for command's `input` shape.
 * @see {@link DeleteClusterCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class DeleteClusterCommand extends DeleteClusterCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteClusterRequest;
            output: DeleteClusterResponse;
        };
        sdk: {
            input: DeleteClusterCommandInput;
            output: DeleteClusterCommandOutput;
        };
    };
}
