import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListEndpointsInput, ListEndpointsOutput } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListEndpointsCommand}.
 */
export interface ListEndpointsCommandInput extends ListEndpointsInput {
}
/**
 * @public
 *
 * The output of {@link ListEndpointsCommand}.
 */
export interface ListEndpointsCommandOutput extends ListEndpointsOutput, __MetadataBearer {
}
declare const ListEndpointsCommand_base: {
    new (input: ListEndpointsCommandInput): import("@smithy/smithy-client").CommandImpl<ListEndpointsCommandInput, ListEndpointsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListEndpointsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListEndpointsCommandInput, ListEndpointsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists endpoints.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListEndpointsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListEndpointsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListEndpointsInput
 *   SortBy: "Name" || "CreationTime" || "Status",
 *   SortOrder: "Ascending" || "Descending",
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   NameContains: "STRING_VALUE",
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   StatusEquals: "OutOfService" || "Creating" || "Updating" || "SystemUpdating" || "RollingBack" || "InService" || "Deleting" || "Failed" || "UpdateRollbackFailed",
 * };
 * const command = new ListEndpointsCommand(input);
 * const response = await client.send(command);
 * // { // ListEndpointsOutput
 * //   Endpoints: [ // EndpointSummaryList // required
 * //     { // EndpointSummary
 * //       EndpointName: "STRING_VALUE", // required
 * //       EndpointArn: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"), // required
 * //       LastModifiedTime: new Date("TIMESTAMP"), // required
 * //       EndpointStatus: "OutOfService" || "Creating" || "Updating" || "SystemUpdating" || "RollingBack" || "InService" || "Deleting" || "Failed" || "UpdateRollbackFailed", // required
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListEndpointsCommandInput - {@link ListEndpointsCommandInput}
 * @returns {@link ListEndpointsCommandOutput}
 * @see {@link ListEndpointsCommandInput} for command's `input` shape.
 * @see {@link ListEndpointsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListEndpointsCommand extends ListEndpointsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListEndpointsInput;
            output: ListEndpointsOutput;
        };
        sdk: {
            input: ListEndpointsCommandInput;
            output: ListEndpointsCommandOutput;
        };
    };
}
