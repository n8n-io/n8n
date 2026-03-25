import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateSecretRequest, UpdateSecretResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateSecretCommand}.
 */
export interface UpdateSecretCommandInput extends UpdateSecretRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateSecretCommand}.
 */
export interface UpdateSecretCommandOutput extends UpdateSecretResponse, __MetadataBearer {
}
declare const UpdateSecretCommand_base: {
    new (input: UpdateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateSecretCommandInput, UpdateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateSecretCommandInput, UpdateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Modifies the details of a secret, including metadata and the secret value. To change the secret value, you can also use <a>PutSecretValue</a>.</p>
 *          <p>To change the rotation configuration of a secret, use <a>RotateSecret</a> instead.</p>
 *          <p>To change a secret so that it is managed by another service, you need to recreate the secret in that service. See <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/service-linked-secrets.html">Secrets Manager secrets managed by other Amazon Web Services services</a>.</p>
 *          <p>We recommend you avoid calling <code>UpdateSecret</code> at a sustained rate of more than
 *       once every 10 minutes. When you call <code>UpdateSecret</code> to update the secret value, Secrets Manager creates a new version
 *       of the secret. Secrets Manager removes outdated versions when there are more than 100, but it does not
 *       remove versions created less than 24 hours ago. If you update the secret value more
 *       than once every 10 minutes, you create more versions than Secrets Manager removes, and you will reach
 *       the quota for secret versions.</p>
 *          <p>If you include <code>SecretString</code> or <code>SecretBinary</code> to create a new
 *       secret version, Secrets Manager automatically moves the staging label <code>AWSCURRENT</code> to the new
 *       version. Then it attaches the label <code>AWSPREVIOUS</code>
 *         to the version that <code>AWSCURRENT</code> was removed from.</p>
 *          <p>If you call this operation with a <code>ClientRequestToken</code> that matches an existing version's
 *       <code>VersionId</code>, the operation results in an error. You can't modify an existing
 *       version, you can only create a new version. To remove a version, remove all staging labels from it. See
 *     <a>UpdateSecretVersionStage</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters except <code>SecretBinary</code> or <code>SecretString</code> because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:UpdateSecret</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>.
 *       If you use a customer managed key, you must also have <code>kms:GenerateDataKey</code>, <code>kms:Encrypt</code>, and
 *       <code>kms:Decrypt</code> permissions on the key. If you change the KMS key and you don't have <code>kms:Encrypt</code> permission to the new key, Secrets Manager does not re-encrypt existing secret versions with the new key. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/security-encryption.html">
 *         Secret encryption and decryption</a>.</p>
 *          <important>
 *             <p>When you enter commands in a command shell, there is a risk of the command history being accessed or utilities having access to your command parameters. This is a concern if the command includes the value of a secret. Learn how to <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/security_cli-exposure-risks.html">Mitigate the risks of using command-line tools to store Secrets Manager secrets</a>.</p>
 *          </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, UpdateSecretCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, UpdateSecretCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // UpdateSecretRequest
 *   SecretId: "STRING_VALUE", // required
 *   ClientRequestToken: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 *   KmsKeyId: "STRING_VALUE",
 *   SecretBinary: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *   SecretString: "STRING_VALUE",
 * };
 * const command = new UpdateSecretCommand(input);
 * const response = await client.send(command);
 * // { // UpdateSecretResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateSecretCommandInput - {@link UpdateSecretCommandInput}
 * @returns {@link UpdateSecretCommandOutput}
 * @see {@link UpdateSecretCommandInput} for command's `input` shape.
 * @see {@link UpdateSecretCommandOutput} for command's `response` shape.
 * @see {@link SecretsManagerClientResolvedConfig | config} for SecretsManagerClient's `config` shape.
 *
 * @throws {@link DecryptionFailure} (client fault)
 *  <p>Secrets Manager can't decrypt the protected secret text using the provided KMS key. </p>
 *
 * @throws {@link EncryptionFailure} (client fault)
 *  <p>Secrets Manager can't encrypt the protected secret text using the provided KMS key. Check that the
 *       KMS key is available, enabled, and not in an invalid state. For more
 *       information, see <a href="https://docs.aws.amazon.com/kms/latest/developerguide/key-state.html">Key state: Effect on your KMS key</a>.</p>
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
 * @throws {@link LimitExceededException} (client fault)
 *  <p>The request failed because it would exceed one of the Secrets Manager quotas.</p>
 *
 * @throws {@link MalformedPolicyDocumentException} (client fault)
 *  <p>The resource policy has syntax errors.</p>
 *
 * @throws {@link PreconditionNotMetException} (client fault)
 *  <p>The request failed because you did not complete all the prerequisite steps.</p>
 *
 * @throws {@link ResourceExistsException} (client fault)
 *  <p>A resource with the ID you requested already exists.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Secrets Manager can't find the resource that you asked for.</p>
 *
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To create a new version of the encrypted secret value
 * ```javascript
 * // The following example shows how to create a new version of the secret by updating the SecretString field. Alternatively, you can use the put-secret-value operation.
 * const input = {
 *   SecretId: "MyTestDatabaseSecret",
 *   SecretString: "{JSON STRING WITH CREDENTIALS}"
 * };
 * const command = new UpdateSecretCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "aws:arn:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   VersionId: "EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE"
 * }
 * *\/
 * ```
 *
 * @example To update the description of a secret
 * ```javascript
 * // The following example shows how to modify the description of a secret.
 * const input = {
 *   ClientRequestToken: "EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE",
 *   Description: "This is a new description for the secret.",
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new UpdateSecretCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret"
 * }
 * *\/
 * ```
 *
 * @example To update the KMS key associated with a secret
 * ```javascript
 * // This example shows how to update the KMS customer managed key (CMK) used to encrypt the secret value. The KMS CMK must be in the same region as the secret.
 * const input = {
 *   KmsKeyId: "arn:aws:kms:us-west-2:123456789012:key/EXAMPLE2-90ab-cdef-fedc-ba987EXAMPLE",
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new UpdateSecretCommand(input);
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
export declare class UpdateSecretCommand extends UpdateSecretCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateSecretRequest;
            output: UpdateSecretResponse;
        };
        sdk: {
            input: UpdateSecretCommandInput;
            output: UpdateSecretCommandOutput;
        };
    };
}
