import type { SsoProfile } from "@aws-sdk/credential-provider-sso";
import type { AwsIdentityProperties } from "@aws-sdk/types";
import type { IniSection, Profile } from "@smithy/types";
import type { FromIniInit } from "./fromIni";
/**
 * @internal
 */
export declare const resolveSsoCredentials: (profile: string, profileData: IniSection, options?: FromIniInit, callerClientConfig?: AwsIdentityProperties["callerClientConfig"]) => Promise<import("@aws-sdk/types").AttributedAwsCredentialIdentity>;
/**
 * @internal
 * duplicated from \@aws-sdk/credential-provider-sso to defer import.
 */
export declare const isSsoProfile: (arg: Profile) => arg is Partial<SsoProfile>;
