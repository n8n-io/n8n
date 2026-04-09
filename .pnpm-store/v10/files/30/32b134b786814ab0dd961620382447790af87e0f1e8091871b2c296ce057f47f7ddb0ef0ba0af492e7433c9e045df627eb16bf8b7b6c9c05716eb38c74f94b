import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../CognitoIdentityClient";
import type { UnlinkDeveloperIdentityInput } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UnlinkDeveloperIdentityCommand}.
 */
export interface UnlinkDeveloperIdentityCommandInput extends UnlinkDeveloperIdentityInput {
}
/**
 * @public
 *
 * The output of {@link UnlinkDeveloperIdentityCommand}.
 */
export interface UnlinkDeveloperIdentityCommandOutput extends __MetadataBearer {
}
declare const UnlinkDeveloperIdentityCommand_base: {
    new (input: UnlinkDeveloperIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<UnlinkDeveloperIdentityCommandInput, UnlinkDeveloperIdentityCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UnlinkDeveloperIdentityCommandInput): import("@smithy/smithy-client").CommandImpl<UnlinkDeveloperIdentityCommandInput, UnlinkDeveloperIdentityCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Unlinks a <code>DeveloperUserIdentifier</code> from an existing identity. Unlinked
 *          developer users will be considered new identities next time they are seen. If, for a given
 *          Cognito identity, you remove all federated identities as well as the developer user
 *          identifier, the Cognito identity becomes inaccessible.</p>
 *          <p>You must use Amazon Web Services developer credentials to call this
 *          operation.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { CognitoIdentityClient, UnlinkDeveloperIdentityCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
 * // const { CognitoIdentityClient, UnlinkDeveloperIdentityCommand } = require("@aws-sdk/client-cognito-identity"); // CommonJS import
 * // import type { CognitoIdentityClientConfig } from "@aws-sdk/client-cognito-identity";
 * const config = {}; // type is CognitoIdentityClientConfig
 * const client = new CognitoIdentityClient(config);
 * const input = { // UnlinkDeveloperIdentityInput
 *   IdentityId: "STRING_VALUE", // required
 *   IdentityPoolId: "STRING_VALUE", // required
 *   DeveloperProviderName: "STRING_VALUE", // required
 *   DeveloperUserIdentifier: "STRING_VALUE", // required
 * };
 * const command = new UnlinkDeveloperIdentityCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param UnlinkDeveloperIdentityCommandInput - {@link UnlinkDeveloperIdentityCommandInput}
 * @returns {@link UnlinkDeveloperIdentityCommandOutput}
 * @see {@link UnlinkDeveloperIdentityCommandInput} for command's `input` shape.
 * @see {@link UnlinkDeveloperIdentityCommandOutput} for command's `response` shape.
 * @see {@link CognitoIdentityClientResolvedConfig | config} for CognitoIdentityClient's `config` shape.
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
export declare class UnlinkDeveloperIdentityCommand extends UnlinkDeveloperIdentityCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: UnlinkDeveloperIdentityInput;
            output: {};
        };
        sdk: {
            input: UnlinkDeveloperIdentityCommandInput;
            output: UnlinkDeveloperIdentityCommandOutput;
        };
    };
}
