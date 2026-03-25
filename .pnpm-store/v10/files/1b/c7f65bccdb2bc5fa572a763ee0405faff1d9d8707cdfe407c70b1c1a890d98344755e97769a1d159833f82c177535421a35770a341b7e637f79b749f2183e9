import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdatePartnerAppRequest, UpdatePartnerAppResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdatePartnerAppCommand}.
 */
export interface UpdatePartnerAppCommandInput extends UpdatePartnerAppRequest {
}
/**
 * @public
 *
 * The output of {@link UpdatePartnerAppCommand}.
 */
export interface UpdatePartnerAppCommandOutput extends UpdatePartnerAppResponse, __MetadataBearer {
}
declare const UpdatePartnerAppCommand_base: {
    new (input: UpdatePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<UpdatePartnerAppCommandInput, UpdatePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdatePartnerAppCommandInput): import("@smithy/smithy-client").CommandImpl<UpdatePartnerAppCommandInput, UpdatePartnerAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates all of the SageMaker Partner AI Apps in an account.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdatePartnerAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdatePartnerAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdatePartnerAppRequest
 *   Arn: "STRING_VALUE", // required
 *   MaintenanceConfig: { // PartnerAppMaintenanceConfig
 *     MaintenanceWindowStart: "STRING_VALUE",
 *   },
 *   Tier: "STRING_VALUE",
 *   ApplicationConfig: { // PartnerAppConfig
 *     AdminUsers: [ // PartnerAppAdminUserList
 *       "STRING_VALUE",
 *     ],
 *     Arguments: { // PartnerAppArguments
 *       "<keys>": "STRING_VALUE",
 *     },
 *   },
 *   EnableIamSessionBasedIdentity: true || false,
 *   ClientToken: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new UpdatePartnerAppCommand(input);
 * const response = await client.send(command);
 * // { // UpdatePartnerAppResponse
 * //   Arn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdatePartnerAppCommandInput - {@link UpdatePartnerAppCommandInput}
 * @returns {@link UpdatePartnerAppCommandOutput}
 * @see {@link UpdatePartnerAppCommandInput} for command's `input` shape.
 * @see {@link UpdatePartnerAppCommandOutput} for command's `response` shape.
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
export declare class UpdatePartnerAppCommand extends UpdatePartnerAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdatePartnerAppRequest;
            output: UpdatePartnerAppResponse;
        };
        sdk: {
            input: UpdatePartnerAppCommandInput;
            output: UpdatePartnerAppCommandOutput;
        };
    };
}
