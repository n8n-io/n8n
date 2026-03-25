import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { RemoveRegionsFromReplicationRequest, RemoveRegionsFromReplicationResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link RemoveRegionsFromReplicationCommand}.
 */
export interface RemoveRegionsFromReplicationCommandInput extends RemoveRegionsFromReplicationRequest {
}
/**
 * @public
 *
 * The output of {@link RemoveRegionsFromReplicationCommand}.
 */
export interface RemoveRegionsFromReplicationCommandOutput extends RemoveRegionsFromReplicationResponse, __MetadataBearer {
}
declare const RemoveRegionsFromReplicationCommand_base: {
    new (input: RemoveRegionsFromReplicationCommandInput): import("@smithy/smithy-client").CommandImpl<RemoveRegionsFromReplicationCommandInput, RemoveRegionsFromReplicationCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: RemoveRegionsFromReplicationCommandInput): import("@smithy/smithy-client").CommandImpl<RemoveRegionsFromReplicationCommandInput, RemoveRegionsFromReplicationCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>For a secret that is replicated to other Regions, deletes the secret replicas from the Regions you specify.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:RemoveRegionsFromReplication</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, RemoveRegionsFromReplicationCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, RemoveRegionsFromReplicationCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // RemoveRegionsFromReplicationRequest
 *   SecretId: "STRING_VALUE", // required
 *   RemoveReplicaRegions: [ // RemoveReplicaRegionListType // required
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new RemoveRegionsFromReplicationCommand(input);
 * const response = await client.send(command);
 * // { // RemoveRegionsFromReplicationResponse
 * //   ARN: "STRING_VALUE",
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
 * @param RemoveRegionsFromReplicationCommandInput - {@link RemoveRegionsFromReplicationCommandInput}
 * @returns {@link RemoveRegionsFromReplicationCommandOutput}
 * @see {@link RemoveRegionsFromReplicationCommandInput} for command's `input` shape.
 * @see {@link RemoveRegionsFromReplicationCommandOutput} for command's `response` shape.
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
export declare class RemoveRegionsFromReplicationCommand extends RemoveRegionsFromReplicationCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: RemoveRegionsFromReplicationRequest;
            output: RemoveRegionsFromReplicationResponse;
        };
        sdk: {
            input: RemoveRegionsFromReplicationCommandInput;
            output: RemoveRegionsFromReplicationCommandOutput;
        };
    };
}
