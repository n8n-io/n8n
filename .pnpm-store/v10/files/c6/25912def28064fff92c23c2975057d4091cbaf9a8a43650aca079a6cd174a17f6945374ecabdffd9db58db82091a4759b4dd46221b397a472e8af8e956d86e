import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListCodeRepositoriesInput, ListCodeRepositoriesOutput } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListCodeRepositoriesCommand}.
 */
export interface ListCodeRepositoriesCommandInput extends ListCodeRepositoriesInput {
}
/**
 * @public
 *
 * The output of {@link ListCodeRepositoriesCommand}.
 */
export interface ListCodeRepositoriesCommandOutput extends ListCodeRepositoriesOutput, __MetadataBearer {
}
declare const ListCodeRepositoriesCommand_base: {
    new (input: ListCodeRepositoriesCommandInput): import("@smithy/smithy-client").CommandImpl<ListCodeRepositoriesCommandInput, ListCodeRepositoriesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListCodeRepositoriesCommandInput]): import("@smithy/smithy-client").CommandImpl<ListCodeRepositoriesCommandInput, ListCodeRepositoriesCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets a list of the Git repositories in your account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListCodeRepositoriesCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListCodeRepositoriesCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListCodeRepositoriesInput
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   NextToken: "STRING_VALUE",
 *   SortBy: "Name" || "CreationTime" || "LastModifiedTime",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListCodeRepositoriesCommand(input);
 * const response = await client.send(command);
 * // { // ListCodeRepositoriesOutput
 * //   CodeRepositorySummaryList: [ // CodeRepositorySummaryList // required
 * //     { // CodeRepositorySummary
 * //       CodeRepositoryName: "STRING_VALUE", // required
 * //       CodeRepositoryArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //       GitConfig: { // GitConfig
 * //         RepositoryUrl: "STRING_VALUE", // required
 * //         Branch: "STRING_VALUE",
 * //         SecretArn: "STRING_VALUE",
 * //       },
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListCodeRepositoriesCommandInput - {@link ListCodeRepositoriesCommandInput}
 * @returns {@link ListCodeRepositoriesCommandOutput}
 * @see {@link ListCodeRepositoriesCommandInput} for command's `input` shape.
 * @see {@link ListCodeRepositoriesCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListCodeRepositoriesCommand extends ListCodeRepositoriesCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListCodeRepositoriesInput;
            output: ListCodeRepositoriesOutput;
        };
        sdk: {
            input: ListCodeRepositoriesCommandInput;
            output: ListCodeRepositoriesCommandOutput;
        };
    };
}
