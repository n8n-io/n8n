import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateWorkteamRequest, CreateWorkteamResponse } from "../models/models_2";
import { SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SageMakerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateWorkteamCommand}.
 */
export interface CreateWorkteamCommandInput extends CreateWorkteamRequest {
}
/**
 * @public
 *
 * The output of {@link CreateWorkteamCommand}.
 */
export interface CreateWorkteamCommandOutput extends CreateWorkteamResponse, __MetadataBearer {
}
declare const CreateWorkteamCommand_base: {
    new (input: CreateWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<CreateWorkteamCommandInput, CreateWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateWorkteamCommandInput): import("@smithy/smithy-client").CommandImpl<CreateWorkteamCommandInput, CreateWorkteamCommandOutput, SageMakerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a new work team for labeling your data. A work team is defined by one or more Amazon Cognito user pools. You must first create the user pools before you can create a work team.</p> <p>You cannot create more than 25 work teams in an account and region.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SageMakerClient, CreateWorkteamCommand } from "@aws-sdk/client-sagemaker"; // ES Modules import
 * // const { SageMakerClient, CreateWorkteamCommand } = require("@aws-sdk/client-sagemaker"); // CommonJS import
 * const client = new SageMakerClient(config);
 * const input = { // CreateWorkteamRequest
 *   WorkteamName: "STRING_VALUE", // required
 *   WorkforceName: "STRING_VALUE",
 *   MemberDefinitions: [ // MemberDefinitions // required
 *     { // MemberDefinition
 *       CognitoMemberDefinition: { // CognitoMemberDefinition
 *         UserPool: "STRING_VALUE", // required
 *         UserGroup: "STRING_VALUE", // required
 *         ClientId: "STRING_VALUE", // required
 *       },
 *       OidcMemberDefinition: { // OidcMemberDefinition
 *         Groups: [ // Groups
 *           "STRING_VALUE",
 *         ],
 *       },
 *     },
 *   ],
 *   Description: "STRING_VALUE", // required
 *   NotificationConfiguration: { // NotificationConfiguration
 *     NotificationTopicArn: "STRING_VALUE",
 *   },
 *   WorkerAccessConfiguration: { // WorkerAccessConfiguration
 *     S3Presign: { // S3Presign
 *       IamPolicyConstraints: { // IamPolicyConstraints
 *         SourceIp: "Enabled" || "Disabled",
 *         VpcSourceIp: "Enabled" || "Disabled",
 *       },
 *     },
 *   },
 *   Tags: [ // TagList
 *     { // Tag
 *       Key: "STRING_VALUE", // required
 *       Value: "STRING_VALUE", // required
 *     },
 *   ],
 * };
 * const command = new CreateWorkteamCommand(input);
 * const response = await client.send(command);
 * // { // CreateWorkteamResponse
 * //   WorkteamArn: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CreateWorkteamCommandInput - {@link CreateWorkteamCommandInput}
 * @returns {@link CreateWorkteamCommandOutput}
 * @see {@link CreateWorkteamCommandInput} for command's `input` shape.
 * @see {@link CreateWorkteamCommandOutput} for command's `response` shape.
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
export declare class CreateWorkteamCommand extends CreateWorkteamCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateWorkteamRequest;
            output: CreateWorkteamResponse;
        };
        sdk: {
            input: CreateWorkteamCommandInput;
            output: CreateWorkteamCommandOutput;
        };
    };
}
