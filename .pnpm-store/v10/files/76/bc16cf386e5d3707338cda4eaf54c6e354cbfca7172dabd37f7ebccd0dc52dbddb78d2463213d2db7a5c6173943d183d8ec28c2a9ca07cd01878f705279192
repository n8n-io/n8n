import {
  RuntimeConfigAwsCredentialIdentityProvider,
  RuntimeConfigIdentityProvider,
} from "@aws-sdk/types";
import { AwsCredentialIdentityProvider } from "@smithy/types";
export interface CustomCredentialChainOptions {
  expireAfter(
    milliseconds: number
  ): AwsCredentialIdentityProvider & CustomCredentialChainOptions;
}
export declare const createCredentialChain: (
  ...credentialProviders: RuntimeConfigAwsCredentialIdentityProvider[]
) => RuntimeConfigAwsCredentialIdentityProvider & CustomCredentialChainOptions;
export declare const propertyProviderChain: <T>(
  ...providers: Array<RuntimeConfigIdentityProvider<T>>
) => RuntimeConfigIdentityProvider<T>;
