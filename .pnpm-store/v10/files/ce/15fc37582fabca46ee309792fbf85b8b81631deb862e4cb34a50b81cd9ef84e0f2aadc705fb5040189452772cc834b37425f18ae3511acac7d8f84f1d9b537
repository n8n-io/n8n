import type { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";
import { CognitoIdentityClient } from "./CognitoIdentityClient";
import type { GetCredentialsForIdentityCommandInput, GetCredentialsForIdentityCommandOutput } from "./commands/GetCredentialsForIdentityCommand";
import type { GetIdCommandInput, GetIdCommandOutput } from "./commands/GetIdCommand";
export interface CognitoIdentity {
    /**
     * @see {@link GetCredentialsForIdentityCommand}
     */
    getCredentialsForIdentity(args: GetCredentialsForIdentityCommandInput, options?: __HttpHandlerOptions): Promise<GetCredentialsForIdentityCommandOutput>;
    getCredentialsForIdentity(args: GetCredentialsForIdentityCommandInput, cb: (err: any, data?: GetCredentialsForIdentityCommandOutput) => void): void;
    getCredentialsForIdentity(args: GetCredentialsForIdentityCommandInput, options: __HttpHandlerOptions, cb: (err: any, data?: GetCredentialsForIdentityCommandOutput) => void): void;
    /**
     * @see {@link GetIdCommand}
     */
    getId(args: GetIdCommandInput, options?: __HttpHandlerOptions): Promise<GetIdCommandOutput>;
    getId(args: GetIdCommandInput, cb: (err: any, data?: GetIdCommandOutput) => void): void;
    getId(args: GetIdCommandInput, options: __HttpHandlerOptions, cb: (err: any, data?: GetIdCommandOutput) => void): void;
}
/**
 * <fullname>Amazon Cognito Federated Identities</fullname>
 *          <p>Amazon Cognito Federated Identities is a web service that delivers scoped temporary
 *          credentials to mobile devices and other untrusted environments. It uniquely identifies a
 *          device and supplies the user with a consistent identity over the lifetime of an
 *          application.</p>
 *          <p>Using Amazon Cognito Federated Identities, you can enable authentication with one or
 *          more third-party identity providers (Facebook, Google, or Login with Amazon) or an Amazon
 *          Cognito user pool, and you can also choose to support unauthenticated access from your app.
 *          Cognito delivers a unique identifier for each user and acts as an OpenID token provider
 *          trusted by Security Token Service (STS) to access temporary, limited-privilege Amazon Web Services credentials.</p>
 *          <p>For a description of the authentication flow from the Amazon Cognito Developer Guide
 *          see <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html">Authentication
 *          Flow</a>.</p>
 *          <p>For more information see <a href="https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html">Amazon Cognito Federated
 *             Identities</a>.</p>
 * @public
 */
export declare class CognitoIdentity extends CognitoIdentityClient implements CognitoIdentity {
}
