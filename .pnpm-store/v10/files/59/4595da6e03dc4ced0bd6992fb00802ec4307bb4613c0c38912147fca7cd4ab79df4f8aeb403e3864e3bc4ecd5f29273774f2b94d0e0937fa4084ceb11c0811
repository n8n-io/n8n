import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListLineageGroupsRequest, ListLineageGroupsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListLineageGroupsCommand}.
 */
export interface ListLineageGroupsCommandInput extends ListLineageGroupsRequest {
}
/**
 * @public
 *
 * The output of {@link ListLineageGroupsCommand}.
 */
export interface ListLineageGroupsCommandOutput extends ListLineageGroupsResponse, __MetadataBearer {
}
declare const ListLineageGroupsCommand_base: {
    new (input: ListLineageGroupsCommandInput): import("@smithy/smithy-client").CommandImpl<ListLineageGroupsCommandInput, ListLineageGroupsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListLineageGroupsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListLineageGroupsCommandInput, ListLineageGroupsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>A list of lineage groups shared with your Amazon Web Services account. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/xaccount-lineage-tracking.html"> Cross-Account Lineage Tracking </a> in the <i>Amazon SageMaker Developer Guide</i>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListLineageGroupsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListLineageGroupsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListLineageGroupsRequest
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 * };
 * const command = new ListLineageGroupsCommand(input);
 * const response = await client.send(command);
 * // { // ListLineageGroupsResponse
 * //   LineageGroupSummaries: [ // LineageGroupSummaries
 * //     { // LineageGroupSummary
 * //       LineageGroupArn: "STRING_VALUE",
 * //       LineageGroupName: "STRING_VALUE",
 * //       DisplayName: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListLineageGroupsCommandInput - {@link ListLineageGroupsCommandInput}
 * @returns {@link ListLineageGroupsCommandOutput}
 * @see {@link ListLineageGroupsCommandInput} for command's `input` shape.
 * @see {@link ListLineageGroupsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListLineageGroupsCommand extends ListLineageGroupsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListLineageGroupsRequest;
            output: ListLineageGroupsResponse;
        };
        sdk: {
            input: ListLineageGroupsCommandInput;
            output: ListLineageGroupsCommandOutput;
        };
    };
}
