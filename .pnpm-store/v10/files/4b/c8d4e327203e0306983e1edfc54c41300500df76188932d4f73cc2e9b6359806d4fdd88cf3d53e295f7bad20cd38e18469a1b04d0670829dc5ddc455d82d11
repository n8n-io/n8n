import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListTrialComponentsRequest, ListTrialComponentsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListTrialComponentsCommand}.
 */
export interface ListTrialComponentsCommandInput extends ListTrialComponentsRequest {
}
/**
 * @public
 *
 * The output of {@link ListTrialComponentsCommand}.
 */
export interface ListTrialComponentsCommandOutput extends ListTrialComponentsResponse, __MetadataBearer {
}
declare const ListTrialComponentsCommand_base: {
    new (input: ListTrialComponentsCommandInput): import("@smithy/smithy-client").CommandImpl<ListTrialComponentsCommandInput, ListTrialComponentsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListTrialComponentsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListTrialComponentsCommandInput, ListTrialComponentsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the trial components in your account. You can sort the list by trial component name or creation time. You can filter the list to show only components that were created in a specific time range. You can also filter on one of the following:</p> <ul> <li> <p> <code>ExperimentName</code> </p> </li> <li> <p> <code>SourceArn</code> </p> </li> <li> <p> <code>TrialName</code> </p> </li> </ul>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListTrialComponentsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListTrialComponentsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListTrialComponentsRequest
 *   ExperimentName: "STRING_VALUE",
 *   TrialName: "STRING_VALUE",
 *   SourceArn: "STRING_VALUE",
 *   CreatedAfter: new Date("TIMESTAMP"),
 *   CreatedBefore: new Date("TIMESTAMP"),
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListTrialComponentsCommand(input);
 * const response = await client.send(command);
 * // { // ListTrialComponentsResponse
 * //   TrialComponentSummaries: [ // TrialComponentSummaries
 * //     { // TrialComponentSummary
 * //       TrialComponentName: "STRING_VALUE",
 * //       TrialComponentArn: "STRING_VALUE",
 * //       DisplayName: "STRING_VALUE",
 * //       TrialComponentSource: { // TrialComponentSource
 * //         SourceArn: "STRING_VALUE", // required
 * //         SourceType: "STRING_VALUE",
 * //       },
 * //       Status: { // TrialComponentStatus
 * //         PrimaryStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 * //         Message: "STRING_VALUE",
 * //       },
 * //       StartTime: new Date("TIMESTAMP"),
 * //       EndTime: new Date("TIMESTAMP"),
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       CreatedBy: { // UserContext
 * //         UserProfileArn: "STRING_VALUE",
 * //         UserProfileName: "STRING_VALUE",
 * //         DomainId: "STRING_VALUE",
 * //         IamIdentity: { // IamIdentity
 * //           Arn: "STRING_VALUE",
 * //           PrincipalId: "STRING_VALUE",
 * //           SourceIdentity: "STRING_VALUE",
 * //         },
 * //       },
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //       LastModifiedBy: {
 * //         UserProfileArn: "STRING_VALUE",
 * //         UserProfileName: "STRING_VALUE",
 * //         DomainId: "STRING_VALUE",
 * //         IamIdentity: {
 * //           Arn: "STRING_VALUE",
 * //           PrincipalId: "STRING_VALUE",
 * //           SourceIdentity: "STRING_VALUE",
 * //         },
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListTrialComponentsCommandInput - {@link ListTrialComponentsCommandInput}
 * @returns {@link ListTrialComponentsCommandOutput}
 * @see {@link ListTrialComponentsCommandInput} for command's `input` shape.
 * @see {@link ListTrialComponentsCommandOutput} for command's `response` shape.
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
export declare class ListTrialComponentsCommand extends ListTrialComponentsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListTrialComponentsRequest;
            output: ListTrialComponentsResponse;
        };
        sdk: {
            input: ListTrialComponentsCommandInput;
            output: ListTrialComponentsCommandOutput;
        };
    };
}
