import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreatePresignedMlflowTrackingServerUrlRequest, CreatePresignedMlflowTrackingServerUrlResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreatePresignedMlflowTrackingServerUrlCommand}.
 */
export interface CreatePresignedMlflowTrackingServerUrlCommandInput extends CreatePresignedMlflowTrackingServerUrlRequest {
}
/**
 * @public
 *
 * The output of {@link CreatePresignedMlflowTrackingServerUrlCommand}.
 */
export interface CreatePresignedMlflowTrackingServerUrlCommandOutput extends CreatePresignedMlflowTrackingServerUrlResponse, __MetadataBearer {
}
declare const CreatePresignedMlflowTrackingServerUrlCommand_base: {
    new (input: CreatePresignedMlflowTrackingServerUrlCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePresignedMlflowTrackingServerUrlCommandInput, CreatePresignedMlflowTrackingServerUrlCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreatePresignedMlflowTrackingServerUrlCommandInput): import("@smithy/smithy-client").CommandImpl<CreatePresignedMlflowTrackingServerUrlCommandInput, CreatePresignedMlflowTrackingServerUrlCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns a presigned URL that you can use to connect to the MLflow UI attached to your tracking server. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/mlflow-launch-ui.html">Launch the MLflow UI using a presigned URL</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreatePresignedMlflowTrackingServerUrlCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreatePresignedMlflowTrackingServerUrlCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreatePresignedMlflowTrackingServerUrlRequest
 *   TrackingServerName: "STRING_VALUE", // required
 *   ExpiresInSeconds: Number("int"),
 *   SessionExpirationDurationInSeconds: Number("int"),
 * };
 * const command = new CreatePresignedMlflowTrackingServerUrlCommand(input);
 * const response = await client.send(command);
 * // { // CreatePresignedMlflowTrackingServerUrlResponse
 * //   AuthorizedUrl: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreatePresignedMlflowTrackingServerUrlCommandInput - {@link CreatePresignedMlflowTrackingServerUrlCommandInput}
 * @returns {@link CreatePresignedMlflowTrackingServerUrlCommandOutput}
 * @see {@link CreatePresignedMlflowTrackingServerUrlCommandInput} for command's `input` shape.
 * @see {@link CreatePresignedMlflowTrackingServerUrlCommandOutput} for command's `response` shape.
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
export declare class CreatePresignedMlflowTrackingServerUrlCommand extends CreatePresignedMlflowTrackingServerUrlCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreatePresignedMlflowTrackingServerUrlRequest;
            output: CreatePresignedMlflowTrackingServerUrlResponse;
        };
        sdk: {
            input: CreatePresignedMlflowTrackingServerUrlCommandInput;
            output: CreatePresignedMlflowTrackingServerUrlCommandOutput;
        };
    };
}
