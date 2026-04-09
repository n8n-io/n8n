import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateMlflowAppRequest, UpdateMlflowAppResponse } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateMlflowAppCommand}.
 */
export interface UpdateMlflowAppCommandInput extends UpdateMlflowAppRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateMlflowAppCommand}.
 */
export interface UpdateMlflowAppCommandOutput extends UpdateMlflowAppResponse, __MetadataBearer {
}
declare const UpdateMlflowAppCommand_base: {
    new (input: UpdateMlflowAppCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateMlflowAppCommandInput, UpdateMlflowAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateMlflowAppCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateMlflowAppCommandInput, UpdateMlflowAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an MLflow App.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateMlflowAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateMlflowAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateMlflowAppRequest
 *   Arn: "STRING_VALUE", // required
 *   Name: "STRING_VALUE",
 *   ArtifactStoreUri: "STRING_VALUE",
 *   ModelRegistrationMode: "AutoModelRegistrationEnabled" || "AutoModelRegistrationDisabled",
 *   WeeklyMaintenanceWindowStart: "STRING_VALUE",
 *   DefaultDomainIdList: [ // DefaultDomainIdList
 *     "STRING_VALUE",
 *   ],
 *   AccountDefaultStatus: "ENABLED" || "DISABLED",
 * };
 * const command = new UpdateMlflowAppCommand(input);
 * const response = await client.send(command);
 * // { // UpdateMlflowAppResponse
 * //   Arn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateMlflowAppCommandInput - {@link UpdateMlflowAppCommandInput}
 * @returns {@link UpdateMlflowAppCommandOutput}
 * @see {@link UpdateMlflowAppCommandInput} for command's `input` shape.
 * @see {@link UpdateMlflowAppCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
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
export declare class UpdateMlflowAppCommand extends UpdateMlflowAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateMlflowAppRequest;
            output: UpdateMlflowAppResponse;
        };
        sdk: {
            input: UpdateMlflowAppCommandInput;
            output: UpdateMlflowAppCommandOutput;
        };
    };
}
