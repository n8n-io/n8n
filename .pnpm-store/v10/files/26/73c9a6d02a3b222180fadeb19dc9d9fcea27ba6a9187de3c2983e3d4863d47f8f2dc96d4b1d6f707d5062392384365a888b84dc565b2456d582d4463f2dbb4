import type { AwsIdentityProperties } from "@aws-sdk/types";
import type { AwsCredentialIdentity, Profile } from "@smithy/types";
import type { FromIniInit } from "./fromIni";
/**
 * @internal
 */
export interface WebIdentityProfile extends Profile {
    web_identity_token_file: string;
    role_arn: string;
    role_session_name?: string;
}
/**
 * @internal
 */
export declare const isWebIdentityProfile: (arg: any) => arg is WebIdentityProfile;
/**
 * @internal
 */
export declare const resolveWebIdentityCredentials: (profile: WebIdentityProfile, options: FromIniInit, callerClientConfig?: AwsIdentityProperties["callerClientConfig"]) => Promise<AwsCredentialIdentity>;
