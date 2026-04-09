import { AwsIdentityProperties } from "@aws-sdk/types";
import { AwsCredentialIdentity, ParsedIniData } from "@smithy/types";
import { FromIniInit } from "./fromIni";
export type ResolveProfileData = typeof resolveProfileData;
export declare const resolveProfileData: (
  profileName: string,
  profiles: ParsedIniData,
  options: FromIniInit,
  callerClientConfig?: AwsIdentityProperties["callerClientConfig"],
  visitedProfiles?: Record<string, true>,
  isAssumeRoleRecursiveCall?: boolean
) => Promise<AwsCredentialIdentity>;
