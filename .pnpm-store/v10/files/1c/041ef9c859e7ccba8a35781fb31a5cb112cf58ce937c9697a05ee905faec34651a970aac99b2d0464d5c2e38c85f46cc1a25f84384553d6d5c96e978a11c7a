import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { ListSecretVersionIdsRequest, ListSecretVersionIdsResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link ListSecretVersionIdsCommand}.
 */
export interface ListSecretVersionIdsCommandInput extends ListSecretVersionIdsRequest {
}
/**
 * @public
 *
 * The output of {@link ListSecretVersionIdsCommand}.
 */
export interface ListSecretVersionIdsCommandOutput extends ListSecretVersionIdsResponse, __MetadataBearer {
}
declare const ListSecretVersionIdsCommand_base: {
    new (input: ListSecretVersionIdsCommandInput): import("@smithy/smithy-client").CommandImpl<ListSecretVersionIdsCommandInput, ListSecretVersionIdsCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: ListSecretVersionIdsCommandInput): import("@smithy/smithy-client").CommandImpl<ListSecretVersionIdsCommandInput, ListSecretVersionIdsCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Lists the versions of a secret. Secrets Manager uses staging labels to indicate the different versions
 *     of a secret. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_version">
 *     Secrets Manager concepts: Versions</a>.</p>
 *          <p>To list the secrets in the account, use <a>ListSecrets</a>.</p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action. Do not include sensitive information in request parameters because it might be logged. For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieve-ct-entries.html">Logging Secrets Manager events with CloudTrail</a>.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:ListSecretVersionIds</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, ListSecretVersionIdsCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, ListSecretVersionIdsCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // ListSecretVersionIdsRequest
 *   SecretId: "STRING_VALUE", // required
 *   MaxResults: Number("int"),
 *   NextToken: "STRING_VALUE",
 *   IncludeDeprecated: true || false,
 * };
 * const command = new ListSecretVersionIdsCommand(input);
 * const response = await client.send(command);
 * // { // ListSecretVersionIdsResponse
 * //   Versions: [ // SecretVersionsListType
 * //     { // SecretVersionsListEntry
 * //       VersionId: "STRING_VALUE",
 * //       VersionStages: [ // SecretVersionStagesType
 * //         "STRING_VALUE",
 * //       ],
 * //       LastAccessedDate: new Date("TIMESTAMP"),
 * //       CreatedDate: new Date("TIMESTAMP"),
 * //       KmsKeyIds: [ // KmsKeyIdListType
 * //         "STRING_VALUE",
 * //       ],
 * //     },
 * //   ],
 * //   NextToken: "STRING_VALUE",
 * //   ARN: "STRING_VALUE",
 * //   Name: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param ListSecretVersionIdsCommandInput - {@link ListSecretVersionIdsCommandInput}
 * @returns {@link ListSecretVersionIdsCommandOutput}
 * @see {@link ListSecretVersionIdsCommandInput} for command's `input` shape.
 * @see {@link ListSecretVersionIdsCommandOutput} for command's `response` shape.
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
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Secrets Manager can't find the resource that you asked for.</p>
 *
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To list all of the secret versions associated with a secret
 * ```javascript
 * // The following example shows how to retrieve a list of all of the versions of a secret, including those without any staging labels.
 * const input = {
 *   IncludeDeprecated: true,
 *   SecretId: "MyTestDatabaseSecret"
 * };
 * const command = new ListSecretVersionIdsCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   ARN: "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestDatabaseSecret-a1b2c3",
 *   Name: "MyTestDatabaseSecret",
 *   Versions: [
 *     {
 *       CreatedDate: 1.523477145713E9,
 *       VersionId: "EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE",
 *       VersionStages: [
 *         "AWSPREVIOUS"
 *       ]
 *     },
 *     {
 *       CreatedDate: 1.523486221391E9,
 *       VersionId: "EXAMPLE2-90ab-cdef-fedc-ba987EXAMPLE",
 *       VersionStages: [
 *         "AWSCURRENT"
 *       ]
 *     },
 *     {
 *       CreatedDate: 1.51197446236E9,
 *       VersionId: "EXAMPLE3-90ab-cdef-fedc-ba987EXAMPLE;"
 *     }
 *   ]
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class ListSecretVersionIdsCommand extends ListSecretVersionIdsCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: ListSecretVersionIdsRequest;
            output: ListSecretVersionIdsResponse;
        };
        sdk: {
            input: ListSecretVersionIdsCommandInput;
            output: ListSecretVersionIdsCommandOutput;
        };
    };
}
