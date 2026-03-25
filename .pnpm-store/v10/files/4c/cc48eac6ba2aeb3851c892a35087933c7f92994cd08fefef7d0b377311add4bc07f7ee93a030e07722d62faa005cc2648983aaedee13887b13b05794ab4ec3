import { AwsCredentialIdentity } from "@aws-sdk/types";
import { S3ExpressIdentity } from "./S3ExpressIdentity";
export interface S3ExpressIdentityProvider {
  getS3ExpressIdentity(
    awsIdentity: AwsCredentialIdentity,
    identityProperties: Record<string, string>
  ): Promise<S3ExpressIdentity>;
}
