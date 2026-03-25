import { DefaultProviderInit } from "@aws-sdk/credential-provider-node";
import type { AwsCredentialIdentityProvider } from "@smithy/types";
/**
 * This is the same credential provider as {@link defaultProvider|the default provider for Node.js SDK},
 * but with default role assumers so you don't need to import them from
 * STS client and supply them manually.
 *
 * You normally don't need to use this explicitly in the client constructor.
 * It is useful for utility functions requiring credentials like S3 presigner,
 * or RDS signer.
 *
 * ```js
 * import { fromNodeProviderChain } from "@aws-sdk/credential-providers"; // ES6 import
 * // const { fromNodeProviderChain } = require("@aws-sdk/credential-providers") // CommonJS import
 *
 * const credentialProvider = fromNodeProviderChain({
 *   // init properties for fromEnv(), fromSSO(), fromTokenFile(), fromIni(),
 *   // fromProcess(), fromInstanceMetadata(), fromContainerMetadata()
 *
 *   // For instance, to ignore the ini shared cache, change the credentials filepath for all
 *   // providers, and set the sso start id:
 *   ignoreCache: true,
 *   filepath: "~/.config/aws/credentials",
 *   ssoStartUrl: "https://d-abc123.awsapps.com/start"
 *
 *   // Optional. Custom STS client configurations overriding the default ones.
 *   clientConfig: { region },
 *   // Optional. Custom STS client middleware plugin to modify the client default behavior.
 *   // e.g. adding custom headers.
 *   clientPlugins: [addFooHeadersPlugin],
 * })
 * ```
 *
 * @public
 */
export declare const fromNodeProviderChain: (init?: DefaultProviderInit) => AwsCredentialIdentityProvider;
