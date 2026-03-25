import { AwsCredentialIdentity } from "@smithy/types";
/**
 * @internal
 */
export interface ImdsCredentials {
    AccessKeyId: string;
    SecretAccessKey: string;
    Token: string;
    Expiration: string;
    AccountId?: string;
}
/**
 * @internal
 */
export declare const isImdsCredentials: (arg: any) => arg is ImdsCredentials;
/**
 * @internal
 */
export declare const fromImdsCredentials: (creds: ImdsCredentials) => AwsCredentialIdentity;
