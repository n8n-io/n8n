import type { AwsCredentialIdentity, ParsedIniData } from "@smithy/types";
import { FromIniInit } from "./fromIni";
/**
 * @internal
 */
export declare const resolveProfileData: (profileName: string, profiles: ParsedIniData, options: FromIniInit, visitedProfiles?: Record<string, true>, 
/**
 * This override comes from recursive calls only.
 * It is used to flag a recursive profile section
 * that does not have a role_arn, e.g. a credential_source
 * with no role_arn, as part of a larger recursive assume-role
 * call stack, and to re-enter the assume-role resolver function.
 */
isAssumeRoleRecursiveCall?: boolean) => Promise<AwsCredentialIdentity>;
