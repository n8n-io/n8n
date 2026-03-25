import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateExperimentRequest, CreateExperimentResponse } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateExperimentCommand}.
 */
export interface CreateExperimentCommandInput extends CreateExperimentRequest {
}
/**
 * @public
 *
 * The output of {@link CreateExperimentCommand}.
 */
export interface CreateExperimentCommandOutput extends CreateExperimentResponse, __MetadataBearer {
}
declare const CreateExperimentCommand_base: {
    new (input: CreateExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<CreateExperimentCommandInput, CreateExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateExperimentCommandInput): import("@smithy/smithy-client").CommandImpl<CreateExperimentCommandInput, CreateExperimentCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a SageMaker <i>experiment</i>. An experiment is a collection of <i>trials</i> that are observed, compared and evaluated as a group. A trial is a set of steps, called <i>trial components</i>, that produce a machine learning model.</p> <note> <p>In the Studio UI, trials are referred to as <i>run groups</i> and trial components are referred to as <i>runs</i>.</p> </note> <p>The goal of an experiment is to determine the components that produce the best model. Multiple trials are performed, each one isolating and measuring the impact of a change to one or more inputs, while keeping the remaining inputs constant.</p> <p>When you use SageMaker Studio or the SageMaker Python SDK, all experiments, trials, and trial components are automatically tracked, logged, and indexed. When you use the Amazon Web Services SDK for Python (Boto), you must use the logging APIs provided by the SDK.</p> <p>You can add tags to experiments, trials, trial components and then use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_Search.html">Search</a> API to search for the tags.</p> <p>To add a description to an experiment, specify the optional <code>Description</code> parameter. To add a description later, or to change the description, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateExperiment.html">UpdateExperiment</a> API.</p> <p>To get a list of all your experiments, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ListExperiments.html">ListExperiments</a> API. To view an experiment's properties, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeExperiment.html">DescribeExperiment</a> API. To get a list of all the trials associated with an experiment, call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_ListTrials.html">ListTrials</a> API. To create a trial call the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateTrial.html">CreateTrial</a> API.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateExperimentCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateExperimentCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateExperimentRequest
 *   ExperimentName: "STRING_VALUE", // required
 *   DisplayName: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateExperimentCommand(input);
 * const response = await client.send(command);
 * // { // CreateExperimentResponse
 * //   ExperimentArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateExperimentCommandInput - {@link CreateExperimentCommandInput}
 * @returns {@link CreateExperimentCommandOutput}
 * @see {@link CreateExperimentCommandInput} for command's `input` shape.
 * @see {@link CreateExperimentCommandOutput} for command's `response` shape.
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
export declare class CreateExperimentCommand extends CreateExperimentCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateExperimentRequest;
            output: CreateExperimentResponse;
        };
        sdk: {
            input: CreateExperimentCommandInput;
            output: CreateExperimentCommandOutput;
        };
    };
}
