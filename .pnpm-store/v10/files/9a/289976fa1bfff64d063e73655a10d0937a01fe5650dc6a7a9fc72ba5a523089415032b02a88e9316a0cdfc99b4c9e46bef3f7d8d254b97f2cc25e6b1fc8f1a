import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeCodeRepositoryInput, DescribeCodeRepositoryOutput } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeCodeRepositoryCommand}.
 */
export interface DescribeCodeRepositoryCommandInput extends DescribeCodeRepositoryInput {
}
/**
 * @public
 *
 * The output of {@link DescribeCodeRepositoryCommand}.
 */
export interface DescribeCodeRepositoryCommandOutput extends DescribeCodeRepositoryOutput, __MetadataBearer {
}
declare const DescribeCodeRepositoryCommand_base: {
    new (input: DescribeCodeRepositoryCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeCodeRepositoryCommandInput, DescribeCodeRepositoryCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeCodeRepositoryCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeCodeRepositoryCommandInput, DescribeCodeRepositoryCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Gets details about the specified Git repository.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeCodeRepositoryCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeCodeRepositoryCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeCodeRepositoryInput
 *   CodeRepositoryName: "STRING_VALUE", // required
 * };
 * const command = new DescribeCodeRepositoryCommand(input);
 * const response = await client.send(command);
 * // { // DescribeCodeRepositoryOutput
 * //   CodeRepositoryName: "STRING_VALUE", // required
 * //   CodeRepositoryArn: "STRING_VALUE", // required
 * //   CreationTime: new Date("TIMESTAMP"), // required
 * //   LastModifiedTime: new Date("TIMESTAMP"), // required
 * //   GitConfig: { // GitConfig
 * //     RepositoryUrl: "STRING_VALUE", // required
 * //     Branch: "STRING_VALUE",
 * //     SecretArn: "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeCodeRepositoryCommandInput - {@link DescribeCodeRepositoryCommandInput}
 * @returns {@link DescribeCodeRepositoryCommandOutput}
 * @see {@link DescribeCodeRepositoryCommandInput} for command's `input` shape.
 * @see {@link DescribeCodeRepositoryCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link SageMakerServiceException}
 * <p>Base exception class for all service exceptions from SageMaker service.</p>
 *
 *
 * @public
 */
export declare class DescribeCodeRepositoryCommand extends DescribeCodeRepositoryCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeCodeRepositoryInput;
            output: DescribeCodeRepositoryOutput;
        };
        sdk: {
            input: DescribeCodeRepositoryCommandInput;
            output: DescribeCodeRepositoryCommandOutput;
        };
    };
}
