import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreatePresignedMlflowAppUrlRequest, CreatePresignedMlflowAppUrlResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreatePresignedMlflowAppUrlCommand}.
 */
export interface CreatePresignedMlflowAppUrlCommandInput extends CreatePresignedMlflowAppUrlRequest {
}
/**
 * @public
 *
 * The output of {@link CreatePresignedMlflowAppUrlCommand}.
 */
export interface CreatePresignedMlflowAppUrlCommandOutput extends CreatePresignedMlflowAppUrlResponse, __MetadataBearer {
}
declare const CreatePresignedMlflowAppUrlCommand_base: {
    new (input: CreatePresignedMlflowAppUrlCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePresignedMlflowAppUrlCommandInput, CreatePresignedMlflowAppUrlCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreatePresignedMlflowAppUrlCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePresignedMlflowAppUrlCommandInput, CreatePresignedMlflowAppUrlCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a presigned URL that you can use to connect to the MLflow UI attached to your MLflow App. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/mlflow-launch-ui.html">Launch the MLflow UI using a presigned URL</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreatePresignedMlflowAppUrlCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreatePresignedMlflowAppUrlCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreatePresignedMlflowAppUrlRequest
 *   Arn: "STRING_VALUE", // required
 *   ExpiresInSeconds: Number("int"),
 *   SessionExpirationDurationInSeconds: Number("int"),
 * };
 * const command = new CreatePresignedMlflowAppUrlCommand(input);
 * const response = await client.send(command);
 * // { // CreatePresignedMlflowAppUrlResponse
 * //   AuthorizedUrl: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreatePresignedMlflowAppUrlCommandInput - {@link CreatePresignedMlflowAppUrlCommandInput}
 * @returns {@link CreatePresignedMlflowAppUrlCommandOutput}
 * @see {@link CreatePresignedMlflowAppUrlCommandInput} for command's `input` shape.
 * @see {@link CreatePresignedMlflowAppUrlCommandOutput} for command's `response` shape.
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
export declare class CreatePresignedMlflowAppUrlCommand extends CreatePresignedMlflowAppUrlCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreatePresignedMlflowAppUrlRequest;
            output: CreatePresignedMlflowAppUrlResponse;
        };
        sdk: {
            input: CreatePresignedMlflowAppUrlCommandInput;
            output: CreatePresignedMlflowAppUrlCommandOutput;
        };
    };
}
