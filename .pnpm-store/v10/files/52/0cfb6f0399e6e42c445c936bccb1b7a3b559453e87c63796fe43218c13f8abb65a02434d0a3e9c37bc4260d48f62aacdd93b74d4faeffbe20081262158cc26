import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../CognitoIdentityClient";
import { IdentityPool } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link UpdateIdentityPoolCommand}.
 */
export interface UpdateIdentityPoolCommandInput extends IdentityPool {
}
/**
 * @public
 *
 * The output of {@link UpdateIdentityPoolCommand}.
 */
export interface UpdateIdentityPoolCommandOutput extends IdentityPool, __MetadataBearer {
}
declare const UpdateIdentityPoolCommand_base: {
    new (input: UpdateIdentityPoolCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateIdentityPoolCommandInput, UpdateIdentityPoolCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: UpdateIdentityPoolCommandInput): import("@smithy/smithy-client").CommandImpl<UpdateIdentityPoolCommandInput, UpdateIdentityPoolCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Updates the configuration of an identity pool.</p>
 *          <important>
 *             <p>If you don't provide a value for a parameter, Amazon Cognito sets it to its default value.
 *       </p>
 *          </important>
 *          <p>You must use Amazon Web Services developer credentials to call this
 *          operation.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { CognitoIdentityClient, UpdateIdentityPoolCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
 * // const { CognitoIdentityClient, UpdateIdentityPoolCommand } = require("@aws-sdk/client-cognito-identity"); // CommonJS import
 * const client = new CognitoIdentityClient(config);
 * const input = { // IdentityPool
 *   IdentityPoolId: "STRING_VALUE", // required
 *   IdentityPoolName: "STRING_VALUE", // required
 *   AllowUnauthenticatedIdentities: true || false, // required
 *   AllowClassicFlow: true || false,
 *   SupportedLoginProviders: { // IdentityProviders
 *     "<keys>": "STRING_VALUE",
 *   },
 *   DeveloperProviderName: "STRING_VALUE",
 *   OpenIdConnectProviderARNs: [ // OIDCProviderList
 *     "STRING_VALUE",
 *   ],
 *   CognitoIdentityProviders: [ // CognitoIdentityProviderList
 *     { // CognitoIdentityProvider
 *       ProviderName: "STRING_VALUE",
 *       ClientId: "STRING_VALUE",
 *       ServerSideTokenCheck: true || false,
 *     },
 *   ],
 *   SamlProviderARNs: [ // SAMLProviderList
 *     "STRING_VALUE",
 *   ],
 *   IdentityPoolTags: { // IdentityPoolTagsType
 *     "<keys>": "STRING_VALUE",
 *   },
 * };
 * const command = new UpdateIdentityPoolCommand(input);
 * const response = await client.send(command);
 * // { // IdentityPool
 * //   IdentityPoolId: "STRING_VALUE", // required
 * //   IdentityPoolName: "STRING_VALUE", // required
 * //   AllowUnauthenticatedIdentities: true || false, // required
 * //   AllowClassicFlow: true || false,
 * //   SupportedLoginProviders: { // IdentityProviders
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * //   DeveloperProviderName: "STRING_VALUE",
 * //   OpenIdConnectProviderARNs: [ // OIDCProviderList
 * //     "STRING_VALUE",
 * //   ],
 * //   CognitoIdentityProviders: [ // CognitoIdentityProviderList
 * //     { // CognitoIdentityProvider
 * //       ProviderName: "STRING_VALUE",
 * //       ClientId: "STRING_VALUE",
 * //       ServerSideTokenCheck: true || false,
 * //     },
 * //   ],
 * //   SamlProviderARNs: [ // SAMLProviderList
 * //     "STRING_VALUE",
 * //   ],
 * //   IdentityPoolTags: { // IdentityPoolTagsType
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param UpdateIdentityPoolCommandInput - {@link UpdateIdentityPoolCommandInput}
 * @returns {@link UpdateIdentityPoolCommandOutput}
 * @see {@link UpdateIdentityPoolCommandInput} for command's `input` shape.
 * @see {@link UpdateIdentityPoolCommandOutput} for command's `response` shape.
 * @see {@link CognitoIdentityClientResolvedConfig | config} for CognitoIdentityClient's `config` shape.
 *
 * @throws {@link ConcurrentModificationException} (client fault)
 *  <p>Thrown if there are parallel requests to modify a resource.</p>
 *
 * @throws {@link InternalErrorException} (server fault)
 *  <p>Thrown when the service encounters an error during processing the request.</p>
 *
 * @throws {@link InvalidParameterException} (client fault)
 *  <p>Thrown for missing or bad input parameter(s).</p>
 *
 * @throws {@link LimitExceededException} (client fault)
 *  <p>Thrown when the total number of user pools has exceeded a preset limit.</p>
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
export declare class UpdateIdentityPoolCommand extends UpdateIdentityPoolCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: IdentityPool;
            output: IdentityPool;
        };
        sdk: {
            input: UpdateIdentityPoolCommandInput;
            output: UpdateIdentityPoolCommandOutput;
        };
    };
}
