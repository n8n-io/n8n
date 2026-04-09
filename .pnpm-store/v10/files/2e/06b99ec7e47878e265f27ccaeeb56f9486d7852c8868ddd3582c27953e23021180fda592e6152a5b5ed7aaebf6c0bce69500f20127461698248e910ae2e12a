import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateHubRequest, UpdateHubResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateHubCommand}.
 */
export interface UpdateHubCommandInput extends UpdateHubRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateHubCommand}.
 */
export interface UpdateHubCommandOutput extends UpdateHubResponse, __MetadataBearer {
}
declare const UpdateHubCommand_base: {
    new (input: UpdateHubCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateHubCommandInput, UpdateHubCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateHubCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateHubCommandInput, UpdateHubCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Update a hub.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateHubCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateHubCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateHubRequest
 *   HubName: "STRING_VALUE", // required
 *   HubDescription: "STRING_VALUE",
 *   HubDisplayName: "STRING_VALUE",
 *   HubSearchKeywords: [ // HubSearchKeywordList
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new UpdateHubCommand(input);
 * const response = await client.send(command);
 * // { // UpdateHubResponse
 * //   HubArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateHubCommandInput - {@link UpdateHubCommandInput}
 * @returns {@link UpdateHubCommandOutput}
 * @see {@link UpdateHubCommandInput} for command's `input` shape.
 * @see {@link UpdateHubCommandOutput} for command's `response` shape.
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
export declare class UpdateHubCommand extends UpdateHubCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateHubRequest;
            output: UpdateHubResponse;
        };
        sdk: {
            input: UpdateHubCommandInput;
            output: UpdateHubCommandOutput;
        };
    };
}
