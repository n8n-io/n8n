import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateArtifactRequest, UpdateArtifactResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateArtifactCommand}.
 */
export interface UpdateArtifactCommandInput extends UpdateArtifactRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateArtifactCommand}.
 */
export interface UpdateArtifactCommandOutput extends UpdateArtifactResponse, __MetadataBearer {
}
declare const UpdateArtifactCommand_base: {
    new (input: UpdateArtifactCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateArtifactCommandInput, UpdateArtifactCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateArtifactCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateArtifactCommandInput, UpdateArtifactCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates an artifact.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateArtifactCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateArtifactCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateArtifactRequest
 *   ArtifactArn: "STRING_VALUE", // required
 *   ArtifactName: "STRING_VALUE",
 *   Properties: { // ArtifactProperties
 *     "<keys>": "STRING_VALUE",
 *   },
 *   PropertiesToRemove: [ // ListLineageEntityParameterKey
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new UpdateArtifactCommand(input);
 * const response = await client.send(command);
 * // { // UpdateArtifactResponse
 * //   ArtifactArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateArtifactCommandInput - {@link UpdateArtifactCommandInput}
 * @returns {@link UpdateArtifactCommandOutput}
 * @see {@link UpdateArtifactCommandInput} for command's `input` shape.
 * @see {@link UpdateArtifactCommandOutput} for command's `response` shape.
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
export declare class UpdateArtifactCommand extends UpdateArtifactCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateArtifactRequest;
            output: UpdateArtifactResponse;
        };
        sdk: {
            input: UpdateArtifactCommandInput;
            output: UpdateArtifactCommandOutput;
        };
    };
}
