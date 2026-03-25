import { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";
import { CreateOAuth2TokenCommandInput, CreateOAuth2TokenCommandOutput } from "./commands/CreateOAuth2TokenCommand";
import { SigninClient } from "./SigninClient";
export interface Signin {
    /**
     * @see {@link CreateOAuth2TokenCommand}
     */
    createOAuth2Token(args: CreateOAuth2TokenCommandInput, options?: __HttpHandlerOptions): Promise<CreateOAuth2TokenCommandOutput>;
    createOAuth2Token(args: CreateOAuth2TokenCommandInput, cb: (err: any, data?: CreateOAuth2TokenCommandOutput) => void): void;
    createOAuth2Token(args: CreateOAuth2TokenCommandInput, options: __HttpHandlerOptions, cb: (err: any, data?: CreateOAuth2TokenCommandOutput) => void): void;
}
/**
 * AWS Sign-In manages authentication for AWS services. This service provides
 * secure authentication flows for accessing AWS resources from the console and developer tools.
 * @public
 */
export declare class Signin extends SigninClient implements Signin {
}
