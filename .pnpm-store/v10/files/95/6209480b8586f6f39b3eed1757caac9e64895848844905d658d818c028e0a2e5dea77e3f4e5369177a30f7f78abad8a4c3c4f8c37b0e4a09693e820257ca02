// Inlined from https://github.com/flexdinesh/browser-or-node
import { __version__ } from "../index.js";
let globalEnv;
export const isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";
export const isWebWorker = () => typeof globalThis === "object" &&
    globalThis.constructor &&
    globalThis.constructor.name === "DedicatedWorkerGlobalScope";
export const isJsDom = () => (typeof window !== "undefined" && window.name === "nodejs") ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom"));
// Supabase Edge Function provides a `Deno` global object
// without `version` property
export const isDeno = () => typeof Deno !== "undefined";
// Mark not-as-node if in Supabase Edge Function
export const isNode = () => typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined" &&
    !isDeno();
export const getEnv = () => {
    if (globalEnv) {
        return globalEnv;
    }
    // @ts-expect-error Bun types are not imported due to conflicts with Node types
    if (typeof Bun !== "undefined") {
        globalEnv = "bun";
    }
    else if (isBrowser()) {
        globalEnv = "browser";
    }
    else if (isNode()) {
        globalEnv = "node";
    }
    else if (isWebWorker()) {
        globalEnv = "webworker";
    }
    else if (isJsDom()) {
        globalEnv = "jsdom";
    }
    else if (isDeno()) {
        globalEnv = "deno";
    }
    else {
        globalEnv = "other";
    }
    return globalEnv;
};
let runtimeEnvironment;
export function getRuntimeEnvironment() {
    if (runtimeEnvironment === undefined) {
        const env = getEnv();
        const releaseEnv = getShas();
        runtimeEnvironment = {
            library: "langsmith",
            runtime: env,
            sdk: "langsmith-js",
            sdk_version: __version__,
            ...releaseEnv,
        };
    }
    return runtimeEnvironment;
}
/**
 * Retrieves the LangSmith-specific metadata from the current runtime environment.
 *
 * @returns {Record<string, string>}
 *  - A record of LangSmith-specific metadata environment variables.
 */
export function getLangSmithEnvVarsMetadata() {
    const allEnvVars = getLangSmithEnvironmentVariables();
    const envVars = {};
    const excluded = [
        "LANGCHAIN_API_KEY",
        "LANGCHAIN_ENDPOINT",
        "LANGCHAIN_TRACING_V2",
        "LANGCHAIN_PROJECT",
        "LANGCHAIN_SESSION",
        "LANGSMITH_API_KEY",
        "LANGSMITH_ENDPOINT",
        "LANGSMITH_TRACING_V2",
        "LANGSMITH_PROJECT",
        "LANGSMITH_SESSION",
    ];
    for (const [key, value] of Object.entries(allEnvVars)) {
        if (typeof value === "string" &&
            !excluded.includes(key) &&
            !key.toLowerCase().includes("key") &&
            !key.toLowerCase().includes("secret") &&
            !key.toLowerCase().includes("token")) {
            if (key === "LANGCHAIN_REVISION_ID") {
                envVars["revision_id"] = value;
            }
            else {
                envVars[key] = value;
            }
        }
    }
    return envVars;
}
/**
 * Retrieves only the LangChain/LangSmith-prefixed environment variables from the current runtime environment.
 * This is more efficient than copying all environment variables.
 *
 * @returns {Record<string, string>}
 *  - A record of LangChain/LangSmith environment variables.
 */
export function getLangSmithEnvironmentVariables() {
    const envVars = {};
    try {
        // Check for Node.js environment
        // eslint-disable-next-line no-process-env
        if (typeof process !== "undefined" && process.env) {
            // eslint-disable-next-line no-process-env
            for (const [key, value] of Object.entries(process.env)) {
                if ((key.startsWith("LANGCHAIN_") || key.startsWith("LANGSMITH_")) &&
                    value != null) {
                    if ((key.toLowerCase().includes("key") ||
                        key.toLowerCase().includes("secret") ||
                        key.toLowerCase().includes("token")) &&
                        typeof value === "string") {
                        envVars[key] =
                            value.slice(0, 2) +
                                "*".repeat(value.length - 4) +
                                value.slice(-2);
                    }
                    else {
                        envVars[key] = value;
                    }
                }
            }
        }
    }
    catch (e) {
        // Catch any errors that might occur while trying to access environment variables
    }
    return envVars;
}
export function getEnvironmentVariable(name) {
    // Certain Deno setups will throw an error if you try to access environment variables
    // https://github.com/hwchase17/langchainjs/issues/1412
    try {
        return typeof process !== "undefined"
            ? // eslint-disable-next-line no-process-env
                process.env?.[name]
            : undefined;
    }
    catch (e) {
        return undefined;
    }
}
export function getLangSmithEnvironmentVariable(name) {
    return (getEnvironmentVariable(`LANGSMITH_${name}`) ||
        getEnvironmentVariable(`LANGCHAIN_${name}`));
}
export function setEnvironmentVariable(name, value) {
    if (typeof process !== "undefined") {
        // eslint-disable-next-line no-process-env
        process.env[name] = value;
    }
}
let cachedCommitSHAs;
/**
 * Get the Git commit SHA from common environment variables
 * used by different CI/CD platforms.
 * @returns {string | undefined} The Git commit SHA or undefined if not found.
 */
export function getShas() {
    if (cachedCommitSHAs !== undefined) {
        return cachedCommitSHAs;
    }
    const common_release_envs = [
        "VERCEL_GIT_COMMIT_SHA",
        "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
        "COMMIT_REF",
        "RENDER_GIT_COMMIT",
        "CI_COMMIT_SHA",
        "CIRCLE_SHA1",
        "CF_PAGES_COMMIT_SHA",
        "REACT_APP_GIT_SHA",
        "SOURCE_VERSION",
        "GITHUB_SHA",
        "TRAVIS_COMMIT",
        "GIT_COMMIT",
        "BUILD_VCS_NUMBER",
        "bamboo_planRepository_revision",
        "Build.SourceVersion",
        "BITBUCKET_COMMIT",
        "DRONE_COMMIT_SHA",
        "SEMAPHORE_GIT_SHA",
        "BUILDKITE_COMMIT",
    ];
    const shas = {};
    for (const env of common_release_envs) {
        const envVar = getEnvironmentVariable(env);
        if (envVar !== undefined) {
            shas[env] = envVar;
        }
    }
    cachedCommitSHAs = shas;
    return shas;
}
export function getOtelEnabled() {
    return (getEnvironmentVariable("OTEL_ENABLED") === "true" ||
        getLangSmithEnvironmentVariable("OTEL_ENABLED") === "true");
}
