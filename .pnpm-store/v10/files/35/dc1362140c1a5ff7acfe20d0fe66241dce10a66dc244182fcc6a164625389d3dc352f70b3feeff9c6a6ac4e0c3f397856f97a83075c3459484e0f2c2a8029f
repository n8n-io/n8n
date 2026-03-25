import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListPartnerAppsRequest, ListPartnerAppsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListPartnerAppsCommand}.
 */
export interface ListPartnerAppsCommandInput extends ListPartnerAppsRequest {
}
/**
 * @public
 *
 * The output of {@link ListPartnerAppsCommand}.
 */
export interface ListPartnerAppsCommandOutput extends ListPartnerAppsResponse, __MetadataBearer {
}
declare const ListPartnerAppsCommand_base: {
    new (input: ListPartnerAppsCommandInput): import("@smithy/smithy-client").CommandImpl<ListPartnerAppsCommandInput, ListPartnerAppsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListPartnerAppsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListPartnerAppsCommandInput, ListPartnerAppsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists all of the SageMaker Partner AI Apps in an account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListPartnerAppsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListPartnerAppsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListPartnerAppsRequest
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new ListPartnerAppsCommand(input);
 * const response = await client.send(command);
 * // { // ListPartnerAppsResponse
 * //   Summaries: [ // PartnerAppSummaries
 * //     { // PartnerAppSummary
 * //       Arn: "STRING_VALUE",
 * //       Name: "STRING_VALUE",
 * //       Type: "lakera-guard" || "comet" || "deepchecks-llm-evaluation" || "fiddler",
 * //       Status: "Creating" || "Updating" || "Deleting" || "Available" || "Failed" || "UpdateFailed" || "Deleted",
 * //       CreationTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListPartnerAppsCommandInput - {@link ListPartnerAppsCommandInput}
 * @returns {@link ListPartnerAppsCommandOutput}
 * @see {@link ListPartnerAppsCommandInput} for command's `input` shape.
 * @see {@link ListPartnerAppsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListPartnerAppsCommand extends ListPartnerAppsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListPartnerAppsRequest;
            output: ListPartnerAppsResponse;
        };
        sdk: {
            input: ListPartnerAppsCommandInput;
            output: ListPartnerAppsCommandOutput;
        };
    };
}
