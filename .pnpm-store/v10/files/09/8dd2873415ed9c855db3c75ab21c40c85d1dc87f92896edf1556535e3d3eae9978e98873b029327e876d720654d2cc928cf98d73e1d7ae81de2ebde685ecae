import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { UpdateSecretVersionStageRequest, UpdateSecretVersionStageResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateSecretVersionStageCommand}.
 */
export interface UpdateSecretVersionStageCommandInput extends UpdateSecretVersionStageRequest {
}
/**
 * @public
 *
 * The output of {@link UpdateSecretVersionStageCommand}.
 */
export interface UpdateSecretVersionStageCommandOutput extends UpdateSecretVersionStageResponse, __MetadataBearer {
}
declare const UpdateSecretVersionStageCommand_base: {
    new (input: UpdateSecretVersionStageCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateSecretVersionStageCommandInput, UpdateSecretVersionStageCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateSecretVersionStageCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateSecretVersionStageCommandInput, UpdateSecretVersionStageCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Modifies the staging labels attached to a version of a secret. Secrets Manager uses staging labels to
 *       track a version as it progresses through the secret rotation process. Each staging label can be
 *       attached to only one version at a time. To add a staging label to a version when it is already
 *       attached to another version, Secrets Manager first removes it from the other version first and
 *       then attaches it to this one. For more information about versions and staging labels, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_version">Concepts: Version</a>. </p>
 *          <p>The staging labels that you specify in the <code>VersionStage</code> parameter are added
 *       to the existing list of staging labels for the version. </p>
 *          <p>You can move the <code>AWSCURRENT</code> staging label to this version by including it in this
 *       call.</p>
 *          <note>
 *             <p>Whenever you move <code>AWSCURRENT</code>, Secrets Manager automatically moves the label <code>AWSPREVIOUS</code>
 *         to the version that <code>AWSCURRENT</code> was removed from.</p>
 *          </note>
 *          <p>If this action results in the last label being removed from a version, then the version is
 *       considered to be 'deprecated' and can be deleted by Secrets Manager.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:UpdateSecretVersionStage</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, UpdateSecretVersionStageCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, UpdateSecretVersionStageCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // UpdateSecretVersionStageRequest
 *   SecretId: "STRING_VALUE", // required
 *   VersionStage: "STRING_VALUE", // required
 *   RemoveFromVersionId: "STRING_VALUE",
 *   MoveToVersionId: "STRING_VALUE",
 * };
 * const command = new UpdateSecretVersionStageCommand(input);
 * const response = await client.send(command);
 * // { // UpdateSecretVersionStageResponse
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param UpdateSecretVersionStageCommandInput - {@link UpdateSecretVersionStageCommandInput}
 * @returns {@link UpdateSecretVersionStageCommandOutput}
 * @see {@link UpdateSecretVersionStageCommandInput} for command's `input` shape.
 * @see {@link UpdateSecretVersionStageCommandOutput} for command's `response` shape.
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
 * @throws {@link LimitExceededException} (client fault)
 *  <p>The request failed because it would exceed one of the Secrets Manager quotas.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Secrets Manager can't find the resource that you asked for.</p>
 *
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To add a staging label attached to a version of a secret
 * ```javascript
 * // The following example shows you how to add a staging label to a version of a secret. You can review the results by running the operation ListSecretVersionIds and viewing the VersionStages response field for the affected version.
 * const input = {
 *   MoveToVersionId: "EXAMPLE1-90ab-cdef-fedc-ba987SECRET1",
 *   SecretId: "MyTestDatabaseSecret",
 *   VersionStage: "STAGINGLABEL1"
 * };
 * const command = new UpdateSecretVersionStageCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret"
 * }
 * *\/
 * ```
 *
 * @example To delete a staging label attached to a version of a secret
 * ```javascript
 * // The following example shows you how to delete a staging label that is attached to a version of a secret. You can review the results by running the operation ListSecretVersionIds and viewing the VersionStages response field for the affected version.
 * const input = {
 *   RemoveFromVersionId: "EXAMPLE1-90ab-cdef-fedc-ba987SECRET1",
 *   SecretId: "MyTestDatabaseSecret",
 *   VersionStage: "STAGINGLABEL1"
 * };
 * const command = new UpdateSecretVersionStageCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret"
 * }
 * *\/
 * ```
 *
 * @example To move a staging label from one version of a secret to another
 * ```javascript
 * // The following example shows you how to move a staging label that is attached to one version of a secret to a different version. You can review the results by running the operation ListSecretVersionIds and viewing the VersionStages response field for the affected version.
 * const input = {
 *   MoveToVersionId: "EXAMPLE2-90ab-cdef-fedc-ba987SECRET2",
 *   RemoveFromVersionId: "EXAMPLE1-90ab-cdef-fedc-ba987SECRET1",
 *   SecretId: "MyTestDatabaseSecret",
 *   VersionStage: "AWSCURRENT"
 * };
 * const command = new UpdateSecretVersionStageCommand(input);
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
export declare class UpdateSecretVersionStageCommand extends UpdateSecretVersionStageCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UpdateSecretVersionStageRequest;
            output: UpdateSecretVersionStageResponse;
        };
        sdk: {
            input: UpdateSecretVersionStageCommandInput;
            output: UpdateSecretVersionStageCommandOutput;
        };
    };
}
