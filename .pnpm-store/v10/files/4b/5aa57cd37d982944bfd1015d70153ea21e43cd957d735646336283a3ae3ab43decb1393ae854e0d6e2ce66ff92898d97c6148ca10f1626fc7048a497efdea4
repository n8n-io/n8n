import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateModelPackageGroupInput, CreateModelPackageGroupOutput } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateModelPackageGroupCommand}.
 */
export interface CreateModelPackageGroupCommandInput extends CreateModelPackageGroupInput {
}
/**
 * @public
 *
 * The output of {@link CreateModelPackageGroupCommand}.
 */
export interface CreateModelPackageGroupCommandOutput extends CreateModelPackageGroupOutput, __MetadataBearer {
}
declare const CreateModelPackageGroupCommand_base: {
    new (input: CreateModelPackageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<CreateModelPackageGroupCommandInput, CreateModelPackageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateModelPackageGroupCommandInput): import("@smithy/smithy-client").CommandImpl<CreateModelPackageGroupCommandInput, CreateModelPackageGroupCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a model group. A model group contains a group of model versions.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateModelPackageGroupCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateModelPackageGroupCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateModelPackageGroupInput
 *   ModelPackageGroupName: "STRING_VALUE", // required
 *   ModelPackageGroupDescription: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateModelPackageGroupCommand(input);
 * const response = await client.send(command);
 * // { // CreateModelPackageGroupOutput
 * //   ModelPackageGroupArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateModelPackageGroupCommandInput - {@link CreateModelPackageGroupCommandInput}
 * @returns {@link CreateModelPackageGroupCommandOutput}
 * @see {@link CreateModelPackageGroupCommandInput} for command's `input` shape.
 * @see {@link CreateModelPackageGroupCommandOutput} for command's `response` shape.
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
export declare class CreateModelPackageGroupCommand extends CreateModelPackageGroupCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateModelPackageGroupInput;
            output: CreateModelPackageGroupOutput;
        };
        sdk: {
            input: CreateModelPackageGroupCommandInput;
            output: CreateModelPackageGroupCommandOutput;
        };
    };
}
