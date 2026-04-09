import { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";
import { CognitoIdentityClient } from "./CognitoIdentityClient";
import {
  GetCredentialsForIdentityCommandInput,
  GetCredentialsForIdentityCommandOutput,
} from "./commands/GetCredentialsForIdentityCommand";
import { GetIdCommandInput, GetIdCommandOutput } from "./commands/GetIdCommand";
export interface CognitoIdentity {
  getCredentialsForIdentity(
    args: GetCredentialsForIdentityCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<GetCredentialsForIdentityCommandOutput>;
  getCredentialsForIdentity(
    args: GetCredentialsForIdentityCommandInput,
    cb: (err: any, data?: GetCredentialsForIdentityCommandOutput) => void
  ): void;
  getCredentialsForIdentity(
    args: GetCredentialsForIdentityCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: GetCredentialsForIdentityCommandOutput) => void
  ): void;
  getId(
    args: GetIdCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<GetIdCommandOutput>;
  getId(
    args: GetIdCommandInput,
    cb: (err: any, data?: GetIdCommandOutput) => void
  ): void;
  getId(
    args: GetIdCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: GetIdCommandOutput) => void
  ): void;
}
export declare class CognitoIdentity
  extends CognitoIdentityClient
  implements CognitoIdentity {}
