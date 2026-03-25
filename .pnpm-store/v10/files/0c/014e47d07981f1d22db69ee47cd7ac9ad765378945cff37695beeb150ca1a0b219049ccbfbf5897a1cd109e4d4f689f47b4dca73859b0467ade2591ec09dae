import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeMlflowTrackingServerRequest, DescribeMlflowTrackingServerResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeMlflowTrackingServerCommand}.
 */
export interface DescribeMlflowTrackingServerCommandInput extends DescribeMlflowTrackingServerRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeMlflowTrackingServerCommand}.
 */
export interface DescribeMlflowTrackingServerCommandOutput extends DescribeMlflowTrackingServerResponse, __MetadataBearer {
}
declare const DescribeMlflowTrackingServerCommand_base: {
    new (input: DescribeMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeMlflowTrackingServerCommandInput, DescribeMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeMlflowTrackingServerCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeMlflowTrackingServerCommandInput, DescribeMlflowTrackingServerCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about an MLflow Tracking Server.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeMlflowTrackingServerCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeMlflowTrackingServerCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeMlflowTrackingServerRequest
 *   TrackingServerName: "STRING_VALUE", // required
 * };
 * const command = new DescribeMlflowTrackingServerCommand(input);
 * const response = await client.send(command);
 * // { // DescribeMlflowTrackingServerResponse
 * //   TrackingServerArn: "STRING_VALUE",
 * //   TrackingServerName: "STRING_VALUE",
 * //   ArtifactStoreUri: "STRING_VALUE",
 * //   TrackingServerSize: "Small" || "Medium" || "Large",
 * //   MlflowVersion: "STRING_VALUE",
 * //   RoleArn: "STRING_VALUE",
 * //   TrackingServerStatus: "Creating" || "Created" || "CreateFailed" || "Updating" || "Updated" || "UpdateFailed" || "Deleting" || "DeleteFailed" || "Stopping" || "Stopped" || "StopFailed" || "Starting" || "Started" || "StartFailed" || "MaintenanceInProgress" || "MaintenanceComplete" || "MaintenanceFailed",
 * //   IsActive: "Active" || "Inactive",
 * //   TrackingServerUrl: "STRING_VALUE",
 * //   WeeklyMaintenanceWindowStart: "STRING_VALUE",
 * //   AutomaticModelRegistration: true || false,
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   CreatedBy: { // UserContext
 * //     UserProfileArn: "STRING_VALUE",
 * //     UserProfileName: "STRING_VALUE",
 * //     DomainId: "STRING_VALUE",
 * //     IamIdentity: { // IamIdentity
 * //       Arn: "STRING_VALUE",
 * //       PrincipalId: "STRING_VALUE",
 * //       SourceIdentity: "STRING_VALUE",
 * //     },
 * //   },
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   LastModifiedBy: {
 * //     UserProfileArn: "STRING_VALUE",
 * //     UserProfileName: "STRING_VALUE",
 * //     DomainId: "STRING_VALUE",
 * //     IamIdentity: {
 * //       Arn: "STRING_VALUE",
 * //       PrincipalId: "STRING_VALUE",
 * //       SourceIdentity: "STRING_VALUE",
 * //     },
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeMlflowTrackingServerCommandInput - {@link DescribeMlflowTrackingServerCommandInput}
 * @returns {@link DescribeMlflowTrackingServerCommandOutput}
 * @see {@link DescribeMlflowTrackingServerCommandInput} for command's `input` shape.
 * @see {@link DescribeMlflowTrackingServerCommandOutput} for command's `response` shape.
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
export declare class DescribeMlflowTrackingServerCommand extends DescribeMlflowTrackingServerCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeMlflowTrackingServerRequest;
            output: DescribeMlflowTrackingServerResponse;
        };
        sdk: {
            input: DescribeMlflowTrackingServerCommandInput;
            output: DescribeMlflowTrackingServerCommandOutput;
        };
    };
}
