import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { ListModelPackageGroupsInput, ListModelPackageGroupsOutput } from "../models/models_3";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelPackageGroupsCommand}.
 */
export interface ListModelPackageGroupsCommandInput extends ListModelPackageGroupsInput {
}
/**
 * @public
 *
 * The output of {@link ListModelPackageGroupsCommand}.
 */
export interface ListModelPackageGroupsCommandOutput extends ListModelPackageGroupsOutput, __MetadataBearer {
}
declare const ListModelPackageGroupsCommand_base: {
    new (input: ListModelPackageGroupsCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelPackageGroupsCommandInput, ListModelPackageGroupsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListModelPackageGroupsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListModelPackageGroupsCommandInput, ListModelPackageGroupsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of the model groups in your Amazon Web Services account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelPackageGroupsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelPackageGroupsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // ListModelPackageGroupsInput
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   NextToken: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 *   CrossAccountFilterOption: "SameAccount" || "CrossAccount",
 * };
 * const command = new ListModelPackageGroupsCommand(input);
 * const response = await client.send(command);
 * // { // ListModelPackageGroupsOutput
 * //   ModelPackageGroupSummaryList: [ // ModelPackageGroupSummaryList // required
 * //     { // ModelPackageGroupSummary
 * //       ModelPackageGroupName: "STRING_VALUE", // required
 * //       ModelPackageGroupArn: "STRING_VALUE", // required
 * //       ModelPackageGroupDescription: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       ModelPackageGroupStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting" || "DeleteFailed", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelPackageGroupsCommandInput - {@link ListModelPackageGroupsCommandInput}
 * @returns {@link ListModelPackageGroupsCommandOutput}
 * @see {@link ListModelPackageGroupsCommandInput} for command's `input` shape.
 * @see {@link ListModelPackageGroupsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelPackageGroupsCommand extends ListModelPackageGroupsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelPackageGroupsInput;
            output: ListModelPackageGroupsOutput;
        };
        sdk: {
            input: ListModelPackageGroupsCommandInput;
            output: ListModelPackageGroupsCommandOutput;
        };
    };
}
