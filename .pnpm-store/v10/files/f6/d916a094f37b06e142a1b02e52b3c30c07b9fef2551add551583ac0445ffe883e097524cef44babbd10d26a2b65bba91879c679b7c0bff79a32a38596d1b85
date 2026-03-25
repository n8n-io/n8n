import { Logger, ParsedIniData } from "@smithy/types";
import { FromIniInit } from "./fromIni";
export interface AssumeRoleParams {
  RoleArn: string;
  RoleSessionName: string;
  ExternalId?: string;
  SerialNumber?: string;
  TokenCode?: string;
  DurationSeconds?: number;
}
export declare const isAssumeRoleProfile: (
  arg: any,
  {
    profile,
    logger,
  }?: {
    profile?: string;
    logger?: Logger;
  }
) => boolean;
export declare const resolveAssumeRoleCredentials: (
  profileName: string,
  profiles: ParsedIniData,
  options: FromIniInit,
  visitedProfiles?: Record<string, true>
) => Promise<import("@aws-sdk/types").AttributedAwsCredentialIdentity>;
