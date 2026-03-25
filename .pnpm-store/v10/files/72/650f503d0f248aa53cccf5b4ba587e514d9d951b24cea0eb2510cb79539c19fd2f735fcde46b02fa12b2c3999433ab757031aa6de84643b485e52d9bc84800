import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListSecretsRequest, ListSecretsResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListSecretsCommand}.
 */
export interface ListSecretsCommandInput extends ListSecretsRequest {
}
/**
 * @public
 *
 * The output of {@link ListSecretsCommand}.
 */
export interface ListSecretsCommandOutput extends ListSecretsResponse, __MetadataBearer {
}
declare const ListSecretsCommand_base: {
    new (input: ListSecretsCommandInput): import("@smithy/smithy-client").CommandImpl<ListSecretsCommandInput, ListSecretsCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [ListSecretsCommandInput]): import("@smithy/smithy-client").CommandImpl<ListSecretsCommandInput, ListSecretsCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the secrets that are stored by Secrets Manager in the Amazon Web Services account, not including secrets
 *       that are marked for deletion. To see secrets marked for deletion, use the Secrets Manager console.</p>
 *          <p>All Secrets Manager operations are eventually consistent. ListSecrets might not reflect changes from the last five minutes. You can get more recent information for a specific secret by calling <a>DescribeSecret</a>.</p>
 *          <p>To list the versions of a secret, use <a>ListSecretVersionIds</a>.</p>
 *          <p>To retrieve the values for the secrets, call <a>BatchGetSecretValue</a> or <a>GetSecretValue</a>.</p>
 *          <p>For information about finding secrets in the console, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_search-secret.html">Find secrets in Secrets Manager</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:ListSecrets</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, ListSecretsCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, ListSecretsCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // ListSecretsRequest
 *   IncludePlannedDeletion: true || false,
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 *   Filters: [ // FiltersListType
 *     { // Filter
 *       Key: "description" || "name" || "tag-key" || "tag-value" || "primary-region" || "owning-service" || "all",
 *       Values: [ // FilterValuesStringList
 *         "STRING_VALUE",
 *       ],
 *     },
 *   ],
 *   SortOrder: "asc" || "desc",
 * };
 * const command = new ListSecretsCommand(input);
 * const response = await client.send(command);
 * // { // ListSecretsResponse
 * //   SecretList: [ // SecretListType
 * //     { // SecretListEntry
 * //       ARN: "STRING_VALUE",
 * //       Name: "STRING_VALUE",
 * //       Description: "STRING_VALUE",
 * //       KmsKeyId: "STRING_VALUE",
 * //       RotationEnabled: true || false,
 * //       RotationLambdaARN: "STRING_VALUE",
 * //       RotationRules: { // RotationRulesType
 * //         AutomaticallyAfterDays: Number("long"),
 * //         Duration: "STRING_VALUE",
 * //         ScheduleExpression: "STRING_VALUE",
 * //       },
 * //       LastRotatedDate: new Date("TIMESTAMP"),
 * //       LastChangedDate: new Date("TIMESTAMP"),
 * //       LastAccessedDate: new Date("TIMESTAMP"),
 * //       DeletedDate: new Date("TIMESTAMP"),
 * //       NextRotationDate: new Date("TIMESTAMP"),
 * //       Tags: [ // TagListType
 * //         { // Tag
 * //           Key: "STRING_VALUE",
 * //           Value: "STRING_VALUE",
 * //         },
 * //       ],
 * //       SecretVersionsToStages: { // SecretVersionsToStagesMapType
 * //         "<keys>": [ // SecretVersionStagesType
 * //           "STRING_VALUE",
 * //         ],
 * //       },
 * //       OwningService: "STRING_VALUE",
 * //       CreatedDate: new Date("TIMESTAMP"),
 * //       PrimaryRegion: "STRING_VALUE",
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListSecretsCommandInput - {@link ListSecretsCommandInput}
 * @returns {@link ListSecretsCommandOutput}
 * @see {@link ListSecretsCommandInput} for command's `input` shape.
 * @see {@link ListSecretsCommandOutput} for command's `response` shape.
 * @see {@link SecretsManagerClientResolvedConfig | config} for SecretsManagerClient's `config` shape.
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
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To list the secrets in your account
 * ```javascript
 * // The following example shows how to list all of the secrets in your account.
 * const input = { /* empty *\/ };
 * const command = new ListSecretsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   SecretList: [
 *     {
 *       ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *       Description: "My test database secret",
 *       LastChangedDate: 1.523477145729E9,
 *       Name: "MyTestDatabaseSecret",
 *       SecretVersionsToStages: {
 *         EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE: [
 *           "AWSCURRENT"
 *         ]
 *       }
 *     },
 *     {
 *       ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret1-d4e5f6",
 *       Description: "Another secret created for a different database",
 *       LastChangedDate: 1.523482025685E9,
 *       Name: "MyTestDatabaseSecret1",
 *       SecretVersionsToStages: {
 *         EXAMPLE2-90ab-cdef-fedc-ba987EXAMPLE: [
 *           "AWSCURRENT"
 *         ]
 *       }
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListSecretsCommand extends ListSecretsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListSecretsRequest;
            output: ListSecretsResponse;
        };
        sdk: {
            input: ListSecretsCommandInput;
            output: ListSecretsCommandOutput;
        };
    };
}
