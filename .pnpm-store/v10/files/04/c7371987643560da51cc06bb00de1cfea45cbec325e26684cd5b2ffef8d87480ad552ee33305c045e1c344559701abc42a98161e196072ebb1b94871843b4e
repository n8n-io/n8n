import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetSecretValueRequest, GetSecretValueResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetSecretValueCommand}.
 */
export interface GetSecretValueCommandInput extends GetSecretValueRequest {
}
/**
 * @public
 *
 * The output of {@link GetSecretValueCommand}.
 */
export interface GetSecretValueCommandOutput extends GetSecretValueResponse, __MetadataBearer {
}
declare const GetSecretValueCommand_base: {
    new (input: GetSecretValueCommandInput): import("@smithy/smithy-client").CommandImpl<GetSecretValueCommandInput, GetSecretValueCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetSecretValueCommandInput): import("@smithy/smithy-client").CommandImpl<GetSecretValueCommandInput, GetSecretValueCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves the contents of the encrypted fields <code>SecretString</code> or
 *         <code>SecretBinary</code> from the specified version of a secret, whichever contains
 *       content.</p>
 *          <p>To retrieve the values for a group of secrets, call <a>BatchGetSecretValue</a>.</p>
 *          <p>We recommend that you cache your secret values by using client-side caching.
 *       Caching secrets improves speed and reduces your costs. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets.html">Cache secrets for
 *         your applications</a>.</p>
 *          <p>To retrieve the previous version of a secret, use <code>VersionStage</code> and specify
 *       AWSPREVIOUS. To revert to the previous version of a secret, call <a href="https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/update-secret-version-stage.html">UpdateSecretVersionStage</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:GetSecretValue</code>.
 *       If the secret is encrypted using a customer-managed key instead of the Amazon Web Services managed key
 *       <code>aws/secretsmanager</code>, then you also need <code>kms:Decrypt</code> permissions for that key.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // GetSecretValueRequest
 *   SecretId: "STRING_VALUE", // required
 *   VersionId: "STRING_VALUE",
 *   VersionStage: "STRING_VALUE",
 * };
 * const command = new GetSecretValueCommand(input);
 * const response = await client.send(command);
 * // { // GetSecretValueResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * //   VersionId: "STRING_VALUE",
 * //   SecretBinary: new Uint8Array(),
 * //   SecretString: "STRING_VALUE",
 * //   VersionStages: [ // SecretVersionStagesType
 * //     "STRING_VALUE",
 * //   ],
 * //   CreatedDate: new Date("TIMESTAMP"),
 * // };
 *
 * ```
 *
 * @param GetSecretValueCommandInput - {@link GetSecretValueCommandInput}
 * @returns {@link GetSecretValueCommandOutput}
 * @see {@link GetSecretValueCommandInput} for command's `input` shape.
 * @see {@link GetSecretValueCommandOutput} for command's `response` shape.
 * @see {@link SecretsManagerClientResolvedConfig | config} for SecretsManagerClient's `config` shape.
 *
 * @throws {@link DecryptionFailure} (client fault)
 *  <p>Secrets Manager can't decrypt the protected secret text using the provided KMS key. </p>
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
 * @example To retrieve the encrypted secret value of a secret
 * ```javascript
 * // The following example shows how to retrieve a secret string value.
 * const input = {
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new GetSecretValueCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   CreatedDate: 1.523477145713E9,
 *   Name: "MyTestDatabaseSecret",
 *   SecretString: `{
 *   "username":"david",
 *   "password":"EXAMPLE-PASSWORD"
 * }
 * `,
 *   VersionId: "EXAMPLE1-90ab-cdef-fedc-ba987SECRET1",
 *   VersionStages: [
 *     "AWSPREVIOUS"
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetSecretValueCommand extends GetSecretValueCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetSecretValueRequest;
            output: GetSecretValueResponse;
        };
        sdk: {
            input: GetSecretValueCommandInput;
            output: GetSecretValueCommandOutput;
        };
    };
}
