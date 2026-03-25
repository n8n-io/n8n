import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateEndpointInput, CreateEndpointOutput } from "../models/models_1";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateEndpointCommand}.
 */
export interface CreateEndpointCommandInput extends CreateEndpointInput {
}
/**
 * @public
 *
 * The output of {@link CreateEndpointCommand}.
 */
export interface CreateEndpointCommandOutput extends CreateEndpointOutput, __MetadataBearer {
}
declare const CreateEndpointCommand_base: {
    new (input: CreateEndpointCommandInput): import("@smithy/smithy-client").CommandImpl<CreateEndpointCommandInput, CreateEndpointCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateEndpointCommandInput): import("@smithy/smithy-client").CommandImpl<CreateEndpointCommandInput, CreateEndpointCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates an endpoint using the endpoint configuration specified in the request. SageMaker uses the endpoint to provision resources and deploy models. You create the endpoint configuration with the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html">CreateEndpointConfig</a> API. </p> <p> Use this API to deploy models using SageMaker hosting services. </p> <note> <p> You must not delete an <code>EndpointConfig</code> that is in use by an endpoint that is live or while the <code>UpdateEndpoint</code> or <code>CreateEndpoint</code> operations are being performed on the endpoint. To update an endpoint, you must create a new <code>EndpointConfig</code>.</p> </note> <p>The endpoint name must be unique within an Amazon Web Services Region in your Amazon Web Services account. </p> <p>When it receives the request, SageMaker creates the endpoint, launches the resources (ML compute instances), and deploys the model(s) on them. </p> <note> <p>When you call <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpoint.html">CreateEndpoint</a>, a load call is made to DynamoDB to verify that your endpoint configuration exists. When you read data from a DynamoDB table supporting <a href="https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html"> <code>Eventually Consistent Reads</code> </a>, the response might not reflect the results of a recently completed write operation. The response might include some stale data. If the dependent entities are not yet in DynamoDB, this causes a validation error. If you repeat your read request after a short time, the response should return the latest data. So retry logic is recommended to handle these possible issues. We also recommend that customers call <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeEndpointConfig.html">DescribeEndpointConfig</a> before calling <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpoint.html">CreateEndpoint</a> to minimize the potential impact of a DynamoDB eventually consistent read.</p> </note> <p>When SageMaker receives the request, it sets the endpoint status to <code>Creating</code>. After it creates the endpoint, it sets the status to <code>InService</code>. SageMaker can then process incoming requests for inferences. To check the status of an endpoint, use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_DescribeEndpoint.html">DescribeEndpoint</a> API.</p> <p>If any of the models hosted at this endpoint get model data from an Amazon S3 location, SageMaker uses Amazon Web Services Security Token Service to download model artifacts from the S3 path you provided. Amazon Web Services STS is activated in your Amazon Web Services account by default. If you previously deactivated Amazon Web Services STS for a region, you need to reactivate Amazon Web Services STS for that region. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_enable-regions.html">Activating and Deactivating Amazon Web Services STS in an Amazon Web Services Region</a> in the <i>Amazon Web Services Identity and Access Management User Guide</i>.</p> <note> <p> To add the IAM role policies for using this API operation, go to the <a href="https://console.aws.amazon.com/iam/">IAM console</a>, and choose Roles in the left navigation pane. Search the IAM role that you want to grant access to use the <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpoint.html">CreateEndpoint</a> and <a href="https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_CreateEndpointConfig.html">CreateEndpointConfig</a> API operations, add the following policies to the role. </p> <ul> <li> <p>Option 1: For a full SageMaker access, search and attach the <code>AmazonSageMakerFullAccess</code> policy.</p> </li> <li> <p>Option 2: For granting a limited access to an IAM role, paste the following Action elements manually into the JSON file of the IAM role: </p> <p> <code>"Action": ["sagemaker:CreateEndpoint", "sagemaker:CreateEndpointConfig"]</code> </p> <p> <code>"Resource": [</code> </p> <p> <code>"arn:aws:sagemaker:region:account-id:endpoint/endpointName"</code> </p> <p> <code>"arn:aws:sagemaker:region:account-id:endpoint-config/endpointConfigName"</code> </p> <p> <code>]</code> </p> <p>For more information, see <a href="https://docs.aws.amazon.com/sagemaker/latest/dg/api-permissions-reference.html">SageMaker API Permissions: Actions, Permissions, and Resources Reference</a>.</p> </li> </ul> </note>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateEndpointCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateEndpointCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateEndpointInput
 *   EndpointName: "STRING_VALUE", // required
 *   EndpointConfigName: "STRING_VALUE", // required
 *   DeploymentConfig: { // DeploymentConfig
 *     BlueGreenUpdatePolicy: { // BlueGreenUpdatePolicy
 *       TrafficRoutingConfiguration: { // TrafficRoutingConfig
 *         Type: "ALL_AT_ONCE" || "CANARY" || "LINEAR", // required
 *         WaitIntervalInSeconds: Number("int"), // required
 *         CanarySize: { // CapacitySize
 *           Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *           Value: Number("int"), // required
 *         },
 *         LinearStepSize: {
 *           Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *           Value: Number("int"), // required
 *         },
 *       },
 *       TerminationWaitInSeconds: Number("int"),
 *       MaximumExecutionTimeoutInSeconds: Number("int"),
 *     },
 *     RollingUpdatePolicy: { // RollingUpdatePolicy
 *       MaximumBatchSize: {
 *         Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *         Value: Number("int"), // required
 *       },
 *       WaitIntervalInSeconds: Number("int"), // required
 *       MaximumExecutionTimeoutInSeconds: Number("int"),
 *       RollbackMaximumBatchSize: {
 *         Type: "INSTANCE_COUNT" || "CAPACITY_PERCENT", // required
 *         Value: Number("int"), // required
 *       },
 *     },
 *     AutoRollbackConfiguration: { // AutoRollbackConfig
 *       Alarms: [ // AlarmList
 *         { // Alarm
 *           AlarmName: "STRING_VALUE",
 *         },
 *       ],
 *     },
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateEndpointCommand(input);
 * const response = await client.send(command);
 * // { // CreateEndpointOutput
 * //   EndpointArn: "STRING_VALUE", // required
 * // };
 *
 * ```
 *
 * @param CreateEndpointCommandInput - {@link CreateEndpointCommandInput}
 * @returns {@link CreateEndpointCommandOutput}
 * @see {@link CreateEndpointCommandInput} for command's `input` shape.
 * @see {@link CreateEndpointCommandOutput} for command's `response` shape.
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
export declare class CreateEndpointCommand extends CreateEndpointCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateEndpointInput;
            output: CreateEndpointOutput;
        };
        sdk: {
            input: CreateEndpointCommandInput;
            output: CreateEndpointCommandOutput;
        };
    };
}
