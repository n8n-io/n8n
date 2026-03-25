import { AwsCredentialIdentity } from "@aws-sdk/types";
import { S3ExpressIdentity } from "../interfaces/S3ExpressIdentity";
import { S3ExpressIdentityProvider } from "../interfaces/S3ExpressIdentityProvider";
import { S3ExpressIdentityCache } from "./S3ExpressIdentityCache";
/**
 * @internal
 *
 * This should match S3::CreateSessionCommandOutput::SessionCredentials
 * but it is not imported since that would create a circular dependency.
 */
type Credentials = {
    AccessKeyId: string | undefined;
    SecretAccessKey: string | undefined;
    SessionToken: string | undefined;
    Expiration: Date | undefined;
};
/**
 * @internal
 */
export declare class S3ExpressIdentityProviderImpl implements S3ExpressIdentityProvider {
    private createSessionFn;
    private cache;
    static REFRESH_WINDOW_MS: number;
    constructor(createSessionFn: (key: string) => Promise<{
        Credentials: Credentials;
    }>, cache?: S3ExpressIdentityCache);
    getS3ExpressIdentity(awsIdentity: AwsCredentialIdentity, identityProperties: {
        Bucket: string;
    } & Record<string, string>): Promise<S3ExpressIdentity>;
    private getIdentity;
}
export {};
