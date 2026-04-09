import { SsoProfile } from "@aws-sdk/credential-provider-sso";
import { AwsIdentityProperties } from "@aws-sdk/types";
import { IniSection, Profile } from "@smithy/types";
import { FromIniInit } from "./fromIni";
export declare const resolveSsoCredentials: (
  profile: string,
  profileData: IniSection,
  options?: FromIniInit,
  callerClientConfig?: AwsIdentityProperties["callerClientConfig"]
) => Promise<import("@aws-sdk/types").AttributedAwsCredentialIdentity>;
export declare const isSsoProfile: (arg: Profile) => arg is Partial<SsoProfile>;
