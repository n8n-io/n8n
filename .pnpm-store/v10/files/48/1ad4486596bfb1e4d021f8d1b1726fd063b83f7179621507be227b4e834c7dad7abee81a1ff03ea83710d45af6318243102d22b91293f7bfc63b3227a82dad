import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListModelCardExportJobsRequest, ListModelCardExportJobsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelCardExportJobsCommand}.
 */
export interface ListModelCardExportJobsCommandInput extends ListModelCardExportJobsRequest {
}
/**
 * @public
 *
 * The output of {@link ListModelCardExportJobsCommand}.
 */
export interface ListModelCardExportJobsCommandOutput extends ListModelCardExportJobsResponse, __MetadataBearer {
}
declare const ListModelCardExportJobsCommand_base: {
    new (input: ListModelCardExportJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelCardExportJobsCommandInput, ListModelCardExportJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListModelCardExportJobsCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelCardExportJobsCommandInput, ListModelCardExportJobsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List the export jobs for the Amazon SageMaker Model Card.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelCardExportJobsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelCardExportJobsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListModelCardExportJobsRequest
 *   ModelCardName: "STRING_VALUE", // required
 *   ModelCardVersion: Number("int"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   ModelCardExportJobNameContains: "STRING_VALUE",
 *   StatusEquals: "InProgress" || "Completed" || "Failed",
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListModelCardExportJobsCommand(input);
 * const response = await client.send(command);
 * // { // ListModelCardExportJobsResponse
 * //   ModelCardExportJobSummaries: [ // ModelCardExportJobSummaryList // required
 * //     { // ModelCardExportJobSummary
 * //       ModelCardExportJobName: "STRING_VALUE", // required
 * //       ModelCardExportJobArn: "STRING_VALUE", // required
 * //       Status: "InProgress" || "Completed" || "Failed", // required
 * //       ModelCardName: "STRING_VALUE", // required
 * //       ModelCardVersion: Number("int"), // required
 * //       CreatedAt: new Date("TIMESTAMP"), // required
 * //       LastModifiedAt: new Date("TIMESTAMP"), // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelCardExportJobsCommandInput - {@link ListModelCardExportJobsCommandInput}
 * @returns {@link ListModelCardExportJobsCommandOutput}
 * @see {@link ListModelCardExportJobsCommandInput} for command's `input` shape.
 * @see {@link ListModelCardExportJobsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelCardExportJobsCommand extends ListModelCardExportJobsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelCardExportJobsRequest;
            output: ListModelCardExportJobsResponse;
        };
        sdk: {
            input: ListModelCardExportJobsCommandInput;
            output: ListModelCardExportJobsCommandOutput;
        };
    };
}
