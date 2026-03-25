import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListComputeQuotasRequest, ListComputeQuotasResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListComputeQuotasCommand}.
 */
export interface ListComputeQuotasCommandInput extends ListComputeQuotasRequest {
}
/**
 * @public
 *
 * The output of {@link ListComputeQuotasCommand}.
 */
export interface ListComputeQuotasCommandOutput extends ListComputeQuotasResponse, __MetadataBearer {
}
declare const ListComputeQuotasCommand_base: {
    new (input: ListComputeQuotasCommandInput): import("@smithy/smithy-client").CommandImpl<ListComputeQuotasCommandInput, ListComputeQuotasCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListComputeQuotasCommandInput]): import("@smithy/smithy-client").CommandImpl<ListComputeQuotasCommandInput, ListComputeQuotasCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List the resource allocation definitions.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListComputeQuotasCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListComputeQuotasCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListComputeQuotasRequest
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   Status: "Creating" || "CreateFailed" || "CreateRollbackFailed" || "Created" || "Updating" || "UpdateFailed" || "UpdateRollbackFailed" || "Updated" || "Deleting" || "DeleteFailed" || "DeleteRollbackFailed" || "Deleted",
 *   ClusterArn: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime" || "Status" || "ClusterArn",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListComputeQuotasCommand(input);
 * const response = await client.send(command);
 * // { // ListComputeQuotasResponse
 * //   ComputeQuotaSummaries: [ // ComputeQuotaSummaryList
 * //     { // ComputeQuotaSummary
 * //       ComputeQuotaArn: "STRING_VALUE", // required
 * //       ComputeQuotaId: "STRING_VALUE", // required
 * //       Name: "STRING_VALUE", // required
 * //       ComputeQuotaVersion: Number("int"),
 * //       Status: "Creating" || "CreateFailed" || "CreateRollbackFailed" || "Created" || "Updating" || "UpdateFailed" || "UpdateRollbackFailed" || "Updated" || "Deleting" || "DeleteFailed" || "DeleteRollbackFailed" || "Deleted", // required
 * //       ClusterArn: "STRING_VALUE",
 * //       ComputeQuotaConfig: { // ComputeQuotaConfig
 * //         ComputeQuotaResources: [ // ComputeQuotaResourceConfigList
 * //           { // ComputeQuotaResourceConfig
 * //             InstanceType: "ml.p4d.24xlarge" || "ml.p4de.24xlarge" || "ml.p5.48xlarge" || "ml.trn1.32xlarge" || "ml.trn1n.32xlarge" || "ml.g5.xlarge" || "ml.g5.2xlarge" || "ml.g5.4xlarge" || "ml.g5.8xlarge" || "ml.g5.12xlarge" || "ml.g5.16xlarge" || "ml.g5.24xlarge" || "ml.g5.48xlarge" || "ml.c5.large" || "ml.c5.xlarge" || "ml.c5.2xlarge" || "ml.c5.4xlarge" || "ml.c5.9xlarge" || "ml.c5.12xlarge" || "ml.c5.18xlarge" || "ml.c5.24xlarge" || "ml.c5n.large" || "ml.c5n.2xlarge" || "ml.c5n.4xlarge" || "ml.c5n.9xlarge" || "ml.c5n.18xlarge" || "ml.m5.large" || "ml.m5.xlarge" || "ml.m5.2xlarge" || "ml.m5.4xlarge" || "ml.m5.8xlarge" || "ml.m5.12xlarge" || "ml.m5.16xlarge" || "ml.m5.24xlarge" || "ml.t3.medium" || "ml.t3.large" || "ml.t3.xlarge" || "ml.t3.2xlarge" || "ml.g6.xlarge" || "ml.g6.2xlarge" || "ml.g6.4xlarge" || "ml.g6.8xlarge" || "ml.g6.16xlarge" || "ml.g6.12xlarge" || "ml.g6.24xlarge" || "ml.g6.48xlarge" || "ml.gr6.4xlarge" || "ml.gr6.8xlarge" || "ml.g6e.xlarge" || "ml.g6e.2xlarge" || "ml.g6e.4xlarge" || "ml.g6e.8xlarge" || "ml.g6e.16xlarge" || "ml.g6e.12xlarge" || "ml.g6e.24xlarge" || "ml.g6e.48xlarge" || "ml.p5e.48xlarge" || "ml.p5en.48xlarge" || "ml.trn2.48xlarge" || "ml.c6i.large" || "ml.c6i.xlarge" || "ml.c6i.2xlarge" || "ml.c6i.4xlarge" || "ml.c6i.8xlarge" || "ml.c6i.12xlarge" || "ml.c6i.16xlarge" || "ml.c6i.24xlarge" || "ml.c6i.32xlarge" || "ml.m6i.large" || "ml.m6i.xlarge" || "ml.m6i.2xlarge" || "ml.m6i.4xlarge" || "ml.m6i.8xlarge" || "ml.m6i.12xlarge" || "ml.m6i.16xlarge" || "ml.m6i.24xlarge" || "ml.m6i.32xlarge" || "ml.r6i.large" || "ml.r6i.xlarge" || "ml.r6i.2xlarge" || "ml.r6i.4xlarge" || "ml.r6i.8xlarge" || "ml.r6i.12xlarge" || "ml.r6i.16xlarge" || "ml.r6i.24xlarge" || "ml.r6i.32xlarge" || "ml.i3en.large" || "ml.i3en.xlarge" || "ml.i3en.2xlarge" || "ml.i3en.3xlarge" || "ml.i3en.6xlarge" || "ml.i3en.12xlarge" || "ml.i3en.24xlarge" || "ml.m7i.large" || "ml.m7i.xlarge" || "ml.m7i.2xlarge" || "ml.m7i.4xlarge" || "ml.m7i.8xlarge" || "ml.m7i.12xlarge" || "ml.m7i.16xlarge" || "ml.m7i.24xlarge" || "ml.m7i.48xlarge" || "ml.r7i.large" || "ml.r7i.xlarge" || "ml.r7i.2xlarge" || "ml.r7i.4xlarge" || "ml.r7i.8xlarge" || "ml.r7i.12xlarge" || "ml.r7i.16xlarge" || "ml.r7i.24xlarge" || "ml.r7i.48xlarge", // required
 * //             Count: Number("int"), // required
 * //           },
 * //         ],
 * //         ResourceSharingConfig: { // ResourceSharingConfig
 * //           Strategy: "Lend" || "DontLend" || "LendAndBorrow", // required
 * //           BorrowLimit: Number("int"),
 * //         },
 * //         PreemptTeamTasks: "Never" || "LowerPriority",
 * //       },
 * //       ComputeQuotaTarget: { // ComputeQuotaTarget
 * //         TeamName: "STRING_VALUE", // required
 * //         FairShareWeight: Number("int"),
 * //       },
 * //       ActivationState: "Enabled" || "Disabled",
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListComputeQuotasCommandInput - {@link ListComputeQuotasCommandInput}
 * @returns {@link ListComputeQuotasCommandOutput}
 * @see {@link ListComputeQuotasCommandInput} for command's `input` shape.
 * @see {@link ListComputeQuotasCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListComputeQuotasCommand extends ListComputeQuotasCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListComputeQuotasRequest;
            output: ListComputeQuotasResponse;
        };
        sdk: {
            input: ListComputeQuotasCommandInput;
            output: ListComputeQuotasCommandOutput;
        };
    };
}
