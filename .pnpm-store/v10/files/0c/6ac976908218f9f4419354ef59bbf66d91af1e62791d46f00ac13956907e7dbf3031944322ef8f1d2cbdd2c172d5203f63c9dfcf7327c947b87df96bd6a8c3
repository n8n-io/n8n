import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CreateSecretRequest, CreateSecretResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link CreateSecretCommand}.
 */
export interface CreateSecretCommandInput extends CreateSecretRequest {
}
/**
 * @public
 *
 * The output of {@link CreateSecretCommand}.
 */
export interface CreateSecretCommandOutput extends CreateSecretResponse, __MetadataBearer {
}
declare const CreateSecretCommand_base: {
    new (input: CreateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<CreateSecretCommandInput, CreateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: CreateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<CreateSecretCommandInput, CreateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Creates a new secret. A <i>secret</i> can be a password, a set of
 *       credentials such as a user name and password, an OAuth token, or other secret information
 *       that you store in an encrypted form in Secrets Manager. The secret also
 *       includes the connection information to access a database or other service, which Secrets Manager
 *       doesn't encrypt. A secret in Secrets Manager consists of both the protected secret data and the
 *       important information needed to manage the secret.</p>
 *          <p>For secrets that use <i>managed rotation</i>, you need to create the secret through the managing service. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/service-linked-secrets.html">Secrets Manager secrets managed by other Amazon Web Services services</a>.
 *
 *     </p>
 *          <p>For information about creating a secret in the console, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_create-basic-secret.html">Create a secret</a>.</p>
 *          <p>To create a secret, you can provide the secret value to be encrypted in either the
 *       <code>SecretString</code> parameter or the <code>SecretBinary</code> parameter, but not both.
 *       If you include <code>SecretString</code> or <code>SecretBinary</code>
 *       then Secrets Manager creates an initial secret version and automatically attaches the staging
 *       label <code>AWSCURRENT</code> to it.</p>
 *          <p>For database credentials you want to rotate, for Secrets Manager to be able to rotate the secret,
 *       you must make sure the JSON you store in the <code>SecretString</code> matches the <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_secret_json_structure.html">JSON structure of
 *         a database secret</a>.</p>
 *          <p>If you don't specify an KMS encryption key, Secrets Manager uses the Amazon Web Services managed key
 *       <code>aws/secretsmanager</code>. If this key
 *       doesn't already exist in your account, then Secrets Manager creates it for you automatically. All
 *       users and roles in the Amazon Web Services account automatically have access to use <code>aws/secretsmanager</code>.
 *       Creating <code>aws/secretsmanager</code> can result in a one-time significant delay in returning the
 *       result.</p>
 *          <p>If the secret is in a different Amazon Web Services account from the credentials calling the API, then
 *       you can't use <code>aws/secretsmanager</code> to encrypt the secret, and you must create
 *       and use a customer managed KMS key. </p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters except <code>SecretBinary</code> or <code>SecretString</code> because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:CreateSecret</code>. If you
 *       include tags in the secret, you also need <code>secretsmanager:TagResource</code>. To add replica Regions, you must also have <code>secretsmanager:ReplicateSecretToRegions</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 *          <p>To encrypt the secret with a KMS key other than <code>aws/secretsmanager</code>, you need <code>kms:GenerateDataKey</code> and <code>kms:Decrypt</code> permission to the key. </p>
 *          <important>
 *             <p>When you enter commands in a command shell, there is a risk of the command history being accessed or utilities having access to your command parameters. This is a concern if the command includes the value of a secret. Learn how to <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/security_cli-exposure-risks.html">Mitigate the risks of using command-line tools to store Secrets Manager secrets</a>.</p>
 *          </important>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, CreateSecretCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, CreateSecretCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // CreateSecretRequest
 *   Name: "STRING_VALUE", // required
 *   ClientRequestToken: "STRING_VALUE",
 *   Description: "STRING_VALUE",
 *   KmsKeyId: "STRING_VALUE",
 *   SecretBinary: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
 *   SecretString: "STRING_VALUE",
 *   Tags: [ // TagListType
 *     { // Tag
 *       Key: "STRING_VALUE",
 *       Value: "STRING_VALUE",
 *     },
 *   ],
 *   AddReplicaRegions: [ // AddReplicaRegionListType
 *     { // ReplicaRegionType
 *       Region: "STRING_VALUE",
 *       KmsKeyId: "STRING_VALUE",
 *     },
 *   ],
 *   ForceOverwriteReplicaSecret: true || false,
 * };
 * const command = new CreateSecretCommand(input);
 * const response = await client.send(command);
 * // { // CreateSecretResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * //   ReplicationStatus: [ // ReplicationStatusListType
 * //     { // ReplicationStatusType
 * //       Region: "STRING_VALUE",
 * //       KmsKeyId: "STRING_VALUE",
 * //       Status: "InSync" || "Failed" || "InProgress",
 * //       StatusMessage: "STRING_VALUE",
 * //       LastAccessedDate: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param CreateSecretCommandInput - {@link CreateSecretCommandInput}
 * @returns {@link CreateSecretCommandOutput}
 * @see {@link CreateSecretCommandInput} for command's `input` shape.
 * @see {@link CreateSecretCommandOutput} for command's `response` shape.
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
 * @example To create a basic secret
 * ```javascript
 * // The following example shows how to create a secret. The credentials stored in the encrypted secret value are retrieved from a file on disk named mycreds.json.
 * const input = {
 *   ClientRequestToken: "EXAMPLE1-90ab-cdef-fedc-ba987SECRET1",
 *   Description: "My test database secret created with the CLI",
 *   Name: "MyTestDatabaseSecret",
 *   SecretString: `{"username":"david","password":"EXAMPLE-PASSWORD"}`
 * };
 * const command = new CreateSecretCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   VersionId: "EXAMPLE1-90ab-cdef-fedc-ba987SECRET1"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class CreateSecretCommand extends CreateSecretCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: CreateSecretRequest;
            output: CreateSecretResponse;
        };
        sdk: {
            input: CreateSecretCommandInput;
            output: CreateSecretCommandOutput;
        };
    };
}
