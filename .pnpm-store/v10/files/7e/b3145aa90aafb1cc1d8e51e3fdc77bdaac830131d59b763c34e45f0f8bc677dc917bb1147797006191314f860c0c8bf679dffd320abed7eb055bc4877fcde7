import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateTrialComponentRequest, CreateTrialComponentResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateTrialComponentCommand}.
 */
export interface CreateTrialComponentCommandInput extends CreateTrialComponentRequest {
}
/**
 * @public
 *
 * The output of {@link CreateTrialComponentCommand}.
 */
export interface CreateTrialComponentCommandOutput extends CreateTrialComponentResponse, __MetadataBearer {
}
declare const CreateTrialComponentCommand_base: {
    new (input: CreateTrialComponentCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTrialComponentCommandInput, CreateTrialComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateTrialComponentCommandInput): import("@smithy/smithy-client").CommandImpl<CreateTrialComponentCommandInput, CreateTrialComponentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a <i>trial component</i>, which is a stage of a machine learning <i>trial</i>. A trial is composed of one or more trial components. A trial component can be used in multiple trials.</p> <p>Trial components include pre-processing jobs, training jobs, and batch transform jobs.</p> <p>When you use SageMaker Studio or the SageMaker Python SDK, all experiments, trials, and trial components are automatically tracked, logged, and indexed. When you use the Amazon Web Services SDK for Python (Boto), you must use the logging APIs provided by the SDK.</p> <p>You can add tags to a trial component and then use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search for the tags.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateTrialComponentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateTrialComponentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateTrialComponentRequest
 *   TrialComponentName: "STRING_VALUE", // required
 *   DisplayName: "STRING_VALUE",
 *   Status: { // TrialComponentStatus
 *     PrimaryStatus: "InProgress" || "Completed" || "Failed" || "Stopping" || "Stopped",
 *     Message: "STRING_VALUE",
 *   },
 *   StartTime: new Date("TIMESTAMP"),
 *   EndTime: new Date("TIMESTAMP"),
 *   Parameters: { // TrialComponentParameters
 *     "<keys>": { // TrialComponentParameterValue Union: only one key present
 *       StringValue: "STRING_VALUE",
 *       NumberValue: Number("double"),
 *     },
 *   },
 *   InputArtifacts: { // TrialComponentArtifacts
 *     "<keys>": { // TrialComponentArtifact
 *       MediaType: "STRING_VALUE",
 *       Value: "STRING_VALUE", // required
 *     },
 *   },
 *   OutputArtifacts: {
 *     "<keys>": {
 *       MediaType: "STRING_VALUE",
 *       Value: "STRING_VALUE", // required
 *     },
 *   },
 *   MetadataProperties: { // MetadataProperties
 *     CommitId: "STRING_VALUE",
 *     Repository: "STRING_VALUE",
 *     GeneratedBy: "STRING_VALUE",
 *     ProjectId: "STRING_VALUE",
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateTrialComponentCommand(input);
 * const response = await client.send(command);
 * // { // CreateTrialComponentResponse
 * //   TrialComponentArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateTrialComponentCommandInput - {@link CreateTrialComponentCommandInput}
 * @returns {@link CreateTrialComponentCommandOutput}
 * @see {@link CreateTrialComponentCommandInput} for command's `input` shape.
 * @see {@link CreateTrialComponentCommandOutput} for command's `response` shape.
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
export declare class CreateTrialComponentCommand extends CreateTrialComponentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateTrialComponentRequest;
            output: CreateTrialComponentResponse;
        };
        sdk: {
            input: CreateTrialComponentCommandInput;
            output: CreateTrialComponentCommandOutput;
        };
    };
}
