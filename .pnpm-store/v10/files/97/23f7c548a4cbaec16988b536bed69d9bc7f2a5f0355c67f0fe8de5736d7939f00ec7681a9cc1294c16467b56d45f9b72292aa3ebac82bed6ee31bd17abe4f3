import { Command as $Command } from "@smithy/smithy-client";
import { MetadataBearer as __MetadataBearer } from "@smithy/types";
import { CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes } from "../CognitoIdentityClient";
import { DeleteIdentityPoolInput } from "../models/models_0";
/**
 * @public
 */
export type { __MetadataBearer };
export { $Command };
/**
 * @public
 *
 * The input for {@link DeleteIdentityPoolCommand}.
 */
export interface DeleteIdentityPoolCommandInput extends DeleteIdentityPoolInput {
}
/**
 * @public
 *
 * The output of {@link DeleteIdentityPoolCommand}.
 */
export interface DeleteIdentityPoolCommandOutput extends __MetadataBearer {
}
declare const DeleteIdentityPoolCommand_base: {
    new (input: DeleteIdentityPoolCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteIdentityPoolCommandInput, DeleteIdentityPoolCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    new (input: DeleteIdentityPoolCommandInput): import("@smithy/smithy-client").CommandImpl<DeleteIdentityPoolCommandInput, DeleteIdentityPoolCommandOutput, CognitoIdentityClientResolvedConfig, ServiceInputTypes, ServiceOutputTypes>;
    getEndpointParameterInstructions(): import("@smithy/middleware-endpoint").EndpointParameterInstructions;
};
/**
 * <p>Deletes an identity pool. Once a pool is deleted, users will not be able to
 *          authenticate with the pool.</p>
 *          <p>You must use Amazon Web Services developer credentials to call this
 *          operation.</p>
 * @example
 * Use a bare-bones client and the command you need to make an API call.
 * ```javascript
 * import { CognitoIdentityClient, DeleteIdentityPoolCommand } from "@aws-sdk/client-cognito-identity"; // ES Modules import
 * // const { CognitoIdentityClient, DeleteIdentityPoolCommand } = require("@aws-sdk/client-cognito-identity"); // CommonJS import
 * const client = new CognitoIdentityClient(config);
 * const input = { // DeleteIdentityPoolInput
 *   IdentityPoolId: "STRING_VALUE", // required
 * };
 * const command = new DeleteIdentityPoolCommand(input);
 * const response = await client.send(command);
 * // {};
 *
 * ```
 *
 * @param DeleteIdentityPoolCommandInput - {@link DeleteIdentityPoolCommandInput}
 * @returns {@link DeleteIdentityPoolCommandOutput}
 * @see {@link DeleteIdentityPoolCommandInput} for command's `input` shape.
 * @see {@link DeleteIdentityPoolCommandOutput} for command's `response` shape.
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
export declare class DeleteIdentityPoolCommand extends DeleteIdentityPoolCommand_base {
    /** @internal type navigation helper, not in runtime. */
    protected static __types: {
        api: {
            input: DeleteIdentityPoolInput;
            output: {};
        };
        sdk: {
            input: DeleteIdentityPoolCommandInput;
            output: DeleteIdentityPoolCommandOutput;
        };
    };
}
