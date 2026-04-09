import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DeleteDataQualityJobDefinitionRequest } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteDataQualityJobDefinitionCommand}.
 */
export interface DeleteDataQualityJobDefinitionCommandInput extends DeleteDataQualityJobDefinitionRequest {
}
/**
 * @public
 *
 * The output of {@link DeleteDataQualityJobDefinitionCommand}.
 */
export interface DeleteDataQualityJobDefinitionCommandOutput extends __MetadataBearer {
}
declare const DeleteDataQualityJobDefinitionCommand_base: {
    new (input: DeleteDataQualityJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDataQualityJobDefinitionCommandInput, DeleteDataQualityJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteDataQualityJobDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteDataQualityJobDefinitionCommandInput, DeleteDataQualityJobDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes a data quality monitoring job definition.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DeleteDataQualityJobDefinitionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DeleteDataQualityJobDefinitionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DeleteDataQualityJobDefinitionRequest
 *   JobDefinitionName: "STRING_VALUE", // required
 * };
 * const command = new DeleteDataQualityJobDefinitionCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteDataQualityJobDefinitionCommandInput - {@link DeleteDataQualityJobDefinitionCommandInput}
 * @returns {@link DeleteDataQualityJobDefinitionCommandOutput}
 * @see {@link DeleteDataQualityJobDefinitionCommandInput} for command's `input` shape.
 * @see {@link DeleteDataQualityJobDefinitionCommandOutput} for command's `response` shape.
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
export declare class DeleteDataQualityJobDefinitionCommand extends DeleteDataQualityJobDefinitionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteDataQualityJobDefinitionRequest;
            output: {};
        };
        sdk: {
            input: DeleteDataQualityJobDefinitionCommandInput;
            output: DeleteDataQualityJobDefinitionCommandOutput;
        };
    };
}
