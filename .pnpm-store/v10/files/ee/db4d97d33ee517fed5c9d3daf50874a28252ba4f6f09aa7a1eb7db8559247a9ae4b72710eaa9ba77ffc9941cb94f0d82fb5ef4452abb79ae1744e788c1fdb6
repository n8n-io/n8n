import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CreateFlowDefinitionRequest, CreateFlowDefinitionResponse } from "../models/models_1";
import type { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateFlowDefinitionCommand}.
 */
export interface CreateFlowDefinitionCommandInput extends CreateFlowDefinitionRequest {
}
/**
 * @public
 *
 * The output of {@link CreateFlowDefinitionCommand}.
 */
export interface CreateFlowDefinitionCommandOutput extends CreateFlowDefinitionResponse, __MetadataBearer {
}
declare const CreateFlowDefinitionCommand_base: {
    new (input: CreateFlowDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateFlowDefinitionCommandInput, CreateFlowDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateFlowDefinitionCommandInput): import("@smithy/smithy-client").CommandImpl<CreateFlowDefinitionCommandInput, CreateFlowDefinitionCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a flow definition.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateFlowDefinitionCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateFlowDefinitionCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * // import type { SageMakerClientConfig } from "@aws-sdk/client-sagemaker";
 * const config = {}; // type is SageMakerClientConfig
 * const client = new SageMakerClient(config);
 * const input = { // CreateFlowDefinitionRequest
 *   FlowDefinitionName: "STRING_VALUE", // required
 *   HumanLoopRequestSource: { // HumanLoopRequestSource
 *     AwsManagedHumanLoopRequestSource: "AWS/Rekognition/DetectModerationLabels/Image/V3" || "AWS/Textract/AnalyzeDocument/Forms/V1", // required
 *   },
 *   HumanLoopActivationConfig: { // HumanLoopActivationConfig
 *     HumanLoopActivationConditionsConfig: { // HumanLoopActivationConditionsConfig
 *       HumanLoopActivationConditions: "STRING_VALUE", // required
 *     },
 *   },
 *   HumanLoopConfig: { // HumanLoopConfig
 *     WorkteamArn: "STRING_VALUE", // required
 *     HumanTaskUiArn: "STRING_VALUE", // required
 *     TaskTitle: "STRING_VALUE", // required
 *     TaskDescription: "STRING_VALUE", // required
 *     TaskCount: Number("int"), // required
 *     TaskAvailabilityLifetimeInSeconds: Number("int"),
 *     TaskTimeLimitInSeconds: Number("int"),
 *     TaskKeywords: [ // FlowDefinitionTaskKeywords
 *       "STRING_VALUE",
 *     ],
 *     PublicWorkforceTaskPrice: { // PublicWorkforceTaskPrice
 *       AmountInUsd: { // USD
 *         Dollars: Number("int"),
 *         Cents: Number("int"),
 *         TenthFractionsOfACent: Number("int"),
 *       },
 *     },
 *   },
 *   OutputConfig: { // FlowDefinitionOutputConfig
 *     S3OutputPath: "STRING_VALUE", // required
 *     KmsKeyId: "STRING_VALUE",
 *   },
 *   RoleArn: "STRING_VALUE", // required
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateFlowDefinitionCommand(input);
 * const response = await client.send(command);
 * // { // CreateFlowDefinitionResponse
 * //   FlowDefinitionArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateFlowDefinitionCommandInput - {@link CreateFlowDefinitionCommandInput}
 * @returns {@link CreateFlowDefinitionCommandOutput}
 * @see {@link CreateFlowDefinitionCommandInput} for command's `input` shape.
 * @see {@link CreateFlowDefinitionCommandOutput} for command's `response` shape.
 * @see {@link SageMakerClientResolvedConfig | config} for SageMakerClient's `config` shape.
 *
 * @throws {@link ResourceInUse} (client fault)
 *  <p>Resource being accessed is in use.</p>
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
export declare class CreateFlowDefinitionCommand extends CreateFlowDefinitionCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateFlowDefinitionRequest;
            output: CreateFlowDefinitionResponse;
        };
        sdk: {
            input: CreateFlowDefinitionCommandInput;
            output: CreateFlowDefinitionCommandOutput;
        };
    };
}
