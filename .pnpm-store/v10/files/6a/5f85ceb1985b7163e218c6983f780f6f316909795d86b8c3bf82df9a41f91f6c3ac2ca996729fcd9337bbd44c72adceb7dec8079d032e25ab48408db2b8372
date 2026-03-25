import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateModelCardRequest, UpdateModelCardResponse } from "../models/models_5";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateModelCardCommand}.
 */
export interface UpdateModelCardCommandInput extends UpdateModelCardRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateModelCardCommand}.
 */
export interface UpdateModelCardCommandOutput extends UpdateModelCardResponse, __MetadataBearer {
}
declare const UpdateModelCardCommand_base: {
    new (input: UpdateModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateModelCardCommandInput, UpdateModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateModelCardCommandInput, UpdateModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Update an Amazon SageMaker Model Card.</p> <important> <p>You cannot update both model card content and model card status in a single call.</p> </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateModelCardCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateModelCardCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // UpdateModelCardRequest
 *   ModelCardName: "STRING_VALUE", // required
 *   Content: "STRING_VALUE",
 *   ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived",
 * };
 * const command = new UpdateModelCardCommand(input);
 * const response = await client.send(command);
 * // { // UpdateModelCardResponse
 * //   ModelCardArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateModelCardCommandInput - {@link UpdateModelCardCommandInput}
 * @returns {@link UpdateModelCardCommandOutput}
 * @see {@link UpdateModelCardCommandInput} for command's `input` shape.
 * @see {@link UpdateModelCardCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
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
export declare class UpdateModelCardCommand extends UpdateModelCardCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateModelCardRequest;
            output: UpdateModelCardResponse;
        };
        sdk: {
            input: UpdateModelCardCommandInput;
            output: UpdateModelCardCommandOutput;
        };
    };
}
