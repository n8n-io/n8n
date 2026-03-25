import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetLineageGroupPolicyRequest, GetLineageGroupPolicyResponse } from "../models/models_3";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetLineageGroupPolicyCommand}.
 */
export interface GetLineageGroupPolicyCommandInput extends GetLineageGroupPolicyRequest {
}
/**
 * @public
 *
 * The output of {@link GetLineageGroupPolicyCommand}.
 */
export interface GetLineageGroupPolicyCommandOutput extends GetLineageGroupPolicyResponse, __MetadataBearer {
}
declare const GetLineageGroupPolicyCommand_base: {
    new (input: GetLineageGroupPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetLineageGroupPolicyCommandInput, GetLineageGroupPolicyCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetLineageGroupPolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetLineageGroupPolicyCommandInput, GetLineageGroupPolicyCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>The resource policy for the lineage group.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, GetLineageGroupPolicyCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, GetLineageGroupPolicyCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // GetLineageGroupPolicyRequest
 *   LineageGroupName: "STRING_VALUE", // required
 * };
 * const command = new GetLineageGroupPolicyCommand(input);
 * const response = await client.send(command);
 * // { // GetLineageGroupPolicyResponse
 * //   LineageGroupArn: "STRING_VALUE",
 * //   ResourcePolicy: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param GetLineageGroupPolicyCommandInput - {@link GetLineageGroupPolicyCommandInput}
 * @returns {@link GetLineageGroupPolicyCommandOutput}
 * @see {@link GetLineageGroupPolicyCommandInput} for command's `input` shape.
 * @see {@link GetLineageGroupPolicyCommandOutput} for command's `response` shape.
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
export declare class GetLineageGroupPolicyCommand extends GetLineageGroupPolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetLineageGroupPolicyRequest;
            output: GetLineageGroupPolicyResponse;
        };
        sdk: {
            input: GetLineageGroupPolicyCommandInput;
            output: GetLineageGroupPolicyCommandOutput;
        };
    };
}
