import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListModelPackagesInput, ListModelPackagesOutput } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListModelPackagesCommand}.
 */
export interface ListModelPackagesCommandInput extends ListModelPackagesInput {
}
/**
 * @public
 *
 * The output of {@link ListModelPackagesCommand}.
 */
export interface ListModelPackagesCommandOutput extends ListModelPackagesOutput, __MetadataBearer {
}
declare const ListModelPackagesCommand_base: {
    new (input: ListModelPackagesCommandInput): import("@smithy/smithy-client").CommandImpl<ListModelPackagesCommandInput, ListModelPackagesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListModelPackagesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListModelPackagesCommandInput, ListModelPackagesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the model packages that have been created.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListModelPackagesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListModelPackagesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListModelPackagesInput
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   ModelApprovalStatus: "Approved" || "Rejected" || "PendingManualApproval",
 *   ModelPackageGroupName: "STRING_VALUE",
 *   ModelPackageType: "Versioned" || "Unversioned" || "Both",
 *   NextToken: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListModelPackagesCommand(input);
 * const response = await client.send(command);
 * // { // ListModelPackagesOutput
 * //   ModelPackageSummaryList: [ // ModelPackageSummaryList // required
 * //     { // ModelPackageSummary
 * //       ModelPackageName: "STRING_VALUE",
 * //       ModelPackageGroupName: "STRING_VALUE",
 * //       ModelPackageVersion: Number("int"),
 * //       ModelPackageArn: "STRING_VALUE", // required
 * //       ModelPackageDescription: "STRING_VALUE",
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       ModelPackageStatus: "Pending" || "InProgress" || "Completed" || "Failed" || "Deleting", // required
 * //       ModelApprovalStatus: "Approved" || "Rejected" || "PendingManualApproval",
 * //       ModelLifeCycle: { // ModelLifeCycle
 * //         Stage: "STRING_VALUE", // required
 * //         StageStatus: "STRING_VALUE", // required
 * //         StageDescription: "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListModelPackagesCommandInput - {@link ListModelPackagesCommandInput}
 * @returns {@link ListModelPackagesCommandOutput}
 * @see {@link ListModelPackagesCommandInput} for command's `input` shape.
 * @see {@link ListModelPackagesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListModelPackagesCommand extends ListModelPackagesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListModelPackagesInput;
            output: ListModelPackagesOutput;
        };
        sdk: {
            input: ListModelPackagesCommandInput;
            output: ListModelPackagesCommandOutput;
        };
    };
}
