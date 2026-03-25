import { SsoProfile } from "@aws-sdk/credential-provider-sso";
import { IniSection, Profile } from "@smithy/types";
import { FromIniInit } from "./fromIni";
export declare const resolveSsoCredentials: (
  profile: string,
  profileData: IniSection,
  options?: FromIniInit
) => Promise<import("@aws-sdk/types").AttributedAwsCredentialIdentity>;
export declare const isSsoProfile: (arg: Profile) => arg is Partial<SsoProfile>;
