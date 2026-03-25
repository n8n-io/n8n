import packageInfo from "../package.json";
import { Sha1 } from "@aws-crypto/sha1-browser";
import { Sha256 } from "@aws-crypto/sha256-browser";
import { createDefaultUserAgentProvider } from "@aws-sdk/util-user-agent-browser";
import { DEFAULT_USE_DUALSTACK_ENDPOINT, DEFAULT_USE_FIPS_ENDPOINT } from "@smithy/config-resolver";
import { eventStreamSerdeProvider } from "@smithy/eventstream-serde-browser";
import { FetchHttpHandler as RequestHandler, streamCollector } from "@smithy/fetch-http-handler";
import { blobHasher as streamHasher } from "@smithy/hash-blob-browser";
import { invalidProvider } from "@smithy/invalid-dependency";
import { Md5 } from "@smithy/md5-js";
import { calculateBodyLength } from "@smithy/util-body-length-browser";
import { DEFAULT_MAX_ATTEMPTS, DEFAULT_RETRY_MODE } from "@smithy/util-retry";
import { getRuntimeConfig as getSharedRuntimeConfig } from "./runtimeConfig.shared";
import { loadConfigsForDefaultMode } from "@smithy/smithy-client";
import { resolveDefaultsModeConfig } from "@smithy/util-defaults-mode-browser";
export const getRuntimeConfig = (config) => {
    const defaultsMode = resolveDefaultsModeConfig(config);
    const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
    const clientSharedValues = getSharedRuntimeConfig(config);
    return {
        ...clientSharedValues,
        ...config,
        runtime: "browser",
        defaultsMode,
        bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
        credentialDefaultProvider: config?.credentialDefaultProvider ?? ((_) => () => Promise.reject(new Error("Credential is missing"))),
        defaultUserAgentProvider: config?.defaultUserAgentProvider ??
            createDefaultUserAgentProvider({ serviceId: clientSharedValues.serviceId, clientVersion: packageInfo.version }),
        eventStreamSerdeProvider: config?.eventStreamSerdeProvider ?? eventStreamSerdeProvider,
        maxAttempts: config?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        md5: config?.md5 ?? Md5,
        region: config?.region ?? invalidProvider("Region is missing"),
        requestHandler: RequestHandler.create(config?.requestHandler ?? defaultConfigProvider),
        retryMode: config?.retryMode ?? (async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE),
        sha1: config?.sha1 ?? Sha1,
        sha256: config?.sha256 ?? Sha256,
        streamCollector: config?.streamCollector ?? streamCollector,
        streamHasher: config?.streamHasher ?? streamHasher,
        useDualstackEndpoint: config?.useDualstackEndpoint ?? (() => Promise.resolve(DEFAULT_USE_DUALSTACK_ENDPOINT)),
        useFipsEndpoint: config?.useFipsEndpoint ?? (() => Promise.resolve(DEFAULT_USE_FIPS_ENDPOINT)),
    };
};
