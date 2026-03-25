import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CancelRotateSecretRequest, CancelRotateSecretResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CancelRotateSecretCommand}.
 */
export interface CancelRotateSecretCommandInput extends CancelRotateSecretRequest {
}
/**
 * @public
 *
 * The output of {@link CancelRotateSecretCommand}.
 */
export interface CancelRotateSecretCommandOutput extends CancelRotateSecretResponse, __MetadataBearer {
}
declare const CancelRotateSecretCommand_base: {
    new (input: CancelRotateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<CancelRotateSecretCommandInput, CancelRotateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CancelRotateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<CancelRotateSecretCommandInput, CancelRotateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Turns off automatic rotation, and if a rotation is currently in
 *       progress, cancels the rotation.</p>
 *          <p>If you cancel a rotation in progress, it can leave the <code>VersionStage</code>
 *       labels in an unexpected state. You might
 *       need to remove the staging label <code>AWSPENDING</code> from the partially created version.
 *       You also need to determine whether to roll back to the previous version of the secret
 *       by moving the staging label <code>AWSCURRENT</code> to the version that has <code>AWSPENDING</code>.
 *       To determine
 *       which version has a specific staging label, call <a>ListSecretVersionIds</a>. Then use
 *      <a>UpdateSecretVersionStage</a> to change staging labels.
 *      For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_how.html">How rotation works</a>.</p>
 *          <p>To turn on automatic rotation again, call <a>RotateSecret</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:CancelRotateSecret</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, CancelRotateSecretCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, CancelRotateSecretCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // CancelRotateSecretRequest
 *   SecretId: "STRING_VALUE", // required
 * };
 * const command = new CancelRotateSecretCommand(input);
 * const response = await client.send(command);
 * // { // CancelRotateSecretResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param CancelRotateSecretCommandInput - {@link CancelRotateSecretCommandInput}
 * @returns {@link CancelRotateSecretCommandOutput}
 * @see {@link CancelRotateSecretCommandInput} for command's `input` shape.
 * @see {@link CancelRotateSecretCommandOutput} for command's `response` shape.
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
 * @example To cancel scheduled rotation for a secret
 * ```javascript
 * // The following example shows how to cancel rotation for a secret. The operation sets the RotationEnabled field to false and cancels all scheduled rotations. To resume scheduled rotations, you must re-enable rotation by calling the rotate-secret operation.
 * const input = {
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new CancelRotateSecretCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "Name"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class CancelRotateSecretCommand extends CancelRotateSecretCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CancelRotateSecretRequest;
            output: CancelRotateSecretResponse;
        };
        sdk: {
            input: CancelRotateSecretCommandInput;
            output: CancelRotateSecretCommandOutput;
        };
    };
}
