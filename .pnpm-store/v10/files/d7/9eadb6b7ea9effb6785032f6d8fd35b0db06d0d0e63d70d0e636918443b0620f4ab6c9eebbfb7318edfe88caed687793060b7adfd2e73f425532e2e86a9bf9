import type { AccountIdEndpointMode } from "@aws-sdk/core/account-id-endpoint";
import type { AwsHandlerExecutionContext } from "@aws-sdk/types";
import type { AwsCredentialIdentityProvider, BuildHandlerArguments, Provider, RetryStrategy, RetryStrategyV2 } from "@smithy/types";
/**
 * @internal
 */
type PreviouslyResolved = Partial<{
    credentials?: AwsCredentialIdentityProvider;
    accountIdEndpointMode?: Provider<AccountIdEndpointMode>;
    retryStrategy?: Provider<RetryStrategy | RetryStrategyV2>;
}>;
/**
 * @internal
 * Check for features that don't have a middleware activation site but
 * may be detected on the context, client config, or request.
 */
export declare function checkFeatures(context: AwsHandlerExecutionContext, config: PreviouslyResolved, args: BuildHandlerArguments<any>): Promise<void>;
export {};
