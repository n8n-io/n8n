import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateHubContentRequest, UpdateHubContentResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateHubContentCommand}.
 */
export interface UpdateHubContentCommandInput extends UpdateHubContentRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateHubContentCommand}.
 */
export interface UpdateHubContentCommandOutput extends UpdateHubContentResponse, __MetadataBearer {
}
declare const UpdateHubContentCommand_base: {
    new (input: UpdateHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateHubContentCommandInput, UpdateHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateHubContentCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateHubContentCommandInput, UpdateHubContentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates SageMaker hub content (either a <code>Model</code> or <code>Notebook</code> resource).</p> <p>You can update the metadata that describes the resource. In addition to the required request fields, specify at least one of the following fields to update:</p> <ul> <li> <p> <code>HubContentDescription</code> </p> </li> <li> <p> <code>HubContentDisplayName</code> </p> </li> <li> <p> <code>HubContentMarkdown</code> </p> </li> <li> <p> <code>HubContentSearchKeywords</code> </p> </li> <li> <p> <code>SupportStatus</code> </p> </li> </ul> <p>For more information about hubs, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/jumpstart-curated-hubs.html">Private curated hubs for foundation model access control in JumpStart</a>.</p> <note> <p>If you want to update a <code>ModelReference</code> resource in your hub, use the <code>UpdateHubContentResource</code> API instead.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateHubContentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateHubContentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateHubContentRequest
 *   HubName: "STRING_VALUE", // required
 *   HubContentName: "STRING_VALUE", // required
 *   HubContentType: "Model" || "Notebook" || "ModelReference", // required
 *   HubContentVersion: "STRING_VALUE", // required
 *   HubContentDisplayName: "STRING_VALUE",
 *   HubContentDescription: "STRING_VALUE",
 *   HubContentMarkdown: "STRING_VALUE",
 *   HubContentSearchKeywords: [ // HubContentSearchKeywordList
 *     "STRING_VALUE",
 *   ],
 *   SupportStatus: "Supported" || "Deprecated" || "Restricted",
 * };
 * const command = new UpdateHubContentCommand(input);
 * const response = await client.send(command);
 * // { // UpdateHubContentResponse
 * //   HubArn: "STRING_VALUE", // required
 * //   HubContentArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateHubContentCommandInput - {@link UpdateHubContentCommandInput}
 * @returns {@link UpdateHubContentCommandOutput}
 * @see {@link UpdateHubContentCommandInput} for command's `input` shape.
 * @see {@link UpdateHubContentCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class UpdateHubContentCommand extends UpdateHubContentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateHubContentRequest;
            output: UpdateHubContentResponse;
        };
        sdk: {
            input: UpdateHubContentCommandInput;
            output: UpdateHubContentCommandOutput;
        };
    };
}
