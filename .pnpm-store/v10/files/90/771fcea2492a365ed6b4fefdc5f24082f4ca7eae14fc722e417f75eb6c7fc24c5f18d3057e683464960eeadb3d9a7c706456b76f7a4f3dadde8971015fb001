import { Command as $Command } from "@smithy/smithy-client";
import type { MetadataBearer as __MetadataBearer } from "@smithy/types";
import type { CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../CognitoIdentityClient";
import type { GetPrincipalTagAttributeMapInput, GetPrincipalTagAttributeMapResponse } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link GetPrincipalTagAttributeMapCommand}.
 */
export interface GetPrincipalTagAttributeMapCommandInput extends GetPrincipalTagAttributeMapInput {
}
/**
 * @public
 *
 * The output of {@link GetPrincipalTagAttributeMapCommand}.
 */
export interface GetPrincipalTagAttributeMapCommandOutput extends GetPrincipalTagAttributeMapResponse, __MetadataBearer {
}
declare const GetPrincipalTagAttributeMapCommand_base: {
    new (input: GetPrincipalTagAttributeMapCommandInput): import("@smithy/smithy-client").CommandImpl<GetPrincipalTagAttributeMapCommandInput, GetPrincipalTagAttributeMapCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: GetPrincipalTagAttributeMapCommandInput): import("@smithy/smithy-client").CommandImpl<GetPrincipalTagAttributeMapCommandInput, GetPrincipalTagAttributeMapCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Use <code>GetPrincipalTagAttributeMap</code> to list all mappings between
 *             <code>PrincipalTags</code> and user attributes.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { CognitoIdentityClient, GetPrincipalTagAttributeMapCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
 * // const { CognitoIdentityClient, GetPrincipalTagAttributeMapCommand } = require("@aws-sdk/client-cognito-identity"); // CommonJS import
 * // import type { CognitoIdentityClientConfig } from "@aws-sdk/client-cognito-identity";
 * const config = {}; // type is CognitoIdentityClientConfig
 * const client = new CognitoIdentityClient(config);
 * const input = { // GetPrincipalTagAttributeMapInput
 *   IdentityPoolId: "STRING_VALUE", // required
 *   IdentityProviderName: "STRING_VALUE", // required
 * };
 * const command = new GetPrincipalTagAttributeMapCommand(input);
 * const response = await client.send(command);
 * // { // GetPrincipalTagAttributeMapResponse
 * //   IdentityPoolId: "STRING_VALUE",
 * //   IdentityProviderName: "STRING_VALUE",
 * //   UseDefaults: true || false,
 * //   PrincipalTags: { // PrincipalTags
 * //     "<keys>": "STRING_VALUE",
 * //   },
 * // };
 *
 * ```
 *
 * @param GetPrincipalTagAttributeMapCommandInput - {@link GetPrincipalTagAttributeMapCommandInput}
 * @returns {@link GetPrincipalTagAttributeMapCommandOutput}
 * @see {@link GetPrincipalTagAttributeMapCommandInput} for command's `input` shape.
 * @see {@link GetPrincipalTagAttributeMapCommandOutput} for command's `response` shape.
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
export declare class GetPrincipalTagAttributeMapCommand extends GetPrincipalTagAttributeMapCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: GetPrincipalTagAttributeMapInput;
            output: GetPrincipalTagAttributeMapResponse;
        };
        sdk: {
            input: GetPrincipalTagAttributeMapCommandInput;
            output: GetPrincipalTagAttributeMapCommandOutput;
        };
    };
}
