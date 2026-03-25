import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateComputeQuotaRequest, CreateComputeQuotaResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateComputeQuotaCommand}.
 */
export interface CreateComputeQuotaCommandInput extends CreateComputeQuotaRequest {
}
/**
 * @public
 *
 * The output of {@link CreateComputeQuotaCommand}.
 */
export interface CreateComputeQuotaCommandOutput extends CreateComputeQuotaResponse, __MetadataBearer {
}
declare const CreateComputeQuotaCommand_base: {
    new (input: CreateComputeQuotaCommandInput): import("@smithy/smithy-client").CommandImpl<CreateComputeQuotaCommandInput, CreateComputeQuotaCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateComputeQuotaCommandInput): import("@smithy/smithy-client").CommandImpl<CreateComputeQuotaCommandInput, CreateComputeQuotaCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Create compute allocation definition. This defines how compute is allocated, shared, and borrowed for specified entities. Specifically, how to lend and borrow idle compute and assign a fair-share weight to the specified entities.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateComputeQuotaCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateComputeQuotaCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateComputeQuotaRequest
 *   Name: "STRING_VALUE", // required
 *   Description: "STRING_VALUE",
 *   ClusterArn: "STRING_VALUE", // required
 *   ComputeQuotaConfig: { // ComputeQuotaConfig
 *     ComputeQuotaResources: [ // ComputeQuotaResourceConfigList
 *       { // ComputeQuotaResourceConfig
 *         InstanceType: "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.c5n.large" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.gr6.4xlarge" || "ml.gr6.8xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.trn2.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.i3en.large" || "ml.i3en.xlarge" || "ml.i3en.2xlarge" || "ml.i3en.3xlarge" || "ml.i3en.6xlarge" || "ml.i3en.12xlarge" || "ml.i3en.24xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge", // required
 *         Count: Number("int"), // required
 *       },
 *     ],
 *     ResourceSharingConfig: { // ResourceSharingConfig
 *       Strategy: "Lend" || "DontLend" || "LendAndBorrow", // required
 *       BorrowLimit: Number("int"),
 *     },
 *     PreemptTeamTasks: "Never" || "LowerPriority",
 *   },
 *   ComputeQuotaTarget: { // ComputeQuotaTarget
 *     TeamName: "STRING_VALUE", // required
 *     FairShareWeight: Number("int"),
 *   },
 *   ActivationState: "Enabled" || "Disabled",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateComputeQuotaCommand(input);
 * const response = await client.send(command);
 * // { // CreateComputeQuotaResponse
 * //   ComputeQuotaArn: "STRING_VALUE", // required
 * //   ComputeQuotaId: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateComputeQuotaCommandInput - {@link CreateComputeQuotaCommandInput}
 * @returns {@link CreateComputeQuotaCommandOutput}
 * @see {@link CreateComputeQuotaCommandInput} for command's `input` shape.
 * @see {@link CreateComputeQuotaCommandOutput} for command's `response` shape.
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
export declare class CreateComputeQuotaCommand extends CreateComputeQuotaCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateComputeQuotaRequest;
            output: CreateComputeQuotaResponse;
        };
        sdk: {
            input: CreateComputeQuotaCommandInput;
            output: CreateComputeQuotaCommandOutput;
        };
    };
}
