import { AwsCredentialIdentity } from "@aws-sdk/types";
import { S3ExpressIdentity } from "./S3ExpressIdentity";
/**
 * @public
 */
export interface S3ExpressIdentityProvider {
    /**
     * @param awsIdentity - pre-existing credentials.
     * @param identityProperties - unknown.
     */
    getS3ExpressIdentity(awsIdentity: AwsCredentialIdentity, identityProperties: Record<string, string>): Promise<S3ExpressIdentity>;
}
