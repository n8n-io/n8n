import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeModelCardExportJobRequest, DescribeModelCardExportJobResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeModelCardExportJobCommand}.
 */
export interface DescribeModelCardExportJobCommandInput extends DescribeModelCardExportJobRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeModelCardExportJobCommand}.
 */
export interface DescribeModelCardExportJobCommandOutput extends DescribeModelCardExportJobResponse, __MetadataBearer {
}
declare const DescribeModelCardExportJobCommand_base: {
    new (input: DescribeModelCardExportJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelCardExportJobCommandInput, DescribeModelCardExportJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeModelCardExportJobCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeModelCardExportJobCommandInput, DescribeModelCardExportJobCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes an Amazon SageMaker Model Card export job.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeModelCardExportJobCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeModelCardExportJobCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeModelCardExportJobRequest
 *   ModelCardExportJobArn: "STRING_VALUE", // required
 * };
 * const command = new DescribeModelCardExportJobCommand(input);
 * const response = await client.send(command);
 * // { // DescribeModelCardExportJobResponse
 * //   ModelCardExportJobName: "STRING_VALUE", // required
 * //   ModelCardExportJobArn: "STRING_VALUE", // required
 * //   Status: "InProgress" || "Completed" || "Failed", // required
 * //   ModelCardName: "STRING_VALUE", // required
 * //   ModelCardVersion: Number("int"), // required
 * //   OutputConfig: { // ModelCardExportOutputConfig
 * //     S3OutputPath: "STRING_VALUE", // required
 * //   },
 * //   CreatedAt: new Date("TIMESTAMP"), // required
 * //   LastModifiedAt: new Date("TIMESTAMP"), // required
 * //   FailureReason: "STRING_VALUE",
 * //   ExportArtifacts: { // ModelCardExportArtifacts
 * //     S3ExportArtifacts: "STRING_VALUE", // required
 * //   },
 * // };
 *
 * ```
 *
 * @param DescribeModelCardExportJobCommandInput - {@link DescribeModelCardExportJobCommandInput}
 * @returns {@link DescribeModelCardExportJobCommandOutput}
 * @see {@link DescribeModelCardExportJobCommandInput} for command's `input` shape.
 * @see {@link DescribeModelCardExportJobCommandOutput} for command's `response` shape.
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
export declare class DescribeModelCardExportJobCommand extends DescribeModelCardExportJobCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeModelCardExportJobRequest;
            output: DescribeModelCardExportJobResponse;
        };
        sdk: {
            input: DescribeModelCardExportJobCommandInput;
            output: DescribeModelCardExportJobCommandOutput;
        };
    };
}
