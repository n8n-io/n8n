import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListFeatureGroupsRequest, ListFeatureGroupsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListFeatureGroupsCommand}.
 */
export interface ListFeatureGroupsCommandInput extends ListFeatureGroupsRequest {
}
/**
 * @public
 *
 * The output of {@link ListFeatureGroupsCommand}.
 */
export interface ListFeatureGroupsCommandOutput extends ListFeatureGroupsResponse, __MetadataBearer {
}
declare const ListFeatureGroupsCommand_base: {
    new (input: ListFeatureGroupsCommandInput): import("@smithy/smithy-client").CommandImpl<ListFeatureGroupsCommandInput, ListFeatureGroupsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListFeatureGroupsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListFeatureGroupsCommandInput, ListFeatureGroupsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>List <code>FeatureGroup</code>s based on given filter and order.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListFeatureGroupsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListFeatureGroupsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListFeatureGroupsRequest
 *   NameContains: "STRING_VALUE",
 *   FeatureGroupStatusEquals: "Creating" || "Created" || "CreateFailed" || "Deleting" || "DeleteFailed",
 *   OfflineStoreStatusEquals: "Active" || "Blocked" || "Disabled",
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   SortOrder: "Ascending" || "Descending",
 *   SortBy: "Name" || "FeatureGroupStatus" || "OfflineStoreStatus" || "CreationTime",
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListFeatureGroupsCommand(input);
 * const response = await client.send(command);
 * // { // ListFeatureGroupsResponse
 * //   FeatureGroupSummaries: [ // FeatureGroupSummaries // required
 * //     { // FeatureGroupSummary
 * //       FeatureGroupName: "STRING_VALUE", // required
 * //       FeatureGroupArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       FeatureGroupStatus: "Creating" || "Created" || "CreateFailed" || "Deleting" || "DeleteFailed",
 * //       OfflineStoreStatus: { // OfflineStoreStatus
 * //         Status: "Active" || "Blocked" || "Disabled", // required
 * //         BlockedReason: "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListFeatureGroupsCommandInput - {@link ListFeatureGroupsCommandInput}
 * @returns {@link ListFeatureGroupsCommandOutput}
 * @see {@link ListFeatureGroupsCommandInput} for command's `input` shape.
 * @see {@link ListFeatureGroupsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListFeatureGroupsCommand extends ListFeatureGroupsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListFeatureGroupsRequest;
            output: ListFeatureGroupsResponse;
        };
        sdk: {
            input: ListFeatureGroupsCommandInput;
            output: ListFeatureGroupsCommandOutput;
        };
    };
}
