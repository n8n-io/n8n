import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { GetRandomPasswordRequest, GetRandomPasswordResponse } from "../models/models_0";
import { SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../SecretsManagerClient";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetRandomPasswordCommand}.
 */
export interface GetRandomPasswordCommandInput extends GetRandomPasswordRequest {
}
/**
 * @public
 *
 * The output of {@link GetRandomPasswordCommand}.
 */
export interface GetRandomPasswordCommandOutput extends GetRandomPasswordResponse, __MetadataBearer {
}
declare const GetRandomPasswordCommand_base: {
    new (input: GetRandomPasswordCommandInput): import("@smithy/smithy-client").CommandImpl<GetRandomPasswordCommandInput, GetRandomPasswordCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (...[input]: [] | [GetRandomPasswordCommandInput]): import("@smithy/smithy-client").CommandImpl<GetRandomPasswordCommandInput, GetRandomPasswordCommandOutput, SecretsManagerClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Generates a random password. We recommend that you specify the
 *       maximum length and include every character type that the system you are generating a password
 *       for can support. By default, Secrets Manager uses uppercase and lowercase letters, numbers, and the following characters in passwords: <code>!\"#$%&'()*+,-./:;<=>?@[\\]^_`\{|\}~</code>
 *          </p>
 *          <p>Secrets Manager generates a CloudTrail log entry when you call this action.</p>
 *          <p>
 *             <b>Required permissions: </b>
 *             <code>secretsmanager:GetRandomPassword</code>.
 *       For more information, see <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html#reference_iam-permissions_actions">
 *       IAM policy actions for Secrets Manager</a> and <a href="https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html">Authentication
 *       and access control in Secrets Manager</a>. </p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { SecretsManagerClient, GetRandomPasswordCommand } from "@aws-sdk/client-secrets-manager"; // ES Modules import
 * // const { SecretsManagerClient, GetRandomPasswordCommand } = require("@aws-sdk/client-secrets-manager"); // CommonJS import
 * const client = new SecretsManagerClient(config);
 * const input = { // GetRandomPasswordRequest
 *   PasswordLength: Number("long"),
 *   ExcludeCharacters: "STRING_VALUE",
 *   ExcludeNumbers: true || false,
 *   ExcludePunctuation: true || false,
 *   ExcludeUppercase: true || false,
 *   ExcludeLowercase: true || false,
 *   IncludeSpace: true || false,
 *   RequireEachIncludedType: true || false,
 * };
 * const command = new GetRandomPasswordCommand(input);
 * const response = await client.send(command);
 * // { // GetRandomPasswordResponse
 * //   RandomPassword: "STRING_VALUE",
 * // };
 *
 * ```
 *
 * @param GetRandomPasswordCommandInput - {@link GetRandomPasswordCommandInput}
 * @returns {@link GetRandomPasswordCommandOutput}
 * @see {@link GetRandomPasswordCommandInput} for command's `input` shape.
 * @see {@link GetRandomPasswordCommandOutput} for command's `response` shape.
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
 * @throws {@link SecretsManagerServiceException}
 * <p>Base exception class for all service exceptions from SecretsManager service.</p>
 *
 *
 * @example To generate a random password
 * ```javascript
 * // The following example shows how to request a randomly generated password. This example includes the optional flags to require spaces and at least one character of each included type. It specifies a length of 20 characters.
 * const input = {
 *   IncludeSpace: true,
 *   PasswordLength: 20,
 *   RequireEachIncludedType: true
 * };
 * const command = new GetRandomPasswordCommand(input);
 * const response = await client.send(command);
 * /* response is
 * {
 *   RandomPassword: "EXAMPLE-PASSWORD"
 * }
 * *\/
 * ```
 *
 * @public
 */
export declare class GetRandomPasswordCommand extends GetRandomPasswordCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetRandomPasswordRequest;
            output: GetRandomPasswordResponse;
        };
        sdk: {
            input: GetRandomPasswordCommandInput;
            output: GetRandomPasswordCommandOutput;
        };
    };
}
