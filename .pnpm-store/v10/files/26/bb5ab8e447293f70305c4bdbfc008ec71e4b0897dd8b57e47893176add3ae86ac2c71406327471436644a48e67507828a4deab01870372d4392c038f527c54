import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateImageRequest, CreateImageResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateImageCommand}.
 */
export interface CreateImageCommandInput extends CreateImageRequest {
}
/**
 * @public
 *
 * The output of {@link CreateImageCommand}.
 */
export interface CreateImageCommandOutput extends CreateImageResponse, __MetadataBearer {
}
declare const CreateImageCommand_base: {
    new (input: CreateImageCommandInput): import("@smithy/smithy-client").CommandImpl<CreateImageCommandInput, CreateImageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateImageCommandInput): import("@smithy/smithy-client").CommandImpl<CreateImageCommandInput, CreateImageCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a custom SageMaker AI image. A SageMaker AI image is a set of image versions. Each image version represents a container image stored in Amazon ECR. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/studio-byoi.html">Bring your own SageMaker AI image</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateImageCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateImageCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateImageRequest
 *   Description: "STRING_VALUE",
 *   DisplayName: "STRING_VALUE",
 *   ImageName: "STRING_VALUE", // required
 *   RoleArn: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateImageCommand(input);
 * const response = await client.send(command);
 * // { // CreateImageResponse
 * //   ImageArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateImageCommandInput - {@link CreateImageCommandInput}
 * @returns {@link CreateImageCommandOutput}
 * @see {@link CreateImageCommandInput} for command's `input` shape.
 * @see {@link CreateImageCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class CreateImageCommand extends CreateImageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateImageRequest;
            output: CreateImageResponse;
        };
        sdk: {
            input: CreateImageCommandInput;
            output: CreateImageCommandOutput;
        };
    };
}
