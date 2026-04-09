import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { DescribeExperimentRequest, DescribeExperimentResponse } from "../models/models_2";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DescribeExperimentCommand}.
 */
export interface DescribeExperimentCommandInput extends DescribeExperimentRequest {
}
/**
 * @public
 *
 * The output of {@link DescribeExperimentCommand}.
 */
export interface DescribeExperimentCommandOutput extends DescribeExperimentResponse, __MetadataBearer {
}
declare const DescribeExperimentCommand_base: {
    new (input: DescribeExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeExperimentCommandInput, DescribeExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DescribeExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<DescribeExperimentCommandInput, DescribeExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Provides a list of an experiment's properties.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, DescribeExperimentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, DescribeExperimentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // DescribeExperimentRequest
 *   ExperimentName: "STRING_VALUE", // required
 * };
 * const command = new DescribeExperimentCommand(input);
 * const response = await client.send(command);
 * // { // DescribeExperimentResponse
 * //   ExperimentName: "STRING_VALUE",
 * //   ExperimentArn: "STRING_VALUE",
 * //   DisplayName: "STRING_VALUE",
 * //   Source: { // ExperimentSource
 * //     SourceArn: "STRING_VALUE", // required
 * //     SourceType: "STRING_VALUE",
 * //   },
 * //   Description: "STRING_VALUE",
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
 * @param DescribeExperimentCommandInput - {@link DescribeExperimentCommandInput}
 * @returns {@link DescribeExperimentCommandOutput}
 * @see {@link DescribeExperimentCommandInput} for command's `input` shape.
 * @see {@link DescribeExperimentCommandOutput} for command's `response` shape.
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
export declare class DescribeExperimentCommand extends DescribeExperimentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DescribeExperimentRequest;
            output: DescribeExperimentResponse;
        };
        sdk: {
            input: DescribeExperimentCommandInput;
            output: DescribeExperimentCommandOutput;
        };
    };
}
