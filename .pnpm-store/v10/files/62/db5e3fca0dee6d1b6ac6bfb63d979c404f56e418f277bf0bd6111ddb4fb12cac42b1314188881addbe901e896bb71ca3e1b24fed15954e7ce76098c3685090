import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListDeviceFleetsRequest, ListDeviceFleetsResponse } from "../models/models_4";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListDeviceFleetsCommand}.
 */
export interface ListDeviceFleetsCommandInput extends ListDeviceFleetsRequest {
}
/**
 * @public
 *
 * The output of {@link ListDeviceFleetsCommand}.
 */
export interface ListDeviceFleetsCommandOutput extends ListDeviceFleetsResponse, __MetadataBearer {
}
declare const ListDeviceFleetsCommand_base: {
    new (input: ListDeviceFleetsCommandInput): import("@smithy/smithy-client").CommandImpl<ListDeviceFleetsCommandInput, ListDeviceFleetsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListDeviceFleetsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListDeviceFleetsCommandInput, ListDeviceFleetsCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a list of devices in the fleet.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, ListDeviceFleetsCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, ListDeviceFleetsCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // ListDeviceFleetsRequest
 *   NextToken: "STRING_VALUE",
 *   MaxResults: Number("int"),
 *   CreationTimeAfter: new Date("TIMESTAMP"),
 *   CreationTimeBefore: new Date("TIMESTAMP"),
 *   LastModifiedTimeAfter: new Date("TIMESTAMP"),
 *   LastModifiedTimeBefore: new Date("TIMESTAMP"),
 *   NameContains: "STRING_VALUE",
 *   SortBy: "NAME" || "CREATION_TIME" || "LAST_MODIFIED_TIME",
 *   SortOrder: "Ascending" || "Descending",
 * };
 * const command = new ListDeviceFleetsCommand(input);
 * const response = await client.send(command);
 * // { // ListDeviceFleetsResponse
 * //   DeviceFleetSummaries: [ // DeviceFleetSummaries // required
 * //     { // DeviceFleetSummary
 * //       DeviceFleetArn: "STRING_VALUE", // required
 * //       DeviceFleetName: "STRING_VALUE", // required
 * //       CreationTime: new Date("TIMESTAMP"),
 * //       LastModifiedTime: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListDeviceFleetsCommandInput - {@link ListDeviceFleetsCommandInput}
 * @returns {@link ListDeviceFleetsCommandOutput}
 * @see {@link ListDeviceFleetsCommandInput} for command's `input` shape.
 * @see {@link ListDeviceFleetsCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class ListDeviceFleetsCommand extends ListDeviceFleetsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListDeviceFleetsRequest;
            output: ListDeviceFleetsResponse;
        };
        sdk: {
            input: ListDeviceFleetsCommandInput;
            output: ListDeviceFleetsCommandOutput;
        };
    };
}
