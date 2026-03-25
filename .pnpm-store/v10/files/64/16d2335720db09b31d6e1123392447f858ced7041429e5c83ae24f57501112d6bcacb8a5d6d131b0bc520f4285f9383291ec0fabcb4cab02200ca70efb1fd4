import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTransformJobsRequest, ListTransformJobsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTransformJobsCommand}.
 */
export interface ListTransformJobsCommandInput extends ListTransformJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListTransformJobsCommand}.
 */
export interface ListTransformJobsCommandOutput extends ListTransformJobsResponse, __MetadataBearer {
}
declare const ListTransformJobsCommand_base: {
    new (input: ListTransformJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListTransformJobsCommandInput, ListTransformJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListTransformJobsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListTransformJobsCommandInput, ListTransformJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists transform jobs.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListTransformJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListTransformJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListTransformJobsRequest
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   StatusEquals: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListTransformJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListTransformJobsResponse
 * //   TransformJobSummaries: [ // TransformJobSummaries // required
 * //     { // TransformJobSummary
 * //       TransformJobName: "STRING_VALUE", // required
 * //       TransformJobArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       TransformEndTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       TransformJobStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped", // required
 * //       FailureReason: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListTransformJobsCommandInput - {@link ListTransformJobsCommandInput}
 * @returns {@link ListTransformJobsCommandOutput}
 * @see {@link ListTransformJobsCommandInput} for command's `input` shape.
 * @see {@link ListTransformJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListTransformJobsCommand extends ListTransformJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTransformJobsRequest;
            output: ListTransformJobsResponse;
        };
        sdk: {
            input: ListTransformJobsCommandInput;
            output: ListTransformJobsCommandOutput;
        };
    };
}
