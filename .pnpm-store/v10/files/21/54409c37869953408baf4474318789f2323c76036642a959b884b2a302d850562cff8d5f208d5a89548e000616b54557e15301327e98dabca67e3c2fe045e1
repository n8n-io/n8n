import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateImageVersionRequest, CreateImageVersionResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateImageVersionCommand}.
 */
export interface CreateImageVersionCommandInput extends CreateImageVersionRequest {
}
/**
 * @public
 *
 * The output of {@link CreateImageVersionCommand}.
 */
export interface CreateImageVersionCommandOutput extends CreateImageVersionResponse, __MetadataBearer {
}
declare const CreateImageVersionCommand_base: {
    new (input: CreateImageVersionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateImageVersionCommandInput, CreateImageVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateImageVersionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateImageVersionCommandInput, CreateImageVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a version of the SageMaker AI image specified by <code>ImageName</code>. The version represents the Amazon ECR container image specified by <code>BaseImage</code>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateImageVersionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateImageVersionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateImageVersionRequest
 *   BaseImage: "STRING_VALUE", // required
 *   ClientToken: "STRING_VALUE", // required
 *   ImageName: "STRING_VALUE", // required
 *   Aliases: [ // SageMakerImageVersionAliases
 *     "STRING_VALUE",
 *   ],
 *   VendorGuidance: "NOT_PROVIDED" || "STABLE" || "TO_BE_ARCHIVED" || "ARCHIVED",
 *   JobType: "TRAINING" || "INFERENCE" || "NOTEBOOK_KERNEL",
 *   MLFramework: "STRING_VALUE",
 *   ProgrammingLang: "STRING_VALUE",
 *   Processor: "CPU" || "GPU",
 *   Horovod: true || false,
 *   ReleaseNotes: "STRING_VALUE",
 * };
 * const command = new CreateImageVersionCommand(input);
 * const response = await client.send(command);
 * // { // CreateImageVersionResponse
 * //   ImageVersionArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateImageVersionCommandInput - {@link CreateImageVersionCommandInput}
 * @returns {@link CreateImageVersionCommandOutput}
 * @see {@link CreateImageVersionCommandInput} for command's `input` shape.
 * @see {@link CreateImageVersionCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class CreateImageVersionCommand extends CreateImageVersionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateImageVersionRequest;
            output: CreateImageVersionResponse;
        };
        sdk: {
            input: CreateImageVersionCommandInput;
            output: CreateImageVersionCommandOutput;
        };
    };
}
