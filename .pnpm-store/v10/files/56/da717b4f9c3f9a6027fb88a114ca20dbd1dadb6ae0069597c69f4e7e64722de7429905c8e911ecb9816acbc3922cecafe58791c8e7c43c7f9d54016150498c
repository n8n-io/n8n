import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { DescribeImageVersionRequest, DescribeImageVersionResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeImageVersionCommand}.
 */
export interface DescribeImageVersionCommandInput extends DescribeImageVersionRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeImageVersionCommand}.
 */
export interface DescribeImageVersionCommandOutput extends DescribeImageVersionResponse, __MetadataBearer {
}
declare const DescribeImageVersionCommand_base: {
    new (input: DescribeImageVersionCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeImageVersionCommandInput, DescribeImageVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeImageVersionCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeImageVersionCommandInput, DescribeImageVersionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes a version of a SageMaker AI image.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeImageVersionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeImageVersionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // DescribeImageVersionRequest
 *   ImageName: "STRING_VALUE", // required
 *   Version: Number("int"),
 *   Alias: "STRING_VALUE",
 * };
 * const command = new DescribeImageVersionCommand(input);
 * const response = await client.send(command);
 * // { // DescribeImageVersionResponse
 * //   BaseImage: "STRING_VALUE",
 * //   ContainerImage: "STRING_VALUE",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   FailureReason: "STRING_VALUE",
 * //   ImageArn: "STRING_VALUE",
 * //   ImageVersionArn: "STRING_VALUE",
 * //   ImageVersionStatus: "CREATING" || "CREATED" || "CREATE_FAILED" || "DELETING" || "DELETE_FAILED",
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   Version: Number("int"),
 * //   VendorGuidance: "NOT_PROVIDED" || "STABLE" || "TO_BE_ARCHIVED" || "ARCHIVED",
 * //   JobType: "TRAINING" || "INFERENCE" || "NOTEBOOK_KERNEL",
 * //   MLFramework: "STRING_VALUE",
 * //   ProgrammingLang: "STRING_VALUE",
 * //   Processor: "CPU" || "GPU",
 * //   Horovod: true || false,
 * //   ReleaseNotes: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribeImageVersionCommandInput - {@link DescribeImageVersionCommandInput}
 * @returns {@link DescribeImageVersionCommandOutput}
 * @see {@link DescribeImageVersionCommandInput} for command's `input` shape.
 * @see {@link DescribeImageVersionCommandOutput} for command's `response` shape.
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
export declare class DescribeImageVersionCommand extends DescribeImageVersionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeImageVersionRequest;
            output: DescribeImageVersionResponse;
        };
        sdk: {
            input: DescribeImageVersionCommandInput;
            output: DescribeImageVersionCommandOutput;
        };
    };
}
