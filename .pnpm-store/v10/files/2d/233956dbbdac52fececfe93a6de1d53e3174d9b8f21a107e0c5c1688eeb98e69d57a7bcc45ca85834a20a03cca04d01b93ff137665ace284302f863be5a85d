import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateClusterSchedulerConfigRequest, CreateClusterSchedulerConfigResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateClusterSchedulerConfigCommand}.
 */
export interface CreateClusterSchedulerConfigCommandInput extends CreateClusterSchedulerConfigRequest {
}
/**
 * @public
 *
 * The output of {@link CreateClusterSchedulerConfigCommand}.
 */
export interface CreateClusterSchedulerConfigCommandOutput extends CreateClusterSchedulerConfigResponse, __MetadataBearer {
}
declare const CreateClusterSchedulerConfigCommand_base: {
    new (input: CreateClusterSchedulerConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateClusterSchedulerConfigCommandInput, CreateClusterSchedulerConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateClusterSchedulerConfigCommandInput): import("@smithy/smithy-client").CommandImpl<CreateClusterSchedulerConfigCommandInput, CreateClusterSchedulerConfigCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create cluster policy configuration. This policy is used for task prioritization and fair-share allocation of idle compute. This helps prioritize critical workloads and distributes idle compute across entities.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateClusterSchedulerConfigCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateClusterSchedulerConfigCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateClusterSchedulerConfigRequest
 *   Name: "STRING_VALUE", // required
 *   ClusterArn: "STRING_VALUE", // required
 *   SchedulerConfig: { // SchedulerConfig
 *     PriorityClasses: [ // PriorityClassList
 *       { // PriorityClass
 *         Name: "STRING_VALUE", // required
 *         Weight: Number("int"), // required
 *       },
 *     ],
 *     FairShare: "Enabled" || "Disabled",
 *   },
 *   Description: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateClusterSchedulerConfigCommand(input);
 * const response = await client.send(command);
 * // { // CreateClusterSchedulerConfigResponse
 * //   ClusterSchedulerConfigArn: "STRING_VALUE", // required
 * //   ClusterSchedulerConfigId: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateClusterSchedulerConfigCommandInput - {@link CreateClusterSchedulerConfigCommandInput}
 * @returns {@link CreateClusterSchedulerConfigCommandOutput}
 * @see {@link CreateClusterSchedulerConfigCommandInput} for command's `input` shape.
 * @see {@link CreateClusterSchedulerConfigCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class CreateClusterSchedulerConfigCommand extends CreateClusterSchedulerConfigCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateClusterSchedulerConfigRequest;
            output: CreateClusterSchedulerConfigResponse;
        };
        sdk: {
            input: CreateClusterSchedulerConfigCommandInput;
            output: CreateClusterSchedulerConfigCommandOutput;
        };
    };
}
