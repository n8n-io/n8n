import { setFeature } from "@aws-sdk/core";
const ACCOUNT_ID_ENDPOINT_REGEX = /\d{12}\.ddb/;
export async function checkFeatures(context, config, args) {
    const request = args.request;
    if (request?.headers?.["smithy-protocol"] === "rpc-v2-cbor") {
        setFeature(context, "PROTOCOL_RPC_V2_CBOR", "M");
    }
    if (typeof config.retryStrategy === "function") {
        const retryStrategy = await config.retryStrategy();
        if (typeof retryStrategy.acquireInitialRetryToken === "function") {
            if (retryStrategy.constructor?.name?.includes("Adaptive")) {
                setFeature(context, "RETRY_MODE_ADAPTIVE", "F");
            }
            else {
                setFeature(context, "RETRY_MODE_STANDARD", "E");
            }
        }
        else {
            setFeature(context, "RETRY_MODE_LEGACY", "D");
        }
    }
    if (typeof config.accountIdEndpointMode === "function") {
        const endpointV2 = context.endpointV2;
        if (String(endpointV2?.url?.hostname).match(ACCOUNT_ID_ENDPOINT_REGEX)) {
            setFeature(context, "ACCOUNT_ID_ENDPOINT", "O");
        }
        switch (await config.accountIdEndpointMode?.()) {
            case "disabled":
                setFeature(context, "ACCOUNT_ID_MODE_DISABLED", "Q");
                break;
            case "preferred":
                setFeature(context, "ACCOUNT_ID_MODE_PREFERRED", "P");
                break;
            case "required":
                setFeature(context, "ACCOUNT_ID_MODE_REQUIRED", "R");
                break;
        }
    }
    const identity = context.__smithy_context?.selectedHttpAuthScheme?.identity;
    if (identity?.$source) {
        const credentials = identity;
        if (credentials.accountId) {
            setFeature(context, "RESOLVED_ACCOUNT_ID", "T");
        }
        for (const [key, value] of Object.entries(credentials.$source ?? {})) {
            setFeature(context, key, value);
        }
    }
}
