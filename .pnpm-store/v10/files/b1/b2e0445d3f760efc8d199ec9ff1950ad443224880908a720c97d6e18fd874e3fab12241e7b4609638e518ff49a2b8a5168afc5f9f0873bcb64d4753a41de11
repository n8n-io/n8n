import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateModelCardRequest, CreateModelCardResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateModelCardCommand}.
 */
export interface CreateModelCardCommandInput extends CreateModelCardRequest {
}
/**
 * @public
 *
 * The output of {@link CreateModelCardCommand}.
 */
export interface CreateModelCardCommandOutput extends CreateModelCardResponse, __MetadataBearer {
}
declare const CreateModelCardCommand_base: {
    new (input: CreateModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<CreateModelCardCommandInput, CreateModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateModelCardCommandInput): import("@smithy/smithy-client").CommandImpl<CreateModelCardCommandInput, CreateModelCardCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an Amazon SageMaker Model Card.</p> <p>For information about how to use model cards, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html">Amazon SageMaker Model Card</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateModelCardCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateModelCardCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateModelCardRequest
 *   ModelCardName: "STRING_VALUE", // required
 *   SecurityConfig: { // ModelCardSecurityConfig
 *     KmsKeyId: "STRING_VALUE",
 *   },
 *   Content: "STRING_VALUE", // required
 *   ModelCardStatus: "Draft" || "PendingReview" || "Approved" || "Archived", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateModelCardCommand(input);
 * const response = await client.send(command);
 * // { // CreateModelCardResponse
 * //   ModelCardArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateModelCardCommandInput - {@link CreateModelCardCommandInput}
 * @returns {@link CreateModelCardCommandOutput}
 * @see {@link CreateModelCardCommandInput} for command's `input` shape.
 * @see {@link CreateModelCardCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
 *
 * @throws {@link ResourceLimitExceeded} (client fault)
 *  <p> You have exceeded an SageMaker resource limit. For example, you might have too many training jobs created. </p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class CreateModelCardCommand extends CreateModelCardCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateModelCardRequest;
            output: CreateModelCardResponse;
        };
        sdk: {
            input: CreateModelCardCommandInput;
            output: CreateModelCardCommandOutput;
        };
    };
}
