import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeMlflowAppRequest, DescribeMlflowAppResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeMlflowAppCommand}.
 */
export interface DescribeMlflowAppCommandInput extends DescribeMlflowAppRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeMlflowAppCommand}.
 */
export interface DescribeMlflowAppCommandOutput extends DescribeMlflowAppResponse, __MetadataBearer {
}
declare const DescribeMlflowAppCommand_base: {
    new (input: DescribeMlflowAppCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeMlflowAppCommandInput, DescribeMlflowAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeMlflowAppCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeMlflowAppCommandInput, DescribeMlflowAppCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Returns information about an MLflow App.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeMlflowAppCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeMlflowAppCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeMlflowAppRequest
 *   Arn: "STRING_VALUE", // required
 * };
 * const command = new DescribeMlflowAppCommand(input);
 * const response = await client.send(command);
 * // { // DescribeMlflowAppResponse
 * //   Arn: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   ArtifactStoreUri: "STRING_VALUE",
 * //   MlflowVersion: "STRING_VALUE",
 * //   RoleArn: "STRING_VALUE",
 * //   Status: "Creating" || "Created" || "CreateFailed" || "Updating" || "Updated" || "UpdateFailed" || "Deleting" || "DeleteFailed" || "Deleted",
 * //   ModelRegistrationMode: "AutoModelRegistrationEnabled" || "AutoModelRegistrationDisabled",
 * //   AccountDefaultStatus: "ENABLED" || "DISABLED",
 * //   DefaultDomainIdList: [ // DefaultDomainIdList
 * //     "STRING_VALUE",
 * //   ],
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
 * //   WeeklyMaintenanceWindowStart: "STRING_VALUE",
 * //   MaintenanceStatus: "MaintenanceInProgress" || "MaintenanceComplete" || "MaintenanceFailed",
 * // };
 *
 * ```
 *
 * @param DescribeMlflowAppCommandInput - {@link DescribeMlflowAppCommandInput}
 * @returns {@link DescribeMlflowAppCommandOutput}
 * @see {@link DescribeMlflowAppCommandInput} for command's `input` shape.
 * @see {@link DescribeMlflowAppCommandOutput} for command's `response` shape.
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
export declare class DescribeMlflowAppCommand extends DescribeMlflowAppCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeMlflowAppRequest;
            output: DescribeMlflowAppResponse;
        };
        sdk: {
            input: DescribeMlflowAppCommandInput;
            output: DescribeMlflowAppCommandOutput;
        };
    };
}
