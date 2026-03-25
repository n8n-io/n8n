import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { RotateSecretRequest, RotateSecretResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RotateSecretCommand}.
 */
export interface RotateSecretCommandInput extends RotateSecretRequest {
}
/**
 * @public
 *
 * The output of {@link RotateSecretCommand}.
 */
export interface RotateSecretCommandOutput extends RotateSecretResponse, __MetadataBearer {
}
declare const RotateSecretCommand_base: {
    new (input: RotateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<RotateSecretCommandInput, RotateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RotateSecretCommandInput): import("@smithy/smithy-client").CommandImpl<RotateSecretCommandInput, RotateSecretCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Configures and starts the asynchronous process of rotating the secret. For information about rotation,
 *       see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html">Rotate secrets</a> in the <i>Secrets Manager User Guide</i>. If you include the configuration parameters, the operation sets the values for the secret and then immediately starts a rotation. If you don't include the configuration parameters, the operation starts a rotation with the values already stored in the secret. </p>
 *          <p>When rotation is successful, the <code>AWSPENDING</code> staging label might be attached
 *       to the same version as the <code>AWSCURRENT</code> version, or it might not be attached to any
 *       version. If the <code>AWSPENDING</code> staging label is present but not attached to the same
 *       version as <code>AWSCURRENT</code>, then any later invocation of <code>RotateSecret</code>
 *       assumes that a previous rotation request is still in progress and returns an error. When rotation is unsuccessful, the <code>AWSPENDING</code> staging label might be attached to an empty secret version. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/troubleshoot_rotation.html">Troubleshoot rotation</a> in the <i>Secrets Manager User Guide</i>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:RotateSecret</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. You also need <code>lambda:InvokeFunction</code> permissions on the rotation function.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-required-permissions-function.html">
 *         Permissions for rotation</a>.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, RotateSecretCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, RotateSecretCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // RotateSecretRequest
 *   SecretId: "STRING_VALUE", // required
 *   ClientRequestToken: "STRING_VALUE",
 *   RotationLambdaARN: "STRING_VALUE",
 *   RotationRules: { // RotationRulesType
 *     AutomaticallyAfterDays: Number("long"),
 *     Duration: "STRING_VALUE",
 *     ScheduleExpression: "STRING_VALUE",
 *   },
 *   RotateImmediately: true || false,
 * };
 * const command = new RotateSecretCommand(input);
 * const response = await client.send(command);
 * // { // RotateSecretResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param RotateSecretCommandInput - {@link RotateSecretCommandInput}
 * @returns {@link RotateSecretCommandOutput}
 * @see {@link RotateSecretCommandInput} for command's `input` shape.
 * @see {@link RotateSecretCommandOutput} for command's `response` shape.
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
 * @example To configure rotation for a secret
 * ```javascript
 * // The following example configures rotation for a secret using a cron expression. The first rotation happens immediately after the changes are stored in the secret. The rotation schedule is the first and 15th day of every month. The rotation window begins at 4:00 PM UTC and ends at 6:00 PM.
 * const input = {
 *   RotationLambdaARN: "arn:aws:lambda:us-west-2:123456789012:function:MyTestDatabaseRotationLambda",
 *   RotationRules: {
 *     Duration: "2h",
 *     ScheduleExpression: "cron(0 16 1,15 * ? *)"
 *   },
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new RotateSecretCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   VersionId: "EXAMPLE2-90ab-cdef-fedc-ba987SECRET2"
 * }
 * *\/
 * ```
 *
 * @example To request an immediate rotation for a secret
 * ```javascript
 * // The following example requests an immediate invocation of the secret's Lambda rotation function. It assumes that the specified secret already has rotation configured. The rotation function runs asynchronously in the background.
 * const input = {
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new RotateSecretCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   VersionId: "EXAMPLE2-90ab-cdef-fedc-ba987SECRET2"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class RotateSecretCommand extends RotateSecretCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RotateSecretRequest;
            output: RotateSecretResponse;
        };
        sdk: {
            input: RotateSecretCommandInput;
            output: RotateSecretCommandOutput;
        };
    };
}
