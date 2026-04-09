import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { UpdateProjectInput, UpdateProjectOutput } from "../models/models_4";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateProjectCommand}.
 */
export interface UpdateProjectCommandInput extends UpdateProjectInput {
}
/**
 * @public
 *
 * The output of {@link UpdateProjectCommand}.
 */
export interface UpdateProjectCommandOutput extends UpdateProjectOutput, __MetadataBearer {
}
declare const UpdateProjectCommand_base: {
    new (input: UpdateProjectCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateProjectCommandInput, UpdateProjectCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateProjectCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateProjectCommandInput, UpdateProjectCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates a machine learning (ML) project that is created from a template that sets up an ML pipeline from training to deploying an approved model.</p> <note> <p>You must not update a project that is in use. If you update the <code>ServiceCatalogProvisioningUpdateDetails</code> of a project that is active or being created, or updated, you may lose resources already created by the project.</p> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, UpdateProjectCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, UpdateProjectCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // UpdateProjectInput
 *   ProjectName: "STRING_VALUE", // required
 *   ProjectDescription: "STRING_VALUE",
 *   ServiceCatalogProvisioningUpdateDetails: { // ServiceCatalogProvisioningUpdateDetails
 *     ProvisioningArtifactId: "STRING_VALUE",
 *     ProvisioningParameters: [ // ProvisioningParameters
 *       { // ProvisioningParameter
 *         Key: "STRING_VALUE",
 *         Value: "STRING_VALUE",
 *       },
 *     ],
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 *   TemplateProvidersToUpdate: [ // UpdateTemplateProviderList
 *     { // UpdateTemplateProvider
 *       CfnTemplateProvider: { // CfnUpdateTemplateProvider
 *         TemplateName: "STRING_VALUE", // required
 *         TemplateURL: "STRING_VALUE", // required
 *         Parameters: [ // CfnStackUpdateParameters
 *           { // CfnStackUpdateParameter
 *             Key: "STRING_VALUE", // required
 *             Value: "STRING_VALUE",
 *           },
 *         ],
 *       },
 *     },
 *   ],
 * };
 * const command = new UpdateProjectCommand(input);
 * const response = await client.send(command);
 * // { // UpdateProjectOutput
 * //   ProjectArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param UpdateProjectCommandInput - {@link UpdateProjectCommandInput}
 * @returns {@link UpdateProjectCommandOutput}
 * @see {@link UpdateProjectCommandInput} for command's `input` shape.
 * @see {@link UpdateProjectCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ConflictException} (client fault)
 *  <p>There was a conflict when you attempted to modify a SageMaker entity such as an <code>Experiment</code> or <code>Artifact</code>.</p>
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class UpdateProjectCommand extends UpdateProjectCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateProjectInput;
            output: UpdateProjectOutput;
        };
        sdk: {
            input: UpdateProjectCommandInput;
            output: UpdateProjectCommandOutput;
        };
    };
}
