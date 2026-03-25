import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateMlflowTrackingServerRequest, CreateMlflowTrackingServerResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateMlflowTrackingServerCommand}.
 */
export interface CreateMlflowTrackingServerCommandInput extends CreateMlflowTrackingServerRequest {
}
/**
 * @public
 *
 * The output of {@link CreateMlflowTrackingServerCommand}.
 */
export interface CreateMlflowTrackingServerCommandOutput extends CreateMlflowTrackingServerResponse, __MetadataBearer {
}
declare const CreateMlflowTrackingServerCommand_base: {
    new (input: CreateMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<CreateMlflowTrackingServerCommandInput, CreateMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<CreateMlflowTrackingServerCommandInput, CreateMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an MLflow Tracking Server using a general purpose Amazon S3 bucket as the artifact store. For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/mlflow-create-tracking-server.html">Create an MLflow Tracking Server</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateMlflowTrackingServerCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateMlflowTrackingServerCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateMlflowTrackingServerRequest
 *   TrackingServerName: "STRING_VALUE", // required
 *   ArtifactStoreUri: "STRING_VALUE", // required
 *   TrackingServerSize: "Small" || "Medium" || "Large",
 *   MlflowVersion: "STRING_VALUE",
 *   RoleArn: "STRING_VALUE", // required
 *   AutomaticModelRegistration: true || false,
 *   WeeklyMaintenanceWindowStart: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateMlflowTrackingServerCommand(input);
 * const response = await client.send(command);
 * // { // CreateMlflowTrackingServerResponse
 * //   TrackingServerArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateMlflowTrackingServerCommandInput - {@link CreateMlflowTrackingServerCommandInput}
 * @returns {@link CreateMlflowTrackingServerCommandOutput}
 * @see {@link CreateMlflowTrackingServerCommandInput} for command's `input` shape.
 * @see {@link CreateMlflowTrackingServerCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
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
export declare class CreateMlflowTrackingServerCommand extends CreateMlflowTrackingServerCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateMlflowTrackingServerRequest;
            output: CreateMlflowTrackingServerResponse;
        };
        sdk: {
            input: CreateMlflowTrackingServerCommandInput;
            output: CreateMlflowTrackingServerCommandOutput;
        };
    };
}
