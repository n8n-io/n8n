import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { BatchGetSecretValueRequest, BatchGetSecretValueResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link BatchGetSecretValueCommand}.
 */
export interface BatchGetSecretValueCommandInput extends BatchGetSecretValueRequest {
}
/**
 * @public
 *
 * The output of {@link BatchGetSecretValueCommand}.
 */
export interface BatchGetSecretValueCommandOutput extends BatchGetSecretValueResponse, __MetadataBearer {
}
declare const BatchGetSecretValueCommand_base: {
    new (input: BatchGetSecretValueCommandInput): import("@smithy/smithy-client").CommandImpl<BatchGetSecretValueCommandInput, BatchGetSecretValueCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [BatchGetSecretValueCommandInput]): import("@smithy/smithy-client").CommandImpl<BatchGetSecretValueCommandInput, BatchGetSecretValueCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Retrieves the contents of the encrypted fields <code>SecretString</code> or <code>SecretBinary</code> for up to 20 secrets.  To retrieve a single secret, call <a>GetSecretValue</a>. </p>
 *          <p>To choose which secrets to retrieve, you can specify a list of secrets by name or ARN, or you can use filters. If Secrets Manager encounters errors such as <code>AccessDeniedException</code> while attempting to retrieve any of the secrets, you can see the errors in <code>Errors</code> in the response.</p>
 *          <p>Secrets Manager generates CloudTrail <code>GetSecretValue</code> log entries for each secret you request when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:BatchGetSecretValue</code>, and you must have <code>secretsmanager:GetSecretValue</code> for each secret. If you use filters, you must also have <code>secretsmanager:ListSecrets</code>. If the secrets are encrypted using customer-managed keys instead of the Amazon Web Services managed key
 *       <code>aws/secretsmanager</code>, then you also need <code>kms:Decrypt</code> permissions for the keys.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, BatchGetSecretValueCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, BatchGetSecretValueCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // BatchGetSecretValueRequest
 *   SecretIdList: [ // SecretIdListType
 *     "STRING_VALUE",
 *   ],
 *   Filters: [ // FiltersListType
 *     { // Filter
 *       Key: "description" || "name" || "tag-key" || "tag-value" || "primary-region" || "owning-service" || "all",
 *       Values: [ // FilterValuesStringList
 *         "STRING_VALUE",
 *       ],
 *     },
 *   ],
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 * };
 * const command = new BatchGetSecretValueCommand(input);
 * const response = await client.send(command);
 * // { // BatchGetSecretValueResponse
 * //   SecretValues: [ // SecretValuesType
 * //     { // SecretValueEntry
 * //       ARN: "STRING_VALUE",
 * //       Name: "STRING_VALUE",
 * //       VersionId: "STRING_VALUE",
 * //       SecretBinary: new Uint8Array(),
 * //       SecretString: "STRING_VALUE",
 * //       VersionStages: [ // SecretVersionStagesType
 * //         "STRING_VALUE",
 * //       ],
 * //       CreatedDate: new Date("TIMESTAMP"),
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * //   Errors: [ // APIErrorListType
 * //     { // APIErrorType
 * //       SecretId: "STRING_VALUE",
 * //       ErrorCode: "STRING_VALUE",
 * //       Message: "STRING_VALUE",
 * //     },
 * //   ],
 * // };
 *
 * ```
 *
 * @param BatchGetSecretValueCommandInput - {@link BatchGetSecretValueCommandInput}
 * @returns {@link BatchGetSecretValueCommandOutput}
 * @see {@link BatchGetSecretValueCommandInput} for command's `input` shape.
 * @see {@link BatchGetSecretValueCommandOutput} for command's `response` shape.
 * @see {@link SecretsManagerClientResolvedConfig | config} for SecretsManagerClient's `config` shape.
 *
 * @throws {@link DecryptionFailure} (client fault)
 *  <p>Secrets Manager can't decrypt the protected secret text using the provided KMS key. </p>
 *
 * @throws {@link InternalServiceError} (server fault)
 *  <p>An error occurred on the server side.</p>
 *
 * @throws {@link InvalidNextTokenException} (client fault)
 *  <p>The <code>NextToken</code> value is invalid.</p>
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
 * @example To retrieve the secret values for a group of secrets listed by name
 * ```javascript
 * // The following example gets the values for three secrets.
 * const input = {
 *   SecretIdList: [
 *     "MySecret1",
 *     "MySecret2",
 *     "MySecret3"
 *   ]
 * };
 * const command = new BatchGetSecretValueCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   Errors:   [],
 *   SecretValues: [
 *     {
 *       ARN: "&region-arn;&asm-service-name;:us-west-2:&ExampleAccountId;:secret:MySecret1-a1b2c3",
 *       CreatedDate: 1.700591229801E9,
 *       Name: "MySecret1",
 *       SecretString: `{"username":"diego_ramirez","password":"EXAMPLE-PASSWORD","engine":"mysql","host":"secretsmanagertutorial.cluster.us-west-2.rds.amazonaws.com","port":3306,"dbClusterIdentifier":"secretsmanagertutorial"}`,
 *       VersionId: "a1b2c3d4-5678-90ab-cdef-EXAMPLEaaaaa",
 *       VersionStages: [
 *         "AWSCURRENT"
 *       ]
 *     },
 *     {
 *       ARN: "&region-arn;&asm-service-name;:us-west-2:&ExampleAccountId;:secret:MySecret2-a1b2c3",
 *       CreatedDate: 1.699911394105E9,
 *       Name: "MySecret2",
 *       SecretString: `{"username":"akua_mansa","password":"EXAMPLE-PASSWORD"`,
 *       VersionId: "a1b2c3d4-5678-90ab-cdef-EXAMPLEbbbbb",
 *       VersionStages: [
 *         "AWSCURRENT"
 *       ]
 *     },
 *     {
 *       ARN: "&region-arn;&asm-service-name;:us-west-2:&ExampleAccountId;:secret:MySecret3-a1b2c3",
 *       CreatedDate: 1.699911394105E9,
 *       Name: "MySecret3",
 *       SecretString: `{"username":"jie_liu","password":"EXAMPLE-PASSWORD"`,
 *       VersionId: "a1b2c3d4-5678-90ab-cdef-EXAMPLEccccc",
 *       VersionStages: [
 *         "AWSCURRENT"
 *       ]
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class BatchGetSecretValueCommand extends BatchGetSecretValueCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: BatchGetSecretValueRequest;
            output: BatchGetSecretValueResponse;
        };
        sdk: {
            input: BatchGetSecretValueCommandInput;
            output: BatchGetSecretValueCommandOutput;
        };
    };
}
