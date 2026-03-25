import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ValidateResourcePolicyRequest, ValidateResourcePolicyResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ValidateResourcePolicyCommand}.
 */
export interface ValidateResourcePolicyCommandInput extends ValidateResourcePolicyRequest {
}
/**
 * @public
 *
 * The output of {@link ValidateResourcePolicyCommand}.
 */
export interface ValidateResourcePolicyCommandOutput extends ValidateResourcePolicyResponse, __MetadataBearer {
}
declare const ValidateResourcePolicyCommand_base: {
    new (input: ValidateResourcePolicyCommandInput): import("@smithy/smithy-client").CommandImpl<ValidateResourcePolicyCommandInput, ValidateResourcePolicyCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ValidateResourcePolicyCommandInput): import("@smithy/smithy-client").CommandImpl<ValidateResourcePolicyCommandInput, ValidateResourcePolicyCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Validates that a resource policy does not grant a wide range of principals access to
 *       your secret. A resource-based policy is optional for secrets.</p>
 *          <p>The API performs three checks when validating the policy:</p>
 *          <ul>
 *             <li>
 *                <p>Sends a call to <a href="https://aws.amazon.com/blogs/security/protect-sensitive-data-in-the-cloud-with-automated-reasoning-zelkova/">Zelkova</a>, an automated reasoning engine, to ensure your resource policy does not
 *           allow broad access to your secret, for example policies that use a wildcard for the principal.</p>
 *             </li>
 *             <li>
 *                <p>Checks for correct syntax in a policy.</p>
 *             </li>
 *             <li>
 *                <p>Verifies the policy does not lock out a caller.</p>
 *             </li>
 *          </ul>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:ValidateResourcePolicy</code> and <code>secretsmanager:PutResourcePolicy</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, ValidateResourcePolicyCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, ValidateResourcePolicyCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // ValidateResourcePolicyRequest
 *   SecretId: "STRING_VALUE",
 *   ResourcePolicy: "STRING_VALUE", // required
 * };
 * const command = new ValidateResourcePolicyCommand(input);
 * const response = await client.send(command);
 * // { // ValidateResourcePolicyResponse
 * //   PolicyValidationPassed: true || false,
 * //   ValidationErrors: [ // ValidationErrorsType
 * //     { // ValidationErrorsEntry
 * //       CheckName: "STRING_VALUE",
 * //       ErrorMessage: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param ValidateResourcePolicyCommandInput - {@link ValidateResourcePolicyCommandInput}
 * @returns {@link ValidateResourcePolicyCommandOutput}
 * @see {@link ValidateResourcePolicyCommandInput} for command's `input` shape.
 * @see {@link ValidateResourcePolicyCommandOutput} for command's `response` shape.
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
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Secrets Manager can't find the resource that you asked for.</p>
 *
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To validate a resource-based policy to a secret
 * ```javascript
 * // The following example shows how to validate a resource-based policy to a secret.
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
 * const command = new ValidateResourcePolicyCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   PolicyValidationPassed: true,
 *   ValidationErrors:   []
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ValidateResourcePolicyCommand extends ValidateResourcePolicyCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ValidateResourcePolicyRequest;
            output: ValidateResourcePolicyResponse;
        };
        sdk: {
            input: ValidateResourcePolicyCommandInput;
            output: ValidateResourcePolicyCommandOutput;
        };
    };
}
