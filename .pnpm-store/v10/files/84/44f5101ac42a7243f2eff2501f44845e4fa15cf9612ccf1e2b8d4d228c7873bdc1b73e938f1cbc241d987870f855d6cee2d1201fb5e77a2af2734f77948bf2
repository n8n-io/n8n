import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribePipelineRequest, DescribePipelineResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribePipelineCommand}.
 */
export interface DescribePipelineCommandInput extends DescribePipelineRequest {
}
/**
 * @public
 *
 * The output of {@link DescribePipelineCommand}.
 */
export interface DescribePipelineCommandOutput extends DescribePipelineResponse, __MetadataBearer {
}
declare const DescribePipelineCommand_base: {
    new (input: DescribePipelineCommandInput): import("@smithy/smithy-client").CommandImpl<DescribePipelineCommandInput, DescribePipelineCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribePipelineCommandInput): import("@smithy/smithy-client").CommandImpl<DescribePipelineCommandInput, DescribePipelineCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Describes the details of a pipeline.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribePipelineCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribePipelineCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribePipelineRequest
 *   PipelineName: "STRING_VALUE", // required
 *   PipelineVersionId: Number("long"),
 * };
 * const command = new DescribePipelineCommand(input);
 * const response = await client.send(command);
 * // { // DescribePipelineResponse
 * //   PipelineArn: "STRING_VALUE",
 * //   PipelineName: "STRING_VALUE",
 * //   PipelineDisplayName: "STRING_VALUE",
 * //   PipelineDefinition: "STRING_VALUE",
 * //   PipelineDescription: "STRING_VALUE",
 * //   RoleArn: "STRING_VALUE",
 * //   PipelineStatus: "Active" || "Deleting",
 * //   CreationTime: new Date("TIMESTAMP"),
 * //   LastModifiedTime: new Date("TIMESTAMP"),
 * //   LastRunTime: new Date("TIMESTAMP"),
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
 * //   ParallelismConfiguration: { // ParallelismConfiguration
 * //     MaxParallelExecutionSteps: Number("int"), // required
 * //   },
 * //   PipelineVersionDisplayName: "STRING_VALUE",
 * //   PipelineVersionDescription: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param DescribePipelineCommandInput - {@link DescribePipelineCommandInput}
 * @returns {@link DescribePipelineCommandOutput}
 * @see {@link DescribePipelineCommandInput} for command's `input` shape.
 * @see {@link DescribePipelineCommandOutput} for command's `response` shape.
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
export declare class DescribePipelineCommand extends DescribePipelineCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribePipelineRequest;
            output: DescribePipelineResponse;
        };
        sdk: {
            input: DescribePipelineCommandInput;
            output: DescribePipelineCommandOutput;
        };
    };
}
