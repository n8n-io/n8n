import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateProjectInput, CreateProjectOutput } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateProjectCommand}.
 */
export interface CreateProjectCommandInput extends CreateProjectInput {
}
/**
 * @public
 *
 * The output of {@link CreateProjectCommand}.
 */
export interface CreateProjectCommandOutput extends CreateProjectOutput, __MetadataBearer {
}
declare const CreateProjectCommand_base: {
    new (input: CreateProjectCommandInput): import("@smithy/smithy-client").CommandImpl<CreateProjectCommandInput, CreateProjectCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateProjectCommandInput): import("@smithy/smithy-client").CommandImpl<CreateProjectCommandInput, CreateProjectCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a machine learning (ML) project that can contain one or more templates that set up an ML pipeline from training to deploying an approved model.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateProjectCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateProjectCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateProjectInput
 *   ProjectName: "STRING_VALUE", // required
 *   ProjectDescription: "STRING_VALUE",
 *   ServiceCatalogProvisioningDetails: { // ServiceCatalogProvisioningDetails
 *     ProductId: "STRING_VALUE", // required
 *     ProvisioningArtifactId: "STRING_VALUE",
 *     PathId: "STRING_VALUE",
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
 *   TemplateProviders: [ // CreateTemplateProviderList
 *     { // CreateTemplateProvider
 *       CfnTemplateProvider: { // CfnCreateTemplateProvider
 *         TemplateName: "STRING_VALUE", // required
 *         TemplateURL: "STRING_VALUE", // required
 *         RoleARN: "STRING_VALUE",
 *         Parameters: [ // CfnStackCreateParameters
 *           { // CfnStackCreateParameter
 *             Key: "STRING_VALUE", // required
 *             Value: "STRING_VALUE",
 *           },
 *         ],
 *       },
 *     },
 *   ],
 * };
 * const command = new CreateProjectCommand(input);
 * const response = await client.send(command);
 * // { // CreateProjectOutput
 * //   ProjectArn: "STRING_VALUE", // required
 * //   ProjectId: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateProjectCommandInput - {@link CreateProjectCommandInput}
 * @returns {@link CreateProjectCommandOutput}
 * @see {@link CreateProjectCommandInput} for command's `input` shape.
 * @see {@link CreateProjectCommandOutput} for command's `response` shape.
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
export declare class CreateProjectCommand extends CreateProjectCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateProjectInput;
            output: CreateProjectOutput;
        };
        sdk: {
            input: CreateProjectCommandInput;
            output: CreateProjectCommandOutput;
        };
    };
}
