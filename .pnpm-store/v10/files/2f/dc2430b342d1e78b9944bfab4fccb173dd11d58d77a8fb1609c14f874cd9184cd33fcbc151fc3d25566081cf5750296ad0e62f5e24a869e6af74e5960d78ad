import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListOptimizationJobsRequest, ListOptimizationJobsResponse } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListOptimizationJobsCommand}.
 */
export interface ListOptimizationJobsCommandInput extends ListOptimizationJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListOptimizationJobsCommand}.
 */
export interface ListOptimizationJobsCommandOutput extends ListOptimizationJobsResponse, __MetadataBearer {
}
declare const ListOptimizationJobsCommand_base: {
    new (input: ListOptimizationJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListOptimizationJobsCommandInput, ListOptimizationJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListOptimizationJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListOptimizationJobsCommandInput, ListOptimizationJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the optimization jobs in your account and their properties.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListOptimizationJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListOptimizationJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListOptimizationJobsRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   OptimizationContains: "STRING_VALUE",
 *   NameContains: "STRING_VALUE",
 *   StatusEquals: "INPROGRESS" || "COMPLETED" || "FAILED" || "STARTING" || "STOPPING" || "STOPPED",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListOptimizationJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListOptimizationJobsResponse
 * //   OptimizationJobSummaries: [ // OptimizationJobSummaries // required
 * //     { // OptimizationJobSummary
 * //       OptimizationJobName: "STRING_VALUE", // required
 * //       OptimizationJobArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       OptimizationJobStatus: "INPROGRESS" || "COMPLETED" || "FAILED" || "STARTING" || "STOPPING" || "STOPPED", // required
 * //       OptimizationStartTime: new Date("TIMESTAMP"),
 * //       OptimizationEndTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       DeploymentInstanceType: "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.12xlarge" || "ml.g6.16xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.12xlarge" || "ml.g6e.16xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.inf2.xlarge" || "ml.inf2.8xlarge" || "ml.inf2.24xlarge" || "ml.inf2.48xlarge" || "ml.trn1.2xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge", // required
 * //       MaxInstanceCount: Number("int"),
 * //       OptimizationTypes: [ // OptimizationTypes // required
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListOptimizationJobsCommandInput - {@link ListOptimizationJobsCommandInput}
 * @returns {@link ListOptimizationJobsCommandOutput}
 * @see {@link ListOptimizationJobsCommandInput} for command's `input` shape.
 * @see {@link ListOptimizationJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListOptimizationJobsCommand extends ListOptimizationJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListOptimizationJobsRequest;
            output: ListOptimizationJobsResponse;
        };
        sdk: {
            input: ListOptimizationJobsCommandInput;
            output: ListOptimizationJobsCommandOutput;
        };
    };
}
