import { AwsCredentialIdentity, ParsedIniData } from "@smithy/types";
import { FromIniInit } from "./fromIni";
export type ResolveProfileData = typeof resolveProfileData;
export declare const resolveProfileData: (
  profileName: string,
  profiles: ParsedIniData,
  options: FromIniInit,
  visitedProfiles?: Record<string, true>,
  isAssumeRoleRecursiveCall?: boolean
) => Promise<AwsCredentialIdentity>;
