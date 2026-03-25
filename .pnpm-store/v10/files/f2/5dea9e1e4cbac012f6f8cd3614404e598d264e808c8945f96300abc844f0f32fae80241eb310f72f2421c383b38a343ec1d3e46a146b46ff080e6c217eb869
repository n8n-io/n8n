import {
  AwsCredentialIdentity,
  AwsIdentityProperties,
  RuntimeConfigAwsCredentialIdentityProvider,
} from "@aws-sdk/types";
export interface MemoizedRuntimeConfigAwsCredentialIdentityProvider {
  (
    options?: AwsIdentityProperties & {
      forceRefresh?: boolean;
    }
  ): Promise<AwsCredentialIdentity>;
}
export declare function memoizeChain(
  providers: RuntimeConfigAwsCredentialIdentityProvider[],
  treatAsExpired: (resolved: AwsCredentialIdentity) => boolean
): MemoizedRuntimeConfigAwsCredentialIdentityProvider;
export declare const internalCreateChain: (
  providers: RuntimeConfigAwsCredentialIdentityProvider[]
) => RuntimeConfigAwsCredentialIdentityProvider;
