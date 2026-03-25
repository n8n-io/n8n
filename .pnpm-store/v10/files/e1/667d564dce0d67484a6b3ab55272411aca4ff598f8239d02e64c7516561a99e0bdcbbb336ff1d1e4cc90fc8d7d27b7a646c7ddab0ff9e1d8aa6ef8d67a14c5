import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListActionsRequest, ListActionsResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListActionsCommand}.
 */
export interface ListActionsCommandInput extends ListActionsRequest {
}
/**
 * @public
 *
 * The output of {@link ListActionsCommand}.
 */
export interface ListActionsCommandOutput extends ListActionsResponse, __MetadataBearer {
}
declare const ListActionsCommand_base: {
    new (input: ListActionsCommandInput): import("@smithy/smithy-client").CommandImpl<ListActionsCommandInput, ListActionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListActionsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListActionsCommandInput, ListActionsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the actions in your account and their properties.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListActionsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListActionsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListActionsRequest
 *   SourceUri: "STRING_VALUE",
 *   ActionType: "STRING_VALUE",
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListActionsCommand(input);
 * const response = await client.send(command);
 * // { // ListActionsResponse
 * //   ActionSummaries: [ // ActionSummaries
 * //     { // ActionSummary
 * //       ActionArn: "STRING_VALUE",
 * //       ActionName: "STRING_VALUE",
 * //       Source: { // ActionSource
 * //         SourceUri: "STRING_VALUE", // required
 * //         SourceType: "STRING_VALUE",
 * //         SourceId: "STRING_VALUE",
 * //       },
 * //       ActionType: "STRING_VALUE",
 * //       Status: "Unknown" || "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListActionsCommandInput - {@link ListActionsCommandInput}
 * @returns {@link ListActionsCommandOutput}
 * @see {@link ListActionsCommandInput} for command's `input` shape.
 * @see {@link ListActionsCommandOutput} for command's `response` shape.
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
export declare class ListActionsCommand extends ListActionsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListActionsRequest;
            output: ListActionsResponse;
        };
        sdk: {
            input: ListActionsCommandInput;
            output: ListActionsCommandOutput;
        };
    };
}
