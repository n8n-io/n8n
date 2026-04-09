import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../CognitoIdentityClient";
import type { UnlinkIdentityInput } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UnlinkIdentityCommand}.
 */
export interface UnlinkIdentityCommandInput extends UnlinkIdentityInput {
}
/**
 * @public
 *
 * The output of {@link UnlinkIdentityCommand}.
 */
export interface UnlinkIdentityCommandOutput extends __MetadataBearer {
}
declare const UnlinkIdentityCommand_base: {
    new (input: UnlinkIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<UnlinkIdentityCommandInput, UnlinkIdentityCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UnlinkIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<UnlinkIdentityCommandInput, UnlinkIdentityCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Unlinks a federated identity from an existing account. Unlinked logins will be
 *          considered new identities next time they are seen. Removing the last linked login will make
 *          this identity inaccessible.</p>
 *          <p>This is a public API. You do not need any credentials to call this API.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { CognitoIdentityClient, UnlinkIdentityCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
 * // const { CognitoIdentityClient, UnlinkIdentityCommand } = require("@aws-sdk/client-cognito-identity"); // CommonJS import
 * // import type { CognitoIdentityClientConfig } from "@aws-sdk/client-cognito-identity";
 * const config = {}; // type is CognitoIdentityClientConfig
 * const client = new CognitoIdentityClient(config);
 * const input = { // UnlinkIdentityInput
 *   IdentityId: "STRING_VALUE", // required
 *   Logins: { // LoginsMap // required
 *     "<keys>": "STRING_VALUE",
 *   },
 *   LoginsToRemove: [ // LoginsList // required
 *     "STRING_VALUE",
 *   ],
 * };
 * const command = new UnlinkIdentityCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UnlinkIdentityCommandInput - {@link UnlinkIdentityCommandInput}
 * @returns {@link UnlinkIdentityCommandOutput}
 * @see {@link UnlinkIdentityCommandInput} for command's `input` shape.
 * @see {@link UnlinkIdentityCommandOutput} for command's `response` shape.
 * @see {@link CognitoIdentityClientResolvedConfig | config} for CognitoIdentityClient's `config` shape.
 *
 * @throws {@link ExternalServiceException} (client fault)
 *  <p>An exception thrown when a dependent service such as Facebook or Twitter is not
 *          responding</p>
 *
 * @throws {@link InternalErrorException} (server fault)
 *  <p>Thrown when the service encounters an error during processing the request.</p>
 *
 * @throws {@link InvalidParameterException} (client fault)
 *  <p>Thrown for missing or bad input parameter(s).</p>
 *
 * @throws {@link NotAuthorizedException} (client fault)
 *  <p>Thrown when a user is not authorized to access the requested resource.</p>
 *
 * @throws {@link ResourceConflictException} (client fault)
 *  <p>Thrown when a user tries to use a login which is already linked to another
 *          account.</p>
 *
 * @throws {@link ResourceNotFoundException} (client fault)
 *  <p>Thrown when the requested resource (for example, a dataset or record) does not
 *          exist.</p>
 *
 * @throws {@link TooManyRequestsException} (client fault)
 *  <p>Thrown when a request is throttled.</p>
 *
 * @throws {@link CognitoIdentityServiceException}
 * <p>Base exception class for all service exceptions from CognitoIdentity service.</p>
 *
 *
 * @public
 */
export declare class UnlinkIdentityCommand extends UnlinkIdentityCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UnlinkIdentityInput;
            output: {};
        };
        sdk: {
            input: UnlinkIdentityCommandInput;
            output: UnlinkIdentityCommandOutput;
        };
    };
}
