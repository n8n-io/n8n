import { HttpHandlerOptions as __HttpHandlerOptions } from "@smithy/types";
import {
  AssumeRoleCommandInput,
  AssumeRoleCommandOutput,
} from "./commands/AssumeRoleCommand";
import {
  AssumeRoleWithWebIdentityCommandInput,
  AssumeRoleWithWebIdentityCommandOutput,
} from "./commands/AssumeRoleWithWebIdentityCommand";
import { STSClient } from "./STSClient";
export interface STS {
  assumeRole(
    args: AssumeRoleCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<AssumeRoleCommandOutput>;
  assumeRole(
    args: AssumeRoleCommandInput,
    cb: (err: any, data?: AssumeRoleCommandOutput) => void
  ): void;
  assumeRole(
    args: AssumeRoleCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: AssumeRoleCommandOutput) => void
  ): void;
  assumeRoleWithWebIdentity(
    args: AssumeRoleWithWebIdentityCommandInput,
    options?: __HttpHandlerOptions
  ): Promise<AssumeRoleWithWebIdentityCommandOutput>;
  assumeRoleWithWebIdentity(
    args: AssumeRoleWithWebIdentityCommandInput,
    cb: (err: any, data?: AssumeRoleWithWebIdentityCommandOutput) => void
  ): void;
  assumeRoleWithWebIdentity(
    args: AssumeRoleWithWebIdentityCommandInput,
    options: __HttpHandlerOptions,
    cb: (err: any, data?: AssumeRoleWithWebIdentityCommandOutput) => void
  ): void;
}
export declare class STS extends STSClient implements STS {}
