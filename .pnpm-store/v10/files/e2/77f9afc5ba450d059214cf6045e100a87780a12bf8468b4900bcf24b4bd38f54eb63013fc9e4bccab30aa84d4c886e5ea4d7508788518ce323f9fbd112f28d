import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutResourcePolicyRequest, PutResourcePolicyResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutResourcePolicyCommand}.
 */
export interface PutResourcePolicyCommandInput extends PutResourcePolicyRequest {
}
/**
 * @public
 *
 * The output of {@link PutResourcePolicyCommand}.
 */
export interface PutResourcePolicyCommandOutput extends PutResourcePolicyResponse, __MetadataBearer {
}
declare const PutResourcePolicyCommand_base: {
    new (input: PutResourcePolicyCommandInput): import("@smithy/smithy-client").CommandImpl<PutResourcePolicyCommandInput, PutResourcePolicyCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutResourcePolicyCommandInput): import("@smithy/smithy-client").CommandImpl<PutResourcePolicyCommandInput, PutResourcePolicyCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Attaches a resource-based permission policy to a secret. A resource-based policy is
 *       optional. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication and access control for Secrets Manager</a>
 *          </p>
 *          <p>For information about attaching a policy in the console, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-based-policies.html">Attach a
 *       permissions policy to a secret</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:PutResourcePolicy</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, PutResourcePolicyCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, PutResourcePolicyCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // PutResourcePolicyRequest
 *   SecretId: "STRING_VALUE", // required
 *   ResourcePolicy: "STRING_VALUE", // required
 *   BlockPublicPolicy: true || false,
 * };
 * const command = new PutResourcePolicyCommand(input);
 * const response = await client.send(command);
 * // { // PutResourcePolicyResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param PutResourcePolicyCommandInput - {@link PutResourcePolicyCommandInput}
 * @returns {@link PutResourcePolicyCommandOutput}
 * @see {@link PutResourcePolicyCommandInput} for command's `input` shape.
 * @see {@link PutResourcePolicyCommandOutput} for command's `response` shape.
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
 * @throws {@link MalformedPolicyDocumentException} (client fault)
 *  <p>The resource policy has syntax errors.</p>
 *
 * @throws {@link PublicPolicyException} (client fault)
 *  <p>The <code>BlockPublicPolicy</code> parameter is set to true, and the resource policy did not prevent broad access to the secret.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Secrets Manager can't find the resource that you asked for.</p>
 *
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To add a resource-based policy to a secret
 * ```javascript
 * // The following example shows how to add a resource-based policy to a secret.
 * const input = {
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
 * }`,
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new PutResourcePolicyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutResourcePolicyCommand extends PutResourcePolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutResourcePolicyRequest;
            output: PutResourcePolicyResponse;
        };
        sdk: {
            input: PutResourcePolicyCommandInput;
            output: PutResourcePolicyCommandOutput;
        };
    };
}
