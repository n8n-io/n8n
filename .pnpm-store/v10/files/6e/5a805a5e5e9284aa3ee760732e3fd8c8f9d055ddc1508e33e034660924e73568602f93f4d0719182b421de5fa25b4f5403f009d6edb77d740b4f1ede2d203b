import { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";
import {
  CreateTokenCommandInput,
  CreateTokenCommandOutput,
} from "./commands/CreateTokenCommand";
import { SSOOIDCClient } from "./SSOOIDCClient";
export interface SSOOIDC {
  createToken(
    args: CreateTokenCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<CreateTokenCommandOutput>;
  createToken(
    args: CreateTokenCommandInput,
    cb: (err: any, data?: CreateTokenCommandOutput) => void
  ): void;
  createToken(
    args: CreateTokenCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: CreateTokenCommandOutput) => void
  ): void;
}
export declare class SSOOIDC extends SSOOIDCClient implements SSOOIDC {}
