import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetResourcePolicyRequest, GetResourcePolicyResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetResourcePolicyCommand}.
 */
export interface GetResourcePolicyCommandInput extends GetResourcePolicyRequest {
}
/**
 * @public
 *
 * The output of {@link GetResourcePolicyCommand}.
 */
export interface GetResourcePolicyCommandOutput extends GetResourcePolicyResponse, __MetadataBearer {
}
declare const GetResourcePolicyCommand_base: {
    new (input: GetResourcePolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetResourcePolicyCommandInput, GetResourcePolicyCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetResourcePolicyCommandInput): import("@smithy/smithy-client").CommandImpl<GetResourcePolicyCommandInput, GetResourcePolicyCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves the JSON text of the resource-based policy document attached to the
 *       secret. For more information about permissions policies attached to a secret, see
 *       <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-policies.html">Permissions
 *         policies attached to a secret</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:GetResourcePolicy</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, GetResourcePolicyCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, GetResourcePolicyCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // GetResourcePolicyRequest
 *   SecretId: "STRING_VALUE", // required
 * };
 * const command = new GetResourcePolicyCommand(input);
 * const response = await client.send(command);
 * // { // GetResourcePolicyResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   ResourcePolicy: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param GetResourcePolicyCommandInput - {@link GetResourcePolicyCommandInput}
 * @returns {@link GetResourcePolicyCommandOutput}
 * @see {@link GetResourcePolicyCommandInput} for command's `input` shape.
 * @see {@link GetResourcePolicyCommandOutput} for command's `response` shape.
 * @see {@link SecretsManagerClientResolvedConfig | config} for SecretsManagerClient's `config` shape.
 *
 * @throws {@link InternalServiceError} (server fault)
 *  <p>An error occurred on the server side.</p>
 *
 * @throws {@link InvalidParameterException} (client fault)
 *  <p>The parameter name or value is invalid.</p>
 *
 * @throws {@link InvalidRequestException} (client fault)
 *  <p>A parameter value is not valid for the current state of the
 *       resource.</p>
 *          <p>Possible causes:</p>
 *          <ul>
 *             <li>
 *                <p>The secret is scheduled for deletion.</p>
 *             </li>
 *             <li>
 *                <p>You tried to enable rotation on a secret that doesn't already have a Lambda function
 *           ARN configured and you didn't include such an ARN as a parameter in this call. </p>
 *             </li>
 *             <li>
 *                <p>The secret is managed by another service, and you must use that service to update it.
 *           For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/service-linked-secrets.html">Secrets managed by other Amazon Web Services services</a>.</p>
 *             </li>
 *          </ul>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Secrets Manager can't find the resource that you asked for.</p>
 *
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To retrieve the resource-based policy attached to a secret
 * ```javascript
 * // The following example shows how to retrieve the resource-based policy that is attached to a secret.
 * const input = {
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new GetResourcePolicyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   ResourcePolicy: `{
 * "Version":"2012-10-17",
 * "Statement":[{
 * "Effect":"Allow",
 * "Principal":{
 * "AWS":"arn:aws:iam::123456789012:root"
 * },
 * "Action":"secretsmanager:GetSecretValue",
 * "Resource":"*"
 * }]
 * }`
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetResourcePolicyCommand extends GetResourcePolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetResourcePolicyRequest;
            output: GetResourcePolicyResponse;
        };
        sdk: {
            input: GetResourcePolicyCommandInput;
            output: GetResourcePolicyCommandOutput;
        };
    };
}
