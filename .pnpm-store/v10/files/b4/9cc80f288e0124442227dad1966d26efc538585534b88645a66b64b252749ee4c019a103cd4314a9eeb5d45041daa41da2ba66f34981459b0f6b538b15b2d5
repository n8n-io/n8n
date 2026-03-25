import type { AwsCredentialIdentity, AwsIdentityProperties, RuntimeConfigAwsCredentialIdentityProvider } from "@aws-sdk/types";
/**
 * Memoized provider chain for AWS credentials.
 * The options are only reevaluated if forceRefresh=true is passed or a natural
 * refresh occurs.
 *
 * @public
 */
export interface MemoizedRuntimeConfigAwsCredentialIdentityProvider {
    (options?: AwsIdentityProperties & {
        forceRefresh?: boolean;
    }): Promise<AwsCredentialIdentity>;
}
/**
 * @internal
 */
export declare function memoizeChain(providers: RuntimeConfigAwsCredentialIdentityProvider[], treatAsExpired: (resolved: AwsCredentialIdentity) => boolean): MemoizedRuntimeConfigAwsCredentialIdentityProvider;
export declare const internalCreateChain: (providers: RuntimeConfigAwsCredentialIdentityProvider[]) => RuntimeConfigAwsCredentialIdentityProvider;
