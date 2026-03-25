import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { StopReplicationToReplicaRequest, StopReplicationToReplicaResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link StopReplicationToReplicaCommand}.
 */
export interface StopReplicationToReplicaCommandInput extends StopReplicationToReplicaRequest {
}
/**
 * @public
 *
 * The output of {@link StopReplicationToReplicaCommand}.
 */
export interface StopReplicationToReplicaCommandOutput extends StopReplicationToReplicaResponse, __MetadataBearer {
}
declare const StopReplicationToReplicaCommand_base: {
    new (input: StopReplicationToReplicaCommandInput): import("@smithy/smithy-client").CommandImpl<StopReplicationToReplicaCommandInput, StopReplicationToReplicaCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: StopReplicationToReplicaCommandInput): import("@smithy/smithy-client").CommandImpl<StopReplicationToReplicaCommandInput, StopReplicationToReplicaCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Removes the link between the replica secret and the primary secret and promotes the replica to a primary secret in the replica Region.</p>
 *          <p>You must call this operation from the Region in which you want to promote the replica to a primary secret.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:StopReplicationToReplica</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, StopReplicationToReplicaCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, StopReplicationToReplicaCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // StopReplicationToReplicaRequest
 *   SecretId: "STRING_VALUE", // required
 * };
 * const command = new StopReplicationToReplicaCommand(input);
 * const response = await client.send(command);
 * // { // StopReplicationToReplicaResponse
 * //   ARN: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param StopReplicationToReplicaCommandInput - {@link StopReplicationToReplicaCommandInput}
 * @returns {@link StopReplicationToReplicaCommandOutput}
 * @see {@link StopReplicationToReplicaCommandInput} for command's `input` shape.
 * @see {@link StopReplicationToReplicaCommandOutput} for command's `response` shape.
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
 * @public
 */
export declare class StopReplicationToReplicaCommand extends StopReplicationToReplicaCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: StopReplicationToReplicaRequest;
            output: StopReplicationToReplicaResponse;
        };
        sdk: {
            input: StopReplicationToReplicaCommandInput;
            output: StopReplicationToReplicaCommandOutput;
        };
    };
}
