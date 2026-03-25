import {
  CredentialProviderOptions,
  RuntimeConfigIdentityProvider,
} from "@aws-sdk/types";
import { AwsCredentialIdentity } from "@smithy/types";
import { CognitoProviderParameters } from "./CognitoProviderParameters";
export interface CognitoIdentityCredentials extends AwsCredentialIdentity {
  identityId: string;
}
export type CognitoIdentityCredentialProvider =
  RuntimeConfigIdentityProvider<CognitoIdentityCredentials>;
export declare function fromCognitoIdentity(
  parameters: FromCognitoIdentityParameters
): CognitoIdentityCredentialProvider;
export interface FromCognitoIdentityParameters
  extends CognitoProviderParameters,
    CredentialProviderOptions {
  identityId: string;
}
