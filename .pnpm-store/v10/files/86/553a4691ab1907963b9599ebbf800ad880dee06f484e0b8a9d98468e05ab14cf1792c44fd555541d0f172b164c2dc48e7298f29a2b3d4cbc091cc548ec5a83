import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { PutSecretValueRequest, PutSecretValueResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link PutSecretValueCommand}.
 */
export interface PutSecretValueCommandInput extends PutSecretValueRequest {
}
/**
 * @public
 *
 * The output of {@link PutSecretValueCommand}.
 */
export interface PutSecretValueCommandOutput extends PutSecretValueResponse, __MetadataBearer {
}
declare const PutSecretValueCommand_base: {
    new (input: PutSecretValueCommandInput): import("@smithy/smithy-client").CommandImpl<PutSecretValueCommandInput, PutSecretValueCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: PutSecretValueCommandInput): import("@smithy/smithy-client").CommandImpl<PutSecretValueCommandInput, PutSecretValueCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a new version with a new encrypted secret value and attaches it to the secret. The
 *       version can contain a new <code>SecretString</code> value or a new <code>SecretBinary</code> value. </p>
 *          <p>We recommend you avoid calling <code>PutSecretValue</code> at a sustained rate of more than
 *       once every 10 minutes. When you update the secret value, Secrets Manager creates a new version
 *       of the secret. Secrets Manager removes outdated versions when there are more than 100, but it does not
 *       remove versions created less than 24 hours ago. If you call <code>PutSecretValue</code> more
 *       than once every 10 minutes, you create more versions than Secrets Manager removes, and you will reach
 *       the quota for secret versions.</p>
 *          <p>You can specify the staging labels to attach to the new version in <code>VersionStages</code>.
 *       If you don't include <code>VersionStages</code>, then Secrets Manager automatically
 *       moves the staging label <code>AWSCURRENT</code> to this version. If this operation creates
 *       the first version for the secret, then Secrets Manager
 *         automatically attaches the staging label <code>AWSCURRENT</code> to it.
 *     If this operation moves the staging label <code>AWSCURRENT</code> from another version to this
 *       version, then Secrets Manager also automatically moves the staging label <code>AWSPREVIOUS</code> to
 *       the version that <code>AWSCURRENT</code> was removed from.</p>
 *          <p>This operation is idempotent. If you call this operation with a <code>ClientRequestToken</code>
 *     that matches an existing version's VersionId, and you specify the
 *       same secret data, the operation succeeds but does nothing. However, if the secret data is
 *       different, then the operation fails because you can't modify an existing version; you can
 *       only create new ones.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters except <code>SecretBinary</code>, <code>SecretString</code>, or <code>RotationToken</code> because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:PutSecretValue</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 *          <important>
 *             <p>When you enter commands in a command shell, there is a risk of the command history being accessed or utilities having access to your command parameters. This is a concern if the command includes the value of a secret. Learn how to <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/security_cli-exposure-risks.html">Mitigate the risks of using command-line tools to store Secrets Manager secrets</a>.</p>
 *          </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, PutSecretValueCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, PutSecretValueCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // PutSecretValueRequest
 *   SecretId: "STRING_VALUE", // required
 *   ClientRequestToken: "STRING_VALUE",
 *   SecretBinary: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *   SecretString: "STRING_VALUE",
 *   VersionStages: [ // SecretVersionStagesType
 *     "STRING_VALUE",
 *   ],
 *   RotationToken: "STRING_VALUE",
 * };
 * const command = new PutSecretValueCommand(input);
 * const response = await client.send(command);
 * // { // PutSecretValueResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * //   VersionStages: [ // SecretVersionStagesType
 * //     "STRING_VALUE",
 * //   ],
 * // };
 *
 * ```
 *
 * @param PutSecretValueCommandInput - {@link PutSecretValueCommandInput}
 * @returns {@link PutSecretValueCommandOutput}
 * @see {@link PutSecretValueCommandInput} for command's `input` shape.
 * @see {@link PutSecretValueCommandOutput} for command's `response` shape.
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
 * @example To store a secret value in a new version of a secret
 * ```javascript
 * // The following example shows how to create a new version of the secret. Alternatively, you can use the update-secret command.
 * const input = {
 *   ClientRequestToken: "EXAMPLE2-90ab-cdef-fedc-ba987EXAMPLE",
 *   SecretId: "MyTestDatabaseSecret",
 *   SecretString: `{"username":"david","password":"EXAMPLE-PASSWORD"}`
 * };
 * const command = new PutSecretValueCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   VersionId: "EXAMPLE2-90ab-cdef-fedc-ba987EXAMPLE",
 *   VersionStages: [
 *     "AWSCURRENT"
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class PutSecretValueCommand extends PutSecretValueCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: PutSecretValueRequest;
            output: PutSecretValueResponse;
        };
        sdk: {
            input: PutSecretValueCommandInput;
            output: PutSecretValueCommandOutput;
        };
    };
}
