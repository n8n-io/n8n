import type { AwsIdentityProperties } from "@aws-sdk/types";
import type { Logger, ParsedIniData } from "@smithy/types";
import type { FromIniInit } from "./fromIni";
import type { ResolveProfileData } from "./resolveProfileData";
/**
 * @internal
 *
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sts/command/AssumeRoleCommand/
 */
export interface AssumeRoleParams {
    /**
     * The identifier of the role to be assumed.
     */
    RoleArn: string;
    /**
     * A name for the assumed role session.
     */
    RoleSessionName: string;
    /**
     * A unique identifier that is used by third parties when assuming roles in
     * their customers' accounts.
     */
    ExternalId?: string;
    /**
     * The identification number of the MFA device that is associated with the
     * user who is making the `AssumeRole` call.
     */
    SerialNumber?: string;
    /**
     * The value provided by the MFA device.
     */
    TokenCode?: string;
    /**
     * The duration, in seconds, of the role session.
     */
    DurationSeconds?: number;
}
/**
 * @internal
 */
export declare const isAssumeRoleProfile: (arg: any, { profile, logger }?: {
    profile?: string;
    logger?: Logger;
}) => boolean;
/**
 * @internal
 */
export declare const resolveAssumeRoleCredentials: (profileName: string, profiles: ParsedIniData, options: FromIniInit, callerClientConfig: AwsIdentityProperties["callerClientConfig"] | undefined, visitedProfiles: Record<string, true> | undefined, resolveProfileData: ResolveProfileData) => Promise<import("@aws-sdk/types").AttributedAwsCredentialIdentity>;
