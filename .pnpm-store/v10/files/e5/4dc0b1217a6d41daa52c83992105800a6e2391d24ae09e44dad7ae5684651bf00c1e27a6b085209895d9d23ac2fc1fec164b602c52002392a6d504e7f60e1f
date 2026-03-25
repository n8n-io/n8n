import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListEdgePackagingJobsRequest, ListEdgePackagingJobsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListEdgePackagingJobsCommand}.
 */
export interface ListEdgePackagingJobsCommandInput extends ListEdgePackagingJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListEdgePackagingJobsCommand}.
 */
export interface ListEdgePackagingJobsCommandOutput extends ListEdgePackagingJobsResponse, __MetadataBearer {
}
declare const ListEdgePackagingJobsCommand_base: {
    new (input: ListEdgePackagingJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListEdgePackagingJobsCommandInput, ListEdgePackagingJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListEdgePackagingJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListEdgePackagingJobsCommandInput, ListEdgePackagingJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a list of edge packaging jobs.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListEdgePackagingJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListEdgePackagingJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListEdgePackagingJobsRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   ModelNameContains: "STRING_VALUE",
 *   StatusEquals: "STARTING" || "INPROGRESS" || "COMPLETED" || "FAILED" || "STOPPING" || "STOPPED",
 *   SortBy: "NAME" || "MODEL_NAME" || "CREATION_TIME" || "LAST_MODIFIED_TIME" || "STATUS",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListEdgePackagingJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListEdgePackagingJobsResponse
 * //   EdgePackagingJobSummaries: [ // EdgePackagingJobSummaries // required
 * //     { // EdgePackagingJobSummary
 * //       EdgePackagingJobArn: "STRING_VALUE", // required
 * //       EdgePackagingJobName: "STRING_VALUE", // required
 * //       EdgePackagingJobStatus: "STARTING" || "INPROGRESS" || "COMPLETED" || "FAILED" || "STOPPING" || "STOPPED", // required
 * //       CompilationJobName: "STRING_VALUE",
 * //       ModelName: "STRING_VALUE",
 * //       ModelVersion: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListEdgePackagingJobsCommandInput - {@link ListEdgePackagingJobsCommandInput}
 * @returns {@link ListEdgePackagingJobsCommandOutput}
 * @see {@link ListEdgePackagingJobsCommandInput} for command's `input` shape.
 * @see {@link ListEdgePackagingJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListEdgePackagingJobsCommand extends ListEdgePackagingJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListEdgePackagingJobsRequest;
            output: ListEdgePackagingJobsResponse;
        };
        sdk: {
            input: ListEdgePackagingJobsCommandInput;
            output: ListEdgePackagingJobsCommandOutput;
        };
    };
}
