import { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";
import {
  GetRoleCredentialsCommandInput,
  GetRoleCredentialsCommandOutput,
} from "./commands/GetRoleCredentialsCommand";
import { SSOClient } from "./SSOClient";
export interface SSO {
  getRoleCredentials(
    args: GetRoleCredentialsCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<GetRoleCredentialsCommandOutput>;
  getRoleCredentials(
    args: GetRoleCredentialsCommandInput,
    cb: (err: any, data?: GetRoleCredentialsCommandOutput) => void
  ): void;
  getRoleCredentials(
    args: GetRoleCredentialsCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: GetRoleCredentialsCommandOutput) => void
  ): void;
}
export declare class SSO extends SSOClient implements SSO {}
