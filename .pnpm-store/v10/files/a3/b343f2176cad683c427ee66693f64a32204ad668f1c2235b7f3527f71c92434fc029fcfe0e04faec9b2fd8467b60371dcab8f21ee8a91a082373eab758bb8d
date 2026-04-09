import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DetachClusterNodeVolumeRequest, DetachClusterNodeVolumeResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DetachClusterNodeVolumeCommand}.
 */
export interface DetachClusterNodeVolumeCommandInput extends DetachClusterNodeVolumeRequest {
}
/**
 * @public
 *
 * The output of {@link DetachClusterNodeVolumeCommand}.
 */
export interface DetachClusterNodeVolumeCommandOutput extends DetachClusterNodeVolumeResponse, __MetadataBearer {
}
declare const DetachClusterNodeVolumeCommand_base: {
    new (input: DetachClusterNodeVolumeCommandInput): import("@smithy/smithy-client").CommandImpl<DetachClusterNodeVolumeCommandInput, DetachClusterNodeVolumeCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DetachClusterNodeVolumeCommandInput): import("@smithy/smithy-client").CommandImpl<DetachClusterNodeVolumeCommandInput, DetachClusterNodeVolumeCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p> Detaches your Amazon Elastic Block Store (Amazon EBS) volume from a node in your EKS orchestrated SageMaker HyperPod cluster.</p> <p> This API works with the Amazon Elastic Block Store (Amazon EBS) Container Storage Interface (CSI) driver to manage the lifecycle of persistent storage in your HyperPod EKS clusters. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DetachClusterNodeVolumeCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DetachClusterNodeVolumeCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DetachClusterNodeVolumeRequest
 *   ClusterArn: "STRING_VALUE", // required
 *   NodeId: "STRING_VALUE", // required
 *   VolumeId: "STRING_VALUE", // required
 * };
 * const command = new DetachClusterNodeVolumeCommand(input);
 * const response = await client.send(command);
 * // { // DetachClusterNodeVolumeResponse
 * //   ClusterArn: "STRING_VALUE", // required
 * //   NodeId: "STRING_VALUE", // required
 * //   VolumeId: "STRING_VALUE", // required
 * //   AttachTime: new Date("TIMESTAMP"), // required
 * //   Status: "attaching" || "attached" || "detaching" || "detached" || "busy", // required
 * //   DeviceName: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param DetachClusterNodeVolumeCommandInput - {@link DetachClusterNodeVolumeCommandInput}
 * @returns {@link DetachClusterNodeVolumeCommandOutput}
 * @see {@link DetachClusterNodeVolumeCommandInput} for command's `input` shape.
 * @see {@link DetachClusterNodeVolumeCommandOutput} for command's `response` shape.
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
export declare class DetachClusterNodeVolumeCommand extends DetachClusterNodeVolumeCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DetachClusterNodeVolumeRequest;
            output: DetachClusterNodeVolumeResponse;
        };
        sdk: {
            input: DetachClusterNodeVolumeCommandInput;
            output: DetachClusterNodeVolumeCommandOutput;
        };
    };
}
